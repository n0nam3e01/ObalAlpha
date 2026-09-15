const prisma = require('./prisma');
const { pickupInstant } = require('./time');

const conflict = () => Object.assign(new Error('order_not_active'), { status: 409 });

async function cancelOrder(id, userId) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id, user_id: userId } });
    if (!order) throw Object.assign(new Error('order_not_found'), { status: 404 });
    const changed = await tx.order.updateMany({
      where: { id, status: 'RESERVED', reserved_until: { gt: new Date() } },
      data: { status: 'CANCELLED' },
    });
    if (changed.count !== 1) throw conflict();
    const box = await tx.box.update({
      where: { id: order.box_id }, data: { qty_left: { increment: order.qty } },
    });
    if (box.status === 'SOLD_OUT') {
      await tx.box.update({ where: { id: box.id }, data: {
        status: pickupInstant(box.pickup_date, box.pickup_end) > new Date() ? 'ACTIVE' : 'EXPIRED',
      } });
    }
  });
}

async function pickupOrder(order) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    if (pickupInstant(order.box.pickup_date, order.box.pickup_start) > now) {
      throw Object.assign(new Error('pickup_not_started'), { status: 409 });
    }
    const changed = await tx.order.updateMany({
      where: { id: order.id, status: { in: ['RESERVED', 'PAID'] }, reserved_until: { gt: now } },
      data: { status: 'PICKED_UP' },
    });
    if (changed.count !== 1) throw conflict();
    if (order.user_id) await tx.user.update({ where: { id: order.user_id }, data: {
      boxes_saved: { increment: order.qty },
      money_saved: { increment: Math.max(0, order.box.original_price * order.qty - order.amount) },
    } });
  });
}

module.exports = { cancelOrder, pickupOrder };
