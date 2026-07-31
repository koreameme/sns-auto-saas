/**
 * App.jsx - SaaS 메인 앱 라우터, 인증 및 관리자 페이지 통합
 */
import { useState, useEffect } from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import Dashboard    from './pages/Dashboard';
import OsmuStudio   from './pages/OsmuStudio';
import Onboarding   from './pages/Onboarding';
import ApiKeyManager from './pages/ApiKeyManager';
import Billing      from './pages/Billing';
import ProfileSettings from './pages/ProfileSettings';
import AdminConsole from './pages/AdminConsole';
import AuthModal    from './pages/AuthModal';
import { getMeApi } from './api';

const PAGE_TITLES = {
  dashboard:  '대시보드',
  studio:     'OSMU 포스팅 스튜디오',
  onboarding: 'SNS 계정 관리 & 1-Click 연동',
  profile:    '👤 내 프로필 & 계정 설정',
  apikeys:    'AI API 키 관리',
  billing:    '플랜 & 구독',
  admin:      '👑 관리자 회원 승인 콘솔',
};

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('saas_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const clearOsmuStorage = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('osmu_')) {
        localStorage.removeItem(key);
      }
    });
  };

  const handleLoginSuccess = (user) => {
    clearOsmuStorage();
    setCurrentUser(user);
    localStorage.setItem('saas_user', JSON.stringify(user));
    // 로그인 시 항상 대시보드로 이동하여 이전 페이지 상태 오남용 방지
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    clearOsmuStorage();
    setCurrentUser(null);
    localStorage.removeItem('saas_user');
    setActivePage('dashboard');
  };

  // 로그인하지 않은 경우나 승인 대기 중인 경우 처리
  if (!currentUser || currentUser.status === 'pending') {
    return (
      <div className="app-layout" style={{ display: 'block', background: 'var(--bg-main)', minHeight: '100vh' }}>
        <header className="topbar" style={{ padding: '1rem 2rem' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '1.5rem' }}>⚡</span>
            <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>SNS AutoPost Pro</span>
          </div>
          {currentUser && (
            <div className="flex items-center gap-3">
              <span className="badge badge-yellow">⏳ 승인 대기중</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{currentUser.email}</span>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>로그아웃</button>
            </div>
          )}
        </header>

        <AuthModal
          currentUser={currentUser}
          onLoginSuccess={handleLoginSuccess}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':   return <Dashboard currentUser={currentUser} />;
      case 'studio':      return <OsmuStudio currentUser={currentUser} setActivePage={setActivePage} />;
      case 'onboarding':  return <Onboarding currentUser={currentUser} />;
      case 'profile':     return <ProfileSettings currentUser={currentUser} setCurrentUser={setCurrentUser} />;
      case 'apikeys':     return <ApiKeyManager currentUser={currentUser} />;
      case 'billing':     return <Billing currentUser={currentUser} setCurrentUser={setCurrentUser} setActivePage={setActivePage} />;
      case 'admin':       
        // 일반 유저가 URL/상태로 접근 시 철저히 차단
        if (currentUser?.role !== 'admin') return <Dashboard currentUser={currentUser} />;
        return <AdminConsole currentUser={currentUser} />;
      default:            return <Dashboard currentUser={currentUser} />;
    }
  };

  return (
    <div className="app-layout">
      {/* 사이드바 */}
      <Sidebar activePage={activePage} setActivePage={setActivePage} currentUser={currentUser} />

      {/* 메인 영역 */}
      <main className="main-content">
        {/* 상단 바 */}
        <header className="topbar">
          <div className="topbar-title">{PAGE_TITLES[activePage] || '대시보드'}</div>
          <div className="topbar-actions flex items-center gap-3">
            {currentUser?.role === 'admin' && (
              <span className="badge badge-purple">
                ⚡ 66 API Keys Active
              </span>
            )}
            <span className="badge badge-green" style={{ textTransform: 'uppercase', fontWeight: 700 }}>
              💳 {currentUser?.plan || 'PRO'} PLAN
            </span>
            <div
              id="topbar-profile-chip"
              onClick={() => setActivePage('profile')}
              title="내 프로필 설정으로 이동"
              className="flex items-center gap-2"
              style={{
                padding: '0.35rem 0.75rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                width: 24, height: 24,
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: 700, color: 'white',
              }}>
                {typeof currentUser?.full_name === 'string' && currentUser.full_name.length > 0
                  ? currentUser.full_name[0].toUpperCase()
                  : 'U'}
              </div>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {currentUser?.full_name || currentUser?.email || '사용자'}
              </span>
              {currentUser?.role === 'admin' && (
                <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>관리자</span>
              )}
            </div>

            <button
              id="btn-logout"
              className="btn btn-secondary btn-sm"
              onClick={handleLogout}
              style={{ fontSize: '0.78rem' }}
            >
              🔓 로그아웃
            </button>
          </div>
        </header>

        {/* 페이지 콘텐츠: OSMU 스튜디오는 백그라운드 AI 생성 작업 유지를 위해 상시 마운트 보존 */}
        <div style={{ display: activePage === 'studio' ? 'block' : 'none' }}>
          <OsmuStudio currentUser={currentUser} setActivePage={setActivePage} />
        </div>
        {activePage !== 'studio' && renderPage()}
      </main>
    </div>
  );
}
