// 폴더 관리 훅
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export interface Folder {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
}

const FOLDERS_KEY = '@kitch_folders';

const DEFAULT_EMOJIS = ['📁', '📌', '⭐', '💡', '🔥', '📈', '🏦', '💎', '🌏', '📊'];

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([]);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      const raw = await AsyncStorage.getItem(FOLDERS_KEY);
      if (raw) setFolders(JSON.parse(raw));
    } catch {}
  };

  const addFolder = useCallback(
    async (name: string, emoji?: string): Promise<Folder> => {
      const newFolder: Folder = {
        id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        name: name.trim(),
        emoji: emoji ?? DEFAULT_EMOJIS[folders.length % DEFAULT_EMOJIS.length],
        createdAt: new Date().toISOString(),
      };
      const updated = [...folders, newFolder];
      setFolders(updated);
      try {
        await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(updated));
      } catch {}
      return newFolder;
    },
    [folders]
  );

  const deleteFolder = useCallback(
    async (id: string) => {
      const updated = folders.filter((f) => f.id !== id);
      setFolders(updated);
      try {
        await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(updated));
      } catch {}
    },
    [folders]
  );

  return { folders, addFolder, deleteFolder, refresh: loadFolders };
}
