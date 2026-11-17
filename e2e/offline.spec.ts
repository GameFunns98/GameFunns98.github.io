import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

test('the portable review contains both languages, themes and complete local media', async ({ page }) => {
  await page.route(/^https?:/, route => route.abort());
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const file = pathToFileURL(path.resolve('.preview/GameFunns-preview.html')).href;
  await page.goto(file + '?lang=en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('GameFunns');
  await page.evaluate(() => document.fonts.ready);
  for (const image of await page.locator('img[src]:visible').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty('complete', true);
    expect(await image.evaluate(element => element.naturalWidth)).toBeGreaterThan(0);
  }
  await page.screenshot({ path: 'test-results/review/offline-desktop-dark.png', fullPage: true });
  await page.getByRole('button', { name: 'Use light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.screenshot({ path: 'test-results/review/offline-desktop-light.png', fullPage: true });
  await page.getByRole('link', { name: /Přepnout do češtiny/ }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'cs');
  await expect(page.getByRole('heading', { name: /Ahoj,.*jsem Václav/ })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/review/offline-mobile-light.png', fullPage: true });
  expect(errors).toEqual([]);
});
