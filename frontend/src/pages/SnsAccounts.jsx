/**
 * SnsAccounts.jsx - SNS 계정 연동 현황 관리 페이지
 */
import { useState, useEffect } from 'react';
import { listSnsAccounts, resetAllSnsAccounts } from '../api';

const ALL_PLATFORMS = [
  { id: 'youtube',   icon: '▶️', label: 'YouTube',    color: '#ff0000',  desc: 'YouTube Data API v3' },
  { id: 'x',         icon: '✖️', label: 'X (Twitter)', color: '#e7e9ea',  desc: 'X API v2' },
  { id: 'instagram', icon: '📸', label: 'Instagram',  color: '#e4405f',  desc: 'Meta Graph API' },
  { id: 'facebook',  icon: '📘', label: 'Facebook',   color: '#1877f2',  desc: 'Meta Pages API' },
  { id: 'threads',   icon: '🧵', label: 'Threads',    color: '#aaaaaa',  desc: 'Meta Threads API' },
  { id: 'tiktok',    icon: '🎵', label: 'TikTok',     color: '#69c9d0',  desc: 'TikTok Posting API' },
  { id: 'pinterest', icon: '📌', label: 'Pinterest',  color: '#e60023',  desc: 'Pinterest Pins API v5' },
  { id: 'linkedin',  icon: '💼', label: 'LinkedIn',   color: '#0a66c2',  desc: 'LinkedIn Marketing API' },
  { id: 'medium',    icon: '✍️', label: 'Medium',     color: '#00ab6c',  desc: 'Medium Publishing API' },
  { id: 'tumblr',    icon: '🔮', label: 'Tumblr',     color: '#36465d',  desc: 'Tumblr API v2' },
  { id: 'reddit',    icon: '🤖', label: 'Reddit',     color: '#ff4500',  desc: 'Reddit API v1' },
];

export default function SnsAccounts({ setActivePage, currentUser }) {
  const userId = currentUser?.id || 1;
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const fetchAccounts = async () => {
    try {
      const data = await listSnsAccounts(userId);
      setAccounts(data);
    } catch (e) {
      console.error('계정 목록 조회 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [userId]);

  const connectedMap = Object.fromEntries(accounts.map(a => [a.platform, a]));
  const connectedCount = accounts.length;

  const handleResetAll = async () => {
    if (window.confirm('모든 SNS 계정의 연동 정보를 초기화하시겠습니까?')) {
      try {
        await resetAllSnsAccounts(userId);
        setNotification({ type: 'success', text: '🗑️ 모든 SNS 계정 연동 정보가 초기화되었습니다.' });
        fetchAccounts();
      } catch (e) {
        setNotification({ type: 'error', text: `⚠️ 초기화 실패: ${e.message}` });
      }
    }
  };

  return (
    <div className="page-container">
      {/* 알림 메시지 */}
      {notification && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          borderRadius: 'var(--radius-md)',
          background: notification.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          border: notification.type === 'success' ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(239,68,68,0.4)',
          color: notification.type === 'success' ? '#10b981' : '#ef4444',
          fontWeight: 600,
        }}>
          {notification.text}
        </div>
      )}

      <div className="section-header flex justify-between items-center">
        <div>
          <h2>🔗 SNS 계정 연동 현황 ({connectedCount} / {ALL_PLATFORMS.length} 연동됨)</h2>
          <p className="section-subtitle">연동된 11대 SNS 플랫폼 목록과 상태를 확인합니다.</p>
        </div>
        <div className="flex gap-2">
          {connectedCount > 0 && (
            <button
              id="btn-reset-all-sns-accounts"
              className="btn btn-secondary btn-sm flex items-center gap-1"
              onClick={handleResetAll}
              style={{ fontSize: '0.8rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' }}
            >
              🗑️ 전체 연동 초기화
            </button>
          )}
          <button
            id="btn-goto-onboarding"
            className="btn btn-primary"
            onClick={() => setActivePage('onboarding')}
          >
            + 새 플랫폼 연동
          </button>
        </div>
      </div>

      {/* 연동 현황 그리드 */}
      <div className="grid-2" style={{ gap: '1rem' }}>
        {ALL_PLATFORMS.map(p => {
          const account = connectedMap[p.id];
          const connected = !!account;
          return (
            <div
              key={p.id}
              className="card"
              style={{
                border: connected
                  ? `1px solid ${p.color}44`
                  : '1px solid var(--border-subtle)',
                background: connected
                  ? `linear-gradient(135deg, ${p.color}08, var(--bg-card))`
                  : 'var(--bg-card)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`platform-icon platform-${p.id}`}
                  style={{ fontSize: '1.35rem' }}
                >
                  {p.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.desc}</div>
                  {connected && account.account_name && (
                    <div style={{ fontSize: '0.75rem', color: p.color, marginTop: '2px', fontWeight: 600 }}>
                      {account.account_name}
                    </div>
                  )}
                </div>
                <div>
                  {connected ? (
                    <span className="badge badge-green">✅ 연동됨</span>
                  ) : (
                    <span className="badge badge-yellow">⚠️ 미연동</span>
                  )}
                </div>
              </div>

              {!connected && (
                <button
                  id={`btn-connect-quick-${p.id}`}
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '0.875rem', width: '100%', justifyContent: 'center' }}
                  onClick={() => setActivePage('onboarding')}
                >
                  가입 & 연동 가이드 →
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
