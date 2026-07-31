/**
 * Billing.jsx - 구독 플랜, 카드/계좌 결제 모달 & 카카오톡 문의 안내 모달
 */
import { useState } from 'react';
import { cardCheckoutApi, bankTransferRequestApi } from '../api';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    icon: '🌱',
    price: '₩0',
    period: '무료',
    badge: null,
    color: '#10b981',
    features: [
      '하루 2회 AI 콘텐츠 생성',
      '11대 SNS 플랫폼 전체 지원',
      '기본 OSMU 스튜디오',
      '수동 포스팅 지원',
      '커뮤니티 지원',
    ],
    disabled: [
      '하루 5회 이상 AI 생성',
      'AI 카드뉴스 자동 생성',
      '예약 발행 스케줄러',
      'API 키 동적 추가',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    icon: '🚀',
    price: '₩19,000',
    period: '/ 월',
    badge: '추천',
    color: '#06b6d4',
    features: [
      '하루 5회 AI 콘텐츠 생성',
      '11대 SNS 플랫폼 전체 지원',
      'OSMU 자동 작성 스튜디오',
      '반자동 포스팅 지원',
      '이메일 고객 지원',
    ],
    disabled: [
      'AI 카드뉴스 자동 생성',
      '예약 발행 스케줄러',
      'API 키 동적 추가',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: '⚡',
    price: '₩39,000',
    period: '/ 월',
    badge: '인기',
    color: '#7c3aed',
    features: [
      '하루 10회 AI 콘텐츠 생성',
      '11대 SNS 전체 자동/반자동 포스팅',
      'AI 카드뉴스 이미지 자동 생성',
      '예약 발행 스케줄러',
      'API 키 동적 추가 (커스텀 연동)',
      '포스팅 이력 분석 & 우선 지원',
    ],
    disabled: [],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: '🏢',
    price: '₩290,000',
    period: '영구 라이선스',
    badge: '독립 판매',
    color: '#f59e0b',
    features: [
      'Pro 플랜 모든 기능 포함',
      '무제한 AI 콘텐츠 생성 (9999회)',
      '단독 스탠드얼론 프로그램 패키지',
      '자체 API Key 완전 독립 모드',
      '멀티 Google 계정 지원',
      '팀 협업 기능 (최대 5명)',
      '전담 기술 지원 (카카오톡)',
    ],
    disabled: [],
  },
];

export default function Billing({ currentUser, setCurrentUser }) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showKakaoModal, setShowKakaoModal] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null);

  // 결제 관련 상태
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'bank'
  const [cardNumber, setCardNumber] = useState('4330-1234-5678-9012');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('777');
  const [depositorName, setDepositorName] = useState(currentUser?.full_name || '');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [copiedKakao, setCopiedKakao] = useState(false);

  const userPlan = currentUser?.plan || 'free';

  // 카드 즉시 결제 처리
  const handleCardCheckout = async () => {
    setLoading(true);
    setNotification(null);
    try {
      const res = await cardCheckoutApi({
        user_id: currentUser?.id || 1,
        plan: selectedPlanForPayment?.id || 'pro',
        card_number: cardNumber,
      });
      setNotification({ type: 'success', text: res.message });

      // 유저 정보 상태 및 localStorage 업데이트
      const updatedUser = {
        ...currentUser,
        plan: res.user.plan,
        daily_limit: res.user.daily_limit,
      };
      if (setCurrentUser) setCurrentUser(updatedUser);
      localStorage.setItem('saas_user', JSON.stringify(updatedUser));

      setTimeout(() => {
        setShowPaymentModal(false);
        setNotification(null);
      }, 2000);
    } catch (err) {
      setNotification({ type: 'error', text: `결제 실패: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // 무통장 계좌이체 신청 처리
  const handleBankTransfer = async () => {
    if (!depositorName.trim()) {
      setNotification({ type: 'error', text: '입금자명을 입력해 주세요.' });
      return;
    }
    setLoading(true);
    setNotification(null);
    try {
      const res = await bankTransferRequestApi({
        user_id: currentUser?.id || 1,
        plan: selectedPlanForPayment?.id || 'pro',
        depositor_name: depositorName.trim(),
      });
      setNotification({ type: 'success', text: res.message });
      setTimeout(() => {
        setShowPaymentModal(false);
        setNotification(null);
      }, 3000);
    } catch (err) {
      setNotification({ type: 'error', text: `입금 신청 실패: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKakao = () => {
    navigator.clipboard.writeText('@snsautopost_master');
    setCopiedKakao(true);
    setTimeout(() => setCopiedKakao(false), 2000);
  };

  return (
    <div className="page-container">
      <div className="section-header" style={{ textAlign: 'center' }}>
        <h2>💳 플랜 & 구독</h2>
        <p className="section-subtitle">
          필요에 맞는 플랜을 선택하세요. 카드 결제 시 즉시 승인되며 계좌이체 시 관리자 확인 후 승인됩니다.
        </p>
      </div>

      {/* 플랜 카드 목록 */}
      <div className="grid-4" style={{ gap: '1.25rem', marginBottom: '2rem' }}>
        {PLANS.map(plan => {
          const isCurrent = userPlan.toLowerCase() === plan.id;
          const isFree = plan.id === 'free';
          const isDisabled = isCurrent || isFree;

          let btnLabel = '⚡ 결제 & 업그레이드';
          if (isCurrent) btnLabel = '✅ 현재 이용 중인 플랜';
          else if (isFree) btnLabel = '🌱 기본 무료 플랜';
          else if (plan.id === 'starter') btnLabel = '🚀 Starter 결제 (₩19,000/월)';
          else if (plan.id === 'pro') btnLabel = '⚡ Pro 결제 (₩39,000/월)';
          else if (plan.id === 'enterprise') btnLabel = '💬 Enterprise 문의하기';

          return (
            <div
              key={plan.id}
              className="card"
              style={{
                border: isCurrent
                  ? `2px solid ${plan.color}88`
                  : plan.badge
                    ? `1px solid ${plan.color}44`
                    : 'var(--border-subtle)',
                background: plan.badge === '인기'
                  ? 'linear-gradient(160deg, rgba(124,58,237,0.08), var(--bg-card))'
                  : 'var(--bg-card)',
                position: 'relative',
                transform: plan.badge === '인기' ? 'scale(1.02)' : 'none',
                boxShadow: plan.badge === '인기' ? `0 8px 32px ${plan.color}22` : 'none',
              }}
            >
              {/* 배지 */}
              {plan.badge && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '3px 12px',
                  borderRadius: 'var(--radius-pill)',
                }}>
                  {plan.badge}
                </div>
              )}

              {/* 플랜 헤더 */}
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{plan.icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700 }}>
                  {plan.name}
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, color: plan.color }}>
                    {plan.price}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                    {plan.period}
                  </span>
                </div>
              </div>

              {/* 기능 목록 */}
              <div style={{ marginBottom: '1.25rem' }}>
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2" style={{
                    padding: '5px 0',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                  }}>
                    <span style={{ color: plan.color, fontWeight: 700 }}>✓</span>
                    {f}
                  </div>
                ))}
                {plan.disabled.map((f, i) => (
                  <div key={i} className="flex items-center gap-2" style={{
                    padding: '5px 0',
                    fontSize: '0.8rem',
                    color: 'var(--text-disabled)',
                  }}>
                    <span>✕</span>
                    <span style={{ textDecoration: 'line-through' }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* 액션 버튼 */}
              <button
                id={`plan-btn-${plan.id}`}
                className="btn"
                onClick={() => {
                  if (plan.id === 'starter' || plan.id === 'pro') {
                    setSelectedPlanForPayment(plan);
                    setShowPaymentModal(true);
                  } else if (plan.id === 'enterprise') {
                    setShowKakaoModal(true);
                  }
                }}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: isDisabled
                    ? 'var(--bg-elevated)'
                    : `linear-gradient(135deg, ${plan.color}cc, ${plan.color})`,
                  color: isDisabled ? 'var(--text-muted)' : 'white',
                  border: isDisabled ? '1px solid var(--border-default)' : 'none',
                  boxShadow: !isDisabled ? `0 4px 16px ${plan.color}44` : 'none',
                  cursor: isDisabled ? 'default' : 'pointer',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                }}
                disabled={isDisabled}
              >
                {btnLabel}
              </button>
            </div>
          );
        })}
      </div>

      {/* 플랜 이용 유의사항 및 API 쿼터 안내 */}
      <div style={{
        marginTop: '1.25rem',
        padding: '0.875rem 1.25rem',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-secondary)',
        fontSize: '0.825rem',
        lineHeight: 1.6,
      }}>
        💡 <strong>이용 안내:</strong> 모든 플랜의 AI 콘텐츠 생성 한도는 시스템에 등록되어 있는 AI 모델의 개수 및 각 API 제공사의 실시간 쿼터(사용량) 현황에 따라 유연하게 변동될 수 있습니다.
      </div>

      {/* 💳 결제 모달 (카드/계좌이체 선택) */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem',
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', borderRadius: 'var(--radius-lg)', position: 'relative' }}>
            <button
              onClick={() => setShowPaymentModal(false)}
              style={{
                position: 'absolute', top: '15px', right: '15px',
                background: 'none', border: 'none', color: 'var(--text-muted)',
                fontSize: '1.2rem', cursor: 'pointer',
              }}
            >
              ✕
            </button>

            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>{selectedPlanForPayment?.icon || '⚡'}</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {selectedPlanForPayment?.name || 'Pro'} 플랜 구독 결제 ({selectedPlanForPayment?.price || '₩39,000'} / 월)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                결제 방식을 선택하세요. 카드 결제는 즉시 승인되며 계좌이체는 입금 확인 후 승인됩니다.
              </p>
            </div>

            {/* 알림 메시지 */}
            {notification && (
              <div style={{
                padding: '0.75rem', marginBottom: '1rem', borderRadius: 'var(--radius-md)',
                background: notification.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                border: notification.type === 'success' ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(239,68,68,0.4)',
                color: notification.type === 'success' ? '#10b981' : '#ef4444',
                fontSize: '0.82rem', fontWeight: 600, textAlign: 'center',
              }}>
                {notification.text}
              </div>
            )}

            {/* 결제 수단 스위처 */}
            <div className="flex gap-2" style={{ marginBottom: '1.25rem' }}>
              <button
                type="button"
                className={`btn ${paymentMethod === 'card' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPaymentMethod('card')}
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem' }}
              >
                💳 카드 결제 (즉시 승인)
              </button>
              <button
                type="button"
                className={`btn ${paymentMethod === 'bank' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPaymentMethod('bank')}
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem' }}
              >
                🏦 계좌이체 (입금 승인)
              </button>
            </div>

            {/* 💳 카드 결제 폼 */}
            {paymentMethod === 'card' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div className="form-group">
                  <label className="form-label">카드 번호</label>
                  <input
                    className="form-input"
                    type="text"
                    value={cardNumber}
                    onChange={e => setCardNumber(e.target.value)}
                    placeholder="0000-0000-0000-0000"
                  />
                </div>
                <div className="grid-2" style={{ gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">유효기간 (MM/YY)</label>
                    <input
                      className="form-input"
                      type="text"
                      value={cardExpiry}
                      onChange={e => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CVC (3자리)</label>
                    <input
                      className="form-input"
                      type="password"
                      maxLength={3}
                      value={cardCvc}
                      onChange={e => setCardCvc(e.target.value)}
                      placeholder="777"
                    />
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleCardCheckout}
                  disabled={loading}
                  style={{
                    padding: '0.8rem', fontWeight: 700, fontSize: '0.9rem',
                    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                    marginTop: '0.5rem',
                  }}
                >
                  {loading ? '카드 결제 처리 중...' : '💳 ₩39,000원 카드 결제 및 즉시 업그레이드'}
                </button>
              </div>
            ) : (
              /* 🏦 계좌이체 폼 */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div style={{
                  padding: '1rem',
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(124,58,237,0.05))',
                  border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  lineHeight: '1.6',
                }}>
                  <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>🏦 입금 계좌 안내</div>
                  <div>- 은행명: <b>신한은행</b></div>
                  <div>- 계좌번호: <b style={{ color: 'var(--accent-light)' }}>110-123-456789</b></div>
                  <div>- 예금주: <b>주식회사 SNS AutoPost</b></div>
                  <div>- 입금금액: <b style={{ color: '#10b981' }}>₩39,000 원</b></div>
                </div>

                <div className="form-group">
                  <label className="form-label">실제 입금자 성함</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="예: 이주환 (입금자 성함 정확히 입력)"
                    value={depositorName}
                    onChange={e => setDepositorName(e.target.value)}
                  />
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleBankTransfer}
                  disabled={loading}
                  style={{
                    padding: '0.8rem', fontWeight: 700, fontSize: '0.9rem',
                    background: 'linear-gradient(135deg, #f59e0b, #7c3aed)',
                    marginTop: '0.5rem',
                  }}
                >
                  {loading ? '신청 처리 중...' : '📝 계좌이체 입금 완료 신청 (관리자 승인 대기)'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 💬 Enterprise 카카오톡 문의 안내 모달 */}
      {showKakaoModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem',
        }}>
          <div className="card" style={{ maxWidth: '460px', width: '100%', textAlign: 'center', padding: '2.5rem', position: 'relative' }}>
            <button
              onClick={() => setShowKakaoModal(false)}
              style={{
                position: 'absolute', top: '15px', right: '15px',
                background: 'none', border: 'none', color: 'var(--text-muted)',
                fontSize: '1.2rem', cursor: 'pointer',
              }}
            >
              ✕
            </button>

            <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>💬</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fee500' }}>
              Enterprise 라이선스 1:1 카카오톡 문의
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              단독 스탠드얼론 프로그램 독립 패키지 및 하루 30회 AI 생성 맞춤 구축 문의는 전담 기술 매니저가 1:1로 빠르게 안내해 드립니다.
            </p>

            <div style={{
              padding: '1.25rem',
              background: '#fee500',
              color: '#191919',
              borderRadius: 'var(--radius-md)',
              fontWeight: 800,
              fontSize: '1.1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span>카카오톡 ID: <b>@snsautopost_master</b></span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCopyKakao}
                style={{ background: '#191919', color: 'white', border: 'none', padding: '0.35rem 0.75rem' }}
              >
                {copiedKakao ? '✓ 복사됨' : 'ID 복사'}
              </button>
            </div>

            <div className="flex gap-2 justify-center">
              <button
                className="btn btn-secondary"
                onClick={() => setShowKakaoModal(false)}
                style={{ padding: '0.6rem 1.5rem' }}
              >
                닫기
              </button>
              <a
                href="https://open.kakao.com"
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{
                  background: '#fee500', color: '#191919', fontWeight: 800,
                  textDecoration: 'none', padding: '0.6rem 1.5rem'
                }}
              >
                💛 카카오톡 1:1 문의 열기
              </a>
            </div>
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: '1rem' }}>❓ 자주 묻는 질문</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {[
            {
              q: '카드 결제 시 플랜이 바로 변경되나요?',
              a: '네! 신용/체크카드 결제를 완료하시면 즉시 Pro 플랜(하루 10회 AI 포스팅)으로 자동 업그레이드됩니다.',
            },
            {
              q: '계좌이체입금 후 언제 승인되나요?',
              a: '입금자명과 금액(₩39,000)을 입력하신 후 입금 신청을 해주시면, 담당 관리자가 입금 확인 후 즉시 Pro 승인을 처리해 드립니다.',
            },
            {
              q: 'Enterprise 라이선스는 어떻게 구매하나요?',
              a: '문의하기 버튼을 눌러 상단 카카오톡 ID(@snsautopost_master)로 연락주시면 전담 엔지니어가 1:1 상담 후 제공해 드립니다.',
            },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '1rem',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem' }}>Q. {item.q}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>A. {item.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
