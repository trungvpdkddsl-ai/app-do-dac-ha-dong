import React, { StrictMode, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends React.Component<any, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  constructor(props: any) {
    super(props);
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('App crashed:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'sans-serif' }}>
          <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '480px' }}>
            <div style={{ width: 64, height: 64, background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: 32 }}>⚠️</div>
            <h2 style={{ color: '#1e293b', marginBottom: 8 }}>Ứng dụng gặp sự cố</h2>
            <p style={{ color: '#64748b', marginBottom: 24 }}>{this.state.error.message}</p>
            <button
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontSize: 14, marginRight: 8 }}
            >Xóa cache & tải lại</button>
            <button
              onClick={() => window.location.reload()}
              style={{ background: '#e2e8f0', color: '#334155', border: 'none', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
            >Tải lại</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
