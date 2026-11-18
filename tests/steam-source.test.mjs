import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchSteam, parseSteam } from "../src/data/steam-source.mjs";

const sha = "a".repeat(40);
const date = "2026-11-16T13:50:44Z";
const fixture = `<section><h2>Recently played</h2><div class="medias largeable-flex-wrap">
<div class="media largeable-width-half"><img src="https://untrusted.invalid" alt="" />
<div class="about"><div class="name">One &amp; Two</div><div>12 hours played</div>
<div>Last played on 2 Sept 2026</div></div></div></div></section>`;

test("preserves only expected data, including source date and real hours", () => {
  const snapshot = parseSteam(fixture, sha, date);
  assert.deepEqual(snapshot, { revision: sha, updatedAt: date, games: [
    { title: "One & Two", icon: null, hours: 12, lastPlayed: "2026-09-02" },
  ] });
});

test("rejects incomplete metrics, including upstream error SVGs", () => {
  assert.throws(() => parseSteam("<svg><text>Service unavailable</text></svg>", sha, date));
  assert.throws(() => parseSteam("<h2>Recently played</h2>", sha, date));
});

test("unchanged revision needs one request and no large SVG download", async () => {
  let calls = 0;
  const result = await fetchSteam(sha, async () => {
    calls++;
    return Response.json([{ sha, commit: { committer: { date } } }]);
  });
  assert.equal(calls, 1);
  assert.equal(result, null);
});

test("loads a changed SVG by immutable revision", async () => {
  const urls = [];
  const result = await fetchSteam(undefined, async (url) => {
    urls.push(url);
    return urls.length === 1 ? Response.json([{ sha, commit: { committer: { date } } }]) : new Response(fixture);
  });
  assert.match(urls[1], new RegExp("/" + sha + "/steam\\.svg$"));
  assert.equal(result.updatedAt, date);
});
