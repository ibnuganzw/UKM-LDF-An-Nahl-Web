import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  deploymentTargetError,
  STAGING_PAGES_HOST,
  STAGING_SUPABASE_REF,
} from './deploymentTarget';
import { MIN_PASSWORD_LENGTH, passwordAuthError, passwordPolicyError } from './passwordPolicy';

describe('Phase 4 trust and release closure', () => {
  it('uses one strong password contract for registration and reset', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(10);
    expect(passwordPolicyError('pendek1')).toContain('10');
    expect(passwordPolicyError('sepuluhhuruf')).toContain('huruf dan satu angka');
    expect(passwordPolicyError('1234567890')).toContain('huruf dan satu angka');
    expect(passwordPolicyError('amansekali1')).toBeNull();
    expect(passwordAuthError(
      'Password should contain at least one character of each: abc, ABC, 012.',
    )).toBe('Kata sandi minimal 10 karakter dan harus memuat setidaknya satu huruf dan satu angka.');
    expect(passwordAuthError('Pesan layanan lain.')).toBe('Pesan layanan lain.');

    const register = readFileSync(new URL('../pages/Register.tsx', import.meta.url), 'utf8');
    const reset = readFileSync(new URL('../pages/ResetPassword.tsx', import.meta.url), 'utf8');
    const config = readFileSync(new URL('../../supabase/config.toml', import.meta.url), 'utf8');
    expect(register).toContain('passwordPolicyError(pass)');
    expect(reset).toContain('passwordPolicyError(password)');
    expect(register).toContain('placeholder={`${MIN_PASSWORD_LENGTH}+ karakter · huruf+angka`}');
    expect(reset).toContain('placeholder={`${MIN_PASSWORD_LENGTH}+ karakter · huruf+angka`}');
    expect(config).toContain('minimum_password_length = 10');
    expect(config).toContain('password_requirements = "letters_digits"');
  });

  it('keeps auth pages focused on the home-linked brand and theme control', () => {
    const header = readFileSync(new URL('../components/layout/FocusedHeader.tsx', import.meta.url), 'utf8');

    expect(header).toContain('aria-label="LDF An-Nahl — kembali ke Beranda"');
    expect(header).toContain('<ThemeToggle compact />');
    expect(header).not.toContain('← Beranda');
  });

  it('starts new visitors in light mode while preserving an explicit dark preference', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    const themeProvider = readFileSync(new URL('../state/ThemeContext.tsx', import.meta.url), 'utf8');

    expect(html).toContain('<meta name="theme-color" content="#F5F7FB" />');
    expect(html).toContain("var theme = 'light'");
    expect(html).toContain("theme = savedTheme === 'dark' ? 'dark' : 'light'");
    expect(html).toContain("if (themeMeta && theme === 'dark')");
    expect(themeProvider).toContain("dataset.theme === 'dark' ? 'dark' : 'light'");
  });

  it('switches the organisation tree to accessible accordions on mobile', () => {
    const profile = readFileSync(new URL('../pages/Profil.tsx', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('../pages/Profil.module.css', import.meta.url), 'utf8');
    expect(profile).toContain('<details className={styles.divisionAccordion}');
    expect(profile).toContain('<summary className={styles.divisionSummary}>');
    expect(styles).toMatch(/@media \(max-width: 860px\)[\s\S]*\.treeScroll[\s\S]*display: none/);
    expect(styles).toMatch(/@media \(max-width: 860px\)[\s\S]*\.mobileDivisionList[\s\S]*display: grid/);
  });

  it('keeps the profile history editorial and the organisation roster free of generated initial cards', () => {
    const profile = readFileSync(new URL('../pages/Profil.tsx', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('../pages/Profil.module.css', import.meta.url), 'utf8');
    expect(profile).toContain('Berawal dari bale-bale kecil');
    expect(profile).toContain('Sumber ringkas: buku peringatan');
    expect(profile).not.toContain('annahl-arsip-');
    expect(profile).not.toContain('pengurus tercatat');
    expect(styles).toContain('.leadershipRoster');
    expect(styles).not.toContain('.ketuaAvatar');
    expect(styles).not.toMatch(/\.divisionSummaryMark\s*\{[\s\S]{0,80}width:\s*42px/);
  });

  it('keeps the whole profile factual, sans-serif, and prioritises the current organisation', () => {
    const profile = readFileSync(new URL('../pages/Profil.tsx', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('../pages/Profil.module.css', import.meta.url), 'utf8');
    expect(profile.match(/2026\/2027/g)).toHaveLength(1);
    expect(profile).toContain('Organisasi mahasiswa yang mengelola kegiatan keislaman');
    expect(profile).toContain('Yang dikerjakan pengurus');
    expect(profile).not.toContain('Wajah-wajah yang menghidupkan gerak An-Nahl');
    expect(profile).not.toContain('Ruang Bertumbuh');
    expect(profile.indexOf('aria-labelledby="struktur-pengurus"')).toBeLessThan(
      profile.indexOf('aria-labelledby="sejarah-annahl-heading"'),
    );
    expect(styles).not.toContain('font-family: var(--font-serif)');
    expect(styles).not.toContain('.identityGrid');
  });

  it('rate-limits public NIM endpoints without storing raw NIM or IP values', () => {
    const login = readFileSync(new URL('../../supabase/functions/nim-login/index.ts', import.meta.url), 'utf8');
    const reset = readFileSync(new URL('../../supabase/functions/nim-request-password-reset/index.ts', import.meta.url), 'utf8');
    const shared = readFileSync(new URL('../../supabase/functions/_shared/authRateLimit.ts', import.meta.url), 'utf8');
    const migration = readFileSync(new URL('../../supabase/migrations/20260809160000_phase11_auth_rate_limits.sql', import.meta.url), 'utf8');

    expect(login).toContain("scope: 'nim-login-ip'");
    expect(login).toContain("scope: 'nim-login-nim'");
    expect(shared).toContain('for (const rule of rules)');
    expect(shared).not.toContain('Promise.all(rules.map');
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

  it('fails closed when a staging Pages artifact targets a non-staging Supabase project', () => {
    const stagingUrl = `https://${STAGING_SUPABASE_REF}.supabase.co`;
    const productionUrl = 'https://rdbjmmgzmfyrphxiimcf.supabase.co';

    expect(deploymentTargetError(STAGING_PAGES_HOST, stagingUrl)).toBeNull();
    expect(deploymentTargetError(`185f56ea.${STAGING_PAGES_HOST}`, stagingUrl)).toBeNull();
    expect(deploymentTargetError(STAGING_PAGES_HOST, productionUrl)).toContain('menolak');
    expect(deploymentTargetError(STAGING_PAGES_HOST, 'not-a-url')).toContain('menolak');
    expect(deploymentTargetError('ldf-annahl.example.org', productionUrl)).toBeNull();

    const client = readFileSync(new URL('./supabaseClient.ts', import.meta.url), 'utf8');
    expect(client).toContain('assertDeploymentTarget(window.location.hostname, url)');
  });
});
