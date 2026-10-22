import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('../../backend/node_modules/@prisma/client');
const { startOfToday } = require('../../backend/lib/time');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
const key = randomUUID();
let venue, box, buyerId;
const extraUserIds = [];
const email = `e2e-${key}@example.test`;
test.beforeAll(async () => {
  venue = await prisma.venue.create({ data: {
    name: `Тестовое кафе ${key}`, category: 'BAKERY', address: 'Астана, тестовая улица 1', district: 'Тестовый район',
    geo_lat: 51.16, geo_lng: 71.43, contact_phone: '+77000000000', venue_token: key, access_code: key.toUpperCase(),
  } });
  box = await prisma.box.create({ data: {
    venue_id: venue.id, title: `Тестовый набор ${key}`, type: 'SURPRISE', description: 'Проверка получения',
    original_price: 2000, price: 1000, qty_total: 5, qty_left: 5,
    pickup_date: startOfToday(), pickup_start: '00:00', pickup_end: '23:59',
  } });
});
test.afterAll(async () => {
  // Delete only this run's fixtures; never reset the database or call demo seed.
  const buyer = await prisma.user.findUnique({ where: { email } });
  buyerId = buyer?.id;
  if (buyerId) {
    await prisma.rating.deleteMany({ where: { user_id: buyerId } });
    await prisma.favorite.deleteMany({ where: { user_id: buyerId } });
  }
  if (venue) {
    await prisma.order.deleteMany({ where: { box: { venue_id: venue.id } } });
    await prisma.box.deleteMany({ where: { venue_id: venue.id } });
    await prisma.venue.delete({ where: { id: venue.id } });
  }
  if (buyerId) await prisma.user.delete({ where: { id: buyerId } });
  if (extraUserIds.length) await prisma.user.deleteMany({ where: { id: { in: extraUserIds } } });
  await prisma.$disconnect();
});

test('phone: selection → registration → booking → venue collection → live status → rating', async ({ page, browser }, testInfo) => {
  test.setTimeout(120000);
  await page.goto('/');
  await page.getByRole('heading', { name: box.title, exact: true }).click();
  await page.getByRole('button', { name: 'Забронировать', exact: true }).click();
  await page.getByRole('button', { name: 'Регистрация', exact: true }).click();
  await page.getByLabel('Имя', { exact: true }).fill('Покупатель E2E');
  await page.getByLabel('Почта', { exact: true }).fill(email);
  await page.getByLabel('Пароль', { exact: true }).fill('e2e-only-password-123');
  await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click();
  await page.getByRole('button', { name: 'Забронировать', exact: true }).click();
  await expect(page).toHaveURL(/\/orders\?order=\d+$/);
  const ticket = page.getByRole('article').filter({ hasText: box.title });
  await expect(ticket).toContainText('Забронировано');
  await expect(ticket).toContainText('Оплата при получении');
  expect(await page.evaluate(() => localStorage.getItem('obal_token'))).toBeNull();
  const refreshCookie = (await page.context().cookies()).find((cookie) => cookie.name === 'obal_refresh');
  expect(refreshCookie?.httpOnly).toBe(true);
  expect(refreshCookie?.path).toBe('/api/auth');
  await page.reload();
  await expect(ticket).toContainText('Забронировано');
  const code = (await ticket.locator('.pickup-code').textContent()).trim();
  expect(code).toMatch(/^[1-9]\d{5}$/);
  const fontSize = await ticket.locator('.pickup-code').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(40);
  expect(fontSize).toBeLessThanOrEqual(52);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('ticket-mobile.png'), fullPage: true });
  const partnerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const partner = await partnerContext.newPage();
    await partner.goto('http://127.0.0.1:5175/partner');
    await partner.getByLabel('Код заведения').fill(venue.access_code);
    await partner.getByRole('button', { name: 'Открыть кабинет', exact: true }).click();
    await expect(partner.getByRole('heading', { name: 'Ожидают получения: 1' })).toBeVisible();
    const queueY = (await partner.locator('.live-orders').boundingBox()).y;
    const offersY = (await partner.locator('.offers').boundingBox()).y;
    expect(queueY).toBeLessThan(offersY);
    const input = partner.getByLabel('Код с экрана покупателя');
    await input.fill(code);
    await partner.getByRole('button', { name: 'Подтвердить выдачу', exact: true }).click();
    await expect(partner.getByText('Выдача подтверждена.', { exact: true })).toBeVisible();
    await expect(input).toBeFocused();
    // Customer must observe the venue's action through automatic refresh.
    await expect(ticket).toContainText('Получен', { timeout: 25000 });
    await expect(ticket.locator('.pickup-code')).toHaveCount(0);
    const orderId = new URL(page.url()).searchParams.get('order');
    await ticket.getByLabel(`Оценка полученного заказа №${orderId}`).selectOption('5');
    await ticket.getByRole('button', { name: 'Отправить оценку' }).click();
    await expect(ticket).toContainText('Ваша оценка: 5 из 5');
    const saved = await prisma.order.findUnique({ where: { id: Number(orderId) }, include: { rating: true } });
    expect(saved.status).toBe('PICKED_UP');
    expect(saved.picked_up_at).toBeInstanceOf(Date);
    expect(saved.rating.stars).toBe(5);

    // Failed refresh keeps the last ticket and recovers without reloading.
    await page.route('**/api/orders', (route) => route.abort('failed'));
    await page.getByRole('button', { name: 'Обновить сейчас' }).click();
    await expect(page.getByRole('alert')).toContainText('Не удалось обновить данные');
    await expect(ticket).toContainText('Ваша оценка: 5 из 5');
    await page.unroute('**/api/orders');
    await page.getByRole('button', { name: 'Обновить сейчас' }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);

    // A new booking appears in the already open partner queue.
    await page.goto('/box/' + box.id);
    await page.getByRole('button', { name: 'Забронировать', exact: true }).click();
    await expect(page).toHaveURL(/\/orders\?order=\d+$/);
    const nextId = new URL(page.url()).searchParams.get('order');
    const nextTicket = page.getByRole('article', { name: `Заказ №${nextId}`, exact: true });
    await expect(nextTicket).toContainText('Забронировано');
    await expect(partner.getByRole('heading', { name: 'Ожидают получения: 1' })).toBeVisible({ timeout: 25000 });
    await expect(partner.getByText('Новых броней: 1.', { exact: false })).toBeVisible();
    await partner.getByRole('button', { name: 'Не можем выдать заказ', exact: true }).click();
    await partner.getByLabel('Причина для покупателя').fill('Набор недоступен для выдачи');
    await partner.getByRole('button', { name: 'Отменить заказ', exact: true }).click();
    await expect(partner.getByText('Заказ отменён.', { exact: false })).toBeVisible();
    await expect(nextTicket).toContainText('Отменён заведением', { timeout: 25000 });
    await expect(nextTicket).toContainText('Набор недоступен для выдачи');
    await expect(nextTicket.locator('.pickup-code')).toHaveCount(0);
    await expect(nextTicket.getByRole('button', { name: 'Отправить оценку' })).toHaveCount(0);
    expect((await prisma.box.findUnique({ where: { id: box.id } })).status).toBe('EXPIRED');

    // Model another tab logging into B in the same browser cookie jar while
    // this tab still displays A. A's mutation must not be replayed as B.
    const oldCookie = (await page.context().cookies()).find((item) => item.name === 'obal_refresh');
    const otherEmail = `other-e2e-${key}@example.test`;
    const otherBuyer = await prisma.user.create({ data: {
      name: 'Другой покупатель E2E', display_name: 'Другой покупатель E2E', email: otherEmail,
      password_hash: require('../../backend/lib/password').hashPassword('other-e2e-password-123'),
    } });
    extraUserIds.push(otherBuyer.id);
    const otherLogin = await page.context().request.post('http://127.0.0.1:3301/api/auth/login', {
      data: { identifier: otherEmail, password: 'other-e2e-password-123' }, headers: { Origin: 'http://127.0.0.1:5175' },
    });
    expect(otherLogin.status()).toBe(200);
    await prisma.customerSession.updateMany({ where: { refresh_hash: require('../../backend/lib/customerSessions').refreshHash(oldCookie.value) }, data: { revoked_at: new Date() } });
    const isolationBox = await prisma.box.create({ data: {
      venue_id: venue.id, title: `Проверка аккаунта ${key}`, type: 'SURPRISE', description: 'Изоляция вкладок',
      price: 1000, original_price: 2000, qty_total: 5, qty_left: 5,
      pickup_date: startOfToday(), pickup_start: '00:00', pickup_end: '23:59',
    } });
    await page.getByRole('link', { name: 'Главная', exact: true }).click();
    await page.getByRole('heading', { name: isolationBox.title, exact: true }).click();
    await page.getByRole('button', { name: 'Забронировать', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Аккаунт изменился в другой вкладке');
    expect(await prisma.order.count({ where: { user_id: otherBuyer.id } })).toBe(0);
    expect((await prisma.box.findUnique({ where: { id: isolationBox.id } })).qty_left).toBe(5);

    // Explicit reload may restore B, but the old booking was never replayed.
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'Другой покупатель E2E', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Выйти из аккаунта', exact: true }).click();
    await expect(page).toHaveURL('http://127.0.0.1:5175/');
    await page.reload();
    await page.goto('/orders');
    await expect(page.getByRole('heading', { name: 'Сначала войдите' })).toBeVisible();
  } finally { await partnerContext.close(); }
});
