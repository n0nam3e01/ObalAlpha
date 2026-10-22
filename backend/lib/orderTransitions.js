const prisma = require('./prisma');
const { pickupInstant } = require('./time');

const conflict = () => Object.assign(new Error('order_not_active'), { status: 409 });

async function cancelOrder(id, userId) {
  return cancelReservation(id, { user_id: userId }, 'CUSTOMER');
}

async function cancelVenueOrder(id, venueId, reason) {
  if (typeof reason !== 'string' || reason.trim().length < 5 || reason.trim().length > 500) {
    throw Object.assign(new Error('cancellation_reason_invalid'), { status: 400 });
  }
  return cancelReservation(id, { box: { venue_id: venueId } }, 'VENUE', reason.trim());
}

async function cancelReservation(id, scope, author, reason = null) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id, ...scope } });
    if (!order) throw Object.assign(new Error('order_not_found'), { status: 404 });
    // Match booking/collection lock order: buyer -> box -> order.
    if (order.user_id) await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${order.user_id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Box" WHERE id = ${order.box_id} FOR UPDATE`;
    const now = new Date();
    const changed = await tx.order.updateMany({
      where: { id, status: 'RESERVED', reserved_until: { gt: now } },
      data: { status: 'CANCELLED', cancelled_at: now, cancelled_by: author, cancellation_reason: reason },
    });
    if (changed.count !== 1) throw conflict();
    const box = await tx.box.update({
      where: { id: order.box_id }, data: {
        qty_left: { increment: order.qty },
        ...(author === 'VENUE' ? { status: 'EXPIRED' } : {}),
      },
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
    if (order.user_id) await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${order.user_id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Box" WHERE id = ${order.box_id} FOR UPDATE`;
    const now = new Date();
    if (pickupInstant(order.box.pickup_date, order.box.pickup_start) > now) {
      throw Object.assign(new Error('pickup_not_started'), { status: 409 });
    }
    const changed = await tx.order.updateMany({
      where: { id: order.id, status: { in: ['RESERVED', 'PAID'] }, reserved_until: { gt: now } },
      data: { status: 'PICKED_UP', picked_up_at: now },
    });
    if (changed.count !== 1) throw conflict();
    if (order.user_id) await tx.user.update({ where: { id: order.user_id }, data: {
      boxes_saved: { increment: order.qty },
      money_saved: { increment: Math.max(0, order.box.original_price * order.qty - order.amount) },
    } });
  });
}

module.exports = { cancelOrder, cancelVenueOrder, pickupOrder };
