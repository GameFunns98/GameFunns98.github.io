import { access, mkdir, writeFile } from 'node:fs/promises';
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
  const cssURL = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,144,700;1,144,700&family=Poppins:wght@400;500;600&display=swap';
  let css = (await request(cssURL, 100000, {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  })).bytes.toString('utf8');
  const latinFaces = [...css.matchAll(/\/\* (latin(?:-ext)?) \*\/\s*(@font-face\s*\{[\s\S]*?\})/g)];
  if (!latinFaces.length) throw new Error('Latin font faces missing');
  css = latinFaces.map(match => match[2]).join('\n\n');
  const urls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(match => match[1]))];
  if (!urls.length || urls.length > 40) throw new Error('Font CSS format changed');
  await mkdir('public/fonts', { recursive: true });
  for (let index = 0; index < urls.length; index++) {
    const source = urls[index];
    const extension = new URL(source).pathname.endsWith('.woff2') ? 'woff2' : 'ttf';
    const filename = `reference-${index}.${extension}`;
    const { bytes } = await request(source);
    await writeFile(path.join('public/fonts', filename), bytes);
    css = css.replaceAll(source, `/fonts/${filename}`);
  }
  await writeFile('public/fonts/fonts.css', css);
  for (const family of ['fraunces', 'poppins']) {
    const license = await request(`https://raw.githubusercontent.com/google/fonts/main/ofl/${family}/OFL.txt`, 30000);
    await writeFile(`public/fonts/LICENSE-${family}.txt`, license.bytes);
  }
  console.log('Self-hosted fonts prepared');
}

await fonts();
