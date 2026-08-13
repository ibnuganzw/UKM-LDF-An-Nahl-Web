export const STAGING_PAGES_HOST = 'ldf-annahl-fkh-usk-staging.pages.dev';
export const STAGING_SUPABASE_REF = 'qclesvwptdvvlmxxfnsj';

function supabaseProjectRef(supabaseUrl: string): string | null {
  try {
    const hostname = new URL(supabaseUrl).hostname;
    const [projectRef, ...domain] = hostname.split('.');
    return domain.join('.') === 'supabase.co' ? projectRef : null;
  } catch {
    return null;
  }
}

function isStagingPagesHost(hostname: string): boolean {
  return hostname === STAGING_PAGES_HOST || hostname.endsWith(`.${STAGING_PAGES_HOST}`);
}

export function deploymentTargetError(hostname: string, supabaseUrl: string): string | null {
  if (!isStagingPagesHost(hostname)) return null;

  const projectRef = supabaseProjectRef(supabaseUrl);
  if (projectRef === STAGING_SUPABASE_REF) return null;

  return 'Konfigurasi staging tidak aman: aplikasi menolak terhubung ke project Supabase non-staging.';
}

export function assertDeploymentTarget(hostname: string, supabaseUrl: string): void {
  const error = deploymentTargetError(hostname, supabaseUrl);
  if (error) throw new Error(error);
}
