import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 's', 'u', 'code',
  'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a',
  'figure', 'figcaption', 'img', 'hr',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];
const ALLOWED_ATTR = ['href', 'target', 'rel', 'src', 'alt', 'colspan', 'rowspan'];

/**
 * Shared sanitize config for article content_html. Called both when the editor
 * saves (UX consistency) and again when public pages render (the real security
 * boundary, since the articles API can be called directly without going
 * through the editor at all).
 */
export function sanitizeArticleHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
