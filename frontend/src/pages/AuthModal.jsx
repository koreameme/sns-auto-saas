/**
 * AuthModal.jsx - 로그인 / 회원가입 및 승인 대기 전용 컴포넌트
 */
import { useState } from 'react';
import { signupApi, loginApi } from '../api';

export default function AuthModal({ currentUser, onLoginSuccess, onLogout }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      if (mode === 'login') {
        const res = await loginApi({ email, password });
        onLoginSuccess(res.user);
      } else {
        const res = await signupApi({ email, password, full_name: fullName });
        setSignupSuccess(true);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 계정 승인 대기 중 화면
  if (currentUser && currentUser.status === 'pending') {
    return (
      <div className="page-container flex justify-center items-center" style={{ minHeight: '70vh' }}>
        <div className="card" style={{
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          padding: '2.5rem',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(124, 58, 237, 0.05))',
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⏳</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: '#f59e0b' }}>
            관리자 승인 대기 중입니다
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            안녕하세요, <b>{currentUser.full_name || currentUser.email}</b> 님!<br />
            현재 계정은 <b>[승인 대기]</b> 상태입니다.<br />
            관리자가 확인 후 회원 승인 및 서비스 이용 플랜(Starter / Pro / Enterprise)을 배정하면 즉시 11대 SNS 연동 및 OSMU 포스팅 작성이 가능해집니다.
          </p>

          <div className="flex gap-2 justify-center">
            <button className="btn btn-secondary" onClick={onLogout} style={{ padding: '0.6rem 1.5rem', fontWeight: 600 }}>
              🔓 로그아웃
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container flex justify-center items-center" style={{ minHeight: '75vh' }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚡</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {mode === 'login' ? 'SNS AutoPost Pro 로그인' : '신규 회원가입 신청'}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            11대 SNS 자동 포스팅 & AI 키 마스터 SaaS
          </p>
        </div>

        {errorMsg && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.4)',
            color: '#ef4444',
            fontSize: '0.82rem',
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {signupSuccess ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h3 style={{ color: '#10b981', marginBottom: '0.5rem' }}>가입 신청이 완료되었습니다!</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1.5rem' }}>
              관리자가 승인 및 플랜을 할당하면 서비스를 바로 이용하실 수 있습니다.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => { setSignupSuccess(false); setMode('login'); }}
              style={{ width: '100%' }}
            >
              로그인 화면으로 이동
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label">이름 (담당자/브랜드명)</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="예: 홍길동 마케터"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">이메일 주소</label>
              <input
                className="form-input"
                type="email"
                placeholder="email@company.com"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">비밀번호</label>
              <input
                className="form-input"
                type="password"
                placeholder="비밀번호 입력"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ padding: '0.8rem', fontWeight: 700, marginTop: '0.5rem' }}
            >
              {loading ? '처리 중...' : mode === 'login' ? '🔑 로그인하기' : '📝 회원가입 신청하기'}
            </button>

            <div style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              marginTop: '0.75rem',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
            }}>
              <span>
                {mode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
              </span>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--accent-light)', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setErrorMsg('');
                }}
              >
                {mode === 'login' ? '회원가입 신청' : '로그인으로 이동'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
