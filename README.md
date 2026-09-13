# FoodBox

Telegram Mini App — маркетплейс нераспроданной еды со скидкой в Астане.

## Быстрый старт

### 1. Установка зависимостей

```bash
cd foodbox/backend && npm install
cd foodbox/frontend && npm install
```

### 2. Backend .env

```bash
cd foodbox/backend
cp .env.example .env
```

Заполни `.env`:

| Переменная | Где взять |
|---|---|
| `DATABASE_URL` | Supabase → Settings → Database → Transaction mode (порт 6543) |
| `DIRECT_URL` | Supabase → Session mode (тот же хост, порт 5432) |
| `TELEGRAM_BOT_TOKEN` | @BotFather → `/newbot` |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `PAYMENTS_ENABLED` | `false` для v0 |

### 3. Frontend .env

```bash
cd foodbox/frontend
cp .env.example .env
# VITE_API_URL=http://localhost:3000
```

### 4. База данных

```bash
cd foodbox/backend
npx prisma db push          # синхронизировать схему
npm run seed                # 8 заведений, ~13 боксов, демо-заказы
```

### 5. Запуск

```bash
# Терминал 1
cd foodbox/backend && npm run dev

# Терминал 2
cd foodbox/frontend && npm run dev
# → http://localhost:5173
```

Открой `http://localhost:5173` в браузере. Для проверки с телефона в той же Wi-Fi
сети: укажи в `frontend/.env` IP компьютера (`VITE_API_URL=http://192.168.x.x:3000`)
и открой `http://192.168.x.x:5173`.

---

## Режим сайта (без Telegram)

FoodBox работает как обычный сайт:

- **Просмотр боксов** — публичный, без входа.
- **Бронирование** — при первом заказе спрашиваем имя + телефон. По телефону
  создаётся пользователь и выдаётся JWT (хранится в `localStorage`). Это и есть
  «вход»: заказы, статистика и избранное привязаны к телефону.
- **Тема** — светлая по умолчанию, тёмная по системной настройке или вручную
  (переключатель в Профиле).

---

## DEMO_MODE (демо никогда не выглядит пустым)

`backend/.env` → `DEMO_MODE=true`.

При каждом старте сервера все боксы получают «живое» окно самовывоза
(`сейчас−1ч … сейчас+4ч`) и статус `ACTIVE`, поэтому список на главной всегда
полон. Это решает баг, когда боксы фильтровались по устаревшей `pickup_date`.

**Сбросить демо-данные одной командой:**

```bash
cd foodbox/backend && npm run seed
```

Пересоздаёт 8 заведений, боксы и 3 демо-заказа.

---

## Venue Dashboard (панель заведения)

Для входа в Профиль → «Я заведение» → введи `venue_token` заведения.

Токены seed-заведений:
| Заведение | Токен |
|---|---|
| Тёплый Багет | `venue-bagel-001` |
| Хлеб & Зёрна | `venue-grain-002` |
| Кофе Лес | `venue-forest-003` |
| Утро Кофейня | `venue-morning-004` |
| Дала Кухня | `venue-dala-005` |
| Казан Обед | `venue-kazan-006` |
| Сити Маркет | `venue-city-007` |
| Сахар & Ваниль | `venue-vanilla-008` |

---

## Деплой в production

### Frontend → Vercel

1. `vercel --cwd foodbox/frontend`
2. Или подключи GitHub → выбери папку `foodbox/frontend`
3. Env: `VITE_API_URL=https://your-backend.railway.app`

### Backend → Railway

1. Создай проект из папки `foodbox/backend`
2. Railway автоматически определит Node.js
3. Добавь env-переменные из `.env.example`
4. `CORS_ORIGIN=https://your-frontend.vercel.app`

### После деплоя

Обнови URL Mini App в BotFather: `/mybots` → Menu Button → новый URL Vercel.

---

## Карта (Leaflet + OpenStreetMap)

Карта реализована на **Leaflet + react-leaflet** с бесплатными тайлами CARTO
(OpenStreetMap) — **ключ API не нужен**, поэтому карта работает всегда, без
«серого квадрата».

- Компонент: `frontend/src/components/MapView/MapView.jsx`
- Маркеры строятся из `venue.geo_lat / geo_lng`; на каждое заведение —
  один маркер, представленный самым дешёвым активным боксом.
- Тап по маркеру открывает нижнюю карточку с кнопкой на детальную страницу бокса.
- Тёмная тема: тайлы CARTO Dark Matter при `data-theme="dark"`, иначе Voyager.
- Высота контейнера задаётся явно (`MapView.css`) — это убирает классический
  баг Leaflet `height:0` при переключении Список ↔ Карта.

Зависимости (уже установлены): `leaflet`, `react-leaflet`.

### Перейти на 2ГИС (опционально)

Если нужен брендовый тайл-слой 2ГИС, замените `TileLayer` в `MapView.jsx`
на 2GIS MapGL (https://dev.2gis.ru/mapgl-js/) — потребуется их ключ.

---

## Структура проекта

```
foodbox/
├── CLAUDE.md          — правила разработки
├── README.md          — эта документация
├── .gitignore
├── frontend/          — React + Vite
└── backend/           — Node + Express + Prisma
```
