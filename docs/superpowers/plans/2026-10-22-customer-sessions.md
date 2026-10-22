# Customer Sessions Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. Current execution is inline.

**Goal:** Закрыть покупательскую часть E1 без смены стека и сохранить заказ/выдачу.
**Architecture:** CustomerSession в PostgreSQL, короткий JWT с sid, HttpOnly refresh; frontend с памятью и единым продлением.
**Tech Stack:** Express/Prisma/PostgreSQL, React/Vite, native fetch/cookies.
**Spec:** docs/superpowers/specs/2026-10-22-customer-sessions.md

## Global Constraints

Название, стек, пароль 8–128, rate limits, authorization и database constraints сохраняются. Production не используется для тестов, новые внешние каналы и Supabase Auth не подключаются.

## Review Focus

Отзыв всех access этой сессии; отсутствие refresh секрета в БД/JSON; CSRF; параллельные вкладки и смена личности; правильные cookie для topology размещения.

### Task 1: Серверная сессия

- [x] Написать и запустить падающие cookie/hash/origin тесты.
- [x] Добавить аддитивную модель/миграцию, JWT sid и проверку active session.
- [x] Добавить refresh/logout/logout-all, Origin guard, CORS credentials и уборку истёкших сессий.
- [x] Проверить все сценарии в изолированной PostgreSQL, включая отказ старого JWT.

### Task 2: Frontend

- [x] Наблюдать падающие проверки storage, parallel refresh, позднего ответа и смены аккаунта.
- [x] Access только в памяти; startup refresh; один повтор API; отзыв при выходе.
- [x] Не повторять мутацию от другого аккаунта и не перезаписывать свежий токен старым ответом.
- [x] Обновить форму входа (D2), добавить выход со всех устройств.
- [x] Итоговый полный browser/build/test прогон после ревью.

### Task 3: Ревью и размещение

- [x] Независимое ревью; две P2 гонки воспроизведены тестами и исправлены.
- [x] Документировать migration/rollout и ограничения third-party cookie; задать явный SameSite для текущей Render topology.
- [x] Зафиксировать итоговые результаты в журнале исправлений.
