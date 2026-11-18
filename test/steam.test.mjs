import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fetchSteam, parseSteam } from '../src/data/steam-source.mjs';

const sha = '1'.repeat(40);
const date = '2026-11-16T12:00:00Z';

test('the published Steam snapshot includes its source revision and dated games', async () => {
  const value = JSON.parse(await readFile(new URL('../public/data/steam.json', import.meta.url), 'utf8'));
  assert.match(value.revision, /^[a-f0-9]{40}$/);
  assert.ok(Number.isFinite(Date.parse(value.updatedAt)));
  assert.ok(value.games.length > 0);
  for (const game of value.games) assert.ok(game.title.trim());
});

test('a changed Steam SVG layout cannot replace the last good snapshot', () => {
  assert.throws(() => parseSteam('<svg/>', sha, date));
});

test('unchanged source revision skips downloading the SVG', async () => {
  let requests = 0;
  const fetcher = async () => {
    requests++;
    return Response.json([{ sha, commit: { committer: { date } } }]);
  };
  assert.equal(await fetchSteam(sha, fetcher), null);
  assert.equal(requests, 1);
});

test('Steam rate limits produce a recoverable error', async () => {
  await assert.rejects(fetchSteam(null, async () => new Response('', {status: 429})));
});
