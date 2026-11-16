/** Source format used by the owner's existing lowlighter/metrics Steam job. */
const profile = "GameFunns98/GameFunns98";
const svgPath = "steam.svg";
const commitsUrl = `https://api.github.com/repos/${profile}/commits?path=${svgPath}&per_page=1`;
const shaPattern = /^[0-9a-f]{40}$/;
const iconPattern = /^data:image\/(?:jpe?g|png|webp);base64,[a-z0-9+/=]+$/i;
const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** @param {string} value */
function plainText(value) {
  const entities = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" };
  return value.replace(/&(amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, (whole, key) => {
    if (Object.hasOwn(entities, key)) return entities[key];
    if (key[0] !== "#") return whole;
    const point = key[1] === "x" ? parseInt(key.slice(2), 16) : Number(key.slice(1));
    return Number.isInteger(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : "";
  }).trim();
}

/** @param {string} chunk */
function lastPlayed(chunk) {
  const date = chunk.match(/Last played on\s+(\d{1,2})\s+([a-z]+)\s+(\d{4})/i);
  if (!date) return null;
  const month = months.indexOf(date[2].slice(0, 3).toLowerCase());
  const day = Number(date[1]);
  if (month < 0 || day < 1 || day > 31) return null;
  return `${date[3]}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Extract only the small subset we display. Never render provider markup. */
export function parseSteam(svg, revision, updatedAt) {
  if (!shaPattern.test(revision) || !Number.isFinite(Date.parse(updatedAt))) throw Error("Invalid source revision");
  const section = svg.split(/Recently played\s*<\/h2>/i)[1]?.split(/<\/section>/i)[0];
  if (!section) throw Error("Steam section missing");
  const chunks = section.split(/<div class="media largeable-width-half">/i).slice(1, 4);
  const games = chunks.map((chunk) => {
    const title = chunk.match(/<div class="about">\s*<div class="name">([^<]{1,256})<\/div>/i)?.[1];
    if (!title) throw Error("Steam game title missing");
    const image = chunk.match(/^\s*<img src="([^"]{1,30000})"/i)?.[1];
    const hours = chunk.match(/(?:^|[>\s])([\d,.]+) hours? played\b/i)?.[1];
    const hoursValue = hours ? Number(hours.replaceAll(",", "")) : null;
    return {
      title: plainText(title),
      icon: image && iconPattern.test(image) ? image.replace("image/jpg;", "image/jpeg;") : null,
      hours: hoursValue !== null && Number.isFinite(hoursValue) ? hoursValue : null,
      lastPlayed: lastPlayed(chunk),
    };
  });
  if (!games.length) throw Error("Steam source does not contain recent games");
  return { revision, updatedAt, games };
}

async function request(url, fetcher, limit) {
  const res = await fetcher(url, { signal: AbortSignal.timeout(10000), credentials: "omit", referrerPolicy: "no-referrer" });
  if (!res.ok) throw Error("Steam source unavailable");
  if (Number(res.headers.get("content-length")) > limit) throw Error("Steam source too large");
  const body = await res.text();
  if (body.length > limit) throw Error("Steam source too large");
  return body;
}

/** Return null when the last known published snapshot is already current. */
export async function fetchSteam(revision, fetcher = fetch) {
  const commits = JSON.parse(await request(commitsUrl, fetcher, 100000));
  const entry = Array.isArray(commits) ? commits[0] : null;
  const sha = entry?.sha;
  if (typeof sha !== "string" || !shaPattern.test(sha)) throw Error("Steam revision unavailable");
  if (revision === sha) return null;
  const date = entry.commit?.committer?.date;
  if (typeof date !== "string" || !Number.isFinite(Date.parse(date))) throw Error("Steam timestamp unavailable");
  const svg = await request(`https://raw.githubusercontent.com/${profile}/${sha}/${svgPath}`, fetcher, 1500000);
  return parseSteam(svg, sha, date);
}
