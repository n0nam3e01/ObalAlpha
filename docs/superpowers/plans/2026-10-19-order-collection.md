# Order Collection Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Сделать существующий цикл бронирования и выдачи проверяемым и удобным для обеих сторон.

**Architecture:** Сохранить существующие маршруты и условные транзакционные переходы. Вынести билет и опрос в отдельные frontend модули. Добавить аддитивную миграцию Order.

**Tech Stack:** React 19, Vite 6, Express 5, Prisma 6, PostgreSQL, node:test.

**Spec:** docs/superpowers/specs/2026-10-19-order-collection.md

## Global Constraints

- Название Öbal, текущий стек, Google Maps, русские тексты, палитра сохраняются.
- Сохранить пользовательские изменения, ограничения БД, проверки доступа, паролей и частоты запросов.
- Не обращаться к production БД для тестов, не выполнять production миграции.

## Review Focus

- Повтор бронирования при лимите возвращает прежний заказ; параллельные брони разных наборов не обходят лимит.
- Чужое заведение не отменяет заказ, повтор и гонка с выдачей не возвращают остаток дважды.
- Истёкшие и оплаченные заказы нельзя отменить без отдельного процесса возврата.
- Опрос не перекрывает запросы и прекращается после ухода, ошибки не скрывают прежние данные.
- На телефоне код и очередь доступны, оплаченный заказ не требует повторной оплаты.

### Task 1: Безопасные переходы и лимит

Files: backend/routes/orders.js, backend/routes/venue.js, backend/lib/orderTransitions.js, backend/prisma/schema.prisma, additive migration, backend/test/orderLifecycle.test.js, backend/test/integration.test.js.

- [x] Написать и запустить падающие проверки отмены, обязательной причины и временных отметок.
- [x] Добавить cancelVenueOrder(id, venueId, reason), лимит 3 и блокировку User перед Box; сохранить идемпотентность.
- [x] Записывать picked_up_at, cancelled_at, cancelled_by, cancellation_reason; агрегаты по picked_up_at.
- [x] Проверить гонки и ограничения на изолированной PostgreSQL в integration.test.js; выполнить backend suite.

### Task 2: Билет и очередь

Files: frontend/src/screens/Orders.jsx, frontend/src/lib/useLiveRefresh.js, frontend/src/App.jsx, frontend/src/styles/orders.css.

- [x] Добавить билет с адресом, датой, количеством, суммой, крупным кодом, маршрутом и причиной отмены.
- [x] Передавать id созданного заказа в /orders?order=id; выделять и открывать билет, включая прямое открытие старого заказа.
- [x] Добавить ограниченный опрос 20 секунд, фокус/online, отмену запросов и время синхронизации.
- [x] Перенести очередь первой в DOM, добавить отмену с причиной и возврат фокуса ввода кода.
- [x] Проверить сборку и браузерный сценарий, включая ошибки синхронизации и телефон 390 px.

### Task 3: Проверки и отчёт

Files: .github/workflows/ci.yml, docs/REVIEW_FIXES_2026-10-19.md.

- [x] Добавить CI build frontend и backend tests с отдельной PostgreSQL obal_test, запретить пропущенный интеграционный тест в CI.
- [x] Выполнить доступные проверки, независимое ревью и исправить значимые находки.
- [x] Зафиксировать фактические результаты и оставшиеся пункты обзора без заявления о полном исправлении.
