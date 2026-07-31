/**
 * ProfileSettings.jsx - 프로필 및 비밀번호 변경 페이지
 */
import { useState } from 'react';
import { updateProfileApi } from '../api';

export default function ProfileSettings({ currentUser, setCurrentUser }) {
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setNotification(null);

    // 비밀번호 입력 시 검증
    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        setNotification({ type: 'error', text: '비밀번호를 변경하려면 현재 비밀번호를 입력해야 합니다.' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setNotification({ type: 'error', text: '새 비밀번호와 비밀번호 확인이 일치하지 않습니다.' });
        return;
      }
      if (newPassword.length < 4) {
        setNotification({ type: 'error', text: '새 비밀번호는 최소 4자 이상이어야 합니다.' });
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        user_id: currentUser.id,
        full_name: fullName,
      };
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      const res = await updateProfileApi(payload);
      setNotification({ type: 'success', text: `✅ ${res.message}` });
      setCurrentUser(res.user);
      localStorage.setItem('saas_user', JSON.stringify(res.user));

      // 비밀번호 폼 초기화
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setNotification({ type: 'error', text: `변경 실패: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '800px' }}>
      {/* 알림 메시지 */}
      {notification && (
        <div style={{
          padding: '1rem',
          marginBottom: '1.5rem',
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
      <div className="section-header">
        <h2>👤 프로필 & 계정 정보 수정</h2>
        <p className="section-subtitle">
          이름, 브랜드명 및 로그인 비밀번호를 안전하게 수정하세요.
        </p>
      </div>

      <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* 회원 상태 요약 카드 */}
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.06))',
          border: '1px solid rgba(124,58,237,0.3)',
        }}>
          <div className="card-title flex justify-between items-center" style={{ marginBottom: '1rem' }}>
            <span>💳 현재 내 구독 플랜 정보</span>
            <span className="badge badge-green" style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}>
              {currentUser?.plan?.toUpperCase() || 'FREE'} PLAN
            </span>
          </div>
          <div className="grid-2" style={{ gap: '1rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>이메일 계정:</span>{' '}
              <b style={{ color: 'var(--text-primary)' }}>{currentUser?.email}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>계정 권한:</span>{' '}
              <b style={{ color: 'var(--accent-light)' }}>
                {currentUser?.role === 'admin' ? '👑 최고 관리자 (Admin)' : '👤 일반 회원 (User)'}
              </b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>승인 상태:</span>{' '}
              <b style={{ color: '#10b981' }}>✅ {currentUser?.status?.toUpperCase()}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>일일 포스팅 한도:</span>{' '}
              <b style={{ color: 'var(--text-primary)' }}>{currentUser?.daily_limit ?? 50}회 / 일</b>
            </div>
          </div>
        </div>

        {/* 기본 정보 수정 */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: '1rem' }}>📝 프로필 기본 정보</div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">이메일 주소 (변경 불가)</label>
            <input
              className="form-input"
              type="email"
              disabled
              value={currentUser?.email || ''}
              style={{ opacity: 0.6, background: 'var(--bg-elevated)' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">담당자 이름 / 브랜드명</label>
            <input
              className="form-input"
              type="text"
              placeholder="예: 홍길동 마케터"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>
        </div>

        {/* 비밀번호 변경 (선택) */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: '1rem' }}>🔒 비밀번호 변경 (선택)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">현재 비밀번호</label>
              <input
                className="form-input"
                type="password"
                placeholder="현재 비밀번호 입력"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="grid-2" style={{ gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">새 비밀번호</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="변경할 새 비밀번호"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">새 비밀번호 확인</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="새 비밀번호 재입력"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ padding: '0.875rem', fontWeight: 700, fontSize: '0.95rem' }}
        >
          {loading ? '저장 중...' : '💾 프로필 정보 변경 저장하기'}
        </button>
      </form>
    </div>
  );
}
