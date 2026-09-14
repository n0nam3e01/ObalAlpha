# Öbal Alpha

Маркетплейс свежей еды, которую заведения не успели продать за день. Покупатель выбирает набор со скидкой, бронирует самовывоз или доставку, а магазин обрабатывает заказ в отдельном кабинете.

## Что уже работает

- каталог, поиск, категории и карточка предложения;
- Google Maps без отдельного SDK;
- регистрация и вход по почте или телефону с паролем;
- бронирование, сервисный сбор и доставка;
- заказы покупателя с кодом получения;
- кабинет заведения: предложения, показатели, выдача и создание набора;
- PostgreSQL/Supabase через Prisma.

## Локальный запуск

```bash
cd backend
copy .env.example .env
npm install
npx prisma migrate deploy
npm run seed
npm run dev
```

Во втором терминале:

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Фронтенд откроется на `http://localhost:5173`, API работает на `http://localhost:3000/api`.

## Продакшен

Базу удобно поднять в Supabase. Backend можно разместить в Railway или Render, frontend в Vercel. Для frontend укажите `VITE_API_URL`, для backend заполните `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` и `CORS_ORIGIN`.

Telegram-бот не входит в Alpha. Позже он будет получать события новых заказов из backend и позволит заведению подтвердить выдачу.
