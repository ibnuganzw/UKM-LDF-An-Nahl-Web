import { useEffect, useState } from 'react';
import styles from './Shalat.module.css';
import { GlassCard, Hex } from '../components/ui';
import { useNow } from '../hooks/useNow';
import { usePrayerSchedule } from '../hooks/usePrayerSchedule';
import { getNextPrayer } from '../lib/prayer';
import { searchPrayerCities, type PrayerCity } from '../lib/prayerLocation';
import { formatFullDate } from '../lib/dates';
import { HIJRI_STR } from '../config';
import { cx } from '../lib/cx';

function LocationPicker({
  onSelect,
  onDetect,
  locating,
  locateError,
}: {
  onSelect: (city: PrayerCity) => void;
  onDetect: () => void;
  locating: boolean;
  locateError: string | null;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PrayerCity[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    const timer = window.setTimeout(() => {
      searchPrayerCities(trimmed, controller.signal)
        .then((cities) => setResults(cities))
        .catch(() => {
          if (!controller.signal.aborted) setResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className={styles.locationPanel}>
      <button type="button" className={styles.locationDetectBtn} onClick={onDetect} disabled={locating}>
        <span aria-hidden="true">📍</span>
        {locating ? 'Mendeteksi lokasi…' : 'Gunakan lokasi saat ini'}
      </button>

      <div className={styles.locationDivider}>atau cari kota</div>

      <input
        type="text"
        className={styles.locationSearchInput}
        placeholder="Ketik nama kota/kabupaten…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        autoComplete="off"
      />

      {results.length > 0 && (
        <div className={styles.locationResults}>
          {results.map((city) => (
            <button key={city.id} type="button" className={styles.locationResultItem} onClick={() => onSelect(city)}>
              {city.lokasi}
            </button>
          ))}
        </div>
      )}

      {query.trim().length >= 3 && !searching && results.length === 0 && (
        <p className={styles.locationNote}>Kota tidak ditemukan. Coba nama lain.</p>
      )}

      {locateError && <p className={cx(styles.locationNote, styles.locationNoteError)}>{locateError}</p>}
    </div>
  );
}

export default function Shalat() {
  const now = useNow();
  const schedule = usePrayerSchedule(now);
  const prayer = getNextPrayer(now, schedule.prayerTimes, schedule.utcOffsetHours);
  const [pickerOpen, setPickerOpen] = useState(false);

  function handleSelectCity(city: PrayerCity) {
    schedule.setCity(city);
    setPickerOpen(false);
  }

  async function handleDetect() {
    await schedule.detectLocation();
    setPickerOpen(false);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>Waktu Shalat</div>
        <h1 className={styles.dateHeading}>{formatFullDate(now)}</h1>
        <div className={styles.subLine}>{HIJRI_STR}</div>
        <div className={styles.locationRow}>
          <span>{schedule.lokasi}</span>
          <button type="button" className={styles.locationChangeBtn} onClick={() => setPickerOpen((open) => !open)}>
            {pickerOpen ? 'Tutup' : 'Ganti lokasi'}
          </button>
        </div>
        {pickerOpen && (
          <LocationPicker
            onSelect={handleSelectCity}
            onDetect={handleDetect}
            locating={schedule.locating}
            locateError={schedule.locateError}
          />
        )}
      </div>

      <GlassCard
        variant="featured"
        radius={28}
        borderColor="rgba(232,199,102,.32)"
        background="linear-gradient(150deg,rgba(201,162,39,.16),rgba(255,255,255,.04))"
        padding="38px 28px"
        className={styles.panel}
      >
        <div className={styles.panelHex1} />
        <div className={styles.panelHex2} />
        <div className={cx('breath', styles.panelGlow)} />
        <div className={styles.panelContent}>
          <div className={styles.panelLabel}>Shalat berikutnya</div>
          <div className={styles.prayerName}>{prayer.name}</div>
          <div className={styles.prayerTime}>{prayer.time} {schedule.zoneLabel}</div>
          <div className={cx('cdGlow', styles.countdownPill)}>− {prayer.countdown}</div>
        </div>
      </GlassCard>

      <GlassCard radius={24} padding="0" className={styles.listPanel}>
        {schedule.prayerTimes.map((p, i) => {
          const active = i === prayer.index;
          return (
            <div key={p.name} className={styles.row} style={{ background: active ? 'rgba(232,199,102,.1)' : 'transparent' }}>
              <div className={styles.rowLeft}>
                <Hex width={9} height={10} bg={active ? '#E8C766' : 'rgba(255,255,255,.2)'} />
                <span className={styles.rowName} style={{ color: active ? '#F5EFDC' : '#A9B3D1' }}>{p.name}</span>
                {i === 1 && <span className={styles.rowNote}>terbit</span>}
              </div>
              <span className={styles.rowTime} style={{ color: active ? '#F5EFDC' : '#A9B3D1' }}>{p.time}</span>
            </div>
          );
        })}
      </GlassCard>

      {schedule.status === 'error' && (
        <p className={styles.disclaimer}>{schedule.message ?? 'Gagal memuat jadwal shalat.'} Menampilkan jadwal terakhir yang tersedia.</p>
      )}

      <div className={styles.quoteCard}>
        <div className={styles.quoteText}>"Sesungguhnya shalat itu mencegah dari perbuatan keji dan mungkar."</div>
        <div className={styles.quoteCite}>QS. AL-'ANKABUT : 45</div>
      </div>
    </div>
  );
}
