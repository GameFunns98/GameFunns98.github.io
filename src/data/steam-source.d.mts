export interface SteamGame {
  title: string;
  icon: string | null;
  hours: number | null;
  lastPlayed: string | null;
}

export interface SteamSnapshot {
  revision: string;
  updatedAt: string;
  games: SteamGame[];
}

export function parseSteam(svg: string, revision: string, updatedAt: string): SteamSnapshot;
export function fetchSteam(revision?: string, fetcher?: typeof fetch): Promise<SteamSnapshot | null>;
