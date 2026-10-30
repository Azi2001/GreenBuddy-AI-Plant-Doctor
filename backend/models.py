from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    scans: Mapped[list["Scan"]] = relationship(back_populates="user")


class Disease(Base):
    __tablename__ = "diseases"

    id: Mapped[int] = mapped_column(primary_key=True)
    class_name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    crop: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(20))
    is_healthy: Mapped[bool] = mapped_column(Boolean, default=False)
    symptoms: Mapped[str] = mapped_column(Text)
    treatment: Mapped[list] = mapped_column(JSON)
    prevention: Mapped[list] = mapped_column(JSON)

    scans: Mapped[list["Scan"]] = relationship(back_populates="disease")


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    disease_id: Mapped[int] = mapped_column(ForeignKey("diseases.id"))
    confidence: Mapped[float] = mapped_column(Float)
    low_confidence: Mapped[bool] = mapped_column(Boolean, default=False)
    image_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    user: Mapped["User"] = relationship(back_populates="scans")
    disease: Mapped["Disease"] = relationship(back_populates="scans")