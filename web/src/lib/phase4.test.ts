import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MIN_PASSWORD_LENGTH, passwordPolicyError } from './passwordPolicy';

describe('Phase 4 trust and release closure', () => {
  it('uses one strong password contract for registration and reset', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(10);
    expect(passwordPolicyError('pendek1')).toContain('10');
    expect(passwordPolicyError('sepuluhhuruf')).toContain('huruf dan satu angka');
    expect(passwordPolicyError('1234567890')).toContain('huruf dan satu angka');
    expect(passwordPolicyError('amansekali1')).toBeNull();

    const register = readFileSync(new URL('../pages/Register.tsx', import.meta.url), 'utf8');
    const reset = readFileSync(new URL('../pages/ResetPassword.tsx', import.meta.url), 'utf8');
    const config = readFileSync(new URL('../../supabase/config.toml', import.meta.url), 'utf8');
    expect(register).toContain('passwordPolicyError(pass)');
    expect(reset).toContain('passwordPolicyError(password)');
    expect(config).toContain('minimum_password_length = 10');
    expect(config).toContain('password_requirements = "letters_digits"');
  });

  it('switches the organisation tree to accessible accordions on mobile', () => {
    const profile = readFileSync(new URL('../pages/Profil.tsx', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('../pages/Profil.module.css', import.meta.url), 'utf8');
    expect(profile).toContain('<details className={styles.divisionAccordion}');
    expect(profile).toContain('<summary className={styles.divisionSummary}>');
    expect(styles).toMatch(/@media \(max-width: 640px\)[\s\S]*\.treeScroll[\s\S]*display: none/);
    expect(styles).toMatch(/@media \(max-width: 640px\)[\s\S]*\.mobileDivisionList[\s\S]*display: grid/);
  });

  it('rate-limits public NIM endpoints without storing raw NIM or IP values', () => {
    const login = readFileSync(new URL('../../supabase/functions/nim-login/index.ts', import.meta.url), 'utf8');
    const reset = readFileSync(new URL('../../supabase/functions/nim-request-password-reset/index.ts', import.meta.url), 'utf8');
    const shared = readFileSync(new URL('../../supabase/functions/_shared/authRateLimit.ts', import.meta.url), 'utf8');
    const migration = readFileSync(new URL('../../supabase/migrations/20260809160000_phase11_auth_rate_limits.sql', import.meta.url), 'utf8');

    expect(login).toContain("scope: 'nim-login-ip'");
    expect(login).toContain("scope: 'nim-login-nim'");
    expect(reset).toContain("scope: 'nim-reset-ip'");
    expect(reset).toContain("scope: 'nim-reset-nim'");
    expect(shared).toContain("crypto.subtle.digest('SHA-256'");
    expect(migration).not.toMatch(/\bnim\b\s+(text|varchar)/i);
    expect(migration).not.toMatch(/\bip(_address)?\b\s+(text|inet|varchar)/i);
    expect(migration).toContain('revoke all on private.auth_rate_limit_buckets from public, anon, authenticated');
    expect(migration).toContain('to service_role');
  });

  it('declares narrow Data API grants without exposing agenda QR tokens', () => {
    const migration = readFileSync(
      new URL('../../supabase/migrations/20260812130000_phase12_explicit_data_api_grants.sql', import.meta.url),
      'utf8',
    );
    const agendaSelect = migration.match(/grant select \(([\s\S]*?)\) on public\.agendas to anon, authenticated;/i);

    expect(agendaSelect).not.toBeNull();
    expect(agendaSelect?.[1]).not.toContain('qr_token');
    expect(migration).toContain('grant select on public.profiles to authenticated;');
    expect(migration).toContain('grant select, insert, delete on public.event_registrations to authenticated;');
    expect(migration).toContain('grant select on public.event_attendance to authenticated;');
    expect(migration).toContain('grant select on public.articles to anon, authenticated;');
    expect(migration).toContain('grant select on public.org_positions to anon, authenticated;');
    expect(migration).toContain('grant select on public.division_members to anon, authenticated;');
    expect(migration).toContain('to service_role;');
    expect(migration).not.toMatch(/alter default privileges/i);
    expect(migration).not.toMatch(
      /grant all(?: privileges)? on (?:table )?public\.agendas to (?:anon|authenticated)/i,
    );
  });
});
