import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import type { InstagramSnapshot } from '../src/data/instagram-types';

const discordURL = 'https://api.lanyard.rest/v1/users/922153911161323601';
const errors = new WeakMap<Page, string[]>();
const instagram = JSON.parse(readFileSync(new URL('../src/data/instagram.json', import.meta.url), 'utf8')) as InstagramSnapshot;

test.beforeEach(async ({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on('pageerror', error => messages.push(error.message));
  // Never depend on third-party availability, quotas, or a person's real activity.
  await page.route(/^https?:\/\//, route => {
    const { hostname } = new URL(route.request().url());
    return hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
});

test.afterEach(async ({ page }) => {
  expect(errors.get(page) || [], 'Uncaught browser errors').toEqual([]);
});

test('the gallery loads media on demand and preserves an exit after failure', async ({ page }) => {
  await page.goto('/en/#moments');
  const gallery = page.locator('[data-moments]');
  await expect(gallery.locator('video')).toHaveCount(0);
  await gallery.getByRole('button', { name: 'Grand Theft Auto V', exact: true }).click();
  await expect(gallery.getByRole('link', { name: /Medal profile/ })).toHaveAttribute('href', 'https://medal.tv/u/GameFunns98');
  const card = gallery.locator('[data-game]').filter({ has: page.getByRole('heading', { name: 'Menší 10-50' }) });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: /^Play clip/ }).click();
  await expect(card.locator('[data-error]')).toBeVisible();
  await expect(card.getByRole('link', { name: /Open on Medal/ })).toHaveAttribute('href', /klxbis7ZHUJDfDyKB/);
  await expect(gallery.locator('video')).toHaveCount(0);
});

test('starting a second Medal clip stops and removes the first player', async ({ page }) => {
  // Stub native playback only. Card handlers still create, stop and remove real video elements.
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = async function () { this.dataset.playRequested = 'yes'; };
    const pause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.pause = function () {
      this.dataset.pauseRequested = 'yes';
      pause.call(this);
    };
  });
  await page.goto('/en/#moments');
  const gallery = page.locator('[data-moments]');
  const cards = gallery.locator('[data-game]').filter({ has: page.locator('[data-play]') });
  const first = cards.nth(0);
  const second = cards.nth(1);
  await first.getByRole('button', { name: /^Play clip/ }).click();
  await expect(first.locator('video')).toHaveAttribute('data-play-requested', 'yes');
  const oldVideo = await first.locator('video').elementHandle();
  await second.getByRole('button', { name: /^Play clip/ }).click();
  await expect(gallery.locator('video')).toHaveCount(1);
  await expect(second.locator('video')).toHaveAttribute('data-play-requested', 'yes');
  expect(await oldVideo!.evaluate(node => ({
    paused: node.dataset.pauseRequested, connected: node.isConnected, src: node.getAttribute('src'),
  }))).toEqual({ paused: 'yes', connected: false, src: null });
  await expect(first.getByRole('button', { name: /^Play clip/ })).toBeVisible();
  await second.getByRole('button', { name: 'Close player' }).click();
  await expect(gallery.locator('video')).toHaveCount(0);
});

for (const locale of ['cs', 'en'] as const) {
  test('Instagram shows six local previews and the snapshot date in ' + locale, async ({ page }) => {
    await page.goto('/' + locale + '/#instagram');
    const section = page.getByRole('region', { name: /^Instagram/ });
    const postLinks = section.getByRole('listitem').getByRole('link');
    const updated = locale === 'cs' ? 'Uložený přehled z' : 'Snapshot from';
    const postLabel = locale === 'cs' ? 'Otevřít příspěvek na Instagramu' : 'Open post on Instagram';
    const stamp = section.locator('.ig-stamp');
    await expect(stamp).toContainText(updated);
    await expect(stamp.locator('time')).toBeVisible();
    expect(Number.isFinite(Date.parse(instagram.fetchedAt ?? ''))).toBe(true);
    await expect(stamp.locator('time')).toHaveAttribute('datetime', instagram.fetchedAt!);
    await expect(stamp.locator('time')).toHaveText(/\d/);
    expect(instagram.posts).toHaveLength(6);
    await expect(postLinks).toHaveCount(instagram.posts.length);
    expect(new Set(instagram.posts.map(post => post.permalink)).size).toBe(6);
    for (const [index, post] of instagram.posts.entries()) {
      const link = postLinks.nth(index);
      expect(post.permalink).toMatch(/^https:\/\/(?:www\.)?instagram\.com\/(?:p|reels?|tv)\/[\w-]+\/?$/);
      await expect(link).toHaveAttribute('href', post.permalink);
      await expect(link).toHaveAccessibleName(new RegExp(postLabel));
      const image = link.locator('img');
      expect(post.poster).toMatch(/^\/images\/instagram\/\d+\.(?:jpg|png|webp)$/);
      await expect(image).toHaveAttribute('src', post.poster);
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate(el =>
        el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0
      )).toBe(true);
    }
  });
}

test('browser language, explicit routes and saved language choice', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ locale: 'cs-CZ', baseURL });
  await context.route(/^https:\/\//, route => route.abort());
  const page = await context.newPage();
  try {
    await page.goto('/');
    await expect(page).toHaveURL(/\/cs\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'cs');
    await page.getByRole('link', { name: 'Switch to English' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.goto('/');
    await expect(page).toHaveURL(/\/en\/$/);
    await page.goto('/cs/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'cs');
  } finally {
    await context.close();
  }
});

test('mobile navigation, anchor targets and reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 760 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/cs/');
  const menu = page.getByRole('button', { name: 'Navigační menu' });
  const navigation = page.getByRole('navigation', { name: 'Hlavní navigace' });
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(navigation).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  const targets = await navigation.getByRole('link').evaluateAll(links => links.map(link => {
    const anchor = link as HTMLAnchorElement;
    return { hash: anchor.hash, matches: document.querySelectorAll(anchor.hash).length };
  }));
  expect(targets).toHaveLength(5);
  for (const target of targets) expect(target.matches, target.hash).toBe(1);
  await navigation.getByRole('link', { name: 'Projekty' }).click();
  await expect(page).toHaveURL(/#projects$/);
  await expect(navigation).toBeHidden();
  await expect(page.locator('#projects')).toBeInViewport();
  const metrics = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
    scroll: getComputedStyle(document.documentElement).scrollBehavior,
    parallax: getComputedStyle(document.querySelector('.gf-landscape')!).transform,
  }));
  expect(metrics.contentWidth).toBeLessThanOrEqual(metrics.width);
  expect(metrics.scroll).toBe('auto');
  expect(metrics.parallax).toBe('none');
  await page.screenshot({ path: 'test-results/review/mobile-dark.png', fullPage: true, animations: 'disabled' });
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    if (!fits) console.log('OVERFLOW', await page.locator('body *').evaluateAll(elements => elements.map(element => ({tag:element.tagName,cls:element.className,rect:element.getBoundingClientRect().right})).filter(element => element.rect > document.documentElement.clientWidth + 1)));
    expect(fits, 'Content width at ' + width + 'px').toBe(true);
  }
});

test('keyboard theme control persists and both palettes meet WCAG A/AA checks', async ({ page }) => {
  await page.goto('/en/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  for (const theme of ['dark', 'light']) {
    if (theme === 'light') {
      await page.getByRole('button', { name: 'Use light theme' }).focus();
      await page.keyboard.press('Enter');
      await expect(html).toHaveAttribute('data-theme', 'light');
      await page.reload();
      await expect(html).toHaveAttribute('data-theme', 'light');
    }
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    await page.screenshot({ path: 'test-results/review/desktop-' + theme + '.png', fullPage: true, animations: 'disabled' });
    expect.soft(scan.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), theme).toEqual([]);
  }
});

test('Discord live activity disappears on outage while the dated Steam snapshot survives', async ({ page }) => {
  let available = true;
  await page.route(discordURL, route => route.fulfill({
    status: available ? 200 : 503,
    headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
    body: JSON.stringify(available ? {
      success: true, data: {
        discord_user: { id: '922153911161323601', username: 'fixture-user' },
        discord_status: 'online',
        activities: [{ type: 0, name: 'Fixture game' }, { type: 4, state: 'Fixture status' }],
      },
    } : { success: false }),
  }));
  await page.goto('/en/#gaming');
  const state = page.locator('[data-connection]');
  await expect(state).toHaveText('Online');
  await expect(page.locator('[data-discord-list]')).toContainText('Playing Fixture game');
  await expect(page.locator('[data-custom]')).toContainText('Fixture status');
  await expect(page.locator('[data-live-time]')).toBeVisible();
  available = false;
  await page.reload();
  await expect(page.locator('[data-presence-info]')).toHaveText('Public activity is currently unavailable.');
  await expect(state).toHaveText('Status unavailable');
  await expect(page.locator('[data-discord-list]')).toBeHidden();
  await expect(page.locator('[data-live-time]')).toBeHidden();
  await expect(page.locator('[data-games] [data-title]').first()).toBeVisible();
  await expect(page.locator('time[data-snapshot]')).toHaveAttribute('datetime', /\d{4}-\d{2}-\d{2}/);
});
