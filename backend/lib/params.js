// Route-param / body coercion helpers.
//
// parseInt('abc') is NaN, and every comparison against NaN is false — so a
// plain `if (n < 1)` range check silently lets garbage through to Prisma,
// which then throws and surfaces as a 500 instead of a 400. Everything that
// turns user input into a number goes through here.

// A positive integer id, or null when the input isn't one.
function toId(value) {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// An integer within [min, max], or null. Use for qty, prices, stars.
function toInt(value, { min = -Infinity, max = Infinity } = {}) {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

module.exports = { toId, toInt };
