# CLAUDE.md — Обал (öbal)

## Назначение

Обал — маркетплейс нераспроданной еды со скидкой в Астане. Заведения публикуют боксы остатков дня; пользователь резервирует бокс, получает 4-значный код самовывоза, приходит и платит на кассе.

Работает как обычный мобильный сайт — не как Telegram Mini App (см. раздел «Режим сайта»).

Папка репозитория исторически называется `foodbox/` — это прежнее рабочее имя проекта. В UI и текстах бренд всегда **Обал / öbal**.

## Tech Stack

| Слой | Технология |
|------|-----------|
| Frontend | React 19 + Vite, plain CSS, React Router v7 |
| Backend | Node.js + Express 5, Prisma ORM |
| Database | PostgreSQL (Supabase) |
| Auth | имя + телефон → JWT (v0 pilot, **без верификации** — см. «Аутентификация») |
| Анимации | только CSS transitions |

## Структура

```
foodbox/
  frontend/
    src/
      styles/tokens.css     — все CSS-переменные
      i18n/ru.js            — ВСЕ строки на русском
      i18n/kk.js            — казахский стаб
      i18n/index.js         — активный словарь + getLang/setLang
      lib/api.js            — apiFetch с JWT
      lib/format.js         — formatTenge, formatTimeWindow, ...
      lib/tg.js             — обёртки Telegram.WebApp
      context/
        AuthContext.jsx     — AuthProvider / useAuth
        ToastContext.jsx    — ToastProvider / useToast
      components/           — переиспользуемые компоненты
        PromoCarousel/      — свайп-баннеры на главной (тап → сортировка + скролл)
        Accordion/          — FAQ-аккордеон (CSS-пружина, без JS-замеров)
      screens/              — экраны приложения
        Venue/              — B2B-панель заведения (единственная; /venue)
        VenueDetail/        — потребительская страница заведения (/venue/:id)
  backend/
    lib/
      prisma.js             — синглтон PrismaClient
      auth.js               — signJwt + jwtMiddleware
      params.js             — toId / toInt (безопасный парсинг user input)
      rateLimit.js          — in-memory лимитер для credential-эндпоинтов
      telegram.js           — sendMessage(telegramId, html)
      time.js               — Астана UTC+5: startOfToday, hhmmToMinutes, ...
      cron.js               — expireBoxes + autoCancelOrders (каждые 5 мин)
    routes/
      auth.js               — POST /api/auth/phone
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
- Emoji не использовать как иконки интерфейса. Иконки — только инлайн-SVG (библиотек иконок в проекте нет). Исключения — декор, а не UI-иконки: placeholder карточки без фото (`.box-card__ph-emoji`) и парящая еда в `PromoCarousel`.
- Никаких светящихся блобов и градиентных пятен на фоне.
- Никакого `gradient-text` на заголовках.
- Никаких хардкоженных хексов вне `tokens.css`. Только `var(--)`.
- Не делать типовую «3 фичи в ряд» лендинг-раскладку.
- Не лепить `--shadow-pop` на каждый элемент. Тень — маркер слоя, не декор.

### Визуальное направление

Ориентир по вёрстке и плотности — Яндекс Go: чистая шапка, серая search-пилюля, тёмный промо-блок со спецпредложениями. По тону — Too Good To Go: тепло, понятно, без детскости.

- **`--primary`** (#C96D6A) = коралл из логотипа öbal. Цена, primary-CTA, активные состояния.
- **`--green`** (#167A4A) = «спасти еду», скидочные бейджи, экологичность.
- **`--promo-bg`** (#241715) = тёмный блок спецпредложений (промо-карусель на главной).
- Иерархия читается мгновенно: `PriceBlock` — крупнейший элемент карточки, за ним время самовывоза и дистанция.
- Заведений пока нет, поэтому `BoxCard` **не показывает название бокса и заведения** — только категория, дистанция, цена и время.
- Дружелюбно, не инфантильно. Никакой мультяшности.

### Дизайн-токены

Все токены определены в `frontend/src/styles/tokens.css`. Только они.

#### Цветовые токены

| Роль | Токен | Light | Dark |
|------|-------|-------|------|
| Primary CTA / цена / акцент | `--primary` | `#C96D6A` | `#D98A87` |
| Тёмный variant primary | `--primary-d` | `#AE514C` | `#C96D6A` |
| Коралловая подложка | `--primary-soft` | `#FBEDEC` | `#2A1A18` |
| Текст на primary | `--on-primary` | `#FFFFFF` | `#1C1B1A` |
| Скидка / «спасти еду» | `--green` | `#167A4A` | `#2BB673` |
| Фон зелёного | `--green-bg` | `#E7F4EC` | `#16241D` |
| Промо-блок (фон) | `--promo-bg` / `--promo-bg-2` | `#241715` / `#3C2521` | `#1A1110` / `#2E1C19` |
| Текст на промо | `--promo-fg` / `--promo-muted` | `#FBF1EF` | `#F2EFEC` |
| B2B-хедер (алиас промо) | `--brand` / `--on-brand` | → promo | → promo |
| Основной текст | `--ink` | `#1C1B1A` | `#F2EFEC` |
| Вторичный текст | `--muted` | `#8A8782` | `#948F89` |
| Разделитель / border | `--line` | `#ECEAE6` | `#2A2724` |
| Фон экрана | `--bg` | `#FFFFFF` | `#121110` |
| Поверхность карточки | `--surface` | `#FFFFFF` | `#1C1A18` |
| Вторичная поверхность | `--surface-2` | `#F2F1ED` | `#25221F` |
| Опасность | `--danger` / `--danger-bg` | `#D14B3C` | `#E5705F` |
| Предупреждение | `--warn-text` / `--warn-bg` | `#C2603A` | `#F5875A` |
| Звезда рейтинга | `--star` | `#F5A623` | `#FFB93D` |
| Скрим над фото | `--scrim` / `--on-scrim` | `rgba(0,0,0,.55)` | `rgba(0,0,0,.62)` |
| Ручка тоггла | `--knob` / `--knob-shadow` | `#FFFFFF` | `#F2EFEC` |

Glass-токены (`--glass-bg`, `--glass-border`, `--glass-blur`, `--shadow-float`) уже определены в `tokens.css`, утилита `.glass` — в `index.css`.

Если нужен цвет, которого нет в таблице, — **сначала заводится токен**, потом используется. Хардкод хекса в компонентном CSS запрещён (исключение: `color-mix()` от существующих токенов).

#### Типографика

Шрифты заданы в `tokens.css` и подключены в `index.html` (Google Fonts):
- `--font-ui: 'Golos Text', system-ui, sans-serif` — основной интерфейс. Выбран как ближайший свободный аналог Яндекс-шрифта с полной кириллицей (сам Yandex Sans проприетарный).
- `--font-mono: 'Space Mono', monospace` — код самовывоза, технические лейблы

| Элемент | Размер | Вес |
|---------|--------|-----|
| Заголовок экрана | 26px | 800 |
| Заголовок промо-баннера | 21px | 800 |
| Цена бокса (`PriceBlock--large`) | 24px | 800 |
| Цена в списке (`PriceBlock`) | 18px | 800 |
| Подзаголовок / имя | 18–19px | 800 |
| Основной текст | 15px | 400–600 |
| Мета (время, дистанция, `--muted`) | 13px | 400–500 |
| Лейблы капслоком | 12px | 700–800 |
| Код самовывоза (`--font-mono`) | 28–34px, `letter-spacing: 0.15em` | 700 |

Вес 800–900 — фирменная черта: заголовки и цены всегда жирные.

#### Сетка и отступы

Шаг 4px. Ступени — в токенах: `--s1: 4px` / `--s2: 8px` / `--s3: 12px` / `--s4: 16px` / `--s5: 24px` / `--s6: 32px`.
Боковой отступ страницы: `--page-px: 16px`. Внутренний паддинг карточки: `--s4`.

#### Радиусы

| Токен | Значение | Применение |
|-------|---------|-----------|
| `--radius-card` | `20px` | `BoxCard`, `Sheet`, промо-слайды, аккордеон |
| `--radius-input` | `16px` | Инпуты |
| `--radius-btn` | `14px` | Кнопки, CTA на карточке |
| `--radius-pill` | `999px` | `QtyBadge`, `CategoryChips`, search-пилюля, аватары |

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

**`BoxCard`** — hero-область `aspect-ratio: 16/10`. Если фото нет — категорийный эмодзи на мягкой подложке (`color-mix` от `--primary` / `--green`), классы `.box-card__placeholder--<category>` и `.box-card__ph-emoji`. Поверх: `QtyBadge` (слева сверху), зелёный discount-бейдж (справа сверху), кнопка избранного (справа снизу). Body: `PriceBlock--large` + `TimeWindowChip`, мета-строка «категория · дистанция», затем CTA-кнопка «Забрать» (`--primary`). **Названия бокса и заведения не рендерятся** — заведений ещё нет. Нет glass — `--surface` + `--shadow-card`. Вход: `fade-rise` со stagger.

**`PriceBlock`** — цена цветом `--primary` (коралл), зачёркнутая старая цена `--muted`. Вариант `--large` (24px) — на карточке и в детали; обычный (18px) — в списках.

**`PromoCarousel`** — тёмные промо-слайды на главной, горизонтальный `scroll-snap`. Весь слайд — один тап-таргет: задаёт сортировку и скроллит к списку. Декор — парящие эмодзи еды (`soft-float`) и SVG-искры. Точки-индикаторы под каруселью.

**`Accordion`** — FAQ на «Профиле». Высота через `grid-template-rows: 0fr → 1fr` с `--ease-spring` (никаких JS-замеров и ResizeObserver). Состояние — атрибут `data-state="open|closed"`. Соседние закрытые строки сливаются в одну поверхность, открытая отделяется зазором.

**`PrimaryButton`** — `--primary` фон, `--on-primary` текст, `--radius-btn`, min-height 48px. Sticky-версия внизу экрана — оборачивается в `.glass`-плашку с `padding-bottom: env(safe-area-inset-bottom)`. `.pressable`.

**`BottomNav`** — fixed, `calc(--nav-h + env(safe-area-inset-bottom))`, `z-index: 50`, стекло (`.glass`-токены). Активная иконка и лейбл: **`--green`** (коралл зарезервирован под цену и CTA, чтобы акцент не размывался). Анимация активации: `nav-bounce` + `label-fade`.

**`Sheet`** (bottom sheet) — `--radius-card` сверху, drag-handle. Вход: `translateY(100%) → 0` с `--dur-large --ease-inout`. Хедер получает `.glass` при прокрутке контента под ним.

**`CategoryChips`** — `--radius-pill`, плавающий вариант над лентой/картой — `.glass`-подложка. Активный чип: `--primary` фон. Переключение: `--dur-small --ease-spring`.

**`QtyBadge`** — `--radius-pill`, при обновлении числа — `badge-pop` анимация.

**`TimeWindowChip`** — `--radius-pill`, иконка часов (SVG, не emoji), `--muted` текст.

**`Toast`** — `drop-in` кейфрейм, `--shadow-pop`, авто-скрытие.

---

### Ограничения мобильного веба

Главная цель — телефон в браузере. Desktop допустим, но не приоритет.

- **Нативное ощущение** важнее «вау»: Golos Text как UI-шрифт, быстрый отклик, никаких тяжёлых переходов.
- **Light / dark**: `lib/theme.js` ставит `data-theme="dark"` на `<html>`. Все компоненты работают в обеих темах только через токены — никаких хардкоженных цветов.
- **`backdrop-filter`** дорогой — glass строго только на немногих плавающих элементах, не на ленте карточек.
- **Safe-area**: sticky CTA и `BottomNav` учитывают `env(safe-area-inset-bottom)`.
- **iOS WebKit**: SVG-рефракция не работает — `@supports`-fallback на `.glass` обязателен.
- **Максимум 3 тапа** от главного экрана до «Забронировать» (Hard Rule #7).

---

## Аутентификация

### Как есть сейчас (v0 pilot)

1. Frontend отправляет `{ name, phone }` на `POST /api/auth/phone`
2. Backend делает upsert `User` по `phone` (уникальное поле) и возвращает JWT (payload: `{ userId }`, срок 30 дней)
3. Frontend кладёт токен в `localStorage` (ключ `obal_token`) и шлёт как `Authorization: Bearer ...`
4. Эндпоинт ограничен rate-лимитом (8 запросов/мин на IP) в `lib/rateLimit.js`

### ⚠️ Известная дыра — починить до реальных пользователей

**Владение номером телефона ничем не подтверждается.** Кто угодно отправляет чужой номер и получает JWT этого аккаунта вместе с историей заказов, именем и статистикой. Rate-лимит только замедляет перебор, но не закрывает проблему.

Варианты решения (проект работает как сайт, не как Mini App — см. ниже, поэтому `initData` недоступен):

- **Telegram Login Widget** — предпочтительно: бот уже есть, поле `telegram_id` в схеме тоже, работает на обычном сайте. Виджет отдаёт подписанные данные, backend проверяет HMAC-SHA256 (`key = SHA256(botToken)`, сверяем `hash` от `dataCheckString`) и `auth_date`.
- **SMS-OTP** — нужен провайдер (для KZ, например Mobizon), это деньги и ещё один секрет.

Телефон после этого становится обычным полем профиля, а не учёткой.

## Режим сайта, а не Telegram Mini App

Проект **мигрировал с Telegram Mini App на обычный сайт**, и миграция завершена:

- `telegram-web-app.js` в `index.html` не подключается.
- `lib/haptics.js` даёт вибрацию через браузерный Vibration API — это замена телеграмным `HapticFeedback`.
- Навигация — обычные кнопки в интерфейсе, а не `BackButton` / `MainButton` из SDK.

Поэтому не возвращайте зависимость от Telegram SDK, не проверяйте `window.Telegram` и не рассчитывайте на `initData`. Бот остаётся только для серверных уведомлений (`lib/telegram.js`) и как кандидат на будущий Login Widget.

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

## Подключение CSS

В проекте два способа, оба рабочие — не смешивать в рамках одного компонента:

1. **Агрегация в `index.css`** — исторический способ, большинство компонентов и экранов (`@import './components/.../X.css'`).
2. **Самоимпорт из JSX** — `import './X.css'` в самом компоненте. Так сделаны `Accordion`, `PromoCarousel`, `CategoryChips`, `MapView`, `SegmentedControl`, `Splash`, `Home`, `Reserve`, `Venue`.

Для новых компонентов предпочтительнее **самоимпорт**: стиль уезжает вместе с компонентом и не остаётся висеть в `index.css` после удаления. При удалении компонента всегда проверять, не остался ли `@import` в `index.css` — забытый импорт на удалённый файл ломает сборку, а импорт «живого» CSS мёртвого компонента молча раздувает бандл.

## ЖЁСТКИЕ ПРАВИЛА (не нарушать)

1. **Весь UI-текст — из `src/i18n/ru.js`**. Никаких строк на русском прямо в JSX.
2. **Цены — целые числа в тенге**. Всегда `formatTenge(amount)`. Никогда float.
3. **v0: нет оплаты внутри приложения**. Пользователь резервирует → код → платит на кассе. Платёжный код изолирован за `PAYMENTS_ENABLED=true`.
4. **Plain CSS + `tokens.css`**. Никакого Tailwind, никаких inline styles, никаких захардкоженных цветов.
5. **Никакого Telegram SDK во фронтенде.** Проект — обычный сайт: навигация обычными кнопками, вибрация через `lib/haptics.js` (Vibration API). Бот используется только сервером для уведомлений.
6. **Никаких секретов в коде** — только из `.env`.
7. **Максимум 3 тапа** от главного экрана до «Забронировать».
8. **Атомарное декрементирование** qty через `prisma.$transaction` — никогда не декрементировать без проверки qty_left.
9. **Сервер всегда перепроверяет** статус и qty при резервации (клиент не доверяется).
10. **Любой user input, который становится числом, — через `lib/params.js`** (`toId` / `toInt`). Голый `parseInt` даёт `NaN`, а все сравнения с `NaN` ложны, поэтому проверка вида `if (n < 1)` пропускает мусор в Prisma и превращает 400 в 500.
11. **Возврат остатка = возврат статуса.** Если заказ отменяется (вручную или крон-джобой), инкремент `qty_left` обязан снимать `SOLD_OUT` — иначе бокс остаётся невидимым для покупателей навсегда. Но `EXPIRED` не воскрешать.
12. **Схема БД — только через `prisma migrate dev`.** `prisma db push` запрещён: именно из-за него история миграций разошлась со схемой (в репо лежала миграция прототипа без таблиц `Favorite` и `Rating`). История переписана baseline'ом `20260913120000_baseline`.
13. **Новые UI-строки — в `i18n/ru.js`, импорт из `i18n`** (не из `i18n/ru` напрямую). Единицы измерения и односимвольные подписи («ч», «мин») — тоже строки.

## Зависимости: закреплённые решения

- **`overrides.deepmerge-ts: ^8.0.2`** в `backend/package.json` — не удалять. Prisma 6 тянет `deepmerge-ts@7`, в котором 3 high-уязвимости (переполнение стека при слиянии рекурсивных объектов). Штатное исправление требует Prisma 8, то есть мажорного апгрейда через 7 с переездом конфига на `prisma.config.ts`. Override закрывает проблему точечно; после апгрейда Prisma его можно снять.
- **`node-cron@^4`** — на 3.x висела уязвимость через `uuid`.
- **Telegram SDK (`@twa-dev/sdk`) удалён** — проект работает как сайт.

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
