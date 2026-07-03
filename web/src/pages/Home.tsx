import { Link } from 'react-router-dom';
import styles from './Home.module.css';
import { Hero } from '../components/home/Hero';
import { Badge, Button, Divider, GlassCard, Hex, SectionHeader } from '../components/ui';
import { useAgendas } from '../hooks/useAgendas';
import { useNow } from '../hooks/useNow';
import { getNextPrayer } from '../lib/prayer';
import { ARTICLES, CATEGORIES } from '../data/articles';
import { CATEGORY_COLORS } from '../lib/colors';

export default function Home() {
  const { soon, upcoming } = useAgendas();
  const now = useNow();
  const prayer = getNextPrayer(now);
  const nextAgenda = upcoming[0];

  const catCards = CATEGORIES.map((c) => ({
    ...c,
    color: CATEGORY_COLORS[c.name],
    articles: ARTICLES.filter((a) => a.cat === c.name).slice(0, 2),
  }));

  return (
    <div>
      <Hero nextPrayerName={prayer.name} nextPrayerTime={prayer.time} />

      {/* QUICK STRIP */}
      <section className={styles.section}>
        <div className={`rv ${styles.quickGrid}`}>
          <GlassCard to="/shalat" hover radius={20} padding="22px 24px" borderColor="rgba(232,199,102,.18)" className={styles.quickCard}>
            <Hex width={46} height={51} bg="rgba(232,199,102,.12)" color="#E8C766" fontSize={20} fontFamily="Amiri, serif">☾</Hex>
            <div style={{ minWidth: 0 }}>
              <div className={styles.quickLabel}>Menuju {prayer.name}</div>
              <div className={`cdGlow ${styles.quickValue}`}>{prayer.countdown}</div>
            </div>
          </GlassCard>

          <GlassCard to="/agenda" hover radius={20} padding="22px 24px" borderColor="rgba(232,199,102,.18)" className={styles.quickCard}>
            <Hex width={46} height={51} bg="rgba(232,199,102,.12)" color="#E8C766" fontSize={16}>
              {nextAgenda ? nextAgenda.dayNum : '–'}
            </Hex>
            <div style={{ minWidth: 0 }}>
              <div className={styles.quickLabel}>Agenda terdekat · {nextAgenda ? nextAgenda.relLabel : ''}</div>
              <div className={styles.quickValueTitle}>{nextAgenda ? nextAgenda.title : 'Belum ada agenda'}</div>
            </div>
          </GlassCard>

          <GlassCard to="/quran" hover radius={20} padding="22px 24px" borderColor="rgba(232,199,102,.18)" className={styles.quickCard}>
            <Hex width={46} height={51} bg="rgba(232,199,102,.12)" color="#E8C766" fontSize={21} fontFamily="Amiri, serif">ق</Hex>
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
        <div className={`rv ${styles.agendaGrid}`}>
          {soon.map((a) => (
            <GlassCard key={a.id} to={`/agenda/${a.id}`} hover radius={22} padding="26px" className={styles.agendaCard}>
              <div className={styles.agendaBadgeRow}>
                <Badge
                  color="#E8C766"
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
                <div>{a.dateLabel} · {a.time}</div>
                <div>{a.location}</div>
              </div>
              <div className={styles.agendaFooter}>{a.footerLabel}</div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* QURAN BAND */}
      <section className={styles.quranBandSection}>
        <div className="rv">
          <GlassCard radius={30} borderColor="rgba(232,199,102,.22)" className={styles.quranBand}>
            <div className={styles.quranBandTexture} />
            <div className={`breathB ${styles.quranBandGlow}`} />
            <div className={styles.quranBandInner}>
              <div className={styles.bismillah} dir="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
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
        <div className={`rv ${styles.kontenGrid}`}>
          {catCards.map((c) => (
            <GlassCard key={c.name} radius={22} padding="28px" className={styles.kontenCard}>
              <div className={styles.kontenNameRow}>
                <Hex width={12} height={13} bg="#E8C766" glow />
                <span className={styles.kontenName}>{c.name}</span>
              </div>
              <p className={styles.kontenBlurb}>{c.blurb}</p>
              <div className={styles.kontenArticleList}>
                {c.articles.map((t) => (
                  <Link key={t.id} to={`/konten/${t.id}`} className={styles.kontenArticleRow}>
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
          <GlassCard radius={26} className={styles.aboutCard} style={{ height: '100%' }}>
            <div className={styles.quickLabel} style={{ letterSpacing: '.26em' }}>Mengapa An-Nahl</div>
            <div className={styles.quote}>
              "Dan Tuhanmu mewahyukan kepada lebah: buatlah sarang di gunung-gunung, di pohon-pohon kayu, dan di tempat-tempat yang dibuat manusia."
            </div>
            <div className={styles.citation}>QS. AN-NAHL : 68</div>
            <Link to="/profil" className={styles.linkMore} style={{ padding: '6px 0' }}>Kenali organisasi kami →</Link>
          </GlassCard>
        </div>
        <div className="rv">
          <GlassCard variant="featured" radius={26} className={styles.joinCard} style={{ height: '100%' }}>
            <div className={styles.joinHexes}>
              <Hex width={56} height={62} bg="rgba(232,199,102,.25)" />
              <Hex width={56} height={62} bg="rgba(232,199,102,.12)" className={styles.joinHex2} />
            </div>
            <div className={styles.quickLabel} style={{ color: '#E8C766', letterSpacing: '.26em' }}>Bergabung</div>
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
