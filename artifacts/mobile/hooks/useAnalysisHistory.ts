// Custom hook for managing analysis history with AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { AnalysisResult } from '@/services/aiAnalysis';

const HISTORY_KEY = '@investlens_history';
const MAX_HISTORY = 20;

export interface HistoryItem {
  id: string;
  result: AnalysisResult;
  inputUrl?: string;
  savedAt: string; // ISO string for JSON serialization
  memo?: string;
  folderId?: string;
}

export function useAnalysisHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load history from AsyncStorage on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as HistoryItem[];
        // Restore Date objects from ISO strings
        const restored = parsed.map((item) => ({
          ...item,
          result: {
            ...item.result,
            analyzedAt: new Date(item.result.analyzedAt),
          },
        }));
        setHistory(restored);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToHistory = useCallback(
    async (result: AnalysisResult, inputUrl?: string): Promise<HistoryItem> => {
      const newItem: HistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        result,
        inputUrl,
        savedAt: new Date().toISOString(),
      };

      const updated = [newItem, ...history].slice(0, MAX_HISTORY);
      setHistory(updated);

      try {
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save history:', error);
      }

      return newItem;
    },
    [history]
  );

  const deleteFromHistory = useCallback(
    async (id: string) => {
      const updated = history.filter((item) => item.id !== id);
      setHistory(updated);

      try {
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to delete history item:', error);
      }
    },
    [history]
  );

  const updateMemo = useCallback(
    async (id: string, memo: string) => {
      const updated = history.map((item) =>
        item.id === id ? { ...item, memo } : item
      );
      setHistory(updated);

      try {
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to update memo:', error);
      }
    },
    [history]
  );

  const updateFolder = useCallback(
    async (id: string, folderId: string | undefined) => {
      const updated = history.map((item) =>
        item.id === id ? { ...item, folderId } : item
      );
      setHistory(updated);
      try {
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to update folder:', error);
      }
    },
    [history]
  );

  const clearHistory = useCallback(async () => {
    setHistory([]);
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }, []);

  return {
    history,
    isLoading,
    saveToHistory,
    deleteFromHistory,
    updateMemo,
    updateFolder,
    clearHistory,
    refresh: loadHistory,
  };
}
