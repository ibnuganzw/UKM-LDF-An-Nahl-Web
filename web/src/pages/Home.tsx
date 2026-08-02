import { Link } from 'react-router-dom';
import styles from './Home.module.css';
import { Hero } from '../components/home/Hero';
import { Badge, Button, Divider, GlassCard, SectionHeader } from '../components/ui';
import { useAgendas } from '../hooks/useAgendas';
import { useArticles } from '../hooks/useArticles';
import { useNow } from '../hooks/useNow';
import { usePrayerSchedule } from '../hooks/usePrayerSchedule';
import { getNextPrayer } from '../lib/prayer';
import { CATEGORIES } from '../data/articles';
import { CATEGORY_COLORS } from '../lib/colors';
import { quranText } from '../lib/quranText';

const ICON_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function MoonIcon() {
  return <svg {...ICON_PROPS}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>;
}

function BookIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2Z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z" />
    </svg>
  );
}

function getReminder(now: Date) {
  const day = now.getDay();
  const hours = now.getHours();
  const isEvening = hours >= 17; // 5 PM onwards

  if (isEvening && (day === 0 || day === 3)) {
    return {
      label: 'Pengingat Sunnah',
      title: 'Besok Puasa Senin-Kamis',
      icon: <MoonIcon />,
    };
  }
  if (isEvening && day === 4) {
    return {
      label: 'Malam Jumat',
      title: 'Waktunya Baca Al-Kahfi',
      icon: <BookIcon />,
    };
  }
  return null;
}

export default function Home() {
  const { soon, upcoming, loading: agendasLoading, error: agendasError, refresh: refreshAgendas } = useAgendas();
  const { all: articles, error: articlesError, refresh: refreshArticles } = useArticles();
  const now = useNow();
  const schedule = usePrayerSchedule(now);
  const prayer = getNextPrayer(now, schedule.prayerTimes, schedule.utcOffsetHours);
  const prayerAvailable = schedule.source !== 'unavailable';
  const heroPrayerName = prayerAvailable ? prayer.name : schedule.status === 'loading' ? 'Memuat jadwal' : 'Jadwal shalat';
  const heroPrayerTime = prayerAvailable ? prayer.time : schedule.status === 'loading' ? '…' : 'Belum tersedia';
  const nextAgenda = upcoming[0];
  const reminder = getReminder(now);

  const catCards = CATEGORIES.map((c) => ({
    ...c,
    color: CATEGORY_COLORS[c.name],
    articles: articles.filter((a) => a.cat === c.name).slice(0, 2),
  }));

  return (
    <div>
      <Hero nextPrayerName={heroPrayerName} nextPrayerTime={heroPrayerTime} />

      {/* QUICK STRIP */}
      <section className={styles.section}>
        <div className={`rv rvStagger ${styles.quickGrid}`}>
          <GlassCard to="/shalat" hover radius={20} padding="22px 24px" className={styles.quickCard}>
            <div className={styles.quickIcon} aria-hidden="true"><MoonIcon /></div>
            <div style={{ minWidth: 0 }}>
              <div className={styles.quickLabel}>{prayerAvailable ? `Menuju ${prayer.name}` : 'Jadwal shalat'}</div>
              <div className={styles.quickValue}>{prayerAvailable ? prayer.countdown : heroPrayerTime}</div>
            </div>
          </GlassCard>

          <GlassCard to="/agenda" hover radius={20} padding="22px 24px" className={styles.quickCard}>
            <div className={styles.quickIcon} aria-hidden="true">
              {reminder ? reminder.icon : (nextAgenda ? nextAgenda.dayNum : '–')}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className={styles.quickLabel}>{reminder ? reminder.label : `Agenda terdekat · ${nextAgenda ? nextAgenda.relLabel : ''}`}</div>
              <div className={styles.quickValueTitle}>{reminder ? reminder.title : (nextAgenda ? nextAgenda.title : 'Belum ada agenda')}</div>
            </div>
          </GlassCard>

          <GlassCard to="/quran" hover radius={20} padding="22px 24px" className={styles.quickCard}>
            <div className={`${styles.quickIcon} ${styles.quickIconArabic}`} aria-hidden="true">ق</div>
            <div style={{ minWidth: 0 }}>
              <div className={styles.quickLabel}>Al-Qur'an</div>
              <div className={styles.quickValueTitle}>Mulai dari Al-Fatihah</div>
            </div>
          </GlassCard>
        </div>
      </section>

      <div className={styles.dividerSection}>
        <Divider />
      </div>

      {/* AGENDA TERDEKAT */}
      <section className={styles.section}>
        <div className={`rv ${styles.sectionHeadRow}`}>
          <SectionHeader eyebrow="Agenda" title="Agenda terdekat" titleStyle={{ fontSize: 'clamp(32px,4.6vw,52px)' }} />
          <Link to="/agenda" className={styles.linkMore}>Semua agenda →</Link>
        </div>
        <div className={`rv rvStagger ${styles.agendaGrid}`}>
          {!agendasError && soon.map((a) => (
            <GlassCard key={a.id} to={`/agenda/${a.id}`} hover radius={20} padding="26px" className={styles.agendaCard}>
              <div className={styles.agendaBadgeRow}>
                <Badge
                  color="var(--gold-light)"
                  background="rgba(232,199,102,.1)"
                  border="rgba(232,199,102,.22)"
                  style={{ fontSize: 10, letterSpacing: '.16em', padding: '5px 12px' }}
                >
                  {a.type}
                </Badge>
                <span className={styles.agendaStatus}>{a.statusLabel}</span>
              </div>
              <div className={styles.agendaTitle}>{a.title}</div>
              <div className={styles.agendaMeta}>
                <div>{a.dateLabel} · {a.startTime}</div>
                <div>{a.location}</div>
              </div>
              <div className={styles.agendaFooter}>{a.footerLabel}</div>
            </GlassCard>
          ))}
          {agendasLoading && <div className={styles.homeLoading} role="status">Memuat agenda…</div>}
          {!agendasLoading && agendasError && (
            <div className={styles.homeEmpty} role="alert">
              <div>
                <div className={styles.homeEmptyTitle}>Agenda belum dapat dimuat.</div>
                <p>{agendasError}</p>
              </div>
              <button type="button" className={styles.linkMore} onClick={refreshAgendas}>Coba lagi →</button>
            </div>
          )}
          {!agendasLoading && !agendasError && soon.length === 0 && (
            <div className={styles.homeEmpty}>
              <div>
                <div className={styles.homeEmptyTitle}>Agenda baru sedang disiapkan.</div>
                <p>Pantau jadwal kajian, mentoring, dan kegiatan An-Nahl dari halaman Agenda.</p>
              </div>
              <Link to="/agenda" className={styles.linkMore}>Buka Agenda →</Link>
            </div>
          )}
        </div>
      </section>

      {/* QURAN BAND */}
      <section className={styles.quranBandSection}>
        <div className="rv">
          <GlassCard variant="featured" radius={28} className={styles.quranBand}>
            <div className={styles.quranBandInner}>
              <div className={styles.bismillah} dir="rtl" lang="ar">
                {quranText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ')}
              </div>
              <div className={styles.quranBandHeading}>Sediakan waktu untuk Al-Qur'an hari ini</div>
              <p className={styles.quranBandLead}>Ruang baca yang lapang dan tenang — mushaf, terjemahan, dan tadabbur dalam satu tempat.</p>
              <div style={{ marginTop: 30 }}>
                <Button to="/quran" variant="primary">Mulai Membaca</Button>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* KONTEN */}
      <section className={styles.kontenSection}>
        <div className={`rv ${styles.sectionHeadRow}`}>
          <SectionHeader eyebrow="Bacaan" title="Islam Veteriner · Kisah · Renungan" titleStyle={{ fontSize: 'clamp(30px,4.2vw,48px)', lineHeight: 1.1 }} />
          <Link to="/konten" className={styles.linkMore}>Semua tulisan →</Link>
        </div>
        <div className={`rv rvStagger ${styles.kontenGrid}`}>
          {articlesError && articles.length === 0 ? (
            <div className={styles.homeEmpty} role="alert">
              <div>
                <div className={styles.homeEmptyTitle}>Tulisan belum dapat dimuat.</div>
                <p>{articlesError}</p>
              </div>
              <button type="button" className={styles.linkMore} onClick={refreshArticles}>Coba lagi →</button>
            </div>
          ) : catCards.map((c) => (
            <GlassCard key={c.name} radius={20} padding="28px" className={styles.kontenCard}>
              <div className={styles.kontenNameRow}>
                <span className={styles.accentDot} aria-hidden="true" />
                <span className={styles.kontenName}>{c.name}</span>
              </div>
              <p className={styles.kontenBlurb}>{c.blurb}</p>
              <div className={styles.kontenArticleList}>
                {c.articles.map((t) => (
                  <Link key={t.id} to={`/konten/${t.slug}`} className={styles.kontenArticleRow}>
                    <span className={styles.kontenArticleTitle}>{t.title}</span>
                    <span className={styles.kontenArticleMins}>{t.mins} mnt</span>
                  </Link>
                ))}
              </div>
              <Link to="/konten" state={{ kontenTab: c.name }} className={styles.kontenGoLink}>
                Jelajahi {c.name} →
              </Link>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* TENTANG + JOIN */}
      <section className={styles.aboutJoinSection}>
        <div className="rv">
          <GlassCard radius={28} className={styles.aboutCard} style={{ height: '100%' }}>
            <div className={styles.quickLabel} style={{ letterSpacing: '.26em' }}>Mengapa An-Nahl</div>
            <div className={styles.quote}>
              "Dan Tuhanmu mewahyukan kepada lebah: buatlah sarang di gunung-gunung, di pohon-pohon kayu, dan di tempat-tempat yang dibuat manusia."
            </div>
            <div className={styles.citation}>QS. AN-NAHL : 68</div>
            <Link to="/profil" className={styles.linkMore} style={{ padding: '6px 0' }}>Kenali organisasi kami →</Link>
          </GlassCard>
        </div>
        <div className="rv">
          <GlassCard variant="featured" radius={28} className={styles.joinCard} style={{ height: '100%' }}>
            <div className={styles.quickLabel} style={{ color: 'var(--gold-light)', letterSpacing: '.26em' }}>Bergabung</div>
            <div className={styles.joinHeading}>Satu sarang, satu tujuan. Jadilah bagian dari koloni dakwah FKH.</div>
            <p className={styles.joinBody}>Open Recruitment anggota baru dibuka setiap awal kepengurusan. Daftarkan dirimu dan tumbuh bersama.</p>
            <div>
              <Button to="/register" variant="primary" size="md">Daftar Anggota</Button>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
