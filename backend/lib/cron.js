const cron = require('node-cron');
const prisma = require('./prisma');
const { startOfToday, nowHHMM } = require('./time');

async function expireBoxesAndCancelOrders() {
  const now = new Date();
  await prisma.box.updateMany({ where: {
    status: { in: ['ACTIVE', 'SOLD_OUT'] },
    OR: [{ pickup_date: { lt: startOfToday() } },
      { pickup_date: startOfToday(), pickup_end: { lte: nowHHMM() } }],
  }, data: { status: 'EXPIRED' } });
  // Never re-list expired food. Conditional transitions tolerate overlapping sweeps.
  await prisma.order.updateMany({ where: {
    status: 'RESERVED', reserved_until: { lte: now },
  }, data: { status: 'NO_SHOW' } });
}

function startCron() {
  const run = () => expireBoxesAndCancelOrders().catch((err) => console.error('Expiry sweep failed:', err.code || err.message));
  run();
  return cron.schedule('* * * * *', run);
}
module.exports = { startCron, expireBoxesAndCancelOrders };
