"""Признаки для модели оценки дома. Используются и при обучении, и в сервисе, чтобы они совпадали."""

import pandas as pd

YEAR_NOW = 2026

DISTRICTS = [
    "yunusabad", "mirzo-ulugbek", "chilanzar", "shaykhantakhur", "yakkasaray", "mirabad",
    "sergeli", "yashnabad", "almazar", "uchtepa", "bektemir", "yangihayot",
]
BUILDINGS = ["brick", "block", "monolith"]
RENOVATIONS = ["none", "basic", "euro", "designer"]  # порядок от худшего ремонта к лучшему

NUMERIC = ["area_m2", "land_sotka", "rooms", "floors", "age", "area_per_room", "renovation_level"]
CATEGORICAL = ["district", "building_type"]
FEATURES = CATEGORICAL + NUMERIC


def make_features(df: pd.DataFrame) -> pd.DataFrame:
    """Из столбцов объявления (district, area_m2, land_sotka, rooms, floors, building_type, renovation, year_built)
    делает таблицу признаков. Неизвестные значения категорий дают ошибку, а не молчаливую подмену."""
    unknown = (
        set(df["district"]) - set(DISTRICTS),
        set(df["building_type"]) - set(BUILDINGS),
        set(df["renovation"]) - set(RENOVATIONS),
    )
    if any(unknown):
        raise ValueError(f"Неизвестные значения: {unknown}")

    out = pd.DataFrame(index=df.index)
    out["district"] = pd.Categorical(df["district"], categories=DISTRICTS)
    out["building_type"] = pd.Categorical(df["building_type"], categories=BUILDINGS)
    out["area_m2"] = df["area_m2"].astype(float)
    out["land_sotka"] = df["land_sotka"].astype(float)
    out["rooms"] = df["rooms"].astype(int)
    out["floors"] = df["floors"].astype(int)
    out["age"] = (YEAR_NOW - df["year_built"]).clip(lower=0).astype(int)
    out["area_per_room"] = out["area_m2"] / out["rooms"].clip(lower=1)
    out["renovation_level"] = df["renovation"].map({r: i for i, r in enumerate(RENOVATIONS)}).astype(int)
    return out[FEATURES]
