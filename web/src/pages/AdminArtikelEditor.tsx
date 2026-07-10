import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import styles from './AdminArtikelEditor.module.css';
import { Button } from '../components/ui';
import ArticleEditor from '../components/editor/ArticleEditor';
import { supabase } from '../lib/supabaseClient';
import { uploadArticleImage } from '../lib/articleImages';
import { parseDocxArticle } from '../lib/docxImport';
import { sanitizeArticleHtml } from '../lib/sanitizeHtml';
import { slugify } from '../lib/slugify';
import type { ArticleCategory, ArticleStatus } from '../types';

const CATEGORIES: ArticleCategory[] = ['Islam Veteriner', 'Kisah', 'Renungan'];
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from('articles')
        .select('title, slug, category, status, excerpt, content_html, cover_image_url')
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
      }
      setLoading(false);
    })();
  }, [id]);

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
      navigate('/admin/artikel');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className={styles.page}>
      <Link to="/admin/artikel" className={styles.back}>← Kelola Artikel</Link>
      <div className={styles.eyebrow}>Panel Admin</div>
      <h1 className={styles.h1}>{isEdit ? 'Edit Artikel' : 'Tulis Artikel Baru'}</h1>

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
            <Button type="button" variant="secondary" onClick={() => navigate('/admin/artikel')}>
              Batal
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
