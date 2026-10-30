import json
from pathlib import Path

from database import SessionLocal
from models import Disease

DISEASES_PATH = Path(__file__).resolve().parent.parent / "ml" / "diseases.json"

with open(DISEASES_PATH, encoding="utf-8") as f:
    data = json.load(f)

db = SessionLocal()
added = 0
updated = 0

for item in data["diseases"]:
    disease = db.query(Disease).filter_by(class_name=item["class_name"]).first()

    if disease is None:
        disease = Disease(class_name=item["class_name"])
        db.add(disease)
        added += 1
    else:
        updated += 1

    disease.crop = item["crop"]
    disease.name = item["disease"]
    disease.category = item["category"]
    disease.is_healthy = item["is_healthy"]
    disease.symptoms = item["symptoms"]
    disease.treatment = item["treatment"]
    disease.prevention = item["prevention"]

db.commit()
db.close()
print(f"Done. Added {added}, updated {updated}.")