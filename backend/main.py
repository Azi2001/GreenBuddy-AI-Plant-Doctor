import io
import json
import re
import uuid
from pathlib import Path

import numpy as np
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image
from sqlalchemy.orm import Session
from tensorflow import keras
from tensorflow.keras import layers

from auth import get_current_user
from auth import router as auth_router
from database import SessionLocal, get_db
from models import Disease, Scan, User
from datetime import datetime, timedelta, timezone

from sqlalchemy import func

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

# --- Settings ---
DISCLAIMER = (
    "These suggestions are general gardening advice, not a guarantee. Always read and "
    "follow the label of any product, check what is approved in your country, and ask "
    "your local agriculture office or plant nursery if you are unsure. Try the simple, "
    "non-chemical steps first."
)
MAX_UPLOAD_BYTES = 5 * 1024 * 1024   # 5 MB
UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


def normalize(text):
    """Lowercase and keep only letters and digits, so names match reliably."""
    return re.sub(r"[^a-z0-9]", "", text.lower())


# Map each model class to its row in the diseases table
with SessionLocal() as db:
    disease_ids = {normalize(d.class_name): d.id for d in db.query(Disease).all()}

missing = [name for name in class_names if normalize(name) not in disease_ids]
if missing:
    print("WARNING: not in the diseases table (run seed_diseases.py):", missing)

# --- Create the app ---
app = FastAPI(title="GreenBuddy AI Plant Doctor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def health():
    return {"status": "ok", "classes": len(class_names)}


@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in ("image/jpeg", "image/png"):
        raise HTTPException(status_code=400, detail="Please upload a JPG or PNG image.")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image is too large. Please upload one under 5 MB.")

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
        crop, _, disease_name = class_names[i].partition("___")
        results.append({
            "crop": crop.replace("_", " "),
            "disease": disease_name.replace("_", " "),
            "confidence": round(float(probabilities[i]), 4),
        })

    # Find the matching disease row in the database
    disease_id = disease_ids.get(normalize(class_names[top3[0]]))
    if disease_id is None:
        raise HTTPException(status_code=500, detail="Disease information is missing from the database.")
    disease = db.get(Disease, disease_id)

    low_confidence = results[0]["confidence"] < 0.6

    # Save the photo with a random name
    extension = ".png" if file.content_type == "image/png" else ".jpg"
    filename = f"{uuid.uuid4().hex}{extension}"
    (UPLOAD_DIR / filename).write_bytes(contents)

    # Save the scan
    scan = Scan(
        user_id=current_user.id,
        disease_id=disease.id,
        confidence=results[0]["confidence"],
        low_confidence=low_confidence,
        image_path=f"uploads/{filename}",
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    return {
        "scan_id": scan.id,
        "prediction": results[0],
        "alternatives": results[1:],
        "low_confidence": low_confidence,
        "details": {
            "is_healthy": disease.is_healthy,
            "category": disease.category,
            "symptoms": disease.symptoms,
            "treatment": disease.treatment,
            "prevention": disease.prevention,
        },
        "image_url": f"/{scan.image_path}",
        "disclaimer": DISCLAIMER,
    }


@app.get("/scans")
def list_scans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scans = (
        db.query(Scan)
        .filter(Scan.user_id == current_user.id)
        .order_by(Scan.created_at.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "crop": s.disease.crop,
            "disease": s.disease.name,
            "is_healthy": s.disease.is_healthy,
            "confidence": round(s.confidence, 4),
            "low_confidence": s.low_confidence,
            "image_url": f"/{s.image_path}",
            "created_at": s.created_at.isoformat(),
        }
        for s in scans
    ]
@app.get("/stats")
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_scans = db.query(Scan).filter(Scan.user_id == current_user.id)

    total = user_scans.count()
    confident = user_scans.filter(Scan.low_confidence.is_(False))
    confident_total = confident.count()
    unsure = total - confident_total
    healthy = confident.join(Disease).filter(Disease.is_healthy.is_(True)).count()
    diseased = confident_total - healthy

    # Scans in the last 7 days (SQLite stores times without a timezone)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).replace(tzinfo=None)
    this_week = user_scans.filter(Scan.created_at >= week_ago).count()

    # The disease this user has found most often (healthy scans don't count)
    top = (
        db.query(Disease.crop, Disease.name, func.count(Scan.id).label("n"))
        .join(Scan, Scan.disease_id == Disease.id)
        .filter(
            Scan.user_id == current_user.id,
            Scan.low_confidence.is_(False),
            Disease.is_healthy.is_(False),
        )
        .group_by(Disease.id)
        .order_by(func.count(Scan.id).desc())
        .first()
    )
    most_common = {"crop": top.crop, "disease": top.name, "count": top.n} if top else None

    # Number of scans for each of the last 7 days (for a chart)
    counts = {}
    for s in user_scans.filter(Scan.created_at >= week_ago).all():
        day = s.created_at.date().isoformat()
        counts[day] = counts.get(day, 0) + 1

    today = datetime.now(timezone.utc).date()
    per_day = []
    for i in range(6, -1, -1):
        day = (today - timedelta(days=i)).isoformat()
        per_day.append({"date": day, "scans": counts.get(day, 0)})

    return {
        "total_scans": total,
        "healthy": healthy,
        "diseased": diseased,
        "unsure": unsure,
        "healthy_percent": round(100 * healthy / confident_total) if confident_total else 0,
        "scans_this_week": this_week,
        "most_common_disease": most_common,
        "scans_per_day": per_day,
    }


def get_own_scan(scan_id: int, user: User, db: Session) -> Scan:
    """Finds a scan, but only if it belongs to this user."""
    scan = db.get(Scan, scan_id)
    if scan is None or scan.user_id != user.id:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@app.get("/scans/{scan_id}")
def get_scan(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scan = get_own_scan(scan_id, current_user, db)
    d = scan.disease
    return {
        "scan_id": scan.id,
        "prediction": {
            "crop": d.crop,
            "disease": d.name,
            "confidence": round(scan.confidence, 4),
        },
        "low_confidence": scan.low_confidence,
        "details": {
            "is_healthy": d.is_healthy,
            "category": d.category,
            "symptoms": d.symptoms,
            "treatment": d.treatment,
            "prevention": d.prevention,
        },
        "image_url": f"/{scan.image_path}",
        "created_at": scan.created_at.isoformat(),
        "disclaimer": DISCLAIMER,
    }


@app.delete("/scans/{scan_id}", status_code=204)
def delete_scan(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scan = get_own_scan(scan_id, current_user, db)
    image_file = UPLOAD_DIR / Path(scan.image_path).name
    db.delete(scan)
    db.commit()
    image_file.unlink(missing_ok=True)