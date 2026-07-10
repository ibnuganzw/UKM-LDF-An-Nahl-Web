// Public endpoint (verify_jwt = false, see ../../config.toml) — called BEFORE
// a session exists, so it cannot require a JWT. Resolves NIM -> email
// server-side (using the service role key) and verifies the password via
// Supabase Auth, without ever returning the email address to the browser.
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

const GENERIC_ERROR = 'NIM atau kata sandi salah';
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

  let body: { nim?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400, headers);
  }

  const nim = typeof body.nim === 'string' ? body.nim.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  // Never log `body`/`password` anywhere below this line.
  // Business-logic outcomes are always returned as HTTP 200 with an
  // `{ok, ...}` body (rather than via HTTP status codes) so the client can
  // read `error` reliably regardless of how supabase-js's functions.invoke()
  // surfaces non-2xx response bodies across versions. 400/405 below are only
  // for genuinely malformed requests, which this app's own client never sends.
  if (!NIM_PATTERN.test(nim) || password.length < 1 || password.length > 200) {
    return jsonResponse({ ok: false, error: GENERIC_ERROR }, 200, headers);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: profile } = await adminClient
    .from('profiles')
    .select('email')
    .eq('nim', nim)
    .maybeSingle();

  // Same generic response whether the NIM doesn't exist or the lookup
  // failed — never distinguish, to avoid enumeration.
  if (!profile) {
    return jsonResponse({ ok: false, error: GENERIC_ERROR }, 200, headers);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });
  const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  if (signInError || !signInData.session) {
    return jsonResponse({ ok: false, error: GENERIC_ERROR }, 200, headers);
  }

  // Only the session ever goes back to the browser — never `profile.email`.
  return jsonResponse(
    {
      ok: true,
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      },
    },
    200,
    headers,
  );
});
