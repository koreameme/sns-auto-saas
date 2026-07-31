"""
osmu_engine.py - 유튜브 원소스를 11대 SNS 포맷으로 변환하는 OSMU 엔진
One Source Multi Use: YouTube Script →
  1. YouTube Description
  2. X Thread
  3. Instagram Caption
  4. Facebook Post
  5. Threads Update
  6. TikTok Caption
  7. Pinterest Description
  8. LinkedIn Post (신규)
  9. Medium Article (신규)
 10. Tumblr Post (신규)
 11. Reddit Post (신규)
"""
import asyncio
import logging
from dataclasses import dataclass
from typing import Optional
from backend.ai_router import AIRouter

logger = logging.getLogger(__name__)

import re

def clean_markdown_text(text: str) -> str:
    """마크다운 별표(**), 샵(#), 언더스코어(_) 등 불필요한 강조 기호를 순수 텍스트로 정제"""
    if not text or not isinstance(text, str):
        return text
    # 1. **굵은글씨** -> 굵은글씨, __굵은글씨__ -> 굵은글씨
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'__(.*?)__', r'\1', text)
    # 2. *기울임* -> 기울임
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    text = re.sub(r'(?<!\w)_(.*?)_(?!\w)', r'\1', text)
    # 3. 남은 단독 **, __ 제거
    text = text.replace('**', '').replace('__', '')
    # 4. 행 시작 마크다운 헤더(#, ##, ###) 제거
    text = re.sub(r'^\s*#+\s*', '', text, flags=re.MULTILINE)
    # 5. 마크다운 구분선(---, ***) 제거 (단, 트윗 구분자 제외)
    return text.strip()

NO_MARKDOWN_RULE = "- 마크다운 강조 기호(**, *, # 등)는 절대 사용하지 말고, 깔끔한 일반 텍스트와 이모지만 사용"


@dataclass
class OsmuInput:
    """OSMU 엔진 입력 데이터"""
    title: str
    script: str                          # 유튜브 대본 또는 내용 요약
    target_platforms: list[str]          # 변환할 플랫폼 목록
    language: str = "ko"                 # 기본 한국어
    tone: str = "casual"                 # casual / professional / fun
    hashtag_count: int = 10


@dataclass
class OsmuResult:
    """11대 플랫폼별 변환 결과"""
    youtube_description: Optional[str] = None
    x_thread: Optional[list[str]] = None       # 트윗 타래 (각 최대 280자)
    instagram_caption: Optional[str] = None
    facebook_post: Optional[str] = None
    threads_update: Optional[str] = None
    tiktok_caption: Optional[str] = None
    pinterest_description: Optional[str] = None
    linkedin_post: Optional[str] = None        # 링크드인 포스트 (신규)
    medium_article: Optional[str] = None       # 미디엄 장문 아티클 (신규)
    tumblr_post: Optional[str] = None          # 텀블러 블로그 포스트 (신규)
    reddit_post: Optional[str] = None          # 레디트 포스트 (신규)
    hashtags: Optional[list[str]] = None


class OsmuEngine:
    """AI 라우터를 활용한 11대 SNS 원소스-멀티유즈 콘텐츠 변환 엔진"""

    def __init__(self, router: AIRouter):
        self.router = router

    async def transform(self, data: OsmuInput) -> OsmuResult:
        """요청된 플랫폼에 맞게 병렬로 콘텐츠를 생성"""
        tasks = {}
        platforms = [p.lower() for p in data.target_platforms]

        if "youtube" in platforms:
            tasks["youtube_description"] = self._gen_youtube_desc(data)
        if "x" in platforms or "twitter" in platforms:
            tasks["x_thread"] = self._gen_x_thread(data)
        if "instagram" in platforms:
            tasks["instagram_caption"] = self._gen_instagram_caption(data)
        if "facebook" in platforms:
            tasks["facebook_post"] = self._gen_facebook_post(data)
        if "threads" in platforms:
            tasks["threads_update"] = self._gen_threads_update(data)
        if "tiktok" in platforms:
            tasks["tiktok_caption"] = self._gen_tiktok_caption(data)
        if "pinterest" in platforms:
            tasks["pinterest_description"] = self._gen_pinterest_desc(data)
        if "linkedin" in platforms:
            tasks["linkedin_post"] = self._gen_linkedin_post(data)
        if "medium" in platforms:
            tasks["medium_article"] = self._gen_medium_article(data)
        if "tumblr" in platforms:
            tasks["tumblr_post"] = self._gen_tumblr_post(data)
        if "reddit" in platforms:
            tasks["reddit_post"] = self._gen_reddit_post(data)

        # 해시태그는 항상 생성
        tasks["hashtags"] = self._gen_hashtags(data)

        # 모든 변환 병렬 실행
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        result_dict = {}
        for key, res in zip(tasks.keys(), results):
            if isinstance(res, Exception):
                logger.error("OSMU 변환 오류 (%s): %s", key, res)
                result_dict[key] = None
            elif isinstance(res, list):
                result_dict[key] = [clean_markdown_text(item) for item in res if isinstance(item, str)]
            elif isinstance(res, str):
                result_dict[key] = clean_markdown_text(res)
            else:
                result_dict[key] = res

        return OsmuResult(**result_dict)

    async def _gen_youtube_desc(self, d: OsmuInput) -> str:
        prompt = f"""다음 유튜브 동영상 제목과 대본을 기반으로 SEO에 최적화된 유튜브 동영상 설명글(Description)을 작성해줘.
제목: {d.title}
대본 요약: {d.script[:2000]}
요구사항:
- 첫 2줄에 핵심 내용 요약 (검색 노출 최적화)
- 시간대(타임스탬프) 형식 예시 포함
- 소셜 링크 플레이스홀더 포함
- 언어: {'한국어' if d.language == 'ko' else 'English'}
- 1000자 내외"""
        return await self.router.generate(prompt, role="longform")

    async def _gen_x_thread(self, d: OsmuInput) -> list[str]:
        prompt = f"""다음 내용을 X(Twitter) 스레드(Thread) 형식으로 변환해줘.
제목: {d.title}
내용: {d.script[:1500]}
요구사항:
- 각 트윗은 반드시 280자 이내
- 5-7개의 트윗으로 구성
- 첫 트윗은 훅(Hook)으로 시작
- 마지막 트윗에 CTA (Call-to-Action) 포함
- 각 트윗은 줄바꿈으로 구분
- 언어: {'한국어' if d.language == 'ko' else 'English'}
각 트윗을 "---" 구분자로 나눠줘."""
        raw = await self.router.generate(prompt, role="shortform")
        tweets = [t.strip() for t in raw.split("---") if t.strip()]
        return tweets[:7]  # 최대 7개

    async def _gen_instagram_caption(self, d: OsmuInput) -> str:
        prompt = f"""다음 내용을 인스타그램 캡션으로 작성해줘.
제목: {d.title}
내용: {d.script[:1000]}
요구사항:
- 첫 줄에 눈길을 끄는 문장 (이모지 포함)
- 2-3 단락으로 구성
- 해시태그는 별도로 마지막에 작성 (#{d.hashtag_count}개)
- 언어: {'한국어' if d.language == 'ko' else 'English'}
- 톤: {d.tone}"""
        return await self.router.generate(prompt, role="caption")

    async def _gen_facebook_post(self, d: OsmuInput) -> str:
        prompt = f"""다음 내용을 페이스북 포스트로 작성해줘.
제목: {d.title}
내용: {d.script[:1500]}
요구사항:
- 친근하고 공유하고 싶은 톤
- 3-4 문단
- 마지막에 질문으로 참여 유도
- 이모지 적절히 사용
- 언어: {'한국어' if d.language == 'ko' else 'English'}"""
        return await self.router.generate(prompt, role="longform")

    async def _gen_threads_update(self, d: OsmuInput) -> str:
        prompt = f"""다음 내용을 Threads(스레드) 업데이트 포스트로 작성해줘.
제목: {d.title}
내용: {d.script[:800]}
요구사항:
- 500자 이내의 간결한 내용
- 핵심 인사이트 1-2개 강조
- 대화를 유도하는 마무리
- 언어: {'한국어' if d.language == 'ko' else 'English'}"""
        return await self.router.generate(prompt, role="caption")

    async def _gen_tiktok_caption(self, d: OsmuInput) -> str:
        prompt = f"""다음 내용을 틱톡(TikTok) 캡션으로 작성해줘.
제목: {d.title}
내용: {d.script[:500]}
요구사항:
- 150자 이내의 아주 짧고 임팩트 있는 문장
- 트렌디한 이모지 포함
- #FYP #틱톡 형식 해시태그 3-5개 포함
- 언어: {'한국어' if d.language == 'ko' else 'English'}"""
        return await self.router.generate(prompt, role="shortform")

    async def _gen_pinterest_desc(self, d: OsmuInput) -> str:
        prompt = f"""다음 내용을 핀터레스트(Pinterest) 핀 설명글로 작성해줘.
제목: {d.title}
내용: {d.script[:800]}
요구사항:
- 100-200자의 설명글
- 검색 키워드를 자연스럽게 포함
- 행동 유도 문구로 마무리
- 언어: {'한국어' if d.language == 'ko' else 'English'}"""
        return await self.router.generate(prompt, role="caption")

    # ── 신규 4개 플랫폼 전용 프롬프트 ─────────────────────────────
    async def _gen_linkedin_post(self, d: OsmuInput) -> str:
        prompt = f"""다음 내용을 링크드인(LinkedIn) 비즈니스 포스트로 작성해줘.
제목: {d.title}
내용: {d.script[:1500]}
요구사항:
- 전문가적이고 신뢰감을 주는 비즈니스 인사이트 톤
- 3-4개의 핵심 요점 (Bullet Points) 활용
- 훅(Hook) 문장으로 시작하고 질문/의견 요청으로 마무리
- 관련 산업 해시태그 3-5개 작성
- 언어: {'한국어' if d.language == 'ko' else 'English'}"""
        return await self.router.generate(prompt, role="longform")

    async def _gen_medium_article(self, d: OsmuInput) -> str:
        prompt = f"""다음 내용을 미디엄(Medium) 블로그 장문 아티클로 작성해줘.
제목: {d.title}
대본 내용: {d.script[:2500]}
요구사항:
- 제목과 부제목(Subtitle) 포함
- 서론, 본론(소제목 포함 2-3개 섹션), 결론 구조의 마크다운 형식
- 논리적이고 깊이 있는 스토리텔링
- 언어: {'한국어' if d.language == 'ko' else 'English'}"""
        return await self.router.generate(prompt, role="longform")

    async def _gen_tumblr_post(self, d: OsmuInput) -> str:
        prompt = f"""다음 내용을 텀블러(Tumblr) 블로그 포스트로 작성해줘.
제목: {d.title}
내용: {d.script[:1200]}
요구사항:
- 감각적이고 개성 있는 자유 형식 블로그 포스트
- 핵심 가치관이나 요약 텍스트 강조
- 감성적인 해시태그 목록 포함
- 언어: {'한국어' if d.language == 'ko' else 'English'}"""
        return await self.router.generate(prompt, role="caption")

    async def _gen_reddit_post(self, d: OsmuInput) -> str:
        prompt = f"""다음 내용을 레디트(Reddit) 서브레디트 게시물로 작성해줘.
제목: {d.title}
내용: {d.script[:1500]}
요구사항:
- [Title] 과 [Body] 로 명확히 구분
- 홍보성 문구 배제, 커뮤니티 정보 공유 및 질문 톤 (진정성 강조)
- TL;DR (Too Long; Didn't Read) 한 줄 요약 포함
- 언어: {'한국어' if d.language == 'ko' else 'English'}"""
        return await self.router.generate(prompt, role="shortform")

    async def _gen_hashtags(self, d: OsmuInput) -> list[str]:
        prompt = f"""다음 내용에 맞는 SNS 해시태그를 {d.hashtag_count}개 추출해줘.
제목: {d.title}
내용: {d.script[:500]}
요구사항:
- # 없이 단어만 반환
- 쉼표로 구분
- 트렌디하고 검색량 높은 태그 포함
- 언어: {'한국어' if d.language == 'ko' else 'English'}"""
        raw = await self.router.generate(prompt, role="hashtag")
        tags = [t.strip().lstrip("#") for t in raw.replace("\n", ",").split(",") if t.strip()]
        return tags[:d.hashtag_count]
