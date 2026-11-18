import snapshot from './medal.json';

export interface Clip {
  id: string;
  game: string;
  title: string;
  url: string;
  video?: string;
  poster?: string;
}

export const medalProfile = snapshot.profile;
export const clips: Clip[] = snapshot.clips;
