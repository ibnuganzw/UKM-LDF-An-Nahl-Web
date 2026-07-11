import styles from './Profil.module.css';
import { GlassCard, Hex } from '../components/ui';
import { soft } from '../lib/colors';
import { quranText } from '../lib/quranText';
import { useOrgPositions } from '../hooks/useOrgPositions';

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

function isPlaceholderName(name: string): boolean {
  return /^Nama (Dosen|Ketua|Pengurus)/i.test(name.trim());
}

export default function Profil() {
  const { all } = useOrgPositions();
  const published = all.filter((p) => !isPlaceholderName(p.name));
  const dosenPembina = published.find((p) => p.tier === 0);
  const ketuaUmum = published.find((p) => p.tier === 1);
  const intiDuo = published.filter((p) => p.tier === 2);
  const divisi = all.filter((p) => p.tier === 3);
  const hasPublishedLeadership = Boolean(dosenPembina || ketuaUmum || intiDuo.length);

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

      <figure className={styles.groupPhotoCard}>
        <img
          src="/assets/photos/profile-pengurus-2026-v1.jpg"
          alt="Pengurus LDF An-Nahl FKH USK periode 2026/2027"
          className={styles.groupPhoto}
        />
        <figcaption className={styles.groupPhotoCaption}>
          <div className={styles.groupPhotoEyebrow}>Kepengurusan 2026/2027</div>
          <div className={styles.groupPhotoTitle}>Wajah-wajah yang menghidupkan gerak An-Nahl.</div>
          <p>Musyawarah Pergantian Pengurus LDF An-Nahl FKH USK.</p>
        </figcaption>
      </figure>

      <div className={styles.identityGrid}>
        <GlassCard variant="featured" radius={24} padding="30px" borderColor="rgba(232,199,102,.3)" className={styles.maknaCard}>
          <div className={styles.maknaHex} />
          <div className={styles.cardEyebrow}>Makna Nama</div>
          <div className={styles.maknaArabic} dir="rtl" lang="ar">
            {quranText('النَّحْل')}
          </div>
          <div className={styles.maknaName}>An-Nahl — Lebah</div>
          <p className={styles.maknaText}>
            Diambil dari surah ke-16 Al-Qur'an. Lebah hanya hinggap di tempat yang baik, mengambil yang baik, dan
            menghasilkan yang bermanfaat — begitulah cita-cita gerak dakwah kami di kampus.
          </p>
        </GlassCard>

        <GlassCard radius={24} padding="30px" className={styles.spaceCard}>
          <div className={styles.cardEyebrow}>Ruang Bertumbuh</div>
          <div className={styles.spaceTitle}>Dakwah yang dekat dengan keseharian mahasiswa.</div>
          <p className={styles.spaceText}>
            An-Nahl menjadi ruang untuk belajar, saling menguatkan, mengelola kegiatan, dan merawat kehidupan
            mushalla di lingkungan FKH USK.
          </p>
        </GlassCard>
      </div>

      <div className={styles.strukturHead}>
        <div className={styles.eyebrow}>Struktur</div>
        <h2 className={styles.strukturHeading}>{hasPublishedLeadership ? 'Susunan Kepengurusan' : 'Bidang Gerak'}</h2>
      </div>

      <div className={styles.strukturWrap}>
        {dosenPembina && (
          <>
            <GlassCard radius={20} padding="16px 26px" className={styles.intiCard}>
              {dosenPembina.photoUrl ? (
                <img src={dosenPembina.photoUrl} alt="" className={styles.intiAvatarPhoto} />
              ) : (
                <div className={styles.intiAvatar}>{initialOf(dosenPembina.name)}</div>
              )}
              <div className={styles.intiName}>{dosenPembina.name}</div>
              <div className={styles.intiRole}>{dosenPembina.roleTitle}</div>
            </GlassCard>
            <div className={styles.connector} />
          </>
        )}

        {ketuaUmum && (
          <>
            <GlassCard radius={22} padding="22px 36px" borderColor="rgba(232,199,102,.35)" className={styles.ketuaCard}>
              {ketuaUmum.photoUrl ? (
                <img src={ketuaUmum.photoUrl} alt="" className={styles.ketuaAvatarPhoto} />
              ) : (
                <div className={styles.ketuaAvatar}>{initialOf(ketuaUmum.name)}</div>
              )}
              <div className={styles.ketuaName}>{ketuaUmum.name}</div>
              <div className={styles.ketuaRole}>{ketuaUmum.roleTitle}</div>
            </GlassCard>
            <div className={styles.connector} />
          </>
        )}

        {intiDuo.length > 0 && (
          <>
            <div className={styles.intiRow}>
              {intiDuo.map((p) => (
                <GlassCard key={p.id} radius={20} padding="16px 26px" className={styles.intiCard}>
                  {p.photoUrl ? (
                    <img src={p.photoUrl} alt="" className={styles.intiAvatarPhoto} />
                  ) : (
                    <div className={styles.intiAvatar}>{initialOf(p.name)}</div>
                  )}
                  <div className={styles.intiName}>{p.name}</div>
                  <div className={styles.intiRole}>{p.roleTitle}</div>
                </GlassCard>
              ))}
            </div>
            <div className={styles.connector} />
          </>
        )}

        <div className={styles.deptGrid}>
          {divisi.map((d) => (
            <GlassCard key={d.id} radius={20} padding="20px" borderColor="rgba(232,199,102,.14)" className={styles.deptCard}>
              {d.photoUrl ? (
                <img src={d.photoUrl} alt="" className={styles.deptPhoto} />
              ) : (
                <Hex width={40} height={44} bg={soft(d.divisionColor ?? '#8FAAF5')} color={d.divisionColor ?? '#8FAAF5'} fontSize={15}>
                  {initialOf(d.name)}
                </Hex>
              )}
              <div>
                <div className={styles.deptName}>{d.name}</div>
                <div className={styles.deptDesc}>{d.divisionDesc}</div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
