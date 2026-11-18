import { activityCopy, formatSnapshotDate, type ActivityLang } from "./activity-copy";
import { fetchSteam, type SteamSnapshot } from "./steam-source.mjs";

const discordId = "922153911161323601";
const steamCacheKey = "portfolio.steam.v1";
const steamInterval = 6 * 60 * 60 * 1000;

type RecordValue = Record<string, unknown>;
function record(value: unknown): value is RecordValue {
  return value !== null && typeof value === "object";
}
function boundedText(value: unknown, length = 160) {
  return typeof value === "string" ? value.trim().slice(0, length) : "";
}
function makeTime(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
function validSnapshot(value: unknown): value is SteamSnapshot {
  if (!record(value) || typeof value.revision !== "string" || !/^[0-9a-f]{40}$/.test(value.revision) || !makeTime(value.updatedAt)) return false;
  if (!Array.isArray(value.games) || value.games.length < 1 || value.games.length > 3) return false;
  return value.games.every((game) => record(game) && !!boundedText(game.title) &&
    (game.hours === null || (typeof game.hours === "number" && Number.isFinite(game.hours) && game.hours >= 0)) &&
    (game.lastPlayed === null || makeTime(game.lastPlayed)) &&
    (game.icon === null || (typeof game.icon === "string" && game.icon.length <= 30000 && /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(game.icon))));
}
function readCache(): { checkedAt: number; snapshot: SteamSnapshot | null } {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(steamCacheKey) || "null");
    if (record(raw) && typeof raw.checkedAt === "number" && raw.checkedAt <= Date.now()) {
      return { checkedAt: raw.checkedAt, snapshot: validSnapshot(raw.snapshot) ? raw.snapshot : null };
    }
  } catch { /* Storage may be disabled. */ }
  return { checkedAt: 0, snapshot: null };
}

async function refreshSteam(root: HTMLElement, lang: ActivityLang) {
  const list = root.querySelector<HTMLElement>("[data-games]")!;
  const template = list.firstElementChild?.cloneNode(true);
  const time = root.querySelector<HTMLTimeElement>("[data-snapshot]")!;
  const t = activityCopy[lang];
  let revision = root.dataset.revision;
  function render(snapshot: SteamSnapshot) {
    if (!template || Date.parse(snapshot.updatedAt) < Date.parse(time.dateTime)) return;
    const rows = snapshot.games.map((game) => {
      const row = template.cloneNode(true) as HTMLElement;
      const icon = row.querySelector("img")!;
      icon.hidden = !game.icon;
      if (game.icon) icon.src = game.icon;
      else icon.removeAttribute("src");
      row.querySelector<HTMLElement>("[data-title]")!.textContent = game.title;
      const hours = row.querySelector<HTMLElement>("[data-hours]")!;
      hours.hidden = game.hours === null;
      if (game.hours !== null) hours.textContent = `${t.hours} ${game.hours.toLocaleString(lang)} ${t.unit}`;
      const played = row.querySelector<HTMLElement>("[data-played]")!;
      played.hidden = !game.lastPlayed;
      if (game.lastPlayed) played.textContent = `${t.played} ${formatSnapshotDate(game.lastPlayed, lang)}`;
      return row;
    });
    list.replaceChildren(...rows);
    time.dateTime = snapshot.updatedAt;
    time.textContent = formatSnapshotDate(snapshot.updatedAt, lang, true);
    revision = snapshot.revision;
  }
  const cache = readCache();
  if (cache.snapshot) render(cache.snapshot);
  if (Date.now() - cache.checkedAt < steamInterval) return;
  try {
    const latest = await fetchSteam(revision);
    if (latest) render(latest);
    try {
      localStorage.setItem(steamCacheKey, JSON.stringify({ checkedAt: Date.now(), snapshot: latest ?? cache.snapshot }));
    } catch { /* The page already contains valid dated data. */ }
  } catch {
    // Keep dated data and space out retries when GitHub throttles anonymous requests.
    try {
      localStorage.setItem(steamCacheKey, JSON.stringify({ ...cache, checkedAt: Date.now() - steamInterval + 15 * 60 * 1000 }));
    } catch { /* Storage may be disabled. */ }
  }
}

function setupDiscord(root: HTMLElement, lang: ActivityLang) {
  const t = activityCopy[lang];
  const avatar = root.querySelector<HTMLImageElement>("[data-avatar]")!;
  const name = root.querySelector<HTMLElement>("[data-name]")!;
  const connection = root.querySelector<HTMLElement>("[data-connection]")!;
  const info = root.querySelector<HTMLElement>("[data-presence-info]")!;
  const custom = root.querySelector<HTMLElement>("[data-custom]")!;
  const list = root.querySelector<HTMLElement>("[data-discord-list]")!;
  const stamp = root.querySelector<HTMLElement>("[data-live-time]")!;
  let timer: number | undefined;
  let generation = 0;
  let backoff = 0;
  let controller: AbortController | undefined;
  function clear() {
    name.textContent = "GameFunns";
    avatar.hidden = true;
    avatar.removeAttribute("src");
    custom.hidden = list.hidden = stamp.hidden = true;
    list.replaceChildren();
    info.hidden = false;
    info.textContent = t.noSignal;
    connection.textContent = t.unavailable;
    delete connection.dataset.state;
  }
  avatar.addEventListener("error", () => { avatar.hidden = true; });
  async function poll() {
    const current = ++generation;
    controller = new AbortController();
    const requestController = controller;
    const timeout = window.setTimeout(() => requestController.abort(), 10000);
    try {
      const response = await fetch(`https://api.lanyard.rest/v1/users/${discordId}`, { signal: requestController.signal, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
      if (!response.ok) throw Error();
      const result: unknown = await response.json();
      if (current !== generation) return;
      if (!record(result) || result.success !== true || !record(result.data)) throw Error();
      const data = result.data;
      const user = data.discord_user;
      const status = data.discord_status;
      if (!record(user) || user.id !== discordId || typeof status !== "string" || !Object.hasOwn(t.status, status)) throw Error();
      name.textContent = boundedText(user.global_name) || boundedText(user.username) || "GameFunns";
      connection.dataset.state = status;
      connection.textContent = t.status[status as keyof typeof t.status];
      const hash = boundedText(user.avatar, 80);
      if (/^(?:a_)?[\da-f]{32}$/i.test(hash)) {
        const src = `https://cdn.discordapp.com/avatars/${discordId}/${hash}.webp?size=96`;
        if (avatar.getAttribute("src") !== src) avatar.src = src;
        avatar.hidden = false;
      } else {
        avatar.hidden = true;
        avatar.removeAttribute("src");
      }
      const entries = Array.isArray(data.activities) && status !== "offline" ? data.activities.filter(record) : [];
      const customStatus = entries.find((entry) => entry.type === 4);
      const statusText = boundedText(customStatus?.state);
      custom.hidden = !statusText;
      custom.textContent = statusText ? `${t.custom} · ${statusText}` : "";
      const items = entries.filter((entry) => entry.type !== 4 && boundedText(entry.name)).slice(0, 5).map((entry) => {
        const item = document.createElement("li");
        const type = typeof entry.type === "number" ? entry.type : -1;
        const verb = t.verbs[type];
        item.textContent = [verb, boundedText(entry.name)].filter(Boolean).join(" ");
        return item;
      });
      list.replaceChildren(...items);
      list.hidden = items.length === 0;
      info.hidden = items.length > 0 || !!statusText;
      info.textContent = t.noActivity;
      stamp.hidden = false;
      stamp.textContent = `${t.live} · ${t.updated} ${new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit" }).format(new Date())}`;
      backoff = 0;
    } catch {
      if (current === generation) {
        clear();
        backoff = Math.min(backoff + 1, 4);
      }
    } finally {
      window.clearTimeout(timeout);
      if (current === generation && !document.hidden) timer = window.setTimeout(poll, 45000 * 2 ** backoff);
    }
  }
  function stop() {
    generation++;
    window.clearTimeout(timer);
    controller?.abort();
    clear();
  }
  function start() {
    stop();
    if (!document.hidden) {
      connection.textContent = t.checking;
      void poll();
    }
  }
  document.addEventListener("visibilitychange", start);
  window.addEventListener("pagehide", stop);
  window.addEventListener("pageshow", (event) => { if (event.persisted) start(); });
  start();
}
export function mountActivity(root: HTMLElement) {
  const lang: ActivityLang = root.dataset.lang === "cs" ? "cs" : "en";
  function load() {
    void refreshSteam(root, lang);
    setupDiscord(root, lang);
  }
  if (!("IntersectionObserver" in window)) { load(); return; }
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) { observer.disconnect(); load(); }
  }, { rootMargin: "240px" });
  observer.observe(root);
}
