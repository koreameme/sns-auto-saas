/**
 * Sidebar.jsx - 반응형 접이식 / 아이콘 미니 사이드바 (마우스 호버 & 클릭 토글 지원)
 */
import { useState, useEffect } from 'react';

export default function Sidebar({ activePage, setActivePage, currentUser }) {
  // 접힘 상태 (기본적으로 접힘 또는 토글 가능)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [isHovered, setIsHovered] = useState(false);

  // 마우스 오버 또는 수동 토글에 의한 최종 펼침 여부
  const isExpanded = !isCollapsed || isHovered;

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isCollapsed);
    if (isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }, [isCollapsed]);

  const sections = [
    {
      label: '메인',
      items: [
        { id: 'dashboard', icon: '🏠', label: '대시보드' },
        { id: 'studio',    icon: '✨', label: 'OSMU 스튜디오' },
      ],
    },
    {
      label: 'SNS 관리',
      items: [
        { id: 'onboarding', icon: '🔗', label: 'SNS 계정 관리' },
      ],
    },
    {
      label: '설정',
      items: [
        { id: 'profile',   icon: '👤', label: '내 프로필 설정' },
        { id: 'apikeys',   icon: '🔑', label: 'AI API 키 관리' },
        { id: 'billing',   icon: '💳', label: '플랜 & 구독' },
      ],
    },
  ];

  if (currentUser?.role === 'admin') {
    sections.push({
      label: '관리자 전용',
      items: [
        { id: 'admin', icon: '👑', label: '회원 승인 콘솔' },
      ],
    });
  }

  return (
    <nav
      className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 로고 & 수동 토글 버튼 */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⚡</div>
        {isExpanded && (
          <div className="sidebar-logo-text-wrapper">
            <div className="sidebar-logo-text">SNS AutoPost</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Pro v1.0</div>
          </div>
        )}
        <button
          className="sidebar-toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? '메뉴 고정 펼치기' : '메뉴 접기 (아이콘모드)'}
        >
          {isCollapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* 네비게이션 */}
      <div className="sidebar-nav">
        {sections.map(section => (
          <div key={section.label} className="sidebar-section">
            {isExpanded ? (
              <div className="sidebar-section-label">{section.label}</div>
            ) : (
              <div className="sidebar-section-divider" />
            )}
            {section.items.map(item => (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => setActivePage(item.id)}
                title={item.label}
              >
                <span className="icon">{item.icon}</span>
                {isExpanded && <span className="nav-label">{item.label}</span>}
              </button>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}
