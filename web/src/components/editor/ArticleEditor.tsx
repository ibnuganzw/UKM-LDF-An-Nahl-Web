import { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import styles from './ArticleEditor.module.css';
import { FigureImage } from './FigureImage';
import { uploadArticleImage } from '../../lib/articleImages';

interface ArticleEditorProps {
  contentHtml: string;
  onChange: (html: string) => void;
}

export default function ArticleEditor({ contentHtml, onChange }: ArticleEditorProps) {
  const [imagePanelOpen, setImagePanelOpen] = useState(false);
  const [imageCaption, setImageCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      FigureImage,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: contentHtml,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // useEditor only reads `content` at mount. This pushes in changes that
  // happen afterward from outside the editor itself (docx import prefilling
  // an already-mounted create form) without disturbing normal typing, since
  // onUpdate already keeps contentHtml equal to editor.getHTML() as-you-type.
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== contentHtml) {
      editor.commands.setContent(contentHtml, { emitUpdate: false });
    }
  }, [editor, contentHtml]);

  if (!editor) return null;

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL tautan:', previous ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  };

  const insertImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadArticleImage(file);
      editor.chain().focus().setFigureImage({ src: url, alt: imageCaption, caption: imageCaption || undefined }).run();
      setImagePanelOpen(false);
      setImageCaption('');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal mengunggah gambar.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <button type="button" className={editor.isActive('bold') ? styles.btnActive : styles.btn} onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
        <button type="button" className={editor.isActive('italic') ? styles.btnActive : styles.btn} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></button>
        <button type="button" className={editor.isActive('strike') ? styles.btnActive : styles.btn} onClick={() => editor.chain().focus().toggleStrike().run()}>S</button>
        <span className={styles.sep} />
        <button type="button" className={editor.isActive('heading', { level: 2 }) ? styles.btnActive : styles.btn} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button type="button" className={editor.isActive('heading', { level: 3 }) ? styles.btnActive : styles.btn} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
        <span className={styles.sep} />
        <button type="button" className={editor.isActive('bulletList') ? styles.btnActive : styles.btn} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
        <button type="button" className={editor.isActive('orderedList') ? styles.btnActive : styles.btn} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</button>
        <button type="button" className={editor.isActive('blockquote') ? styles.btnActive : styles.btn} onClick={() => editor.chain().focus().toggleBlockquote().run()}>" Kutipan</button>
        <span className={styles.sep} />
        <button type="button" className={editor.isActive('link') ? styles.btnActive : styles.btn} onClick={setLink}>Tautan</button>
        <button type="button" className={styles.btn} onClick={() => setImagePanelOpen((v) => !v)}>Gambar</button>
        <button
          type="button"
          className={styles.btn}
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          Tabel
        </button>
        {editor.isActive('table') && (
          <>
            <button type="button" className={styles.btn} onClick={() => editor.chain().focus().addRowAfter().run()}>+Baris</button>
            <button type="button" className={styles.btn} onClick={() => editor.chain().focus().addColumnAfter().run()}>+Kolom</button>
            <button type="button" className={styles.btn} onClick={() => editor.chain().focus().deleteRow().run()}>-Baris</button>
            <button type="button" className={styles.btn} onClick={() => editor.chain().focus().deleteColumn().run()}>-Kolom</button>
            <button type="button" className={styles.btn} onClick={() => editor.chain().focus().deleteTable().run()}>Hapus Tabel</button>
          </>
        )}
        <span className={styles.sep} />
        <button type="button" className={styles.btn} onClick={() => editor.chain().focus().undo().run()}>↺</button>
        <button type="button" className={styles.btn} onClick={() => editor.chain().focus().redo().run()}>↻</button>
      </div>

      {imagePanelOpen && (
        <div className={styles.imagePanel}>
          <input
            type="text"
            className={styles.captionInput}
            placeholder="Keterangan foto (opsional)"
            value={imageCaption}
            onChange={(e) => setImageCaption(e.target.value)}
          />
          <input type="file" accept="image/*" onChange={insertImage} disabled={uploading} />
          {uploading && <span className={styles.uploadingText}>Mengunggah…</span>}
          {uploadError && <span className={styles.uploadError}>{uploadError}</span>}
        </div>
      )}

      <EditorContent editor={editor} className={styles.content} />
    </div>
  );
}
