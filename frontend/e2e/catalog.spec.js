import { test, expect } from '@playwright/test';

test('catalog preserves filters and position when returning from an offer', async ({ page }) => {
  const day = new Date(Date.now() + 5 * 3600000).toISOString().slice(0, 10);
  const rows = Array.from({ length: 18 }, (_, index) => ({
    id: 9000 + index, title: `Набор ${index}`, description: 'Свежая выпечка',
    price: 500 + index, original_price: 1500, discount_pct: 67,
    status: 'ACTIVE', qty_left: 3, pickup_date: day, pickup_start: '00:00', pickup_end: '23:59',
    photo_url: null, venue: { id: 9000, name: 'Пекарня', category: 'BAKERY', district: 'Есиль', address: 'Астана', geo_lat: 51.16, geo_lng: 71.43 },
  }));
  await page.route('**/api/boxes**', async (route) => {
    const match = new URL(route.request().url()).pathname.match(/\/boxes\/(\d+)$/);
    if (!match) await new Promise((resolve) => setTimeout(resolve, 400));
    return route.fulfill({ json: match ? rows.find((row) => row.id === Number(match[1])) : rows });
  });
  await page.goto('/?district=' + encodeURIComponent('Есиль'));
  await expect(page.locator('.deal-card')).toHaveCount(18);
  await expect(page.locator('.deal-card').first()).toContainText('Фото набора пока нет');
  await expect(page.locator('.deal-card').first().locator('.price')).toBeInViewport();
  await page.locator('.deal-card').nth(12).scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  await page.locator('.deal-card').nth(12).click();
  await expect(page.getByRole('heading', { name: 'Набор 12', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Назад', exact: true }).click();
  await expect(page.getByLabel('Район', { exact: true })).toHaveValue('Есиль');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before - 100);
  await page.getByLabel('Поиск еды и заведений').fill('не существует');
  await expect(page.getByRole('heading', { name: 'Нет подходящих наборов' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Поиск еды и заведений')).toHaveValue('не существует');
});
