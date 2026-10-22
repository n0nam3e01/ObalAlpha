import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectOffers } from '../src/lib/catalog.js';
const now = new Date('2026-10-22T13:00:00Z'); // 18:00 Astana
const offer = (id, price, start, end, district = 'Центр') => ({ id, price, title: `Набор ${id}`, description: 'Суп', items: 'Овощи', status: 'ACTIVE', qty_left: 2, pickup_date: '2026-10-22', pickup_start: start, pickup_end: end, venue: { id, name: 'Кафе', district, category: 'CAFE' } });
const boxes = [offer(1, 1500, '17:00', '20:00'), offer(2, 800, '19:00', '21:00'), offer(3, 500, '17:00', '18:00'), offer(4, 1000, '16:00', '19:00', 'Другой район')];
test('catalog combines district, price, text and pickup-now while excluding expired offers', () => {
  assert.deepEqual(selectOffers(boxes, { district: 'Центр', max: '1600', now: '1', q: 'овощи' }, now).map((b) => b.id), [1]);
  assert.deepEqual(selectOffers(boxes, { sort: 'cheapest' }, now).map((b) => b.id), [2, 4, 1]);
  assert.deepEqual(selectOffers(boxes, { sort: 'ending' }, now).map((b) => b.id), [4, 1, 2]);
  assert.deepEqual(selectOffers(boxes, { venue: '4' }, now).map((b) => b.id), [4]);
});
test('nearby sorting accepts zero distance and never invents walking minutes', () => {
  const rows = boxes.map((box, index) => ({ ...box, distance_km: [1, 0, 5, null][index] }));
  assert.deepEqual(selectOffers(rows, { sort: 'nearby' }, now).map((b) => b.id), [2, 1, 4]);
});
test('future dates, sold-out and malformed pickup windows are never shown as available', () => {
  const rows = [ { ...boxes[0], pickup_date: '2026-10-23' }, { ...boxes[0], qty_left: 0 }, { ...boxes[0], pickup_end: 'bad' } ];
  assert.deepEqual(selectOffers(rows, {}, now), []);
});
