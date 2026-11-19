"""Разведка данных (EDA): графики для диплома и короткая сводка.

Запуск (из папки ml):  .venv\\Scripts\\python eda.py
Результат: reports/eda/*.png и reports/eda/summary.txt
"""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from features import RENOVATIONS

ROOT = Path(__file__).parent
OUT = ROOT / "reports" / "eda"
OUT.mkdir(parents=True, exist_ok=True)

plt.rcParams.update({"figure.dpi": 130, "axes.grid": True, "grid.alpha": 0.25, "axes.spines.top": False, "axes.spines.right": False})
ACCENT = "#b8532c"

df = pd.read_csv(ROOT / "data" / "houses.csv")
df["ppm2"] = df["price_usd"] / df["area_m2"]
lines: list[str] = []


def say(text: str = "") -> None:
    print(text)
    lines.append(text)


# 1. Цены в целом
say(f"Строк: {len(df)}, столбцов: {df.shape[1] - 1}, пропусков: {int(df.isna().sum().sum())}")
say(f"Цена, USD: медиана {df.price_usd.median():,.0f}, среднее {df.price_usd.mean():,.0f}, "
    f"от {df.price_usd.min():,.0f} до {df.price_usd.max():,.0f}")

fig, ax = plt.subplots(1, 2, figsize=(10, 3.8))
ax[0].hist(df.price_usd / 1000, bins=40, color=ACCENT)
ax[0].set(title="Распределение цены", xlabel="Цена, тыс. $", ylabel="Домов")
ax[1].hist(np.log10(df.price_usd), bins=40, color="#444")
ax[1].set(title="Цена в логарифмах (log10)", xlabel="log10(цена, $)")
fig.tight_layout()
fig.savefig(OUT / "01_price_distribution.png")
plt.close(fig)

# 2. Цена за м² по районам
order = df.groupby("district").ppm2.median().sort_values().index
fig, ax = plt.subplots(figsize=(9, 4.5))
ax.boxplot([df.loc[df.district == d, "ppm2"] for d in order], tick_labels=order, patch_artist=True,
           boxprops={"facecolor": "#e8c9b8"}, medianprops={"color": ACCENT, "linewidth": 2}, flierprops={"markersize": 3})
ax.set(title="Цена за м² дома по районам", ylabel="$ за м²")
plt.setp(ax.get_xticklabels(), rotation=35, ha="right")
fig.tight_layout()
fig.savefig(OUT / "02_price_per_m2_by_district.png")
plt.close(fig)
say("\nМедиана цены за м² дома по районам ($): " + ", ".join(f"{d} {df.loc[df.district == d, 'ppm2'].median():,.0f}" for d in order))

# 3. Цена от площади, по ремонту
fig, ax = plt.subplots(figsize=(7.5, 4.8))
colors = dict(zip(RENOVATIONS, ["#777", "#c9a46b", ACCENT, "#5b2a86"]))
for r in RENOVATIONS:
    sub = df[df.renovation == r]
    ax.scatter(sub.area_m2, sub.price_usd / 1000, s=7, alpha=0.5, color=colors[r], label=r)
ax.set(title="Цена и площадь дома", xlabel="Площадь дома, м²", ylabel="Цена, тыс. $")
ax.legend(title="Ремонт", markerscale=2)
fig.tight_layout()
fig.savefig(OUT / "03_price_vs_area.png")
plt.close(fig)

# 4. Ремонт, материал, этажность
fig, ax = plt.subplots(1, 3, figsize=(11, 3.8), sharey=True)
for a, col, cats in [(ax[0], "renovation", RENOVATIONS), (ax[1], "building_type", ["brick", "block", "monolith"]), (ax[2], "floors", [1, 2, 3])]:
    a.boxplot([df.loc[df[col] == c, "ppm2"] for c in cats], tick_labels=[str(c) for c in cats], patch_artist=True,
              boxprops={"facecolor": "#e8c9b8"}, medianprops={"color": ACCENT, "linewidth": 2}, flierprops={"markersize": 3})
    a.set(title=col)
ax[0].set_ylabel("$ за м²")
fig.suptitle("Цена за м² в зависимости от ремонта, материала и этажности")
fig.tight_layout()
fig.savefig(OUT / "04_price_per_m2_by_category.png")
plt.close(fig)

# 5. Корреляции числовых признаков
num = df[["price_usd", "area_m2", "land_sotka", "rooms", "floors", "year_built"]]
corr = num.corr()
fig, ax = plt.subplots(figsize=(5.8, 5))
im = ax.imshow(corr, cmap="RdBu_r", vmin=-1, vmax=1)
ax.set_xticks(range(len(corr)), corr.columns, rotation=40, ha="right")
ax.set_yticks(range(len(corr)), corr.columns)
for i in range(len(corr)):
    for j in range(len(corr)):
        ax.text(j, i, f"{corr.iloc[i, j]:.2f}", ha="center", va="center", fontsize=8)
ax.grid(False)
ax.set_title("Корреляции")
fig.colorbar(im, shrink=0.8)
fig.tight_layout()
fig.savefig(OUT / "05_correlations.png")
plt.close(fig)
say("\nКорреляция цены с признаками: " + ", ".join(f"{c} {corr.loc['price_usd', c]:+.2f}" for c in corr.columns if c != "price_usd"))

# 6. Выбросы: цена за м² вне 1,5 межквартильных размахов своего района
q1 = df.groupby("district").ppm2.transform(lambda s: s.quantile(0.25))
q3 = df.groupby("district").ppm2.transform(lambda s: s.quantile(0.75))
iqr = q3 - q1
outliers = (df.ppm2 < q1 - 1.5 * iqr) | (df.ppm2 > q3 + 1.5 * iqr)
say(f"\nВыбросов по цене за м² (в пределах района): {int(outliers.sum())} ({outliers.mean():.1%}). "
    "Они остаются в данных: реальные объявления тоже содержат странные цены, модель должна быть к ним устойчива.")

(OUT / "summary.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"\nГрафики и сводка сохранены в {OUT}")
