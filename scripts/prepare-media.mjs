import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

async function request(url, limit = 2_000_000, headers = {}) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Media source returned ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > limit) throw new Error('Media source exceeds size limit');
  return { bytes, type: response.headers.get('content-type') || '' };
}

async function fonts() {
  if (await exists('public/fonts/fonts.css')) return;
  const cssURL = 'https://fonts.googleapis.com/css2?family=Baskervville:ital@0;1&family=DM+Sans:wght@400;500;600;700&display=swap';
  let css = (await request(cssURL, 100000, {
    'User-Agent': 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36',
  })).bytes.toString('utf8');
  const urls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(match => match[1]))];
  if (!urls.length || urls.length > 40) throw new Error('Font CSS format changed');
  await mkdir('public/fonts', { recursive: true });
  for (let index = 0; index < urls.length; index++) {
    const source = urls[index];
    const extension = new URL(source).pathname.endsWith('.woff2') ? 'woff2' : 'ttf';
    const filename = `font-${index}.${extension}`;
    const { bytes } = await request(source);
    await writeFile(path.join('public/fonts', filename), bytes);
    css = css.replaceAll(source, `/fonts/${filename}`);
  }
  await writeFile('public/fonts/fonts.css', css);
  for (const family of ['baskervville', 'dmsans']) {
    const license = await request(`https://raw.githubusercontent.com/google/fonts/main/ofl/${family}/OFL.txt`, 30000);
    await writeFile(`public/fonts/LICENSE-${family}.txt`, license.bytes);
  }
  console.log('Self-hosted fonts prepared');
}

async function medal() {
  if (await exists('public/data/medal.json')) return;
  const id = 'klxbis7ZHUJDfDyKB';
  const source = `https://medal.tv/games/gta-v/clips/${id}`;
  const html = (await request(source, 4_000_000)).bytes.toString('utf8');
  const poster = html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1]?.replaceAll('&amp;', '&');
  const title = html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1]?.replace(/ - Clipped.*$/, '');
  if (!poster || new URL(poster).hostname !== 'cdn.medal.tv' || !title) throw new Error('Medal poster metadata unavailable');
  const image = await request(poster);
  if (!image.type.startsWith('image/jpeg')) throw new Error('Medal poster is not a JPEG');
  const video = `https://medal.tv/api/content/${id}/socialVideoUrl`;
  const check = await fetch(video, { method: 'HEAD', signal: AbortSignal.timeout(20000) });
  const contentType = check.headers.get('content-type') || '';
  const validVideo = check.ok && contentType.startsWith('video/');
  console.log('Medal public video check', check.status, contentType);
  await mkdir('public/images', { recursive: true });
  await mkdir('public/data', { recursive: true });
  await writeFile(`public/images/medal-${id}.jpg`, image.bytes);
  await writeFile('public/data/medal.json', JSON.stringify({
    source, title, poster: `/images/medal-${id}.jpg`, video: validVideo ? video : null,
    verifiedAt: new Date().toISOString(),
  }, null, 2) + '\n');
}

await fonts();
await medal();
