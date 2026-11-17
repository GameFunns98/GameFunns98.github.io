import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const profile = 'https://medal.tv/u/GameFunns98';
const pinned = ['https://medal.tv/games/gta-v/clips/klxbis7ZHUJDfDyKB'];
const snapshot = new URL('../src/data/medal.json', import.meta.url);
const pictures = new URL('../public/images/', import.meta.url);
const gameLabels = { 'gta-v': 'Grand Theft Auto V' };
const clipPath = /^\/games\/([a-z0-9-]+)\/clips?\/([\w-]+)$/;

export function profileClips(html) {
  const paths = html.replaceAll('\\/', '/').match(/\/games\/[a-z0-9-]+\/clips?\/[\w-]+/g) ?? [];
  return [...new Set(paths.map(path => 'https://medal.tv' + path.replace('/clip/', '/clips/')))];
}

export function authoredClip(url, info) {
  const source = new URL(url);
  const path = clipPath.exec(source.pathname);
  if (!path || source.origin !== 'https://medal.tv') return null;
  if (info.author_name?.toLowerCase() !== 'gamefunns98' || info.author_url?.toLowerCase() !== profile.toLowerCase()) return null;
  if (info.type !== 'video' || typeof info.title !== 'string' || !info.title.trim()) return null;
  const providerClip = new URL(info.url);
  if (providerClip.origin !== source.origin || providerClip.pathname !== '/games/' + path[1] + '/clip/' + path[2]) return null;
  return { id: path[2], game: gameLabels[path[1]] ?? path[1].replaceAll('-', ' '), title: info.title.trim(), url };
}

async function request(url, options = {}) {
  return fetch(url, { signal: AbortSignal.timeout(12000), ...options });
}

async function storeFile(url, bytes) {
  const file = new URL(basename(fileURLToPath(url)) + '.' + randomUUID() + '.tmp', url);
  try {
    await writeFile(file, bytes);
    await rename(file, url);
  } finally {
    await rm(file, { force: true });
  }
}

async function cachePoster(id, rawUrl) {
  if (!rawUrl) return undefined;
  const url = new URL(rawUrl);
  if (url.origin !== 'https://cdn.medal.tv') return undefined;
  const response = await request(url, { redirect: 'error' });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/jpeg')) return undefined;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 4 || bytes.length > 3_000_000 || bytes.readUInt16BE(0) !== 0xffd8) return undefined;
  const name = 'medal-' + id + '.jpg';
  const file = new URL(name, pictures);
  const previous = await readFile(file).catch(() => null);
  if (!previous || !previous.equals(bytes)) await storeFile(file, bytes);
  return '/images/' + name;
}

async function loadClip(url, old) {
  const response = await request('https://medal.tv/api/oembed?url=' + encodeURIComponent(url));
  if ([401, 403, 404, 410].includes(response.status)) return null;
  if (!response.ok) throw new Error('oEmbed returned HTTP ' + response.status);
  const info = await response.json();
  const clip = authoredClip(url, info);
  if (!clip) return null;
  clip.poster = await cachePoster(clip.id, info.thumbnail_url).catch(() => undefined) ?? old?.poster;
  const video = 'https://medal.tv/api/content/' + clip.id + '/socialVideoUrl';
  const media = await request(video, { headers: { Range: 'bytes=0-31' } });
  try {
    if (media.ok && media.headers.get('content-type')?.startsWith('video/mp4')) clip.video = video;
    else if (media.status === 429 || media.status >= 500) clip.video = old?.video;
  } finally {
    await media.body?.cancel();
  }
  return clip;
}

export async function syncMedal() {
  const saved = JSON.parse(await readFile(snapshot, 'utf8'));
  const response = await request(profile);
  if (!response.ok) throw new Error('Profile returned HTTP ' + response.status);
  const html = await response.text();
  if (!html.includes('GameFunns98') || !html.includes('og:title')) throw new Error('Profile metadata unavailable');
  const discovered = profileClips(html);
  // A profile can change its markup. Keep checking the already-selected clip URLs
  // for removals or author changes even when no links can be discovered.
  const urls = [...new Set([...pinned, ...discovered, ...saved.clips.map(clip => clip.url)])].slice(0, 12);
  const clips = [];
  await mkdir(pictures, { recursive: true });
  for (const url of urls) {
    const old = saved.clips.find(clip => clip.url === url);
    try {
      const clip = await loadClip(url, old);
      if (clip) clips.push(clip);
    } catch (error) {
      console.warn('Medal clip refresh deferred:', url, error.message);
      if (old) clips.push(old);
    }
  }
  const bytes = JSON.stringify({ profile, clips }, null, 2) + '\n';
  if (bytes !== await readFile(snapshot, 'utf8')) await storeFile(snapshot, bytes);
  console.log('Verified Medal snapshot contains ' + clips.length + ' clips.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  syncMedal().catch(error => {
    console.warn('Medal refresh deferred; existing snapshot retained:', error.message);
    process.exitCode = 1;
  });
}
