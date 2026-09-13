export function formatTenge(amount) {
  // Thin-space (U+2009) thousands separator for a clean "1 190 ₸" look,
  // deterministic across browsers/locales.
  const grouped = String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${grouped} ₸`;
}

export function formatTimeWindow(start, end) {
  return `${start}–${end}`;
}

// Astana (UTC+5) calendar date as "YYYY-MM-DD", for a given input or "now".
function astanaYMD(input) {
  const base = input ? new Date(input) : new Date();
  const astana = new Date(base.getTime() + 5 * 60 * 60 * 1000);
  return astana.toISOString().slice(0, 10);
}

// True when the given pickup_date falls on today's Astana calendar day.
export function isPickupToday(dateInput) {
  if (!dateInput) return true; // v0: boxes are always today
  return astanaYMD(dateInput) === astanaYMD();
}

// Display rule: today → "Сегодня 18:00–21:30"; otherwise prefix the date.
export function formatPickup(start, end, dateInput, todayLabel) {
  if (!start || !end) return '';
  const window = `${start}–${end}`;
  if (isPickupToday(dateInput)) return `${todayLabel} ${window}`;
  return `${formatDate(dateInput)} ${window}`;
}

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export function discountPct(original, price) {
  return Math.round((1 - price / original) * 100);
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

export function formatDistance(km) {
  if (km === null || km === undefined) return null;
  if (km < 1) return `${Math.round(km * 1000)} м`;
  return `${km} км`;
}

export function maskPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  const last2 = digits.slice(-2);
  return `+${digits[0]} ••• ••• •• ${last2}`;
}

export function pluralBoxes(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'бокс';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'бокса';
  return 'боксов';
}
