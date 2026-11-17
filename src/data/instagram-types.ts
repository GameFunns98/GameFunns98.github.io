export interface InstagramPost {
  id: string;
  caption: string;
  permalink: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  timestamp: string;
  poster: string;
}

export interface InstagramSnapshot {
  username: string;
  profileUrl: string;
  fetchedAt: string | null;
  status: 'connected' | 'not-configured' | 'unavailable';
  posts: InstagramPost[];
}
