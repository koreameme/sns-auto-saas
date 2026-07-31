/**
 * AdminConsole.jsx - 관리자 전용 회원 승인, 플랜 배정 & 무통장 입금 확인 콘솔
 */
import { useState, useEffect } from 'react';
import { getAdminUsersApi, approveUserApi, getAdminPaymentsApi, approvePaymentApi, deleteUserApi } from '../api';

export default function AdminConsole({ currentUser }) {
  if (currentUser?.role !== 'admin') {
    return (
      <div className="page-container flex justify-center items-center" style={{ minHeight: '60vh' }}>
        <div className="card" style={{ maxWidth: '450px', width: '100%', textAlign: 'center', padding: '2.5rem', border: '1px solid rgba(239,68,68,0.4)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⛔</div>
          <h2 style={{ color: '#ef4444', fontWeight: 800, marginBottom: '0.75rem' }}>접근 권한 제한 (403 Forbidden)</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            관리자 승인 콘솔은 <b>최고 관리자(Admin) 계정만 접근할 수 있습니다.</b><br />
            일반 사용자 계정으로는 관리자 기능을 이용하실 수 없습니다.
          </p>
        </div>
      </div>
    );
  }

  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected' | 'payments'
  const [editingPlan, setEditingPlan] = useState({});
  const [notification, setNotification] = useState(null);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [userData, paymentData] = await Promise.all([
        getAdminUsersApi(),
        getAdminPaymentsApi(),
      ]);
      setUsers(userData);
      setPayments(paymentData);

      const plans = {};
      userData.forEach(u => {
        plans[u.id] = { plan: u.plan || 'pro', daily_limit: u.daily_limit || 50, status: u.status || 'pending' };
      });
      setEditingPlan(plans);
    } catch (err) {
      setNotification({ type: 'error', text: `데이터 로드 실패: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleApproveUser = async (userId, customStatus) => {
    const planInfo = editingPlan[userId] || { plan: 'pro', daily_limit: 50, status: 'approved' };
    const targetStatus = customStatus || planInfo.status || 'approved';
    try {
      const res = await approveUserApi(userId, {
        status: targetStatus,
        plan: planInfo.plan,
        daily_limit: Number(planInfo.daily_limit),
      });
      setNotification({ type: 'success', text: `✅ ${res.message}` });
      fetchAllData();
    } catch (err) {
      setNotification({ type: 'error', text: `상태 변경 실패: ${err.message}` });
    }
  };

  const handleDeleteUser = async (userId, email) => {
    if (!window.confirm(`[${email}] 회원 계정 및 연동 데이터를 완전히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }
    try {
      const res = await deleteUserApi(userId);
      setNotification({ type: 'success', text: `✅ ${res.message}` });
      fetchAllData();
    } catch (err) {
      setNotification({ type: 'error', text: `계정 삭제 실패: ${err.message}` });
    }
  };

  const handleApprovePayment = async (orderId) => {
    try {
      const res = await approvePaymentApi(orderId, { status: 'approved' });
      setNotification({ type: 'success', text: `✅ ${res.message}` });
      fetchAllData();
    } catch (err) {
      setNotification({ type: 'error', text: `입금 승인 실패: ${err.message}` });
    }
  };

  const filteredUsers = users.filter(u => {
    if (filter === 'pending') return u.status === 'pending';
    if (filter === 'approved') return u.status === 'approved';
    if (filter === 'rejected') return u.status === 'rejected';
    return true;
  });

  const pendingUsersCount = users.filter(u => u.status === 'pending').length;
  const approvedUsersCount = users.filter(u => u.status === 'approved').length;
  const rejectedUsersCount = users.filter(u => u.status === 'rejected').length;
  const pendingPaymentsCount = payments.filter(p => p.status === 'pending').length;

  return (
    <div className="page-container">
      {/* 알림 배너 */}
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
      <div className="section-header flex justify-between items-center">
        <div>
          <h2>👑 관리자 전용 회원 승인 & 결제 관리 콘솔</h2>
          <p className="section-subtitle">
            가입 신청 회원 상태(승인/거절/대기)를 변경하고, 계정 삭제 및 무통장 입금 신청건을 관리하세요.
          </p>
        </div>
        <div className="flex gap-2">
          {pendingPaymentsCount > 0 && (
            <span className="badge badge-purple" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
              🏦 입금 승인 대기: {pendingPaymentsCount}건
            </span>
          )}
          {pendingUsersCount > 0 && (
            <span className="badge badge-yellow" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
              ⏳ 가입 승인 대기: {pendingUsersCount}명
            </span>
          )}
          <button className="btn btn-secondary btn-sm" onClick={fetchAllData}>
            🔄 새로고침
          </button>
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="tab-group" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          전체 회원 ({users.length})
        </button>
        <button
          className={`tab-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          ⏳ 가입 승인 대기 ({pendingUsersCount})
        </button>
        <button
          className={`tab-btn ${filter === 'approved' ? 'active' : ''}`}
          onClick={() => setFilter('approved')}
        >
          ✅ 승인 완료 ({approvedUsersCount})
        </button>
        <button
          className={`tab-btn ${filter === 'rejected' ? 'active' : ''}`}
          onClick={() => setFilter('rejected')}
        >
          ⛔ 승인 거절 ({rejectedUsersCount})
        </button>
        <button
          className={`tab-btn ${filter === 'payments' ? 'active' : ''}`}
          onClick={() => setFilter('payments')}
          style={{ background: pendingPaymentsCount > 0 ? 'rgba(245,158,11,0.2)' : 'none' }}
        >
          🏦 계좌이체 입금 대기 ({pendingPaymentsCount})
        </button>
      </div>

      {/* 🏦 계좌이체 입금 관리 섹션 (payments 탭 선택 시 또는 메인 노출) */}
      {(filter === 'payments' || pendingPaymentsCount > 0) && (
        <div className="card" style={{ marginBottom: '2rem', border: '1px solid rgba(245,158,11,0.4)', background: 'linear-gradient(135deg, rgba(245,158,11,0.06), var(--bg-card))' }}>
          <div className="card-title flex justify-between items-center" style={{ marginBottom: '1rem' }}>
            <span>🏦 무통장/계좌이체 입금 확인 대기 목록</span>
            <span className="badge badge-yellow">Pro 플랜 신청건</span>
          </div>

          {payments.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              접수된 계좌이체 결제 내역이 없습니다.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>주문번호</th>
                    <th>신청 회원</th>
                    <th>결제 방식</th>
                    <th>신청 플랜</th>
                    <th>실제 입금자명</th>
                    <th>신청일시</th>
                    <th>상태</th>
                    <th>관리 액션</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td>#{p.id}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.user_name || '회원'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.user_email}</div>
                      </td>
                      <td>
                        <span className={`badge ${p.payment_method === 'card' ? 'badge-cyan' : 'badge-yellow'}`}>
                          {p.payment_method === 'card' ? '💳 카드' : '🏦 계좌이체'}
                        </span>
                      </td>
                      <td><b style={{ color: 'var(--accent-light)' }}>{p.plan.toUpperCase()}</b> (₩{p.amount.toLocaleString()})</td>
                      <td><b style={{ color: '#f59e0b', fontSize: '0.95rem' }}>{p.depositor_name || '-'}</b></td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {p.created_at ? new Date(p.created_at).toLocaleString() : '-'}
                      </td>
                      <td>
                        <span className={`badge ${p.status === 'approved' ? 'badge-green' : 'badge-yellow'}`}>
                          {p.status === 'approved' ? '✅ 입금승인완료' : '⏳ 입금확인대기'}
                        </span>
                      </td>
                      <td>
                        {p.status === 'pending' ? (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleApprovePayment(p.id)}
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '0.35rem 0.75rem' }}
                          >
                            ✅ 입금 확인 & Pro 승인
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#10b981' }}>처리 완료</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 👥 회원 관리 테이블 */}
      {filter !== 'payments' && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: '1rem' }}>👥 회원 목록, 계정 상태 & 플랜 관리</div>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              회원 목록을 불러오는 중...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              해당하는 회원이 없습니다.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID / 가입일</th>
                    <th>회원 이메일</th>
                    <th>이름 / 브랜딩</th>
                    <th>계정 승인 상태</th>
                    <th>배정 서비스 플랜</th>
                    <th>일일 한도</th>
                    <th>관리 액션</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => {
                    const planState = editingPlan[user.id] || { plan: user.plan || 'pro', daily_limit: user.daily_limit || 50, status: user.status || 'pending' };
                    const isCurrentAdmin = user.role === 'admin' || user.email === 'admin@snsautopost.com';

                    return (
                      <tr key={user.id}>
                        <td>
                          <div>#{user.id}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {user.created_at ? user.created_at.split('T')[0] : ''}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {user.email}
                            {isCurrentAdmin && (
                              <span className="badge badge-purple" style={{ marginLeft: '6px', fontSize: '0.65rem' }}>ADMIN</span>
                            )}
                          </div>
                        </td>
                        <td>{user.full_name || '-'}</td>
                        <td>
                          {/* 상태 변경 셀렉트 Box */}
                          <select
                            className="form-select"
                            value={planState.status || user.status}
                            onChange={e => {
                              const st = e.target.value;
                              setEditingPlan(prev => ({
                                ...prev,
                                [user.id]: { ...prev[user.id], status: st },
                              }));
                            }}
                            style={{
                              padding: '0.35rem 0.5rem',
                              fontSize: '0.8rem',
                              borderColor: (planState.status || user.status) === 'approved' ? '#10b981' : (planState.status || user.status) === 'rejected' ? '#ef4444' : '#f59e0b',
                              color: (planState.status || user.status) === 'approved' ? '#10b981' : (planState.status || user.status) === 'rejected' ? '#ef4444' : '#f59e0b',
                              fontWeight: 700,
                            }}
                            disabled={isCurrentAdmin}
                          >
                            <option value="approved">✅ 승인 완료</option>
                            <option value="rejected">⛔ 승인 거절 (차단)</option>
                            <option value="pending">⏳ 승인 대기중</option>
                          </select>
                        </td>
                        <td>
                          <select
                            className="form-select"
                            value={planState.plan}
                            onChange={e => {
                              const p = e.target.value;
                              const defaultLimits = { free: 2, starter: 5, pro: 10, enterprise: 9999 };
                              setEditingPlan(prev => ({
                                ...prev,
                                [user.id]: { ...prev[user.id], plan: p, daily_limit: defaultLimits[p] || 10 },
                              }));
                            }}
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                          >
                            <option value="free">Free (하루 2회)</option>
                            <option value="starter">Starter (하루 5회)</option>
                            <option value="pro">Pro (하루 10회)</option>
                            <option value="enterprise">Enterprise (무제한)</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            value={planState.daily_limit}
                            onChange={e => {
                              const lim = e.target.value;
                              setEditingPlan(prev => ({
                                ...prev,
                                [user.id]: { ...prev[user.id], daily_limit: lim },
                              }));
                            }}
                            style={{ width: '80px', padding: '0.35rem', fontSize: '0.8rem' }}
                          />
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleApproveUser(user.id)}
                              style={{ fontSize: '0.78rem' }}
                            >
                              💾 저장
                            </button>

                            {!isCurrentAdmin && (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteUser(user.id, user.email)}
                                style={{
                                  background: 'rgba(239,68,68,0.15)',
                                  border: '1px solid rgba(239,68,68,0.4)',
                                  color: '#ef4444',
                                  fontSize: '0.78rem',
                                  padding: '0.3rem 0.6rem',
                                }}
                              >
                                🗑️ 삭제
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
