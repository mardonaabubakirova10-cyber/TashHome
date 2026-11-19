# SPEC — техническая спецификация «Uy AI»

> Как устроено решение. Требования к продукту описаны в [PRD.md](PRD.md), план работ — в [TASKS.md](TASKS.md).

## 1. Архитектура

```
             ┌──────────────┐     ┌────────────────────┐
 Браузер ───▶│              │     │                    │
             │  web (React) │────▶│  server (Node.js)  │──▶ Gemini API (чат, эмбеддинги, голос)
 Telegram ──▶│  сайт + Mini │     │  REST API + бот    │──▶ ml-service (Python, оценка цены)
 Mini App    │  App + админ │     │                    │──▶ Telegram Bot API
             └──────┬───────┘     └─────────┬──────────┘
                    │                       │
                    └──────▶  Supabase  ◀───┘
                     (Postgres + pgvector, Auth, Storage)
```

- **web** — одно React-приложение для трёх интерфейсов: сайт, Telegram Mini App (тот же код, определяется через `window.Telegram.WebApp`) и админка (`/admin`).
- **server** — API, ИИ-ассистент, интеграции, Telegram-бот (вебхук).
- **ml-service** — отдельный сервис оценки цены: модель на Python за HTTP-эндпоинтом.
- **Supabase** — база данных, авторизация, хранение фото и векторный поиск.

## 2. Стек

| Часть | Технологии |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, i18next (ru/uz), Leaflet (карта), Recharts (дашборд) |
| Backend | Node.js 22, TypeScript, Express, Zod (валидация), grammY (бот) |
| ИИ | Google Gemini API (SDK `@google/genai`): Flash-модель для чата и function calling, модель эмбеддингов для RAG, аудиовход для голоса. Конкретные версии моделей фиксируем в `.env` на старте |
| ML | Python 3.12, pandas, scikit-learn, CatBoost, FastAPI |
| БД | Supabase: PostgreSQL + `pgvector`, Auth, Storage, RLS |
| Деплой | Vercel (web), Render (server, ml-service), Supabase Cloud |
| Качество | ESLint, Prettier, Vitest (unit), pytest (ML) |

## 3. Структура репозитория

```
nedvijka/
├── PRD.md  SPEC.md  TASKS.md  README.md
├── web/                 # React-приложение
│   └── src/
│       ├── pages/       # Catalog, Property, Assistant, Estimate, Mortgage, Compare, Favorites, admin/*
│       ├── components/
│       ├── lib/         # api-клиент, supabase, telegram, i18n
│       └── locales/     # ru.json, uz.json
├── server/
│   └── src/
│       ├── routes/      # properties, leads, reviews, chat, estimate, mortgage, admin, telegram
│       ├── ai/          # assistant (agent + tools), rag, embeddings, voice, describe, sentiment
│       ├── bot/         # grammY-бот
│       └── lib/         # supabase, gemini, currency, auth
├── ml/
│   ├── data/            # датасет
│   ├── notebooks/       # EDA и обучение (для диплома)
│   ├── train.py
│   ├── app.py           # FastAPI
│   └── model/           # сохранённая модель + metrics.json
├── supabase/
│   ├── migrations/      # SQL-схема
│   └── seed/            # демо-объекты, районы, банки, база знаний
└── knowledge/           # документы базы знаний (md/docx)
```

## 4. Модель данных (Supabase / Postgres)

| Таблица | Основные поля |
|---|---|
| `districts` | id, name_ru, name_uz, lat, lng (12 районов Ташкента) |
| `properties` | id, deal_type (`sale`/`rent`), title_ru, title_uz, description_ru, description_uz, district_id, address, lat, lng, price_usd, area_m2 (дом), land_sotka (участок), rooms, floors (этажность), building_type (`brick`/`block`/`monolith`), renovation (`none`/`basic`/`euro`/`designer`), year_built, status (`active`/`sold`/`hidden`), predicted_price_usd, price_label (`below`/`fair`/`above`), search_embedding vector(768), created_at |
| `property_photos` | id, property_id, url, position |
| `profiles` | id (= auth.users.id), role (`client`/`manager`/`admin`), full_name, phone, telegram_id, lang |
| `favorites` | user_id, property_id |
| `leads` | id, property_id?, name, phone, message, source (`site`/`miniapp`/`bot`/`assistant`), status (`new`/`in_progress`/`viewing`/`closed`/`rejected`), manager_id?, created_at |
| `reviews` | id, user_id?, rating 1–5, text, sentiment (`positive`/`neutral`/`negative`), topic, created_at |
| `chat_sessions` | id, user_id?, channel (`site`/`miniapp`/`bot`), created_at |
| `chat_messages` | id, session_id, role (`user`/`assistant`/`tool`), content, tool_calls jsonb, rating (-1/0/1), latency_ms, created_at |
| `kb_documents` | id, title, source_file, created_at |
| `kb_chunks` | id, document_id, content, embedding vector(768) |
| `mortgage_programs` | id, bank_name, program_name, rate_percent, min_down_percent, max_term_years, max_amount_usd, notes |
| `currency_rates` | date, usd_uzs (кеш курса ЦБ) |

**RLS:** каталог, районы и ипотечные программы — публичное чтение. `favorites` — только владелец. `leads`, `reviews` — вставка всем, чтение только `manager`/`admin`. Запись в админские таблицы — только через server (service role) или для роли `manager`/`admin`.

**SQL-функции:** `match_kb_chunks(query_embedding, k)` и `match_properties(query_embedding, filters, k)` для векторного поиска.

## 5. API (server, префикс `/api`)

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/properties` | Каталог с фильтрами и пагинацией |
| GET | `/properties/:id` | Карточка объекта |
| GET | `/districts` | Районы |
| GET | `/currency` | Курс USD→UZS |
| POST | `/leads` | Создать заявку |
| POST | `/reviews` | Оставить отзыв (+ анализ тональности) |
| POST | `/chat` | Сообщение ассистенту `{session_id?, text?, audio?}` → ответ + найденные объекты (стриминг SSE) |
| POST | `/chat/messages/:id/rate` | Оценка ответа 👍/👎 |
| POST | `/estimate` | Оценка цены (проксирует в ml-service) |
| GET | `/mortgage/programs` | Ипотечные программы |
| POST | `/mortgage/calc` | Расчёт платежа и графика |
| POST | `/auth/telegram` | Обмен `initData` Mini App на сессию Supabase |
| POST | `/telegram/webhook` | Вебхук бота |
| — | `/admin/*` | CRUD объектов, генерация описания, заявки, отзывы, база знаний, статистика (только `manager`/`admin`) |

Избранное и сравнение работают напрямую через Supabase-клиент (RLS). Для гостя избранное хранится в `localStorage`.

## 6. ИИ-компоненты

### 6.1. Ассистент (агент с function calling)
Системный промпт: роль консультанта агентства в Ташкенте, отвечает на языке пользователя (ru/uz), не выдумывает объекты и цены, использует только инструменты.

Инструменты:
| Tool | Что делает |
|---|---|
| `search_properties(filters, query_text)` | Структурные фильтры (район, цена, комнаты, площадь дома, участок, этажность…) + семантический поиск по `search_embedding` для «мягких» пожеланий |
| `get_property(id)` | Детали объекта |
| `search_knowledge(question)` | RAG по `kb_chunks`, возвращает фрагменты с источником |
| `calc_mortgage(price, down_payment, term, program_id?)` | Расчёт ипотеки |
| `estimate_price(params)` | Вызов ml-service |
| `create_lead(name, phone, property_id?, message)` | Создание заявки (только после явного согласия пользователя) |

Цикл: сообщение → Gemini → вызовы инструментов (до 5 шагов) → финальный ответ. Найденные объекты возвращаются отдельным полем, и фронтенд рисует их карточками. Все сообщения и вызовы инструментов логируются в `chat_messages`.

### 6.2. RAG
- Документы из `knowledge/`: этапы сделки, необходимые документы, налоги и сборы, ипотека, аренда, FAQ агентства.
- Нарезка на фрагменты ~800 символов с перекрытием 150, эмбеддинги Gemini → `kb_chunks`.
- Поиск: top-5 по косинусной близости, порог релевантности. Ниже порога ассистент честно говорит «не знаю» и предлагает связаться с менеджером. Такой вопрос попадает в дашборд «вопросы без ответа».

### 6.3. Голос
Аудио (webm/ogg из браузера или голосовое сообщение Telegram) передаётся в Gemini как аудиовход: сначала транскрипция, затем обычный цикл ассистента. Ограничение — 60 секунд.

### 6.4. Оценка стоимости (ml-service)
- **Данные:** открытый датасет домов Ташкента (Kaggle и аналоги). Если подходящего нет — синтетическая генерация по реалистичным правилам цены за м² по районам. Источник указывается в дипломе.
- **Признаки:** район, площадь дома, площадь участка (сотки), комнаты, этажность, материал стен, ремонт, год постройки; производные — цена за м² района, цена сотки в районе, доля участка в площади.
- **Модель:** baseline (линейная регрессия) → CatBoost. Сравнение по MAE, MAPE и R² на hold-out выборке и кросс-валидации. Результаты сохраняются в `model/metrics.json` и показываются в админке.
- **Выход:** `predicted_price`, интервал (квантильная регрессия или ±MAPE), топ влияющих факторов.
- **Метка объекта:** отклонение цены от прогноза < −10 % → `below`, > +10 % → `above`, иначе `fair`. Пересчитывается при сохранении объекта.

### 6.5. Генерация описаний
Админка → «Сгенерировать описание»: параметры объекта и до 4 фото (мультимодальный вход) → Gemini → описание на RU и UZ (JSON-ответ по схеме). Менеджер редактирует текст перед сохранением.

### 6.6. Анализ отзывов
Отзыв → Gemini (structured output) → `sentiment` + `topic` (сервис / цены / объект / менеджер / другое). Негативный отзыв сразу отправляется уведомлением в Telegram.

### 6.7. Оценка качества ассистента
- Тестовый набор: 30 запросов на подбор и 20 вопросов к базе знаний с ожидаемыми ответами (`server/eval/`).
- Скрипт `npm run eval` прогоняет набор и считает метрики (попадание объектов, корректность ответа по оценке LLM-судьи).
- Метрики из реального использования (доля 👍, латентность, вопросы без ответа) выводятся в дашборд.

## 7. Telegram
- **Бот (grammY, вебхук):** `/start` с кнопкой открытия Mini App; текстовые и голосовые сообщения → ассистент; менеджерам в рабочий чат (`TELEGRAM_MANAGERS_CHAT_ID`) уходят новые заявки и негативные отзывы.
- **Mini App:** `initData` проверяется на сервере (HMAC по токену бота) → создаётся или находится профиль по `telegram_id` → выдаётся сессия. Используются тема Telegram, `MainButton`, `BackButton`, haptic.

## 8. Валюта и локализация
- Курс USD→UZS берётся с открытого API ЦБ Узбекистана (cbu.uz) раз в сутки и кешируется в `currency_rates`.
- Все тексты интерфейса — в `locales/ru.json` и `locales/uz.json` (узбекский на латинице). Язык Mini App определяется по `language_code` из Telegram.

## 9. Безопасность
- Ключи (Gemini, service role Supabase, токен бота) хранятся только на сервере в `.env`. `.env` не коммитится, есть `.env.example`.
- RLS на всех таблицах, проверка роли на `/admin/*`.
- Валидация входных данных через Zod, rate-limit на `/chat`, `/leads`, `/reviews`.
- Телефон в заявке проверяется по формату `+998XXXXXXXXX`.
- Ассистент не раскрывает системный промпт и не выполняет действия, кроме разрешённых инструментов.

## 10. Переменные окружения (`.env.example`)
```
# server
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GEMINI_CHAT_MODEL=
GEMINI_EMBED_MODEL=
ML_SERVICE_URL=http://localhost:8000
TELEGRAM_BOT_TOKEN=
TELEGRAM_MANAGERS_CHAT_ID=
WEB_APP_URL=http://localhost:5173

# web
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=http://localhost:3000/api
```

## 11. Нефункциональные требования
- Адаптивная вёрстка (от 360 px), Lighthouse Performance ≥ 80 на мобильном.
- Ответ ассистента ≤ 5 с (первый токен ≤ 2 с при стриминге).
- Скелетоны при загрузке, понятные сообщения об ошибках, пустые состояния.
- Если Gemini недоступен, ассистент сообщает об этом и предлагает форму заявки; каталог работает без ИИ.
