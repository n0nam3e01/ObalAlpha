// Adds only the labelled demo cafe and today's menu. Existing data is preserved.
require('dotenv').config();
const { randomBytes } = require('node:crypto');
const prisma = require('../lib/prisma');
const { startOfToday, nowHHMM } = require('../lib/time');

const DEMO_NAME = 'Öbal Demo — тестовое кафе';
const photo = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=85`;
const menu = [
  { title: 'Два круассана', items: '1 круассан с шоколадом\n1 классический круассан', original_price: 3200, price: 1290, qty: 8, photo_url: photo('photo-1555507036-ab1f4038808a') },
  { title: 'Булочки с корицей', items: '2 булочки с корицей и сливочной глазурью', original_price: 1800, price: 790, qty: 6, photo_url: photo('photo-1509440159596-0249088772ff') },
  { title: 'Сэндвич с курицей', items: '1 сэндвич: курица, сыр, томат, листья салата', original_price: 2900, price: 1190, qty: 5, photo_url: photo('photo-1528735602780-2552fd46c7af') },
  { title: 'Сладкий набор', items: '2 пончика\n1 шоколадное печенье', original_price: 3800, price: 1490, qty: 7, photo_url: photo('photo-1551024506-0bccd828d307') },
];

async function main() {
  if (nowHHMM() >= '23:00') throw new Error('Pickup ends at 23:00 Astana time. Run again tomorrow.');
  const today = startOfToday();
  const result = await prisma.$transaction(async (tx) => {
    const venue = await tx.venue.findFirst({ where: { name: DEMO_NAME } }) || await tx.venue.create({
      data: {
        name: DEMO_NAME, category: 'CAFE',
        description: 'Вымышленное кафе для демонстрации Öbal. Меню, цены и заказы тестовые. Фактической выдачи еды по этому адресу нет.',
        address: 'Астана, улица Достык, 16 (тестовая точка)', district: 'Есиль',
        geo_lat: 51.124730, geo_lng: 71.432118, contact_phone: '',
        photo_url: photo('photo-1555507036-ab1f4038808a'),
        venue_token: randomBytes(32).toString('hex'), access_code: randomBytes(8).toString('hex').toUpperCase(),
        default_pickup_start: '10:00', default_pickup_end: '23:00',
        commission_pct: 20, is_active: true, is_approved: true,
      },
    });
    const boxes = [];
    for (const item of menu) {
      const existing = await tx.box.findFirst({ where: { venue_id: venue.id, title: item.title, pickup_date: today } });
      if (existing) { boxes.push(existing); continue; }
      const { qty, ...data } = item;
      boxes.push(await tx.box.create({ data: {
        ...data, venue_id: venue.id, type: 'ITEMIZED',
        description: 'Тестовое предложение для демонстрации MVP. Можно проверить бронирование и отмену заказа. Реальной продажи и выдачи еды нет. Фотография иллюстративная.',
        qty_total: qty, qty_left: qty, pickup_date: today,
        pickup_start: '10:00', pickup_end: '23:00', status: 'ACTIVE', is_approved: true,
      } }));
    }
    return { venue, boxes };
  }, { timeout: 30000 });
  console.log(JSON.stringify({
    venue_id: result.venue.id, name: result.venue.name, address: result.venue.address,
    pickup_date: today.toISOString().slice(0, 10), pickup_window: '10:00–23:00 (Астана)',
    boxes: result.boxes.map(({ id, title, price, qty_left }) => ({ id, title, price, qty_left })),
  }, null, 2));
}

main().catch((error) => { console.error('Demo cafe setup failed:', error.code || error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
