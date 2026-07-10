import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import styles from './AdminStruktur.module.css';
import { GlassCard } from '../components/ui';
import { supabase } from '../lib/supabaseClient';
import { deleteOrgPhotoByUrl, uploadOrgPhoto } from '../lib/orgPhotos';
import type { OrgPosition, OrgPositionKey } from '../types';

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

const CORE_KEYS: OrgPositionKey[] = ['dosen_pembina', 'ketua_umum', 'sekretaris_umum', 'bendahara_umum'];
const CORE_LABELS: Record<OrgPositionKey, string> = {
  dosen_pembina: 'Dosen Pembina',
  ketua_umum: 'Ketua Umum',
  sekretaris_umum: 'Sekretaris Umum',
  bendahara_umum: 'Bendahara Umum',
};

export default function AdminStruktur() {
  const [positions, setPositions] = useState<OrgPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('org_positions')
      .select('id, position_key, tier, name, role_title, division_desc, division_color, photo_url, sort_order, created_at')
      .order('tier', { ascending: true })
      .order('sort_order', { ascending: true });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setPositions(((data as OrgPositionRow[] | null) ?? []).map(toOrgPosition));
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
              <DivisiCard key={p.id} position={p} onSaved={load} onDeleted={load} />
            ))}
          </div>
          <AddDivisiForm nextSortOrder={divisiList.length} onAdded={load} />
        </>
      )}
    </div>
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
  onSaved: () => void;
  onDeleted: () => void;
}

function DivisiCard({ position, onSaved, onDeleted }: DivisiCardProps) {
  const [name, setName] = useState(position.name);
  const [desc, setDesc] = useState(position.divisionDesc ?? '');
  const [color, setColor] = useState(position.divisionColor ?? '#8FAAF5');
  const [photoUrl, setPhotoUrl] = useState(position.photoUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(position.name);
    setDesc(position.divisionDesc ?? '');
    setColor(position.divisionColor ?? '#8FAAF5');
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
    if (!window.confirm(`Hapus divisi "${position.name}"?`)) return;
    setError(null);
    const { error: err } = await supabase.from('org_positions').delete().eq('id', position.id);
    if (err) {
      setError(err.message);
      return;
    }
    // Best-effort: drop the uploaded photo so it doesn't orphan in storage.
    await deleteOrgPhotoByUrl(position.photoUrl);
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
    </GlassCard>
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
