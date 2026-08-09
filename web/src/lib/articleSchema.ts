export const ARTICLE_LEGACY_COLUMNS =
  'id, slug, category, title, excerpt, content_html, cover_image_url, status, author_id, created_at, updated_at, published_at';

export const ARTICLE_EDITORIAL_COLUMNS = `${ARTICLE_LEGACY_COLUMNS}, dek, topics, author_name, author_role, scientific_reviewer_name, scientific_reviewer_role, sharia_reviewer_name, sharia_reviewer_role, review_status, reviewed_at, verification_summary, cover_image_alt, cover_image_caption, is_featured`;

export function isEditorialSchemaUnavailable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = error.message?.toLocaleLowerCase('en-US') ?? '';
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    message.includes('column articles.dek') ||
    message.includes("'dek' column") ||
    message.includes('review_status') ||
    message.includes('author_name') ||
    message.includes('is_featured')
  );
}
