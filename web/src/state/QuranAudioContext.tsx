import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getAyahAudioFallbackUrl, getAyahAudioUrl, getReciter, isKnownReciter } from '../lib/quranAudio';
import type { QuranVerse } from '../types';

export interface QuranAudioSource {
  title: string;
  hrefForVerse: (verse: QuranVerse) => string;
}

interface QuranAudioValue {
  currentVerse: QuranVerse | null;
  sourceTitle: string;
  currentHref: string;
  reciterId: string;
  isPlaying: boolean;
  error: string | null;
  currentTime: number;
  duration: number;
  playVerse: (
    verse: QuranVerse,
    queue: QuranVerse[],
    source: QuranAudioSource,
    reciterId: string,
  ) => void;
  togglePlayback: () => void;
  previous: () => void;
  next: () => void;
  seek: (seconds: number) => void;
  stop: () => void;
  setReciter: (reciterId: string) => void;
}

interface QueueState {
  verses: QuranVerse[];
  index: number;
  source: QuranAudioSource;
}

const QuranAudioContext = createContext<QuranAudioValue | null>(null);

export function QuranAudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<QueueState | null>(null);
  const reciterRef = useRef('ar.alafasy');
  const fallbackRef = useRef(false);
  const loadAtIndexRef = useRef<(index: number, fallback?: boolean) => void>(() => {});
  const [currentVerse, setCurrentVerse] = useState<QuranVerse | null>(null);
  const [sourceTitle, setSourceTitle] = useState('');
  const [currentHref, setCurrentHref] = useState('');
  const [reciterId, setReciterId] = useState(reciterRef.current);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const loadAtIndex = useCallback((index: number, fallback = false) => {
    const queue = queueRef.current;
    const audio = audioRef.current;
    const verse = queue?.verses[index];
    if (!queue || !audio || !verse) return;

    queue.index = index;
    fallbackRef.current = fallback;
    setCurrentVerse(verse);
    setSourceTitle(queue.source.title);
    setCurrentHref(queue.source.hrefForVerse(verse));
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    audio.src = fallback
      ? getAyahAudioFallbackUrl(reciterRef.current, verse.chapter_id, verse.verse_number)
      : getAyahAudioUrl(reciterRef.current, verse.chapter_id, verse.verse_number);
    void audio.play().catch(() => {
      setIsPlaying(false);
    });
  }, []);
  loadAtIndexRef.current = loadAtIndex;

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTime = () => {
      setCurrentTime(Number.isFinite(audio.currentTime) ? audio.currentTime : 0);
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    const handleEnded = () => {
      const queue = queueRef.current;
      if (queue && queue.index < queue.verses.length - 1) {
        loadAtIndexRef.current(queue.index + 1);
      } else {
        setIsPlaying(false);
      }
    };
    const handleError = () => {
      const queue = queueRef.current;
      if (queue && !fallbackRef.current) {
        loadAtIndexRef.current(queue.index, true);
        return;
      }
      setError('Audio murottal tidak tersedia untuk ayat ini.');
      setIsPlaying(false);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTime);
    audio.addEventListener('durationchange', handleTime);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    return () => {
      audio.pause();
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTime);
      audio.removeEventListener('durationchange', handleTime);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audioRef.current = null;
    };
  }, []);

  const playVerse = useCallback((
    verse: QuranVerse,
    queue: QuranVerse[],
    source: QuranAudioSource,
    nextReciterId: string,
  ) => {
    const safeReciter = isKnownReciter(nextReciterId) ? nextReciterId : 'ar.alafasy';
    reciterRef.current = safeReciter;
    setReciterId(safeReciter);
    const index = Math.max(0, queue.findIndex((item) => item.verse_key === verse.verse_key));
    queueRef.current = { verses: queue, index, source };
    loadAtIndex(index);
  }, [loadAtIndex]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !queueRef.current) return;
    if (audio.paused) void audio.play().catch(() => {});
    else audio.pause();
  }, []);

  const resume = useCallback(() => {
    const audio = audioRef.current;
    if (audio && queueRef.current && audio.paused) void audio.play().catch(() => {});
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const previous = useCallback(() => {
    const queue = queueRef.current;
    if (queue && queue.index > 0) loadAtIndex(queue.index - 1);
  }, [loadAtIndex]);

  const next = useCallback(() => {
    const queue = queueRef.current;
    if (queue && queue.index < queue.verses.length - 1) loadAtIndex(queue.index + 1);
  }, [loadAtIndex]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = Math.min(Math.max(0, seconds), audio.duration);
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    queueRef.current = null;
    setCurrentVerse(null);
    setSourceTitle('');
    setCurrentHref('');
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
  }, []);

  const setReciter = useCallback((nextReciterId: string) => {
    if (!isKnownReciter(nextReciterId) || nextReciterId === reciterRef.current) return;
    reciterRef.current = nextReciterId;
    setReciterId(nextReciterId);
    const queue = queueRef.current;
    if (queue) loadAtIndex(queue.index);
  }, [loadAtIndex]);

  useEffect(() => {
    if (!currentVerse || !('mediaSession' in navigator)) return;
    const reciter = getReciter(reciterId);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${sourceTitle} · Ayat ${currentVerse.verse_number}`,
      artist: reciter.name,
      album: "Al-Qur'an · LDF An-Nahl",
      artwork: [{ src: '/assets/logo-192.jpg', sizes: '192x192', type: 'image/jpeg' }],
    });
  }, [currentVerse, reciterId, sourceTitle]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const actions: Array<[MediaSessionAction, MediaSessionActionHandler | null]> = [
      ['play', resume],
      ['pause', pause],
      ['previoustrack', previous],
      ['nexttrack', next],
      ['stop', stop],
    ];
    actions.forEach(([action, handler]) => {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* unsupported action */ }
    });
    return () => actions.forEach(([action]) => {
      try { navigator.mediaSession.setActionHandler(action, null); } catch { /* unsupported action */ }
    });
  }, [next, pause, previous, resume, stop]);

  const value = useMemo<QuranAudioValue>(() => ({
    currentVerse,
    sourceTitle,
    currentHref,
    reciterId,
    isPlaying,
    error,
    currentTime,
    duration,
    playVerse,
    togglePlayback,
    previous,
    next,
    seek,
    stop,
    setReciter,
  }), [
    currentHref,
    currentTime,
    currentVerse,
    duration,
    error,
    isPlaying,
    next,
    playVerse,
    previous,
    reciterId,
    seek,
    setReciter,
    sourceTitle,
    stop,
    togglePlayback,
  ]);

  return <QuranAudioContext.Provider value={value}>{children}</QuranAudioContext.Provider>;
}

// oxlint-disable-next-line react/only-export-components -- Context and its typed hook are one state API.
export function useQuranAudio(): QuranAudioValue {
  const value = useContext(QuranAudioContext);
  if (!value) throw new Error('useQuranAudio must be used inside QuranAudioProvider.');
  return value;
}
