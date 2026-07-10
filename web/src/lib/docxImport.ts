import mammoth from 'mammoth';
import { uploadArticleImage } from './articleImages';

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
};

// Supplements mammoth's built-in style map (which already covers "Heading 1/2/3"
// and bold/italic runs) with a couple of extra paragraph styles common in Word
// article templates, so more real-world documents get a detected title.
const STYLE_MAP = [
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Subtitle'] => h3:fresh",
];

export interface ParsedDocxArticle {
  title: string | null;
  coverImageUrl: string | null;
  contentHtml: string;
}

/**
 * Converts an admin-authored .docx into article fields: first Heading/Title
 * paragraph becomes the title, first image becomes the cover, everything else
 * becomes contentHtml (headings/bold/italic/lists preserved, images uploaded
 * to the article-images bucket and wrapped in <figure> so they round-trip
 * through the FigureImage Tiptap node if reopened for editing). Excerpt is
 * intentionally left for the admin to write themselves.
 */
export async function parseDocxArticle(file: File): Promise<ParsedDocxArticle> {
  const arrayBuffer = await file.arrayBuffer();

  const convertImage = mammoth.images.imgElement(async (image) => {
    // read() wraps the result in a Node Buffer internally (via Buffer.from),
    // which doesn't exist in the browser without a polyfill this project
    // doesn't have. readAsArrayBuffer() returns a plain browser-native
    // ArrayBuffer, sidestepping that entirely.
    const buffer = await image.readAsArrayBuffer();
    const blob = new Blob([buffer], { type: image.contentType });
    const ext = MIME_EXT[image.contentType] ?? 'png';
    const uploadFile = new File([blob], `import-${crypto.randomUUID()}.${ext}`, { type: image.contentType });
    const url = await uploadArticleImage(uploadFile);
    return { src: url };
  });

  const result = await mammoth.convertToHtml({ arrayBuffer }, { convertImage, styleMap: STYLE_MAP });

  const doc = new DOMParser().parseFromString(result.value, 'text/html');

  let title: string | null = null;
  const h1 = doc.body.querySelector('h1');
  if (h1) {
    title = h1.textContent?.trim() || null;
    h1.remove();
  }

  // sanitizeArticleHtml only allows h2/h3 (article title is a separate field,
  // rendered as its own page heading) — any further "Heading 1" paragraphs
  // after the first would otherwise have their tag stripped by the sanitizer
  // while the text spills out unwrapped. Downgrade them instead of losing them.
  doc.body.querySelectorAll('h1').forEach((el) => {
    const h2 = doc.createElement('h2');
    h2.innerHTML = el.innerHTML;
    el.replaceWith(h2);
  });

  let coverImageUrl: string | null = null;
  const firstImg = doc.body.querySelector('img');
  if (firstImg) {
    coverImageUrl = firstImg.getAttribute('src');
    (firstImg.closest('p') ?? firstImg).remove();
  }

  doc.body.querySelectorAll('img').forEach((img) => {
    // mammoth wraps inline images in <p>. If that <p> holds nothing else,
    // replace the whole paragraph rather than nesting the block-level
    // <figure> inside it (a <p> can't legally contain block content).
    const parent = img.parentElement;
    const target = parent && parent.tagName === 'P' && parent.childNodes.length === 1 ? parent : img;
    const figure = doc.createElement('figure');
    figure.setAttribute('data-type', 'figure-image');
    target.replaceWith(figure);
    figure.appendChild(img);
  });

  return { title, coverImageUrl, contentHtml: doc.body.innerHTML };
}
