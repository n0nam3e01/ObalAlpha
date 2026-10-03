const { randomInt } = require('node:crypto');

async function allocatePickupCode(tx, venueId, nextCode = () => String(randomInt(100000, 1000000))) {
  // Serialize code allocation across different boxes in the same venue.
  await tx.$queryRaw`SELECT id FROM "Venue" WHERE id = ${venueId} FOR UPDATE`;
  for (let attempt = 0; attempt < 25; attempt++) {
    const code = nextCode();
    const occupied = await tx.order.count({ where: {
      pickup_code: code, box: { venue_id: venueId },
      status: { in: ['RESERVED', 'PAID'] }, reserved_until: { gt: new Date() },
    } });
    if (!occupied) return code;
  }
  throw Object.assign(new Error('pickup_code_unavailable'), { status: 409 });
}

module.exports = { allocatePickupCode };
