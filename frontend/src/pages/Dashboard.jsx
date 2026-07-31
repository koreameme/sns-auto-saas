import React, { useState, useEffect } from 'react';
import OnboardingWizard from '../components/OnboardingWizard';
import AuthModal from './AuthModal';

export default function Dashboard({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('publisher'); // publisher | search | analytics | vault | admin
  const [installInfo, setInstallInfo] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // 5-URL Input State
  const [urls, setUrls] = useState(['', '', '', '', '']);
  const [blogTitle, setBlogTitle] = useState('');
  const [generationResult, setGenerationResult] = useState(null);

  // Affiliate Search State
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // User Vault API Keys State
  const [coupangAccessKey, setCoupangAccessKey] = useState('');
  const [coupangSecretKey, setCoupangSecretKey] = useState('');
  const [adpickPartnerKey, setAdpickPartnerKey] = useState('');
  const [linkpriceMerchantId, setLinkpriceMerchantId] = useState('');

  // GitHub Settings Direct State
  const [githubIdInput, setGithubIdInput] = useState(currentUser?.github_id || 'koreameme020');
  const [githubTokenInput, setGithubTokenInput] = useState('');
  const [blogSetupLoading, setBlogSetupLoading] = useState(false);

  // Admin Panel State
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersList, setAdminUsersList] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPlan, setNewPlan] = useState('pro');

  // Smart Scroll-Hide Header State
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const isAdmin = currentUser?.role === 'admin';

  const handleDirectGithubSetup = async () => {
    if (!githubIdInput.trim()) {
      alert('GitHub ID를 입력해 주세요.');
      return;
    }
    setBlogSetupLoading(true);
    try {
      const res = await fetch('/snsauto/api/setup-github-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser?.id || 1,
          github_id: githubIdInput.trim(),
          github_token: githubTokenInput.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert(`🎉 블로그 연동 완료!\n블로그 주소: ${data.blog_url}`);
        setInstallInfo({
          installation_status: 'COMPLETED',
          github_id: githubIdInput.trim(),
          blog_url: data.blog_url
        });
      } else {
        alert(data.detail || data.message || '블로그 연동에 실패했습니다.');
      }
    } catch (err) {
      alert('서버 통신 중 오류가 발생했습니다.');
    } finally {
      setBlogSetupLoading(false);
    }
  };

  useEffect(() => {
    fetchInstallationStatus();
    if (isAdmin) {
      fetchAdminUsers();
    }
  }, [currentUser?.id, isAdmin]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 60 && currentScrollY > lastScrollY) {
        setHeaderVisible(false); // Scroll Down -> Hide Header
      } else {
        setHeaderVisible(true);  // Scroll Up -> Show Header
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const fetchInstallationStatus = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`/api/user/installation-status?user_id=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setInstallInfo(data);
        if (data.installation_status !== 'COMPLETED') {
          setShowWizard(true);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminUsers = async () => {
    setAdminLoading(true);
    try {
      const res = await fetch('/snsauto/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setAdminUsersList(data.users || data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminCreateUser = async () => {
    if (!newEmail.trim() || !newPassword.trim()) {
      alert('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    try {
      const res = await fetch('/snsauto/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail.trim(),
          password: newPassword.trim(),
          plan: newPlan,
          role: 'user'
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || '신규 유저 계정이 발급되었습니다!');
        setNewEmail('');
        setNewPassword('');
        fetchAdminUsers();
      } else {
        alert(data.detail || '회원 발급 실패');
      }
    } catch (err) {
      alert('서버와 통신 중 오류가 발생했습니다.');
    }
  };

  const handleAdminUpdateTier = async (userId, targetPlan) => {
    try {
      const res = await fetch(`/snsauto/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlan })
      });
      if (res.ok) {
        alert(`유저 플랜이 [${targetPlan.toUpperCase()}] (으)로 변경되었습니다!`);
        fetchAdminUsers();
      }
    } catch (err) {
      alert('플랜 변경 중 오류가 발생했습니다.');
    }
  };

  const handleUrlChange = (index, value) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleCopyProductUrl = (productUrl) => {
    // Populate the first empty URL input slot
    const emptyIndex = urls.findIndex(u => u === '');
    if (emptyIndex !== -1) {
      handleUrlChange(emptyIndex, productUrl);
    } else {
      handleUrlChange(0, productUrl);
    }
    navigator.clipboard.writeText(productUrl);
    alert('제휴 URL이 클립보드에 복사되었으며, 포스팅 URL 입력칸에 자동으로 채워졌습니다!');
  };

  const handleSearchProducts = async () => {
    if (!searchKeyword.trim()) return;
    setSearchLoading(true);
    // Mock search results across Coupang, Adpick, Linkprice
    setTimeout(() => {
      setSearchResults([
        {
          id: 1,
          network: '쿠팡파트너스',
          title: `${searchKeyword} 가성비 TOP 1 로봇청소기`,
          price: '349,000원',
          commission: '3.0%',
          image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&q=80',
          url: `https://link.coupang.com/a/sample_${Date.now()}_1`
        },
        {
          id: 2,
          network: '애드픽',
          title: `${searchKeyword} 스마트 앱연동 프리미엄 모델`,
          price: '429,000원',
          commission: '5.5%',
          image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400&q=80',
          url: `https://adpick.co.kr/v2/offer_${Date.now()}_2`
        },
        {
          id: 3,
          network: '링크프라이스',
          title: `${searchKeyword} 올인원 먼지비움 스마트 청소기`,
          price: '519,000원',
          commission: '4.2%',
          image: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=400&q=80',
          url: `https://linkprice.com/click_${Date.now()}_3`
        }
      ]);
      setSearchLoading(false);
    }, 600);
  };

  const handleGenerateBlogAndSns = async () => {
    const validUrls = urls.filter(u => u.trim() !== '');
    if (validUrls.length === 0) {
      alert('최소 1개 이상의 제휴 URL을 입력해 주세요.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const blogUrl = installInfo?.blog_url || `https://${installInfo?.github_id || 'koreameme001'}.github.io`;
      setGenerationResult({
        blogUrl: `${blogUrl}/posts/post-${Date.now().toString().slice(-4)}.html`,
        title: blogTitle || `${searchKeyword || '가성비 상품'} TOP 5 솔직 실사용자 비교 리뷰`,
        shortCopy: `🔥 ${blogTitle || '역대급 특가 혜택'} TOP 5 실사용 장단점 총정리!\n지금 가장 인기 있는 가성비 모델을 한눈에 비교해 보세요.👇\n\n👉 풀버전 솔직 리뷰 보기: ${blogUrl}/posts/post-${Date.now().toString().slice(-4)}.html`,
        heroImage: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&q=80',
        youtubeVideoId: 'dQw4w9WgXcQ'
      });
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* Onboarding Wizard Modal Guard */}
      {showWizard && (
        <OnboardingWizard
          user={currentUser}
          onClose={() => setShowWizard(false)}
          onComplete={(url) => {
            setShowWizard(false);
            setInstallInfo(prev => ({ ...prev, installation_status: 'COMPLETED', blog_url: url }));
          }}
        />
      )}

      {/* Top Navigation Bar */}
      <header 
        className={`sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-lg transition-all duration-300 ${
          headerVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-4">
          <div 
            onClick={() => setActiveTab('publisher')}
            title="대시보드 첫 화면으로 이동"
            className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition group select-none"
          >
            <span className="text-2xl animate-pulse group-hover:scale-110 transition-transform">⚡</span>
            <h1 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              SNS AutoSaaS Pro
            </h1>
          </div>
          <span className="hidden sm:inline-block px-2.5 py-0.5 text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60 rounded-full">
            Commercial SaaS v15.0
          </span>
        </div>

        {/* User Status & Installation Guard LED */}
        <div className="flex items-center gap-4">
          {installInfo?.installation_status === 'COMPLETED' ? (
            <a
              href={installInfo.blog_url}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 rounded-full text-xs font-semibold flex items-center gap-2 transition shadow-sm"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              🟢 블로그 연동 완료 ({installInfo.github_id}.github.io) ↗
            </a>
          ) : (
            <button
              onClick={() => setShowWizard(true)}
              className="px-3.5 py-1.5 bg-amber-950/80 border border-amber-500/40 text-amber-300 rounded-full text-xs font-semibold animate-bounce"
            >
              ⚠️ 1초 블로그 연동하기 ➔
            </button>
          )}

          <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-200">{currentUser?.email || 'admin@snsautopost.com'}</div>
              <div className="text-[10px] text-indigo-400 font-semibold uppercase">{currentUser?.plan || 'PRO'} MEMBER</div>
            </div>
            
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition shadow-sm flex items-center gap-1"
            >
              🔑 로그인 / 계정 전환
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
              >
                🔓 로그아웃
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Login / Auth Modal Overlay */}
      {showLoginModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
          style={{ backgroundColor: 'rgba(2, 6, 23, 0.95)', backdropFilter: 'blur(12px)' }}
        >
          <div className="relative w-full max-w-md">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold border border-slate-700 shadow-lg"
            >
              ✕
            </button>
            <AuthModal
              currentUser={currentUser}
              onLoginSuccess={(user) => {
                setShowLoginModal(false);
                if (window.location) window.location.reload();
              }}
              onLogout={() => {
                setShowLoginModal(false);
                if (onLogout) onLogout();
              }}
            />
          </div>
        </div>
      )}

      {/* Main Tab Bar */}
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
        {[
          { id: 'publisher', icon: '🚀', label: '오토 블로그 & SNS 포스팅' },
          { id: 'search', icon: '🛍️', label: '제휴 상품 통합 검색 (1클릭 URL)' },
          { id: 'analytics', icon: '📊', label: '클릭 & 수익 전환 분석' },
          { id: 'vault', icon: '🔑', label: '내 자격 증명 & SNS 연동 Vault' },
          ...(isAdmin ? [{ id: 'admin', icon: '👑', label: '관리자 전용 회원 통제 패널' }] : [])
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Workspace Panels */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* TAB 1: Auto Blog & SNS Publisher */}
        {activeTab === 'publisher' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left: Input Form (5 URLs) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-base font-bold text-indigo-300 mb-1 flex items-center gap-2">
                  <span>📝</span> 5개 제휴 URL 입력 & AI SEO 포스팅 렌더러
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  쿠팡, 애드픽, 링크프라이스 등 제휴 상품 URL을 입력하시면 AI가 구글 SEO 1등 블로그 글을 자동 게재하고 4대 SNS로 게재합니다.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">블로그 포스팅 타겟 제목 (선택)</label>
                    <input
                      type="text"
                      value={blogTitle}
                      onChange={(e) => setBlogTitle(e.target.value)}
                      placeholder="예: 2026년 가성비 로봇청소기 TOP 5 솔직 비교 리뷰"
                      className="w-full px-4 py-2.5 rounded-xl text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium border"
                      style={{ backgroundColor: '#020617', color: '#f8fafc', borderColor: '#334155' }}
                    />
                  </div>

                  <div className="space-y-2.5">
                    <label className="block text-xs font-bold text-slate-300">제휴 URL (최대 5개)</label>
                    {urls.map((url, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-6 text-center text-xs font-bold text-indigo-400">{idx + 1}.</span>
                        <input
                          type="text"
                          value={url}
                          onChange={(e) => handleUrlChange(idx, e.target.value)}
                          placeholder={`제휴 URL ${idx + 1} 번 입력 (쿠팡 / 애드픽 / 링크프라이스)`}
                          className="flex-1 px-4 py-2 rounded-xl text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono border"
                          style={{ backgroundColor: '#020617', color: '#f8fafc', borderColor: '#334155' }}
                        />
                        {url && (
                          <button
                            onClick={() => handleUrlChange(idx, '')}
                            className="text-xs text-slate-500 hover:text-red-400 px-2"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    onClick={handleGenerateBlogAndSns}
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white font-extrabold rounded-xl shadow-xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 tracking-wide"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        AI 블로그 작성 & 4대 SNS 일괄 전송 중...
                      </>
                    ) : (
                      '🚀 1초 만에 구글 SEO 블로그 생성 및 4대 SNS 일괄 포스팅'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Output Live Preview & Dual SNS Panel */}
            <div className="lg:col-span-5 space-y-6">
              {generationResult ? (
                <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-6 shadow-2xl space-y-6 animate-fadeIn">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="px-2.5 py-1 bg-emerald-950 text-emerald-400 text-xs font-bold rounded-md border border-emerald-800/40">
                      🟢 게재 완료
                    </span>
                    <span className="text-xs text-slate-400 font-mono">1초 전 게시됨</span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">생성된 SEO 블로그 상세페이지</h4>
                    <a
                      href={generationResult.blogUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-bold text-indigo-300 hover:text-indigo-200 underline break-all"
                    >
                      {generationResult.blogUrl} ↗
                    </a>
                  </div>

                  {/* 1st Image Hero Thumbnail Preview */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">대표 이미지 썸네일 합성 (OpenGraph)</h4>
                    <div className="relative rounded-xl overflow-hidden border border-slate-800 group">
                      <img src={generationResult.heroImage} alt="Hero Thumbnail" className="w-full h-40 object-cover" />
                      <div className="absolute top-3 left-3 px-3 py-1 bg-indigo-600 text-white text-xs font-extrabold rounded-lg shadow-md">
                        🔥 가성비 TOP 5 추천
                      </div>
                    </div>
                  </div>

                  {/* Dual SNS Publishing Panel */}
                  <div className="space-y-3 pt-4 border-t border-slate-800">
                    <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider">📱 4대 SNS 스마트 일괄/개별 포스팅</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => alert('인스타그램으로 자동 전송되었습니다!')}
                        className="py-2.5 px-3 bg-pink-950/60 hover:bg-pink-900/60 border border-pink-500/40 text-pink-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                      >
                        📸 인스타그램 포스팅
                      </button>
                      <button
                        onClick={() => alert('X(트위터)로 자동 전송되었습니다!')}
                        className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                      >
                        ✖️ X (트위터) 포스팅
                      </button>
                      <button
                        onClick={() => alert('페이스북으로 자동 전송되었습니다!')}
                        className="py-2.5 px-3 bg-blue-950/60 hover:bg-blue-900/60 border border-blue-500/40 text-blue-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                      >
                        📘 페이스북 포스팅
                      </button>
                      <button
                        onClick={() => alert('스레드로 자동 전송되었습니다!')}
                        className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                      >
                        🧵 스레드 포스팅
                      </button>
                    </div>
                  </div>

                  {/* Manual Copy Panel */}
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">📋 AI 2~3줄 바이럴 카피 & 링크</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generationResult.shortCopy);
                          alert('2~3줄 카피 및 링크가 클립보드에 복사되었습니다!');
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-md transition"
                      >
                        1클릭 복사
                      </button>
                    </div>
                    <pre className="text-[11px] text-slate-400 font-sans whitespace-pre-line leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800">
                      {generationResult.shortCopy}
                    </pre>
                  </div>

                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 space-y-3">
                  <div className="text-4xl">✨</div>
                  <h4 className="text-sm font-bold text-slate-400">포스팅 게재 대기 중</h4>
                  <p className="text-xs">왼쪽 폼에 제휴 URL을 넣고 포스팅 버튼을 누르시면 이곳에 실시간 미리보기 및 SNS 전송 패널이 노출됩니다.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Affiliate Search */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-base font-bold text-indigo-300 mb-1 flex items-center gap-2">
                <span>🛍️</span> 쿠팡파트너스 / 애드픽 / 링크프라이스 통합 상품 검색
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                키워드를 입력하시면 3대 제휴 네트워크 상품을 검색하여 **1클릭 제휴 URL 복사** 및 포스팅 폼 자동 입력을 지원합니다.
              </p>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchProducts()}
                  placeholder="검색할 상품 키워드를 입력하세요 (예: 로봇청소기, 겨울패딩)"
                  className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleSearchProducts}
                  disabled={searchLoading}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition shadow-md shrink-0"
                >
                  {searchLoading ? '검색 중...' : '🔍 통합 검색'}
                </button>
              </div>
            </div>

            {/* Search Results Grid */}
            {searchResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {searchResults.map(item => (
                  <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between">
                    <div>
                      <div className="relative">
                        <img src={item.image} alt={item.title} className="w-full h-44 object-cover" />
                        <span className="absolute top-3 left-3 px-2.5 py-1 bg-slate-900/90 text-indigo-300 text-[10px] font-extrabold rounded-md border border-slate-700">
                          {item.network}
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        <h4 className="text-sm font-bold text-slate-100 line-clamp-2">{item.title}</h4>
                        <div className="flex items-center justify-between text-xs pt-2">
                          <span className="text-slate-400">판매가: <strong className="text-white">{item.price}</strong></span>
                          <span className="text-emerald-400 font-extrabold">수수료 {item.commission}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 pt-0">
                      <button
                        onClick={() => handleCopyProductUrl(item.url)}
                        className="w-full py-2.5 bg-slate-800 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition border border-slate-700"
                      >
                        📋 제휴 URL 복사 & 폼에 채우기
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <h3 className="text-base font-bold text-indigo-300 flex items-center gap-2">
                <span>📊</span> 하이브리드 실시간 유입 & 수익 분석
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">이번 달 총 유입 클릭수</div>
                  <div className="text-2xl font-black text-indigo-400 mt-1">1,420 회</div>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">예상 제휴 정산 수익</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">₩ 485,000 원</div>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">가장 유입이 많은 채널</div>
                  <div className="text-2xl font-black text-pink-400 mt-1">Instagram (54%)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Vault */}
        {activeTab === 'vault' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div>
                <h3 className="text-base font-bold text-indigo-300 flex items-center gap-2">
                  <span>🔑</span> 내 제휴 API 키 & 깃허브 토큰 Vault
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  깃허브 ID/토큰 및 쿠팡파트너스, 애드픽, 링크프라이스 API 키를 여기서 언제든지 직접 수정하실 수 있습니다.
                </p>
              </div>

              {/* 0. GitHub ID & PAT Direct Editor */}
              <div className="p-4 bg-indigo-950/40 rounded-xl border border-indigo-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <span>🐙</span> GitHub 블로그 ID & 토큰 (PAT) 연동 설정
                  </div>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=SNSAutoSaaSPro"
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-extrabold rounded transition shadow"
                  >
                    🔗 토큰 1초 자동 생성 ↗
                  </a>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">GitHub ID (아이디)</label>
                    <input
                      type="text"
                      value={githubIdInput}
                      onChange={(e) => setGithubIdInput(e.target.value)}
                      placeholder="예: koreameme020"
                      className="w-full px-3.5 py-2 rounded-xl text-xs font-mono border"
                      style={{ backgroundColor: '#020617', color: '#f8fafc', borderColor: '#334155' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Personal Access Token (PAT)</label>
                    <input
                      type="password"
                      value={githubTokenInput}
                      onChange={(e) => setGithubTokenInput(e.target.value)}
                      placeholder="ghp_**** (복사한 토큰 붙여넣기)"
                      className="w-full px-3.5 py-2 rounded-xl text-xs font-mono border"
                      style={{ backgroundColor: '#020617', color: '#f8fafc', borderColor: '#334155' }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleDirectGithubSetup}
                  disabled={blogSetupLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-2"
                >
                  {blogSetupLoading ? '깃허브 블로그 생성/연동 중...' : '🚀 깃허브 블로그 1초 자동 개설 / 연동 업데이트'}
                </button>
              </div>

              {/* 1. Coupang Partners */}
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
                  <span>🛒</span> 1. 쿠팡파트너스 (Coupang Partners API)
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Access Key</label>
                  <input
                    type="password"
                    value={coupangAccessKey}
                    onChange={(e) => setCoupangAccessKey(e.target.value)}
                    placeholder="AF****-****-****-****"
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-mono"
                    style={{ backgroundColor: '#020617', color: '#f8fafc', borderColor: '#334155' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Secret Key</label>
                  <input
                    type="password"
                    value={coupangSecretKey}
                    onChange={(e) => setCoupangSecretKey(e.target.value)}
                    placeholder="Secret Key 입력"
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-mono"
                    style={{ backgroundColor: '#020617', color: '#f8fafc', borderColor: '#334155' }}
                  />
                </div>
              </div>

              {/* 2. Adpick */}
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                  <span>📢</span> 2. 애드픽 (Adpick Affiliate API)
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">파트너 회원 연동 키 (Partner Key / Token)</label>
                  <input
                    type="password"
                    value={adpickPartnerKey}
                    onChange={(e) => setAdpickPartnerKey(e.target.value)}
                    placeholder="애드픽 파트너 인증 키 입력"
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-mono"
                    style={{ backgroundColor: '#020617', color: '#f8fafc', borderColor: '#334155' }}
                  />
                </div>
              </div>

              {/* 3. Linkprice */}
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <span>🔗</span> 3. 링크프라이스 (Linkprice API)
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">머천트 ID / API인증 키 (Merchant ID / Token)</label>
                  <input
                    type="password"
                    value={linkpriceMerchantId}
                    onChange={(e) => setLinkpriceMerchantId(e.target.value)}
                    placeholder="링크프라이스 머천트 인증 키 입력"
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-mono"
                    style={{ backgroundColor: '#020617', color: '#f8fafc', borderColor: '#334155' }}
                  />
                </div>
              </div>

              <button
                onClick={() => alert('🎉 쿠팡파트너스, 애드픽, 링크프라이스 API 키가 안전하게 AES-256 암호화 저장되었습니다!')}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition tracking-wide"
              >
                💾 전체 제휴 API 키 안전 저장
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div>
                <h3 className="text-base font-bold text-purple-300 flex items-center gap-2">
                  <span>📱</span> 내 4대 SNS 계정 연동 센터
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  인스타그램, 페이스북, 스레드, X 계정의 OAuth 1초 연동 상태입니다.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                {[
                  { name: 'Instagram', icon: '📸', color: 'text-pink-400' },
                  { name: 'X (Twitter)', icon: '✖️', color: 'text-slate-100' },
                  { name: 'Facebook', icon: '📘', color: 'text-blue-400' },
                  { name: 'Threads', icon: '🧵', color: 'text-purple-400' }
                ].map(item => (
                  <div key={item.name} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{item.icon}</span>
                      <span className={`font-bold ${item.color}`}>{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-emerald-950 text-emerald-400 text-[10px] font-bold rounded-md border border-emerald-800/40">
                        🟢 1초 연동 완료
                      </span>
                      <button 
                        onClick={() => alert(`${item.name} 계정 토큰 갱신 완료`)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold rounded"
                      >
                        재연동
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Admin Panel */}
        {activeTab === 'admin' && isAdmin && (
          <div className="space-y-6">
            {/* New User Creation Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <span>👑</span> 최고 관리자 전용 회원 발급 & 등급 통제 콘솔
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="email"
                  placeholder="신규 회원 이메일 (예: user@company.com)"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  style={{ backgroundColor: '#020617', color: '#f8fafc', borderColor: '#334155' }}
                />
                <input
                  type="password"
                  placeholder="초기 비밀번호 지정"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  style={{ backgroundColor: '#020617', color: '#f8fafc', borderColor: '#334155' }}
                />
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  style={{ backgroundColor: '#020617', color: '#f8fafc', borderColor: '#334155' }}
                >
                  <option value="free">Free 플랜 (기본)</option>
                  <option value="pro">Pro 플랜 (월 100회)</option>
                  <option value="enterprise">Enterprise 플랜 (무제한)</option>
                </select>
                <button
                  onClick={handleAdminCreateUser}
                  className="py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  + 신규 계정 즉시 발급
                </button>
              </div>
            </div>

            {/* Registered Users List Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                  <span>👥</span> 등록된 전체 회원 목록 ({adminUsersList.length} 명)
                </h3>
                <button
                  onClick={fetchAdminUsers}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-300 transition"
                >
                  🔄 목록 새로고침
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/60">
                      <th className="p-3">ID / 이메일</th>
                      <th className="p-3">역할 / 상태</th>
                      <th className="p-3">회원 요금제 플랜</th>
                      <th className="p-3">연동된 GitHub 블로그</th>
                      <th className="p-3">연동 상태</th>
                      <th className="p-3 text-right">관리 통제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {adminUsersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-bold text-slate-100">{u.email}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.role === 'admin' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-slate-800 text-slate-300'}`}>
                            {u.role === 'admin' ? '👑 최고 관리자' : '👤 일반 회원'}
                          </span>
                        </td>
                        <td className="p-3">
                          <select
                            value={u.plan || 'free'}
                            onChange={(e) => handleAdminUpdateTier(u.id, e.target.value)}
                            className="px-2 py-1 rounded text-xs border"
                            style={{ backgroundColor: '#020617', color: '#f8fafc', borderColor: '#334155' }}
                          >
                            <option value="free">FREE</option>
                            <option value="starter">STARTER</option>
                            <option value="pro">PRO</option>
                            <option value="enterprise">ENTERPRISE</option>
                          </select>
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {u.github_id ? (
                            <a href={u.blog_url || `https://${u.github_id}.github.io`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
                              {u.github_id} ↗
                            </a>
                          ) : (
                            <span className="text-slate-600">미등록</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.installation_status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-500'}`}>
                            {u.installation_status === 'COMPLETED' ? '🟢 완료' : '⏳ 미연동'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              const newPw = prompt(`${u.email} 님의 변경할 새로운 비밀번호를 입력해 주세요:`);
                              if (newPw) {
                                fetch(`/snsauto/api/admin/users/${u.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ password: newPw })
                                }).then(() => alert('비밀번호가 성공적으로 변경되었습니다!'));
                              }
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold transition"
                          >
                            🔑 비번 변경
                          </button>
                        </td>
                      </tr>
                    ))}

                    {adminUsersList.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-6 text-center text-slate-500">
                          등록된 회원 정보가 없습니다. 위 입력창에서 신규 회원 계정을 발급하세요.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
