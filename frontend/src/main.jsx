import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught React Error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', background: '#0a0a0f', color: '#fff', padding: '2rem', textAlign: 'center'
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⚡</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', fontWeight: 800 }}>
            SNS AutoPost Pro 서비스 실행 알림
          </h2>
          <p style={{ color: '#9090b0', maxWidth: '540px', marginBottom: '1rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
            시스템 렌더링 중 오류가 감지되었습니다. 아래 오류 상세 내역과 초기화 버튼을 확인해 주세요.
          </p>

          {/* 에러 상세 추적 정보 */}
          <div style={{
            background: '#13111c',
            border: '1px solid #7c3aed',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            maxWidth: '680px',
            width: '100%',
            marginBottom: '1.5rem',
            textAlign: 'left',
            overflowX: 'auto',
          }}>
            <div style={{ color: '#f87171', fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '0.5rem' }}>
              🚨 오류 원인: {this.state.error?.message || String(this.state.error)}
            </div>
            {this.state.error?.stack && (
              <pre style={{
                color: '#a78bfa',
                fontSize: '0.75rem',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                maxHeight: '160px',
                overflowY: 'auto'
              }}>
                {this.state.error.stack}
              </pre>
            )}
          </div>

          <button
            onClick={this.handleReset}
            style={{
              padding: '0.75rem 1.75rem',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
            }}
          >
            🔄 로컬 캐시 데이터 초기화 및 재접속
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
