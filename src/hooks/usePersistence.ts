import { useCallback, useState, useEffect } from "react";
import type { Song, SongV2, AnySong, SongMetadata } from "../types";
import { isSongV2, needsMigration } from "../types/song";
import { migrateV1ToV2 } from "../lib/migration";
import { countBlocks, cloneBlocks } from "../lib/block-utils";
import type { Playlist } from "../types/playlist";

const SONGS_STORAGE_KEY = "victors-helper-songs";
const PLAYLISTS_STORAGE_KEY = "victors-helper-playlists";

interface StoredSongs {
  songs: AnySong[];
  lastAccessed?: string;
}

interface StoredPlaylists {
  playlists: Playlist[];
  lastAccessed?: string;
}

export function usePersistence() {
  const [songs, setSongs] = useState<AnySong[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load songs and playlists from localStorage on mount
  useEffect(() => {
    try {
      const storedSongs = localStorage.getItem(SONGS_STORAGE_KEY);
      if (storedSongs) {
        const data: StoredSongs = JSON.parse(storedSongs);
        setSongs(data.songs || []);
      }

      const storedPlaylists = localStorage.getItem(PLAYLISTS_STORAGE_KEY);
      if (storedPlaylists) {
        const data: StoredPlaylists = JSON.parse(storedPlaylists);
        setPlaylists(data.playlists || []);
      }
    } catch (error) {
      console.error("Failed to load from localStorage:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save songs to localStorage
  const persistSongs = useCallback((songsToSave: AnySong[]) => {
    try {
      const data: StoredSongs = {
        songs: songsToSave,
        lastAccessed: new Date().toISOString(),
      };
      localStorage.setItem(SONGS_STORAGE_KEY, JSON.stringify(data));
      setSongs(songsToSave);
    } catch (error) {
      console.error("Failed to save songs to localStorage:", error);
      throw error;
    }
  }, []);

  // Save playlists to localStorage
  const persistPlaylists = useCallback((playlistsToSave: Playlist[]) => {
    try {
      const data: StoredPlaylists = {
        playlists: playlistsToSave,
        lastAccessed: new Date().toISOString(),
      };
      localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(data));
      setPlaylists(playlistsToSave);
    } catch (error) {
      console.error("Failed to save playlists to localStorage:", error);
      throw error;
    }
  }, []);

  // Get song metadata for list display
  const getSongList = useCallback((): SongMetadata[] => {
    return songs
      .map((song) => {
        // Handle both V1 and V2 songs
        const lineCount = isSongV2(song)
          ? countBlocks(song.blocks)
          : song.lines.length;

        return {
          id: song.id,
          title: song.title,
          songwriters: song.songwriters,
          key: song.key,
          tempo: song.tempo,
          timeSignature: song.timeSignature,
          createdAt: song.createdAt,
          updatedAt: song.updatedAt,
          lineCount,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [songs]);

  // Load a specific song (auto-migrates V1 to V2)
  const loadSong = useCallback(
    (id: string, autoMigrate: boolean = true): AnySong | null => {
      const song = songs.find((s) => s.id === id);
      if (!song) return null;

      // Auto-migrate V1 songs to V2 if requested
      if (autoMigrate && needsMigration(song)) {
        const migratedSong = migrateV1ToV2(song);
        // Persist the migrated song
        const updatedSongs = songs.map((s) => (s.id === id ? migratedSong : s));
        persistSongs(updatedSongs);
        return migratedSong;
      }

      return song;
    },
    [songs, persistSongs],
  );

  // Save a song (add or update) - supports both V1 and V2
  const saveSong = useCallback(
    (song: AnySong): AnySong => {
      const updatedSong = {
        ...song,
        updatedAt: new Date().toISOString(),
      };

      const existingIndex = songs.findIndex((s) => s.id === song.id);
      let newSongs: AnySong[];

      if (existingIndex >= 0) {
        newSongs = [...songs];
        newSongs[existingIndex] = updatedSong;
      } else {
        newSongs = [...songs, updatedSong];
      }

      persistSongs(newSongs);
      return updatedSong;
    },
    [songs, persistSongs],
  );

  // Delete a song and remove from all playlists
  const deleteSong = useCallback(
    (id: string) => {
      const newSongs = songs.filter((s) => s.id !== id);
      persistSongs(newSongs);

      // Remove song from all playlists
      const updatedPlaylists = playlists.map((playlist) => ({
        ...playlist,
        songIds: playlist.songIds.filter((songId) => songId !== id),
        updatedAt: new Date().toISOString(),
      }));
      persistPlaylists(updatedPlaylists);
    },
    [songs, playlists, persistSongs, persistPlaylists],
  );

  // Duplicate a song - supports both V1 and V2
  const duplicateSong = useCallback(
    (id: string): AnySong | null => {
      const original = songs.find((s) => s.id === id);
      if (!original) return null;

      const now = new Date().toISOString();

      // Handle V2 songs
      if (isSongV2(original)) {
        const duplicated: SongV2 = {
          ...original,
          id: crypto.randomUUID(),
          title: `${original.title || "Untitled"} (Copy)`,
          createdAt: now,
          updatedAt: now,
          blocks: cloneBlocks(original.blocks),
        };
        persistSongs([...songs, duplicated]);
        return duplicated;
      }

      // Handle V1 songs
      const duplicated: Song = {
        ...original,
        id: crypto.randomUUID(),
        title: `${original.title || "Untitled"} (Copy)`,
        createdAt: now,
        updatedAt: now,
        // Deep copy lines to avoid reference issues
        lines: original.lines.map((line) => ({
          ...line,
          id: crypto.randomUUID(),
          chords: line.chords.map((chord) => ({
            ...chord,
            id: crypto.randomUUID(),
          })),
        })),
      };

      persistSongs([...songs, duplicated]);
      return duplicated;
    },
    [songs, persistSongs],
  );

  // Get playlists containing a specific song
  const getPlaylistsForSong = useCallback(
    (songId: string): Playlist[] => {
      return playlists.filter((p) => p.songIds.includes(songId));
    },
    [playlists],
  );

  // Create a new playlist
  const createPlaylist = useCallback(
    (name: string): Playlist => {
      const now = new Date().toISOString();
      const newPlaylist: Playlist = {
        id: crypto.randomUUID(),
        name,
        songIds: [],
        createdAt: now,
        updatedAt: now,
      };
      persistPlaylists([...playlists, newPlaylist]);
      return newPlaylist;
    },
    [playlists, persistPlaylists],
  );

  // Update a playlist
  const updatePlaylist = useCallback(
    (playlist: Playlist) => {
      const updatedPlaylist = {
        ...playlist,
        updatedAt: new Date().toISOString(),
      };
      const newPlaylists = playlists.map((p) =>
        p.id === playlist.id ? updatedPlaylist : p,
      );
      persistPlaylists(newPlaylists);
      return updatedPlaylist;
    },
    [playlists, persistPlaylists],
  );

  // Delete a playlist
  const deletePlaylist = useCallback(
    (id: string) => {
      const newPlaylists = playlists.filter((p) => p.id !== id);
      persistPlaylists(newPlaylists);
    },
    [playlists, persistPlaylists],
  );

  // Duplicate a playlist
  const duplicatePlaylist = useCallback(
    (id: string): Playlist | null => {
      const original = playlists.find((p) => p.id === id);
      if (!original) return null;

      const now = new Date().toISOString();
      const duplicated: Playlist = {
        ...original,
        id: crypto.randomUUID(),
        name: `${original.name} (Copy)`,
        createdAt: now,
        updatedAt: now,
        // Copy the songIds array
        songIds: [...original.songIds],
      };

      persistPlaylists([...playlists, duplicated]);
      return duplicated;
    },
    [playlists, persistPlaylists],
  );

  // Add song to playlist
  const addSongToPlaylist = useCallback(
    (playlistId: string, songId: string) => {
      const playlist = playlists.find((p) => p.id === playlistId);
      if (!playlist || playlist.songIds.includes(songId)) return;

      const updatedPlaylist = {
        ...playlist,
        songIds: [...playlist.songIds, songId],
        updatedAt: new Date().toISOString(),
      };
      const newPlaylists = playlists.map((p) =>
        p.id === playlistId ? updatedPlaylist : p,
      );
      persistPlaylists(newPlaylists);
    },
    [playlists, persistPlaylists],
  );

  // Remove song from playlist
  const removeSongFromPlaylist = useCallback(
    (playlistId: string, songId: string) => {
      const playlist = playlists.find((p) => p.id === playlistId);
      if (!playlist) return;

      const updatedPlaylist = {
        ...playlist,
        songIds: playlist.songIds.filter((id) => id !== songId),
        updatedAt: new Date().toISOString(),
      };
      const newPlaylists = playlists.map((p) =>
        p.id === playlistId ? updatedPlaylist : p,
      );
      persistPlaylists(newPlaylists);
    },
    [playlists, persistPlaylists],
  );

  // Reorder songs in playlist
  const reorderPlaylist = useCallback(
    (playlistId: string, fromIndex: number, toIndex: number) => {
      const playlist = playlists.find((p) => p.id === playlistId);
      if (!playlist) return;

      const songIds = [...playlist.songIds];
      const [removed] = songIds.splice(fromIndex, 1);
      songIds.splice(toIndex, 0, removed);

      const updatedPlaylist = {
        ...playlist,
        songIds,
        updatedAt: new Date().toISOString(),
      };
      const newPlaylists = playlists.map((p) =>
        p.id === playlistId ? updatedPlaylist : p,
      );
      persistPlaylists(newPlaylists);
    },
    [playlists, persistPlaylists],
  );

  // Bulk duplicate songs - supports both V1 and V2
  const bulkDuplicateSongs = useCallback(
    (ids: string[]): AnySong[] => {
      const duplicated: AnySong[] = [];
      const newSongs = [...songs];
      const now = new Date().toISOString();

      for (const id of ids) {
        const original = songs.find((s) => s.id === id);
        if (original) {
          // Handle V2 songs
          if (isSongV2(original)) {
            const dup: SongV2 = {
              ...original,
              id: crypto.randomUUID(),
              title: `${original.title || "Untitled"} (Copy)`,
              createdAt: now,
              updatedAt: now,
              blocks: cloneBlocks(original.blocks),
            };
            newSongs.push(dup);
            duplicated.push(dup);
          } else {
            // Handle V1 songs
            const dup: Song = {
              ...original,
              id: crypto.randomUUID(),
              title: `${original.title || "Untitled"} (Copy)`,
              createdAt: now,
              updatedAt: now,
              lines: original.lines.map((line) => ({
                ...line,
                id: crypto.randomUUID(),
                chords: line.chords.map((chord) => ({
                  ...chord,
                  id: crypto.randomUUID(),
                })),
              })),
            };
            newSongs.push(dup);
            duplicated.push(dup);
          }
        }
      }

      if (duplicated.length > 0) {
        persistSongs(newSongs);
      }
      return duplicated;
    },
    [songs, persistSongs],
  );

  // Bulk delete songs (also removes from playlists)
  const bulkDeleteSongs = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      const newSongs = songs.filter((s) => !idSet.has(s.id));
      persistSongs(newSongs);

      // Remove deleted songs from all playlists
      const updatedPlaylists = playlists.map((p) => ({
        ...p,
        songIds: p.songIds.filter((songId) => !idSet.has(songId)),
        updatedAt: new Date().toISOString(),
      }));
      persistPlaylists(updatedPlaylists);
    },
    [songs, playlists, persistSongs, persistPlaylists],
  );

  // Bulk add songs to multiple playlists
  const bulkAddSongsToPlaylists = useCallback(
    (songIds: string[], playlistIds: string[]) => {
      const updatedPlaylists = playlists.map((p) => {
        if (!playlistIds.includes(p.id)) return p;

        const newSongIds = [...p.songIds];
        for (const songId of songIds) {
          if (!newSongIds.includes(songId)) {
            newSongIds.push(songId);
          }
        }

        return {
          ...p,
          songIds: newSongIds,
          updatedAt: new Date().toISOString(),
        };
      });

      persistPlaylists(updatedPlaylists);
    },
    [playlists, persistPlaylists],
  );

  // Bulk duplicate playlists
  const bulkDuplicatePlaylists = useCallback(
    (ids: string[]): Playlist[] => {
      const duplicated: Playlist[] = [];
      const newPlaylists = [...playlists];
      const now = new Date().toISOString();

      for (const id of ids) {
        const original = playlists.find((p) => p.id === id);
        if (original) {
          const dup: Playlist = {
            ...original,
            id: crypto.randomUUID(),
            name: `${original.name} (Copy)`,
            createdAt: now,
            updatedAt: now,
            songIds: [...original.songIds],
          };
          newPlaylists.push(dup);
          duplicated.push(dup);
        }
      }

      if (duplicated.length > 0) {
        persistPlaylists(newPlaylists);
      }
      return duplicated;
    },
    [playlists, persistPlaylists],
  );

  // Bulk delete playlists
  const bulkDeletePlaylists = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      const newPlaylists = playlists.filter((p) => !idSet.has(p.id));
      persistPlaylists(newPlaylists);
    },
    [playlists, persistPlaylists],
  );

  // Get songs for given playlist IDs (for export)
  const getSongsForPlaylists = useCallback(
    (playlistIds: string[]): AnySong[] => {
      const seen = new Set<string>();
      const result: AnySong[] = [];

      for (const playlistId of playlistIds) {
        const playlist = playlists.find((p) => p.id === playlistId);
        if (playlist) {
          for (const songId of playlist.songIds) {
            if (!seen.has(songId)) {
              const song = songs.find((s) => s.id === songId);
              if (song) {
                result.push(song);
                seen.add(songId);
              }
            }
          }
        }
      }

      return result;
    },
    [songs, playlists],
  );

  // Export song to file
  const exportToFile = useCallback((song: Song) => {
    const data = JSON.stringify(song, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${song.title || "song"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  // Import song from file - supports both V1 and V2
  const importFromFile = useCallback(
    async (file: File): Promise<AnySong> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const song = JSON.parse(e.target?.result as string) as AnySong;

            // Validate basic structure for V2
            if (isSongV2(song)) {
              if (!song.id || !song.blocks || !Array.isArray(song.blocks)) {
                throw new Error("Invalid V2 song file format");
              }
            } else {
              // Validate V1 structure
              if (!song.id || !song.lines || !Array.isArray(song.lines)) {
                throw new Error("Invalid song file format");
              }
            }

            const saved = saveSong(song);
            resolve(saved);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsText(file);
      });
    },
    [saveSong],
  );

  return {
    // Song operations
    songs,
    isLoading,
    getSongList,
    loadSong,
    saveSong,
    deleteSong,
    duplicateSong,
    exportToFile,
    importFromFile,
    // Playlist operations
    playlists,
    getPlaylistsForSong,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    duplicatePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    reorderPlaylist,
    // Bulk operations
    bulkDuplicateSongs,
    bulkDeleteSongs,
    bulkAddSongsToPlaylists,
    bulkDuplicatePlaylists,
    bulkDeletePlaylists,
    getSongsForPlaylists,
  };
}
