import type { UUID } from "./song";

/** A playlist containing an ordered list of songs */
export interface Playlist {
  id: UUID;
  /** Playlist name */
  name: string;
  /** Ordered list of song IDs in the playlist */
  songIds: UUID[];
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last modification */
  updatedAt: string;
}

/** Playlist metadata for list display */
export interface PlaylistMetadata {
  id: UUID;
  name: string;
  songCount: number;
  createdAt: string;
  updatedAt: string;
}
