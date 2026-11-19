"""Обучение модели оценки цены дома.

1. Делим данные: 80 % на обучение, 20 % на итоговую проверку (тест трогаем один раз).
2. Базовая модель: линейная регрессия по логарифму цены.
3. Основная модель: LightGBM (градиентный бустинг) по логарифму цены.
4. Две квантильные модели LightGBM дают нижнюю и верхнюю границы цены (диапазон 80 %).
5. Сохраняем модель, метрики и графики.

Запуск (из папки ml):  .venv\\Scripts\\python train.py
"""

import json
from pathlib import Path

import joblib
import lightgbm as lgb
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer, TransformedTargetRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error, r2_score
from sklearn.model_selection import KFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from features import CATEGORICAL, FEATURES, NUMERIC, make_features

ROOT = Path(__file__).parent
SEED = 42
LOW_Q, HIGH_Q = 0.10, 0.90  # диапазон 80 %

plt.rcParams.update({"figure.dpi": 130, "axes.grid": True, "grid.alpha": 0.25, "axes.spines.top": False, "axes.spines.right": False})
ACCENT = "#b8532c"


def metrics(y_true, y_pred) -> dict:
    ape = np.abs(y_pred - y_true) / y_true
    return {
        "MAE_usd": round(float(mean_absolute_error(y_true, y_pred))),
        "MAPE_pct": round(float(mean_absolute_percentage_error(y_true, y_pred)) * 100, 2),
        "MedAPE_pct": round(float(np.median(ape)) * 100, 2),
        "R2": round(float(r2_score(y_true, y_pred)), 4),
        "within_10pct": round(float((ape <= 0.10).mean()) * 100, 1),
        "within_20pct": round(float((ape <= 0.20).mean()) * 100, 1),
    }


def lgbm(**kw) -> lgb.LGBMRegressor:
    params = dict(
        n_estimators=800, learning_rate=0.03, num_leaves=15, min_child_samples=20,
        subsample=0.8, subsample_freq=1, colsample_bytree=0.8, reg_lambda=1.0,
        random_state=SEED, verbose=-1,
    )
    params.update(kw)
    return lgb.LGBMRegressor(**params)


def main() -> None:
    df = pd.read_csv(ROOT / "data" / "houses.csv")
    X = make_features(df)
    y = df["price_usd"].to_numpy(dtype=float)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=SEED)
    print(f"Обучение: {len(X_train)}, тест: {len(X_test)}")

    # --- Кросс-валидация на обучающей части: честно сравниваем две модели ---
    baseline = TransformedTargetRegressor(
        regressor=Pipeline([
            ("prep", ColumnTransformer([("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL), ("num", "passthrough", NUMERIC)])),
            ("lr", LinearRegression()),
        ]),
        func=np.log, inverse_func=np.exp,
    )
    boosted = TransformedTargetRegressor(regressor=lgbm(n_estimators=400), func=np.log, inverse_func=np.exp)

    cv = KFold(5, shuffle=True, random_state=SEED)
    scoring = {"mae": "neg_mean_absolute_error", "mape": "neg_mean_absolute_percentage_error", "r2": "r2"}
    cv_result = {}
    for name, model in [("linear_regression", baseline), ("lightgbm", boosted)]:
        s = cross_validate(model, X_train, y_train, cv=cv, scoring=scoring)
        cv_result[name] = {
            "MAE_usd": round(float(-s["test_mae"].mean())),
            "MAPE_pct": round(float(-s["test_mape"].mean()) * 100, 2),
            "R2": round(float(s["test_r2"].mean()), 4),
        }
        print(f"CV 5 блоков  {name:18s} {cv_result[name]}")

    # --- Итоговое обучение и проверка на тесте ---
    baseline.fit(X_train, y_train)
    pred_base = baseline.predict(X_test)

    # обучающая часть делится ещё на три: сама модель, ранняя остановка и калибровка диапазона
    X_rest, X_cal, y_rest, y_cal = train_test_split(X_train, y_train, test_size=0.15, random_state=SEED)
    X_fit, X_val, y_fit, y_val = train_test_split(X_rest, y_rest, test_size=0.1765, random_state=SEED)
    stop = [lgb.early_stopping(50, verbose=False)]
    fit_args = dict(eval_X=X_val, eval_y=np.log(y_val), callbacks=stop)
    main_model = lgbm().fit(X_fit, np.log(y_fit), **fit_args)
    low_model = lgbm(objective="quantile", alpha=LOW_Q).fit(X_fit, np.log(y_fit), **fit_args)
    high_model = lgbm(objective="quantile", alpha=HIGH_Q).fit(X_fit, np.log(y_fit), **fit_args)

    # Калибровка диапазона (conformalized quantile regression): квантильные модели обычно дают слишком узкий
    # диапазон, поэтому на отдельной выборке считаем, насколько его нужно расширить, чтобы он честно накрывал 80 %.
    lo_cal, hi_cal, ylog_cal = low_model.predict(X_cal), high_model.predict(X_cal), np.log(y_cal)
    scores = np.maximum(lo_cal - ylog_cal, ylog_cal - hi_cal)
    level = min(1.0, np.ceil((len(scores) + 1) * (HIGH_Q - LOW_Q)) / len(scores))
    widen = float(np.quantile(scores, level))  # в логарифмах; может быть и отрицательной (тогда диапазон сужается)

    pred = np.exp(main_model.predict(X_test))
    lo = np.exp(low_model.predict(X_test) - widen)
    hi = np.exp(high_model.predict(X_test) + widen)
    lo, hi = np.minimum(lo, pred), np.maximum(hi, pred)  # диапазон всегда содержит саму оценку

    test = {
        "linear_regression": metrics(y_test, pred_base),
        "lightgbm": metrics(y_test, pred),
        "interval_80pct_coverage": round(float(((y_test >= lo) & (y_test <= hi)).mean()) * 100, 1),
        "interval_median_width_pct": round(float(np.median((hi - lo) / pred)) * 100, 1),
    }
    print("\nТЕСТ (20 % данных, которых модель не видела):")
    print("  линейная регрессия:", test["linear_regression"])
    print("  LightGBM          :", test["lightgbm"])
    print(f"  диапазон 80 % (после калибровки, расширен на {widen:+.3f} в логарифмах): попадает {test['interval_80pct_coverage']} % настоящих цен, ширина ~{test['interval_median_width_pct']} % от оценки")

    # --- Важность признаков ---
    gain = main_model.booster_.feature_importance("gain")
    importance = dict(sorted(zip(FEATURES, (100 * gain / gain.sum()).round(1).tolist()), key=lambda kv: -kv[1]))
    print("\nВажность признаков, %:", importance)

    # --- Сохранение ---
    (ROOT / "model").mkdir(exist_ok=True)
    joblib.dump(
        {"median": main_model, "low": low_model, "high": high_model, "widen_log": widen,
         "features": FEATURES, "interval": [LOW_Q, HIGH_Q]},
        ROOT / "model" / "model.joblib",
    )
    report = {
        "data": {"rows": len(df), "train": len(X_train), "test": len(X_test), "source": "synthetic (ml/data/README.md)"},
        "cross_validation_train": cv_result,
        "test": test,
        "interval_widen_log": round(widen, 4),
        "feature_importance_pct": importance,
        "best_iteration": int(main_model.best_iteration_ or main_model.n_estimators),
    }
    (ROOT / "model" / "metrics.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    # --- Графики ---
    out = ROOT / "reports" / "model"
    out.mkdir(parents=True, exist_ok=True)

    fig, ax = plt.subplots(figsize=(5.6, 5.2))
    ax.scatter(y_test / 1000, pred / 1000, s=8, alpha=0.5, color=ACCENT)
    top = max(y_test.max(), pred.max()) / 1000
    ax.plot([0, top], [0, top], color="#444", lw=1)
    ax.set(title="Оценка модели и настоящая цена (тест)", xlabel="Настоящая цена, тыс. $", ylabel="Оценка, тыс. $")
    fig.tight_layout()
    fig.savefig(out / "01_predicted_vs_actual.png")
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(6.4, 3.8))
    ax.barh(list(importance)[::-1], list(importance.values())[::-1], color=ACCENT)
    ax.set(title="Что сильнее всего влияет на цену", xlabel="Вклад в модель, %")
    fig.tight_layout()
    fig.savefig(out / "02_feature_importance.png")
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(6.4, 3.8))
    ax.hist((pred - y_test) / y_test * 100, bins=50, range=(-60, 60), color=ACCENT)
    ax.axvline(0, color="#444", lw=1)
    ax.set(title="Ошибка оценки на тесте", xlabel="Отклонение оценки от настоящей цены, %", ylabel="Домов")
    fig.tight_layout()
    fig.savefig(out / "03_error_distribution.png")
    plt.close(fig)

    print(f"\nСохранено: model/model.joblib, model/metrics.json, reports/model/*.png")


if __name__ == "__main__":
    main()
