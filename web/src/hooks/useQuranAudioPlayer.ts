import { useCallback, useEffect, useRef, useState } from 'react';
import { getAyahAudioFallbackUrl, getAyahAudioUrl } from '../lib/quranAudio';
import type { QuranVerse } from '../types';

export interface QuranAudioPlayer {
  playingVerseKey: string | null;
  isPlaying: boolean;
  error: string | null;
  playVerse: (verse: QuranVerse) => void;
  togglePlayback: () => void;
  stop: () => void;
}

/** Sequential ayah-by-ayah player backed by a single shared <audio> element.
 * playVerse() always (re)starts the given verse; togglePlayback() pauses/resumes
 * whatever is currently loaded. On 'ended' it advances to the next verse in
 * `verses`, so playback naturally stops at the end of whatever chapter/juz slice
 * is currently loaded. */
export function useQuranAudioPlayer(verses: QuranVerse[], reciterId: string): QuranAudioPlayer {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentVerseKeyRef = useRef<string | null>(null);
  const usedFallbackRef = useRef(false);
  const reciterIdRef = useRef(reciterId);
  const versesRef = useRef(verses);
  reciterIdRef.current = reciterId;
  versesRef.current = verses;

  const [playingVerseKey, setPlayingVerseKey] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playVerse = useCallback((verse: QuranVerse, useFallback = false) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    usedFallbackRef.current = useFallback;
    currentVerseKeyRef.current = verse.verse_key;
    setError(null);
    audio.src = useFallback
      ? getAyahAudioFallbackUrl(reciterIdRef.current, verse.chapter_id, verse.verse_number)
      : getAyahAudioUrl(reciterIdRef.current, verse.chapter_id, verse.verse_number);
    setPlayingVerseKey(verse.verse_key);
    void audio.play().catch(() => {});
  }, []);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentVerseKeyRef.current) {
      return;
    }

    if (audio.paused) {
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    currentVerseKeyRef.current = null;
    setPlayingVerseKey(null);
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;

    function handlePlay() {
      setIsPlaying(true);
    }

    function handlePause() {
      setIsPlaying(false);
    }

    function handleEnded() {
      const list = versesRef.current;
      const currentIndex = list.findIndex((verse) => verse.verse_key === currentVerseKeyRef.current);
      const next = currentIndex >= 0 ? list[currentIndex + 1] : undefined;

      if (next) {
        playVerse(next);
      } else {
        currentVerseKeyRef.current = null;
        setPlayingVerseKey(null);
      }
    }

    function handleError() {
      const verse = versesRef.current.find((item) => item.verse_key === currentVerseKeyRef.current);

      if (verse && !usedFallbackRef.current) {
        playVerse(verse, true);
        return;
      }

      setError('Audio murottal tidak tersedia untuk ayat ini.');
      currentVerseKeyRef.current = null;
      setPlayingVerseKey(null);
      setIsPlaying(false);
    }

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [playVerse]);

  useEffect(() => {
    const key = currentVerseKeyRef.current;
    if (!key) {
      return;
    }

    const verse = versesRef.current.find((item) => item.verse_key === key);
    if (verse) {
      playVerse(verse);
    }
  }, [reciterId, playVerse]);

  return { playingVerseKey, isPlaying, error, playVerse, togglePlayback, stop };
}
