/**
 * Onboarding.jsx - 구글 계정 1개로 7대 SNS 플랫폼 1-Click OAuth 자동 가입 & API 연동
 */
import { useState, useEffect } from 'react';
import { listSnsAccounts, saveSnsToken, masterBatchConnect, disconnectSnsAccount, resetAllSnsAccounts } from '../api';

const PLATFORM_STEPS = [
  {
    id: 'youtube',
    icon: '▶️',
    label: 'YouTube',
    color: '#ff0000',
    authType: 'google_oauth',
    difficulty: '⭐',
    steps: [
      '구글 계정으로 로그인 (아래 1-Click 버튼 클릭)',
      '팝업 화면에서 YouTube 채널 관리 권한 [승인]',
      '승인 완료 시 Access Token + Refresh Token이 서버에 자동 저장됨',
    ],
    guideUrl: 'https://console.cloud.google.com',
    scope: 'YouTube 채널 업로드, 게시물 작성',
  },
  {
    id: 'x',
    icon: '✖️',
    label: 'X (Twitter)',
    color: '#e7e9ea',
    authType: 'oauth2',
    difficulty: '⭐⭐',
    steps: [
      '아래 1-Click 연동 버튼 클릭',
      'X.com 로그인 및 앱 권한 [승인]',
      '트윗 게시용 OAuth 2.0 토큰 자동 저장',
    ],
    guideUrl: 'https://developer.x.com',
    scope: '트윗 게시, 스레드 작성',
  },
  {
    id: 'instagram',
    icon: '📸',
    label: 'Instagram',
    color: '#e4405f',
    authType: 'meta_oauth',
    difficulty: '⭐⭐⭐',
    steps: [
      'Meta (Facebook) 계정으로 1-Click 연동',
      'Instagram 비즈니스/크리에이터 계정 선택',
      '피드 및 Reels 게시 권한 자동 승인 및 토큰 저장',
    ],
    guideUrl: 'https://developers.facebook.com',
    scope: '피드 게시, Reels 업로드, 스토리 공유',
  },
  {
    id: 'facebook',
    icon: '📘',
    label: 'Facebook',
    color: '#1877f2',
    authType: 'meta_oauth',
    difficulty: '⭐',
    steps: [
      'Facebook 계정으로 1-Click 연동',
      '게시물을 게시할 페이스북 페이지 선택 및 [승인]',
      '페이지 게시용 액세스 토큰 자동 발급 및 저장',
    ],
    guideUrl: 'https://developers.facebook.com',
    scope: '페이지 게시물 작성, 미디어 업로드',
  },
  {
    id: 'threads',
    icon: '🧵',
    label: 'Threads',
    color: '#ffffff',
    authType: 'meta_oauth',
    difficulty: '⭐⭐',
    steps: [
      'Meta 계정 1-Click 연동 클릭',
      'Threads 프로필 연결 [승인]',
      '스레드 작성 권한 토큰 자동 수집',
    ],
    guideUrl: 'https://developers.facebook.com/docs/threads',
    scope: 'Threads 게시물 작성 및 미디어 업로드',
  },
  {
    id: 'tiktok',
    icon: '🎵',
    label: 'TikTok',
    color: '#69c9d0',
    authType: 'oauth2',
    difficulty: '⭐⭐',
    steps: [
      'TikTok 1-Click 연동 클릭',
      'TikTok 로그인 후 Content Posting API [승인]',
      '동영상 업로드 권한 토큰 자동 저장',
    ],
    guideUrl: 'https://developers.tiktok.com',
    scope: '비디오 업로드, 캡션 게시',
  },
  {
    id: 'pinterest',
    icon: '📌',
    label: 'Pinterest',
    color: '#e60023',
    authType: 'oauth2',
    difficulty: '⭐',
    steps: [
      'Pinterest 1-Click 연동 클릭',
      'Pinterest 계정 승인',
      '핀 작성 및 보드 관리 권한 토큰 자동 수집',
    ],
    guideUrl: 'https://developers.pinterest.com',
    scope: '핀 생성, 보드 관리, 이미지 업로드',
  },
  {
    id: 'linkedin',
    icon: '💼',
    label: 'LinkedIn',
    color: '#0a66c2',
    authType: 'oauth2',
    difficulty: '⭐',
    steps: [
      'LinkedIn 계정으로 1-Click 연동 클릭',
      '비즈니스/프로필 포스팅 권한 [승인]',
      '전문가 포스트 작성용 OAuth 토큰 자동 수집',
    ],
    guideUrl: 'https://www.linkedin.com/developers/',
    scope: '비즈니스 포스트 작성, 아티클 공유',
  },
  {
    id: 'medium',
    icon: '✍️',
    label: 'Medium',
    color: '#00ab6c',
    authType: 'oauth2',
    difficulty: '⭐',
    steps: [
      'Medium 계정 1-Click 연동 클릭',
      '아티클 퍼블리싱 권한 [승인]',
      '장문 아티클 포스팅 토큰 자동 수집',
    ],
    guideUrl: 'https://medium.com/me/settings/integration-tokens',
    scope: '장문 블로그 아티클 퍼블리싱',
  },
  {
    id: 'tumblr',
    icon: '🔮',
    label: 'Tumblr',
    color: '#36465d',
    authType: 'oauth2',
    difficulty: '⭐',
    steps: [
      'Tumblr 계정 1-Click 연동 클릭',
      '블로그 포스트 작성 권한 [승인]',
      '이미지/포스트 작성 토큰 자동 수집',
    ],
    guideUrl: 'https://www.tumblr.com/docs/en/api/v2',
    scope: '블로그 포스트 작성, 태그 마케팅',
  },
  {
    id: 'reddit',
    icon: '🤖',
    label: 'Reddit',
    color: '#ff4500',
    authType: 'oauth2',
    difficulty: '⭐⭐',
    steps: [
      'Reddit 계정 1-Click 연동 클릭',
      '서브레디트 게시물 작성 권한 [승인]',
      'Reddit API 토큰 자동 수집',
    ],
    guideUrl: 'https://www.reddit.com/dev/api',
    scope: '서브레디트 포스팅, 커뮤니티 공유',
  },
];

export default function Onboarding({ currentUser }) {
  const userId = currentUser?.id || 1;
  const [expanded, setExpanded] = useState('youtube');
  const [connectedAccounts, setConnectedAccounts] = useState({});
  const [tokens, setTokens] = useState({});
  const [notification, setNotification] = useState(null);

  // ── 마스터 1-Click 전체 일괄 연동 ──────────────────────
  const [masterGoogleEmail, setMasterGoogleEmail] = useState(() => currentUser?.email || '');
  const [masterLoading, setMasterLoading] = useState(false);

  useEffect(() => {
    if (currentUser?.email) {
      setMasterGoogleEmail(currentUser.email);
    }
  }, [currentUser]);

  const handleMasterConnect = async () => {
    if (!masterGoogleEmail || !masterGoogleEmail.includes('@')) {
      alert('올바른 구글 이메일 주소를 입력해주세요.');
      return;
    }
    setMasterLoading(true);
    try {
      const res = await masterBatchConnect({ google_email: masterGoogleEmail, user_id: userId });
      setNotification({ type: 'success', text: `🚀 ${res.message}` });
      await fetchAccounts();
    } catch (e) {
      setNotification({ type: 'error', text: `⚠️ 마스터 일괄 연동 오류: ${e.message}` });
    } finally {
      setMasterLoading(false);
    }
  };

  // ── 릴레이 팝업 순차 인증 (YouTube -> Meta -> X -> TikTok -> Tumblr) ──
  const handleStartRelayOAuth = () => {
    const platformList = [
      { id: 'youtube', label: 'YouTube (Google)' },
      { id: 'meta', label: 'Meta (Instagram / Facebook / Threads)' },
      { id: 'x', label: 'X (Twitter)' },
      { id: 'tiktok', label: 'TikTok' },
      { id: 'tumblr', label: 'Tumblr' },
    ];
    let idx = 0;

    const openPopup = () => {
      if (idx >= platformList.length) {
        alert('🎉 모든 SNS 플랫폼의 릴레이 OAuth 인증 팝업 연동 과정이 종료되었습니다!');
        fetchAccounts();
        return;
      }

      const p = platformList[idx];
      idx++;
      const url = `https://jcom.ai.kr/snsauto/auth/login/${p.id}`;
      const win = window.open(url, `oauth_win_${p.id}`, 'width=650,height=750,scrollbars=yes');

      const timer = setInterval(() => {
        if (!win || win.closed) {
          clearInterval(timer);
          fetchAccounts();
          if (idx < platformList.length) {
            setTimeout(() => {
              if (window.confirm(`✅ [${p.label}] 인증 단계가 종료되었습니다.\n다음 순서인 [${platformList[idx].label}] 인증 팝업창을 열까요?`)) {
                openPopup();
              }
            }, 300);
          } else {
            alert('🎉 전체 플랫폼 릴레이 OAuth 연동이 완료되었습니다! [1초 일괄 토큰 수집] 버튼을 눌러 연동 상태를 동기화하세요.');
            fetchAccounts();
          }
        }
      }, 1000);
    };

    openPopup();
  };

  const fetchAccounts = async () => {
    try {
      const list = await listSnsAccounts(userId);
      const map = {};
      list.forEach(acc => {
        if (acc.connected) map[acc.platform] = acc;
      });
      setConnectedAccounts(map);
    } catch (e) {
      console.error('계정 목록 불러오기 실패:', e);
    }
  };

  useEffect(() => {
    fetchAccounts();

    const handlePopupMessage = (e) => {
      if (e.data?.type === 'OAUTH_SUCCESS') {
        fetchAccounts();
        setNotification({ type: 'success', text: `🎉 ${e.data.platform.toUpperCase()} 계정이 성공적으로 연동되었습니다!` });
      }
    };
    window.addEventListener('message', handlePopupMessage);

    // URL Query Params 감지 (OAuth Callback 성공/실패 통보)
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const platform = params.get('platform');
    const msg = params.get('msg');

    if (status === 'success' && platform) {
      setNotification({ type: 'success', text: `🎉 ${platform.toUpperCase()} 계정이 1-Click OAuth로 연동되었습니다!` });
      fetchAccounts();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'error') {
      setNotification({ type: 'error', text: `⚠️ 연동 중 오류가 발생했습니다: ${msg || '인증 실패'}` });
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => window.removeEventListener('message', handlePopupMessage);
  }, [userId]);

  const handleManualSave = async (platformId) => {
    const data = tokens[platformId];
    if (!data?.access_token) {
      alert('Access Token을 입력해주세요.');
      return;
    }
    try {
      await saveSnsToken({
        user_id: userId,
        platform: platformId,
        access_token: data.access_token,
        account_name: data.account_name || `${platformId} Account`,
      });
      alert(`✅ ${platformId.toUpperCase()} 계정이 성공적으로 연동되었습니다!`);
      fetchAccounts();
    } catch (e) {
      alert(`⚠️ 연동 실패: ${e.message}`);
    }
  };

  const handleDisconnectPlatform = async (platformId) => {
    if (window.confirm(`${platformId.toUpperCase()} 계정 연동을 해제하시겠습니까?`)) {
      try {
        await disconnectSnsAccount(platformId, userId);
        setNotification({ type: 'success', text: `🗑️ ${platformId.toUpperCase()} 연동이 해제되었습니다.` });
        fetchAccounts();
      } catch (e) {
        alert(`연동 해제 실패: ${e.message}`);
      }
    }
  };

  const handleResetAll = async () => {
    if (window.confirm('모든 SNS 계정의 연동 정보를 초기화하시겠습니까?')) {
      try {
        await resetAllSnsAccounts(userId);
        setNotification({ type: 'success', text: '🗑️ 모든 SNS 계정 연동 정보가 초기화되었습니다.' });
        fetchAccounts();
      } catch (e) {
        alert(`초기화 실패: ${e.message}`);
      }
    }
  };

  const connectedCount = Object.keys(connectedAccounts).length;

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

      {/* 헤더 */}
      <div className="section-header flex justify-between items-center">
        <div>
          <h2>🚀 SNS 계정 1-Click 가입 & API 자동 연동</h2>
          <p className="section-subtitle">
            구글 계정 1개로 버튼 하나만 누르면 Access Token과 Refresh Token이 자동 수집·저장됩니다.
          </p>
        </div>
        {connectedCount > 0 && (
          <button
            id="btn-reset-all-sns"
            className="btn btn-secondary btn-sm flex items-center gap-1"
            onClick={handleResetAll}
            style={{ fontSize: '0.8rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' }}
          >
            🗑️ 전체 연동 초기화
          </button>
        )}
      </div>

      {/* 💥 [신규] 마스터 1-Click 전체 11대 SNS 일괄 연동 카드 💥 */}
      <div style={{
        padding: '1.5rem',
        marginBottom: '1.5rem',
        background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.15))',
        border: '1px solid rgba(124,58,237,0.4)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 8px 32px rgba(124,58,237,0.15)',
      }}>
        <div className="flex items-center gap-3" style={{ marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.8rem' }}>🔥</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              구글 계정 1개로 11대 SNS 전체 1초 일괄 연동 (Master 1-Click)
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              대표 구글 이메일을 입력하고 아래 버튼을 누르면 YouTube, X, Instagram, Facebook, Threads, TikTok, Pinterest, LinkedIn, Medium, Tumblr, Reddit의 Access Token이 한번에 자동 수집됩니다.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            id="master-google-email-input"
            className="form-input"
            style={{ flex: 1, minWidth: '220px', background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
            type="email"
            placeholder="예: koreameme001@gmail.com"
            value={masterGoogleEmail}
            onChange={e => setMasterGoogleEmail(e.target.value)}
          />

          {/* 🌐 구글 및 SNS 계정 릴레이 OAuth 팝업 연동 버튼 */}
          <button
            id="btn-master-real-oauth"
            className="btn btn-primary"
            onClick={handleStartRelayOAuth}
            style={{
              padding: '0.75rem 1.25rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #ff0000, #7c3aed)',
              color: 'white',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            🌐 구글 및 SNS 차례대로 팝업 연동
          </button>

          {/* ⚡ 11대 SNS 일괄 토큰 수집 버튼 */}
          <button
            id="btn-master-batch-connect"
            className="btn btn-secondary"
            disabled={masterLoading}
            onClick={handleMasterConnect}
            style={{
              padding: '0.75rem 1.25rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {masterLoading ? '⚡ 수집 동기화 중...' : '⚡ 11대 SNS 1초 일괄 토큰 수집'}
          </button>
        </div>
      </div>

      {/* 전체 진행률 */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>전체 연동 진행률</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {connectedCount} / {PLATFORM_STEPS.length} 완료
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(connectedCount / PLATFORM_STEPS.length) * 100}%` }}
          />
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {PLATFORM_STEPS.map(p => (
            <span
              key={p.id}
              style={{ fontSize: '1.1rem', opacity: connectedAccounts[p.id] ? 1 : 0.3 }}
              title={`${p.label} (${connectedAccounts[p.id] ? '연동됨' : '미연동'})`}
            >
              {p.icon}
            </span>
          ))}
        </div>
      </div>

      {/* 구글 계정 정보 배너 */}
      <div style={{
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        background: 'linear-gradient(135deg, rgba(66,133,244,0.15), rgba(124,58,237,0.1))',
        border: '1px solid rgba(66,133,244,0.3)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <div style={{ fontSize: '2rem' }}>🌐</div>
        <div>
          <div style={{ fontWeight: 700, marginBottom: '2px' }}>1-Click OAuth 자동 연동 시스템</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            아래 <b>[1초 간편 OAuth 연동]</b> 버튼을 누르면 권한 승인 후 Access Token과 Refresh Token이 DB에 자동 수집됩니다.
          </div>
        </div>
      </div>

      {/* 플랫폼별 가이드 아코디언 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {PLATFORM_STEPS.map(platform => {
          const isOpen = expanded === platform.id;
          const account = connectedAccounts[platform.id];
          const isConnected = !!account;

          return (
            <div
              key={platform.id}
              className="card"
              style={{
                border: isConnected
                  ? '1px solid rgba(16,185,129,0.4)'
                  : isOpen
                    ? `1px solid ${platform.color}44`
                    : 'var(--border-subtle)',
                padding: 0,
                overflow: 'hidden',
              }}
            >
              {/* 아코디언 헤더 */}
              <button
                id={`onboard-toggle-${platform.id}`}
                onClick={() => setExpanded(isOpen ? '' : platform.id)}
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textAlign: 'left',
                  color: 'var(--text-primary)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: '1.4rem' }}>{platform.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {platform.label}
                      {account?.account_name && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--accent-light)', marginLeft: '8px', fontWeight: 400 }}>
                          ({account.account_name})
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {platform.scope} · 난이도 {platform.difficulty}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <>
                      <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ✅ 연동 완료 <span style={{ opacity: 0.8, fontSize: '0.65rem' }}>(🔒 DB 토큰 수집됨)</span>
                      </span>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.7rem', color: '#ef4444', padding: '2px 8px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDisconnectPlatform(platform.id);
                        }}
                      >
                        ❌ 해제
                      </button>
                    </>
                  ) : (
                    <span className="badge badge-yellow">⚠️ 미연동</span>
                  )}
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {isOpen ? '▲' : '▼'}
                  </span>
                </div>
              </button>

              {/* 아코디언 본문 */}
              {isOpen && (
                <div style={{
                  padding: '0 1.25rem 1.25rem',
                  borderTop: `1px solid ${platform.color}22`,
                }}>
                  <div className="grid-2" style={{ gap: '1.5rem', marginTop: '1rem' }}>
                    {/* 1-Click OAuth 연동 (주요 기능) */}
                    <div style={{
                      padding: '1.25rem',
                      background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(6,182,212,0.04))',
                      border: '1px solid rgba(124,58,237,0.2)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-light)', marginBottom: '0.5rem' }}>
                          ⚡ 1-Click OAuth 자동 연동 (추천)
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.4' }}>
                          버튼을 누르고 승인하면 Access Token 및 Refresh Token을 자동으로 수집하여 DB에 암호화 저장합니다.
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                          {platform.steps.map((step, i) => (
                            <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              • {step}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {/* 기본 OAuth 연동 버튼 */}
                        <a
                          id={`btn-oauth-login-${platform.id}`}
                          href={`https://jcom.ai.kr/snsauto/auth/login/${platform.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            window.open(
                              `https://jcom.ai.kr/snsauto/auth/login/${platform.id}`,
                              `oauth_win_${platform.id}`,
                              'width=650,height=750,scrollbars=yes'
                            );
                          }}
                          className="btn btn-primary"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            background: platform.color === '#ffffff' || platform.color === '#e7e9ea'
                              ? 'linear-gradient(135deg, #7c3aed, #06b6d4)'
                              : platform.color,
                            color: 'white',
                            fontWeight: 700,
                            textDecoration: 'none',
                            padding: '0.75rem 1rem',
                          }}
                        >
                          🌐 {platform.label} 1초 간편 OAuth 연동
                        </a>

                        {/* 연동된 경우에도 다른 계정으로 재연동 허용 */}
                        {isConnected && (
                          <a
                            id={`btn-oauth-relogin-${platform.id}`}
                            href={`https://jcom.ai.kr/snsauto/auth/login/${platform.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              window.open(
                                `https://jcom.ai.kr/snsauto/auth/login/${platform.id}`,
                                `oauth_win_${platform.id}`,
                                'width=650,height=750,scrollbars=yes'
                              );
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '0.5rem 1rem',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: '0.78rem',
                              color: 'var(--text-secondary)',
                              textDecoration: 'none',
                              background: 'rgba(255,255,255,0.04)',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                          >
                            🔄 다른 계정으로 재연동
                          </a>
                        )}
                      </div>
                    </div>

                    {/* 수동 토큰 직접 입력 (보조) */}
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                        🔑 토큰 정보 상태
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <div className="form-group">
                          <label className="form-label">Access Token</label>
                          <input
                            id={`token-input-${platform.id}`}
                            className="form-input"
                            type="text"
                            disabled={isConnected}
                            value={isConnected ? '🔒 [자동 수집된 OAuth 토큰이 DB에 안전하게 암호화 저장되어 있습니다]' : (tokens[platform.id]?.access_token || '')}
                            placeholder="발급받은 Access Token 입력"
                            onChange={e => setTokens(prev => ({
                              ...prev,
                              [platform.id]: { ...prev[platform.id], access_token: e.target.value }
                            }))}
                            style={{
                              borderColor: isConnected ? '#10b981' : undefined,
                              color: isConnected ? '#10b981' : undefined,
                              background: isConnected ? 'rgba(16,185,129,0.08)' : undefined,
                              fontSize: '0.78rem'
                            }}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">계정 이름 (선택)</label>
                          <input
                            id={`account-name-${platform.id}`}
                            className="form-input"
                            placeholder="@username 또는 채널명"
                            onChange={e => setTokens(prev => ({
                              ...prev,
                              [platform.id]: { ...prev[platform.id], account_name: e.target.value }
                            }))}
                          />
                        </div>

                        <div className="flex gap-2" style={{ marginTop: '0.25rem' }}>
                          <button
                            id={`btn-connect-${platform.id}`}
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleManualSave(platform.id)}
                          >
                            ✅ 수동 토큰 등록
                          </button>
                          <a
                            href={platform.guideUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-sm"
                          >
                            🌐 개발자 콘솔
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
