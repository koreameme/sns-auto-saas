/**
 * Dashboard.jsx - 메인 대시보드 홈 화면
 * AI 키 풀 현황 + SNS 계정 연동 상태 + 포스팅 통계
 */
import { useEffect, useState } from 'react';
import { getPoolStatus, listSnsAccounts, listKeys } from '../api';
import OnboardingWizard from '../components/OnboardingWizard';

const PLATFORM_INFO = {
  youtube:   { icon: '▶️', label: 'YouTube',    color: '#ff0000' },
  x:         { icon: '✖️', label: 'X (Twitter)', color: '#ffffff' },
  instagram: { icon: '📸', label: 'Instagram',  color: '#e4405f' },
  facebook:  { icon: '📘', label: 'Facebook',   color: '#1877f2' },
  threads:   { icon: '🧵', label: 'Threads',    color: '#ffffff' },
  tiktok:    { icon: '🎵', label: 'TikTok',     color: '#69c9d0' },
  pinterest: { icon: '📌', label: 'Pinterest',  color: '#e60023' },
  linkedin:  { icon: '💼', label: 'LinkedIn',   color: '#0a66c2' },
  medium:    { icon: '✍️', label: 'Medium',     color: '#00ab6c' },
  tumblr:    { icon: '🔮', label: 'Tumblr',     color: '#36465d' },
  reddit:    { icon: '🤖', label: 'Reddit',     color: '#ff4500' },
};

const PROVIDER_COLORS = {
  groq:    { color: '#f59e0b', label: 'Groq' },
  mistral: { color: '#7c3aed', label: 'Mistral' },
  cohere:  { color: '#06b6d4', label: 'Cohere' },
  openai:  { color: '#10b981', label: 'OpenAI' },
  gemini:  { color: '#4f46e5', label: 'Gemini' },
  anthropic: { color: '#d97706', label: 'Anthropic' },
  openrouter: { color: '#ec4899', label: 'OpenRouter' },
};

export default function Dashboard({ currentUser }) {
  const [poolStatus, setPoolStatus] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [userKeys, setUserKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [installInfo, setInstallInfo] = useState(null);
  const [showWizard, setShowWizard] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    async function load() {
      try {
        // Fetch installation guard status
        if (currentUser?.id) {
          const res = await fetch(`/api/user/installation-status?user_id=${currentUser.id}`);
          if (res.ok) {
            const data = await res.json();
            setInstallInfo(data);
            if (data.installation_status !== 'COMPLETED') {
              setShowWizard(true);
            }
          }
        }

        if (isAdmin) {
          const [pool, accs] = await Promise.all([
            getPoolStatus(),
            listSnsAccounts(currentUser?.id),
          ]);
          setPoolStatus(pool);
          setAccounts(accs);
        } else {
          const [keys, accs] = await Promise.all([
            listKeys(currentUser?.id),
            listSnsAccounts(currentUser?.id),
          ]);
          setUserKeys(keys || []);
          setAccounts(accs || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000); // 30초 자동 갱신
    return () => clearInterval(interval);
  }, [currentUser?.id, isAdmin]);

  const connectedPlatforms = accounts.map(a => a.platform);
  const allPlatforms = Object.keys(PLATFORM_INFO);
  const activeUserKeysCount = userKeys.filter(k => k.status === 'active').length;

  const handleWizardComplete = (blogUrl) => {
    setShowWizard(false);
    setInstallInfo(prev => ({
      ...prev,
      installation_status: 'COMPLETED',
      blog_url: blogUrl
    }));
  };

  return (
    <div className="page-container">
      {/* 3단계 온보딩 위저드 모달 */}
      {showWizard && (
        <OnboardingWizard 
          user={currentUser} 
          onComplete={handleWizardComplete} 
        />
      )}

      {/* 헤더 및 연동 완료 헬스체크 배지 */}
      <div className="section-header flex items-center justify-between">
        <div>
          <h2>대시보드</h2>
          <p className="section-subtitle">SaaS AutoPost Pro의 전체 현황을 한눈에 확인하세요.</p>
        </div>

        {installInfo?.installation_status === 'COMPLETED' && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-center gap-3 shadow-lg">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <div className="text-xs font-bold text-emerald-400">🟢 깃허브 블로그 연동 완료</div>
              <a 
                href={installInfo.blog_url} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-slate-300 hover:text-emerald-300 underline font-mono"
              >
                {installInfo.blog_url} ↗
              </a>
            </div>
          </div>
        )}
      </div>

      {/* 요약 통계 카드 */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        {[
          isAdmin
            ? { icon: '🤖', label: 'AI API 키 총합', value: '66개', sub: 'Groq+Mistral+Cohere', badge: 'badge-purple' }
            : {
                icon: '🔑',
                label: '내 등록 AI API 키',
                value: `${userKeys.length}개`,
                sub: userKeys.length > 0 ? `${activeUserKeysCount}개 정상 작동` : '키 등록 필요',
                badge: userKeys.length > 0 ? 'badge-purple' : 'badge-yellow',
              },
          {
            icon: '🔗',
            label: '연동된 플랫폼',
            value: `${connectedPlatforms.length}/${allPlatforms.length}`,
            sub: `${allPlatforms.length}대 SNS 플랫폼`,
            badge: 'badge-cyan',
          },
          {
            icon: '💳',
            label: '현재 구독 플랜',
            value: (currentUser?.plan || 'free').toUpperCase(),
            sub: `하루 ${currentUser?.daily_limit || 5}회 생성`,
            badge: 'badge-green',
          },
          {
            icon: '⚡',
            label: '시스템 라우터 상태',
            value: '정상',
            sub: '실시간 자동 폴백',
            badge: 'badge-green',
          },
        ].map((stat, i) => (
          <div key={i} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{stat.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0' }}>{stat.label}</div>
            <span className={`badge ${stat.badge}`}>{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* 메인 그리드 */}
      <div className="grid-2" style={{ gap: '1.5rem' }}>
        {/* AI 키 풀/사용자 키 현황 카드 */}
        <div className="card card-glow">
          <div className="card-header">
            <div className="card-title">
              {isAdmin ? '🤖 마스터 66개 AI API 키 풀 현황' : '🔑 내 등록 AI API 키 현황'}
            </div>
            <span className="badge badge-green">
              <span className="status-dot online" style={{ width: '6px', height: '6px' }}></span>
              Live
            </span>
          </div>

          {loading ? (
            <div>
              {[1, 2, 3].map(i => (
                <div key={i} className="shimmer" style={{ height: '60px', marginBottom: '0.75rem' }} />
              ))}
            </div>
          ) : isAdmin ? (
            /* 관리자: 66개 풀 모니터링 */
            poolStatus ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {Object.entries(poolStatus).map(([provider, info]) => {
                  const meta = PROVIDER_COLORS[provider] || { color: '#9090b0', label: provider };
                  const pct = info.total > 0 ? Math.round((info.available / info.total) * 100) : 0;
                  return (
                    <div key={provider}>
                      <div className="flex justify-between items-center" style={{ marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                          {meta.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {info.available}/{info.total} 사용 가능
                          </span>
                          <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>{pct}%</span>
                        </div>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${meta.color}88, ${meta.color})`
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  color: 'var(--accent-success)',
                }}>
                  ✅ 마스터 총 {Object.values(poolStatus).reduce((s, v) => s + v.total, 0)}개의 AI API 키가 Round-Robin으로 가동 중
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                백엔드 서버에 연결할 수 없습니다.
              </div>
            )
          ) : (
            /* 일반 회원: 등록한 개별 API 키 현황 */
            userKeys.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {userKeys.map(k => {
                  const meta = PROVIDER_COLORS[k.provider] || { color: '#7c3aed', label: k.provider.toUpperCase() };
                  const isExhausted = k.status === 'exhausted';
                  return (
                    <div
                      key={k.id}
                      className="flex items-center justify-between"
                      style={{
                        padding: '0.75rem 1rem',
                        background: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${isExhausted ? 'rgba(245,158,11,0.4)' : `${meta.color}33`}`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div style={{
                          width: '10px', height: '10px', borderRadius: '50%',
                          background: isExhausted ? '#f59e0b' : '#10b981',
                        }} />
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                            {k.label || meta.label}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {k.api_key_masked}
                          </div>
                        </div>
                      </div>
                      <span className={`badge ${isExhausted ? 'badge-yellow' : 'badge-green'}`} style={{ fontSize: '0.7rem' }}>
                        {k.status_label || (isExhausted ? '⚠️ 쿼터 소진' : '🟢 정상')}
                      </span>
                    </div>
                  );
                })}
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  background: 'rgba(124,58,237,0.08)',
                  border: '1px solid rgba(124,58,237,0.2)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  color: 'var(--accent-light)',
                }}>
                  💡 회원님의 개인 AI API 키 {userKeys.length}개가 독립적으로 동적 연결되어 있습니다.
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔑</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  등록된 AI API 키가 없습니다
                </div>
                <p style={{ fontSize: '0.8rem', margin: '0.5rem 0 1rem', color: 'var(--text-secondary)' }}>
                  Groq, Gemini 등 무료 API 키를 등록하고 포스팅 생성을 시작하세요!
                </p>
                <a href="#/apikeys" className="btn btn-primary btn-sm" style={{ display: 'inline-flex' }}>
                  🔑 AI API 키 등록하러 가기 ↗
                </a>
              </div>
            )
          )}
        </div>

        {/* 11대 SNS 플랫폼 연동 현황 */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🔗 11대 SNS 플랫폼 연동 현황</div>
            <span className="badge badge-purple">{connectedPlatforms.length}/{allPlatforms.length} 연동 완료</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '0.6rem',
            maxHeight: '340px',
            overflowY: 'auto',
          }}>
            {allPlatforms.map(p => {
              const info = PLATFORM_INFO[p];
              const connected = connectedPlatforms.includes(p);
              return (
                <div
                  key={p}
                  className="flex items-center justify-between"
                  style={{
                    padding: '0.6rem 0.75rem',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${connected ? 'rgba(16,185,129,0.2)' : 'var(--border-subtle)'}`,
                    transition: 'all 0.2s',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '1rem' }}>{info.icon}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{info.label}</span>
                  </div>
                  <span className={`badge ${connected ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: '0.65rem' }}>
                    {connected ? '✅ 연동됨' : '미연동'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 빠른 시작 가이드 */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-title" style={{ marginBottom: '1rem' }}>🚀 빠른 시작 가이드</div>
        <div className="grid-3">
          {[
            { step: '1', icon: '🔑', title: 'SNS 계정 연동', desc: '좌측 메뉴 → SNS 계정 연동에서 구글 계정으로 각 플랫폼을 연결하세요.' },
            { step: '2', icon: '✨', title: 'OSMU 스튜디오 사용', desc: '유튜브 대본을 입력하면 11개 플랫폼용 콘텐츠가 AI로 자동 생성됩니다.' },
            { step: '3', icon: '📤', title: '자동/수동 포스팅', desc: '생성된 콘텐츠를 검토 후 원클릭으로 동시 발행하거나 예약 설정하세요.' },
          ].map(item => (
            <div key={item.step} style={{
              padding: '1rem',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem' }}>
                <div style={{
                  width: '22px', height: '22px',
                  background: 'var(--accent-primary)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 700, color: 'white',
                }}>
                  {item.step}
                </div>
                <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.title}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
