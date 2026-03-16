import React, { StrictMode, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Catch global errors outside React
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global Error:', { message, source, lineno, colno, error });
};

class ErrorBoundary extends React.Component<any, { error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { 
    console.error('App crashed:', error, info); 
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'sans-serif', padding: '1rem' }}>
          <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '480px', background: '#fff', borderRadius: '1rem', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ width: 64, height: 64, background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: 32 }}>⚠️</div>
            <h2 style={{ color: '#1e293b', marginBottom: 8 }}>Ứng dụng gặp sự cố</h2>
            <p style={{ color: '#64748b', marginBottom: 24, fontSize: '14px', lineHeight: '1.5' }}>
              {this.state.error.message || 'Đã xảy ra lỗi không xác định.'}
              <br />
              <small style={{ opacity: 0.7 }}>Vui lòng thử xóa cache và tải lại trang.</small>
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                onClick={() => { localStorage.clear(); window.location.reload(); }}
                style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
              >Xóa cache & tải lại</button>
              <button
                onClick={() => window.location.reload()}
                style={{ background: '#e2e8f0', color: '#334155', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
              >Tải lại</button>
            </div>
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
