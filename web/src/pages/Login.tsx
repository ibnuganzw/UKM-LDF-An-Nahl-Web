import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Auth.module.css';
import { Button } from '../components/ui';
import { useApp } from '../state/AppContext';

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login(name, 'member');
    navigate('/dashboard');
  };

  const loginAsAdmin = () => {
    login('', 'admin');
    navigate('/admin');
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
            <div className={styles.fieldLabel}>Nama / NIM</div>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth. Raihan — bebas, ini demo"
            />
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
          <Button type="submit" variant="primary" fullWidth className={styles.submitBtn}>Masuk</Button>
          <button type="button" className={styles.adminBtn} onClick={loginAsAdmin}>Masuk sebagai Admin (demo)</button>
        </div>

        <div className={styles.footerLine}>
          Belum punya akun? <Link to="/register" className={styles.footerLink}>Daftar anggota</Link>
        </div>
      </form>
      <div className={styles.disclaimer}>Login mock untuk prototype — belum terhubung ke sistem akun sungguhan.</div>
    </div>
  );
}
