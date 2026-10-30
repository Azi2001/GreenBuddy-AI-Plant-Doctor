import io
import json
from pathlib import Path

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from tensorflow import keras
from tensorflow.keras import layers
import re
from auth import router as auth_router

# --- Load the model and class names once, when the server starts ---
BASE_DIR = Path(__file__).resolve().parent.parent
WEIGHTS_PATH = BASE_DIR / "ml" / "plant_model.weights.h5"
CLASSES_PATH = BASE_DIR / "ml" / "class_names.json"

with open(CLASSES_PATH) as f:
    class_names = json.load(f)


def build_model(num_classes):
    """Same structure as the model we built in Colab (Step 6)."""
    data_augmentation = keras.Sequential([
        layers.RandomFlip("horizontal_and_vertical"),
        layers.RandomRotation(0.2),
        layers.RandomZoom(0.2),
        layers.RandomContrast(0.2),
    ], name="augmentation")

    base_model = keras.applications.MobileNetV2(
        input_shape=(224, 224, 3),
        include_top=False,
        weights=None,          # we load our own trained weights instead
    )

    inputs = keras.Input(shape=(224, 224, 3))
    x = data_augmentation(inputs)
    x = layers.Rescaling(1 / 127.5, offset=-1)(x)
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)
    return keras.Model(inputs, outputs)


model = build_model(len(class_names))
model.load_weights(WEIGHTS_PATH)

# --- Load treatment information ---
DISEASES_PATH = BASE_DIR / "ml" / "diseases.json"


def normalize(text):
    """Lowercase and keep only letters and digits, so names match reliably."""
    return re.sub(r"[^a-z0-9]", "", text.lower())


with open(DISEASES_PATH, encoding="utf-8") as f:
    disease_data = json.load(f)

disease_info = {normalize(item["class_name"]): item for item in disease_data["diseases"]}

# Safety check: warn if any model class has no treatment entry
missing = [name for name in class_names if normalize(name) not in disease_info]
if missing:
    print("WARNING: no treatment info for:", missing)

# --- Create the app ---
app = FastAPI(title="GreenBuddy AI Plant Doctor")
app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health():
    return {"status": "ok", "classes": len(class_names)}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if file.content_type not in ("image/jpeg", "image/png"):
        raise HTTPException(status_code=400, detail="Please upload a JPG or PNG image.")

    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read the image.")

    # Same preparation as in training: 224 x 224, pixel values left as 0-255
    image = image.resize((224, 224), Image.BILINEAR)
    batch = np.expand_dims(np.array(image, dtype="float32"), axis=0)

    probabilities = model.predict(batch, verbose=0)[0]
    top3 = np.argsort(probabilities)[::-1][:3]

    results = []
    for i in top3:
        crop, _, disease = class_names[i].partition("___")
        results.append({
            "crop": crop.replace("_", " "),
            "disease": disease.replace("_", " "),
            "confidence": round(float(probabilities[i]), 4),
        })

        best_info = disease_info.get(normalize(class_names[top3[0]]))

    return {
        "prediction": results[0],
        "alternatives": results[1:],
        "low_confidence": results[0]["confidence"] < 0.6,
        "details": best_info,
        "disclaimer": disease_data["disclaimer"],
    }