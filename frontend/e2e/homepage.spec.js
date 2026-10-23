import { test, expect } from '@playwright/test';

for (const theme of ['light', 'dark']) {
  test(`homepage ${theme}: empty state, responsive navigation and filters`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('obal_theme', value), theme);
    await page.route('**/api/boxes**', (route) => route.fulfill({ json: [] }));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Сегодня предложений пока нет' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Навигация по сайту' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Основная навигация' })).toBeHidden();
    const header = await page.locator('.app-header').boundingBox();
    const avatar = await page.locator('.avatar').boundingBox();
    expect(header.width).toBeGreaterThan(1000);
    expect(avatar.y + avatar.height).toBeLessThanOrEqual(header.y + header.height);
    await page.screenshot({ path: `../.test-runtime/home-${theme}-desktop.png`, fullPage: true });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(page.getByRole('navigation', { name: 'Основная навигация' })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Навигация по сайту' })).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.getByText('Фильтры', { exact: true }).click();
      await expect(page.getByLabel('Цена до, ₸')).toBeVisible();
      const bounds = await page.locator('.catalog-filters > div').boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      await page.getByText('Фильтры', { exact: true }).click();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `../.test-runtime/home-${theme}-mobile.png`, fullPage: true });
  });
}
