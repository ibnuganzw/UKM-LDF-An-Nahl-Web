import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  createQuranBookmark,
  DEFAULT_QURAN_COLLECTION,
  isVerseBookmarked,
  normalizeBookmarks,
  normalizeCollectionName,
  normalizeCollections,
  toggleQuranBookmark,
  type QuranBookmark,
  type QuranReadingProgress,
} from '../lib/quranLibrary';
import type { QuranVerse } from '../types';

const BOOKMARKS_KEY = 'annahl:quran-bookmarks:v1';
const COLLECTIONS_KEY = 'annahl:quran-collections:v1';
const ACTIVE_COLLECTION_KEY = 'annahl:quran-active-collection:v1';
const PROGRESS_KEY = 'annahl:quran-reading-progress:v1';

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function saveStored(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Reading tools remain usable when storage is blocked or full.
  }
}

interface QuranLibraryValue {
  bookmarks: QuranBookmark[];
  collections: string[];
  activeCollection: string;
  progress: QuranReadingProgress | null;
  focusMode: boolean;
  setActiveCollection: (collection: string) => void;
  addCollection: (name: string) => string | null;
  removeCollection: (name: string) => void;
  toggleBookmark: (verse: QuranVerse, path: string) => void;
  removeBookmark: (id: string) => void;
  isBookmarked: (verseKey: string) => boolean;
  saveProgress: (value: QuranReadingProgress) => void;
  setFocusMode: (value: boolean) => void;
}

const QuranLibraryContext = createContext<QuranLibraryValue | null>(null);

export function QuranLibraryProvider({ children }: { children: ReactNode }) {
  const [bookmarks, setBookmarks] = useState<QuranBookmark[]>(() =>
    normalizeBookmarks(loadStored<unknown>(BOOKMARKS_KEY, [])),
  );
  const [collections, setCollections] = useState<string[]>(() =>
    normalizeCollections(loadStored<unknown>(COLLECTIONS_KEY, [])),
  );
  const [activeCollection, setActiveCollectionState] = useState(() => {
    const stored = loadStored<unknown>(ACTIVE_COLLECTION_KEY, DEFAULT_QURAN_COLLECTION);
    return typeof stored === 'string' && normalizeCollectionName(stored)
      ? normalizeCollectionName(stored)
      : DEFAULT_QURAN_COLLECTION;
  });
  const [progress, setProgress] = useState<QuranReadingProgress | null>(() => {
    const stored = loadStored<unknown>(PROGRESS_KEY, null);
    if (!stored || typeof stored !== 'object') return null;
    const item = stored as Partial<QuranReadingProgress>;
    return typeof item.path === 'string' && typeof item.verseKey === 'string' && typeof item.label === 'string'
      ? item as QuranReadingProgress
      : null;
  });
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => saveStored(BOOKMARKS_KEY, bookmarks), [bookmarks]);
  useEffect(() => saveStored(COLLECTIONS_KEY, collections), [collections]);
  useEffect(() => saveStored(ACTIVE_COLLECTION_KEY, activeCollection), [activeCollection]);
  useEffect(() => saveStored(PROGRESS_KEY, progress), [progress]);

  useEffect(() => {
    if (!collections.includes(activeCollection)) {
      setActiveCollectionState(DEFAULT_QURAN_COLLECTION);
    }
  }, [activeCollection, collections]);

  const setActiveCollection = useCallback((collection: string) => {
    const normalized = normalizeCollectionName(collection);
    if (normalized) setActiveCollectionState(normalized);
  }, []);

  const addCollection = useCallback((name: string) => {
    const normalized = normalizeCollectionName(name);
    if (!normalized) return null;
    setCollections((current) => normalizeCollections([...current, normalized]));
    setActiveCollectionState(normalized);
    return normalized;
  }, []);

  const removeCollection = useCallback((name: string) => {
    if (name === DEFAULT_QURAN_COLLECTION) return;
    setCollections((current) => current.filter((item) => item !== name));
    setBookmarks((current) => current.filter((item) => item.collection !== name));
  }, []);

  const toggleBookmark = useCallback((verse: QuranVerse, path: string) => {
    setBookmarks((current) => toggleQuranBookmark(
      current,
      createQuranBookmark(verse, activeCollection, path),
    ));
  }, [activeCollection]);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((current) => current.filter((bookmark) => bookmark.id !== id));
  }, []);

  const isBookmarked = useCallback(
    (verseKey: string) => isVerseBookmarked(bookmarks, verseKey, activeCollection),
    [activeCollection, bookmarks],
  );

  const saveProgress = useCallback((value: QuranReadingProgress) => {
    setProgress((current) => current?.verseKey === value.verseKey && current.path === value.path ? current : value);
  }, []);

  const value = useMemo<QuranLibraryValue>(() => ({
    bookmarks,
    collections,
    activeCollection,
    progress,
    focusMode,
    setActiveCollection,
    addCollection,
    removeCollection,
    toggleBookmark,
    removeBookmark,
    isBookmarked,
    saveProgress,
    setFocusMode,
  }), [
    activeCollection,
    addCollection,
    bookmarks,
    collections,
    focusMode,
    isBookmarked,
    progress,
    removeBookmark,
    removeCollection,
    saveProgress,
    setActiveCollection,
    toggleBookmark,
  ]);

  return <QuranLibraryContext.Provider value={value}>{children}</QuranLibraryContext.Provider>;
}

// oxlint-disable-next-line react/only-export-components -- Context and its typed hook are one state API.
export function useQuranLibrary(): QuranLibraryValue {
  const value = useContext(QuranLibraryContext);
  if (!value) throw new Error('useQuranLibrary must be used inside QuranLibraryProvider.');
  return value;
}
