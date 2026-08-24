import styles from './Profil.module.css';
import { EmptyState } from '../components/ui';
import { quranText } from '../lib/quranText';
import { useOrgPositions } from '../hooks/useOrgPositions';
import { DIVISION_ROLE_LABELS, OFFICER_ROLES } from '../lib/divisionRoles';
import type { CSSVarStyle } from '../lib/cssVars';
import type { DivisionMember, OrgPosition } from '../types';

const ACTIVE_ORG_PERIOD = '2026/2027';

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
        <div className={styles.eyebrow}>Tentang An-Nahl</div>
        <h1 className={styles.h1}>LDF An-Nahl FKH USK</h1>
        <p className={styles.introLead}>
          Organisasi mahasiswa yang mengelola kegiatan keislaman, pembinaan anggota, dan kehidupan mushalla di
          Fakultas Kedokteran Hewan Universitas Syiah Kuala.
        </p>
        <div className={styles.introMeta}>Berdiri sejak 13 Oktober 1996</div>
      </div>

      <figure className={styles.groupPhotoCard}>
        <img
          src="/assets/photos/profile-pengurus-2026-v1.jpg"
          alt={`Pengurus LDF An-Nahl FKH USK periode ${ACTIVE_ORG_PERIOD}`}
          className={styles.groupPhoto}
          loading="lazy"
          decoding="async"
        />
        <figcaption className={styles.groupPhotoCaption}>
          <strong>Pengurus LDF An-Nahl FKH USK</strong>
          <span>Periode {ACTIVE_ORG_PERIOD} · Musyawarah Pergantian Pengurus</span>
        </figcaption>
      </figure>

      <section className={styles.structureSection} aria-labelledby="struktur-pengurus">
        <div className={styles.strukturHead}>
          <div className={styles.eyebrow}>Struktur</div>
          <h2 id="struktur-pengurus" className={styles.strukturHeading}>
            {hasPublishedLeadership ? 'Pengurus An-Nahl' : 'Bidang Gerak'}
          </h2>
          <p>
            {hasPublishedLeadership
              ? `Susunan pengurus inti dan bidang kerja periode ${ACTIVE_ORG_PERIOD}.`
              : 'Bidang-bidang yang menjalankan program An-Nahl.'}
          </p>
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
          {hasPublishedLeadership && (
            <div className={styles.leadershipRoster} aria-label="Pengurus inti">
              <div className={styles.leadershipRosterLabel}>Pengurus inti</div>
              {dosenPembina && <LeadershipRow position={dosenPembina} />}
              {ketuaUmum && <LeadershipRow position={ketuaUmum} featured />}
              {intiDuo.map((position) => <LeadershipRow key={position.id} position={position} />)}
            </div>
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
      </section>

      <section className={styles.identitySection} aria-labelledby="identitas-annahl-heading">
        <div className={styles.nameStory}>
          <div className={styles.cardEyebrow}>Asal Nama</div>
          <div className={styles.nameLockup}>
            <div className={styles.maknaArabic} dir="rtl" lang="ar">{quranText('النَّحْل')}</div>
            <h2 id="identitas-annahl-heading">An-Nahl berarti lebah</h2>
          </div>
          <p>
            Nama An-Nahl diambil dari surah ke-16 Al-Qur'an. Lebah dipilih sebagai pengingat agar keberadaan
            organisasi membawa manfaat bagi lingkungan FKH.
          </p>
        </div>

        <div className={styles.workScope}>
          <div className={styles.cardEyebrow}>Fokus Kerja</div>
          <h2>Yang dikerjakan pengurus</h2>
          <ul>
            <li>Mengelola kajian dan syiar di lingkungan FKH.</li>
            <li>Mendampingi pembinaan dan proses belajar anggota.</li>
            <li>Menjaga kegiatan serta pelayanan mushalla.</li>
          </ul>
        </div>
      </section>

      <section className={styles.historySection} aria-labelledby="sejarah-annahl-heading">
        <div className={styles.historyHeading}>
          <div className={styles.eyebrow}>Jejak Awal</div>
          <h2 id="sejarah-annahl-heading" className={styles.historyTitle}>Berawal dari bale-bale kecil</h2>
          <p className={styles.historyDek}>
            Sebelum memiliki mushalla, mahasiswa FKH berkumpul di ruang sederhana untuk salat, mengaji, dan
            menyiapkan kajian.
          </p>
        </div>

        <div className={styles.historyStory}>
          <div className={styles.historyDate} aria-hidden="true">
            <span>Sejak</span>
            <strong>1996</strong>
          </div>
          <div className={styles.historyNarrative}>
            <p>
              An-Nahl tidak lahir dari gedung atau program besar. Sebelum kepengurusan dibentuk pada 1996, sejumlah
              mahasiswa Fakultas Kedokteran Hewan Unsyiah mulai merintis kajian Jumat dan kegiatan dakwah dari
              bale-bale berukuran sekitar 3 × 3,5 meter.
            </p>
            <p>
              Tempat itu dibenahi sedikit demi sedikit hingga menjadi mushalla sekaligus sekretariat. Pada
              <time dateTime="1996-10-13"> 13 Oktober 1996</time>, kepengurusan Mushalla An-Nahl dibentuk.
            </p>
            <p>
              Sejak itu pengurus terus berganti, tetapi pekerjaan yang dijaga tetap sama: menghidupkan mushalla,
              menyiapkan kader, dan menghadirkan dakwah yang dekat dengan kehidupan mahasiswa.
            </p>
            <div className={styles.historySource}>
              Sumber ringkas: buku peringatan <em>5 Tahun An-Nahl</em>, bagian “Kilas Balik” dan “Mukadimah”.
            </div>
          </div>
        </div>

        <ol className={styles.historyTimeline}>
          <li>
            <div className={styles.timelineMeta}>Masa perintisan</div>
            <p>Kajian Jumat mulai dirintis oleh mahasiswa FKH dari ruang yang masih sangat sederhana.</p>
          </li>
          <li>
            <div className={styles.timelineMeta}><time dateTime="1996-10-13">13 Oktober 1996</time></div>
            <p>Kepengurusan Mushalla An-Nahl dibentuk dan kegiatan dakwah mulai dikelola bersama.</p>
          </li>
          <li>
            <div className={styles.timelineMeta}>Sekarang</div>
            <p>An-Nahl bergerak sebagai Lembaga Dakwah Fakultas di FKH Universitas Syiah Kuala.</p>
          </li>
        </ol>
      </section>

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
        <span className={styles.divisionSummaryMark} aria-hidden="true" />
        <span className={styles.divisionSummaryCopy}>
          <strong>{division.name}</strong>
          <small>{peopleCount > 0 ? `${peopleCount} orang` : 'Pengurus belum diisi'}</small>
        </span>
        <span className={styles.divisionSummaryChevron} aria-hidden="true" />
      </summary>
      <div className={styles.mobileDivisionBody}>
        <DivisionColumn division={division} members={members} compact />
      </div>
    </details>
  );
}

function LeadershipRow({ position, featured = false }: { position: OrgPosition; featured?: boolean }) {
  return (
    <div className={`${styles.leadershipRow} ${featured ? styles.leadershipRowFeatured : ''}`}>
      <div className={styles.leadershipRole}>{position.roleTitle}</div>
      <div className={styles.leadershipPerson}>
        {position.photoUrl && <img src={position.photoUrl} alt="" className={styles.leadershipPhoto} />}
        <strong>{position.name}</strong>
      </div>
    </div>
  );
}

/** One division rendered as a vertical subtree: the ketua divisi at the head,
 *  the officer band (wakil/sekretaris/bendahara in canonical order) below it,
 *  then the anggota at the bottom. Subgrid on the parent keeps each band level
 *  across every division column. */
function DivisionColumn({ division, members, compact = false }: DivisionColumnProps & { compact?: boolean }) {
  const color = division.divisionColor ?? '#8FAAF5';
  const ketua = members.find((m) => m.role === 'ketua');
  const officers = OFFICER_ROLES.flatMap((r) => members.filter((m) => m.role === r));
  const anggota = members.filter((m) => m.role === 'anggota').sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className={styles.divisionCol}>
      <div className={styles.divisionHead} style={{ '--div-color': color } as CSSVarStyle}>
        {!compact && (
          <div className={styles.divisionTitleBlock}>
            <span>Bidang</span>
            <h3>{division.name}</h3>
          </div>
        )}
        {division.divisionDesc && <div className={styles.headDesc}>{division.divisionDesc}</div>}
        <div className={styles.divisionLead}>
          {ketua?.photoUrl && <img src={ketua.photoUrl} alt="" className={styles.headPhoto} />}
          <div>
            <div className={styles.headRole}>Ketua bidang</div>
            <div className={styles.headName} style={ketua ? undefined : { opacity: 0.6, fontWeight: 700 }}>
              {ketua ? ketua.name : 'Belum diisi'}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.officerBand}>
        {officers.map((o) => (
          <div key={o.id} className={styles.officerCard}>
            {o.photoUrl ? (
              <img src={o.photoUrl} alt="" className={styles.officerPhoto} />
            ) : null}
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
            ) : null}
            <span className={styles.memberChipName}>{a.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
