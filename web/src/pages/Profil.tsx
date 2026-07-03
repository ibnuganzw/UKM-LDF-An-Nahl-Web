import styles from './Profil.module.css';
import { GlassCard, Hex } from '../components/ui';
import { KETUA_UMUM, MISI_LIST, SEJARAH_ITEMS, STRUKTUR_DEPT, STRUKTUR_INTI, VISI_TEXT } from '../data/org';
import { soft } from '../lib/colors';

export default function Profil() {
  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <div className={styles.eyebrow}>Profil Organisasi</div>
        <h1 className={styles.h1}>Mengenal LDF An-Nahl</h1>
        <p className={styles.introLead}>
          Lembaga Dakwah Fakultas di Fakultas Kedokteran Hewan Universitas Syiah Kuala. Bergerak seperti lebah:
          teratur, bermanfaat, dan tidak merusak.
        </p>
      </div>

      <div className={styles.grid2}>
        <GlassCard variant="featured" radius={24} padding="30px" borderColor="rgba(232,199,102,.3)" className={styles.maknaCard}>
          <div className={styles.maknaHex} />
          <div className={styles.cardEyebrow}>Makna Nama</div>
          <div className={styles.maknaArabic} dir="rtl">النَّحْل</div>
          <div className={styles.maknaName}>An-Nahl — Lebah</div>
          <p className={styles.maknaText}>
            Diambil dari surah ke-16 Al-Qur'an. Lebah hanya hinggap di tempat yang baik, mengambil yang baik, dan
            menghasilkan yang bermanfaat — begitulah cita-cita gerak dakwah kami di kampus.
          </p>
        </GlassCard>

        <GlassCard radius={24} padding="30px">
          <div className={styles.cardEyebrow}>Sejarah Singkat</div>
          <div className={styles.timeline}>
            {SEJARAH_ITEMS.map((s, i) => (
              <div key={i} className={styles.timelineRow}>
                <div className={styles.timelineRail}>
                  <span className={styles.timelineDot} />
                  {i < SEJARAH_ITEMS.length - 1 && <span className={styles.timelineLine} />}
                </div>
                <div className={styles.timelineBody}>
                  <div className={styles.timelineTitle}>{s.title}</div>
                  <div className={styles.timelineText}>{s.text}</div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className={styles.grid2b}>
        <GlassCard variant="featured" radius={24} padding="30px" borderColor="rgba(232,199,102,.32)" background="linear-gradient(150deg,rgba(201,162,39,.16),rgba(255,255,255,.03))">
          <div className={styles.cardEyebrowLight}>Visi</div>
          <div className={styles.visiQuote}>"{VISI_TEXT}"</div>
          <div className={styles.visiNote}>Teks contoh — sesuaikan dengan visi resmi organisasi.</div>
        </GlassCard>

        <GlassCard radius={24} padding="30px">
          <div className={styles.cardEyebrow}>Misi</div>
          <div className={styles.misiList}>
            {MISI_LIST.map((m) => (
              <div key={m.n} className={styles.misiRow}>
                <span className={styles.misiNum}>{m.n}</span>
                <span className={styles.misiText}>{m.text}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className={styles.strukturHead}>
        <div className={styles.eyebrow}>Struktur</div>
        <h2 className={styles.strukturHeading}>Susunan Kepengurusan</h2>
      </div>

      <div className={styles.strukturWrap}>
        <GlassCard radius={22} padding="22px 36px" borderColor="rgba(232,199,102,.35)" className={styles.ketuaCard}>
          <div className={styles.ketuaAvatar}>{KETUA_UMUM.initial}</div>
          <div className={styles.ketuaName}>{KETUA_UMUM.name}</div>
          <div className={styles.ketuaRole}>{KETUA_UMUM.role}</div>
        </GlassCard>

        <div className={styles.connector} />

        <div className={styles.intiRow}>
          {STRUKTUR_INTI.map((p) => (
            <GlassCard key={p.role} radius={20} padding="16px 26px" className={styles.intiCard}>
              <div className={styles.intiAvatar}>{p.initial}</div>
              <div className={styles.intiName}>{p.name}</div>
              <div className={styles.intiRole}>{p.role}</div>
            </GlassCard>
          ))}
        </div>

        <div className={styles.connector} />

        <div className={styles.deptGrid}>
          {STRUKTUR_DEPT.map((d) => (
            <GlassCard key={d.name} radius={20} padding="20px" borderColor="rgba(232,199,102,.14)" className={styles.deptCard}>
              <Hex width={40} height={44} bg={soft(d.color)} color={d.color} fontSize={15}>{d.initial}</Hex>
              <div>
                <div className={styles.deptName}>{d.name}</div>
                <div className={styles.deptDesc}>{d.desc}</div>
              </div>
            </GlassCard>
          ))}
        </div>

        <div className={styles.strukturNote}>Nama pengurus masih placeholder — akan diisi sesuai SK kepengurusan.</div>
      </div>
    </div>
  );
}
