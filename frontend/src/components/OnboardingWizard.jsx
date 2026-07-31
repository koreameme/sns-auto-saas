import React, { useState } from 'react';

export default function OnboardingWizard({ user, onComplete }) {
  const [phase, setPhase] = useState('A'); // A: GitHub Signup & ID -> B: Affiliate & SNS Vault -> C: Auto Post Guide
  const [githubId, setGithubId] = useState(user?.github_id || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdBlogUrl, setCreatedBlogUrl] = useState(user?.blog_url || '');

  const handleSetupGithubBlog = async () => {
    if (!githubId.trim()) {
      setErrorMsg('GitHub ID를 입력해 주세요.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/setup-github-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id || 1,
          github_id: githubId.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setCreatedBlogUrl(data.blog_url);
        setPhase('B');
      } else {
        setErrorMsg(data.message || data.detail || '블로그 개설에 실패했습니다.');
      }
    } catch (err) {
      setErrorMsg('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      style={{ backgroundColor: 'rgba(2, 6, 23, 0.95)', backdropFilter: 'blur(12px)' }}
    >
      <div 
        className="text-white w-full max-w-2xl rounded-2xl p-6 md:p-8 shadow-2xl relative border"
        style={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
      >
        
        {/* Step Progress Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧙‍♂️</span>
            <div>
              <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                SaaS 오토 블로그 1초 온보딩 가이드
              </h2>
              <p className="text-xs text-slate-400">3단계 빠른 설정을 마치면 대시보드가 가동됩니다.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className={`px-2.5 py-1 rounded-full ${phase === 'A' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>1. 깃허브</span>
            <span className="text-slate-600">➔</span>
            <span className={`px-2.5 py-1 rounded-full ${phase === 'B' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>2. API/SNS</span>
            <span className="text-slate-600">➔</span>
            <span className={`px-2.5 py-1 rounded-full ${phase === 'C' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>3. 시작하기</span>
          </div>
        </div>

        {/* PHASE A: GitHub Signup Guide & ID Input */}
        {phase === 'A' && (
          <div className="space-y-6">
            <div className="p-4 border rounded-xl" style={{ backgroundColor: '#1e1b4b', borderColor: '#4338ca' }}>
              <h3 className="text-base font-bold text-indigo-300 mb-1">Step 1. GitHub 회원가입 & ID 입력</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                아직 GitHub 계정이 없으신가요? 먼저 깃허브에 회원가입을 완료해 주세요.<br/>
                가입 후 본인의 <strong>GitHub ID(아이디)</strong>를 아래에 입력하시면 1초 만에 깃허브 블로그가 자동 개설됩니다.
              </p>
              <div className="mt-3">
                <a 
                  href="https://github.com/signup" 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-indigo-300 text-xs font-semibold rounded-lg border transition"
                  style={{ backgroundColor: '#1e293b', borderColor: '#475569' }}
                >
                  🌐 GitHub 1초 회원가입 페이지 이동 ↗
                </a>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                사용자의 GitHub ID (아이디)
              </label>
              <input
                type="text"
                value={githubId}
                onChange={(e) => setGithubId(e.target.value)}
                placeholder="예: koreameme001"
                className="w-full px-4 py-3 border rounded-xl text-white placeholder-slate-500 focus:outline-none text-sm"
                style={{ backgroundColor: '#020617', borderColor: '#334155' }}
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-red-400 p-3 rounded-lg border" style={{ backgroundColor: '#450a0a', borderColor: '#991b1b' }}>
                ⚠️ {errorMsg}
              </p>
            )}

            <button
              onClick={handleSetupGithubBlog}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  GitHub REST API로 블로그 1초 자동 개설 중...
                </>
              ) : (
                '🚀 깃허브 블로그 1초 자동 개설하기 ➔'
              )}
            </button>
          </div>
        )}

        {/* PHASE B: Affiliate API Vault & SNS Connection Guide */}
        {phase === 'B' && (
          <div className="space-y-6">
            <div className="p-4 border rounded-xl" style={{ backgroundColor: '#022c22', borderColor: '#059669' }}>
              <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
                <span>🎉</span>
                <h3>블로그 개설 완료: {createdBlogUrl}</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Step 2. 제휴 API 키와 4대 SNS 계정을 연동하면 자동 포스팅 및 수익 창출 준비가 완벽해집니다.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border" style={{ backgroundColor: '#020617', borderColor: '#334155' }}>
                <h4 className="text-xs font-bold text-indigo-400 mb-2">🔑 1. 제휴 API 키 설정</h4>
                <p className="text-xs text-slate-400 mb-3">쿠팡파트너스, 애드픽, 링크프라이스 API 키를 등록하세요.</p>
                <span className="inline-block px-2.5 py-1 text-indigo-300 text-xs font-medium rounded-md border" style={{ backgroundColor: '#1e1b4b', borderColor: '#3730a3' }}>
                  대시보드 [설정] 탭에서 가능
                </span>
              </div>

              <div className="p-4 rounded-xl border" style={{ backgroundColor: '#020617', borderColor: '#334155' }}>
                <h4 className="text-xs font-bold text-purple-400 mb-2">📱 2. 4대 SNS 계정 연동</h4>
                <p className="text-xs text-slate-400 mb-3">인스타그램, 페이스북, 스레드, X 계정을 1초 연동하세요.</p>
                <span className="inline-block px-2.5 py-1 text-purple-300 text-xs font-medium rounded-md border" style={{ backgroundColor: '#3b0764', borderColor: '#6b21a8' }}>
                  대시보드 [SNS 연동] 탭에서 가능
                </span>
              </div>
            </div>

            <button
              onClick={() => setPhase('C')}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg transition text-sm"
            >
              다음 단계: 블로그 포스팅 & SNS 발송 안내 보기 ➔
            </button>
          </div>
        )}

        {/* PHASE C: Blog & SNS Publishing Guide & Start */}
        {phase === 'C' && (
          <div className="space-y-6">
            <div className="p-4 border rounded-xl" style={{ backgroundColor: '#3b0764', borderColor: '#7e22ce' }}>
              <h3 className="text-base font-bold text-purple-300 mb-1">Step 3. 오토 포스팅 & SNS 일괄/개별 발송</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                모든 설정이 완성되었습니다! 5개 제휴 URL을 입력하시면 AI 구글 SEO 블로그가 생성되고 4대 SNS로 스마트 포스팅됩니다.
              </p>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-2 p-3 rounded-lg border" style={{ backgroundColor: '#020617', borderColor: '#334155' }}>
                <span className="text-indigo-400 font-bold">1.</span>
                <p><strong>SEO 블로그 자동 게재</strong>: 1번 대표이미지 배지 합성 + EEAT 5종 상품 비교표 + 유튜브 비디오가 포함된 글이 <code className="text-indigo-300">{createdBlogUrl}/posts/post-102.html</code> 로 1초 만에 자동 게시됩니다.</p>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg border" style={{ backgroundColor: '#020617', borderColor: '#334155' }}>
                <span className="text-purple-400 font-bold">2.</span>
                <p><strong>스마트 SNS 포스팅</strong>: 연동된 인스타그램, 페이스북, 스레드, X로 숏 카피+블로그 URL이 일괄/개별 자동 게재됩니다.</p>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg border" style={{ backgroundColor: '#020617', borderColor: '#334155' }}>
                <span className="text-emerald-400 font-bold">3.</span>
                <p><strong>수동 복사 패널</strong>: AI가 작성한 2~3줄 카피를 1클릭 복사해 수동으로 게시할 수도 있습니다.</p>
              </div>
            </div>

            <button
              onClick={() => onComplete && onComplete(createdBlogUrl)}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white font-extrabold rounded-xl shadow-xl transition text-base tracking-wide"
            >
              🚀 실전 대시보드 시작하기!
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
