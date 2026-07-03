import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Auth.module.css';
import { Button } from '../components/ui';
import { useApp } from '../state/AppContext';

export default function Register() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login(name, 'member');
    navigate('/dashboard');
  };

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
          <div className={styles.row2}>
            <div>
              <div className={styles.fieldLabel}>NIM</div>
              <input className={styles.input} placeholder="2XXX…" />
            </div>
            <div>
              <div className={styles.fieldLabel}>Angkatan</div>
              <input className={styles.input} placeholder="2024" />
            </div>
          </div>
          <div>
            <div className={styles.fieldLabel}>Kata sandi</div>
            <input
              type="password"
              className={styles.input}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="apa saja (mock)"
            />
          </div>
          <Button type="submit" variant="primary" fullWidth className={styles.submitBtn}>Daftar & Masuk</Button>
        </div>

        <div className={styles.footerLine}>
          Sudah punya akun? <Link to="/login" className={styles.footerLink}>Masuk</Link>
        </div>
      </form>
    </div>
  );
}
