import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import styles from './Auth.module.css';
import { Button } from '../components/ui';
import { supabase } from '../lib/supabaseClient';

const DEFAULT_MESSAGE = 'Kalau NIM terdaftar, link reset password sudah dikirim ke email terkait.';

export default function ForgotPassword() {
  const [nim, setNim] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await supabase.functions.invoke<{ message: string }>('nim-request-password-reset', {
        body: { nim: nim.trim() },
      });
      setMessage(data?.message ?? DEFAULT_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.head}>
          <h1 className={styles.title}>Lupa kata sandi</h1>
          <div className={styles.subtitle}>Masukkan NIM kamu, link reset akan dikirim ke email terdaftar</div>
        </div>

        {message ? (
          <p className={styles.successText}>{message}</p>
        ) : (
          <form className={styles.form} onSubmit={submit}>
            <div>
              <div className={styles.fieldLabel}>NIM</div>
              <input
                className={styles.input}
                value={nim}
                onChange={(e) => setNim(e.target.value)}
                placeholder="2XXX…"
                inputMode="numeric"
              />
            </div>
            <Button type="submit" variant="primary" fullWidth className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Mengirim…' : 'Kirim link reset'}
            </Button>
          </form>
        )}

        <div className={styles.footerLine}>
          <Link to="/login" className={styles.footerLink}>Kembali ke halaman masuk</Link>
        </div>
      </div>
    </div>
  );
}
