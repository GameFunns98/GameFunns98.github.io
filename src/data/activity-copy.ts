export const activityCopy = {
  cs: {
    heading: "Herní", emphasis: "aktivita", recent: "Naposledy hráno",
    steamProfile: "Steam profil", discordProfile: "Discord profil", favorites: "Moje oblíbené hry",
    snapshot: "Aktualizace přehledu", played: "Hráno", hours: "Celkem", unit: "h",
    unavailable: "Stav nedostupný", checking: "Zjišťuji stav…", live: "Živý stav",
    noActivity: "Žádná veřejná aktivita.", noSignal: "Veřejnou aktivitu teď nelze načíst.",
    js: "Živý stav vyžaduje JavaScript.", custom: "Vlastní stav", updated: "Ověřeno",
    status: { online: "Online", idle: "Nečinný", dnd: "Nerušit", offline: "Offline" },
    verbs: ["Hraje", "Streamuje", "Poslouchá", "Sleduje", "Stav", "Soutěží"],
  },
  en: {
    heading: "Gaming", emphasis: "activity", recent: "Recently played",
    steamProfile: "Steam profile", discordProfile: "Discord profile", favorites: "My favorite games",
    snapshot: "Snapshot updated", played: "Played", hours: "Total", unit: "h",
    unavailable: "Status unavailable", checking: "Checking status…", live: "Live status",
    noActivity: "No public activity.", noSignal: "Public activity is currently unavailable.",
    js: "Live status requires JavaScript.", custom: "Custom status", updated: "Checked",
    status: { online: "Online", idle: "Idle", dnd: "Do not disturb", offline: "Offline" },
    verbs: ["Playing", "Streaming", "Listening to", "Watching", "Status", "Competing in"],
  },
} as const;

export type ActivityLang = keyof typeof activityCopy;
export function formatSnapshotDate(date: string, lang: ActivityLang, includeTime = false) {
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Prague" };
  if (includeTime) Object.assign(options, { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
  return new Intl.DateTimeFormat(lang === "cs" ? "cs-CZ" : "en-GB", options).format(new Date(date));
}
