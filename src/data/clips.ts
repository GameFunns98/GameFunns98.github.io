export interface Clip {
  id: string;
  game: string;
  title: string;
  url: string;
  video?: string;
  poster?: string;
}

// Use an owner-selected clip and media URLs from its verified Open Graph data.
export const clips: Clip[] = [
  {
    id: 'klxbis7ZHUJDfDyKB',
    game: 'Grand Theft Auto V',
    title: 'Menší 10-50',
    url: 'https://medal.tv/games/gta-v/clips/klxbis7ZHUJDfDyKB',
    poster: '/images/medal-klxbis7ZHUJDfDyKB.jpg',
    video: 'https://medal.tv/api/content/klxbis7ZHUJDfDyKB/socialVideoUrl',
  },
];
