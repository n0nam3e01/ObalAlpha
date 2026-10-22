import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const server = await createServer({ configFile: false, plugins: [react()], optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(() => server.close());
const { default: OrderTicket } = await server.ssrLoadModule('/src/components/OrderTicket.jsx');
const order = { id: 12, qty: 2, amount: 2500, status: 'RESERVED', pickup_code: '123456',
  reserved_until: '2099-10-19T18:00:00Z', box: { title: 'Набор', pickup_date: '2099-10-19', pickup_start: '19:00', pickup_end: '23:00',
    venue: { name: 'Кафе', address: 'Астана, улица 1', geo_lat: 51.1, geo_lng: 71.4 } } };
const render = (changes) => renderToStaticMarkup(createElement(OrderTicket, { order: { ...order, ...changes }, onCancel() {} }));
test('reservation ticket shows collection code, quantity, address, payment and a Google Maps route', () => {
  const html = render();
  for (const text of ['123456', 'Кафе', 'Астана, улица 1', '19:00–23:00', 'Количество: 2', 'Оплата при получении']) assert.ok(html.includes(text), text);
  assert.match(html, /google\.com\/maps\/dir/);
  assert.match(html, /Отменить бронирование/);
});
test('paid, cancelled and expired tickets never invite a duplicate payment or expose a live code', () => {
  const paid = render({ status: 'PAID' });
  assert.ok(paid.includes('Заказ оплачен'));
  assert.ok(!paid.includes('Оплата при получении'));
  assert.ok(!paid.includes('Отменить бронирование'));
  const cancelled = render({ status: 'CANCELLED', cancelled_by: 'VENUE', cancellation_reason: '<Нет набора>' });
  assert.ok(cancelled.includes('Отменён заведением'));
  assert.ok(cancelled.includes('&lt;Нет набора&gt;'));
  assert.ok(!cancelled.includes('123456'));
  const expired = render({ reserved_until: '2020-01-01T00:00:00Z' });
  assert.ok(!expired.includes('123456'));
  assert.ok(!expired.includes('Отменить бронирование'));
});
test('only a collected order offers a rating and a saved rating is shown once', () => {
  assert.ok(!render().includes('Отправить оценку'));
  assert.ok(render({ status: 'PICKED_UP' }).includes('Отправить оценку'));
  const rated = render({ status: 'PICKED_UP', rating: { stars: 5 } });
  assert.ok(rated.includes('Ваша оценка: 5 из 5'));
  assert.ok(!rated.includes('Отправить оценку'));
});
