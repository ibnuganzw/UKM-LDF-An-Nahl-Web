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
          <h2 id="sejarah-annahl-heading" className={styles.historyTitle}>Dari bale-bale, An-Nahl bertumbuh</h2>
          <p className={styles.historyDek}>
            Kisahnya dimulai pada pertengahan 1990-an, ketika beberapa mahasiswa FKH berusaha menghadirkan ruang
            salat dan kajian di kampus mereka sendiri.
          </p>
        </div>

        <div className={styles.historyStory}>
          <div className={styles.historyDate} aria-hidden="true">
            <span>Sejak</span>
            <strong>1996</strong>
          </div>
          <div className={styles.historyNarrative}>
            <p className={styles.historyOpening}>
              Saat itu, kegiatan dakwah di FKH belum seramai fakultas lain. Beberapa mahasiswi lebih dahulu menjaga
              kajian Jumat dari pekan ke pekan. Tak lama kemudian, mahasiswa lain ikut berkumpul. Keinginan mereka
              sederhana: memiliki tempat untuk salat, belajar, dan menghidupkan suasana Islam di kampus.
            </p>
            <p>
              Ruang yang tersedia ketika itu hanyalah bale-bale sekitar 3 × 3,5 meter. Tempat tersebut biasa dipakai
              untuk salat dan, menurut catatan lama, kadang menjadi tempat kambing-kambing FKH bermalam. Bale-bale
              itu kemudian dibersihkan dan dibenahi sedikit demi sedikit sampai dapat dipakai sebagai mushalla
              sekaligus sekretariat.
            </p>

            <div className={styles.founderPassage}>
              <div className={styles.historyKicker}>Kepengurusan pertama</div>
              <p>
                Pada <time dateTime="1996-10-13">13 Oktober 1996</time>, Mushalla An-Nahl resmi memiliki
                kepengurusan. Arsip tidak menyebut satu per satu semua mahasiswa yang mula-mula berkumpul, tetapi
                mencatat dua nama pada kepemimpinan pertamanya: <strong>Noma Khairil</strong>, mahasiswa angkatan
                1994, sebagai ketua mushalla; dan <strong>Sri Evi Yarni</strong>, mahasiswa angkatan 1995, sebagai
                ketua keputrian.
              </p>
              <p>
                Kajian Islam Jumatan dan Kajian Islam Sabtuan menjadi kegiatan utama pada masa itu. An-Nahl juga
                mulai menerbitkan majalah dinding sederhana. Dari situlah mushalla kecil ini perlahan mendapat
                tempat dalam kehidupan kampus.
              </p>
            </div>

            <p>
              Dua tahun kemudian, amanah ketua beralih kepada <strong>Wahidin Beruh</strong>, angkatan 1995.
              Kepengurusan keputrian mula-mula dipegang <strong>Tati Meutia Asmara</strong>, lalu diteruskan oleh
              <strong> Rita Salawati</strong>; keduanya dari angkatan 1996. Pada masa inilah mushalla direnovasi dan
              diperluas dengan infak mahasiswa serta dosen, hingga azan mulai berkumandang di lingkungan FKH.
            </p>
            <p>
              Memasuki Februari 2000, musyawarah pergantian pengurus memilih <strong>Indra</strong>, angkatan 1996,
              sebagai ketua dan <strong>Leliana</strong>, angkatan 1997, sebagai wakil. Pembinaan kader mulai lebih
              diperhatikan, perpustakaan mushalla “Abu Hurairah” dibenahi, dan bidang Mahasiswa Pencinta Alam
              An-Nahl dibentuk. Bentuk organisasinya terus berkembang, tetapi kebiasaan yang diwariskan para
              perintis tetap sama: merawat mushalla, belajar bersama, dan menjaga dakwah tetap dekat dengan
              mahasiswa FKH.
            </p>

            <div className={styles.historySource}>
              Sumber ringkas: buku peringatan <em>5 Tahun An-Nahl</em>, bagian “Kilas Balik”, “An-Nahl dari Waktu ke
              Waktu”, dan “Mukadimah”. Ejaan nama mengikuti arsip.
            </div>
          </div>
        </div>
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
