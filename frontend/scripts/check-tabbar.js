// With the local frontend running, execute via Playwright CLI run-code.
// Run: npx --package @playwright/cli playwright-cli run-code --filename scripts/check-tabbar.js
async (page) => {
  await page.goto('http://127.0.0.1:5173/');
  const nav = page.getByRole('navigation', { name: 'Основная навигация' });
  const indicator = await nav.locator('.bottom-nav__indicator').elementHandle();
  async function check(label, index) {
    await nav.getByRole('link', { name: label, exact: true }).click();
    await page.waitForFunction(({ node, index }) => node.isConnected && node.style.transform === `translateX(${index * 100}%)`, { node: indicator, index });
    if (await nav.locator('[aria-current="page"]').count() !== 1) throw new Error('Exactly one active tab required');
    await page.waitForTimeout(280);
    const a = await indicator.boundingBox();
    const b = await nav.getByRole('link', { name: label, exact: true }).boundingBox();
    if (Math.abs(a.x - b.x) > 1 || Math.abs(a.width - b.width) > 1) throw new Error('Indicator alignment');
  }
  try {
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await check('Заказы', 2);
      await check('Профиль', 3);
      await check('Поиск', 1);
      await check('Главная', 0);
    }
    await page.goBack();
    await page.waitForFunction((node) => node.style.transform === 'translateX(100%)', indicator);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const duration = await indicator.evaluate((node) => getComputedStyle(node).transitionDuration);
    if (parseFloat(duration) > 0.001) throw new Error('Reduced motion must disable sliding');
    console.log('PASS: persistent indicator, four tabs, history, mobile/desktop alignment, reduced motion');
  } finally {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1280, height: 800 });
  }
}
