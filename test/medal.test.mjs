import test from 'node:test';
import assert from 'node:assert/strict';
import { authoredClip, profileClips } from '../scripts/sync-medal.mjs';

const selected = 'https://medal.tv/games/gta-v/clips/fixture';
const metadata = {
  type: 'video', title: 'Test', author_name: 'GameFunns98',
  author_url: 'https://medal.tv/u/gamefunns98', url: 'https://medal.tv/games/gta-v/clip/fixture',
};

test('public profile discovery normalizes escaped links and repeated URL variants', () => {
  assert.deepEqual(profileClips(String.raw`\/games\/gta-v\/clip\/fixture /games/gta-v/clips/fixture`), [selected]);
});

test('clip metadata must identify both the requested clip and the profile owner', () => {
  assert.deepEqual(authoredClip(selected, metadata), { id: 'fixture', game: 'Grand Theft Auto V', title: 'Test', url: selected });
  for (const change of [{ author_name: 'SomeoneElse' }, { author_url: 'https://medal.tv/u/someone' }, { url: metadata.url + '-other' }, { type: 'photo' }]) {
    assert.equal(authoredClip(selected, { ...metadata, ...change }), null);
  }
});
