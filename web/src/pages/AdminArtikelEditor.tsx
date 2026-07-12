import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import styles from './AdminArtikelEditor.module.css';
import { Button } from '../components/ui';
import ArticleEditor from '../components/editor/ArticleEditor';
import { supabase } from '../lib/supabaseClient';
import { uploadArticleImage } from '../lib/articleImages';
import { parseDocxArticle } from '../lib/docxImport';
import { sanitizeArticleHtml } from '../lib/sanitizeHtml';
import { slugify } from '../lib/slugify';
import { loadJSON, saveJSON, removeKey } from '../lib/storage';
import type { ArticleCategory, ArticleStatus } from '../types';

const CATEGORIES: ArticleCategory[] = ['Islam Veteriner', 'Kisah', 'Renungan'];
const STATUSES: ArticleStatus[] = ['draft', 'published'];
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

interface ArticleDraft {
  title: string;
  slug: string;
  slugTouched: boolean;
  category: ArticleCategory;
  status: ArticleStatus;
  excerpt: string;
  contentHtml: string;
  coverImageUrl: string | null;
  savedAt: number;
}

// `loadJSON` only guards JSON.parse/localStorage failures, not shape — a
// draft written by an older/newer ArticleDraft version (a field renamed
// after this ships) or something else on the origin writing to a colliding
// key would otherwise reach `.trim()` calls on the wrong type and throw
// inside a useEffect with nothing around it to catch it.
function isValidDraftShape(d: unknown): d is ArticleDraft {
  if (!d || typeof d !== 'object') return false;
  const r = d as Record<string, unknown>;
  return (
    typeof r.title === 'string' &&
    typeof r.slug === 'string' &&
    typeof r.slugTouched === 'boolean' &&
    typeof r.category === 'string' && CATEGORIES.includes(r.category as ArticleCategory) &&
    typeof r.status === 'string' && STATUSES.includes(r.status as ArticleStatus) &&
    typeof r.excerpt === 'string' &&
    typeof r.contentHtml === 'string' &&
    (r.coverImageUrl === null || typeof r.coverImageUrl === 'string') &&
    typeof r.savedAt === 'number'
  );
}

function isMeaningfulDraft(d: ArticleDraft): boolean {
  return !!(d.title.trim() || d.excerpt.trim() || d.contentHtml.trim());
}

// A stable id for "Tulis Artikel Baru" (no article id exists yet to key the
// draft by). sessionStorage — not localStorage — so it survives a refresh of
// this tab but two tabs/compose sessions never share one, and thus never
// silently overwrite each other's autosaved draft.
function newArticleSessionId(): string {
  const KEY = 'annahl_article_new_session_id';
  let sid = sessionStorage.getItem(KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(KEY, sid);
  }
  return sid;
}

export default function AdminArtikelEditor() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [category, setCategory] = useState<ArticleCategory>('Islam Veteriner');
  const [status, setStatus] = useState<ArticleStatus>('draft');
  const [excerpt, setExcerpt] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recoveredDraft, setRecoveredDraft] = useState<ArticleDraft | null>(null);
  const [serverUpdatedAt, setServerUpdatedAt] = useState<number | null>(null);

  const draftKey = id ? `annahl_article_draft_${id}` : `annahl_article_draft_new_${newArticleSessionId()}`;

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from('articles')
        .select('title, slug, category, status, excerpt, content_html, cover_image_url, updated_at')
        .eq('id', id)
        .single();
      if (data) {
        setTitle(data.title);
        setSlug(data.slug);
        setSlugTouched(true);
        setCategory(data.category);
        setStatus(data.status);
        setExcerpt(data.excerpt);
        setContentHtml(data.content_html);
        setCoverImageUrl(data.cover_image_url);
        setServerUpdatedAt(new Date(data.updated_at).getTime());
      }
      setLoading(false);
    })();
  }, [id]);

  // Offer to recover an autosaved draft (see the autosave effect below) left
  // behind by a refresh/crash/closed tab before the form was submitted.
  useEffect(() => {
    const raw = loadJSON<unknown>(draftKey, null);
    if (isValidDraftShape(raw) && isMeaningfulDraft(raw)) {
      setRecoveredDraft(raw);
      return;
    }
    // Not a usable draft — most likely a leftover from an older/incompatible
    // version of this shape. Nothing to offer, and nothing worth keeping.
    if (raw !== null) removeKey(draftKey);
    setRecoveredDraft(null);
  }, [draftKey]);

  const restoreDraft = () => {
    if (!recoveredDraft) return;
    setTitle(recoveredDraft.title);
    setSlug(recoveredDraft.slug);
    setSlugTouched(recoveredDraft.slugTouched);
    setCategory(recoveredDraft.category);
    setStatus(recoveredDraft.status);
    setExcerpt(recoveredDraft.excerpt);
    setContentHtml(recoveredDraft.contentHtml);
    setCoverImageUrl(recoveredDraft.coverImageUrl);
    setRecoveredDraft(null);
  };

  const discardDraft = () => {
    removeKey(draftKey);
    setRecoveredDraft(null);
  };

  // Autosave to localStorage as-you-type, debounced, so a refresh/closed tab
  // never loses more than a few hundred ms of work. Paused while server data
  // is still loading or while an unresolved draft banner is showing — either
  // would otherwise overwrite the very data it's trying to protect.
  const autosaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (loading || recoveredDraft) return;
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      const draft: ArticleDraft = { title, slug, slugTouched, category, status, excerpt, contentHtml, coverImageUrl, savedAt: Date.now() };
      if (isMeaningfulDraft(draft)) {
        saveJSON(draftKey, draft);
      }
    }, 600);
    return () => clearTimeout(autosaveTimer.current);
  }, [draftKey, loading, recoveredDraft, title, slug, slugTouched, category, status, excerpt, contentHtml, coverImageUrl]);

  const onTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  };

  const onImportDocx = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError(null);
    try {
      const parsed = await parseDocxArticle(file);
      if (parsed.title) onTitleChange(parsed.title);
      if (parsed.coverImageUrl) setCoverImageUrl(parsed.coverImageUrl);
      setContentHtml(parsed.contentHtml);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Gagal membaca file Word.');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const onCoverChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setError(null);
    try {
      const url = await uploadArticleImage(file);
      setCoverImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah gambar sampul.');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalSlug = slug.trim();
    if (!title.trim() || !finalSlug || !excerpt.trim() || !contentHtml.trim()) {
      setError('Judul, slug, ringkasan, dan isi tulisan wajib diisi.');
      return;
    }
    if (!SLUG_PATTERN.test(finalSlug)) {
      setError('Slug hanya boleh huruf kecil, angka, dan tanda hubung (contoh: judul-tulisan-ini).');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        slug: finalSlug,
        category,
        status,
        excerpt: excerpt.trim(),
        content_html: sanitizeArticleHtml(contentHtml),
        cover_image_url: coverImageUrl,
      };

      const { error: dbError } = isEdit
        ? await supabase.from('articles').update(payload).eq('id', id)
        : await supabase.from('articles').insert(payload);

      if (dbError) {
        setError(dbError.message);
        return;
      }
      removeKey(draftKey);
      navigate('/admin/artikel');
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    removeKey(draftKey);
    navigate('/admin/artikel');
  };

  if (loading) return null;

  // Only meaningful once the server row has actually loaded (isEdit implies
  // `loading` was true until it did) — otherwise this briefly reads `false`
  // for every draft, stale or not, before serverUpdatedAt is populated.
  const draftIsStale = isEdit && serverUpdatedAt !== null && !!recoveredDraft && recoveredDraft.savedAt < serverUpdatedAt;

  return (
    <div className={styles.page}>
      <Link to="/admin/artikel" className={styles.back}>← Kelola Artikel</Link>
      <div className={styles.eyebrow}>Panel Admin</div>
      <h1 className={styles.h1}>{isEdit ? 'Edit Artikel' : 'Tulis Artikel Baru'}</h1>

      {recoveredDraft && (
        <div className={draftIsStale ? styles.draftBannerWarn : styles.draftBanner}>
          <div>
            <div className={styles.draftBannerTitle}>
              {draftIsStale ? 'Draf tersimpan otomatis ini lebih lama dari versi di server' : 'Draf tersimpan otomatis ditemukan'}
            </div>
            <div className={styles.draftBannerHint}>
              {draftIsStale
                ? `Draf ini dari ${new Date(recoveredDraft.savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}, tapi artikel ini sudah disimpan ulang setelah itu (mungkin dari perangkat/tab lain). Memulihkan draf akan menimpa perubahan yang lebih baru itu.`
                : `Tersimpan ${new Date(recoveredDraft.savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} — sepertinya halaman sempat ke-refresh sebelum kamu simpan.`}
            </div>
          </div>
          <div className={styles.draftBannerActions}>
            <Button type="button" variant="primary" size="sm" onClick={restoreDraft}>Pulihkan</Button>
            <Button type="button" variant="secondary" size="sm" onClick={discardDraft}>Buang</Button>
          </div>
        </div>
      )}

      <div className={styles.card}>
        <form className={styles.form} onSubmit={submit}>
          {!isEdit && (
            <div className={styles.importBox}>
              <div className={styles.fieldLabel}>Impor dari Word (.docx) — opsional</div>
              <input type="file" accept=".docx" onChange={onImportDocx} disabled={importing} />
              {importing && <div className={styles.hint}>Membaca dokumen…</div>}
              {importError && <div className={styles.errorText}>{importError}</div>}
              <div className={styles.hint}>
                Judul, gambar sampul, dan isi tulisan di bawah akan terisi otomatis dari dokumen (heading jadi
                subjudul, teks miring/tebal ikut terbawa, gambar diunggah otomatis) — cek dulu hasilnya sebelum
                disimpan. Ringkasan tetap perlu ditulis manual.
              </div>
            </div>
          )}

          <div>
            <div className={styles.fieldLabel}>Judul</div>
            <input className={styles.input} value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="Judul tulisan" />
          </div>

          <div>
            <div className={styles.fieldLabel}>Slug (URL)</div>
            <input
              className={styles.input}
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="judul-tulisan"
            />
          </div>

          <div className={styles.row2}>
            <div>
              <div className={styles.fieldLabel}>Kategori</div>
              <select className={styles.select} value={category} onChange={(e) => setCategory(e.target.value as ArticleCategory)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <div className={styles.fieldLabel}>Status</div>
              <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value as ArticleStatus)}>
                <option value="draft">Draft (belum tampil ke publik)</option>
                <option value="published">Terbit (tampil ke publik)</option>
              </select>
            </div>
          </div>

          <div>
            <div className={styles.fieldLabel}>Gambar Sampul (opsional)</div>
            <input type="file" accept="image/*" onChange={onCoverChange} disabled={uploadingCover} />
            {uploadingCover && <div className={styles.hint}>Mengunggah…</div>}
            {coverImageUrl && <img src={coverImageUrl} alt="" className={styles.coverPreview} />}
          </div>

          <div>
            <div className={styles.fieldLabel}>Ringkasan</div>
            <textarea
              className={styles.textarea}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Ringkasan singkat, tampil di daftar tulisan"
            />
          </div>

          <div>
            <div className={styles.fieldLabel}>Isi Tulisan</div>
            <ArticleEditor contentHtml={contentHtml} onChange={setContentHtml} />
          </div>

          {error && <div className={styles.errorText}>{error}</div>}

          <div className={styles.submitRow}>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Simpan Artikel'}
            </Button>
            <Button type="button" variant="secondary" onClick={cancel}>
              Batal
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
