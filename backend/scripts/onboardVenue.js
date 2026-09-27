require('dotenv').config();
const { randomBytes } = require('node:crypto');
const prisma = require('../lib/prisma');

const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  if (!process.argv[i].startsWith('--') || !process.argv[i + 1]) {
    throw new Error('Use --name, --category, --address, --district, --lat, --lng, --phone and --commission.');
  }
  args[process.argv[i].slice(2)] = process.argv[i + 1];
}

const categories = ['BAKERY', 'PREPARED', 'SUPERMARKET', 'CAFE', 'DESSERT', 'OTHER'];
const lat = Number(args.lat);
const lng = Number(args.lng);
const commission = args.commission === undefined ? 20 : Number(args.commission);
if (!args.name?.trim() || !categories.includes(args.category) || !args.address?.trim() ||
    !args.phone?.trim() || !Number.isFinite(lat) || lat < -90 || lat > 90 ||
    !Number.isFinite(lng) || lng < -180 || lng > 180 ||
    !Number.isInteger(commission) || commission < 0 || commission > 100) {
  throw new Error('Invalid venue details. Required: --name --category --address --lat --lng --phone.');
}

async function main() {
  const accessCode = randomBytes(8).toString('hex').toUpperCase();
  const venue = await prisma.venue.create({ data: {
    name: args.name.trim(), category: args.category, address: args.address.trim(),
    district: args.district?.trim() || '', geo_lat: lat, geo_lng: lng,
    contact_phone: args.phone.trim(), commission_pct: commission,
    venue_token: randomBytes(32).toString('hex'), access_code: accessCode,
  } });
  console.log(`Venue #${venue.id} created. Give this private access code to its manager: ${accessCode}`);
}

main().catch((error) => { console.error('Onboarding failed:', error.code || error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
