interface RpcClient {
  rpc(
    name: string,
    args: Record<string, string | number>,
  ): PromiseLike<{ data: boolean | null; error: { code?: string; message?: string } | null }>;
}

interface RateLimitRule {
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  available: boolean;
}

export function requestIp(req: Request): string {
  const forwarded = req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-real-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim();
  return forwarded?.slice(0, 128) || 'unknown';
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function consumeRateLimits(
  client: RpcClient,
  pepper: string,
  rules: RateLimitRule[],
): Promise<RateLimitResult> {
  const results: Array<{
    data: boolean | null;
    error: { code?: string; message?: string } | null;
  }> = [];

  // Keep these calls sequential. A freshly-created service-role client can
  // intermittently send one of multiple concurrent RPCs without a usable
  // authorization context, which the API gateway rejects with 401. Apart
  // from making valid logins fail closed, parallel calls also make the
  // affected rule ambiguous in production logs.
  for (const rule of rules) {
    const keyHash = await sha256(`${rule.scope}:${rule.identifier}:${pepper}`);
    results.push(await client.rpc('consume_auth_rate_limit', {
      p_scope: rule.scope,
      p_key_hash: keyHash,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    }));
  }

  const errors = results.flatMap(({ error }) => error ? [error] : []);
  if (errors.length > 0) {
    // Never log the identifier, password, IP address, or derived key.
    const classifications = errors.map((error) => {
      const message = error.message?.toLowerCase() ?? '';
      if (message.includes('jwt') || message.includes('api key') || message.includes('authoriz')) {
        return 'authorization';
      }
      return error.code?.slice(0, 32) || 'unknown';
    });
    console.error(`[auth-rate-limit] limiter unavailable (${classifications.join(',')})`);
    return { allowed: false, available: false };
  }

  return {
    allowed: results.every(({ data }) => data === true),
    available: true,
  };
}
