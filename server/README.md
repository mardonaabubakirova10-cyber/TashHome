# server

API на Express + TypeScript. Запуск (из папки `server`): `npm run dev` (порт 3000), тесты: `npm test`.
Настройки берутся из `.env` в корне или из переменных окружения (см. `.env.example`).

Сейчас работают: `GET /api/health`, `GET /api/currency` (курс ЦБ с кешем на 6 часов), `GET /api/mortgage/programs`,
`POST /api/mortgage/calc`, `POST /api/estimate` (проверка данных и передача в ml-сервис).
Каталог, заявки и отзывы появятся вместе с базой данных (этап 1).
