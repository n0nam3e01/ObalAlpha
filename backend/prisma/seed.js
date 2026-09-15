require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { startOfToday, eveningWindow, pickupInstant } = require('../lib/time');

const prisma = new PrismaClient();

// Pickup windows are realistic Astana evening hours (17:00–23:00, never night,
// never crossing midnight). Each box gets its own window for variety.

// ─────────────────────────────────────────────────────────────
// Venue + box definitions — 8 original-brand Astana venues.
// Districts: Есиль / Алматы / Сарыарка. Discounts 55–80%, qty 2–8.
// ─────────────────────────────────────────────────────────────
const VENUES = [
  {
    token: 'venue-bagel-001',
    name: 'Тёплый Багет',
    category: 'BAKERY',
    description: 'Городская пекарня полного цикла. Хлеб на закваске, багеты и круассаны из печи каждое утро.',
    address: 'пр. Мәңгілік Ел, 49, Астана',
    district: 'Есиль',
    geo_lat: 51.0902, geo_lng: 71.4180,
    contact_phone: '+7 717 200-11-01',
    commission_pct: 20,
    boxes: [
      { title: 'Хлебная корзина', type: 'SURPRISE', original_price: 2800, price: 990, qty: 6,
        description: 'Ассорти из хлеба и выпечки к закрытию: багеты, чиабатта, ржаные булки.' },
      { title: 'Круассановый набор', type: 'ITEMIZED', original_price: 3400, price: 1190, qty: 4,
        description: 'Свежие слойки на вечер.', items: '3× круассан\n2× булочка с корицей\n1× pain au chocolat' },
    ],
  },
  {
    token: 'venue-grain-002',
    name: 'Хлеб & Зёрна',
    category: 'BAKERY',
    description: 'Ремесленная пекарня с цельнозерновым хлебом и домашней выпечкой.',
    address: 'ул. Сейфуллина, 27, Астана',
    district: 'Сарыарка',
    geo_lat: 51.1690, geo_lng: 71.4070,
    contact_phone: '+7 717 244-22-02',
    commission_pct: 20,
    boxes: [
      { title: 'Утренний бокс', type: 'SURPRISE', original_price: 2200, price: 790, qty: 5,
        description: 'То, что осталось с утренней выпечки: булочки, кексы, печенье.' },
    ],
  },
  {
    token: 'venue-forest-003',
    name: 'Кофе Лес',
    category: 'CAFE',
    description: 'Уютная кофейня с авторскими напитками, завтраками и десертами.',
    address: 'пр. Туран, 37, Астана',
    district: 'Есиль',
    geo_lat: 51.0951, geo_lng: 71.4270,
    contact_phone: '+7 701 110-33-03',
    commission_pct: 20,
    boxes: [
      { title: 'Кофе + закуска', type: 'ITEMIZED', original_price: 3200, price: 990, qty: 4,
        description: 'Напиток и закуска к вечеру.', items: '2× фильтр-кофе 300мл\n1× сырник\n1× тост с авокадо' },
      { title: 'Десертный сюрприз', type: 'SURPRISE', original_price: 2600, price: 890, qty: 3,
        description: 'Ассорти из оставшихся пирожных и чизкейков.' },
    ],
  },
  {
    token: 'venue-morning-004',
    name: 'Утро Кофейня',
    category: 'CAFE',
    description: 'Кофейня у дома: специальные сорта, свежая выпечка и горячие сэндвичи.',
    address: 'ул. Бейбітшілік, 24, Астана',
    district: 'Алматы',
    geo_lat: 51.1810, geo_lng: 71.4455,
    contact_phone: '+7 707 222-44-04',
    commission_pct: 14,
    boxes: [
      { title: 'Сэндвич-бокс', type: 'ITEMIZED', original_price: 2400, price: 900, qty: 5,
        description: 'Горячие сэндвичи и напиток.', items: '2× сэндвич с курицей\n1× капучино 300мл' },
    ],
  },
  {
    token: 'venue-dala-005',
    name: 'Дала Кухня',
    category: 'PREPARED',
    description: 'Домашняя казахская кухня: бешбармак, манты, куырдак и горячие супы.',
    address: 'ул. Кенесары, 42, Астана',
    district: 'Алматы',
    geo_lat: 51.1785, geo_lng: 71.4395,
    contact_phone: '+7 717 250-55-05',
    commission_pct: 20,
    boxes: [
      { title: 'Горячий обед', type: 'SURPRISE', original_price: 3200, price: 1090, qty: 6,
        description: 'Остатки дневного меню: суп + горячее + гарнир. Меняется каждый день.' },
      { title: 'Манты-бокс', type: 'ITEMIZED', original_price: 2800, price: 990, qty: 4,
        description: 'Свежие манты на вечер.', items: '8× манты с мясом\n1× соус\n1× салат' },
    ],
  },
  {
    token: 'venue-kazan-006',
    name: 'Казан Обед',
    category: 'PREPARED',
    description: 'Готовая еда на каждый день: плов, лагман, самса и салаты.',
    address: 'ул. Жубанова, 15, Астана',
    district: 'Сарыарка',
    geo_lat: 51.1665, geo_lng: 71.4030,
    contact_phone: '+7 717 233-66-06',
    commission_pct: 20,
    boxes: [
      { title: 'Плов-бокс', type: 'SURPRISE', original_price: 2600, price: 990, qty: 7,
        description: 'Большая порция плова с мясом и салатом к закрытию.' },
    ],
  },
  {
    token: 'venue-city-007',
    name: 'Сити Маркет',
    category: 'SUPERMARKET',
    description: 'Ежедневные боксы из кулинарии и пекарни — всё свежее, со скидкой перед закрытием.',
    address: 'пр. Абая, 8, Астана',
    district: 'Сарыарка',
    geo_lat: 51.1640, geo_lng: 71.4100,
    contact_phone: '+7 800 080-77-07',
    commission_pct: 12,
    boxes: [
      { title: 'Кулинария-бокс', type: 'SURPRISE', original_price: 4200, price: 1490, qty: 8,
        description: 'Готовые блюда, салаты и выпечка из кулинарии — свежее, уходит со скидкой.' },
      { title: 'Пекарня маркета', type: 'ITEMIZED', original_price: 1800, price: 590, qty: 8,
        description: 'Выпечка на вечер.', items: '2× самса\n2× пирожок с картошкой\n1× сочник' },
    ],
  },
  {
    token: 'venue-vanilla-008',
    name: 'Сахар & Ваниль',
    category: 'DESSERT',
    description: 'Кондитерская: торты, эклеры, моти и авторские пирожные. Остатки дня — всегда свежие.',
    address: 'пр. Кабанбай батыра, 11, Астана',
    district: 'Есиль',
    geo_lat: 51.0940, geo_lng: 71.4150,
    contact_phone: '+7 707 999-88-08',
    commission_pct: 20,
    boxes: [
      { title: 'Сладкий сюрприз', type: 'SURPRISE', original_price: 4000, price: 1290, qty: 5,
        description: 'Ассорти к вечеру: эклеры, пирожные, кусочек торта.' },
      { title: 'Моти-бокс', type: 'ITEMIZED', original_price: 3600, price: 1190, qty: 4,
        description: 'Набор японских десертов.', items: '6× моти (ассорти)\n1× тирамису 150г' },
    ],
  },
];

// Stable, human-friendly 6-char access codes per venue (safe alphabet — no
// O/0/I/1/L). These are what a manager types or receives in a magic link.
const ACCESS_CODES = {
  'venue-bagel-001': 'BG7K2M',
  'venue-grain-002': 'GR4N8P',
  'venue-forest-003': 'KF3S5T',
  'venue-morning-004': 'UT9R6Q',
  'venue-dala-005': 'DL2A7H',
  'venue-kazan-006': 'KZ8N3V',
  'venue-city-007': 'ST5Y9C',
  'venue-vanilla-008': 'VN6L4X',
};

function randomCode4() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

async function clearTransactional() {
  // Order matters due to FKs.
  await prisma.rating.deleteMany();
  await prisma.order.deleteMany();
  await prisma.box.deleteMany();
}

async function seedVenuesAndBoxes() {
  const today = startOfToday();
  const created = [];

  for (const v of VENUES) {
    const accessCode = ACCESS_CODES[v.token];
    const venue = await prisma.venue.upsert({
      where: { venue_token: v.token },
      update: {
        name: v.name, category: v.category, description: v.description,
        address: v.address, district: v.district, geo_lat: v.geo_lat, geo_lng: v.geo_lng,
        contact_phone: v.contact_phone, commission_pct: v.commission_pct, is_active: true,
        access_code: accessCode, default_pickup_start: '18:00', default_pickup_end: '21:00',
      },
      create: {
        name: v.name, category: v.category, description: v.description,
        address: v.address, district: v.district, geo_lat: v.geo_lat, geo_lng: v.geo_lng,
        contact_phone: v.contact_phone, kaspi_info: 'Kaspi QR на кассе',
        commission_pct: v.commission_pct, venue_token: v.token,
        access_code: accessCode, default_pickup_start: '18:00', default_pickup_end: '21:00',
      },
    });

    const boxes = [];
    for (const b of v.boxes) {
      const win = eveningWindow();
      const box = await prisma.box.create({
        data: {
          venue_id: venue.id,
          title: b.title,
          type: b.type,
          description: b.description,
          items: b.items ?? null,
          original_price: b.original_price,
          price: b.price,
          qty_total: b.qty,
          qty_left: b.qty,
          pickup_start: win.start,
          pickup_end: win.end,
          pickup_date: today,
          status: 'ACTIVE',
        },
      });
      boxes.push(box);
    }
    created.push({ venue, boxes });
  }
  return created;
}

const DEMO_BUYERS = [
  { name: 'Аруна', phone: '+7 700 000-00-01', avatar_preset: 'sunset' },
  { name: 'Данияр', phone: '+7 700 000-00-02', avatar_preset: 'ocean' },
  { name: 'Камила', phone: '+7 700 000-00-03', avatar_preset: 'forest' },
];

async function seedDemoOrders(created) {
  // A few phone-based demo buyers.
  const buyers = [];
  for (const b of DEMO_BUYERS) {
    const u = await prisma.user.upsert({
      where: { phone: b.phone },
      update: { name: b.name, display_name: b.name },
      create: { name: b.name, display_name: b.name, phone: b.phone, avatar_preset: b.avatar_preset, language: 'ru' },
    });
    buyers.push(u);
  }

  const today = startOfToday();
  const reservedUntilFor = (box) => {
    return pickupInstant(today, box.pickup_end);
  };

  const impact = new Map(); // userId -> { boxes, money }
  const bump = (uid, boxes, money) => {
    const cur = impact.get(uid) ?? { boxes: 0, money: 0 };
    cur.boxes += boxes; cur.money += money; impact.set(uid, cur);
  };

  // 2–3 demo orders per venue so every panel is populated at demo time.
  for (let vi = 0; vi < created.length; vi++) {
    const { venue, boxes } = created[vi];
    if (!boxes.length) continue;
    const plan = [
      { box: boxes[0], status: 'RESERVED' },
      { box: boxes[Math.min(1, boxes.length - 1)], status: 'RESERVED' },
      { box: boxes[0], status: 'PICKED_UP' },
    ];
    for (let i = 0; i < plan.length; i++) {
      const o = plan[i];
      const buyer = buyers[(vi + i) % buyers.length];
      const amount = o.box.price;
      const commission = Math.round((amount * venue.commission_pct) / 100);
      await prisma.order.create({
        data: {
          user_id: buyer.id,
          box_id: o.box.id,
          qty: 1,
          amount,
          commission,
          status: o.status,
          pickup_code: randomCode4(),
          reserved_until: reservedUntilFor(o.box),
          customer_name: buyer.display_name,
          customer_phone: buyer.phone,
        },
      });
      await prisma.box.update({ where: { id: o.box.id }, data: { qty_left: { decrement: 1 } } });
      if (o.status === 'PICKED_UP') bump(buyer.id, 1, o.box.original_price - amount);
    }
  }

  for (const [uid, imp] of impact) {
    await prisma.user.update({ where: { id: uid }, data: { boxes_saved: imp.boxes, money_saved: imp.money } });
  }

  return buyers[0];
}

// Exported for server startup (DEMO_MODE): roll every box forward to today's
// Astana date with a fresh realistic evening window so the list is never empty
// and never shows night-time hours.
async function refreshDemoWindows() {
  const today = startOfToday();
  const boxes = await prisma.box.findMany({ select: { id: true, qty_total: true } });
  for (const b of boxes) {
    const win = eveningWindow();
    await prisma.box.update({
      where: { id: b.id },
      data: {
        pickup_date: today,
        pickup_start: win.start,
        pickup_end: win.end,
        status: 'ACTIVE',
        qty_left: b.qty_total,
      },
    });
  }
  return boxes.length;
}

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('Demo seed deletes orders and boxes. Use only a disposable local database with ALLOW_DEMO_SEED=true.');
  }
  console.log('Seeding Obal (8 Astana venues)...');
  await clearTransactional();
  const created = await seedVenuesAndBoxes();
  const boxCount = created.reduce((n, c) => n + c.boxes.length, 0);
  await seedDemoOrders(created);
  console.log(`✓ ${created.length} venues, ${boxCount} boxes, ${DEMO_BUYERS.length} demo buyers, ${created.length * 3} demo orders seeded`);
  console.log('  pickup windows: realistic Astana evening hours (17:00–23:00)');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ACCESS CODES — "Obal для бизнеса" login');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const c of created) {
    const code = c.venue.access_code;
    console.log(`  ${code}   ${c.venue.name}`);
    console.log(`         magic link: /venue?key=${code}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

module.exports = { refreshDemoWindows };

// Run as a script (npm run seed), not when require()'d by the server.
if (require.main === module) {
  main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
