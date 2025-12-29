import { useState, useMemo, useCallback, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  Music,
  ListMusic,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { SidebarSection } from "./SidebarSection";
import { DraggableSongItem } from "./DraggableSongItem";
import { SortablePlaylistItem } from "./SortablePlaylistItem";
import { SongBulkActions } from "./SongBulkActions";
import { PlaylistBulkActions } from "./PlaylistBulkActions";
import { BulkActionBar } from "./BulkActionBar";
import type { SongMetadata } from "../types";
import type { Playlist } from "../types/playlist";

interface LeftSidebarProps {
  songs: SongMetadata[];
  playlists: Playlist[];
  currentSongId: string | null;
  onSelectSong: (songId: string) => void;
  onDuplicateSong: (songId: string) => void;
  onDeleteSong: (songId: string) => void;
  onCreatePlaylist: () => void;
  onDeletePlaylist: (playlistId: string) => void;
  onDuplicatePlaylist: (playlistId: string) => void;
  onAddSongToPlaylist: (playlistId: string, songId: string) => void;
  onReorderPlaylist: (
    playlistId: string,
    fromIndex: number,
    toIndex: number,
  ) => void;
  onRemoveSongFromPlaylist: (playlistId: string, songId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  // Bulk operations
  onBulkDuplicateSongs?: (songIds: string[]) => void;
  onBulkDeleteSongs?: (songIds: string[]) => void;
  onBulkAddSongsToPlaylists?: (
    songIds: string[],
    playlistIds: string[],
  ) => void;
  onBulkExportSongs?: (songIds: string[]) => void;
  onBulkDuplicatePlaylists?: (playlistIds: string[]) => void;
  onBulkDeletePlaylists?: (playlistIds: string[]) => void;
  onBulkExportPlaylists?: (playlistIds: string[]) => void;
  onExportPlaylist?: (playlistId: string) => void;
}

export function LeftSidebar({
  songs,
  playlists,
  currentSongId,
  onSelectSong,
  onDuplicateSong,
  onDeleteSong,
  onCreatePlaylist,
  onDeletePlaylist,
  onDuplicatePlaylist,
  onAddSongToPlaylist,
  onReorderPlaylist,
  onRemoveSongFromPlaylist,
  isCollapsed,
  onToggleCollapse,
  onBulkDuplicateSongs,
  onBulkDeleteSongs,
  onBulkAddSongsToPlaylists,
  onBulkExportSongs,
  onBulkDuplicatePlaylists,
  onBulkDeletePlaylists,
  onBulkExportPlaylists,
  onExportPlaylist,
}: LeftSidebarProps) {
  const [songSearch, setSongSearch] = useState("");
  const [playlistSearch, setPlaylistSearch] = useState("");
  const [activeDragSong, setActiveDragSong] = useState<SongMetadata | null>(
    null,
  );
  // Track if the drop was successful (to disable return animation)
  const dropSuccessRef = useRef(false);

  // Selection state
  const [isSongSelectionMode, setIsSongSelectionMode] = useState(false);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(
    new Set(),
  );
  const [isPlaylistSelectionMode, setIsPlaylistSelectionMode] = useState(false);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<string>>(
    new Set(),
  );

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
  );

  // Filter and sort songs alphabetically
  const filteredSongs = useMemo(() => {
    let result = [...songs];

    // Filter by search
    if (songSearch.trim()) {
      const query = songSearch.toLowerCase();
      result = result.filter(
        (song) =>
          song.title?.toLowerCase().includes(query) ||
          song.songwriters?.some((s) => s.toLowerCase().includes(query)) ||
          song.key?.toLowerCase().includes(query),
      );
    }

    // Sort alphabetically by title
    result.sort((a, b) => {
      const titleA = (a.title || "Untitled").toLowerCase();
      const titleB = (b.title || "Untitled").toLowerCase();
      return titleA.localeCompare(titleB);
    });

    return result;
  }, [songs, songSearch]);

  // Filter and sort playlists alphabetically
  const filteredPlaylists = useMemo(() => {
    let result = [...playlists];

    // Filter by search
    if (playlistSearch.trim()) {
      const query = playlistSearch.toLowerCase();
      result = result.filter((playlist) =>
        playlist.name.toLowerCase().includes(query),
      );
    }

    // Sort alphabetically by name
    result.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
    );

    return result;
  }, [playlists, playlistSearch]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const data = active.data.current;

      if (data?.type === "song") {
        setActiveDragSong(data.song);
      } else if (data?.type === "playlist-song") {
        const song = songs.find((s) => s.id === data.songId);
        if (song) setActiveDragSong(song);
      }
    },
    [songs],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Reset success flag
      dropSuccessRef.current = false;

      if (!over) {
        setActiveDragSong(null);
        return;
      }

      const activeData = active.data.current;
      const overData = over.data.current;

      // Case 1: Dropping a song from the Songs list onto a playlist
      if (activeData?.type === "song" && overData?.type === "playlist") {
        // Check if song is already in playlist
        const playlist = playlists.find((p) => p.id === overData.playlistId);
        if (playlist && !playlist.songIds.includes(activeData.songId)) {
          dropSuccessRef.current = true;
          onAddSongToPlaylist(overData.playlistId, activeData.songId);
        }
        setActiveDragSong(null);
        return;
      }

      // Case 2: Reordering songs within a playlist
      if (
        activeData?.type === "playlist-song" &&
        overData?.type === "playlist-song"
      ) {
        if (activeData.playlistId === overData.playlistId) {
          const fromIndex = activeData.index;
          const toIndex = overData.index;

          if (fromIndex !== toIndex) {
            dropSuccessRef.current = true;
            onReorderPlaylist(activeData.playlistId, fromIndex, toIndex);
          }
        }
        setActiveDragSong(null);
        return;
      }

      // Case 3: Dropping a song from Songs list onto an empty playlist area
      if (
        activeData?.type === "song" &&
        over.id.toString().startsWith("playlist-drop-")
      ) {
        const playlistId = over.id.toString().replace("playlist-drop-", "");
        // Check if song is already in playlist
        const playlist = playlists.find((p) => p.id === playlistId);
        if (playlist && !playlist.songIds.includes(activeData.songId)) {
          dropSuccessRef.current = true;
          onAddSongToPlaylist(playlistId, activeData.songId);
        }
        setActiveDragSong(null);
        return;
      }

      setActiveDragSong(null);
    },
    [onAddSongToPlaylist, onReorderPlaylist, playlists],
  );

  // Song selection handlers
  const handleToggleSongSelectionMode = useCallback(() => {
    setIsSongSelectionMode((prev) => !prev);
    setSelectedSongIds(new Set());
  }, []);

  const handleToggleSongSelect = useCallback((songId: string) => {
    setSelectedSongIds((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) {
        next.delete(songId);
      } else {
        next.add(songId);
      }
      return next;
    });
  }, []);

  const handleSelectAllSongs = useCallback(() => {
    setSelectedSongIds(new Set(filteredSongs.map((s) => s.id)));
  }, [filteredSongs]);

  const handleDeselectAllSongs = useCallback(() => {
    setSelectedSongIds(new Set());
  }, []);

  const handleCancelSongSelection = useCallback(() => {
    setIsSongSelectionMode(false);
    setSelectedSongIds(new Set());
  }, []);

  // Song bulk action handlers
  const handleSongBulkDuplicate = useCallback(() => {
    if (selectedSongIds.size > 0) {
      onBulkDuplicateSongs?.(Array.from(selectedSongIds));
      handleCancelSongSelection();
    }
  }, [selectedSongIds, onBulkDuplicateSongs, handleCancelSongSelection]);

  const handleSongBulkDelete = useCallback(() => {
    if (selectedSongIds.size > 0) {
      onBulkDeleteSongs?.(Array.from(selectedSongIds));
      handleCancelSongSelection();
    }
  }, [selectedSongIds, onBulkDeleteSongs, handleCancelSongSelection]);

  const handleSongBulkAddToPlaylists = useCallback(
    (playlistIds: string[]) => {
      if (selectedSongIds.size > 0 && playlistIds.length > 0) {
        onBulkAddSongsToPlaylists?.(Array.from(selectedSongIds), playlistIds);
        handleCancelSongSelection();
      }
    },
    [selectedSongIds, onBulkAddSongsToPlaylists, handleCancelSongSelection],
  );

  const handleSongBulkExport = useCallback(() => {
    if (selectedSongIds.size > 0) {
      onBulkExportSongs?.(Array.from(selectedSongIds));
      // Don't cancel selection here - let the export modal handle it
    }
  }, [selectedSongIds, onBulkExportSongs]);

  // Playlist selection handlers
  const handleTogglePlaylistSelectionMode = useCallback(() => {
    setIsPlaylistSelectionMode((prev) => !prev);
    setSelectedPlaylistIds(new Set());
  }, []);

  const handleTogglePlaylistSelect = useCallback((playlistId: string) => {
    setSelectedPlaylistIds((prev) => {
      const next = new Set(prev);
      if (next.has(playlistId)) {
        next.delete(playlistId);
      } else {
        next.add(playlistId);
      }
      return next;
    });
  }, []);

  const handleSelectAllPlaylists = useCallback(() => {
    setSelectedPlaylistIds(new Set(filteredPlaylists.map((p) => p.id)));
  }, [filteredPlaylists]);

  const handleDeselectAllPlaylists = useCallback(() => {
    setSelectedPlaylistIds(new Set());
  }, []);

  const handleCancelPlaylistSelection = useCallback(() => {
    setIsPlaylistSelectionMode(false);
    setSelectedPlaylistIds(new Set());
  }, []);

  // Playlist bulk action handlers
  const handlePlaylistBulkDuplicate = useCallback(() => {
    if (selectedPlaylistIds.size > 0) {
      onBulkDuplicatePlaylists?.(Array.from(selectedPlaylistIds));
      handleCancelPlaylistSelection();
    }
  }, [
    selectedPlaylistIds,
    onBulkDuplicatePlaylists,
    handleCancelPlaylistSelection,
  ]);

  const handlePlaylistBulkDelete = useCallback(() => {
    if (selectedPlaylistIds.size > 0) {
      onBulkDeletePlaylists?.(Array.from(selectedPlaylistIds));
      handleCancelPlaylistSelection();
    }
  }, [
    selectedPlaylistIds,
    onBulkDeletePlaylists,
    handleCancelPlaylistSelection,
  ]);

  const handlePlaylistBulkExport = useCallback(() => {
    if (selectedPlaylistIds.size > 0) {
      onBulkExportPlaylists?.(Array.from(selectedPlaylistIds));
      // Don't cancel selection here - let the export modal handle it
    }
  }, [selectedPlaylistIds, onBulkExportPlaylists]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className={`fixed left-0 top-12 h-[calc(100%-3rem)] bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col z-30 transition-all duration-200 ${
          isCollapsed ? "w-12" : "w-[22rem]"
        }`}
      >
        {/* Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-2 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {/* Collapsed State */}
        {isCollapsed ? (
          <div className="flex flex-col items-center pt-6 gap-4">
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
              title="Songs"
            >
              <Music className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
              title="Playlists"
            >
              <ListMusic className="w-5 h-5" />
            </button>
          </div>
        ) : (
          /* Expanded State */
          <div className="flex-1 flex flex-col overflow-hidden pt-4">
            {/* Songs Section */}
            <SidebarSection
              title="Songs"
              icon={<Music className="w-4 h-4" />}
              searchable
              searchValue={songSearch}
              onSearchChange={setSongSearch}
              selectable
              isSelectionMode={isSongSelectionMode}
              onToggleSelectionMode={handleToggleSongSelectionMode}
              selectionActionBar={
                <BulkActionBar
                  selectedCount={selectedSongIds.size}
                  totalCount={filteredSongs.length}
                  onSelectAll={handleSelectAllSongs}
                  onDeselectAll={handleDeselectAllSongs}
                  onCancel={handleCancelSongSelection}
                >
                  <SongBulkActions
                    selectedSongIds={Array.from(selectedSongIds)}
                    playlists={playlists}
                    onDuplicate={handleSongBulkDuplicate}
                    onDelete={handleSongBulkDelete}
                    onAddToPlaylists={handleSongBulkAddToPlaylists}
                    onExportPDF={handleSongBulkExport}
                    onCreatePlaylist={onCreatePlaylist}
                  />
                </BulkActionBar>
              }
            >
              {filteredSongs.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-400">
                  {songs.length === 0
                    ? "No songs yet"
                    : "No songs match your search"}
                </div>
              ) : (
                filteredSongs.map((song) => (
                  <DraggableSongItem
                    key={song.id}
                    song={song}
                    isActive={song.id === currentSongId}
                    onClick={() => onSelectSong(song.id)}
                    onDuplicate={onDuplicateSong}
                    onDelete={onDeleteSong}
                    isSelectionMode={isSongSelectionMode}
                    isSelected={selectedSongIds.has(song.id)}
                    onToggleSelect={handleToggleSongSelect}
                  />
                ))
              )}
            </SidebarSection>

            {/* Playlists Section */}
            <SidebarSection
              title="Playlists"
              icon={<ListMusic className="w-4 h-4" />}
              searchable
              searchValue={playlistSearch}
              onSearchChange={setPlaylistSearch}
              headerAction={
                !isPlaylistSelectionMode ? (
                  <button
                    onClick={onCreatePlaylist}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    title="Create playlist"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                ) : undefined
              }
              selectable
              isSelectionMode={isPlaylistSelectionMode}
              onToggleSelectionMode={handleTogglePlaylistSelectionMode}
              selectionActionBar={
                <BulkActionBar
                  selectedCount={selectedPlaylistIds.size}
                  totalCount={filteredPlaylists.length}
                  onSelectAll={handleSelectAllPlaylists}
                  onDeselectAll={handleDeselectAllPlaylists}
                  onCancel={handleCancelPlaylistSelection}
                >
                  <PlaylistBulkActions
                    selectedPlaylistIds={Array.from(selectedPlaylistIds)}
                    onDuplicate={handlePlaylistBulkDuplicate}
                    onDelete={handlePlaylistBulkDelete}
                    onExportPDF={handlePlaylistBulkExport}
                  />
                </BulkActionBar>
              }
            >
              {filteredPlaylists.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-400">
                  {playlists.length === 0
                    ? "No playlists yet"
                    : "No playlists match your search"}
                </div>
              ) : (
                filteredPlaylists.map((playlist) => (
                  <SortablePlaylistItem
                    key={playlist.id}
                    playlist={playlist}
                    songs={songs}
                    currentSongId={currentSongId}
                    onSelectSong={onSelectSong}
                    onDeletePlaylist={onDeletePlaylist}
                    onDuplicatePlaylist={onDuplicatePlaylist}
                    onRemoveSong={(songId) =>
                      onRemoveSongFromPlaylist(playlist.id, songId)
                    }
                    onExportPDF={onExportPlaylist}
                    isSelectionMode={isPlaylistSelectionMode}
                    isSelected={selectedPlaylistIds.has(playlist.id)}
                    onToggleSelect={handleTogglePlaylistSelect}
                  />
                ))
              )}
            </SidebarSection>
          </div>
        )}
      </div>

      {/* Drag Overlay - shows what's being dragged */}
      <DragOverlay dropAnimation={dropSuccessRef.current ? null : undefined}>
        {activeDragSong ? (
          <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-sm">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {activeDragSong.title || "Untitled Song"}
            </div>
            {activeDragSong.songwriters &&
              activeDragSong.songwriters.length > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {activeDragSong.songwriters.join(", ")}
                </div>
              )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
