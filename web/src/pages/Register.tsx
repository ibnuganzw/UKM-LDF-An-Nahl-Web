import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import styles from './Auth.module.css';
import { Button } from '../components/ui';
import { supabase } from '../lib/supabaseClient';

const CURRENT_YEAR = new Date().getFullYear();

/**
 * supabase.auth.signUp surfaces two unhelpful failures we can make actionable
 * without revealing which field clashed (kept vague on purpose — the NIM
 * login/reset endpoints are deliberately enumeration-resistant, so registration
 * shouldn't become a NIM/email oracle either):
 *  - "Database error saving new user": the handle_new_user trigger enforces a
 *    unique NIM; a duplicate NIM rolls the whole signup back as this generic
 *    500. Since the form already validates name/nim-format/angkatan/password
 *    before this point, a duplicate NIM is by far the most likely cause.
 *  - "User already registered": the email is already taken.
 */
function friendlySignUpError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'Email ini sepertinya sudah terdaftar. Coba masuk, atau pakai email lain.';
  }
  if (m.includes('database error')) {
    return 'Pendaftaran gagal — NIM ini kemungkinan sudah terdaftar. Coba masuk, atau periksa lagi NIM kamu.';
  }
  return message;
}

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nim, setNim] = useState('');
  const [angkatan, setAngkatan] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkEmailMessage, setCheckEmailMessage] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedNim = nim.trim();
    const angkatanYear = Number(angkatan);

    if (!trimmedName) {
      setError('Nama lengkap wajib diisi.');
      return;
    }
    if (!/^[0-9]+$/.test(trimmedNim)) {
      setError('NIM harus berupa angka.');
      return;
    }
    if (!Number.isInteger(angkatanYear) || angkatanYear < 2000 || angkatanYear > CURRENT_YEAR + 1) {
      setError(`Angkatan harus tahun yang wajar (2000–${CURRENT_YEAR + 1}).`);
      return;
    }
    if (pass.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: { name: trimmedName, nim: trimmedNim, angkatan_year: angkatanYear },
          emailRedirectTo: `${window.location.origin}/menunggu-persetujuan`,
        },
      });

      if (signUpError) {
        setError(friendlySignUpError(signUpError.message));
        return;
      }

      if (!data.session) {
        // Normal outcome when "Confirm email" is enabled — there is no
        // session yet, so we can't route to a page that requires one.
        setCheckEmailMessage(
          'Pendaftaran berhasil. Cek email kamu dan klik link konfirmasi untuk melanjutkan ke halaman menunggu persetujuan.',
        );
        return;
      }

      window.location.href = '/menunggu-persetujuan';
    } finally {
      setSubmitting(false);
    }
  };

  if (checkEmailMessage) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.head}>
            <span className={styles.glyph}>ن</span>
            <h1 className={styles.title}>Cek email kamu</h1>
          </div>
          <p className={styles.successText}>{checkEmailMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={submit}>
        <div className={styles.head}>
          <span className={styles.glyph}>ن</span>
          <h1 className={styles.title}>Gabung ke koloni</h1>
          <div className={styles.subtitle}>Daftar sebagai anggota LDF An-Nahl</div>
        </div>

        <div className={styles.form}>
          <div>
            <div className={styles.fieldLabel}>Nama lengkap</div>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama sesuai KTM"
            />
          </div>
          <div>
            <div className={styles.fieldLabel}>Email</div>
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              autoComplete="email"
            />
          </div>
          <div className={styles.row2}>
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
            <div>
              <div className={styles.fieldLabel}>Angkatan</div>
              <input
                className={styles.input}
                value={angkatan}
                onChange={(e) => setAngkatan(e.target.value)}
                placeholder="2024"
                inputMode="numeric"
              />
            </div>
          </div>
          <div>
            <div className={styles.fieldLabel}>Kata sandi</div>
            <input
              type="password"
              className={styles.input}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Minimal 6 karakter"
              autoComplete="new-password"
            />
          </div>
          {error && <div className={styles.errorText}>{error}</div>}
          <Button type="submit" variant="primary" fullWidth className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Memproses…' : 'Daftar'}
          </Button>
        </div>

        <div className={styles.footerLine}>
          Sudah punya akun? <Link to="/login" className={styles.footerLink}>Masuk</Link>
        </div>
      </form>
    </div>
  );
}
