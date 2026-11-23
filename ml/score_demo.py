"""Считает оценку модели для демо-домов сайта и сохраняет в web/src/data/predictions.json.
По ним на карточках показывается метка «ниже / по / выше рынка». После подключения backend (шаг 4.5) это делает сервер.

Запуск (из папки ml):  python score_demo.py
"""

import json
import subprocess
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from features import make_features

ROOT = Path(__file__).parent
WEB = ROOT.parent / "web"

js = "import('./src/data/properties.ts').then(m => console.log(JSON.stringify(m.PROPERTIES)))"
raw = subprocess.run(["node", "-e", js], cwd=WEB, capture_output=True, text=True, check=True, encoding="utf-8").stdout
props = json.loads(raw)

df = pd.DataFrame(props).rename(columns={
    "districtId": "district", "areaM2": "area_m2", "landSotka": "land_sotka",
    "buildingType": "building_type", "yearBuilt": "year_built",
})
sale = df[df["dealType"] == "sale"]
model = joblib.load(ROOT / "model" / "model.joblib")["median"]
pred = pd.Series(np.exp(model.predict(make_features(sale))), index=sale.index)

out = {int(df.loc[i, "id"]): int(round(v, -2)) for i, v in pred.items()}
(WEB / "src" / "data" / "predictions.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
print(f"Оценено домов на продажу: {len(out)}")
