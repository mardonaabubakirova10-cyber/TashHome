"""Сервис оценки цены дома (FastAPI).

Запуск (из папки ml):  python -m uvicorn service:app --port 8001
Документация API: http://localhost:8001/docs
"""

from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel, Field

from features import BUILDINGS, DISTRICTS, FEATURES, RENOVATIONS, make_features

MODEL_PATH = Path(__file__).parent / "model" / "model.joblib"

# Понятные названия признаков для ответа
LABELS = {
    "district": "Район",
    "building_type": "Материал стен",
    "area_m2": "Площадь дома",
    "land_sotka": "Площадь участка",
    "rooms": "Количество комнат",
    "floors": "Этажность",
    "age": "Возраст дома",
    "area_per_room": "Площадь на комнату",
    "renovation_level": "Ремонт",
}

District = Literal[tuple(DISTRICTS)]  # type: ignore[valid-type]
Building = Literal[tuple(BUILDINGS)]  # type: ignore[valid-type]
Renovation = Literal[tuple(RENOVATIONS)]  # type: ignore[valid-type]


class House(BaseModel):
    district: District
    area_m2: float = Field(gt=20, le=2000, description="Площадь дома, м²")
    land_sotka: float = Field(gt=0, le=500, description="Площадь участка, сотки")
    rooms: int = Field(ge=1, le=20)
    floors: int = Field(ge=1, le=5)
    building_type: Building
    renovation: Renovation
    year_built: int = Field(ge=1900, le=2026)


class Factor(BaseModel):
    feature: str
    label: str
    effect_pct: float = Field(description="На сколько процентов признак сдвигает цену относительно средней по рынку")


class Prediction(BaseModel):
    predicted_price: int
    price_low: int
    price_high: int
    price_per_m2: int
    factors: list[Factor]


state: dict = {}


@asynccontextmanager
async def lifespan(_: FastAPI):
    state["bundle"] = joblib.load(MODEL_PATH)
    yield
    state.clear()


app = FastAPI(title="TashHome ml-service", version="1.0", lifespan=lifespan)


def _round(v: float) -> int:
    return int(round(v, -2))  # до сотен долларов: точнее модель всё равно не знает


def predict_house(house: House, top: int = 4) -> Prediction:
    b = state["bundle"]
    X = make_features(pd.DataFrame([house.model_dump()]))
    log_pred = float(b["median"].predict(X)[0])
    price = float(np.exp(log_pred))
    low = float(np.exp(b["low"].predict(X)[0] - b["widen_log"]))
    high = float(np.exp(b["high"].predict(X)[0] + b["widen_log"]))
    low, high = min(low, price), max(high, price)

    # вклад каждого признака в логарифм цены (значения SHAP от LightGBM); последний столбец — базовый уровень
    contrib = b["median"].predict(X, pred_contrib=True)[0][:-1]
    order = np.argsort(-np.abs(contrib))[:top]
    factors = [
        Factor(feature=FEATURES[i], label=LABELS[FEATURES[i]], effect_pct=round(float(np.expm1(contrib[i]) * 100), 1))
        for i in order
    ]
    return Prediction(
        predicted_price=_round(price),
        price_low=_round(low),
        price_high=_round(high),
        price_per_m2=int(round(price / house.area_m2, -1)),
        factors=factors,
    )


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": "bundle" in state}


@app.post("/predict", response_model=Prediction)
def predict(house: House) -> Prediction:
    return predict_house(house)
