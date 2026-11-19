# ML: оценка стоимости дома

Модель по параметрам дома (район, площадь дома и участка, комнаты, этажность, материал, ремонт, год) оценивает цену.
Данные и их происхождение — в [`data/README.md`](data/README.md).

## Подготовка (один раз, из папки `ml`)

```bash
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
```

## Данные

```bash
.venv\Scripts\python generate_data.py
```
