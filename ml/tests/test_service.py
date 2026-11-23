import sys
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))
from service import app  # noqa: E402

HOUSE = {
    "district": "yunusabad", "area_m2": 180, "land_sotka": 6, "rooms": 5, "floors": 2,
    "building_type": "brick", "renovation": "euro", "year_built": 2015,
}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:  # with — чтобы сработала загрузка модели
        yield c


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["model_loaded"] is True


def test_predict_shape(client):
    r = client.post("/predict", json=HOUSE)
    assert r.status_code == 200
    d = r.json()
    assert d["price_low"] <= d["predicted_price"] <= d["price_high"]
    assert 30_000 < d["predicted_price"] < 1_000_000
    assert 1 <= len(d["factors"]) <= 4
    assert d["price_per_m2"] == pytest.approx(d["predicted_price"] / HOUSE["area_m2"], rel=0.02)


def test_more_area_costs_more(client):
    small = client.post("/predict", json={**HOUSE, "area_m2": 100}).json()["predicted_price"]
    big = client.post("/predict", json={**HOUSE, "area_m2": 300}).json()["predicted_price"]
    assert big > small


def test_better_renovation_costs_more(client):
    rough = client.post("/predict", json={**HOUSE, "renovation": "none"}).json()["predicted_price"]
    fine = client.post("/predict", json={**HOUSE, "renovation": "designer"}).json()["predicted_price"]
    assert fine > rough


@pytest.mark.parametrize("patch", [
    {"district": "moon"}, {"area_m2": -5}, {"rooms": 0}, {"renovation": "gold"}, {"year_built": 1700},
])
def test_invalid_input_rejected(client, patch):
    assert client.post("/predict", json={**HOUSE, **patch}).status_code == 422


def test_missing_field_rejected(client):
    bad = {k: v for k, v in HOUSE.items() if k != "district"}
    assert client.post("/predict", json=bad).status_code == 422


def test_response_time_under_200ms(client):
    client.post("/predict", json=HOUSE)  # прогрев
    t = time.perf_counter()
    for _ in range(10):
        client.post("/predict", json=HOUSE)
    avg_ms = (time.perf_counter() - t) / 10 * 1000
    assert avg_ms < 200, f"{avg_ms:.0f} мс"
