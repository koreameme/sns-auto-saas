/**
 * ApiKeyManager.jsx - 다양한 AI 모델 API 키 관리 및 상세 발급 가이드
 * 일반 사용자는 본인의 API 키(Groq, Gemini, OpenAI 등)를 등록하여 독립 사용
 * 최고 관리자는 내장 66개 키 풀 통합 모니터링
 */
import { useState, useEffect } from 'react';
import { listKeys, addKey, deleteKey, getPoolStatus } from '../api';

const AI_GUIDES = [
  {
    id: 'groq',
    label: 'Groq (⚡ 100% 무료 & 초고속 Llama3)',
    icon: '⚡',
    badge: '🎁 100% 무료 추천',
    color: '#f59e0b',
    desc: '신용카드 등록 없이 구글 계정만 있으면 1초 만에 무료 API 키 발급! Llama 3.x 기반 초고속 생성.',
    url: 'https://console.groq.com/keys',
    steps: [
      '1. 위의 [🔑 Groq 무료 API 키 받기] 버튼 클릭 후 구글 로그인',
      '2. 화면 오른쪽 상단의 [Create API Key] 버튼 클릭',
      '3. 생성된 gsk-... 형식의 키를 복사하여 아래에 입력 후 저장',
    ],
    placeholder: 'gsk_...',
  },
  {
    id: 'gemini',
    label: 'Google Gemini (🤖 무료 AI API)',
    icon: '🤖',
    badge: '🎁 100% 무료 추천',
    color: '#3b82f6',
    desc: '구글의 최고 성능 Gemini 1.5 Flash / Pro 모델 무료 제공.',
    url: 'https://aistudio.google.com/app/apikey',
    steps: [
      '1. 위의 [🔑 Gemini API 키 받기] 버튼 클릭 (Google AI Studio)',
      '2. [Create API Key] 버튼 클릭 후 프로젝트 선택',
      '3. 생성된 AIzaSy... 키를 복사하여 아래에 등록',
    ],
    placeholder: 'AIzaSy...',
  },
  {
    id: 'openai',
    label: 'OpenAI (🧠 ChatGPT / GPT-4o)',
    icon: '🧠',
    badge: '전 세계 표준',
    color: '#10b981',
    desc: 'GPT-4o, GPT-4o-mini 등 표준 고품질 마케팅 카피 라이팅 지원.',
    url: 'https://platform.openai.com/api-keys',
    steps: [
      '1. OpenAI Platform 로그인 후 API Keys 메뉴 이동',
      '2. [Create new secret key] 클릭 후 키 이름 입력',
      '3. sk-proj-... 로 시작하는 Secret Key 복사 후 입력',
    ],
    placeholder: 'sk-proj-...',
  },
  {
    id: 'mistral',
    label: 'Mistral AI (🌟 유럽 대표 다국어 LLM)',
    icon: '🌟',
    badge: '다국어 추천',
    color: '#7c3aed',
    desc: 'Mistral Large 및 Codestral 기반 정교한 블로그 및 SNS 긴글 작성.',
    url: 'https://console.mistral.ai/api-keys',
    steps: [
      '1. Mistral Console 접속 및 로그인',
      '2. [API Keys] -> [Create new key] 클릭',
      '3. 발급된 API 키를 아래에 입력',
    ],
    placeholder: 'mistral_key_...',
  },
  {
    id: 'cohere',
    label: 'Cohere AI (🔷 Command R+ 캡션 특화)',
    icon: '🔷',
    badge: '요약/캡션 특화',
    color: '#06b6d4',
    desc: '해시태그, 짧은 트윗, 인스타그램 캡션 요약에 최적화된 모델.',
    url: 'https://dashboard.cohere.com/api-keys',
    steps: [
      '1. Cohere Dashboard 로그인',
      '2. API Keys 항목에서 Trial Key 생성 또는 기존 키 복사',
      '3. 아래에 입력 후 저장',
    ],
    placeholder: 'cohere_key_...',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter (🌐 100여개 LLM 통합)',
    icon: '🌐',
    badge: '올인원 통합',
    color: '#8b5cf6',
    desc: 'API 키 1개로 Claude 3.5, GPT-4o, Llama3 등 모든 모델 사용 가능.',
    url: 'https://openrouter.ai/keys',
    steps: [
      '1. OpenRouter.ai 접속 및 로그인',
      '2. [Create Key] 클릭 후 이름 입력',
      '3. sk-or-v1-... 형식 키 복사 후 입력',
    ],
    placeholder: 'sk-or-v1-...',
  },
  {
    id: 'anthropic',
    label: 'Anthropic (🎭 Claude 3.5 Sonnet)',
    icon: '🎭',
    badge: '자연스러운 문장력',
    color: '#d97706',
    desc: '인간 작가가 쓴 듯 매우 자연스럽고 매력적인 톤앤매너 제공.',
    url: 'https://console.anthropic.com/settings/keys',
    steps: [
      '1. Anthropic Console 로그인',
      '2. [API Keys] -> [Create Key] 클릭',
      '3. sk-ant-api... 키 복사 후 등록',
    ],
    placeholder: 'sk-ant-api03-...',
  },
];

const BUILTIN_COUNTS = {
  groq: 22, mistral: 22, cohere: 22,
};

export default function ApiKeyManager({ currentUser }) {
  const userId = currentUser?.id || 1;
  const isAdmin = currentUser?.role === 'admin';

  const [customKeys, setCustomKeys] = useState([]);
  const [poolStatus, setPoolStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState('groq');
  const [form, setForm] = useState({ provider: 'groq', api_key: '', label: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const loadData = async () => {
    try {
      const keys = await listKeys(userId);
      setCustomKeys(keys);
      if (isAdmin) {
        const pool = await getPoolStatus();
        setPoolStatus(pool);
      }
    } catch (e) {
      console.error('API 키 데이터 로드 오류:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [userId, isAdmin]);

  const handleAddKey = async () => {
    if (!form.api_key.trim()) {
      alert('API 키 값을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await addKey({
        user_id: userId,
        provider: form.provider,
        api_key: form.api_key.trim(),
        label: form.label.trim() || `${form.provider.toUpperCase()} 키`,
      });
      setMessage({ type: 'success', text: `🎉 ${form.provider.toUpperCase()} API 키가 성공적으로 등록되었습니다!` });
      setForm({ provider: selectedGuide, api_key: '', label: '' });
      setShowForm(false);
      await loadData();
    } catch (e) {
      setMessage({ type: 'error', text: `❌ ${e.message}` });
    } finally {
      setSubmitting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleDelete = async (id, provider) => {
    if (!confirm(`${provider.toUpperCase()} 키를 삭제하시겠습니까?`)) return;
    try {
      await deleteKey(id, userId);
      setMessage({ type: 'success', text: '✅ API 키가 삭제되었습니다.' });
      await loadData();
    } catch (e) {
      setMessage({ type: 'error', text: `❌ ${e.message}` });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const activeGuideObj = AI_GUIDES.find(g => g.id === selectedGuide) || AI_GUIDES[0];

  return (
    <div className="page-container">
      {/* 헤더 */}
      <div className="section-header flex justify-between items-center">
        <div>
          <h2>🔑 AI API 키 관리 & 발급 센터</h2>
          <p className="section-subtitle">
            {isAdmin
              ? '👑 최고 관리자 모드: 내장 66개 마스터 키 풀 + 추가 커스텀 키를 관리합니다.'
              : '👤 회원님 본인의 AI API 키(Groq / Gemini / OpenAI 등)를 등록하여 AI 포스팅을 자유롭게 작성하세요.'}
          </p>
        </div>
        <button
          id="btn-add-api-key"
          className="btn btn-primary"
          onClick={() => setShowForm(v => !v)}
        >
          {showForm ? '✖ 닫기' : '+ 새 API 키 추가'}
        </button>
      </div>

      {/* 알림 메시지 */}
      {message && (
        <div style={{
          padding: '0.875rem 1.25rem',
          marginBottom: '1.25rem',
          borderRadius: 'var(--radius-md)',
          background: message.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
          color: message.type === 'success' ? 'var(--accent-success)' : 'var(--accent-danger)',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}>
          {message.text}
        </div>
      )}

      {/* 등록된 키가 없는 일반 사용자용 웰컴 가이드 배너 */}
      {!isAdmin && customKeys.length === 0 && !showForm && (
        <div className="card card-glow" style={{
          marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.15))',
          border: '1px solid var(--accent-light)',
          padding: '1.5rem',
        }}>
          <div className="flex items-center gap-3" style={{ marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.8rem' }}>💡</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                무료 AI API 키 1개를 등록하고 바로 콘텐츠 작성을 시작해 보세요!
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <strong>Groq</strong> 또는 <strong>Google Gemini</strong>는 신용카드 없이 <strong>구글 계정만으로 100% 무료 발급</strong>됩니다.
              </p>
            </div>
          </div>
          <div className="flex gap-3" style={{ marginTop: '1rem' }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                setSelectedGuide('groq');
                setForm(f => ({ ...f, provider: 'groq' }));
                setShowForm(true);
              }}
            >
              ⚡ 1분 만에 Groq 무료 키 등록하기
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSelectedGuide('gemini');
                setForm(f => ({ ...f, provider: 'gemini' }));
                setShowForm(true);
              }}
            >
              🤖 Gemini 무료 키 등록하기
            </button>
          </div>
        </div>
      )}

      {/* 등록 폼 & 상세 발급 가이드 카드 */}
      {showForm && (
        <div className="card card-glow" style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
          <div className="card-title" style={{ marginBottom: '1rem' }}>➕ 새 AI API 키 등록</div>

          {/* AI 제공사 탭 셀렉터 */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '0.5rem',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--border-default)',
          }}>
            {AI_GUIDES.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setSelectedGuide(g.id);
                  setForm(f => ({ ...f, provider: g.id }));
                }}
                style={{
                  padding: '0.5rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  background: form.provider === g.id ? `${g.color}22` : 'var(--bg-elevated)',
                  border: `1px solid ${form.provider === g.id ? g.color : 'var(--border-default)'}`,
                  color: form.provider === g.id ? g.color : 'var(--text-secondary)',
                  fontWeight: form.provider === g.id ? 700 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{g.icon}</span>
                <span>{g.id.toUpperCase()}</span>
              </button>
            ))}
          </div>

          {/* 선택된 AI 제공사 친절 가이드 Box */}
          <div style={{
            padding: '1.25rem',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${activeGuideObj.color}44`,
            marginBottom: '1.25rem',
          }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '1.25rem' }}>{activeGuideObj.icon}</span>
                <strong style={{ fontSize: '1rem', color: activeGuideObj.color }}>{activeGuideObj.label}</strong>
                <span className="badge" style={{ background: `${activeGuideObj.color}22`, color: activeGuideObj.color, border: `1px solid ${activeGuideObj.color}44` }}>
                  {activeGuideObj.badge}
                </span>
              </div>
              <a
                href={activeGuideObj.url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ background: activeGuideObj.color, color: '#fff', fontWeight: 600 }}
              >
                🔗 {activeGuideObj.id.toUpperCase()} 무료 API 키 발급받기 ↗
              </a>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              {activeGuideObj.desc}
            </p>

            <div style={{
              background: 'var(--bg-dark)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
            }}>
              <strong style={{ color: 'var(--text-primary)' }}>📌 1분 발급 순서:</strong>
              {activeGuideObj.steps.map((step, idx) => (
                <div key={idx} style={{ marginTop: '2px' }}>{step}</div>
              ))}
            </div>
          </div>

          {/* 입력 필드 */}
          <div className="grid-3" style={{ gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">API 키 값 *</label>
              <input
                id="input-api-key-value"
                className="form-input"
                type="password"
                placeholder={activeGuideObj.placeholder}
                value={form.api_key}
                onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">레이블 (선택)</label>
              <input
                id="input-api-key-label"
                className="form-input"
                placeholder="예: 내 메인 Groq 키"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              id="btn-save-custom-key"
              className="btn btn-primary"
              onClick={handleAddKey}
              disabled={submitting || !form.api_key.trim()}
            >
              {submitting ? '등록 중...' : '✅ 키 안전하게 등록하기'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>취소</button>
          </div>
        </div>
      )}

      {/* 7대 AI 모델 발급 안내 카드 가이드 갤러리 */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', itemsAlign: 'center', gap: '8px' }}>
          <span>📚 AI 제공사별 무료 키 발급 가이드</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
            (원하는 제공사를 선택하여 1분 만에 키를 발급받으세요)
          </span>
        </div>
        <div className="grid-3" style={{ gap: '1rem' }}>
          {AI_GUIDES.map(g => (
            <div
              key={g.id}
              className="card"
              style={{
                border: `1px solid ${form.provider === g.id ? g.color : 'var(--border-default)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => {
                setSelectedGuide(g.id);
                setForm(f => ({ ...f, provider: g.id }));
                setShowForm(true);
              }}
            >
              <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: g.color }}>
                  {g.icon} {g.label.split('(')[0]}
                </span>
                <span className="badge" style={{ background: `${g.color}22`, color: g.color, fontSize: '0.65rem' }}>
                  {g.badge}
                </span>
              </div>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem', height: '2.4em', overflow: 'hidden' }}>
                {g.desc}
              </p>
              <div className="flex justify-between items-center">
                <a
                  href={g.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: '0.75rem', color: g.color, fontWeight: 600, textDecoration: 'underline' }}
                >
                  무료 발급받기 ↗
                </a>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                >
                  + 키 등록
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 내 커스텀 API 키 목록 */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🔑 내가 등록한 AI API 키 목록</div>
          <span className="badge badge-cyan">{customKeys.length}개 활성화</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[1, 2].map(i => <div key={i} className="shimmer" style={{ height: '60px' }} />)}
          </div>
        ) : customKeys.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔑</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              아직 등록된 AI API 키가 없습니다.
            </div>
            <div style={{ fontSize: '0.85rem', marginTop: '6px' }}>
              위의 <strong>Groq</strong> 또는 <strong>Gemini</strong> 무료 발급 가이드를 참고하여 첫 키를 추가해보세요!
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {customKeys.map(key => {
              const guide = AI_GUIDES.find(g => g.id === key.provider);
              const color = guide?.color || '#7c3aed';
              const isExhausted = key.status === 'exhausted';
              return (
                <div key={key.id} className="flex justify-between items-center" style={{
                  padding: '0.875rem 1.25rem',
                  background: isExhausted ? 'rgba(245,158,11,0.06)' : 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${isExhausted ? 'rgba(245,158,11,0.4)' : `${color}33`}`,
                }}>
                  <div className="flex items-center gap-3">
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: isExhausted ? '#f59e0b' : '#10b981',
                      boxShadow: `0 0 8px ${isExhausted ? '#f59e0b88' : '#10b98188'}`,
                    }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {key.label || `${key.provider.toUpperCase()} 키 #${key.id}`}
                        </span>
                        <span className="badge" style={{
                          background: isExhausted ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                          color: isExhausted ? '#f59e0b' : '#10b981',
                          border: `1px solid ${isExhausted ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)'}`,
                          fontSize: '0.68rem',
                        }}>
                          {key.status_label || (isExhausted ? '⚠️ 쿼터 소진' : '🟢 정상 작동 중')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>
                        {key.api_key_masked}
                      </div>
                      {key.error_detail && (
                        <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '2px' }}>
                          이유: {key.error_detail}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="badge" style={{ background: `${color}22`, color, border: `1px solid ${color}44`, fontSize: '0.7rem' }}>
                      {key.provider.toUpperCase()}
                    </span>
                    <button
                      id={`btn-delete-key-${key.id}`}
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(key.id, key.provider)}
                    >
                      🗑 삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 최고 관리자 전용 내장 66개 키 모니터링 섹션 */}
      {isAdmin && (
        <div className="card" style={{ marginTop: '1.5rem', border: '1px solid var(--accent-light)' }}>
          <div className="card-title" style={{ marginBottom: '1rem', color: 'var(--accent-light)' }}>
            👑 [관리자 전용] 내장 66개 마스터 키 풀 실시간 상태
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {Object.entries(BUILTIN_COUNTS).map(([provider, count]) => {
              const guide = AI_GUIDES.find(g => g.id === provider);
              const color = guide?.color || '#9090b0';
              const liveInfo = poolStatus?.[provider];
              const total = liveInfo?.total ?? count;
              const available = liveInfo?.available ?? count;
              const pct = total > 0 ? Math.round((available / total) * 100) : 0;
              return (
                <div key={provider} style={{
                  padding: '0.875rem 1rem',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${color}22`,
                }}>
                  <div className="flex justify-between items-center" style={{ marginBottom: '8px' }}>
                    <div className="flex items-center gap-3">
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {provider.toUpperCase()} (마스터 풀)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{available}/{total} 활성</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color }}>{pct}%</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
