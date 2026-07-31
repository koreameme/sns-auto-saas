import { useState, useRef, useEffect, useMemo } from 'react';

// 표준 고정 테마 목록
export const CARD_NEWS_THEMES = [
  {
    id: 'deep_violet',
    name: '🌌 딥 바이올렛 (AI/IT)',
    desc: '세련된 테크, AI, IT 기술 주제',
    bgGradient: ['#0f0c20', '#1a103c', '#2a1254'],
    accentColor: '#a78bfa',
    textColor: '#ffffff',
    subTextColor: '#cbd5e1',
    badgeBg: 'rgba(167, 139, 250, 0.25)',
    badgeBorder: '#a78bfa',
    cardBg: 'rgba(255, 255, 255, 0.08)',
    bgImageUrl: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=1080&q=80',
  },
  {
    id: 'luxury_gold',
    name: '👑 럭셔리 골드 (경제/주식)',
    desc: '주식, 부동산, 경제, 고수익 주제',
    bgGradient: ['#121110', '#241f19', '#3b3021'],
    accentColor: '#fbbf24',
    textColor: '#ffffff',
    subTextColor: '#fef3c7',
    badgeBg: 'rgba(251, 191, 36, 0.25)',
    badgeBorder: '#fbbf24',
    cardBg: 'rgba(255, 255, 255, 0.08)',
    bgImageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1080&q=80',
  },
  {
    id: 'emerald_ocean',
    name: '🌊 에메랄드 오션 (뉴스/건강)',
    desc: '건강, 웰니스, 전문 비즈니스 뉴스',
    bgGradient: ['#041a24', '#0a2e38', '#0e454f'],
    accentColor: '#2dd4bf',
    textColor: '#ffffff',
    subTextColor: '#e6fffa',
    badgeBg: 'rgba(45, 212, 191, 0.25)',
    badgeBorder: '#2dd4bf',
    cardBg: 'rgba(255, 255, 255, 0.08)',
    bgImageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1080&q=80',
  },
  {
    id: 'pop_sunset',
    name: '🔥 팝 선셋 (마케팅/바이럴)',
    desc: 'SNS 바이럴, 마케팅, 숏폼, 꿀팁',
    bgGradient: ['#3b0764', '#701a75', '#be123c'],
    accentColor: '#fb7185',
    textColor: '#ffffff',
    subTextColor: '#ffe4e6',
    badgeBg: 'rgba(251, 113, 133, 0.25)',
    badgeBorder: '#fb7185',
    cardBg: 'rgba(255, 255, 255, 0.1)',
    bgImageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1080&q=80',
  },
  {
    id: 'minimal_mono',
    name: '⚪ 미니멀 모던 (인사이트)',
    desc: '명확하고 정갈한 모던 흑백 인사이트',
    bgGradient: ['#18181b', '#27272a', '#3f3f46'],
    accentColor: '#38bdf8',
    textColor: '#ffffff',
    subTextColor: '#e2e8f0',
    badgeBg: 'rgba(56, 189, 248, 0.25)',
    badgeBorder: '#38bdf8',
    cardBg: 'rgba(255, 255, 255, 0.08)',
    bgImageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080&q=80',
  },
];

// 안전한 둥근 사각형 캔버스 그리기 헬퍼 (구형 브라우저 및 호환성 지원)
function drawRoundRect(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

// 캔버스 텍스트 자동 줄바꿈 헬퍼 함수 (상단 최상위 스코프에 배치)
function getWrappedLines(ctx, text, maxWidth) {
  const safeText = typeof text === 'string' ? text : String(text || '');
  const words = safeText.split(' ');
  const lines = [];
  let currentLine = '';
  for (let word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// 본문 내용/주제 분석에 따라 맞춤 5종 테마 동적 생성 함수
export function generateDynamicThemesForContent(title = '', text = '') {
  const safeTitle = typeof title === 'string' ? title : String(title || '');
  const safeText = typeof text === 'string' 
    ? text 
    : (Array.isArray(text) ? text.join(' ') : String(text || ''));
  const combined = (safeTitle + ' ' + safeText).toLowerCase();

  // 1. 여름휴가 / 여행 / 휴양
  if (/여름|휴가|여행|바다|비치|수영|호텔|리조트|관광|캠핑|항공|여권|비행기|숙소|제주|동남아|해변/.test(combined)) {
    return {
      category: '🌴 여름휴가 & 여행 레저 주제',
      themes: [
        {
          id: 'dyn_summer_1',
          name: '🏖️ 세이셸 에메랄드 비치',
          desc: '청량하고 시원한 청록빛 에메랄드 바다 감성',
          bgGradient: ['#022c22', '#065f46', '#047857'],
          accentColor: '#34d399',
          textColor: '#ffffff',
          subTextColor: '#e6fffa',
          badgeBg: 'rgba(52, 211, 153, 0.25)',
          badgeBorder: '#34d399',
          cardBg: 'rgba(255, 255, 255, 0.08)',
          bgImageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1080&q=80',
        },
        {
          id: 'dyn_summer_2',
          name: '🍹 트로피컬 썬샤인',
          desc: '활기차고 따뜻한 아일랜드 햇살 오렌지',
          bgGradient: ['#451a03', '#78350f', '#b45309'],
          accentColor: '#fbbf24',
          textColor: '#ffffff',
          subTextColor: '#fef3c7',
          badgeBg: 'rgba(251, 191, 36, 0.25)',
          badgeBorder: '#fbbf24',
          cardBg: 'rgba(255, 255, 255, 0.08)',
          bgImageUrl: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=1080&q=80',
        },
        {
          id: 'dyn_summer_3',
          name: '🌊 산토리니 딥블루',
          desc: '깊고 선명한 지중해 바다 코발트 블루',
          bgGradient: ['#075985', '#0369a1', '#0284c7'],
          accentColor: '#38bdf8',
          textColor: '#ffffff',
          subTextColor: '#e0f2fe',
          badgeBg: 'rgba(56, 189, 248, 0.25)',
          badgeBorder: '#38bdf8',
          cardBg: 'rgba(255, 255, 255, 0.08)',
          bgImageUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1080&q=80',
        },
        {
          id: 'dyn_summer_4',
          name: '🌅 핑크 선셋 비치',
          desc: '낭만적인 석양 노을빛 핑크 코랄',
          bgGradient: ['#4c0519', '#881337', '#be123c'],
          accentColor: '#fb7185',
          textColor: '#ffffff',
          subTextColor: '#ffe4e6',
          badgeBg: 'rgba(251, 113, 133, 0.25)',
          badgeBorder: '#fb7185',
          cardBg: 'rgba(255, 255, 255, 0.09)',
          bgImageUrl: 'https://images.unsplash.com/photo-1495954222046-2c427ecb546d?w=1080&q=80',
        },
        {
          id: 'dyn_summer_5',
          name: '🌴 코코넛 파라다이스',
          desc: '싱그러운 야자수 숲 힐링 그린',
          bgGradient: ['#14532d', '#166534', '#15803d'],
          accentColor: '#4ade80',
          textColor: '#ffffff',
          subTextColor: '#dcfce7',
          badgeBg: 'rgba(74, 222, 128, 0.25)',
          badgeBorder: '#4ade80',
          cardBg: 'rgba(255, 255, 255, 0.08)',
          bgImageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1080&q=80',
        },
      ]
    };
  }

  // 2. 카페 / 맛집 / 음가식 / 요리
  if (/카페|커피|디저트|맛집|음식|요리|레시피|빵|베이커리|케이크|고기|식당|와인/.test(combined)) {
    return {
      category: '☕ 맛집 & 감성 카페/디저트 주제',
      themes: [
        {
          id: 'dyn_food_1',
          name: '☕ 에스프레소 아로마',
          desc: '깊고 그윽한 원두 로스팅 브라운 감성',
          bgGradient: ['#1c1917', '#292524', '#44403c'],
          accentColor: '#fbbf24',
          textColor: '#ffffff',
          subTextColor: '#fef3c7',
          badgeBg: 'rgba(251, 191, 36, 0.25)',
          badgeBorder: '#fbbf24',
          cardBg: 'rgba(255, 255, 255, 0.08)',
          bgImageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1080&q=80',
        },
        {
          id: 'dyn_food_2',
          name: '🍰 스트로베리 스위트',
          desc: '상큼하고 달콤한 딸기 케이크 핑크',
          bgGradient: ['#4c0519', '#701a75', '#9d174d'],
          accentColor: '#f472b6',
          textColor: '#ffffff',
          subTextColor: '#fce7f3',
          badgeBg: 'rgba(244, 114, 182, 0.25)',
          badgeBorder: '#f472b6',
          cardBg: 'rgba(255, 255, 255, 0.09)',
          bgImageUrl: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=1080&q=80',
        },
        {
          id: 'dyn_food_3',
          name: '🍵 말차 그린 라떼',
          desc: '은은하고 차분한 오가닉 힐링 그린',
          bgGradient: ['#14532d', '#166534', '#047857'],
          accentColor: '#86efac',
          textColor: '#ffffff',
          subTextColor: '#dcfce7',
          badgeBg: 'rgba(134, 239, 172, 0.25)',
          badgeBorder: '#86efac',
          cardBg: 'rgba(255, 255, 255, 0.08)',
          bgImageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=1080&q=80',
        },
        {
          id: 'dyn_food_4',
          name: '🍕 스파이시 핫 딜리셔스',
          desc: '식욕을 자극하는 강렬한 오렌지 스파이스',
          bgGradient: ['#451a03', '#7c2d12', '#9a3412'],
          accentColor: '#ff7849',
          textColor: '#ffffff',
          subTextColor: '#ffedd5',
          badgeBg: 'rgba(255, 120, 73, 0.25)',
          badgeBorder: '#ff7849',
          cardBg: 'rgba(255, 255, 255, 0.08)',
          bgImageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1080&q=80',
        },
        {
          id: 'dyn_food_5',
          name: '🍣 프리미엄 골든 셰프',
          desc: '고급 레스토랑 & 오마카세 럭셔리 골드',
          bgGradient: ['#121110', '#2b2118', '#453323'],
          accentColor: '#fcd34d',
          textColor: '#ffffff',
          subTextColor: '#fef3c7',
          badgeBg: 'rgba(252, 211, 77, 0.25)',
          badgeBorder: '#fcd34d',
          cardBg: 'rgba(255, 255, 255, 0.08)',
          bgImageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1080&q=80',
        },
      ]
    };
  }

  // 3. 주식 / 부동산 / 재테크 / 금융 / 보험
  if (/주식|투자|부동산|돈|수익|금융|자산|매출|대출|보험|코인|비트코인/.test(combined)) {
    return {
      category: '📈 주식, 부동산 & 금융 재테크 주제',
      themes: [
        {
          id: 'dyn_fin_1',
          name: '👑 월스트리트 럭셔리 골드',
          desc: '고급스러운 경제, 주식, 자산관리 골드',
          bgGradient: ['#121110', '#241f19', '#3b3021'],
          accentColor: '#fbbf24',
          textColor: '#ffffff',
          subTextColor: '#e2e8f0',
          badgeBg: 'rgba(251, 191, 36, 0.25)',
          badgeBorder: '#fbbf24',
          cardBg: 'rgba(255, 255, 255, 0.08)',
          bgImageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1080&q=80',
        },
        {
          id: 'dyn_fin_2',
          name: '🚀 상한가 랠리 불기둥',
          desc: '강렬한 수익 상승 불기둥 딥 레드',
          bgGradient: ['#450a0a', '#7f1d1d', '#991b1b'],
          accentColor: '#f87171',
          textColor: '#ffffff',
          subTextColor: '#fee2e2',
          badgeBg: 'rgba(248, 113, 113, 0.25)',
          badgeBorder: '#f87171',
          cardBg: 'rgba(255, 255, 255, 0.09)',
          bgImageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1080&q=80',
        },
        {
          id: 'dyn_fin_3',
          name: '🏦 신뢰 전문 금융 블루',
          desc: '안정감을 주는 글로벌 스탠다드 네이비',
          bgGradient: ['#0f172a', '#1e3a8a', '#1d4ed8'],
          accentColor: '#60a5fa',
          textColor: '#ffffff',
          subTextColor: '#dbeafe',
          badgeBg: 'rgba(96, 165, 250, 0.25)',
          badgeBorder: '#60a5fa',
          cardBg: 'rgba(255, 255, 255, 0.08)',
          bgImageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1080&q=80',
        },
        {
          id: 'dyn_fin_4',
          name: '💎 웹3 & 크립토 인디고',
          desc: '혁신적인 디지털 가상자산 딥 바이올렛',
          bgGradient: ['#0c4a6e', '#1e1b4b', '#312e81'],
          accentColor: '#818cf8',
          textColor: '#ffffff',
          subTextColor: '#e0e7ff',
          badgeBg: 'rgba(129, 140, 248, 0.25)',
          badgeBorder: '#818cf8',
          cardBg: 'rgba(255, 255, 255, 0.08)',
          bgImageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1080&q=80',
        },
        {
          id: 'dyn_fin_5',
          name: '🌲 우량주 그린 쉴드',
          desc: '견고하고 단단한 장기투자 포트폴리오',
          bgGradient: ['#022c22', '#064e3b', '#047857'],
          accentColor: '#34d399',
          textColor: '#ffffff',
          subTextColor: '#d1fae5',
          badgeBg: 'rgba(52, 211, 153, 0.25)',
          badgeBorder: '#34d399',
          cardBg: 'rgba(255, 255, 255, 0.08)',
          bgImageUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1080&q=80',
        },
      ]
    };
  }

  // 4. AI / 인공지능 / IT / 개발
  if (/ai|인공지능|테크|코딩|개발|자동화|에이전트|기술|소프트웨어|프로그램|컴퓨터/.test(combined)) {
    return {
      category: '🤖 AI & 인공지능 미래 테크 주제',
      themes: [
        {
          id: 'dyn_ai_1',
          name: '🌌 딥 퀀텀 네온 바이올렛',
          desc: '미래지향적인 에이전틱 AI 바이올렛',
          bgGradient: ['#0f0c20', '#1a103c', '#2a1254'],
          accentColor: '#a78bfa',
          textColor: '#ffffff',
          subTextColor: '#cbd5e1',
          badgeBg: 'rgba(167, 139, 250, 0.25)',
          badgeBorder: '#a78bfa',
          cardBg: 'rgba(255, 255, 255, 0.08)',
          bgImageUrl: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=1080&q=80',
        },
        {
          id: 'dyn_ai_2',
          name: '⚡ 사이버펑크 펄스',
          desc: '초고속 데이터 처리 펄스 네온 마젠타',
          bgGradient: ['#1e1b4b', '#312e81', '#4c1d95'],
          accentColor: '#c084fc',
          textColor: '#ffffff',
          subTextColor: '#f3e8ff',
          badgeBg: 'rgba(192, 132, 252, 0.25)',
          badgeBorder: '#c084fc',
          cardBg: 'rgba(255, 255, 255, 0.09)',
          bgImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&q=80',
        },
        {
          id: 'dyn_ai_3',
          name: '🤖 차세대 AI 시안',
          desc: '맑고 선명한 인텔리전스 시안 블루',
          bgGradient: ['#083344', '#155e75', '#0e7490'],
          accentColor: '#22d3ee',
          textColor: '#ffffff',
          subTextColor: '#cffafe',
          badgeBg: 'rgba(34, 211, 238, 0.25)',
          badgeBorder: '#22d3ee',
          cardBg: 'rgba(255, 255, 255, 0.08)',
          bgImageUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1080&q=80',
        },
        {
          id: 'dyn_ai_4',
          name: '💻 개발자 터미널 그린',
          desc: '해커스 터미널 라임 네온 그린',
          bgGradient: ['#052e16', '#14532d', '#166534'],
          accentColor: '#4ade80',
          textColor: '#ffffff',
          subTextColor: '#dcfce7',
          badgeBg: 'rgba(74, 222, 128, 0.25)',
          badgeBorder: '#4ade80',
          cardBg: 'rgba(255, 255, 255, 0.08)',
          bgImageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1080&q=80',
        },
        {
          id: 'dyn_ai_5',
          name: '⚪ 미니멀 노코드 인텔리전스',
          desc: '명확하고 가독성 높은 모던 테크 흑백',
          bgGradient: ['#18181b', '#27272a', '#3f3f46'],
          accentColor: '#38bdf8',
          textColor: '#ffffff',
          subTextColor: '#d4d4d8',
          badgeBg: 'rgba(56, 189, 248, 0.25)',
          badgeBorder: '#38bdf8',
          cardBg: 'rgba(255, 255, 255, 0.08)',
          bgImageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080&q=80',
        },
      ]
    };
  }

  // 5. 기본 트렌디 SNS / 범용 주제 동적 테마 5종
  return {
    category: '✨ AI 스마트 트렌디 테마',
    themes: CARD_NEWS_THEMES
  };
}

// 문단 분할하여 다중 슬라이드 구성
function parseTextToSlides(mainTitle, fullText) {
  const safeText = typeof fullText === 'string' 
    ? fullText 
    : (Array.isArray(fullText) ? fullText.join('\n\n') : (fullText ? String(fullText) : ''));
  
  const safeTitle = typeof mainTitle === 'string'
    ? mainTitle
    : (mainTitle ? String(mainTitle) : '카드뉴스');

  if (!safeText.trim()) {
    return [{ type: 'cover', title: safeTitle || '카드뉴스', bodyText: '본문 내용이 없습니다.', slideNum: 1, totalSlides: 1 }];
  }

  const paragraphs = safeText
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 5);

  if (paragraphs.length === 0) {
    paragraphs.push(safeText.trim());
  }

  const slides = [];

  // 1. 표지 슬라이드 (Cover Slide)
  const coverSub = paragraphs[0] ? paragraphs[0].slice(0, 80) + '...' : '핵심 내용 완전 분석';
  slides.push({
    type: 'cover',
    title: safeTitle || '카드뉴스 메인 주제',
    bodyText: coverSub,
    slideNum: 1,
  });

  // 2. 본문 슬라이드 (Body Slides)
  const bodyParagraphs = paragraphs.slice(1);
  if (bodyParagraphs.length === 0) {
    const chunkSize = 160;
    for (let i = 0; i < safeText.length; i += chunkSize) {
      const chunk = safeText.slice(i, i + chunkSize);
      slides.push({
        type: 'body',
        title: `POINT 0${slides.length}`,
        bodyText: chunk,
        slideNum: slides.length + 1,
      });
    }
  } else {
    bodyParagraphs.forEach((para) => {
      if (para.length > 200) {
        const subChunks = para.match(/.{1,160}/g) || [para];
        subChunks.forEach((chunk, subIdx) => {
          slides.push({
            type: 'body',
            title: `POINT 0${slides.length} ${subIdx > 0 ? '(이어짐)' : ''}`,
            bodyText: chunk,
            slideNum: slides.length + 1,
          });
        });
      } else {
        slides.push({
          type: 'body',
          title: `POINT 0${slides.length}`,
          bodyText: para,
          slideNum: slides.length + 1,
        });
      }
    });
  }

  // 3. 엔딩 슬라이드 (Ending CTA Slide)
  slides.push({
    type: 'ending',
    title: '💡 핵심 정리 & 공유하기',
    bodyText: '도움이 되셨다면 [좋아요 💖] 와 [공유 ✈️] 부탁드립니다!\n유익한 정보를 매일 받고 싶다면 팔로우 해주세요.',
    slideNum: slides.length + 1,
  });

  const total = slides.length;
  slides.forEach(s => { s.totalSlides = total; });

  return slides;
}


export default function CardNewsModal({
  isOpen,
  onClose,
  platformLabel = 'Instagram',
  defaultTitle = '',
  defaultText = '',
  onAttachImage,
}) {
  const canvasRef = useRef(null);

  // 본문 분석을 기반으로 다중 슬라이드 파싱
  const slides = useMemo(() => {
    return parseTextToSlides(defaultTitle, defaultText);
  }, [defaultTitle, defaultText]);

  // 본문 주제 분석으로 맞춤 5종 테마 동적 생성
  const dynamicThemePackage = useMemo(() => {
    return generateDynamicThemesForContent(defaultTitle, defaultText);
  }, [defaultTitle, defaultText]);

  const [selectedThemeId, setSelectedThemeId] = useState(() => {
    return dynamicThemePackage?.themes?.[0]?.id || CARD_NEWS_THEMES[0].id;
  });
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [badgeText, setBadgeText] = useState(platformLabel);
  const [brandHandle, setBrandHandle] = useState('@sns_autopost');

  // 편집 가능한 현재 슬라이드 데이터
  const [editableSlides, setEditableSlides] = useState(slides);

  useEffect(() => {
    if (dynamicThemePackage?.themes?.length > 0) {
      setSelectedThemeId(dynamicThemePackage.themes[0].id);
    }
    setEditableSlides(slides);
    setCurrentSlideIdx(0);
    if (platformLabel) setBadgeText(platformLabel);
  }, [slides, dynamicThemePackage, platformLabel]);

  const activeSlide = editableSlides[currentSlideIdx] || editableSlides[0] || {
    type: 'cover', title: defaultTitle || '카드뉴스', bodyText: '본문 내용이 없습니다.', slideNum: 1, totalSlides: 1
  };

  // 현재 선택된 테마 객체
  const currentTheme = useMemo(() => {
    const themesList = dynamicThemePackage?.themes || CARD_NEWS_THEMES;
    const allAvailable = [...themesList, ...CARD_NEWS_THEMES];
    return allAvailable.find(t => t.id === selectedThemeId) || themesList[0] || CARD_NEWS_THEMES[0];
  }, [selectedThemeId, dynamicThemePackage]);

  // 배경 이미지 프리로드 캐시
  const loadedBgImages = useRef({});

  // 캔버스 중앙정렬 & 반응형 폰트 렌더링 함수
  const drawCanvasForSlide = (slideObj, targetCanvas) => {
    if (!targetCanvas || !slideObj) return;

    const ctx = targetCanvas.getContext('2d');
    const theme = currentTheme;
    const size = 1080;
    const centerX = size / 2; // 중앙 정렬 기준점 (540px)
    targetCanvas.width = size;
    targetCanvas.height = size;

    // 배경 이미지 사용 시 렌더링
    const renderContent = () => {
      // 1. 다크 그라데이션 오버레이 마스크 (가독성 100% 확보)
      const overlay = ctx.createLinearGradient(0, 0, 0, size);
      overlay.addColorStop(0, 'rgba(10, 8, 20, 0.75)');
      overlay.addColorStop(0.5, 'rgba(10, 8, 20, 0.85)');
      overlay.addColorStop(1, 'rgba(10, 8, 20, 0.95)');
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, size, size);

      // 장식 글로우 써클
      ctx.fillStyle = theme.accentColor + '18';
      ctx.beginPath();
      ctx.arc(centerX, size * 0.45, 380, 0, Math.PI * 2);
      ctx.fill();

      // 2. 상단 중앙 뱃지 & 슬라이드 페이지 번호
      ctx.font = 'bold 26px sans-serif';
      const badgeMetrics = ctx.measureText(badgeText);
      const badgeWidth = badgeMetrics.width + 44;
      const badgeHeight = 44;
      const badgeX = centerX - badgeWidth / 2;
      const badgeY = 50;

      ctx.fillStyle = theme.badgeBg;
      ctx.strokeStyle = theme.badgeBorder;
      ctx.lineWidth = 2.5;
      drawRoundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 22);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.accentColor;
      ctx.textAlign = 'center';
      ctx.fillText(badgeText, centerX, badgeY + 31);

      // 상단 우측 슬라이드 번호 (예: 1 / 4)
      const pageStr = `${slideObj.slideNum} / ${slideObj.totalSlides}`;
      ctx.font = 'bold 30px sans-serif';
      ctx.fillStyle = theme.accentColor;
      ctx.textAlign = 'right';
      ctx.fillText(pageStr, size - 65, badgeY + 31);

      // 3. 타이틀 (상단 뱃지와 충분한 여백을 확보하여 겹침을 완전 방지)
      const rawTitle = slideObj.title || '';
      let titleFontSize = 52;
      let titleLineHeight = 68;
      if (rawTitle.length > 50) { titleFontSize = 36; titleLineHeight = 50; }
      else if (rawTitle.length > 35) { titleFontSize = 42; titleLineHeight = 58; }
      else if (rawTitle.length > 20) { titleFontSize = 48; titleLineHeight = 64; }

      ctx.fillStyle = theme.textColor;
      ctx.font = `bold ${titleFontSize}px sans-serif`;
      ctx.textAlign = 'center';

      const maxTitleWidth = size - 140;
      const titleLines = getWrappedLines(ctx, rawTitle, maxTitleWidth);

      let currentY = 175; // Y 위치를 175px로 낮춰 뱃지와의 겹침 제거
      titleLines.forEach((line) => {
        ctx.fillText(line, centerX, currentY);
        currentY += titleLineHeight;
      });

      // 중앙 미니 강조 구분선
      currentY += 6;
      ctx.strokeStyle = theme.accentColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(centerX - 90, currentY);
      ctx.lineTo(centerX + 90, currentY);
      ctx.stroke();

      currentY += 24;

      // 4. 확장된 중앙 글래스모피즘 본문 카드 상자
      const boxW = size - 120; // 960px 폭 확장
      const boxX = centerX - boxW / 2;
      const boxY = currentY;
      const boxH = size - boxY - 90; // 높이 확장 (약 740px~770px)

      ctx.fillStyle = theme.cardBg;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 2.5;
      drawRoundRect(ctx, boxX, boxY, boxW, boxH, 28);
      ctx.fill();
      ctx.stroke();

      // 5. 본문 텍스트 (트렌디한 대형 볼드 폰트 & 높은 가독성 1.6x 줄간격)
      const rawBody = (slideObj.bodyText || '').replace(/\n+/g, ' ').trim();
      let bodyFontSize = 42;
      let bodyLineHeight = 66;
      if (rawBody.length > 220) { bodyFontSize = 32; bodyLineHeight = 50; }
      else if (rawBody.length > 140) { bodyFontSize = 36; bodyLineHeight = 56; }
      else if (rawBody.length > 80) { bodyFontSize = 40; bodyLineHeight = 62; }

      ctx.fillStyle = theme.subTextColor;
      ctx.font = `bold ${bodyFontSize}px sans-serif`;
      ctx.textAlign = 'center';

      const maxBodyWidth = boxW - 80;
      const bodyLines = getWrappedLines(ctx, rawBody, maxBodyWidth);
      const maxLinesToShow = Math.floor((boxH - 60) / bodyLineHeight);

      // 본문 세로 중앙 배치 계산
      const totalTextHeight = Math.min(bodyLines.length, maxLinesToShow) * bodyLineHeight;
      let bodyY = boxY + (boxH - totalTextHeight) / 2 + bodyFontSize * 0.75;

      const visibleLines = bodyLines.slice(0, maxLinesToShow);
      visibleLines.forEach((line, idx) => {
        const isLast = idx === maxLinesToShow - 1 && bodyLines.length > maxLinesToShow;
        const textToDraw = isLast ? line.slice(0, -3) + '...' : line;
        ctx.fillText(textToDraw, centerX, bodyY);
        bodyY += bodyLineHeight;
      });

      // 6. 하단 중앙 브랜딩 & 태그
      ctx.fillStyle = theme.accentColor;
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${brandHandle}  |  SNS AutoPost Pro ⚡`, centerX, size - 45);
    };

    // 기본 그라데이션 먼저 채우기
    const baseGrad = ctx.createLinearGradient(0, 0, size, size);
    baseGrad.addColorStop(0, theme.bgGradient[0]);
    baseGrad.addColorStop(0.5, theme.bgGradient[1]);
    baseGrad.addColorStop(1, theme.bgGradient[2]);
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, size, size);

    // 주제 맞춤 실사 배경 이미지 크로스오리진 로드 시도
    if (theme.bgImageUrl) {
      if (loadedBgImages.current[theme.bgImageUrl]) {
        const cachedImg = loadedBgImages.current[theme.bgImageUrl];
        ctx.drawImage(cachedImg, 0, 0, size, size);
        renderContent();
      } else {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = theme.bgImageUrl;
        img.onload = () => {
          loadedBgImages.current[theme.bgImageUrl] = img;
          ctx.drawImage(img, 0, 0, size, size);
          renderContent();
        };
        img.onerror = () => {
          renderContent(); // 이미지 로드 실패 시 그라데이션으로 렌더링
        };
      }
    } else {
      renderContent();
    }
  };

  // Canvas 렌더링 이펙트
  useEffect(() => {
    if (!isOpen || !canvasRef.current || !activeSlide) return;
    drawCanvasForSlide(activeSlide, canvasRef.current);
  }, [isOpen, selectedThemeId, activeSlide, badgeText, brandHandle, currentTheme]);

  if (!isOpen) return null;

  // 슬라이드 삭제
  const handleDeleteSlide = () => {
    if (editableSlides.length <= 1) {
      alert('카드뉴스는 최소 1개 이상의 슬라이드가 필요합니다.');
      return;
    }
    if (!window.confirm(`#${currentSlideIdx + 1}번 슬라이드를 삭제하시겠습니까?`)) return;

    const newSlides = editableSlides.filter((_, idx) => idx !== currentSlideIdx);
    const total = newSlides.length;
    newSlides.forEach((s, idx) => {
      s.slideNum = idx + 1;
      s.totalSlides = total;
    });
    setEditableSlides(newSlides);
    setCurrentSlideIdx(prev => Math.min(prev, newSlides.length - 1));
  };

  // 다음 슬라이드와 합치기
  const handleMergeWithNext = () => {
    if (currentSlideIdx >= editableSlides.length - 1) {
      alert('마지막 슬라이드는 다음 슬라이드와 합칠 수 없습니다.');
      return;
    }
    const currentSlide = editableSlides[currentSlideIdx];
    const nextSlide = editableSlides[currentSlideIdx + 1];

    const mergedBodyText = `${currentSlide.bodyText || ''}\n\n${nextSlide.bodyText || ''}`.trim();

    const newSlides = editableSlides.filter((_, idx) => idx !== currentSlideIdx + 1);
    newSlides[currentSlideIdx] = {
      ...currentSlide,
      bodyText: mergedBodyText,
    };

    const total = newSlides.length;
    newSlides.forEach((s, idx) => {
      s.slideNum = idx + 1;
      s.totalSlides = total;
    });

    setEditableSlides(newSlides);
  };

  // 새 슬라이드 추가
  const handleAddSlide = () => {
    const newSlide = {
      type: 'body',
      title: `POINT 0${editableSlides.length}`,
      bodyText: '새로운 슬라이드 내용을 입력하세요.',
      slideNum: currentSlideIdx + 2,
    };

    const newSlides = [
      ...editableSlides.slice(0, currentSlideIdx + 1),
      newSlide,
      ...editableSlides.slice(currentSlideIdx + 1),
    ];

    const total = newSlides.length;
    newSlides.forEach((s, idx) => {
      s.slideNum = idx + 1;
      s.totalSlides = total;
    });

    setEditableSlides(newSlides);
    setCurrentSlideIdx(currentSlideIdx + 1);
  };

  // 슬라이드 처음 상태로 되돌리기 (초기화)
  const handleResetSlides = () => {
    if (!window.confirm('모든 슬라이드 수정을 취소하고 처음 AI 자동 분석 상태로 되돌리시겠습니까?')) return;
    const initialSlides = parseTextToSlides(defaultTitle, defaultText);
    setEditableSlides(initialSlides);
    setCurrentSlideIdx(0);
  };

  // 전체 슬라이드 PNG 다운로드
  const handleDownloadAll = async () => {
    if (!editableSlides || editableSlides.length === 0) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1080;
    tempCanvas.height = 1080;

    for (let i = 0; i < editableSlides.length; i++) {
      const slide = editableSlides[i];
      drawCanvasForSlide(slide, tempCanvas);
      const dataUrl = tempCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `card_news_slide_${i + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise(r => setTimeout(r, 250));
    }
  };

  // 생성된 카드뉴스 전체 (N장) 포스팅에 첨부
  const handleAttachImage = () => {
    if (!editableSlides || editableSlides.length === 0 || !onAttachImage) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1080;
    tempCanvas.height = 1080;

    const allImages = [];
    for (let i = 0; i < editableSlides.length; i++) {
      const slide = editableSlides[i];
      drawCanvasForSlide(slide, tempCanvas);
      allImages.push(tempCanvas.toDataURL('image/png'));
    }

    onAttachImage(allImages);
    alert(`🎉 생성된 카드뉴스 전체 ${allImages.length}장이 포스팅에 정상 첨부되었습니다!`);
    onClose();
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        {/* 모달 헤더 */}
        <div style={headerStyle}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🖼️ AI 주제 배경 & 반응형 폰트 다중 카드뉴스 디자이너
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              본문 내용을 분석하여 <strong style={{ color: 'var(--accent-light)' }}>{dynamicThemePackage.category}</strong> 맞춤 배경 이미지와 중앙 정렬 반응형 레이아웃을 생성했습니다.
            </p>
          </div>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>

        {/* AI 주제 맞춤 배경 감지 알림 바 */}
        <div style={{
          marginTop: '0.875rem',
          padding: '0.625rem 0.875rem',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15))',
          border: '1px solid rgba(16,185,129,0.4)',
          borderRadius: '10px',
          fontSize: '0.8rem',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            🖼️ <strong>AI 주제 배경 & 글자크기 반응형 정렬 적용:</strong> <span style={{ color: '#10b981', fontWeight: 700 }}>{dynamicThemePackage.category}</span>
          </div>
          <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>실사 배경 & 중앙 정렬 완료</span>
        </div>

        <div className="card-news-modal-grid">
          {/* 좌측: 슬라이드 미리보기 & 캐러셀 네비게이션 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* 메인 슬라이드 미리보기 */}
            <div style={{
              width: '100%',
              maxWidth: '380px',
              aspectRatio: '1/1',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
            </div>

            {/* 슬라이드 페이지 이동 네비게이터 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '0.875rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={currentSlideIdx === 0}
                onClick={() => setCurrentSlideIdx(prev => Math.max(0, prev - 1))}
              >
                ◀ 이전
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-light)' }}>
                {currentSlideIdx + 1} / {editableSlides.length} 슬라이드
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={currentSlideIdx === editableSlides.length - 1}
                onClick={() => setCurrentSlideIdx(prev => Math.min(editableSlides.length - 1, prev + 1))}
              >
                다음 ▶
              </button>
            </div>

            {/* 전체 슬라이드 썸네일 스트립 */}
            <div style={{
              display: 'flex', gap: '8px', marginTop: '0.75rem', overflowX: 'auto',
              maxWidth: '380px', paddingBottom: '4px'
            }}>
              {editableSlides.map((slide, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIdx(idx)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: currentSlideIdx === idx ? '2px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.15)',
                    background: currentSlideIdx === idx ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    color: '#fff',
                    whiteSpace: 'nowrap',
                  }}
                >
                  #{idx + 1} {slide.type === 'cover' ? '표지' : slide.type === 'ending' ? '엔딩' : `본문${idx}`}
                </button>
              ))}
            </div>
          </div>

          {/* 우측: 주제 맞춤 테마 & 슬라이드 내용 편집 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '460px', paddingRight: '4px' }}>
            {/* AI 주제 맞춤 5종 테마 선택 */}
            <div>
              <label style={labelStyle}>🎨 {dynamicThemePackage.category} (주제 배경 테마)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {dynamicThemePackage.themes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedThemeId(theme.id)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: selectedThemeId === theme.id ? `2px solid ${theme.accentColor}` : '1px solid rgba(255,255,255,0.1)',
                      background: selectedThemeId === theme.id
                        ? `linear-gradient(135deg, ${theme.bgGradient[0]}, ${theme.bgGradient[1]})`
                        : 'var(--bg-elevated)',
                      color: '#fff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.accentColor }}>
                        {theme.name}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {theme.desc}
                      </div>
                    </div>
                    {selectedThemeId === theme.id && (
                      <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>선택됨</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 현재 선택된 슬라이드 내용 및 편집 / 제어 */}
            <div style={{ background: 'var(--bg-elevated)', padding: '0.875rem', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--accent-light)' }}>
                  ✏️ 슬라이드 #{currentSlideIdx + 1}번 편집 & 제어
                </span>

                {/* 슬라이드 삭제 / 합치기 / 추가 / 초기화 제어 버튼 바 */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleDeleteSlide}
                    title="현재 슬라이드 삭제"
                    style={{ fontSize: '0.72rem', padding: '3px 8px', color: '#f87171' }}
                  >
                    🗑️ 삭제
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleMergeWithNext}
                    disabled={currentSlideIdx >= editableSlides.length - 1}
                    title="다음 슬라이드와 합치기"
                    style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                  >
                    🔗 다음 슬라이드와 합치기
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddSlide}
                    title="새 슬라이드 추가"
                    style={{ fontSize: '0.72rem', padding: '3px 8px', color: '#34d399' }}
                  >
                    ➕ 추가
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleResetSlides}
                    title="모든 수정을 취소하고 처음 상태로 되돌리기"
                    style={{ fontSize: '0.72rem', padding: '3px 8px', color: '#fbbf24' }}
                  >
                    🔄 처음으로
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '0.625rem' }}>
                <label style={labelStyle}>📌 슬라이드 제목</label>
                <input
                  className="form-input"
                  style={{ fontSize: '0.8rem' }}
                  value={activeSlide.title || ''}
                  onChange={(e) => handleUpdateCurrentSlide('title', e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>📝 슬라이드 본문</label>
                <textarea
                  className="form-textarea"
                  style={{ fontSize: '0.8rem', minHeight: '80px' }}
                  value={activeSlide.bodyText || ''}
                  onChange={(e) => handleUpdateCurrentSlide('bodyText', e.target.value)}
                />
              </div>
            </div>

            {/* 공통 뱃지 및 브랜드 서명 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={labelStyle}>🏷️ 상단 뱃지</label>
                <input
                  className="form-input"
                  style={{ fontSize: '0.78rem' }}
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>🔖 브랜드 서명</label>
                <input
                  className="form-input"
                  style={{ fontSize: '0.78rem' }}
                  value={brandHandle}
                  onChange={(e) => setBrandHandle(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 하단 제어 버튼 바 */}
        <div className="card-news-modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            닫기
          </button>
          <button className="btn btn-secondary" onClick={handleDownloadAll}>
            💾 전체 {editableSlides.length}장 PNG 다운로드
          </button>
          <button className="btn btn-primary" onClick={handleAttachImage}>
            🖼️ 카드뉴스 전체 ({editableSlides.length}장) 포스팅에 첨부
          </button>
        </div>
      </div>
    </div>
  );
}

// 스타일 객체
const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '1rem',
};

const modalContentStyle = {
  background: 'var(--bg-card, #13111c)',
  border: '1px solid var(--border-default, rgba(255,255,255,0.15))',
  borderRadius: '20px',
  width: '100%',
  maxWidth: '920px',
  padding: '1.5rem',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
  maxHeight: '92vh',
  overflowY: 'auto',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: '1.25rem',
  cursor: 'pointer',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  marginBottom: '4px',
};
