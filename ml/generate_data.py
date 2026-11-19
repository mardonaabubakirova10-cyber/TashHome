"""Генератор синтетического набора данных: частные дома Ташкента.

Открытого набора объявлений по домам Ташкента у нас нет, поэтому данные генерируются по
понятным правилам цены (см. ml/data/README.md). Модель потом учится восстанавливать эти правила
из «шумных» объявлений, как это было бы с реальными данными.

Запуск (из папки ml):  .venv\\Scripts\\python generate_data.py
"""

from pathlib import Path

import numpy as np
import pandas as pd

SEED = 42
N = 3000
YEAR_NOW = 2026

# district: (цена за м² дома, цена за сотку земли, средний размер участка в сотках), USD
# Значения цен совпадают с демо-данными сайта (web/src/data/properties.ts).
DISTRICTS = {
    "yunusabad": (750, 9000, 5.0),
    "mirzo-ulugbek": (700, 8000, 5.5),
    "chilanzar": (600, 6500, 5.0),
    "shaykhantakhur": (620, 7000, 4.5),
    "yakkasaray": (800, 10000, 4.0),
    "mirabad": (850, 11000, 4.0),
    "sergeli": (450, 4000, 8.0),
    "yashnabad": (560, 5500, 6.0),
    "almazar": (540, 5500, 6.0),
    "uchtepa": (500, 5000, 6.5),
    "bektemir": (420, 3500, 9.0),
    "yangihayot": (400, 3200, 10.0),
}
RENOVATION_FACTOR = {"none": 0.80, "basic": 0.93, "euro": 1.08, "designer": 1.25}
MATERIAL_FACTOR = {"brick": 1.05, "block": 0.95, "monolith": 1.10}


def generate(n: int = N, seed: int = SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    names = list(DISTRICTS)
    district = rng.choice(names, size=n, p=np.array([1.3, 1.1, 1.3, 1.0, 0.7, 0.7, 1.0, 1.0, 1.0, 1.0, 0.6, 0.6]) / 11.3)

    area = np.clip(rng.lognormal(np.log(130), 0.38, n), 45, 450).round().astype(int)
    rooms = np.clip(np.round(area / 30 + rng.normal(0, 0.8, n)), 2, 9).astype(int)

    floors = np.empty(n, dtype=int)
    for i, a in enumerate(area):
        p = [0.15, 0.55, 0.30] if a > 220 else [0.40, 0.50, 0.10] if a > 120 else [0.80, 0.18, 0.02]
        floors[i] = rng.choice([1, 2, 3], p=p)

    mean_land = np.array([DISTRICTS[d][2] for d in district])
    land = np.clip(rng.lognormal(np.log(mean_land), 0.45), 2, 40)
    land = (np.round(land * 2) / 2)

    age = np.clip(rng.gamma(2.0, 12.0, n), 0, 65)
    year = (YEAR_NOW - age).round().astype(int)

    building = rng.choice(list(MATERIAL_FACTOR), size=n, p=[0.5, 0.3, 0.2])
    renovation = np.empty(n, dtype=object)
    for i, a in enumerate(age):
        p = [0.35, 0.40, 0.20, 0.05] if a > 35 else [0.12, 0.25, 0.40, 0.23]
        renovation[i] = rng.choice(list(RENOVATION_FACTOR), p=p)

    ppm2 = np.array([DISTRICTS[d][0] for d in district])
    land_price = np.array([DISTRICTS[d][1] for d in district])
    renov_f = np.array([RENOVATION_FACTOR[r] for r in renovation])
    mat_f = np.array([MATERIAL_FACTOR[b] for b in building])
    age_f = np.clip(1.0 - 0.006 * age, 0.65, 1.0) + np.where(age <= 5, 0.05, 0.0)
    floor_f = 1.0 + 0.02 * (floors - 1)

    base = area * ppm2 * renov_f * mat_f * age_f * floor_f + land * land_price
    noise = rng.lognormal(0.0, 0.10, n)
    # около 2 % объявлений с «странной» ценой (сильно завышена или занижена): выбросы, как в реальных данных
    odd = rng.random(n) < 0.02
    odd_factor = np.where(odd, rng.choice([0.6, 1.5], size=n), 1.0)
    price = (np.round(base * noise * odd_factor / 500) * 500).astype(int)

    return pd.DataFrame(
        {
            "id": np.arange(1, n + 1),
            "district": district,
            "area_m2": area,
            "land_sotka": land,
            "rooms": rooms,
            "floors": floors,
            "building_type": building,
            "renovation": renovation,
            "year_built": year,
            "price_usd": price,
        }
    )


if __name__ == "__main__":
    df = generate()
    out = Path(__file__).parent / "data" / "houses.csv"
    out.parent.mkdir(exist_ok=True)
    df.to_csv(out, index=False)
    print(f"Сохранено {len(df)} строк -> {out}")
