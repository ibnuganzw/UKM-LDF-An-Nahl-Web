import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import styles from './Auth.module.css';
import { Button } from '../components/ui';
import { supabase } from '../lib/supabaseClient';

interface NimLoginResponse {
  ok: boolean;
  error?: string;
  session?: { access_token: string; refresh_token: string };
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const [nim, setNim] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke<NimLoginResponse>('nim-login', {
        body: { nim: nim.trim(), password: pass },
      });

      if (fnError || !data?.ok || !data.session) {
        setError(data?.error ?? 'NIM atau kata sandi salah');
        return;
      }

      const { error: setSessionError } = await supabase.auth.setSession(data.session);
      if (setSessionError) {
        setError('Gagal masuk, coba lagi.');
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const { data: profileRow } = userId
        ? await supabase.from('profiles').select('role, status').eq('id', userId).single()
        : { data: null };

      const isAdmin =
        !!profileRow &&
        (profileRow.role === 'admin' || profileRow.role === 'super_admin') &&
        profileRow.status === 'active';

      if (profileRow && profileRow.status !== 'active') {
        navigate('/menunggu-persetujuan');
      } else if (redirectTo) {
        navigate(redirectTo);
      } else if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={submit}>
        <div className={styles.head}>
          <img src="/assets/logo.png" alt="Logo" className={styles.logo} />
          <h1 className={styles.title}>Ahlan wa sahlan</h1>
          <div className={styles.subtitle}>Masuk untuk melihat dashboard & absen kegiatan</div>
        </div>

        <div className={styles.form}>
          <div>
            <div className={styles.fieldLabel}>NIM</div>
            <input
              className={styles.input}
              value={nim}
              onChange={(e) => setNim(e.target.value)}
              placeholder="2XXX…"
              inputMode="numeric"
              autoComplete="username"
            />
          </div>
          <div>
            <div className={styles.fieldLabel}>Kata sandi</div>
            <input
              type="password"
              className={styles.input}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Kata sandi"
              autoComplete="current-password"
            />
          </div>
          {error && <div className={styles.errorText}>{error}</div>}
          <Button type="submit" variant="primary" fullWidth className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Memproses…' : 'Masuk'}
          </Button>
        </div>

        <div className={styles.footerLine}>
          <Link to="/lupa-password" className={styles.footerLink}>Lupa kata sandi?</Link>
        </div>
        <div className={styles.footerLine}>
          Belum punya akun? <Link to="/register" className={styles.footerLink}>Daftar anggota</Link>
        </div>
      </form>
    </div>
  );
}
