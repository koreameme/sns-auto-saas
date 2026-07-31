/**
 * api.js - 백엔드 FastAPI와 통신하는 클라이언트 함수
 */

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://jcom.ai.kr/snsauto' : 'http://localhost:8000');

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || '요청 실패');
  }
  return res.json();
}

// ── 헬스 체크 ────────────────────────────────────────
export const getHealth = () => request('/api/health');

// ── AI 키 풀 상태 ─────────────────────────────────────
export const getPoolStatus = () => request('/api/ai/pool-status');

// ── OSMU 콘텐츠 생성 ──────────────────────────────────
export const generateOsmu = (payload) =>
  request('/api/osmu/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// 키워드 기반 제목 + 내용 자동 생성
export const generateFromKeywords = (payload) =>
  request('/api/osmu/generate-from-keywords', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// ── API 키 관리 ───────────────────────────────────────
export const listKeys = (userId) =>
  request(`/api/keys${userId ? `?user_id=${userId}` : ''}`);
export const addKey = (payload) =>
  request('/api/keys', { method: 'POST', body: JSON.stringify(payload) });
export const deleteKey = (id, userId) =>
  request(`/api/keys/${id}${userId ? `?user_id=${userId}` : ''}`, { method: 'DELETE' });

// ── SNS 계정 연동 ─────────────────────────────────────
export const listSnsAccounts = (userId) =>
  request(`/api/sns/accounts${userId ? `?user_id=${userId}` : ''}`);
export const saveSnsToken = (payload) =>
  request('/api/sns/token', { method: 'POST', body: JSON.stringify(payload) });
export const masterBatchConnect = (payload) =>
  request('/api/sns/master-connect', { method: 'POST', body: JSON.stringify(payload) });
export const disconnectSnsAccount = (platform, userId) =>
  request(`/api/sns/accounts/${platform}${userId ? `?user_id=${userId}` : ''}`, { method: 'DELETE' });
export const resetAllSnsAccounts = (userId) =>
  request(`/api/sns/accounts${userId ? `?user_id=${userId}` : ''}`, { method: 'DELETE' });

// ── 회원 인증 & 관리자 ──────────────────────────────────
export const signupApi = (payload) =>
  request('/api/auth/signup', { method: 'POST', body: JSON.stringify(payload) });
export const loginApi = (payload) =>
  request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) });
export const getMeApi = (userId) =>
  request(`/api/auth/me?user_id=${userId || 1}`);
export const updateProfileApi = (payload) =>
  request('/api/auth/profile', { method: 'PUT', body: JSON.stringify(payload) });
export const getAdminUsersApi = () =>
  request('/api/admin/users');
export const approveUserApi = (userId, payload) =>
  request(`/api/admin/users/${userId}/approve`, { method: 'POST', body: JSON.stringify(payload) });
export const deleteUserApi = (userId) =>
  request(`/api/admin/users/${userId}`, { method: 'DELETE' });

// ── 결제 & 무통장 승인 API ───────────────────────────────
export const cardCheckoutApi = (payload) =>
  request('/api/payment/card-checkout', { method: 'POST', body: JSON.stringify(payload) });
export const bankTransferRequestApi = (payload) =>
  request('/api/payment/bank-transfer', { method: 'POST', body: JSON.stringify(payload) });
export const getAdminPaymentsApi = () =>
  request('/api/admin/payments');
export const approvePaymentApi = (orderId, payload) =>
  request(`/api/admin/payments/${orderId}/approve`, { method: 'POST', body: JSON.stringify(payload) });

// ── 웹사이트 URL / 유튜브 링크 생성 API ──────────────────
export const generateFromUrlApi = (payload) =>
  request('/api/osmu/generate-from-url', { method: 'POST', body: JSON.stringify(payload) });
export const generateFromYoutubeApi = (payload) =>
  request('/api/osmu/generate-from-youtube', { method: 'POST', body: JSON.stringify(payload) });

// ── 선택 플랫폼 자동 포스팅 API ──────────────────────────
export const autoPostToPlatformsApi = (payload) =>
  request('/api/osmu/auto-post', { method: 'POST', body: JSON.stringify(payload) });





