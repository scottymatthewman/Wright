import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { MusicalKey } from '../constants/musicalKeys';

if (
  !process.env.EXPO_PUBLIC_TURSO_DB_URL ||
  !process.env.EXPO_PUBLIC_TURSO_DB_AUTH_TOKEN
) {
  throw new Error('Turso DB URL and Auth Token must be set in .env.local');
}

export interface Song {
  id: string;
  title: string | null;
  content: string | null;
  date_modified: Date | null;
  folder_id: string | null;
  key: MusicalKey | null;
}

export const tursoOptions = {
  url: process.env.EXPO_PUBLIC_TURSO_DB_URL,
  authToken: process.env.EXPO_PUBLIC_TURSO_DB_AUTH_TOKEN,
};

interface SongsContextType {
  songs: Song[];
  createSong: () => Promise<Song | undefined>;
  updateSong: (id: string, updates: Partial<Song>) => void;
  deleteSong: (id: string) => void;
  // Temporarily disabled sync
  // syncSongs: () => void;
  // toggleSync: (enabled: boolean) => void;
  // isSyncing: boolean;
}

const SongsContext = createContext<SongsContextType | null>(null);

export function SongsProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [songs, setSongs] = useState<Song[]>([]);
  // Temporarily disabled sync
  // const [isSyncing, setIsSyncing] = useState(false);
  // const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchSongs();
  }, [db]);

  // Temporarily disabled sync cleanup
  // useEffect(() => {
  //   return () => {
  //     if (syncIntervalRef.current) {
  //       clearInterval(syncIntervalRef.current);
  //     }
  //   };
  // }, []);

  const fetchSongs = useCallback(async () => {
    const songs = await db.getAllAsync<Song>(
      'SELECT * FROM songs ORDER BY date_modified DESC'
    );
    setSongs(songs);
  }, [db]);

  // Temporarily disabled sync
  // const syncSongs = useCallback(async () => {
  //   console.log('Syncing songs with Turso DB...');
  //   try {
  //     await db.syncLibSQL();
  //     await fetchSongs();
  //     console.log('Synced songs with Turso DB');
  //   } catch (e) {
  //     console.log(e);
  //   }
  // }, [db, fetchSongs]);

  // const toggleSync = useCallback(
  //   async (enabled: boolean) => {
  //     setIsSyncing(enabled);
  //     if (enabled) {
  //       console.log('Starting sync interval...');
  //       await syncSongs();
  //       syncIntervalRef.current = setInterval(syncSongs, 2000);
  //     } else if (syncIntervalRef.current) {
  //       console.log('Stopping sync interval...');
  //       clearInterval(syncIntervalRef.current);
  //     }
  //   },
  //   [syncSongs]
  // );

  const createSong = async () => {
    const newSong = {
      title: '',
      content: '',
      date_modified: new Date(),
      folder_id: null,
      key: null,
    };

    try {
      const result = await db.runAsync(
        'INSERT INTO songs (title, content, date_modified, folder_id, key) VALUES (?, ?, ?, ?, ?)',
        newSong.title,
        newSong.content,
        newSong.date_modified.toISOString(),
        newSong.folder_id,
        newSong.key
      );
      fetchSongs();
      return { ...newSong, id: result.lastInsertRowId.toString() };
    } catch (e) {
      console.log(e);
    }
  };

  const updateSong = async (id: string, updates: Partial<Song>) => {
    const existingSong = await db.getFirstAsync<Song>(
      'SELECT * FROM songs WHERE id = ?',
      [id]
    );

    if (!existingSong) return;

    const updatedSong = {
      title: updates.title ?? existingSong.title,
      content: updates.content ?? existingSong.content,
      date_modified: updates.date_modified ?? new Date(),
      folder_id: updates.folder_id ?? existingSong.folder_id,
      key: updates.key ?? existingSong.key,
    };

    await db.runAsync(
      'UPDATE songs SET title = ?, content = ?, date_modified = ?, folder_id = ?, key = ? WHERE id = ?',
      updatedSong.title,
      updatedSong.content,
      updatedSong.date_modified.toISOString(),
      updatedSong.folder_id,
      updatedSong.key,
      id
    );
    fetchSongs();
  };

  const deleteSong = (id: string) => {
    db.runAsync('DELETE FROM songs WHERE id = ?', id);
    fetchSongs();
  };

  return (
    <SongsContext.Provider
      value={{
        songs,
        createSong,
        updateSong,
        deleteSong,
        // Temporarily disabled sync
        // syncSongs,
        // toggleSync,
        // isSyncing,
      }}
    >
      {children}
    </SongsContext.Provider>
  );
}

export function useSongs() {
  const context = useContext(SongsContext);
  if (!context) {
    throw new Error('useSongs must be used within a SongsProvider');
  }
  return context;
}