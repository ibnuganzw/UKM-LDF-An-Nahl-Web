import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Auth.module.css';
import { Button } from '../components/ui';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../state/AppContext';

export default function ResetPassword() {
  const { session, authLoading } = useApp();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak sama.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return null;

  if (done) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.head}>
            <h1 className={styles.title}>Kata sandi diperbarui</h1>
          </div>
          <p className={styles.successText}>Kata sandi kamu berhasil diganti.</p>
          <Button variant="primary" fullWidth className={styles.submitBtn} onClick={() => navigate('/dashboard')}>
            Lanjut ke Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.head}>
            <h1 className={styles.title}>Link tidak valid</h1>
          </div>
          <p className={styles.errorText}>
            Link reset password ini sudah kedaluwarsa atau tidak valid. Minta link baru dari halaman lupa kata sandi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={submit}>
        <div className={styles.head}>
          <h1 className={styles.title}>Buat kata sandi baru</h1>
        </div>
        <div className={styles.form}>
          <div>
            <div className={styles.fieldLabel}>Kata sandi baru</div>
            <input
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              autoComplete="new-password"
            />
          </div>
          <div>
            <div className={styles.fieldLabel}>Konfirmasi kata sandi</div>
            <input
              type="password"
              className={styles.input}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi kata sandi"
              autoComplete="new-password"
            />
          </div>
          {error && <div className={styles.errorText}>{error}</div>}
          <Button type="submit" variant="primary" fullWidth className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Menyimpan…' : 'Simpan kata sandi baru'}
          </Button>
        </div>
      </form>
    </div>
  );
}
