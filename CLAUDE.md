# CLAUDE.md — FoodBox

## Назначение

FoodBox — Telegram Mini App маркетплейс нераспроданной еды со скидкой в Астане. Заведения публикуют боксы остатков дня; пользователь резервирует бокс, получает 4-значный код самовывоза, приходит и платит на кассе.

## Tech Stack

| Слой | Технология |
|------|-----------|
| Frontend | React 19 + Vite, plain CSS, React Router v7 |
| Backend | Node.js + Express 5, Prisma ORM |
| Database | PostgreSQL (Supabase) |
| Auth | Telegram initData → HMAC-SHA256 → JWT |
| Анимации | только CSS transitions |

## Структура

```
foodbox/
  frontend/
    src/
      styles/tokens.css     — все CSS-переменные
      i18n/ru.js            — ВСЕ строки на русском
      i18n/kk.js            — казахский стаб
      lib/api.js            — apiFetch с JWT
      lib/format.js         — formatTenge, formatTimeWindow, ...
      lib/tg.js             — обёртки Telegram.WebApp
      context/
        AuthContext.jsx     — AuthProvider / useAuth
        ToastContext.jsx    — ToastProvider / useToast
      components/           — переиспользуемые компоненты
      screens/              — экраны приложения
  backend/
    lib/
      prisma.js             — синглтон PrismaClient
      auth.js               — validateInitData + jwtMiddleware
      telegram.js           — sendMessage(telegramId, html)
      cron.js               — expireBoxes, autoCancelOrders, notifyFavorites
    routes/
      auth.js               — POST /api/auth/telegram
      boxes.js              — GET /api/boxes, GET /api/boxes/:id
      orders.js             — POST/GET/cancel /api/orders
      favorites.js          — GET/POST/DELETE /api/favorites
      ratings.js            — POST /api/ratings
      me.js                 — GET/PATCH /api/me
      venue.js              — venue dashboard (X-Venue-Token)
    prisma/
      schema.prisma         — 6 моделей + enums
      seed.js               — 5 заведений Астаны
    server.js               — точка входа
```

## Дизайн и UI

### Анти-паттерны — никогда не делать

- Никаких градиентов `from-purple / to-blue` и неоновых акцентов. Все цвета — только через токены `var(--)`.
- Не центрировать всё подряд (`text-align: center` на каждом блоке). Контент выровнен по левой оси, асимметрия — намеренная.
- Glassmorphism только на плавающих элементах (см. «Liquid Glass» ниже). Стекло на обычных карточках боксов — запрещено.
- Emoji не использовать как иконки интерфейса. Иконки — SVG или lucide-react. Исключение: placeholder-фон карточки без фото (`.box-card__emoji`) — это категорийный декор, не UI-иконка.
- Никаких светящихся блобов и градиентных пятен на фоне.
- Никакого `gradient-text` на заголовках.
- Никаких хардкоженных хексов вне `tokens.css`. Только `var(--)`.
- Не делать типовую «3 фичи в ряд» лендинг-раскладку.
- Не лепить `--shadow-pop` на каждый элемент. Тень — маркер слоя, не декор.

### Визуальное направление

Эталон — Too Good To Go: тепло, понятно, без детскости. Фото еды — главный визуальный элемент, текст вторичен.

- **`--green`** (#0E8F5A) = «спасти еду», бренд, экологичность.
- **`--primary`** (#FF6A1A) = цена, primary-CTA, срочность, выгода.
- Иерархия читается мгновенно: `PriceBlock` — крупнейший элемент карточки, за ним время самовывоза и дистанция.
- Дружелюбно, не инфантильно. Никакой мультяшности.

### Дизайн-токены

Все токены определены в `frontend/src/styles/tokens.css`. Только они.

#### Цветовые токены

| Роль | Токен | Light | Dark |
|------|-------|-------|------|
| Бренд / «зелёный» | `--green` | `#0E8F5A` | `#2BBE82` |
| Фон зелёного | `--green-bg` | `#E7F5EE` | `#14271E` |
| Primary CTA / цена / срочность | `--primary` | `#FF6A1A` | `#FF7A2F` |
| Тёмный variant primary | `--primary-d` | `#E85600` | `#FF6A1A` |
| Текст на primary | `--on-primary` | `#FFFFFF` | `#17161A` |
| Основной текст | `--ink` | `#1B1A17` | `#F4EFE8` |
| Вторичный текст | `--muted` | `#8A857C` | `#9A938A` |
| Разделитель / border | `--line` | `#F0EAE0` | `#2C2A30` |
| Фон экрана | `--bg` | `#FBF7F1` | `#17161A` |
| Поверхность карточки | `--surface` | `#FFFFFF` | `#211F24` |
| Вторичная поверхность | `--surface-2` | `#F7F1E8` | `#2A282F` |
| Опасность | `--danger` / `--danger-bg` | — | — |
| Предупреждение | `--warn-text` / `--warn-bg` | — | — |

**Добавить в `tokens.css`** — glass-токены (только для плавающих элементов):

```css
:root {
  --glass-bg: rgba(251, 247, 241, 0.72);
  --glass-border: rgba(255, 255, 255, 0.55);
  --glass-blur: blur(20px) saturate(180%);
  --shadow-float: 0 8px 32px rgba(40, 30, 15, 0.14);
}
[data-theme="dark"] {
  --glass-bg: rgba(23, 22, 26, 0.60);
  --glass-border: rgba(255, 255, 255, 0.07);
  --shadow-float: 0 8px 32px rgba(0, 0, 0, 0.45);
}
```

#### Типографика

Шрифты заданы в `tokens.css`:
- `--font-ui: 'Manrope', system-ui, sans-serif` — основной интерфейс
- `--font-mono: 'Space Mono', monospace` — код самовывоза, технические лейблы

Шкала кеглей: **11 / 13 / 15 / 17 / 20 / 28**. Промежуточные значения не добавлять.

| Элемент | Размер | Вес |
|---------|--------|-----|
| Цена бокса (`PriceBlock`) | 28px | 700 |
| Название заведения / бокса | 17px | 600 |
| Основной текст | 15px | 400 |
| Мета (время, дистанция, `--muted`) | 13px | 400 |
| Лейблы категорий, капслоки | 11px | 700 |
| Код самовывоза (`--font-mono`) | 28–34px, `letter-spacing: 0.15em` | 700 |

#### Сетка и отступы

Шаг 4px. Ступени — в токенах: `--s1: 4px` / `--s2: 8px` / `--s3: 12px` / `--s4: 16px` / `--s5: 24px` / `--s6: 32px`.
Боковой отступ страницы: `--page-px: 16px`. Внутренний паддинг карточки: `--s4`.

#### Радиусы

| Токен | Значение | Применение |
|-------|---------|-----------|
| `--radius-card` | `22px` | `BoxCard`, `Sheet`, модалки |
| `--radius-input` | `16px` | Инпуты, `PrimaryButton`, `GhostButton` |
| `--radius-btn` | `16px` | Кнопки |
| `--radius-pill` | `999px` | `QtyBadge`, `CategoryChips`, аватары |

Только `--radius-pill` для аватаров и маленьких бейджей. Не применять произвольные значения.

#### Тени

| Токен | Применение |
|-------|-----------|
| `--shadow-card` | `BoxCard`, карточки над `--bg` |
| `--shadow-pop` | `Sheet`, `Toast`, поп-апы |
| `--shadow-float` *(добавить)* | Glass-элементы: `BottomNav`, sticky CTA |

---

### Liquid Glass

Применять **только** к плавающим элементам поверх контента:
- `BottomNav` — нижняя навигация
- Sticky «Забронировать» внизу `BoxDetail` / `VenueDetail`
- Хедер `Sheet` когда контент прокручивается под ним
- `CategoryChips` в плавающем варианте поверх ленты/карты

**Не применять** к `BoxCard`, `--surface`-блокам, фону экрана.

Добавить утилитарный класс `.glass` в общий CSS (например, в `index.css`):

```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-float), inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass { background: var(--surface); } /* fallback: непрозрачная поверхность */
}
```

Telegram WebView на iOS (WebKit) **не поддерживает** SVG-рефракцию (`feDisplacementMap`). Blur + saturate — финальная реализация. Контраст текста на `.glass` поверх фото проверять всегда.

---

### Система анимаций

В проекте **нет Framer Motion** — только CSS transitions и keyframes. Вся система в `frontend/src/styles/motion.css`.

#### Easing-константы

| Токен | Значение | Применение |
|-------|---------|-----------|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Появление карточек, fade-in, sheet-выход |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bounce: badge, nav-иконка, chip-активация |
| `--ease-inout` | `cubic-bezier(0.65, 0, 0.35, 1)` | Sheet вход, page transitions |

#### Дюрации

| Токен | Время | Применение |
|-------|-------|-----------|
| `--dur-micro` | `120ms` | Нажатие (`.pressable`) |
| `--dur-small` | `180ms` | Чипы, тогглы, лейблы |
| `--dur-medium` | `240ms` | Карточки, badge-pop, элементы Sheet |
| `--dur-large` | `320ms` | Page transitions, открытие Sheet |

Ничего длиннее ~350ms. `prefers-reduced-motion` уже глобально обработан в `motion.css` — дополнительно ничего делать не нужно.

#### Правила применения

- **`.pressable`** (из `motion.css`) — на всех тапабельных элементах: кнопки, карточки, чипы. Даёт `scale(0.97)` при нажатии за `--dur-micro`.
- **Stagger по карточкам**: `animation-delay: calc(var(--index) * 40ms)`, `--index` задаётся через inline `style`.
- **Готовые keyframes** из `motion.css`: `fade-rise` (появление карточек), `badge-pop` (`QtyBadge`), `nav-bounce` (активация таб-иконки), `page-slide-in` / `page-slide-back` (переходы экранов), `drop-in` (`Toast`), `code-in` (анимация кода самовывоза).
- **Не анимировать**: бесконечные пульсации на фоне, авто-карусели, параллакс скролла, дёргающиеся декоративные иконки.

---

### Паттерны компонентов

**`BoxCard`** — фото сверху (height 160px, `object-fit: cover`), `QtyBadge` + discount-бейдж поверх фото. Body: название заведения (11px, `--muted`, uppercase), название бокса (16px, 800), мета-строка (12px, `--muted`), footer с `PriceBlock` и `TimeWindowChip`. Нет glass — `--surface` + `--shadow-card`. `.pressable` на всей карточке. Вход: `fade-rise` с stagger.

**`PriceBlock`** — цена крупно (28px, 700, `--ink`), зачёркнутая старая цена (`--muted`). Цена — самый крупный элемент карточки. Не красить цену в `--primary` без особой причины.

**`PrimaryButton`** — `--primary` фон, `--on-primary` текст, `--radius-btn`, min-height 48px. Sticky-версия внизу экрана — оборачивается в `.glass`-плашку с `padding-bottom: env(safe-area-inset-bottom)`. `.pressable`.

**`BottomNav`** — fixed, `calc(--nav-h + env(safe-area-inset-bottom))`, `z-index: 50`. Активная иконка и лейбл: `--primary`. Анимация активации: `nav-bounce` + `label-fade`. Переход на `.glass` — апгрейд при рефакторинге.

**`Sheet`** (bottom sheet) — `--radius-card` сверху, drag-handle. Вход: `translateY(100%) → 0` с `--dur-large --ease-inout`. Хедер получает `.glass` при прокрутке контента под ним.

**`CategoryChips`** — `--radius-pill`, плавающий вариант над лентой/картой — `.glass`-подложка. Активный чип: `--primary` фон. Переключение: `--dur-small --ease-spring`.

**`QtyBadge`** — `--radius-pill`, при обновлении числа — `badge-pop` анимация.

**`TimeWindowChip`** — `--radius-pill`, иконка часов (SVG, не emoji), `--muted` текст.

**`Toast`** — `drop-in` кейфрейм, `--shadow-pop`, авто-скрытие.

---

### Ограничения Telegram Mini App

- **Нативное ощущение** важнее «вау»: Manrope как UI-шрифт, нативные жесты, быстрый отклик.
- **Telegram themeParams**: `lib/tg.js` содержит обёртки. При наличии `tg.themeParams` применять `bg_color`, `text_color`, `button_color` через JS; при отсутствии — деградировать к токенам `tokens.css`.
- **Light / dark**: `lib/theme.js` ставит `data-theme="dark"` на `<html>`. Все компоненты работают в обеих темах только через токены — никаких хардкоженных цветов.
- **`backdrop-filter`** дорогой — glass строго только на немногих плавающих элементах, не на ленте карточек.
- **Safe-area**: sticky CTA и `BottomNav` учитывают `env(safe-area-inset-bottom)`.
- **iOS WebKit**: SVG-рефракция не работает — `@supports`-fallback на `.glass` обязателен.
- **Максимум 3 тапа** от главного экрана до «Забронировать» (Hard Rule #7).

---

## Аутентификация

1. Frontend отправляет `initData` (строка от Telegram) на `POST /api/auth/telegram`
2. Backend валидирует HMAC-SHA256: `key = HMAC("WebAppData", botToken)`, `hash = HMAC(key, dataCheckString)`
3. Проверяет `auth_date` — отклоняет если старше 24 часов
4. Upsert User по `telegram_id`, возвращает JWT (payload: `{ userId, telegramId }`)
5. Frontend хранит токен в памяти (не localStorage), прикладывает как `Authorization: Bearer ...`

## Аутентификация заведений (v0 pilot)

Заведения используют `X-Venue-Token: venue-xxx-000` в заголовке. Токен хранится в поле `venue_token` таблицы `Venue`. Для добавления токена используй Prisma Studio.

## Переменные окружения

### backend/.env
```
DATABASE_URL=          # Supabase Transaction pooler (порт 6543)
DIRECT_URL=            # Supabase Session pooler (порт 5432) — для миграций
TELEGRAM_BOT_TOKEN=    # от @BotFather
JWT_SECRET=            # случайная строка 32+ символов
PAYMENTS_ENABLED=false # true включает платёжный модуль
PORT=3000
CORS_ORIGIN=           # Vercel URL в production
```

### frontend/.env
```
VITE_API_URL=http://localhost:3000
```

## Модели данных

```
User       ← telegram_id уникален, language default "ru"
Venue      ← category enum, venue_token уникален
Box        ← type enum (SURPRISE/ITEMIZED), status enum (ACTIVE/SOLD_OUT/EXPIRED)
Order      ← status enum, pickup_code 4 цифры, reserved_until
Favorite   ← unique(user_id, venue_id)
Rating     ← только после PICKED_UP, unique per order
```

## ЖЁСТКИЕ ПРАВИЛА (не нарушать)

1. **Весь UI-текст — из `src/i18n/ru.js`**. Никаких строк на русском прямо в JSX.
2. **Цены — целые числа в тенге**. Всегда `formatTenge(amount)`. Никогда float.
3. **v0: нет оплаты внутри приложения**. Пользователь резервирует → код → платит на кассе. Платёжный код изолирован за `PAYMENTS_ENABLED=true`.
4. **Plain CSS + `tokens.css`**. Никакого Tailwind, никаких inline styles, никаких захардкоженных цветов.
5. **Telegram SDK** для навигации: BackButton вместо кастомных стрелок, MainButton для главных CTA, HapticFeedback на резервацию.
6. **Никаких секретов в коде** — только из `.env`.
7. **Максимум 3 тапа** от главного экрана до «Забронировать».
8. **Атомарное декрементирование** qty через `prisma.$transaction` — никогда не декрементировать без проверки qty_left.
9. **Сервер всегда перепроверяет** статус и qty при резервации (клиент не доверяется).

## Команды

```bash
# Backend
cd backend
npm run dev           # nodemon localhost:3000
node prisma/seed.js   # пересидировать

# Frontend
cd frontend
npm run dev           # Vite localhost:5173
npm run build         # продакшн-сборка
```

## Деплой (инструкция в README)

- Frontend → Vercel (автодеплой из папки `frontend/`)
- Backend → Railway (Dockerfile или Node buildpack, папка `backend/`)
- DB → Supabase (уже настроена)
- `CORS_ORIGIN` в backend/.env = URL Vercel-деплоя
- `VITE_API_URL` в frontend/.env = URL Railway-деплоя
