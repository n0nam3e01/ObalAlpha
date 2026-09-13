const cron = require('node-cron');
const prisma = require('./prisma');
const { startOfToday, endOfToday, hhmmToMinutes, astanaNowMinutes } = require('./time');
const { refreshDemoWindows } = require('../prisma/seed');

async function expireBoxesAndCancelOrders() {
  const now = new Date();
  const currentMinutes = astanaNowMinutes();
  const today = startOfToday();
  const tomorrow = endOfToday();

  // Expire boxes whose pickup window has passed today.
  const activeBoxes = await prisma.box.findMany({
    where: { status: 'ACTIVE', pickup_date: { gte: today, lt: tomorrow } },
    select: { id: true, pickup_end: true },
  });

  const expiredIds = activeBoxes
    .filter((b) => hhmmToMinutes(b.pickup_end) < currentMinutes)
    .map((b) => b.id);

  if (expiredIds.length > 0) {
    await prisma.box.updateMany({ where: { id: { in: expiredIds } }, data: { status: 'EXPIRED' } });
  }

  // Auto-cancel RESERVED orders past their reserved_until, restoring stock.
  const overdueOrders = await prisma.order.findMany({
    where: { status: 'RESERVED', reserved_until: { lt: now } },
  });

  for (const order of overdueOrders) {
    await prisma.$transaction([
      prisma.order.update({ where: { id: order.id }, data: { status: 'NO_SHOW' } }),
      prisma.box.update({ where: { id: order.box_id }, data: { qty_left: { increment: order.qty } } }),
    ], { timeout: 15000 });
  }
}

function startCron() {
  cron.schedule('*/5 * * * *', async () => {
    try {
      await expireBoxesAndCancelOrders();
    } catch (err) {
      console.error('Cron error:', err.message);
    }
  });
  console.log('Cron scheduler started (every 5 min)');

  // In DEMO_MODE: refresh all boxes to today + live pickup windows every night
  // at Astana midnight (00:00 UTC+5 = 19:00 UTC).
  if (process.env.DEMO_MODE === 'true') {
    cron.schedule('0 19 * * *', async () => {
      try {
        const n = await refreshDemoWindows();
        console.log(`DEMO_MODE nightly refresh: updated ${n} boxes to today`);
      } catch (err) {
        console.error('DEMO_MODE nightly refresh error:', err.message);
      }
    });
    console.log('DEMO_MODE: nightly box refresh scheduled (Astana midnight = 19:00 UTC)');
  }
}

module.exports = { startCron };
