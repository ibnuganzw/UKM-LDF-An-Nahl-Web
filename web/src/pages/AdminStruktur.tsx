import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import styles from './AdminStruktur.module.css';
import { GlassCard } from '../components/ui';
import { supabase } from '../lib/supabaseClient';
import { deleteOrgPhotoByUrl, uploadOrgPhoto } from '../lib/orgPhotos';
import {
  parseOrgStructureDocx,
  validateOrgStructureImport,
  type ImportedDivision,
  type ImportedDivisionMember,
  type OrgStructureImportDraft,
} from '../lib/orgStructureImport';
import { toDivisionMember } from '../hooks/useOrgPositions';
import { DIVISION_ROLES, DIVISION_ROLE_LABELS, ROLE_ORDER } from '../lib/divisionRoles';
import type { DivisionMember, DivisionRole, OrgPosition, OrgPositionKey } from '../types';

interface OrgPositionRow {
  id: string;
  position_key: OrgPositionKey | null;
  tier: number;
  name: string;
  role_title: string | null;
  division_desc: string | null;
  division_color: string | null;
  photo_url: string | null;
  sort_order: number;
  created_at: string;
}

interface DivisionMemberRow {
  id: string;
  division_id: string;
  name: string;
  role: DivisionRole;
  photo_url: string | null;
  sort_order: number;
  created_at: string;
}

function toOrgPosition(row: OrgPositionRow): OrgPosition {
  return {
    id: row.id,
    positionKey: row.position_key,
    tier: row.tier,
    name: row.name,
    roleTitle: row.role_title,
    divisionDesc: row.division_desc,
    divisionColor: row.division_color,
    photoUrl: row.photo_url,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

/** The DB rejects a second ketua/wakil/sekretaris/bendahara in one division via
 *  the partial unique index; turn that raw message into something an admin can
 *  act on. */
function friendlyMemberError(message: string, role: DivisionRole): string {
  if (message.includes('division_members_one_officer_per_role')) {
    return `Divisi ini sudah punya ${DIVISION_ROLE_LABELS[role]}. Ubah yang lama dulu atau pilih jabatan lain.`;
  }
  return message;
}

const CORE_KEYS: OrgPositionKey[] = ['dosen_pembina', 'ketua_umum', 'sekretaris_umum', 'bendahara_umum'];
const CORE_LABELS: Record<OrgPositionKey, string> = {
  dosen_pembina: 'Dosen Pembina',
  ketua_umum: 'Ketua Umum',
  sekretaris_umum: 'Sekretaris Umum',
  bendahara_umum: 'Bendahara Umum',
};

export default function AdminStruktur() {
  const [positions, setPositions] = useState<OrgPosition[]>([]);
  const [members, setMembers] = useState<DivisionMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: posData, error: posErr }, { data: memberData }] = await Promise.all([
      supabase
        .from('org_positions')
        .select('id, position_key, tier, name, role_title, division_desc, division_color, photo_url, sort_order, created_at')
        .order('tier', { ascending: true })
        .order('sort_order', { ascending: true }),
      supabase
        .from('division_members')
        .select('id, division_id, name, role, photo_url, sort_order, created_at')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
    ]);
    if (posErr) {
      setError(posErr.message);
      setLoading(false);
      return;
    }
    setPositions(((posData as OrgPositionRow[] | null) ?? []).map(toOrgPosition));
    setMembers(((memberData as DivisionMemberRow[] | null) ?? []).map(toDivisionMember));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const divisiList = positions.filter((p) => p.positionKey === null);

  return (
    <div className={styles.page}>
      <Link to="/admin" className={styles.back}>← Panel admin</Link>
      <div className={styles.eyebrow}>Panel Admin</div>
      <h1 className={styles.h1}>Kelola Struktur Organisasi</h1>

      {error && <div className={styles.error}>{error}</div>}
      {loading && <div className={styles.loading}>Memuat…</div>}

      {!loading && (
        <>
          <StructureDocxImport onApplied={load} />

          <div className={styles.subHeading}>Posisi Inti</div>
          <div className={styles.list}>
            {CORE_KEYS.map((key) => {
              const p = positions.find((pos) => pos.positionKey === key);
              if (!p) return null;
              return <CorePositionCard key={key} position={p} label={CORE_LABELS[key]} onSaved={load} />;
            })}
          </div>

          <div className={styles.subHeading}>Divisi</div>
          <div className={styles.list}>
            {divisiList.length === 0 && <div className={styles.empty}>Belum ada divisi.</div>}
            {divisiList.map((p) => (
              <DivisiCard
                key={p.id}
                position={p}
                members={members.filter((m) => m.divisionId === p.id)}
                onSaved={load}
                onDeleted={load}
              />
            ))}
          </div>
          <AddDivisiForm nextSortOrder={divisiList.length} onAdded={load} />
        </>
      )}
    </div>
  );
}

function StructureDocxImport({ onApplied }: { onApplied: () => void }) {
  const [draft, setDraft] = useState<OrgStructureImportDraft | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const issues = useMemo(() => draft ? validateOrgStructureImport(draft) : [], [draft]);
  const hasBlocker = issues.some((issue) => issue.level === 'error');

  const updateDivision = (divisionIndex: number, patch: Partial<ImportedDivision>) => {
    setDraft((current) => current && {
      ...current,
      divisions: current.divisions.map((division, index) => index === divisionIndex ? { ...division, ...patch } : division),
    });
  };

  const updateMember = (divisionIndex: number, memberIndex: number, patch: Partial<ImportedDivisionMember>) => {
    setDraft((current) => current && {
      ...current,
      divisions: current.divisions.map((division, index) => index !== divisionIndex ? division : {
        ...division,
        members: division.members.map((member, itemIndex) => itemIndex === memberIndex ? { ...member, ...patch } : member),
      }),
    });
  };

  const parseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setParsing(true);
    setError(null);
    try {
      setDraft(await parseOrgStructureDocx(file));
      setFileName(file.name);
    } catch (err) {
      setDraft(null);
      setFileName(null);
      setError(err instanceof Error ? err.message : 'Dokumen belum dapat dianalisis.');
    } finally {
      setParsing(false);
    }
  };

  const apply = async () => {
    if (!draft || hasBlocker) return;
    const confirmed = window.confirm(
      'Terapkan susunan hasil tinjauan ini? Divisi dan anggota yang tidak ada di dokumen akan dihapus dari struktur publik. Posisi inti yang tidak terdeteksi tetap dibiarkan seperti sekarang.',
    );
    if (!confirmed) return;

    const core = CORE_KEYS.reduce<Record<string, { name: string; role_title: string }>>((result, key) => {
      const position = draft.core[key];
      if (position) result[key] = { name: position.name.trim(), role_title: position.roleTitle };
      return result;
    }, {});
    const divisions = draft.divisions.map((division, divisionIndex) => ({
      name: division.name.trim(),
      description: division.description.trim(),
      color: division.color,
      members: division.members.map((member, memberIndex) => ({
        name: member.name.trim(),
        role: member.role,
        sort_order: memberIndex,
      })),
      sort_order: divisionIndex,
    }));

    setApplying(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('apply_org_structure_import', {
        p_core: core,
        p_divisions: divisions,
      });
      if (rpcError) throw rpcError;

      // The database returns former photo URLs only after its atomic change has
      // succeeded. Storage cleanup is deliberately best-effort: a stale file is
      // safer than risking a failed structural import because a photo vanished.
      const oldPhotoUrls = Array.isArray(data) ? data.filter((url): url is string => typeof url === 'string') : [];
      await Promise.all(oldPhotoUrls.map((url) => deleteOrgPhotoByUrl(url)));

      setDraft(null);
      setFileName(null);
      onApplied();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Struktur belum dapat diterapkan.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <section className={styles.importCard} aria-labelledby="org-docx-import-heading">
      <div className={styles.importEyebrow}>Impor terarah</div>
      <h2 id="org-docx-import-heading" className={styles.importTitle}>Susun dari dokumen Word</h2>
      <p className={styles.importLead}>
        Unggah .docx kepengurusan. Sistem membaca kandidat jabatan, divisi, dan anggota; kamu tetap meninjau hasilnya sebelum bagan publik berubah.
      </p>
      <label className={styles.importFileButton}>
        <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={parseFile} disabled={parsing || applying} />
        {parsing ? 'Menganalisis dokumen…' : 'Pilih dokumen Word (.docx)'}
      </label>
      {fileName && <div className={styles.importFileName}>Dianalisis: {fileName}</div>}
      {error && <div className={styles.errorText}>{error}</div>}

      {draft && (
        <div className={styles.importPreview}>
          <div className={styles.importNotice}>
            Dokumen tidak menyimpan foto. Saat diterapkan, divisi dan daftar anggota akan diselaraskan terhadap preview ini; posisi inti yang tidak tertulis tetap dipertahankan.
          </div>

          {draft.warnings.map((warning) => <div className={styles.importWarning} key={warning}>{warning}</div>)}
          {issues.map((issue) => (
            <div className={issue.level === 'error' ? styles.importProblem : styles.importWarning} key={issue.message}>
              {issue.message}
            </div>
          ))}

          {CORE_KEYS.some((key) => draft.core[key]) && (
            <div className={styles.importSection}>
              <div className={styles.cardLabel}>Posisi inti terdeteksi</div>
              <div className={styles.importCoreGrid}>
                {CORE_KEYS.map((key) => {
                  const position = draft.core[key];
                  if (!position) return null;
                  return (
                    <label key={key}>
                      <span className={styles.fieldLabel}>{CORE_LABELS[key]}</span>
                      <input
                        className={styles.input}
                        value={position.name}
                        onChange={(event) => setDraft((current) => current && {
                          ...current,
                          core: { ...current.core, [key]: { ...position, name: event.target.value } },
                        })}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className={styles.importSection}>
            <div className={styles.importSectionRow}>
              <div className={styles.cardLabel}>Bagan hasil analisis</div>
              <button
                type="button"
                className={styles.importMinorButton}
                onClick={() => setDraft((current) => current && {
                  ...current,
                  divisions: [...current.divisions, {
                    name: 'Divisi Baru',
                    description: 'Struktur dan kepengurusan Divisi Baru.',
                    color: '#8FAAF5',
                    members: [],
                  }],
                })}
              >
                + Divisi
              </button>
            </div>

            <div className={styles.importDivisions}>
              {draft.divisions.map((division, divisionIndex) => (
                <div className={styles.importDivision} key={`${division.name}-${divisionIndex}`}>
                  <div className={styles.importDivisionTop}>
                    <label className={styles.importGrow}>
                      <span className={styles.fieldLabel}>Nama divisi</span>
                      <input className={styles.input} value={division.name} onChange={(event) => updateDivision(divisionIndex, { name: event.target.value })} />
                    </label>
                    <label>
                      <span className={styles.fieldLabel}>Warna</span>
                      <input type="color" className={styles.colorInput} value={division.color} onChange={(event) => updateDivision(divisionIndex, { color: event.target.value })} />
                    </label>
                    <button
                      type="button"
                      className={styles.importRemoveButton}
                      onClick={() => setDraft((current) => current && ({
                        ...current,
                        divisions: current.divisions.filter((_, index) => index !== divisionIndex),
                      }))}
                    >
                      Hapus
                    </button>
                  </div>
                  <label>
                    <span className={styles.fieldLabel}>Deskripsi publik</span>
                    <input className={styles.input} value={division.description} onChange={(event) => updateDivision(divisionIndex, { description: event.target.value })} />
                  </label>

                  <div className={styles.importMembers}>
                    {division.members.map((member, memberIndex) => (
                      <div className={styles.importMember} key={`${member.name}-${memberIndex}`}>
                        <select className={styles.select} value={member.role} onChange={(event) => updateMember(divisionIndex, memberIndex, { role: event.target.value as DivisionRole })}>
                          {DIVISION_ROLES.map((role) => <option key={role} value={role}>{DIVISION_ROLE_LABELS[role]}</option>)}
                        </select>
                        <input className={styles.input} value={member.name} aria-label={`Nama pada ${division.name}`} onChange={(event) => updateMember(divisionIndex, memberIndex, { name: event.target.value })} />
                        <button
                          type="button"
                          className={styles.importRemoveButton}
                          aria-label={`Hapus ${member.name}`}
                          onClick={() => updateDivision(divisionIndex, { members: division.members.filter((_, index) => index !== memberIndex) })}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className={styles.importMinorButton}
                      onClick={() => updateDivision(divisionIndex, { members: [...division.members, { name: '', role: 'anggota' }] })}
                    >
                      + Orang
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button type="button" className={styles.importApplyButton} disabled={hasBlocker || applying} onClick={apply}>
            {applying ? 'Menerapkan struktur…' : 'Terapkan susunan ke bagan publik'}
          </button>
        </div>
      )}
    </section>
  );
}

interface CorePositionCardProps {
  position: OrgPosition;
  label: string;
  onSaved: () => void;
}

function CorePositionCard({ position, label, onSaved }: CorePositionCardProps) {
  const [name, setName] = useState(position.name);
  const [roleTitle, setRoleTitle] = useState(position.roleTitle ?? '');
  const [photoUrl, setPhotoUrl] = useState(position.photoUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(position.name);
    setRoleTitle(position.roleTitle ?? '');
    setPhotoUrl(position.photoUrl);
  }, [position]);

  const onPhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setPhotoUrl(await uploadOrgPhoto(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah foto.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const save = async () => {
    setError(null);
    if (!name.trim() || !roleTitle.trim()) {
      setError('Nama dan jabatan wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from('org_positions')
        .update({ name: name.trim(), role_title: roleTitle.trim(), photo_url: photoUrl })
        .eq('id', position.id);
      if (err) {
        setError(err.message);
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard radius={20} padding="18px 20px" className={styles.card}>
      <div className={styles.cardLabel}>{label}</div>
      <div className={styles.row}>
        <div className={styles.photoCol}>
          {photoUrl ? (
            <img src={photoUrl} alt="" className={styles.photoPreview} />
          ) : (
            <div className={styles.photoPlaceholder}>{(name.trim().charAt(0) || '?').toUpperCase()}</div>
          )}
          <input type="file" accept="image/*" onChange={onPhotoChange} disabled={uploading} />
          {uploading && <div className={styles.hint}>Mengunggah…</div>}
        </div>
        <div className={styles.fieldsCol}>
          <div>
            <div className={styles.fieldLabel}>Nama</div>
            <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <div className={styles.fieldLabel}>Jabatan</div>
            <input className={styles.input} value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
          </div>
          {error && <div className={styles.errorText}>{error}</div>}
          <button className={styles.saveBtn} disabled={saving} onClick={save}>
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

interface DivisiCardProps {
  position: OrgPosition;
  members: DivisionMember[];
  onSaved: () => void;
  onDeleted: () => void;
}

function DivisiCard({ position, members, onSaved, onDeleted }: DivisiCardProps) {
  const [name, setName] = useState(position.name);
  const [desc, setDesc] = useState(position.divisionDesc ?? '');
  const [color, setColor] = useState(position.divisionColor ?? '#8FAAF5');
  const [photoUrl, setPhotoUrl] = useState(position.photoUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    setName(position.name);
    setDesc(position.divisionDesc ?? '');
    setColor(position.divisionColor ?? '#8FAAF5');
    setPhotoUrl(position.photoUrl);
  }, [position]);

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.sortOrder - b.sortOrder),
    [members],
  );

  const onPhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setPhotoUrl(await uploadOrgPhoto(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah foto.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const save = async () => {
    setError(null);
    if (!name.trim() || !desc.trim()) {
      setError('Nama dan deskripsi wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from('org_positions')
        .update({ name: name.trim(), division_desc: desc.trim(), division_color: color, photo_url: photoUrl })
        .eq('id', position.id);
      if (err) {
        setError(err.message);
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Hapus divisi "${position.name}" beserta seluruh anggotanya?`)) return;
    setError(null);
    const { error: err } = await supabase.from('org_positions').delete().eq('id', position.id);
    if (err) {
      setError(err.message);
      return;
    }
    // Best-effort: drop the division photo plus every member photo so nothing
    // orphans in storage (the rows themselves cascade-delete in the DB).
    await deleteOrgPhotoByUrl(position.photoUrl);
    await Promise.all(members.map((m) => deleteOrgPhotoByUrl(m.photoUrl)));
    onDeleted();
  };

  return (
    <GlassCard radius={20} padding="18px 20px" className={styles.card}>
      <div className={styles.row}>
        <div className={styles.photoCol}>
          {photoUrl ? (
            <img src={photoUrl} alt="" className={styles.photoPreviewSquare} />
          ) : (
            <div className={styles.photoPlaceholderSquare} style={{ background: color }}>
              {(name.trim().charAt(0) || '?').toUpperCase()}
            </div>
          )}
          <input type="file" accept="image/*" onChange={onPhotoChange} disabled={uploading} />
          {uploading && <div className={styles.hint}>Mengunggah…</div>}
        </div>
        <div className={styles.fieldsCol}>
          <div className={styles.row2}>
            <div>
              <div className={styles.fieldLabel}>Nama Divisi</div>
              <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <div className={styles.fieldLabel}>Warna</div>
              <input type="color" className={styles.colorInput} value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
          </div>
          <div>
            <div className={styles.fieldLabel}>Deskripsi</div>
            <textarea className={styles.textarea} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          {error && <div className={styles.errorText}>{error}</div>}
          <div className={styles.btnRow}>
            <button className={styles.saveBtn} disabled={saving} onClick={save}>
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
            <button className={styles.deleteBtn} onClick={remove}>Hapus</button>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={styles.memberToggle}
        aria-expanded={showMembers}
        onClick={() => setShowMembers((v) => !v)}
      >
        <span className={styles.memberToggleChevron} data-open={showMembers}>▸</span>
        Pengurus &amp; Anggota
        <span className={styles.memberCount}>{members.length}</span>
      </button>

      {showMembers && (
        <div className={styles.memberSection}>
          {sortedMembers.length === 0 && (
            <div className={styles.memberEmpty}>Belum ada orang di divisi ini. Tambahkan ketua & anggota di bawah.</div>
          )}
          {sortedMembers.map((m) => (
            <MemberRow key={m.id} member={m} onChanged={onSaved} />
          ))}
          <AddMemberForm divisionId={position.id} nextSortOrder={members.length} onAdded={onSaved} />
        </div>
      )}
    </GlassCard>
  );
}

function MemberRow({ member, onChanged }: { member: DivisionMember; onChanged: () => void }) {
  const [name, setName] = useState(member.name);
  const [role, setRole] = useState<DivisionRole>(member.role);
  const [photoUrl, setPhotoUrl] = useState(member.photoUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(member.name);
    setRole(member.role);
    setPhotoUrl(member.photoUrl);
  }, [member]);

  const onPhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setPhotoUrl(await uploadOrgPhoto(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah foto.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const save = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Nama wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from('division_members')
        .update({ name: name.trim(), role, photo_url: photoUrl })
        .eq('id', member.id);
      if (err) {
        setError(friendlyMemberError(err.message, role));
        return;
      }
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Hapus "${member.name}" dari divisi ini?`)) return;
    setError(null);
    const { error: err } = await supabase.from('division_members').delete().eq('id', member.id);
    if (err) {
      setError(err.message);
      return;
    }
    await deleteOrgPhotoByUrl(member.photoUrl);
    onChanged();
  };

  return (
    <div className={styles.memberRow}>
      <div className={styles.memberPhotoCol}>
        {photoUrl ? (
          <img src={photoUrl} alt="" className={styles.memberPhoto} />
        ) : (
          <div className={styles.memberPhotoPlaceholder}>{(name.trim().charAt(0) || '?').toUpperCase()}</div>
        )}
        <input type="file" accept="image/*" onChange={onPhotoChange} disabled={uploading} />
      </div>
      <div className={styles.memberFields}>
        <div className={styles.memberFieldsRow}>
          <select className={styles.select} value={role} onChange={(e) => setRole(e.target.value as DivisionRole)}>
            {DIVISION_ROLES.map((r) => (
              <option key={r} value={r}>{DIVISION_ROLE_LABELS[r]}</option>
            ))}
          </select>
          <input
            className={styles.input}
            value={name}
            placeholder="Nama lengkap"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        {uploading && <div className={styles.hint}>Mengunggah…</div>}
        {error && <div className={styles.errorText}>{error}</div>}
        <div className={styles.memberBtnRow}>
          <button className={styles.smallSaveBtn} disabled={saving} onClick={save}>
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
          <button className={styles.smallDeleteBtn} onClick={remove}>Hapus</button>
        </div>
      </div>
    </div>
  );
}

function AddMemberForm({
  divisionId,
  nextSortOrder,
  onAdded,
}: {
  divisionId: string;
  nextSortOrder: number;
  onAdded: () => void;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<DivisionRole>('anggota');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Nama wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const { error: err } = await supabase.from('division_members').insert({
        division_id: divisionId,
        name: name.trim(),
        role,
        sort_order: nextSortOrder,
      });
      if (err) {
        setError(friendlyMemberError(err.message, role));
        return;
      }
      setName('');
      setRole('anggota');
      onAdded();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.addMemberRow}>
      <select className={styles.select} value={role} onChange={(e) => setRole(e.target.value as DivisionRole)}>
        {DIVISION_ROLES.map((r) => (
          <option key={r} value={r}>{DIVISION_ROLE_LABELS[r]}</option>
        ))}
      </select>
      <input
        className={styles.input}
        value={name}
        placeholder="Nama orang baru"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
      />
      <button className={styles.smallSaveBtn} disabled={saving} onClick={add}>
        {saving ? '…' : '+ Tambah'}
      </button>
      {error && <div className={styles.addMemberError}>{error}</div>}
    </div>
  );
}

function AddDivisiForm({ nextSortOrder, onAdded }: { nextSortOrder: number; onAdded: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [color, setColor] = useState('#8FAAF5');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    setError(null);
    if (!name.trim() || !desc.trim()) {
      setError('Nama dan deskripsi wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const { error: err } = await supabase.from('org_positions').insert({
        tier: 3,
        name: name.trim(),
        division_desc: desc.trim(),
        division_color: color,
        sort_order: nextSortOrder,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setName('');
      setDesc('');
      setColor('#8FAAF5');
      onAdded();
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard radius={20} padding="18px 20px" className={styles.addCard}>
      <div className={styles.cardLabel}>+ Tambah Divisi Baru</div>
      <div className={styles.row2}>
        <div>
          <div className={styles.fieldLabel}>Nama Divisi</div>
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama divisi" />
        </div>
        <div>
          <div className={styles.fieldLabel}>Warna</div>
          <input type="color" className={styles.colorInput} value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
      </div>
      <div>
        <div className={styles.fieldLabel}>Deskripsi</div>
        <textarea
          className={styles.textarea}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Deskripsi singkat divisi"
        />
      </div>
      {error && <div className={styles.errorText}>{error}</div>}
      <button className={styles.saveBtn} disabled={saving} onClick={add}>
        {saving ? 'Menambah…' : 'Tambah Divisi'}
      </button>
    </GlassCard>
  );
}
