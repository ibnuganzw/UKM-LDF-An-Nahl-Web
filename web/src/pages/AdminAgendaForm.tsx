import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import styles from './AdminAgendaForm.module.css';
import { Button } from '../components/ui';
import { supabase } from '../lib/supabaseClient';
import { AGENDA_FILTERS } from '../lib/filters';
import type { AgendaMode, AgendaType } from '../types';

const AGENDA_TYPES = AGENDA_FILTERS.filter((f): f is AgendaType => f !== 'Semua');

export default function AdminAgendaForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<AgendaType>('Kajian');
  const [mode, setMode] = useState<AgendaMode>('universal');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [pj, setPj] = useState('');
  const [pemateri, setPemateri] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from('agendas')
        .select('title, type, mode, event_date, start_time, end_time, location, pj, pemateri, description')
        .eq('id', id)
        .single();
      if (data) {
        setTitle(data.title);
        setType(data.type);
        setMode(data.mode);
        setEventDate(data.event_date);
        setStartTime(String(data.start_time).slice(0, 5));
        setEndTime(String(data.end_time).slice(0, 5));
        setLocation(data.location);
        setPj(data.pj);
        setPemateri(data.pemateri ?? '');
        setDescription(data.description);
      }
      setLoading(false);
    })();
  }, [id]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !eventDate || !startTime || !endTime || !location.trim() || !pj.trim() || !description.trim()) {
      setError('Semua field wajib diisi kecuali pemateri.');
      return;
    }
    // Times are zero-padded 'HH:MM' (24h) from <input type="time">, so a plain
    // string compare is correct. The check-in window (event_date + end_time + 2h)
    // assumes end is on the same day, so we don't support crossing midnight.
    if (endTime <= startTime) {
      setError('Waktu selesai harus setelah waktu mulai.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        type,
        mode,
        event_date: eventDate,
        start_time: startTime,
        end_time: endTime,
        location: location.trim(),
        pj: pj.trim(),
        pemateri: pemateri.trim() || null,
        description: description.trim(),
      };

      const { error: dbError } = isEdit
        ? await supabase.from('agendas').update(payload).eq('id', id)
        : await supabase.from('agendas').insert(payload);

      if (dbError) {
        setError(dbError.message);
        return;
      }
      navigate('/admin');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className={styles.page}>
      <Link to="/admin" className={styles.back}>← Panel admin</Link>
      <div className={styles.eyebrow}>Panel Admin</div>
      <h1 className={styles.h1}>{isEdit ? 'Edit Agenda' : 'Buat Agenda Baru'}</h1>

      <div className={styles.card}>
        <form className={styles.form} onSubmit={submit}>
          <div>
            <div className={styles.fieldLabel}>Judul</div>
            <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul agenda" />
          </div>

          <div className={styles.row2}>
            <div>
              <div className={styles.fieldLabel}>Jenis</div>
              <select className={styles.select} value={type} onChange={(e) => setType(e.target.value as AgendaType)}>
                {AGENDA_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <div className={styles.fieldLabel}>Mode</div>
              <select className={styles.select} value={mode} onChange={(e) => setMode(e.target.value as AgendaMode)}>
                <option value="universal">Universal (wajib semua anggota aktif)</option>
                <option value="registration">Registrasi (perlu daftar)</option>
              </select>
            </div>
          </div>

          <div className={styles.row3}>
            <div>
              <div className={styles.fieldLabel}>Tanggal</div>
              <input type="date" className={styles.input} value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div>
              <div className={styles.fieldLabel}>Mulai</div>
              <input type="time" className={styles.input} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <div className={styles.fieldLabel}>Selesai</div>
              <input type="time" className={styles.input} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div>
            <div className={styles.fieldLabel}>Lokasi</div>
            <input className={styles.input} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lokasi acara" />
          </div>

          <div className={styles.row2}>
            <div>
              <div className={styles.fieldLabel}>Penanggung Jawab</div>
              <input className={styles.input} value={pj} onChange={(e) => setPj(e.target.value)} placeholder="Nama/jabatan PJ" />
            </div>
            <div>
              <div className={styles.fieldLabel}>Pemateri (opsional)</div>
              <input
                className={styles.input}
                value={pemateri}
                onChange={(e) => setPemateri(e.target.value)}
                placeholder="Kosongkan jika tidak ada"
              />
            </div>
          </div>

          <div>
            <div className={styles.fieldLabel}>Deskripsi</div>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi agenda"
            />
          </div>

          {error && <div className={styles.errorText}>{error}</div>}

          <div className={styles.submitRow}>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Buat Agenda'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/admin')}>
              Batal
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
