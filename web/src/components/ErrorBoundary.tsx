import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';
import { Button } from './ui';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Unhandled error caught by ErrorBoundary:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className={styles.page}>
        <div className={styles.title}>Terjadi kesalahan</div>
        <p className={styles.text}>Halaman ini gagal dimuat. Coba muat ulang, atau kembali ke beranda.</p>
        <div className={styles.actions}>
          <Button onClick={() => window.location.reload()} variant="secondary" size="md">
            Muat ulang
          </Button>
          <Button to="/" variant="primary" size="md">
            Ke beranda
          </Button>
        </div>
      </div>
    );
  }
}
