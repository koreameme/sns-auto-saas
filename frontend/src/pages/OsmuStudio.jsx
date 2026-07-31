/**
 * OsmuStudio.jsx - 유튜브 원소스 OSMU 7대 SNS 포스팅 스튜디오
 * 제목+대본 입력 → AI가 7개 플랫폼별 콘텐츠를 동시 생성
 */
import { useState, useEffect } from 'react';
import { generateOsmu, generateFromKeywords, generateFromUrlApi, generateFromYoutubeApi, autoPostToPlatformsApi } from '../api';
import CardNewsModal from '../components/CardNewsModal';

const PLATFORMS = [
  { id: 'youtube',   icon: '▶️', label: 'YouTube', color: '#ff0000' },
  { id: 'x',         icon: '✖️', label: 'X (Twitter)', color: '#ffffff' },
  { id: 'instagram', icon: '📸', label: 'Instagram', color: '#e4405f' },
  { id: 'facebook',  icon: '📘', label: 'Facebook', color: '#1877f2' },
  { id: 'threads',   icon: '🧵', label: 'Threads', color: '#ffffff' },
  { id: 'tiktok',    icon: '🎵', label: 'TikTok', color: '#69c9d0' },
  { id: 'pinterest', icon: '📌', label: 'Pinterest', color: '#e60023' },
  { id: 'linkedin',  icon: '💼', label: 'LinkedIn', color: '#0a66c2' },
  { id: 'medium',    icon: '✍️', label: 'Medium', color: '#00ab6c' },
  { id: 'tumblr',    icon: '🔮', label: 'Tumblr', color: '#36465d' },
  { id: 'reddit',    icon: '🤖', label: 'Reddit', color: '#ff4500' },
];

const RESULT_KEYS = {
  youtube:   'youtube_description',
  x:         'x_thread',
  instagram: 'instagram_caption',
  facebook:  'facebook_post',
  threads:   'threads_update',
  tiktok:    'tiktok_caption',
  pinterest: 'pinterest_description',
  linkedin:  'linkedin_post',
  medium:    'medium_article',
  tumblr:    'tumblr_post',
  reddit:    'reddit_post',
};

const TRENDING_KEYWORDS_POOL = [
  '🔥 생성형 AI 활용법',
  '📈 2026 주식 투자 전략',
  '💡 1인 창업 성공 노하우',
  '📱 숏폼 바이럴 마케팅',
  '🤖 에이전틱 AI 트렌드',
  '💰 부업 자동 수익화',
  '🎨 미드저니 프롬프트 팁',
  '⚡ 업무 자동화 툴 세팅',
  '📊 부동산 시장 핵심 전망',
  '🚀 SNS 마케팅 자동화',
  '💻 노코드 데이터 분석',
  '🧠 생산성 극대화 도구',
  '🎯 바이럴 훅 카피라이팅',
  '🛍️ 이커머스 매출 10배',
  '✨ 퍼스널 브랜딩 구축',
  '🍕 숏폼 편집 꿀팁',
  '🥑 웰니스 & 헬스테크',
  '🔮 웹3.0 & 테크 비전'
];

function getRandomKeywords(count = 10) {
  const shuffled = [...TRENDING_KEYWORDS_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export default function OsmuStudio({ currentUser, setActivePage }) {
  const userId = currentUser?.id || 1;
  const [title, setTitle] = useState(() => localStorage.getItem(`osmu_${userId}_title`) || '');
  const [script, setScript] = useState(() => localStorage.getItem(`osmu_${userId}_script`) || '');
  const [language, setLanguage] = useState(() => localStorage.getItem(`osmu_${userId}_language`) || 'ko');
  const [tone, setTone] = useState(() => localStorage.getItem(`osmu_${userId}_tone`) || 'casual');
  const [hashtagCount, setHashtagCount] = useState(() => Number(localStorage.getItem(`osmu_${userId}_hashtag_count`)) || 10);
  const [selectedPlatforms, setSelectedPlatforms] = useState(() => {
    try {
      const saved = localStorage.getItem(`osmu_${userId}_selected_platforms`);
      return saved ? JSON.parse(saved) : PLATFORMS.map(p => p.id);
    } catch {
      return PLATFORMS.map(p => p.id);
    }
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(() => {
    try {
      const saved = localStorage.getItem(`osmu_${userId}_result`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem(`osmu_${userId}_active_tab`) || '');

  // ── 키워드 기반 AI 자동 생성 ─────────────────────────────
  const [recommendedKeywords, setRecommendedKeywords] = useState(() => getRandomKeywords(10));
  const [keywords, setKeywords] = useState(() => {
    try {
      const saved = localStorage.getItem(`osmu_${userId}_keywords`);
      return saved ? JSON.parse(saved) : ['', '', '', '', ''];
    } catch {
      return ['', '', '', '', ''];
    }
  });
  const [keyGenLoading, setKeyGenLoading] = useState(false);
  const [keyGenError, setKeyGenError] = useState('');

  // ── 원소스 입력 탭 (keyword / url / youtube / direct) ──────────
  const [inputTab, setInputTab] = useState('keyword');
  const [sourceUrl, setSourceUrl] = useState('');
  const [urlGenLoading, setUrlGenLoading] = useState(false);
  const [urlGenError, setUrlGenError] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [ytGenLoading, setYtGenLoading] = useState(false);
  const [ytGenError, setYtGenError] = useState('');

  // ── Gemini NotebookLM 임베디드 탭 ──────────────────────
  const [notebookUrl, setNotebookUrl] = useState(() => localStorage.getItem(`osmu_${userId}_notebook_url`) || '');
  const [notebookContent, setNotebookContent] = useState(() => localStorage.getItem(`osmu_${userId}_notebook_content`) || '');
  const [notebookGenLoading, setNotebookGenLoading] = useState(false);
  const [notebookGenError, setNotebookGenError] = useState('');
  const [notebookEmbedActive, setNotebookEmbedActive] = useState(true);

  // ── 카드뉴스 모달 및 포스팅 선택 상태 ────────────────────────
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardPlatformId, setCardPlatformId] = useState(null);
  const [postSelectMap, setPostSelectMap] = useState({});
  const [attachedImageMap, setAttachedImageMap] = useState({});
  const [attachedVideoMap, setAttachedVideoMap] = useState({});
  const [manualImages, setManualImages] = useState([]);
  const [manualVideo, setManualVideo] = useState(null);
  const [manualContentMap, setManualContentMap] = useState({}); // 플랫폼별 커스텀 텍스트 저장 맵
  const [postFormatMap, setPostFormatMap] = useState({}); // 'text' | 'cardnews' | 'both'
  const [autoPostingLoading, setAutoPostingLoading] = useState(false);
  const [autoPostingModalOpen, setAutoPostingModalOpen] = useState(false);
  const [autoPostingResults, setAutoPostingResults] = useState(null);

  // ── 사용자 세션 변경 시 세션 격리 리셋/동기화 ───────────────
  useEffect(() => {
    setTitle(localStorage.getItem(`osmu_${userId}_title`) || '');
    setScript(localStorage.getItem(`osmu_${userId}_script`) || '');
    setLanguage(localStorage.getItem(`osmu_${userId}_language`) || 'ko');
    setTone(localStorage.getItem(`osmu_${userId}_tone`) || 'casual');
    setHashtagCount(Number(localStorage.getItem(`osmu_${userId}_hashtag_count`)) || 10);

    try {
      const kw = localStorage.getItem(`osmu_${userId}_keywords`);
      setKeywords(kw ? JSON.parse(kw) : ['', '', '', '', '']);
    } catch {
      setKeywords(['', '', '', '', '']);
    }

    try {
      const res = localStorage.getItem(`osmu_${userId}_result`);
      setResult(res ? JSON.parse(res) : null);
    } catch {
      setResult(null);
    }

    try {
      const sp = localStorage.getItem(`osmu_${userId}_selected_platforms`);
      setSelectedPlatforms(sp ? JSON.parse(sp) : PLATFORMS.map(p => p.id));
    } catch {
      setSelectedPlatforms(PLATFORMS.map(p => p.id));
    }

    setError('');
    setKeyGenError('');
  }, [userId]);

  // ── 다른 브라우저 탭 이동 후 복귀 시 자동 백그라운드 결과 동기화 ──
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const savedTitle = localStorage.getItem(`osmu_${userId}_title`);
        const savedScript = localStorage.getItem(`osmu_${userId}_script`);
        const savedResult = localStorage.getItem(`osmu_${userId}_result`);
        if (savedTitle && savedTitle !== title) setTitle(savedTitle);
        if (savedScript && savedScript !== script) setScript(savedScript);
        if (savedResult && !result) {
          try { setResult(JSON.parse(savedResult)); } catch {}
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [userId, title, script, result]);

  const handleRefreshKeywords = () => {
    setRecommendedKeywords(getRandomKeywords(10));
  };

  const handleSelectRecommendedKeyword = (rawKw) => {
    const cleanKw = rawKw.replace(/^[^\w\sㄱ-ㅎ가-힣0-9]+/g, '').trim();
    if (keywords.includes(cleanKw)) return;

    const next = [...keywords];
    const emptyIdx = next.findIndex(k => !k.trim());
    if (emptyIdx !== -1) {
      next[emptyIdx] = cleanKw;
    } else {
      next[4] = cleanKw;
    }
    setKeywords(next);
  };

  // ── LocalStorage 동기화 (유저별 격리) ─────────────────────────
  useEffect(() => { localStorage.setItem(`osmu_${userId}_title`, title); }, [title, userId]);
  useEffect(() => { localStorage.setItem(`osmu_${userId}_script`, script); }, [script, userId]);
  useEffect(() => { localStorage.setItem(`osmu_${userId}_language`, language); }, [language, userId]);
  useEffect(() => { localStorage.setItem(`osmu_${userId}_tone`, tone); }, [tone, userId]);
  useEffect(() => { localStorage.setItem(`osmu_${userId}_hashtag_count`, hashtagCount.toString()); }, [hashtagCount, userId]);
  useEffect(() => { localStorage.setItem(`osmu_${userId}_selected_platforms`, JSON.stringify(selectedPlatforms)); }, [selectedPlatforms, userId]);
  useEffect(() => {
    if (result) localStorage.setItem(`osmu_${userId}_result`, JSON.stringify(result));
    else localStorage.removeItem(`osmu_${userId}_result`);
  }, [result, userId]);
  useEffect(() => { localStorage.setItem(`osmu_${userId}_active_tab`, activeTab); }, [activeTab, userId]);
  useEffect(() => { localStorage.setItem(`osmu_${userId}_keywords`, JSON.stringify(keywords)); }, [keywords, userId]);


  const handleKeywordChange = (idx, value) => {
    setKeywords(prev => prev.map((k, i) => i === idx ? value : k));
  };

  const handleKeywordGenerate = async () => {
    const activeKeywords = keywords.filter(k => k.trim());
    if (activeKeywords.length === 0) {
      setKeyGenError('키워드를 최소 1개 입력해주세요.');
      return;
    }
    setKeyGenError('');
    setKeyGenLoading(true);
    try {
      const res = await generateFromKeywords({ user_id: userId, keywords: activeKeywords, language, tone });
      if (res.title) {
        setTitle(res.title);
        localStorage.setItem(`osmu_${userId}_title`, res.title);
      }
      if (res.script) {
        setScript(res.script);
        localStorage.setItem(`osmu_${userId}_script`, res.script);
      }
    } catch (e) {
      setKeyGenError(e.message || 'AI 생성 실패. 백엔드를 확인해주세요.');
    } finally {
      setKeyGenLoading(false);
    }
  };

  // ── 웹사이트 URL 생성 핸들러 ─────────────────────────────────
  const handleUrlGenerate = async () => {
    if (!sourceUrl.trim()) { setUrlGenError('URL을 입력해주세요.'); return; }
    if (!sourceUrl.startsWith('http')) { setUrlGenError('http:// 또는 https://로 시작하는 URL을 입력해주세요.'); return; }
    setUrlGenError('');
    setUrlGenLoading(true);
    try {
      const res = await generateFromUrlApi({ user_id: userId, url: sourceUrl, language, tone });
      if (res.title) {
        setTitle(res.title);
        localStorage.setItem(`osmu_${userId}_title`, res.title);
      }
      if (res.script) {
        setScript(res.script);
        localStorage.setItem(`osmu_${userId}_script`, res.script);
      }
    } catch (e) {
      setUrlGenError(e.message || '웹사이트 분석 실패. URL을 확인해주세요.');
    } finally {
      setUrlGenLoading(false);
    }
  };

  // ── 유튜브 링크 생성 핸들러 ──────────────────────────────────
  const handleYoutubeGenerate = async () => {
    if (!youtubeUrl.trim()) { setYtGenError('유튜브 URL을 입력해주세요.'); return; }
    if (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
      setYtGenError('유효한 유튜브 URL을 입력해주세요. (youtube.com 또는 youtu.be)'); return;
    }
    setYtGenError('');
    setYtGenLoading(true);
    try {
      const res = await generateFromYoutubeApi({ user_id: userId, url: youtubeUrl, language, tone });
      if (res.title) {
        setTitle(res.title);
        localStorage.setItem(`osmu_${userId}_title`, res.title);
      }
      if (res.script) {
        setScript(res.script);
        localStorage.setItem(`osmu_${userId}_script`, res.script);
      }
    } catch (e) {
      setYtGenError(e.message || '유튜브 분석 실패. URL을 확인해주세요.');
    } finally {
      setYtGenLoading(false);
    }
  };

  // ── Gemini NotebookLM 임베디드 생성 핸들러 ──────────────────────
  const handleNotebookGenerate = async () => {
    const rawText = notebookContent.trim() || notebookUrl.trim();
    if (!rawText) {
      setNotebookGenError('NotebookLM URL 또는 요약 노트 텍스트를 입력해주세요.');
      return;
    }
    setNotebookGenError('');
    setNotebookGenLoading(true);
    try {
      if (notebookUrl.trim() && !notebookContent.trim()) {
        const res = await generateFromUrlApi({ user_id: userId, url: notebookUrl.trim(), language, tone });
        if (res.title) {
          setTitle(res.title);
          localStorage.setItem(`osmu_${userId}_title`, res.title);
        }
        if (res.script) {
          setScript(res.script);
          localStorage.setItem(`osmu_${userId}_script`, res.script);
        }
        alert('✨ Gemini NotebookLM URL 분석 완료! 제목과 내용이 스튜디오로 추출되었습니다.');
      } else {
        const lines = notebookContent.trim().split('\n').filter(l => l.trim());
        const extractedTitle = lines[0] ? lines[0].slice(0, 50).replace(/^[#*\s]+/, '') : 'Gemini NotebookLM 요약 노트';
        const bodyScript = lines.length > 1 ? lines.slice(1).join('\n') : notebookContent.trim();

        setTitle(extractedTitle);
        setScript(bodyScript);
        localStorage.setItem(`osmu_${userId}_title`, extractedTitle);
        localStorage.setItem(`osmu_${userId}_script`, bodyScript);
        alert('✨ NotebookLM 요약 노트/대본이 스튜디오로 성공적으로 추출되었습니다!');
      }
    } catch (e) {
      setNotebookGenError(e.message || 'NotebookLM 분석 실패. 내용을 확인해주세요.');
    } finally {
      setNotebookGenLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('입력된 키워드, 제목, 대본 및 생성 결과를 모두 초기화하시겠습니까?')) {
      setTitle('');
      setScript('');
      setKeywords(['', '', '', '', '']);
      setResult(null);
      setError('');
      setKeyGenError('');
      setActiveTab('');
      [
        'osmu_title', 'osmu_script', 'osmu_result', 'osmu_keywords', 'osmu_active_tab'
      ].forEach(k => localStorage.removeItem(k));
    }
  };

  const togglePlatform = (id) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const [aiUsed, setAiUsed] = useState(null);

  const handleGenerate = async () => {
    if (!title.trim() || !script.trim()) {
      setError('제목과 대본을 입력해주세요.');
      return;
    }
    if (selectedPlatforms.length === 0) {
      setError('최소 하나의 플랫폼을 선택해주세요.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const res = await generateOsmu({
        user_id: userId,
        title,
        script,
        target_platforms: selectedPlatforms,
        language,
        tone,
        hashtag_count: hashtagCount,
      });
      setResult(res.data);
      if (res.ai_used) setAiUsed(res.ai_used);
      setActiveTab(selectedPlatforms[0]);

      // 포스팅 선택 체크박스 초기화 (선택된 플랫폼 전체 기본 체크)
      const initialMap = {};
      selectedPlatforms.forEach(pid => { initialMap[pid] = true; });
      setPostSelectMap(initialMap);
    } catch (e) {
      setError(e.message || 'AI 생성에 실패했습니다. 백엔드 서버를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // ── 카드뉴스 생성 모달 오픈 ──────────────────────────────────
  const handleOpenCardModal = (pid) => {
    setCardPlatformId(pid);
    setIsCardModalOpen(true);
  };

  // ── 카드뉴스 이미지 첨부 핸들러 ────────────────────────────────
  const handleAttachCardImage = (imageDataUris) => {
    if (cardPlatformId) {
      setAttachedImageMap(prev => ({ ...prev, [cardPlatformId]: imageDataUris }));
      // 카드뉴스 첨부 시 기본 게시 방식을 'both'(텍스트 + 카드뉴스)로 자동 선택
      setPostFormatMap(prev => ({ ...prev, [cardPlatformId]: prev[cardPlatformId] || 'both' }));
    }
  };

  // ── 내 컴퓨터 이미지 다중 파일 업로드 핸들러 ──────────────────────
  const handleUploadLocalImages = (e, targetPid) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const readPromises = files.map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => resolve(evt.target.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises).then(base64List => {
      if (targetPid) {
        setAttachedImageMap(prev => {
          const existing = prev[targetPid] ? (Array.isArray(prev[targetPid]) ? prev[targetPid] : [prev[targetPid]]) : [];
          return { ...prev, [targetPid]: [...existing, ...base64List] };
        });
        setPostFormatMap(prev => ({ ...prev, [targetPid]: prev[targetPid] || 'both' }));
      } else {
        setManualImages(prev => [...prev, ...base64List]);
      }
    }).catch(err => {
      alert('이미지 파일 읽기 실패: ' + err.message);
    });
  };

  // ── 내 컴퓨터 동영상 파일 업로드 핸들러 ─────────────────────────
  const handleUploadLocalVideo = (e, targetPid) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 120 * 1024 * 1024) {
      alert('동영상 파일 크기가 120MB를 초과합니다. 120MB 이하의 영상 파일을 선택해주세요.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const videoUri = evt.target.result;
      if (targetPid) {
        setAttachedVideoMap(prev => ({ ...prev, [targetPid]: videoUri }));
        setPostFormatMap(prev => ({ ...prev, [targetPid]: prev[targetPid] || 'both' }));
      } else {
        setManualVideo(videoUri);
      }
    };
    reader.onerror = (err) => {
      alert('동영상 파일 읽기 실패: ' + err.message);
    };
    reader.readAsDataURL(file);
  };

  // ── 수동 탭 선택 및 초기화 ─────────────────────────────────────
  const handleSelectInputTab = (tabId) => {
    setInputTab(tabId);
    if (tabId === 'manual') {
      if (!result) setResult({});
      if (!activeTab && selectedPlatforms.length > 0) {
        setActiveTab(selectedPlatforms[0]);
      }
      setPostSelectMap(prev => {
        if (Object.keys(prev).length === 0) {
          const init = {};
          selectedPlatforms.forEach(pid => { init[pid] = true; });
          return init;
        }
        return prev;
      });
    }
  };

  // ── 마스터 본문 & 미디어 전체 플랫폼 일괄 동기화 ─────────────────
  const handleApplyMasterToAll = () => {
    const masterText = script || title;
    const newMap = {};
    const newResult = {};

    selectedPlatforms.forEach(pid => {
      newMap[pid] = { text: masterText };
      newResult[RESULT_KEYS[pid]] = masterText;

      if (manualImages.length > 0) {
        setAttachedImageMap(prev => ({ ...prev, [pid]: manualImages }));
      }
      if (manualVideo) {
        setAttachedVideoMap(prev => ({ ...prev, [pid]: manualVideo }));
      }
      setPostFormatMap(prev => ({ ...prev, [pid]: 'both' }));
    });

    setManualContentMap(newMap);
    setResult(newResult);
    if (!activeTab && selectedPlatforms.length > 0) setActiveTab(selectedPlatforms[0]);

    alert(`✨ 마스터 텍스트 및 미디어가 선택하신 ${selectedPlatforms.length}개 전체 플랫폼 카드에 일괄 동기화되었습니다!`);
  };

  // ── 특정 1개 플랫폼만 단독 수동 포스팅 핸들러 ──────────────────────
  const handleSinglePlatformPost = async (pid) => {
    const pName = PLATFORMS.find(p => p.id === pid)?.label || pid;
    if (!window.confirm(`[${pName}] 플랫폼으로만 수동 포스팅을 전송하시겠습니까?`)) return;

    setAutoPostingLoading(true);
    setAutoPostingResults(null);
    setAutoPostingModalOpen(true);

    try {
      const pFormat = postFormatMap[pid] || (attachedImageMap[pid] || attachedVideoMap[pid] ? 'both' : 'text');
      const rawContent = getResultForPlatform(pid);

      let textVal = Array.isArray(rawContent) ? rawContent.join('\n\n---\n\n') : (rawContent || script || title || '');
      let imgVal = attachedImageMap[pid] || null;

      if (pFormat === 'cardnews') {
        textVal = `📌 [카드뉴스 포스팅] ${title || ''}`;
      } else if (pFormat === 'text') {
        imgVal = null;
      }

      const contentsPayload = {
        [pid]: {
          text: textVal,
          post_format: pFormat,
          image_base64: imgVal,
          video_base64: attachedVideoMap[pid] || null,
        }
      };

      const res = await autoPostToPlatformsApi({
        user_id: userId,
        selected_platforms: [pid],
        contents: contentsPayload,
      });

      setAutoPostingResults(res.results || {});
    } catch (e) {
      alert(e.message || '단독 개별 포스팅 실행에 실패했습니다.');
    } finally {
      setAutoPostingLoading(false);
    }
  };

  // ── 수동 포스팅 즉시 게시 묶음 핸들러 ───────────────────────────
  const handleManualDirectPublish = () => {
    if (!title.trim() && !script.trim() && manualImages.length === 0 && !manualVideo) {
      alert('제목, 내용 또는 이미지/동영상 미디어를 최소 하나 입력/첨부해주세요.');
      return;
    }
    if (selectedPlatforms.length === 0) {
      alert('포스팅할 타겟 플랫폼을 최소 1개 이상 선택해 주세요.');
      return;
    }

    handleApplyMasterToAll();
  };

  // ── 선택 플랫폼 원클릭 자동 포스팅 핸들러 ───────────────────────
  const handleAutoPostExecution = async () => {
    const selectedPids = Object.keys(postSelectMap).filter(pid => postSelectMap[pid]);
    if (selectedPids.length === 0) {
      alert('포스팅할 플랫폼을 최소 1개 이상 선택해 주세요.');
      return;
    }

    setAutoPostingLoading(true);
    setAutoPostingResults(null);
    setAutoPostingModalOpen(true);

    try {
      const contentsPayload = {};
      selectedPids.forEach(pid => {
        const rawContent = getResultForPlatform(pid);
        const pFormat = postFormatMap[pid] || (attachedImageMap[pid] ? 'both' : 'text');

        let textVal = Array.isArray(rawContent) ? rawContent.join('\n\n---\n\n') : (rawContent || '');
        let imgVal = attachedImageMap[pid] || null;

        if (pFormat === 'cardnews') {
          // 카드뉴스 전용 선택 시 텍스트 대신 카드뉴스 캡션 전달
          textVal = `📌 [카드뉴스 포스팅] ${title || ''}`;
        } else if (pFormat === 'text') {
          // 텍스트 전용 선택 시 첨부 이미지 제외
          imgVal = null;
        }

        contentsPayload[pid] = {
          text: textVal,
          post_format: pFormat,
          image_base64: imgVal, // 이미지 단일 String 또는 N개 이미지 Array (전체 카드뉴스/업로드 이미지)
          video_base64: attachedVideoMap[pid] || null, // 동영상 Base64
        };
      });

      const res = await autoPostToPlatformsApi({
        user_id: userId,
        selected_platforms: selectedPids,
        contents: contentsPayload,
      });

      setAutoPostingResults(res.results || {});
    } catch (e) {
      alert(e.message || '자동 포스팅 실행에 실패했습니다.');
    } finally {
      setAutoPostingLoading(false);
    }
  };

  const getPlatformDefaultUrl = (pid) => {
    const map = {
      x: 'https://x.com',
      youtube: 'https://youtube.com',
      facebook: 'https://facebook.com',
      instagram: 'https://instagram.com',
      threads: 'https://threads.net',
      tiktok: 'https://tiktok.com',
      pinterest: 'https://pinterest.com',
      linkedin: 'https://linkedin.com',
      medium: 'https://medium.com',
      tumblr: 'https://tumblr.com',
      reddit: 'https://reddit.com',
    };
    return map[pid] || 'https://x.com';
  };

  const copyToClipboard = async (text, key) => {
    await navigator.clipboard.writeText(Array.isArray(text) ? text.join('\n\n---\n\n') : text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const getResultForPlatform = (pid) => {
    if (manualContentMap[pid]?.text !== undefined) {
      return manualContentMap[pid].text;
    }
    if (!result) {
      if (inputTab === 'manual') return script || title || '';
      return null;
    }
    const key = RESULT_KEYS[pid];
    return result[key] !== undefined ? result[key] : (inputTab === 'manual' ? (script || title || '') : null);
  };

  const renderContent = (pid) => {
    const rawContent = getResultForPlatform(pid);
    const textString = typeof rawContent === 'string'
      ? rawContent
      : (Array.isArray(rawContent) ? rawContent.join('\n\n---\n\n') : (rawContent || ''));

    const platformObj = PLATFORMS.find(p => p.id === pid);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {/* 개별 플랫폼 본문 실시간 수동 편집 영역 */}
        <div style={{
          padding: '0.875rem',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📝 {platformObj?.label} 맞춤 수동 포스팅 본문 (자유 편집 가능):
            </label>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {textString.length}자
            </span>
          </div>

          <textarea
            className="form-textarea"
            style={{ width: '100%', minHeight: '140px', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '0.5rem' }}
            value={textString}
            onChange={(e) => {
              const val = e.target.value;
              setManualContentMap(prev => ({ ...prev, [pid]: { ...(prev[pid] || {}), text: val } }));
              setResult(prev => ({ ...(prev || {}), [RESULT_KEYS[pid]]: val }));
            }}
            placeholder={`${platformObj?.label}에 최종 전송할 포스팅 본문 텍스트를 자유롭게 작성/수정하세요.`}
          />
        </div>

        {/* 🚀 이 플랫폼만 단독 개별 게시 vs 선택한 전체 플랫폼 한꺼번에 등록 액션 바 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
          padding: '0.75rem 1rem',
          background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(124,58,237,0.08))',
          border: '1px solid rgba(6,182,212,0.3)',
          borderRadius: 'var(--radius-md)',
        }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm flex items-center gap-1"
            style={{ fontSize: '0.78rem', borderColor: '#06b6d4', color: '#06b6d4', fontWeight: 700 }}
            onClick={() => handleSinglePlatformPost(pid)}
          >
            🚀 이 {platformObj?.label}만 단독 수동 포스팅
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm flex items-center gap-1"
            style={{ fontSize: '0.78rem', background: 'linear-gradient(135deg, #10b981, #06b6d4)', fontWeight: 700 }}
            onClick={handleAutoPostExecution}
          >
            🚀 선택한 전체 플랫폼 한꺼번에 일괄 포스팅
          </button>
        </div>

        {/* 🔗 포스팅 발행 결과 및 게재 링크 확인 바 */}
        {autoPostingResults && autoPostingResults[pid] && (
          <div style={{
            marginTop: '0.35rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: autoPostingResults[pid].status === 'success'
              ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.12))'
              : 'rgba(239,68,68,0.15)',
            border: `1px solid ${autoPostingResults[pid].status === 'success' ? '#10b981' : '#ef4444'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>
                {autoPostingResults[pid].status === 'success' ? '🎉' : '⚠️'}
              </span>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: autoPostingResults[pid].status === 'success' ? '#10b981' : '#ef4444' }}>
                  {autoPostingResults[pid].status === 'success' ? `${platformObj?.label} 포스팅 게재 완료!` : `${platformObj?.label} 포스팅 전송 상태`}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {autoPostingResults[pid].message || '게시물이 등록되었습니다.'}
                </div>
              </div>
            </div>

            <a
              href={autoPostingResults[pid].post_url || autoPostingResults[pid].url || getPlatformDefaultUrl(pid)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary btn-sm flex items-center gap-1"
              style={{
                fontSize: '0.78rem',
                padding: '0.4rem 0.85rem',
                background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                color: 'white',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
              }}
            >
              🔗 {platformObj?.label} 발행 게시물 확인하기 ↗
            </a>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page-container">
      {/* 헤더 */}
      <div className="section-header flex justify-between items-center">
        <div>
          <h2>✨ OSMU 포스팅 스튜디오</h2>
          <p className="section-subtitle">유튜브 대본 하나로 11대 SNS 플랫폼 맞춤 콘텐츠를 AI가 자동 생성합니다.</p>
        </div>
        {(title || script || result || keywords.some(k => k.trim())) && (
          <button
            id="reset-studio-btn"
            className="btn btn-secondary btn-sm flex items-center gap-1"
            onClick={handleReset}
            style={{ fontSize: '0.8rem' }}
          >
            🔄 전체 초기화
          </button>
        )}
      </div>

      <div className="grid-2" style={{ gap: '1.5rem', alignItems: 'start' }}>
        {/* 입력 패널 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: '1rem' }}>📝 원소스 입력</div>

            {/* ── 5탭 입력 방식 선택 ──────────────────────── */}
            <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {[
                { id: 'keyword',  icon: '🏷️', label: '키워드 AI' },
                { id: 'url',      icon: '🌐', label: '웹사이트 URL AI' },
                { id: 'youtube',  icon: '🎥', label: '유튜브 링크 AI' },
                { id: 'notebook', icon: '📓', label: 'Gemini NotebookLM' },
                { id: 'direct',   icon: '✍️', label: 'AI 대본 입력' },
                { id: 'manual',   icon: '📁', label: '수동 작성 & 미디어 업로드' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleSelectInputTab(tab.id)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: inputTab === tab.id ? 'none' : '1px solid var(--border-default)',
                    background: inputTab === tab.id
                      ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-light))'
                      : 'var(--bg-elevated)',
                    color: inputTab === tab.id ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.2s',
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* ── TAB: 키워드 ──────────────────────────── */}
            {inputTab === 'keyword' && (
            <div style={{
              marginBottom: '1.25rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.05))',
              border: '1px solid rgba(124,58,237,0.25)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-light)', marginBottom: '2px' }}>
                    🏷️ 키워드로 AI 자동 생성
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    최대 5개 키워드 입력 → 제목 + 내용을 AI가 자동 작성
                  </div>
                </div>
                <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                  {keywords.filter(k => k.trim()).length}/5
                </span>
              </div>

              {/* 💥 [신규] 최근 이슈/트렌드 키워드 추천 칩 💥 */}
              <div style={{ marginBottom: '0.875rem' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    🔥 실시간 핫 이슈 키워드 (클릭 시 자동 입력)
                  </span>
                  <button
                    type="button"
                    style={{
                      background: 'none', border: 'none', color: 'var(--accent-light)',
                      cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '3px'
                    }}
                    onClick={handleRefreshKeywords}
                  >
                    🎲 랜덤 추천 새로고침
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {recommendedKeywords.map((kw, i) => {
                    const cleanKw = kw.replace(/^[^\w\sㄱ-ㅎ가-힣0-9]+/g, '').trim();
                    const isSelected = keywords.includes(cleanKw);
                    return (
                      <button
                        key={i}
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleSelectRecommendedKeyword(kw)}
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.2rem 0.65rem',
                          borderRadius: '12px',
                          background: isSelected ? 'rgba(16,185,129,0.15)' : 'var(--bg-elevated)',
                          borderColor: isSelected ? 'rgba(16,185,129,0.4)' : 'var(--border-subtle)',
                          color: isSelected ? '#10b981' : 'var(--text-primary)',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {kw} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 키워드 입력 5개 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.875rem' }}>
                {keywords.map((kw, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div style={{
                      width: '20px', height: '20px', flexShrink: 0,
                      background: kw.trim()
                        ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-light))'
                        : 'var(--bg-hover)',
                      border: kw.trim() ? 'none' : '1px solid var(--border-default)',
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem', fontWeight: 700, color: 'white',
                      transition: 'all 0.2s',
                    }}>
                      {idx + 1}
                    </div>
                    <input
                      id={`keyword-input-${idx}`}
                      className="form-input"
                      style={{
                        flex: 1,
                        padding: '0.45rem 0.75rem',
                        fontSize: '0.8rem',
                        background: kw.trim() ? 'rgba(124,58,237,0.08)' : 'var(--bg-elevated)',
                        borderColor: kw.trim() ? 'rgba(124,58,237,0.4)' : 'var(--border-default)',
                        transition: 'all 0.2s',
                      }}
                      placeholder={[
                        '예: 인공지능',
                        '예: 투자 전략',
                        '예: 2026년 트렌드',
                        '예: 초보자 가이드',
                        '예: 수익화 방법',
                      ][idx]}
                      value={kw}
                      onChange={e => handleKeywordChange(idx, e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && idx < 4 && document.getElementById(`keyword-input-${idx + 1}`)?.focus()}
                      maxLength={30}
                    />
                    {kw.trim() && (
                      <button
                        className="btn btn-sm"
                        style={{
                          padding: '0.3rem 0.5rem',
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.25)',
                          color: 'var(--accent-danger)',
                          flexShrink: 0,
                        }}
                        onClick={() => handleKeywordChange(idx, '')}
                        title="초기화"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* 에러 메시지 */}
              {keyGenError && (
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-danger)', marginBottom: '0.625rem' }}>
                  ❌ {keyGenError}
                </div>
              )}

              {/* 생성 버튼 */}
              <button
                id="btn-generate-from-keywords"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}
                onClick={handleKeywordGenerate}
                disabled={keyGenLoading || keywords.every(k => !k.trim())}
              >
                {keyGenLoading ? (
                  <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</span> AI가 제목 + 내용 생성 중...</>
                ) : (
                  <>✨ 키워드로 제목 + 내용 자동 생성</>
                )}
              </button>
            </div>
            )}

            {/* ── TAB: 웹사이트 URL ──────────────────────── */}
            {inputTab === 'url' && (
            <div style={{
              marginBottom: '1.25rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(16,185,129,0.05))',
              border: '1px solid rgba(6,182,212,0.25)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#06b6d4', marginBottom: '0.5rem' }}>
                🌐 웹사이트 URL로 AI 자동 생성
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                뉴스 기사, 블로그, 웹페이지 URL 입력 → 본문 자동 분석 → 제목 + 내용 생성
              </div>
              <input
                id="source-url-input"
                className="form-input"
                style={{ marginBottom: '0.625rem', fontSize: '0.82rem' }}
                placeholder="예: https://news.naver.com/..."
                value={sourceUrl}
                onChange={e => setSourceUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUrlGenerate()}
              />
              {urlGenError && (
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-danger)', marginBottom: '0.5rem' }}>❌ {urlGenError}</div>
              )}
              <button
                id="btn-generate-from-url"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem',
                  background: 'linear-gradient(135deg, #06b6d4, #10b981)' }}
                onClick={handleUrlGenerate}
                disabled={urlGenLoading || !sourceUrl.trim()}
              >
                {urlGenLoading
                  ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</span> 웹사이트 분석 중...</>
                  : <>🌐 웹사이트 본문 분석 후 자동 생성</>}
              </button>
            </div>
            )}

            {/* ── TAB: 유튜브 링크 ──────────────────────── */}
            {inputTab === 'youtube' && (
            <div style={{
              marginBottom: '1.25rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, rgba(255,0,0,0.08), rgba(255,69,0,0.05))',
              border: '1px solid rgba(255,0,0,0.25)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ff4444', marginBottom: '0.5rem' }}>
                🎥 유튜브 링크로 AI 자동 생성
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                유튜브 영상/Shorts URL 입력 → 자막 자동 추출 → 제목 + 내용 생성<br/>
                <span style={{ color: 'rgba(255,180,0,0.9)' }}>💡 자막이 없는 영상도 영상 제목 기반으로 생성됩니다.</span>
              </div>
              <input
                id="youtube-url-input"
                className="form-input"
                style={{ marginBottom: '0.625rem', fontSize: '0.82rem' }}
                placeholder="예: https://www.youtube.com/watch?v=... 또는 https://youtu.be/..."
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleYoutubeGenerate()}
              />
              {ytGenError && (
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-danger)', marginBottom: '0.5rem' }}>❌ {ytGenError}</div>
              )}
              <button
                id="btn-generate-from-youtube"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem',
                  background: 'linear-gradient(135deg, #ff0000, #ff6b35)' }}
                onClick={handleYoutubeGenerate}
                disabled={ytGenLoading || !youtubeUrl.trim()}
              >
                {ytGenLoading
                  ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</span> 유튜브 자막 분석 중...</>
                  : <>🎥 유튜브 영상 내용 분석 후 자동 생성</>}
              </button>
            </div>
            )}

            {/* ── TAB: Gemini NotebookLM ──────────────────────── */}
            {inputTab === 'notebook' && (
            <div style={{
              marginBottom: '1.25rem',
              padding: '1.1rem',
              background: 'linear-gradient(135deg, rgba(66,133,244,0.12), rgba(168,85,247,0.08))',
              backgroundColor: 'rgba(66,133,244,0.06)',
              border: '1px solid rgba(66,133,244,0.35)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '0.625rem' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#4285f4', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📓 Google Gemini NotebookLM 스마트 연동
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.3rem 0.75rem',
                    background: 'linear-gradient(135deg, #4285f4, #a855f7)',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    const targetUrl = notebookUrl.trim() || 'https://notebooklm.google.com';
                    window.open(targetUrl, 'notebooklm_window', 'width=950,height=850,scrollbars=yes');
                  }}
                >
                  🌐 NotebookLM 분할 팝업창 열기 ↗
                </button>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.875rem', lineHeight: '1.45' }}>
                💡 <b>Google 보안 정책(X-Frame-Options)</b>으로 인해 NotebookLM 서비스는 사이드 분할 창으로 열립니다.<br/>
                상단 <b>[NotebookLM 분할 팝업창 열기]</b> 버튼을 누르면 우측에 화면이 뜨며, 요약 노트/대본을 아래 박스에 붙여넣으면 AI 포스팅으로 자동 변환됩니다.
              </div>

              {/* URL 입력 필드 */}
              <div style={{ marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  NotebookLM 공유 또는 노트 링크 (선택)
                </label>
                <input
                  id="notebook-url-input"
                  className="form-input"
                  style={{ fontSize: '0.8rem', background: 'var(--bg-card)' }}
                  placeholder="예: https://notebooklm.google.com/notebook/..."
                  value={notebookUrl}
                  onChange={e => {
                    setNotebookUrl(e.target.value);
                    localStorage.setItem(`osmu_${userId}_notebook_url`, e.target.value);
                  }}
                />
              </div>

              {/* NotebookLM 요약 메모/대본 직접 입력 */}
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  📓 NotebookLM 생성 노트 / 팟캐스트 오디오 대본 (복사-붙여넣기)
                </label>
                <textarea
                  id="notebook-content-textarea"
                  className="form-textarea"
                  rows={5}
                  placeholder="NotebookLM에서 생성된 요약 노트, 대본 내용 또는 팟캐스트 아티클 텍스트를 여기에 붙여넣으세요..."
                  value={notebookContent}
                  onChange={e => {
                    setNotebookContent(e.target.value);
                    localStorage.setItem(`osmu_${userId}_notebook_content`, e.target.value);
                  }}
                  style={{ fontSize: '0.82rem', background: 'var(--bg-elevated)', lineHeight: '1.5' }}
                />
              </div>

              {notebookGenError && (
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-danger)', marginBottom: '0.5rem' }}>❌ {notebookGenError}</div>
              )}

              {/* 분석 및 포스팅 생성 버튼 */}
              <button
                id="btn-notebook-generate"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem', background: 'linear-gradient(135deg, #4285f4, #a855f7)', fontWeight: 700 }}
                onClick={handleNotebookGenerate}
                disabled={notebookGenLoading || (!notebookContent.trim() && !notebookUrl.trim())}
              >
                {notebookGenLoading ? (
                  <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</span> NotebookLM 대본 추출 및 스튜디오 연동 중...</>
                ) : (
                  <>✨ NotebookLM 본문 분석 후 OSMU 자동 생성</>
                )}
              </button>
            </div>
            )}

            {/* ── TAB: 직접 입력 (항상 보임) ──────── */}
            {inputTab === 'direct' && (
            <div style={{
              marginBottom: '0.5rem',
              padding: '0.75rem 1rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem', color: 'var(--text-muted)',
            }}>
              ✍️ 아래 <strong style={{ color: 'var(--text-secondary)' }}>동영상 제목</strong>과 <strong style={{ color: 'var(--text-secondary)' }}>대본/내용</strong> 필드에 직접 입력 후 생성 버튼을 눌러주세요.
            </div>
            )}

            {/* ── TAB: 수동 작성 & 미디어 직접 업로드 ──────── */}
            {inputTab === 'manual' && (
            <div style={{
              marginBottom: '1.25rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.08))',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', marginBottom: '0.4rem' }}>
                📁 수동 포스팅 작성 & 내 컴퓨터 미디어 직접 업로드
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
                AI 생성 없이 사용자가 직접 텍스트와 이미지(PNG/JPG), 동영상(MP4/MOV)을 선택하여 타겟 플랫폼으로 직접 업로드합니다.
              </div>

              {/* 내 컴퓨터 파일 직접 업로드 버튼 그룹 */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
                <label className="btn btn-secondary btn-sm flex items-center gap-1" style={{ cursor: 'pointer', margin: 0, fontSize: '0.78rem' }}>
                  🖼️ 이미지 파일 선택 (다중)
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleUploadLocalImages(e)} />
                </label>

                <label className="btn btn-secondary btn-sm flex items-center gap-1" style={{ cursor: 'pointer', margin: 0, fontSize: '0.78rem' }}>
                  🎬 동영상 파일 선택 (MP4/MOV)
                  <input type="file" accept="video/*" style={{ display: 'none' }} onChange={e => handleUploadLocalVideo(e)} />
                </label>
              </div>

              {/* 이미지 썸네일 스트립 미리보기 */}
              {manualImages.length > 0 && (
                <div style={{ marginBottom: '0.875rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981', marginBottom: '6px' }}>
                    🖼️ 업로드된 이미지 ({manualImages.length}장):
                  </div>
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {manualImages.map((imgUri, idx) => (
                      <div key={idx} style={{ position: 'relative' }}>
                        <img src={imgUri} alt={`업로드 ${idx+1}`} style={{ width: '52px', height: '52px', borderRadius: '6px', objectFit: 'cover', border: '1px solid rgba(16,185,129,0.5)' }} />
                        <button
                          type="button"
                          onClick={() => setManualImages(prev => prev.filter((_, i) => i !== idx))}
                          style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ff4444', color: '#fff', border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 동영상 플레이어 미리보기 */}
              {manualVideo && (
                <div style={{ marginBottom: '0.875rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#06b6d4' }}>🎬 업로드된 동영상 미리보기:</span>
                    <button type="button" onClick={() => setManualVideo(null)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '0.72rem' }}>✕ 삭제</button>
                  </div>
                  <video controls src={manualVideo} style={{ width: '100%', maxHeight: '200px', borderRadius: '6px', background: '#000' }} />
                </div>
              )}

              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem', background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}
                onClick={handleManualDirectPublish}
              >
                🚀 타겟 플랫폼 수동 포스팅 즉시 적용
              </button>
            </div>
            )}
            {/* ────────────────────────────────────────────── */}


            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div className="form-group">
                <label className="form-label">동영상 제목 *</label>
                <input
                  id="osmu-title"
                  className="form-input"
                  placeholder="예: 2026년 인공지능 투자 완전 정복 가이드"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">대본 / 내용 요약 * (최대 3,000자 권장)</label>
                <textarea
                  id="osmu-script"
                  className="form-textarea"
                  style={{ minHeight: '180px' }}
                  placeholder="유튜브 동영상 대본 또는 내용 요약을 입력하세요. AI가 각 SNS 플랫폼에 최적화된 형태로 변환합니다."
                  value={script}
                  onChange={e => setScript(e.target.value)}
                />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                  {script.length}자
                </div>
              </div>

              {/* 옵션 */}
              <div className="grid-2" style={{ gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">언어</label>
                  <select id="osmu-lang" className="form-select" value={language} onChange={e => setLanguage(e.target.value)}>
                    <option value="ko">한국어</option>
                    <option value="en">영어</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">톤</label>
                  <select id="osmu-tone" className="form-select" value={tone} onChange={e => setTone(e.target.value)}>
                    <option value="casual">캐주얼</option>
                    <option value="professional">전문적</option>
                    <option value="fun">재밌고 유쾌하게</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">해시태그 수: {hashtagCount}개</label>
                <input
                  type="range" min="3" max="30" value={hashtagCount}
                  onChange={e => setHashtagCount(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                />
              </div>
            </div>
          </div>

          {/* 플랫폼 선택 */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '0.875rem' }}>📡 타겟 플랫폼 선택</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {PLATFORMS.map(p => (
                <button
                  key={p.id}
                  id={`platform-toggle-${p.id}`}
                  onClick={() => togglePlatform(p.id)}
                  className="btn btn-sm"
                  style={{
                    background: selectedPlatforms.includes(p.id)
                      ? `linear-gradient(135deg, ${p.color}33, ${p.color}11)`
                      : 'var(--bg-elevated)',
                    border: selectedPlatforms.includes(p.id)
                      ? `1px solid ${p.color}66`
                      : '1px solid var(--border-default)',
                    color: selectedPlatforms.includes(p.id) ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)', padding: '0.875rem 1rem', color: 'var(--accent-danger)', fontSize: '0.875rem',
            }}>
              <div style={{ marginBottom: error.includes('API 키') ? '0.5rem' : 0 }}>❌ {error}</div>
              {error.includes('API 키') && setActivePage && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.8rem' }}
                  onClick={() => setActivePage('apikeys')}
                >
                  🔑 AI API 키 관리 센터로 이동하기 ↗
                </button>
              )}
            </div>
          )}

          <button
            id="btn-generate-osmu"
            className="btn btn-primary btn-lg"
            onClick={handleGenerate}
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loading ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</span>
                AI가 {selectedPlatforms.length}개 플랫폼 콘텐츠 생성 중...
              </>
            ) : (
              <>✨ AI 콘텐츠 생성</>
            )}
          </button>
        </div>

        {/* 결과 패널 */}
        <div className="card" style={{ minHeight: '400px' }}>
          <div className="card-header">
            <div className="card-title">🎯 생성된 콘텐츠</div>
            {result && result.hashtags && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => copyToClipboard(result.hashtags.map(t => `#${t}`).join(' '), 'hashtags')}
              >
                {copiedKey === 'hashtags' ? '✅ 복사됨' : '# 해시태그 복사'}
              </button>
            )}
          </div>

          {/* 최근 사용된 AI 모델 & 키 표시 트래커 Badge */}
          {aiUsed && (
            <div style={{
              padding: '0.6rem 0.875rem',
              marginBottom: '1rem',
              background: 'rgba(124,58,237,0.1)',
              border: '1px solid rgba(124,58,237,0.3)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justify: 'between',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '1rem' }}>🤖</span>
                <strong style={{ color: 'var(--accent-light)' }}>현재 사용된 AI 모델 & 키:</strong>
                <span className="badge badge-purple" style={{ fontSize: '0.725rem', fontWeight: 700 }}>
                  ⚡ {aiUsed.provider ? aiUsed.provider.toUpperCase() : 'AI'} ({aiUsed.api_key_masked})
                </span>
              </div>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                생성 시각: {aiUsed.used_at}
              </span>
            </div>
          )}

          {!result && !loading && inputTab !== 'manual' && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '300px', gap: '1rem', color: 'var(--text-muted)',
            }}>
              <div style={{ fontSize: '3rem' }}>✨</div>
              <div style={{ fontSize: '0.9rem' }}>원하는 타겟 플랫폼을 선택하고 AI 생성 또는 수동 탭을 클릭해 보세요.<br/>11개 플랫폼용 맞춤 편집창이 펼쳐집니다.</div>
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="shimmer" style={{ height: `${40 + i * 10}px` }} />
              ))}
            </div>
          )}

          {(result || inputTab === 'manual') && (
            <div>
              {/* 해시태그 */}
              {result && result.hashtags && (
                <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {result.hashtags.map((tag, i) => (
                    <span key={i} className="badge badge-purple">#{tag}</span>
                  ))}
                </div>
              )}

              {/* 11대 타겟 플랫폼 탭 선택 바 */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                {selectedPlatforms.map(pid => {
                  const p = PLATFORMS.find(x => x.id === pid);
                  if (!p) return null;
                  const currentTab = activeTab || selectedPlatforms[0];
                  const isSelected = currentTab === pid;
                  const hasMedia = attachedImageMap[pid] || attachedVideoMap[pid];

                  return (
                    <button
                      key={pid}
                      id={`result-tab-${pid}`}
                      onClick={() => setActiveTab(pid)}
                      className="btn btn-sm"
                      style={{
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.78rem',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        background: isSelected
                          ? `linear-gradient(135deg, ${p.color}44, ${p.color}22)`
                          : 'var(--bg-elevated)',
                        border: isSelected
                          ? `2px solid ${p.color || '#10b981'}`
                          : '1px solid var(--border-default)',
                        color: isSelected ? '#fff' : 'var(--text-secondary)',
                        fontWeight: isSelected ? 700 : 500,
                        boxShadow: isSelected ? `0 0 12px ${p.color}44` : 'none',
                        transition: 'all 0.2s',
                      }}
                    >
                      {p.icon} {p.label} {hasMedia ? '📎' : ''}
                    </button>
                  );
                })}
              </div>

              {/* 활성 탭 콘텐츠 및 툴바 */}
              {(activeTab || selectedPlatforms[0]) && (
                <div>
                  <div className="flex justify-between items-center" style={{
                    marginBottom: '0.75rem',
                    padding: '0.625rem 0.875rem',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    {/* 선택 포스팅 체크박스 */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <input
                        type="checkbox"
                        checked={postSelectMap[activeTab] !== false}
                        onChange={(e) => setPostSelectMap(prev => ({ ...prev, [activeTab]: e.target.checked }))}
                        style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                      />
                      <span>☑️ {PLATFORMS.find(p => p.id === activeTab)?.label} 포스팅 선택</span>
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {/* 카드뉴스 이미지 생성 버튼 */}
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.2))', border: '1px solid rgba(124,58,237,0.4)' }}
                        onClick={() => handleOpenCardModal(activeTab)}
                      >
                        🎨 카드뉴스 만들기
                      </button>

                      {/* 내 컴퓨터 이미지 파일 수동 첨부 버튼 */}
                      <label className="btn btn-secondary btn-sm flex items-center gap-1" style={{ fontSize: '0.75rem', cursor: 'pointer', margin: 0 }}>
                        🖼️ 이미지 업로드
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          style={{ display: 'none' }}
                          onChange={(e) => handleUploadLocalImages(e, activeTab)}
                        />
                      </label>

                      {/* 내 컴퓨터 동영상 파일 수동 첨부 버튼 */}
                      <label className="btn btn-secondary btn-sm flex items-center gap-1" style={{ fontSize: '0.75rem', cursor: 'pointer', margin: 0 }}>
                        🎬 동영상 업로드
                        <input
                          type="file"
                          accept="video/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleUploadLocalVideo(e, activeTab)}
                        />
                      </label>

                      {/* 본문 복사 버튼 */}
                      <button
                        id={`copy-${activeTab}`}
                        className="btn btn-secondary btn-sm"
                        onClick={() => copyToClipboard(getResultForPlatform(activeTab), activeTab)}
                      >
                        {copiedKey === activeTab ? '✅ 복사됨!' : '📋 복사'}
                      </button>
                    </div>
                  </div>

                  {/* 📌 게시 형식 선택 바 (텍스트 vs 카드뉴스 vs 둘 다) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    padding: '0.5rem 0.75rem',
                    marginBottom: '0.75rem',
                    background: 'var(--bg-elevated, #1a1726)',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                    borderRadius: 'var(--radius-md, 10px)',
                  }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      📌 게시 형식 선택:
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${(!postFormatMap[activeTab] || postFormatMap[activeTab] === 'text') ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setPostFormatMap(prev => ({ ...prev, [activeTab]: 'text' }))}
                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                      >
                        📝 텍스트만
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${postFormatMap[activeTab] === 'cardnews' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setPostFormatMap(prev => ({ ...prev, [activeTab]: 'cardnews' }))}
                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                      >
                        🖼️ 카드뉴스만
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${postFormatMap[activeTab] === 'both' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setPostFormatMap(prev => ({ ...prev, [activeTab]: 'both' }))}
                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                      >
                        ✨ 텍스트 + 미디어 전체
                      </button>
                    </div>
                  </div>

                  {/* 첨부된 카드뉴스/이미지 미리보기 스니펫 (전체 슬라이드 썸네일 스트립) */}
                  {attachedImageMap[activeTab] && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '0.75rem',
                      marginBottom: '0.75rem',
                      background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.35)',
                      borderRadius: 'var(--radius-md)',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', maxWidth: '300px', paddingBottom: '2px' }}>
                        {(Array.isArray(attachedImageMap[activeTab])
                          ? attachedImageMap[activeTab]
                          : [attachedImageMap[activeTab]]
                        ).map((imgUri, idx) => (
                          <img
                            key={idx}
                            src={imgUri}
                            alt={`슬라이드 ${idx + 1}`}
                            title={`이미지 #${idx + 1}`}
                            style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              border: '1.5px solid rgba(16,185,129,0.6)',
                              flexShrink: 0,
                            }}
                          />
                        ))}
                      </div>
                      <div style={{ flex: 1, minWidth: '160px' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981' }}>
                          🖼️ 이미지 미디어 {Array.isArray(attachedImageMap[activeTab]) ? attachedImageMap[activeTab].length : 1}장이 포스팅에 첨부되었습니다.
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          선택하신 게시 방식({postFormatMap[activeTab] === 'cardnews' ? '이미지만' : (postFormatMap[activeTab] === 'text' ? '텍스트만' : '텍스트 + 미디어 전체')})으로 전송됩니다.
                        </div>
                      </div>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.68rem', padding: '3px 8px' }}
                        onClick={() => setAttachedImageMap(prev => ({ ...prev, [activeTab]: null }))}
                      >
                        ✕ 첨부 취소
                      </button>
                    </div>
                  )}

                  {/* 첨부된 동영상 미디어 미리보기 스니펫 */}
                  {attachedVideoMap[activeTab] && (
                    <div style={{
                      marginTop: '0.75rem',
                      marginBottom: '0.75rem',
                      padding: '0.75rem',
                      background: 'rgba(6,182,212,0.08)',
                      border: '1px solid rgba(6,182,212,0.35)',
                      borderRadius: 'var(--radius-md)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#06b6d4' }}>
                          🎬 첨부된 동영상 미디어 (MP4/MOV/WebM)
                        </span>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.68rem', padding: '3px 8px' }}
                          onClick={() => setAttachedVideoMap(prev => ({ ...prev, [activeTab]: null }))}
                        >
                          ✕ 영상 취소
                        </button>
                      </div>
                      <video
                        controls
                        src={attachedVideoMap[activeTab]}
                        style={{ width: '100%', maxHeight: '240px', borderRadius: '8px', background: '#000' }}
                      />
                    </div>
                  )}

                  {renderContent(activeTab)}
                </div>
              )}

              {/* ── 선택된 N개 플랫폼 마스터 자동 포스팅 액션 패널 ──── */}
              <div style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.12))',
                border: '1px solid rgba(16,185,129,0.35)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🚀 선택된 플랫폼 원클릭 자동 포스팅
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    총 <strong style={{ color: '#10b981' }}>{Object.values(postSelectMap).filter(Boolean).length}개</strong> 플랫폼이 포스팅 대상으로 선택되었습니다.
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                    boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
                    fontSize: '0.875rem',
                    padding: '0.625rem 1.25rem'
                  }}
                  onClick={handleAutoPostExecution}
                  disabled={Object.values(postSelectMap).filter(Boolean).length === 0}
                >
                  🚀 선택된 {Object.values(postSelectMap).filter(Boolean).length}개 플랫폼 자동 포스팅 실행
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 카드뉴스 캔버스 디자이너 모달 ────────────────── */}
      <CardNewsModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        platformLabel={PLATFORMS.find(p => p.id === cardPlatformId)?.label || 'Social'}
        defaultTitle={title || 'SNS 메인 타이틀'}
        defaultText={Array.isArray(getResultForPlatform(cardPlatformId)) ? getResultForPlatform(cardPlatformId).join('\n\n') : (getResultForPlatform(cardPlatformId) || '')}
        onAttachImage={handleAttachCardImage}
      />

      {/* ── 자동 포스팅 결과 실시간 진행 모달 ──────────────── */}
      {autoPostingModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-card, #13111c)', border: '1px solid var(--border-default)',
            borderRadius: '20px', width: '100%', maxWidth: '540px', padding: '1.5rem'
          }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              🚀 선택 플랫폼 자동 포스팅 진행 현황
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              선택한 플랫폼으로 본문 텍스트 및 카드뉴스 이미지를 실시간 전송 중입니다.
            </p>

            {autoPostingLoading && (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <span style={{ fontSize: '2.5rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</span>
                <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  포스팅 데이터를 해당 플랫폼으로 안전하게 전송하고 있습니다...
                </div>
              </div>
            )}

            {!autoPostingLoading && autoPostingResults && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', maxHeight: '320px', overflowY: 'auto' }}>
                {Object.entries(autoPostingResults).map(([pid, res]) => {
                  const p = PLATFORMS.find(x => x.id === pid);
                  return (
                    <div key={pid} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.75rem', borderRadius: '10px', background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.1rem' }}>{p?.icon || '🌐'}</span>
                        <div>
                          <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#fff' }}>{p?.label || pid}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{res.message}</div>
                        </div>
                      </div>
                      <span className={`badge ${res.status === 'success' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.7rem' }}>
                        {res.status === 'success' ? '🟢 완료' : '🔴 오류'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setAutoPostingModalOpen(false)}>
                확인 및 닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
