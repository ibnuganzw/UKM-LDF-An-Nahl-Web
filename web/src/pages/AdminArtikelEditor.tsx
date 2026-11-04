import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import styles from './AdminArtikelEditor.module.css';
import { Button } from '../components/ui';
import ArticleEditor from '../components/editor/ArticleEditor';
import { ArticlePreviewDialog } from '../components/article/ArticlePreviewDialog';
import { supabase } from '../lib/supabaseClient';
import { uploadArticleImage } from '../lib/articleImages';
import { parseDocxArticle } from '../lib/docxImport';
import type { DocxImportPreview } from '../lib/docxImport';
import { assessArticlePublication, EDITORIAL_BLOCKS, parseTopicsInput } from '../lib/articleEditorial';
import {
  ARTICLE_EDITORIAL_COLUMNS,
  ARTICLE_LEGACY_COLUMNS,
  isEditorialSchemaUnavailable,
} from '../lib/articleSchema';
import { sanitizeArticleHtml } from '../lib/sanitizeHtml';
import { buildArticlePreview } from '../lib/articlePreview';
import { slugify } from '../lib/slugify';
import { loadJSON, saveJSON, removeKey } from '../lib/storage';
import type { ArticleCategory, ArticleReviewStatus, ArticleStatus } from '../types';

const CATEGORIES: ArticleCategory[] = ['Islam Veteriner', 'Kisah', 'Renungan'];
const STATUSES: ArticleStatus[] = ['draft', 'published'];
const REVIEW_STATUSES: ArticleReviewStatus[] = ['unreviewed', 'in_review', 'reviewed'];
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

interface ArticleDraft {
  title: string;
  slug: string;
  slugTouched: boolean;
  category: ArticleCategory;
  status: ArticleStatus;
  excerpt: string;
  dek: string;
  topicsInput: string;
  contentHtml: string;
  coverImageUrl: string | null;
  coverImageAlt: string;
  coverImageCaption: string;
  authorName: string;
  authorRole: string;
  scientificReviewerName: string;
  scientificReviewerRole: string;
  shariaReviewerName: string;
  shariaReviewerRole: string;
  reviewStatus: ArticleReviewStatus;
  verificationSummary: string;
  isFeatured: boolean;
  savedAt: number;
}

interface EditorArticleRow {
  title: string;
  slug: string;
  category: ArticleCategory;
  status: ArticleStatus;
  excerpt: string;
  content_html: string;
  cover_image_url: string | null;
  updated_at: string;
  dek?: string | null;
  topics?: string[] | null;
  cover_image_alt?: string | null;
  cover_image_caption?: string | null;
  author_name?: string | null;
  author_role?: string | null;
  scientific_reviewer_name?: string | null;
  scientific_reviewer_role?: string | null;
  sharia_reviewer_name?: string | null;
  sharia_reviewer_role?: string | null;
  review_status?: ArticleReviewStatus | null;
  verification_summary?: string | null;
  is_featured?: boolean | null;
}

// `loadJSON` only guards JSON.parse/localStorage failures, not shape — a
// draft written by an older/newer ArticleDraft version (a field renamed
// after this ships) or something else on the origin writing to a colliding
// key would otherwise reach `.trim()` calls on the wrong type and throw
// inside a useEffect with nothing around it to catch it.
function normalizeDraft(d: unknown): ArticleDraft | null {
  if (!d || typeof d !== 'object') return null;
  const r = d as Record<string, unknown>;
  const validLegacyShape = (
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
  if (!validLegacyShape) return null;

  const reviewStatus = typeof r.reviewStatus === 'string' && REVIEW_STATUSES.includes(r.reviewStatus as ArticleReviewStatus)
    ? r.reviewStatus as ArticleReviewStatus
    : 'unreviewed';

  return {
    title: r.title as string,
    slug: r.slug as string,
    slugTouched: r.slugTouched as boolean,
    category: r.category as ArticleCategory,
    status: r.status as ArticleStatus,
    excerpt: r.excerpt as string,
    dek: typeof r.dek === 'string' ? r.dek : '',
    topicsInput: typeof r.topicsInput === 'string' ? r.topicsInput : '',
    contentHtml: r.contentHtml as string,
    coverImageUrl: r.coverImageUrl as string | null,
    coverImageAlt: typeof r.coverImageAlt === 'string' ? r.coverImageAlt : '',
    coverImageCaption: typeof r.coverImageCaption === 'string' ? r.coverImageCaption : '',
    authorName: typeof r.authorName === 'string' ? r.authorName : 'Tim Media An-Nahl',
    authorRole: typeof r.authorRole === 'string' ? r.authorRole : 'Tim Media LDF An-Nahl',
    scientificReviewerName: typeof r.scientificReviewerName === 'string' ? r.scientificReviewerName : '',
    scientificReviewerRole: typeof r.scientificReviewerRole === 'string' ? r.scientificReviewerRole : '',
    shariaReviewerName: typeof r.shariaReviewerName === 'string' ? r.shariaReviewerName : '',
    shariaReviewerRole: typeof r.shariaReviewerRole === 'string' ? r.shariaReviewerRole : '',
    reviewStatus,
    verificationSummary: typeof r.verificationSummary === 'string' ? r.verificationSummary : '',
    isFeatured: typeof r.isFeatured === 'boolean' ? r.isFeatured : false,
    savedAt: r.savedAt as number,
  };
}

function isMeaningfulDraft(d: ArticleDraft): boolean {
  return !!(d.title.trim() || d.excerpt.trim() || d.dek.trim() || d.contentHtml.trim());
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
  const [dek, setDek] = useState('');
  const [topicsInput, setTopicsInput] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverImageAlt, setCoverImageAlt] = useState('');
  const [coverImageCaption, setCoverImageCaption] = useState('');
  const [authorName, setAuthorName] = useState('Tim Media An-Nahl');
  const [authorRole, setAuthorRole] = useState('Tim Media LDF An-Nahl');
  const [scientificReviewerName, setScientificReviewerName] = useState('');
  const [scientificReviewerRole, setScientificReviewerRole] = useState('');
  const [shariaReviewerName, setShariaReviewerName] = useState('');
  const [shariaReviewerRole, setShariaReviewerRole] = useState('');
  const [reviewStatus, setReviewStatus] = useState<ArticleReviewStatus>('unreviewed');
  const [verificationSummary, setVerificationSummary] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [editorialSchemaReady, setEditorialSchemaReady] = useState<boolean | null>(null);
  const [firstImageAsCover, setFirstImageAsCover] = useState(true);
  const [docxPreview, setDocxPreview] = useState<DocxImportPreview | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recoveredDraft, setRecoveredDraft] = useState<ArticleDraft | null>(null);
  const [serverUpdatedAt, setServerUpdatedAt] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const draftKey = id ? `annahl_article_draft_${id}` : `annahl_article_draft_new_${newArticleSessionId()}`;

  useEffect(() => {
    if (!id) {
      void (async () => {
        const { error: schemaError } = await supabase
          .from('articles')
          .select('id, review_status')
          .limit(1);
        setEditorialSchemaReady(!isEditorialSchemaUnavailable(schemaError));
      })();
      return;
    }
    (async () => {
      const editorialResult = await supabase
        .from('articles')
        .select(ARTICLE_EDITORIAL_COLUMNS)
        .eq('id', id)
        .single();
      let data = editorialResult.data as EditorArticleRow | null;
      let queryError = editorialResult.error;
      let schemaReady = true;
      if (isEditorialSchemaUnavailable(queryError)) {
        schemaReady = false;
        const fallback = await supabase
          .from('articles')
          .select(ARTICLE_LEGACY_COLUMNS)
          .eq('id', id)
          .single();
        data = fallback.data as EditorArticleRow | null;
        queryError = fallback.error;
      }
      setEditorialSchemaReady(schemaReady);
      if (queryError) {
        setError('Artikel belum dapat dimuat. Coba muat ulang halaman.');
        setLoading(false);
        return;
      }
      if (data) {
        setTitle(data.title);
        setSlug(data.slug);
        setSlugTouched(true);
        setCategory(data.category);
        setStatus(data.status);
        setExcerpt(data.excerpt);
        setDek(data.dek ?? '');
        setTopicsInput((data.topics ?? []).join(', '));
        setContentHtml(data.content_html);
        setCoverImageUrl(data.cover_image_url);
        setCoverImageAlt(data.cover_image_alt ?? '');
        setCoverImageCaption(data.cover_image_caption ?? '');
        setAuthorName(data.author_name ?? 'Tim Media An-Nahl');
        setAuthorRole(data.author_role ?? 'Tim Media LDF An-Nahl');
        setScientificReviewerName(data.scientific_reviewer_name ?? '');
        setScientificReviewerRole(data.scientific_reviewer_role ?? '');
        setShariaReviewerName(data.sharia_reviewer_name ?? '');
        setShariaReviewerRole(data.sharia_reviewer_role ?? '');
        setReviewStatus(data.review_status ?? 'unreviewed');
        setVerificationSummary(data.verification_summary ?? '');
        setIsFeatured(data.is_featured ?? false);
        setServerUpdatedAt(new Date(data.updated_at).getTime());
      }
      setLoading(false);
    })();
  }, [id]);

  // Offer to recover an autosaved draft (see the autosave effect below) left
  // behind by a refresh/crash/closed tab before the form was submitted.
  useEffect(() => {
    const raw = loadJSON<unknown>(draftKey, null);
    const draft = normalizeDraft(raw);
    if (draft && isMeaningfulDraft(draft)) {
      setRecoveredDraft(draft);
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
    setDek(recoveredDraft.dek);
    setTopicsInput(recoveredDraft.topicsInput);
    setContentHtml(recoveredDraft.contentHtml);
    setCoverImageUrl(recoveredDraft.coverImageUrl);
    setCoverImageAlt(recoveredDraft.coverImageAlt);
    setCoverImageCaption(recoveredDraft.coverImageCaption);
    setAuthorName(recoveredDraft.authorName);
    setAuthorRole(recoveredDraft.authorRole);
    setScientificReviewerName(recoveredDraft.scientificReviewerName);
    setScientificReviewerRole(recoveredDraft.scientificReviewerRole);
    setShariaReviewerName(recoveredDraft.shariaReviewerName);
    setShariaReviewerRole(recoveredDraft.shariaReviewerRole);
    setReviewStatus(recoveredDraft.reviewStatus);
    setVerificationSummary(recoveredDraft.verificationSummary);
    setIsFeatured(recoveredDraft.isFeatured);
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
      const draft: ArticleDraft = {
        title,
        slug,
        slugTouched,
        category,
        status,
        excerpt,
        dek,
        topicsInput,
        contentHtml,
        coverImageUrl,
        coverImageAlt,
        coverImageCaption,
        authorName,
        authorRole,
        scientificReviewerName,
        scientificReviewerRole,
        shariaReviewerName,
        shariaReviewerRole,
        reviewStatus,
        verificationSummary,
        isFeatured,
        savedAt: Date.now(),
      };
      if (isMeaningfulDraft(draft)) {
        saveJSON(draftKey, draft);
      }
    }, 600);
    return () => clearTimeout(autosaveTimer.current);
  }, [draftKey, loading, recoveredDraft, title, slug, slugTouched, category, status, excerpt, dek, topicsInput, contentHtml, coverImageUrl, coverImageAlt, coverImageCaption, authorName, authorRole, scientificReviewerName, scientificReviewerRole, shariaReviewerName, shariaReviewerRole, reviewStatus, verificationSummary, isFeatured]);

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
      const parsed = await parseDocxArticle(file, { firstImageAsCover });
      if (parsed.title) onTitleChange(parsed.title);
      if (parsed.coverImageUrl) setCoverImageUrl(parsed.coverImageUrl);
      setContentHtml(parsed.contentHtml);
      setDocxPreview(parsed.preview);
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

    const publication = assessArticlePublication({
      category,
      status,
      reviewStatus,
      scientificReviewerName,
      shariaReviewerName,
    });
    if (!publication.allowed) {
      setError(publication.reason);
      return;
    }
    if (status === 'published' && category === 'Islam Veteriner' && editorialSchemaReady !== true) {
      setError('Migrasi metadata editorial harus diterapkan sebelum tulisan Islam Veteriner dapat diterbitkan.');
      return;
    }
    if (editorialSchemaReady === true && coverImageUrl && !coverImageAlt.trim()) {
      setError('Teks alternatif sampul wajib diisi agar gambar dapat dipahami pembaca dengan pembaca layar.');
      return;
    }

    setSubmitting(true);
    try {
      const legacyPayload = {
        title: title.trim(),
        slug: finalSlug,
        category,
        status,
        excerpt: excerpt.trim(),
        content_html: sanitizeArticleHtml(contentHtml),
        cover_image_url: coverImageUrl,
      };

      const editorialPayload = {
        ...legacyPayload,
        dek: dek.trim(),
        topics: parseTopicsInput(topicsInput),
        cover_image_alt: coverImageAlt.trim(),
        cover_image_caption: coverImageCaption.trim() || null,
        author_name: authorName.trim() || 'Tim Media An-Nahl',
        author_role: authorRole.trim() || 'Tim Media LDF An-Nahl',
        scientific_reviewer_name: scientificReviewerName.trim() || null,
        scientific_reviewer_role: scientificReviewerRole.trim() || null,
        sharia_reviewer_name: shariaReviewerName.trim() || null,
        sharia_reviewer_role: shariaReviewerRole.trim() || null,
        review_status: reviewStatus,
        verification_summary: verificationSummary.trim() || null,
        is_featured: isFeatured,
      };

      const payload = editorialSchemaReady === true ? editorialPayload : legacyPayload;

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
  const editorialDisabled = editorialSchemaReady !== true;
  const previewArticle = buildArticlePreview({
    slug,
    category,
    status,
    title,
    excerpt,
    dek,
    topicsInput,
    contentHtml,
    coverImageUrl,
    coverImageAlt,
    coverImageCaption,
    authorName,
    authorRole,
    scientificReviewerName,
    scientificReviewerRole,
    shariaReviewerName,
    shariaReviewerRole,
    reviewStatus,
    verificationSummary,
    isFeatured,
  });

  return (
    <div className={styles.page}>
      <Link to="/admin/artikel" className={styles.back}>← Kelola Artikel</Link>
      <div className={styles.eyebrow}>Panel Admin</div>
      <h1 className={styles.h1}>{isEdit ? 'Edit Artikel' : 'Tulis Artikel Baru'}</h1>

      {editorialSchemaReady === false && (
        <div className={styles.schemaWarning} role="status">
          <strong>Metadata editorial belum aktif di database.</strong>
          <span>
            Terapkan migrasi fase 9 agar penelaah, status verifikasi, topik, dan featured dapat disimpan.
            Draf dasar tetap bisa disimpan, tetapi artikel Islam Veteriner tidak dapat diterbitkan tanpa lapisan ini.
          </span>
        </div>
      )}

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
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={firstImageAsCover}
                  onChange={(event) => setFirstImageAsCover(event.target.checked)}
                  disabled={importing}
                />
                Jadikan gambar pertama sebagai sampul
              </label>
              <input type="file" accept=".docx" onChange={onImportDocx} disabled={importing} />
              {importing && <div className={styles.hint}>Membaca dokumen…</div>}
              {importError && <div className={styles.errorText}>{importError}</div>}
              <div className={styles.hint}>
                Judul, gambar sampul, dan isi tulisan di bawah akan terisi otomatis dari dokumen (heading jadi
                subjudul, teks miring/tebal ikut terbawa, gambar diunggah otomatis) — cek dulu hasilnya sebelum
                disimpan. Ringkasan tetap perlu ditulis manual.
              </div>
              {docxPreview && (
                <div className={styles.importPreview} aria-live="polite">
                  <div className={styles.previewTitle}>Pratinjau keputusan impor</div>
                  <div className={styles.previewGrid}>
                    <span>Judul</span>
                    <strong>{docxPreview.titleSource === 'document-title' ? 'Terdeteksi dari style Title/Heading 1' : 'Belum terdeteksi'}</strong>
                    <span>Gambar</span>
                    <strong>{docxPreview.imageCount} gambar · {docxPreview.coverStrategy === 'first-image' ? 'gambar pertama jadi sampul' : 'semua tetap di isi'}</strong>
                    <span>Blok tepercaya</span>
                    <strong>
                      {EDITORIAL_BLOCKS
                        .filter((block) => docxPreview.semanticBlocks[block.kind])
                        .map((block) => `${block.label} (${docxPreview.semanticBlocks[block.kind]})`)
                        .join(', ') || 'Tidak ada heading yang dipetakan otomatis'}
                    </strong>
                  </div>
                  {docxPreview.titleSource === 'none' && docxPreview.titleCandidates.length > 0 && (
                    <div className={styles.titleCandidates}>
                      <span>Pilih kandidat judul:</span>
                      {docxPreview.titleCandidates.map((candidate) => (
                        <button key={candidate} type="button" onClick={() => onTitleChange(candidate)}>{candidate}</button>
                      ))}
                    </div>
                  )}
                  {docxPreview.warnings.length > 0 && (
                    <ul className={styles.importWarnings}>
                      {docxPreview.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}
                    </ul>
                  )}
                </div>
              )}
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

          <fieldset className={styles.editorialPanel} disabled={editorialDisabled}>
            <legend>Identitas & verifikasi editorial</legend>
            <div className={styles.panelIntro}>
              Data ini menjelaskan siapa yang menulis, siapa yang menelaah, dan sejauh apa klaim tulisan telah diperiksa.
            </div>

            <div>
              <div className={styles.fieldLabel}>Dek / pengantar editorial</div>
              <textarea
                className={styles.textarea}
                value={dek}
                onChange={(event) => setDek(event.target.value)}
                placeholder="Satu-dua kalimat yang mempertajam sudut pandang tulisan, tampil tepat di bawah judul"
              />
            </div>

            <div>
              <div className={styles.fieldLabel}>Topik</div>
              <input
                className={styles.input}
                value={topicsInput}
                onChange={(event) => setTopicsInput(event.target.value)}
                placeholder="fikih hewan, zoonosis, etika profesi"
              />
              <div className={styles.hint}>Pisahkan dengan koma, maksimal 8 topik.</div>
            </div>

            <div className={styles.row2}>
              <div>
                <div className={styles.fieldLabel}>Nama penulis</div>
                <input className={styles.input} value={authorName} onChange={(event) => setAuthorName(event.target.value)} />
              </div>
              <div>
                <div className={styles.fieldLabel}>Peran / afiliasi penulis</div>
                <input className={styles.input} value={authorRole} onChange={(event) => setAuthorRole(event.target.value)} />
              </div>
            </div>

            <div className={styles.row2}>
              <div>
                <div className={styles.fieldLabel}>Status penelaahan</div>
                <select className={styles.select} value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as ArticleReviewStatus)}>
                  <option value="unreviewed">Belum ditelaah</option>
                  <option value="in_review">Sedang ditelaah</option>
                  <option value="reviewed">Telah ditelaah</option>
                </select>
              </div>
              <label className={styles.featuredCheck}>
                <input type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} />
                <span><strong>Jadikan tulisan utama</strong><small>Hanya satu artikel terbit yang dapat tampil sebagai featured.</small></span>
              </label>
            </div>

            <div className={styles.row2}>
              <div>
                <div className={styles.fieldLabel}>Penelaah ilmiah</div>
                <input className={styles.input} value={scientificReviewerName} onChange={(event) => setScientificReviewerName(event.target.value)} placeholder="Nama lengkap" />
                <input className={`${styles.input} ${styles.subInput}`} value={scientificReviewerRole} onChange={(event) => setScientificReviewerRole(event.target.value)} placeholder="Keahlian / afiliasi" />
              </div>
              <div>
                <div className={styles.fieldLabel}>Penelaah syariah</div>
                <input className={styles.input} value={shariaReviewerName} onChange={(event) => setShariaReviewerName(event.target.value)} placeholder="Nama lengkap" />
                <input className={`${styles.input} ${styles.subInput}`} value={shariaReviewerRole} onChange={(event) => setShariaReviewerRole(event.target.value)} placeholder="Keahlian / afiliasi" />
              </div>
            </div>

            <div>
              <div className={styles.fieldLabel}>Ringkasan verifikasi</div>
              <textarea
                className={styles.textarea}
                value={verificationSummary}
                onChange={(event) => setVerificationSummary(event.target.value)}
                placeholder="Contoh: Dalil dan rujukan fikih ditelaah; klaim veteriner diperiksa terhadap sumber primer yang tercantum."
              />
            </div>
          </fieldset>

          <div>
            <div className={styles.fieldLabel}>Gambar Sampul (opsional)</div>
            <input type="file" accept="image/*" onChange={onCoverChange} disabled={uploadingCover} />
            {uploadingCover && <div className={styles.hint}>Mengunggah…</div>}
            {coverImageUrl && <img src={coverImageUrl} alt="" className={styles.coverPreview} />}
            {coverImageUrl && (
              <div className={styles.coverMeta}>
                <input
                  className={styles.input}
                  value={coverImageAlt}
                  onChange={(event) => setCoverImageAlt(event.target.value)}
                  placeholder="Teks alternatif sampul (wajib)"
                  disabled={editorialDisabled}
                />
                <input
                  className={styles.input}
                  value={coverImageCaption}
                  onChange={(event) => setCoverImageCaption(event.target.value)}
                  placeholder="Keterangan dan kredit sampul (opsional)"
                  disabled={editorialDisabled}
                />
              </div>
            )}
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
            <Button type="button" variant="secondary" onClick={() => setPreviewOpen(true)}>
              Pratinjau Artikel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Simpan Artikel'}
            </Button>
            <Button type="button" variant="secondary" onClick={cancel}>
              Batal
            </Button>
          </div>
        </form>
      </div>
      {previewOpen && <ArticlePreviewDialog article={previewArticle} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}
