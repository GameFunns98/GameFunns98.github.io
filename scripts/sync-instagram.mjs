import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const username = 'vevoda_vaclav';
const profileUrl = 'https://www.instagram.com/vevoda_vaclav/';
const graph = 'https://graph.instagram.com/v27.0/';
const imageLimit = 5 * 1024 * 1024;
const jsonLimit = 1024 * 1024;
const mediaTypes = ['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'];
const mediaFields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}';

function check(condition) {
  if (!condition) throw new Error('Invalid Instagram response');
}

async function readResponse(response, limit) {
  check(response.ok && response.body && Number(response.headers.get('content-length') || 0) <= limit);
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error('Instagram response exceeds limit');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, size);
}

async function graphJson(endpoint, fields, fetcher, token, limit) {
  const url = new URL(endpoint, graph);
  url.searchParams.set('fields', fields);
  if (limit) url.searchParams.set('limit', String(limit));
  const response = await fetcher(url, {
    headers: { Authorization: 'Bearer ' + token },
    redirect: 'error', signal: AbortSignal.timeout(20000),
  });
  return JSON.parse((await readResponse(response, jsonLimit)).toString('utf8'));
}

function extension(bytes, type) {
  if (type === 'image/jpeg' && bytes.subarray(0, 3).equals(Buffer.from([255,216,255]))) return 'jpg';
  if (type === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png';
  if (type === 'image/webp' && bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP') return 'webp';
  throw new Error('Unsupported image format');
}

function thumbnail(item) {
  if (item.media_type === 'VIDEO') return item.thumbnail_url;
  if (item.media_url) return item.media_url;
  if (item.media_type === 'CAROUSEL_ALBUM') {
    const children = item.children?.data ?? [];
    for (const child of children) {
      const poster = child.media_type === 'VIDEO' ? child.thumbnail_url : child.media_url;
      if (poster) return poster;
    }
  }
  return null;
}

async function preparePost(item, fetcher, token) {
  const id = item?.id;
  check(typeof id === 'string' && /^\d{1,32}$/.test(id) && mediaTypes.includes(item.media_type));
  check(typeof item.timestamp === 'string' && Number.isFinite(Date.parse(item.timestamp)));
  const postUrl = new URL(item.permalink);
  check(postUrl.protocol === 'https:' && ['instagram.com','www.instagram.com'].includes(postUrl.hostname) &&
    !postUrl.username && !postUrl.password && !postUrl.port && /^\/(?:p|reels?|tv)\/[A-Za-z0-9_-]+\/?$/.test(postUrl.pathname));
  const posterUrl = new URL(thumbnail(item));
  check(posterUrl.protocol === 'https:' && !posterUrl.port && !posterUrl.username && !posterUrl.password &&
    /\.(?:cdninstagram\.com|fbcdn\.net)$/i.test(posterUrl.hostname));
  const response = await fetcher(posterUrl, { redirect:'error', signal:AbortSignal.timeout(20000) });
  const bytes = await readResponse(response, imageLimit);
  const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  const filename = id + '.' + extension(bytes, type);
  const post = {
    id, caption: typeof item.caption === 'string' ? item.caption.slice(0,2200) : '',
    permalink: postUrl.origin + postUrl.pathname, mediaType: item.media_type,
    timestamp: new Date(item.timestamp).toISOString(), poster:'/images/instagram/' + filename,
  };
  check(!token || !JSON.stringify(post).includes(token));
  return { post, filename, bytes };
}

async function atomicWrite(file, data) {
  await mkdir(path.dirname(file), { recursive:true });
  const temporary = file + '.' + randomUUID() + '.tmp';
  try {
    await writeFile(temporary, data, { flag:'wx' });
    await rename(temporary, file);
  } finally {
    await rm(temporary, { force:true });
  }
}

async function writeSnapshot(file, snapshot) {
  await atomicWrite(file, JSON.stringify(snapshot, null, 2) + '\n');
}

export async function syncInstagram({token = process.env.INSTAGRAM_ACCESS_TOKEN, source, fetcher = fetch, cwd = process.cwd()} = {}) {
  const file = path.join(cwd,'src','data','instagram.json');
  if (!source && !token) return { status:'skipped' };
  let previous;
  try {
    previous = JSON.parse(await readFile(file,'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Could not read Instagram snapshot');
    previous = { username, profileUrl, fetchedAt:null, status:'not-configured', posts:[] };
  }
  try {
    const profile = source ? source.profile : await graphJson('me','user_id,username,account_type',fetcher,token);
    check(profile?.username === username && ['BUSINESS','MEDIA_CREATOR'].includes(String(profile.account_type).toUpperCase()));
    let media = source?.media;
    if (!source) {
      const id = profile.user_id ?? profile.id;
      check(typeof id === 'string' && /^\d{1,32}$/.test(id));
      media = (await graphJson(id + '/media',mediaFields,fetcher,token,6)).data;
    }
    check(Array.isArray(media));
    const assets = [];
    for (const item of media.slice(0,6)) assets.push(await preparePost(item,fetcher,token));
    check(new Set(assets.map(a => a.post.id)).size === assets.length);
    for (const asset of assets) {
      await atomicWrite(path.join(cwd,'public','images','instagram',asset.filename),asset.bytes);
    }
    const snapshot = { username, profileUrl, fetchedAt:new Date().toISOString(), status:'connected', posts:assets.map(a => a.post) };
    await writeSnapshot(file,snapshot);
    return {status:'connected', count:assets.length};
  } catch {
    await writeSnapshot(file,{ ...previous, status:'unavailable' });
    return {status:'unavailable'};
  }
}

async function main() {
  const args = process.argv.slice(2);
  let source;
  if (args.length) {
    if (args.length !== 2 || args[0] !== '--input') throw new Error('Invalid CLI arguments');
    const payload = await readFile(args[1]);
    check(payload.length <= jsonLimit);
    source = JSON.parse(payload.toString('utf8'));
    check(source && typeof source === 'object');
  }
  const result = await syncInstagram({source});
  console.log('Instagram sync:', result.status);
  if (result.status === 'unavailable') process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(() => { console.error('Instagram sync could not complete.'); process.exitCode = 1; });
}
