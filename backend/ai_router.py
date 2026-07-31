"""
ai_router.py - Groq(22개) / Mistral(22개) / Cohere(22개) + 동적 추가 키 Round-Robin 라우터
- API 쿼터 초과 시 자동으로 다음 키로 폴백(Fallback)
- 동적 커스텀 키 추가 지원
"""
import os
import json
import asyncio
import logging
from typing import Optional
from itertools import cycle
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

logger = logging.getLogger(__name__)

def _mask_key(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 10:
        return key[:2] + "..." + key[-2:]
    return key[:6] + "..." + key[-4:]

# ── 내장 66개 키 로드 ──────────────────────────────────────────────
def _load_builtin_keys() -> dict[str, list[str]]:
    """
    .env에서 쉼표로 구분된 키 목록을 읽어 provider별 리스트로 반환.
    빈 문자열은 필터링 처리.
    """
    raw = {
        "groq": os.getenv("GROQ_API_KEYS", ""),
        "mistral": os.getenv("MISTRAL_API_KEYS", ""),
        "cohere": os.getenv("COHERE_API_KEYS", ""),
    }
    return {
        provider: [k.strip() for k in keys.split(",") if k.strip()]
        for provider, keys in raw.items()
    }


class AIRouter:
    """
    멀티 Provider AI 라우터.
    - 내장 66개 키 (Groq 22, Mistral 22, Cohere 22) + 동적 추가 키 지원
    - Round-Robin 방식으로 각 Provider의 키를 순환
    - Rate Limit(429) 발생 시 해당 Provider의 다음 키로 자동 폴백
    """

    # 역할 기반 기본 Provider 매핑
    ROLE_PROVIDER_MAP = {
        "shortform":   "groq",      # 숏폼 대본, 태그 추출, 트위터 스레드
        "longform":    "mistral",   # 긴 글, 캡션, 유튜브 상세 설명
        "caption":     "cohere",    # 소셜 캡션, 요약
        "hashtag":     "groq",      # 해시태그 추출
        "summary":     "cohere",    # 핵심 요약
        "default":     "groq",      # 기본값
    }

    def __init__(self):
        self._builtin = _load_builtin_keys()
        # provider -> {'keys': [...], 'iterator': cycle}
        self._pools: dict[str, dict] = {}
        self._custom_keys: list[dict] = []   # 동적 추가 키 저장
        self._last_used: Optional[dict] = None  # 최근 사용된 API 키 정보
        self._key_statuses: dict[str, dict] = {} # 키별 실시간 상태 (exhausted, error, timestamp)
        self._lock = asyncio.Lock()
        self._build_pools()

    def get_last_used(self) -> Optional[dict]:
        return self._last_used

    def get_key_status(self, api_key: str) -> dict:
        plain_status = self._key_statuses.get(api_key)
        if plain_status:
            return plain_status
        return {"status": "active", "error": None}

    def _build_pools(self):
        """키 풀 및 라운드로빈 이터레이터 초기화"""
        all_keys = {}
        # 내장 키
        for provider, keys in self._builtin.items():
            all_keys.setdefault(provider, []).extend(keys)
        # 동적 커스텀 키
        for entry in self._custom_keys:
            p = entry["provider"].lower()
            all_keys.setdefault(p, []).append(entry["api_key"])

        self._pools = {
            provider: {
                "keys": keys,
                "iterator": cycle(keys) if keys else None,
                "exhausted": set(),  # 429 hit 키 추적
            }
            for provider, keys in all_keys.items()
            if keys
        }
        logger.info(
            "AI Router pools built: %s",
            {p: len(v["keys"]) for p, v in self._pools.items()}
        )

    def add_custom_key(self, provider: str, api_key: str, label: str = ""):
        """런타임 커스텀 API 키 추가 (DB 저장은 key_manager가 담당)"""
        self._custom_keys.append({"provider": provider, "api_key": api_key, "label": label})
        self._build_pools()
        logger.info("Custom key added for provider: %s", provider)

    def remove_custom_key(self, api_key: str):
        """커스텀 API 키 제거"""
        self._custom_keys = [e for e in self._custom_keys if e["api_key"] != api_key]
        self._build_pools()

    def _get_next_key(self, provider: str) -> Optional[str]:
        """해당 provider에서 exhausted되지 않은 키를 라운드로빈으로 반환.
        모든 키가 소진됐으면 None을 반환."""
        pool = self._pools.get(provider)
        if not pool or not pool["keys"]:
            return None

        all_keys = pool["keys"]
        exhausted = pool["exhausted"]

        # 소진되지 않은 사용 가능한 키가 있는지 확인
        available_keys = [k for k in all_keys if k not in exhausted]
        if not available_keys:
            return None  # 이 provider의 모든 키 소진 → 상위 로직에서 다음 provider로 전환

        # round-robin iterator에서 가져오되, exhausted면 건너뜀
        max_attempts = len(all_keys)
        for _ in range(max_attempts):
            key = next(pool["iterator"])
            if key not in exhausted:
                return key
        return None  # 만약 모두 소진된 경우 (안전장치)

    def get_pool_status(self) -> dict:
        """모든 Provider의 키 풀 상태를 반환 (모니터링용)"""
        return {
            provider: {
                "total": len(pool["keys"]),
                "exhausted_count": len(pool["exhausted"]),
                "available": len(pool["keys"]) - len(pool["exhausted"]),
            }
            for provider, pool in self._pools.items()
        }

    async def generate(
        self,
        prompt: str,
        role: str = "default",
        provider: Optional[str] = None,
        model_override: Optional[str] = None,
        max_retries: int = 3,
    ) -> str:
        """
        AI 텍스트 생성 (Provider 체인 자동 폴백 지원).
        """
        from datetime import datetime
        preferred = provider or self.ROLE_PROVIDER_MAP.get(role, "groq")
        all_providers = list(self._pools.keys())

        if preferred in all_providers:
            all_providers = [preferred] + [p for p in all_providers if p != preferred]

        last_error: Optional[Exception] = None

        for current_provider in all_providers:
            pool = self._pools.get(current_provider, {})
            total_keys = len(pool.get("keys", []))
            attempts = max(total_keys, 1)

            for attempt in range(attempts):
                api_key = self._get_next_key(current_provider)
                if not api_key:
                    logger.warning(
                        "All keys exhausted for provider '%s', switching to next provider...",
                        current_provider
                    )
                    break

                try:
                    result = await self._call_provider(
                        provider=current_provider,
                        api_key=api_key,
                        prompt=prompt,
                        model_override=model_override,
                    )
                    # ✅ 성공 시 최근 사용 키 기록
                    self._last_used = {
                        "provider": current_provider,
                        "api_key_masked": _mask_key(api_key),
                        "used_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    }
                    return result
                except Exception as exc:
                    error_str = str(exc).lower()
                    is_retriable = any(
                        x in error_str
                        for x in ["429", "rate limit", "quota", "401", "unauthorized", "403", "forbidden", "404", "not found"]
                    )
                    if is_retriable:
                        logger.warning(
                            "Key failed on %s (attempt %d/%d) - %s. Marking exhausted & rotating...",
                            current_provider, attempt + 1, attempts, error_str[:80]
                        )
                        pool_ref = self._pools.get(current_provider)
                        if pool_ref:
                            pool_ref["exhausted"].add(api_key)
                        self._key_statuses[api_key] = {
                            "status": "exhausted",
                            "error": error_str[:80],
                            "failed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        }
                        last_error = exc
                        continue
                    else:
                        logger.error("Non-retriable AI call error (%s): %s", current_provider, exc)
                        raise

        raise RuntimeError(
            f"모든 AI Provider(키 총 {sum(len(self._pools[p]['keys']) for p in self._pools)}개) 소진. "
            f"마지막 오류: {last_error}"
        )

    async def _call_provider(
        self,
        provider: str,
        api_key: str,
        prompt: str,
        model_override: Optional[str] = None,
    ) -> str:
        """실제 API 호출 디스패처"""
        p = provider.lower()
        if p == "groq":
            return await self._call_groq(api_key, prompt, model_override or "llama-3.3-70b-versatile")
        elif p == "mistral":
            return await self._call_mistral(api_key, prompt, model_override or "mistral-large-latest")
        elif p == "cohere":
            return await self._call_cohere(api_key, prompt, model_override or "command-r-plus-08-2024")
        elif p == "gemini":
            return await self._call_gemini(api_key, prompt, model_override or "gemini-1.5-flash")
        elif p == "anthropic":
            return await self._call_anthropic(api_key, prompt, model_override or "claude-3-5-sonnet-20241022")
        else:
            # 범용 OpenAI-호환 엔드포인트 (openai, openrouter, cerebras 등)
            return await self._call_generic_openai(api_key, prompt, p, model_override or "gpt-4o-mini")

    # ── 개별 Provider 호출 메서드 ──────────────────────────────────
    async def _call_groq(self, api_key: str, prompt: str, model: str) -> str:
        import httpx
        # trust_env=False: 시스템 프록시(HTTP_PROXY 등) 무시 → 프록시 경유 시 401 방지
        async with httpx.AsyncClient(timeout=60, trust_env=False) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": model, "messages": [{"role": "user", "content": prompt}], "max_tokens": 2048},
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()

    async def _call_mistral(self, api_key: str, prompt: str, model: str) -> str:
        import httpx
        async with httpx.AsyncClient(timeout=60, trust_env=False) as client:
            resp = await client.post(
                "https://api.mistral.ai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": model, "messages": [{"role": "user", "content": prompt}], "max_tokens": 2048},
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()

    async def _call_cohere(self, api_key: str, prompt: str, model: str) -> str:
        import httpx
        if model in ["command-r-plus", "command-r"]:
            model = "command-r-plus-08-2024"
        async with httpx.AsyncClient(timeout=60, trust_env=False) as client:
            resp = await client.post(
                "https://api.cohere.com/v2/chat",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": model, "messages": [{"role": "user", "content": {"type": "text", "text": prompt}}]},
            )
            resp.raise_for_status()
            data = resp.json()
            content_items = data.get("message", {}).get("content", [])
            if content_items and isinstance(content_items, list):
                return content_items[0].get("text", "").strip()
            return ""

    async def _call_gemini(self, api_key: str, prompt: str, model: str) -> str:
        import httpx
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        async with httpx.AsyncClient(timeout=60, trust_env=False) as client:
            resp = await client.post(
                url,
                headers={"Content-Type": "application/json"},
                json={"contents": [{"parts": [{"text": prompt}]}]},
            )
            resp.raise_for_status()
            data = resp.json()
            candidates = data.get("candidates", [])
            if candidates and "content" in candidates[0]:
                parts = candidates[0]["content"].get("parts", [])
                if parts:
                    return parts[0].get("text", "").strip()
            return ""

    async def _call_anthropic(self, api_key: str, prompt: str, model: str) -> str:
        import httpx
        async with httpx.AsyncClient(timeout=60, trust_env=False) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json={"model": model, "max_tokens": 2048, "messages": [{"role": "user", "content": prompt}]},
            )
            resp.raise_for_status()
            data = resp.json()
            content = data.get("content", [])
            if content and isinstance(content, list):
                return content[0].get("text", "").strip()
            return ""

    async def _call_generic_openai(self, api_key: str, prompt: str, provider: str, model: str) -> str:
        """커스텀 추가 키: OpenAI-호환 엔드포인트 범용 호출"""
        import httpx
        base_urls = {
            "openai": "https://api.openai.com/v1",
            "openrouter": "https://openrouter.ai/api/v1",
            "cerebras": "https://api.cerebras.ai/v1",
        }
        base_url = base_urls.get(provider, "https://api.openai.com/v1")
        async with httpx.AsyncClient(timeout=60, trust_env=False) as client:
            resp = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": model, "messages": [{"role": "user", "content": prompt}], "max_tokens": 2048},
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()


# ── 싱글턴 인스턴스 ────────────────────────────────────────────────
_router_instance: Optional[AIRouter] = None


def get_ai_router() -> AIRouter:
    """FastAPI 의존성 주입용 싱글턴 라우터 반환"""
    global _router_instance
    if _router_instance is None:
        _router_instance = AIRouter()
    return _router_instance
