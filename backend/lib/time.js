// Single source of truth for "today" and pickup-window times.
// All date/time comparisons across the app must use these helpers so that
// the seed, the /boxes filter, the venue queries and the cron job agree.
//
// Obal operates in Astana (Asia/Almaty, UTC+5, no DST). The backend host
// may run in UTC, so every "today" / "now" computation below is anchored to
// Astana wall-clock time — never the raw server clock. This is what keeps
// pickup windows in believable evening hours instead of leaking UTC night times.

const ASTANA_OFFSET_MIN = 5 * 60; // UTC+5, fixed (no daylight saving)

function pad(n) {
  return String(n).padStart(2, '0');
}

// Astana wall-clock "now" as a Date whose UTC fields read like Astana local time.
// (Used only to extract Y/M/D/H/M — never stored directly.)
function astanaParts() {
  const d = new Date(Date.now() + ASTANA_OFFSET_MIN * 60 * 1000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
  };
}

// Today's Astana calendar date, expressed as a UTC-midnight Date so it maps
// cleanly onto Prisma's `@db.Date` column (which is date-only / UTC midnight).
function astanaTodayDate() {
  const { year, month, day } = astanaParts();
  return new Date(Date.UTC(year, month, day));
}

// Back-compat aliases used across boxes.js / venue.js / cron.js / seed.js.
// "Today" and "tomorrow" are Astana calendar days at UTC midnight.
function startOfToday() {
  return astanaTodayDate();
}

function endOfToday() {
  const d = astanaTodayDate();
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

// Minutes since Astana midnight for right now.
function astanaNowMinutes() {
  const { hours, minutes } = astanaParts();
  return hours * 60 + minutes;
}

// Current Astana wall-clock as "HH:MM".
function nowHHMM() {
  const { hours, minutes } = astanaParts();
  return `${pad(hours)}:${pad(minutes)}`;
}

// Minutes since midnight for an "HH:MM" string.
function hhmmToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Minutes-since-midnight back to "HH:MM".
function minutesToHHMM(min) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(min)));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

// A realistic evening pickup window in Astana local time, for seeding/demo.
// Start ∈ {17:00, 17:30, 18:00, 18:30, 19:00, 19:30, 20:00},
// end = start + 3 or 3.5h, clamped so it never passes 23:00 and never
// crosses midnight. Returns { start, end } as "HH:MM" strings.
function eveningWindow() {
  const startMin = 17 * 60 + Math.floor(Math.random() * 7) * 30; // 17:00..20:00 in 30m steps
  const span = Math.random() < 0.5 ? 180 : 210; // 3h or 3.5h
  const endMin = Math.min(23 * 60, startMin + span);
  return { start: minutesToHHMM(startMin), end: minutesToHHMM(endMin) };
}

function pickupInstant(date, hhmm) {
  if (typeof hhmm !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) return null;
  const day = new Date(date);
  if (!Number.isFinite(day.getTime())) return null;
  return new Date(day.toISOString().slice(0, 10) + 'T' + hhmm + ':00+05:00');
}

function todayInstant() {
  return pickupInstant(startOfToday(), '00:00');
}

module.exports = {
  pickupInstant,
  todayInstant,
  ASTANA_OFFSET_MIN,
  astanaParts,
  astanaTodayDate,
  startOfToday,
  endOfToday,
  astanaNowMinutes,
  nowHHMM,
  hhmmToMinutes,
  minutesToHHMM,
  eveningWindow,
};
