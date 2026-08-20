import styles from './Profil.module.css';
import { EmptyState, GlassCard, Hex } from '../components/ui';
import { soft } from '../lib/colors';
import { quranText } from '../lib/quranText';
import { useOrgPositions } from '../hooks/useOrgPositions';
import { DIVISION_ROLE_LABELS, OFFICER_ROLES } from '../lib/divisionRoles';
import type { CSSVarStyle } from '../lib/cssVars';
import type { DivisionMember, OrgPosition } from '../types';

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

function isPlaceholderName(name: string): boolean {
  return /^Nama (Dosen|Ketua|Pengurus)/i.test(name.trim());
}

export default function Profil() {
  const { all, members, loading, error, refresh } = useOrgPositions();
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
          loading="lazy"
          decoding="async"
        />
        <figcaption className={styles.groupPhotoCaption}>
          <div className={styles.groupPhotoEyebrow}>Kepengurusan 2026/2027</div>
          <div className={styles.groupPhotoTitle}>Wajah-wajah yang menghidupkan gerak An-Nahl.</div>
          <p>Musyawarah Pergantian Pengurus LDF An-Nahl FKH USK.</p>
        </figcaption>
      </figure>

      <div className={styles.identityGrid}>
        <GlassCard variant="featured" radius={28} padding="30px" borderColor="rgba(232,199,102,.3)" className={styles.maknaCard}>
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

        <GlassCard radius={28} padding="30px" className={styles.spaceCard}>
          <div className={styles.cardEyebrow}>Ruang Bertumbuh</div>
          <div className={styles.spaceTitle}>Dakwah yang dekat dengan keseharian mahasiswa.</div>
          <p className={styles.spaceText}>
            An-Nahl menjadi ruang untuk belajar, saling menguatkan, mengelola kegiatan, dan merawat kehidupan
            mushalla di lingkungan FKH USK.
          </p>
        </GlassCard>
      </div>

      <section className={styles.historySection} aria-labelledby="sejarah-annahl-heading">
        <div className={styles.historyHeading}>
          <div className={styles.eyebrow}>Jejak Awal</div>
          <h2 id="sejarah-annahl-heading" className={styles.historyTitle}>Dari Bale-Bale ke Estafet Dakwah</h2>
          <p className={styles.historyDek}>Sebuah gerak yang tumbuh dari ruang sederhana, lalu dirawat lintas generasi.</p>
        </div>

        <div className={styles.historyStage}>
          <div className={styles.historyNarrative}>
            <p className={styles.historyLead}>
              Perjalanan ini tidak dimulai dari ruang yang luas atau organisasi yang telah mapan. Ia tumbuh dari
              kegelisahan mahasiswa Fakultas Kedokteran Hewan Unsyiah yang ingin dakwah kampus hadir lebih hidup.
            </p>
            <p>
              Di sebuah bale-bale kecil berukuran kurang lebih 3 × 3,5 meter, mereka membangun ruang untuk salat,
              bertemu, mengaji, dan menyiapkan kader. Bale-bale itu kemudian dibenahi menjadi mushalla sekaligus
              sekretariat.
            </p>
            <p>
              Pada <time dateTime="1996-10-13">13 Oktober 1996</time>, kepengurusan Mushalla An-Nahl dibentuk.
              Dari ruang sederhana itu, satu generasi mulai meneruskan amanah kepada generasi berikutnya.
            </p>
            <div className={styles.historySource}>
              <span className={styles.historySourceMark} aria-hidden="true">A</span>
              <span>Dirangkum dari arsip <em>5 Tahun An-Nahl</em>, bagian “Kilas Balik”.</span>
            </div>
          </div>

          <figure className={styles.archiveFeature}>
            <div className={styles.archivePhotoFrame}>
              <img
                src="/assets/photos/annahl-arsip-kilas-balik-5-tahun.jpg"
                alt="Halaman Kilas Balik dari buku arsip 5 Tahun An-Nahl"
                loading="lazy"
                decoding="async"
              />
              <span className={styles.archivePageMark}>Arsip • hlm. 2</span>
            </div>
            <figcaption>Catatan yang menyimpan titik mula perjalanan An-Nahl.</figcaption>
          </figure>
        </div>

        <ol className={styles.historyTimeline}>
          <li>
            <span className={styles.timelineMarker} aria-hidden="true" />
            <div className={styles.timelineMeta}>Sebelum terbentuk</div>
            <h3>Kegelisahan yang mempertemukan.</h3>
            <p>Kajian jumatan dan ikhtiar dakwah mulai dirintis oleh mahasiswa di lingkungan FKH.</p>
          </li>
          <li>
            <span className={styles.timelineMarker} aria-hidden="true" />
            <div className={styles.timelineMeta}><time dateTime="1996-10-13">13 Oktober 1996</time></div>
            <h3>Mushalla An-Nahl berpengurus.</h3>
            <p>Tonggak pembentukan kepengurusan pertama yang dicatat dalam arsip peringatan lima tahun.</p>
          </li>
          <li>
            <span className={styles.timelineMarker} aria-hidden="true" />
            <div className={styles.timelineMeta}>Hari ini dan seterusnya</div>
            <h3>Estafet yang terus dirawat.</h3>
            <p>Ruang, ilmu, dan amanah terus dihidupkan oleh generasi An-Nahl yang datang setelahnya.</p>
          </li>
        </ol>

        <div className={styles.estafetNote}>
          <figure className={styles.estafetArchive}>
            <img
              src="/assets/photos/annahl-arsip-mukadimah-5-tahun.jpg"
              alt="Halaman mukadimah buku arsip 5 Tahun An-Nahl"
              loading="lazy"
              decoding="async"
            />
          </figure>
          <div className={styles.estafetCopy}>
            <div className={styles.cardEyebrow}>Mengapa sejarah ini dirawat</div>
            <blockquote>
              Sejarah bukan pajangan masa lalu. Ia adalah pegangan agar dakwah tidak kehilangan arah ketika generasi
              berganti.
            </blockquote>
            <p>
              Gagasan itu sudah dicatat dalam mukadimah buku peringatan lima tahun An-Nahl. Karena itu, halaman ini
              tidak menutup kisahnya di masa lalu: ia menghubungkan para perintis dengan wajah-wajah yang melanjutkan
              amanah hari ini.
            </p>
          </div>
        </div>
      </section>

      <div className={styles.strukturHead}>
        <div className={styles.eyebrow}>Struktur</div>
        <h2 className={styles.strukturHeading}>{hasPublishedLeadership ? 'Susunan Kepengurusan' : 'Bidang Gerak'}</h2>
      </div>

      {loading && <div role="status">Memuat struktur organisasi…</div>}
      {!loading && error && (
        <EmptyState
          title="Struktur organisasi belum dapat dimuat."
          body={error}
          action={{ label: 'Coba lagi', onClick: refresh }}
        />
      )}

      {!error && <div className={styles.strukturWrap}>
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
            {(ketuaUmum || intiDuo.length > 0 || divisi.length > 0) && <div className={styles.connector} />}
          </>
        )}

        {ketuaUmum && (
          <>
            <GlassCard radius={28} padding="22px 36px" borderColor="rgba(232,199,102,.35)" className={styles.ketuaCard}>
              {ketuaUmum.photoUrl ? (
                <img src={ketuaUmum.photoUrl} alt="" className={styles.ketuaAvatarPhoto} />
              ) : (
                <div className={styles.ketuaAvatar}>{initialOf(ketuaUmum.name)}</div>
              )}
              <div className={styles.ketuaName}>{ketuaUmum.name}</div>
              <div className={styles.ketuaRole}>{ketuaUmum.roleTitle}</div>
            </GlassCard>
            {(intiDuo.length > 0 || divisi.length > 0) && <div className={styles.connector} />}
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
            {divisi.length > 0 && <div className={styles.connector} />}
          </>
        )}

        {divisi.length > 0 && (
          <div className={styles.treeScroll}>
            <div className={styles.divisionTree} style={{ '--cols': divisi.length } as CSSVarStyle}>
              {divisi.map((d) => (
                <DivisionColumn key={d.id} division={d} members={members.filter((m) => m.divisionId === d.id)} />
              ))}
            </div>
          </div>
        )}

        <div className={styles.mobileDivisionList} aria-label="Divisi organisasi">
          {divisi.map((d) => (
            <MobileDivisionAccordion
              key={d.id}
              division={d}
              members={members.filter((m) => m.divisionId === d.id)}
            />
          ))}
        </div>
      </div>}
    </div>
  );
}

interface DivisionColumnProps {
  division: OrgPosition;
  members: DivisionMember[];
}

function MobileDivisionAccordion({ division, members }: DivisionColumnProps) {
  const color = division.divisionColor ?? '#8FAAF5';
  const peopleCount = members.length;

  return (
    <details className={styles.divisionAccordion} style={{ '--div-color': color } as CSSVarStyle}>
      <summary className={styles.divisionSummary}>
        <span className={styles.divisionSummaryMark} aria-hidden="true">
          {initialOf(division.name)}
        </span>
        <span className={styles.divisionSummaryCopy}>
          <strong>{division.name}</strong>
          <small>{peopleCount > 0 ? `${peopleCount} pengurus tercatat` : 'Susunan pengurus belum diisi'}</small>
        </span>
        <span className={styles.divisionSummaryChevron} aria-hidden="true">⌄</span>
      </summary>
      <div className={styles.mobileDivisionBody}>
        <DivisionColumn division={division} members={members} />
      </div>
    </details>
  );
}

/** One division rendered as a vertical subtree: the ketua divisi at the head,
 *  the officer band (wakil/sekretaris/bendahara in canonical order) below it,
 *  then the anggota at the bottom. Subgrid on the parent keeps each band level
 *  across every division column. */
function DivisionColumn({ division, members }: DivisionColumnProps) {
  const color = division.divisionColor ?? '#8FAAF5';
  const ketua = members.find((m) => m.role === 'ketua');
  const officers = OFFICER_ROLES.flatMap((r) => members.filter((m) => m.role === r));
  const anggota = members.filter((m) => m.role === 'anggota').sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className={styles.divisionCol}>
      <GlassCard
        radius={20}
        padding="18px 16px"
        borderColor={soft(color)}
        className={styles.divisionHead}
        style={{ '--div-color': color } as CSSVarStyle}
      >
        {ketua?.photoUrl ? (
          <img src={ketua.photoUrl} alt="" className={styles.headPhoto} style={{ borderColor: color }} />
        ) : (
          <Hex width={44} height={48} bg={soft(color)} color={color} fontSize={16}>
            {initialOf(ketua?.name ?? division.name)}
          </Hex>
        )}
        <div className={styles.headName} style={ketua ? undefined : { opacity: 0.5, fontWeight: 700 }}>
          {ketua ? ketua.name : 'Belum ada ketua'}
        </div>
        <div className={styles.headRole} style={{ color }}>
          Ketua · {division.name}
        </div>
        {division.divisionDesc && <div className={styles.headDesc}>{division.divisionDesc}</div>}
      </GlassCard>

      <div className={styles.officerBand}>
        {officers.map((o) => (
          <div key={o.id} className={styles.officerCard}>
            {o.photoUrl ? (
              <img src={o.photoUrl} alt="" className={styles.officerPhoto} />
            ) : (
              <div className={styles.officerInitial} style={{ background: soft(color), color }}>
                {initialOf(o.name)}
              </div>
            )}
            <div className={styles.officerText}>
              <div className={styles.officerName}>{o.name}</div>
              <div className={styles.officerRole}>{DIVISION_ROLE_LABELS[o.role]}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.memberBand}>
        {anggota.map((a) => (
          <div key={a.id} className={styles.memberChip}>
            {a.photoUrl ? (
              <img src={a.photoUrl} alt="" className={styles.memberChipPhoto} />
            ) : (
              <span className={styles.memberChipInitial}>{initialOf(a.name)}</span>
            )}
            <span className={styles.memberChipName}>{a.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
