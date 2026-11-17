import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Package the real production build for review when a local server is unavailable.
const root = path.resolve('dist');
const output = path.resolve('.preview/GameFunns-preview.html');
const mime = { '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const cache = new Map();

async function dataURL(url) {
  if (!cache.has(url)) {
    const file = path.join(root, url);
    const bytes = await readFile(file);
    cache.set(url, `data:${mime[path.extname(file)]};base64,${bytes.toString('base64')}`);
  }
  return cache.get(url);
}

async function inlineCSS(css) {
  const urls = [...new Set([...css.matchAll(/url\(['"]?(\/[^)'"\s]+)['"]?\)/g)].map(match => match[1]))];
  for (const url of urls) css = css.replaceAll(url, await dataURL(url));
  return css;
}

async function inlineImages(html) {
  const urls = [...new Set([...html.matchAll(/(?:src|href)="(\/(?:images|favicon)[^"]+)"/g)].map(match => match[1]))];
  for (const url of urls) html = html.replaceAll(url, await dataURL(url));
  return html.replaceAll('href="/en/"', 'href="?lang=en"').replaceAll('href="/cs/"', 'href="?lang=cs"');
}

const pages = await Promise.all(['cs', 'en'].map(async lang => {
  const html = await readFile(path.join(root, lang, 'index.html'), 'utf8');
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1];
  if (!body) throw new Error('Production page body missing');
  return { lang, html, body: await inlineImages(body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')) };
}));

let head = pages[0].html.match(/<head>([\s\S]*?)<\/head>/i)?.[1];
if (!head) throw new Error('Production page head missing');
for (const match of [...head.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)]) {
  const css = await readFile(path.join(root, match[1]), 'utf8');
  head = head.replace(match[0], `<style>${await inlineCSS(css)}</style>`);
}
head = await inlineImages(head);
head = head.replace("font-src 'self'", "font-src 'self' data:");

const scripts = [];
const body = pages[0].html.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
for (const match of body.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
  const src = match[1].match(/src="([^"]+)"/)?.[1];
  const code = src ? await readFile(path.join(root, src), 'utf8') : match[2];
  scripts.push(`<script type="module">${code.replace(/<\/script/gi, '<\\/script')}</script>`);
}

const selectLanguage = `
  const requested = new URLSearchParams(location.search).get('lang');
  let saved;
  try { saved = localStorage.getItem('lang'); } catch {}
  const preferred = (navigator.languages || [navigator.language]).find(value => /^(cs|en)(-|$)/i.test(value));
  const candidate = requested || saved || (/^cs/i.test(preferred || '') ? 'cs' : 'en');
  const lang = candidate === 'cs' ? 'cs' : 'en';
  document.documentElement.lang = lang;
  document.title = lang === 'cs' ? 'Václav · GameFunns — Náhled' : 'Václav · GameFunns — Preview';
  const content = document.querySelector('#content-' + lang);
  document.body.append(content.content.cloneNode(true));
  document.querySelectorAll('template').forEach(template => template.remove());
`;
const templates = pages.map(page => `<template id="content-${page.lang}">${page.body}</template>`).join('');
const result = `<!doctype html><html lang="cs" data-theme="dark"><head>${head}</head><body>${templates}<script>${selectLanguage}</script>${scripts.join('')}</body></html>`;
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, result);
console.log('Created .preview/GameFunns-preview.html');
