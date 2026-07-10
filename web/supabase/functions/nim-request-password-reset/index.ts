// Public endpoint (verify_jwt = false, see ../../config.toml) — called BEFORE
// a session exists. Resolves NIM -> email server-side and triggers Supabase's
// password-reset email internally. Always returns the same generic message,
// regardless of whether the NIM exists, to avoid enumeration.
import { createClient } from 'npm:@supabase/supabase-js@2';

// Comma-separated allowlist from the ALLOWED_ORIGINS secret (`supabase secrets
// set ALLOWED_ORIGINS=https://your-site.com,...`). Falls back to the local dev
// origins — web/vite.config.ts pins the dev server to port 5174 (strictPort).
// Set the production origin as a secret at deploy time; no code edit needed.
const ALLOWED_ORIGINS = new Set(
  (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5174,http://127.0.0.1:5174')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const GENERIC_MESSAGE = 'Kalau NIM terdaftar, link reset password sudah dikirim ke email terkait.';
const NIM_PATTERN = /^[0-9]{1,20}$/;

function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
}

function jsonResponse(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, headers);
  }

  let body: { nim?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400, headers);
  }

  const nim = typeof body.nim === 'string' ? body.nim.trim() : '';

  // Malformed input still gets the generic success message below — never
  // reveal via response shape/status whether a NIM looks valid or exists.
  if (NIM_PATTERN.test(nim)) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    // Server-side only, set via `supabase secrets set` — never taken from the
    // client request, to avoid an open-redirect via an attacker-supplied URL.
    const redirectTo = Deno.env.get('PASSWORD_RESET_REDIRECT_URL')!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { data: profile } = await adminClient
      .from('profiles')
      .select('email')
      .eq('nim', nim)
      .maybeSingle();

    if (profile) {
      const authClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false },
      });
      await authClient.auth.resetPasswordForEmail(profile.email, { redirectTo });
    }
  }

  return jsonResponse({ message: GENERIC_MESSAGE }, 200, headers);
});
