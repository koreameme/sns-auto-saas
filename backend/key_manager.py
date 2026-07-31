"""
key_manager.py - 동적 API Key 추가/삭제/조회 및 암호화 관리
사용자가 SaaS UI에서 새 API 모델 키를 추가하면 이 모듈이 처리한다.
"""
import os
import base64
from cryptography.fernet import Fernet
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from backend.models import CustomApiKey
from backend.ai_router import get_ai_router

# ── 암호화 키 관리 ─────────────────────────────────────────────────
# 환경변수에서 암호화 키 로드, 없으면 APP_SECRET_KEY 기반으로 생성
def _get_fernet() -> Fernet:
    secret = os.getenv("APP_SECRET_KEY", "sns-saas-secret-key-change-in-production-2026")
    # Fernet은 32바이트 URL-safe base64 키를 요구
    key = base64.urlsafe_b64encode(secret.encode()[:32].ljust(32, b"0"))
    return Fernet(key)


def encrypt_key(plain_key: str) -> str:
    return _get_fernet().encrypt(plain_key.encode()).decode()


def decrypt_key(encrypted_key: str) -> str:
    return _get_fernet().decrypt(encrypted_key.encode()).decode()


# ── CRUD 함수 ─────────────────────────────────────────────────────
async def add_api_key(
    db: AsyncSession,
    user_id: int,
    provider: str,
    api_key: str,
    label: str = "",
) -> CustomApiKey:
    """
    새 API 키를 암호화하여 DB에 저장하고, 런타임 AI 라우터에도 즉시 반영.
    """
    encrypted = encrypt_key(api_key)
    new_key = CustomApiKey(
        user_id=user_id,
        provider=provider.lower(),
        label=label,
        api_key_encrypted=encrypted,
        is_active=True,
    )
    db.add(new_key)
    await db.flush()

    # 런타임 라우터에 즉시 추가
    get_ai_router().add_custom_key(provider=provider.lower(), api_key=api_key, label=label)
    return new_key


async def remove_api_key(db: AsyncSession, user_id: int, key_id: int) -> bool:
    """API 키 비활성화 (soft delete) 및 런타임 라우터에서 제거"""
    result = await db.execute(
        select(CustomApiKey).where(
            CustomApiKey.id == key_id,
            CustomApiKey.user_id == user_id,
        )
    )
    key_entry = result.scalar_one_or_none()
    if not key_entry:
        return False

    plain_key = decrypt_key(key_entry.api_key_encrypted)
    key_entry.is_active = False
    get_ai_router().remove_custom_key(plain_key)
    return True


async def get_user_api_keys(db: AsyncSession, user_id: int) -> list[dict]:
    """사용자의 커스텀 API 키 목록 반환 (복호화하지 않고 마스킹 처리 및 실시간 상태 제공)"""
    result = await db.execute(
        select(CustomApiKey).where(
            CustomApiKey.user_id == user_id,
            CustomApiKey.is_active == True,
        )
    )
    keys = result.scalars().all()
    router = get_ai_router()

    out = []
    for k in keys:
        plain = decrypt_key(k.api_key_encrypted)
        st = router.get_key_status(plain)
        is_exhausted = (st.get("status") == "exhausted")
        out.append({
            "id": k.id,
            "provider": k.provider,
            "label": k.label,
            "api_key_masked": _mask_key(plain),
            "status": "exhausted" if is_exhausted else "active",
            "status_label": "⚠️ 쿼터 소진 / 차단" if is_exhausted else "🟢 정상 작동 중",
            "error_detail": st.get("error") if is_exhausted else None,
            "created_at": k.created_at.isoformat() if k.created_at else None,
        })
    return out


async def load_active_keys_to_router(db: AsyncSession):
    """
    서버 재시작 시 DB에 저장된 커스텀 키를 라우터에 일괄 로드.
    main.py startup 이벤트에서 호출.
    """
    result = await db.execute(
        select(CustomApiKey).where(CustomApiKey.is_active == True)
    )
    keys = result.scalars().all()
    router = get_ai_router()
    for k in keys:
        plain = decrypt_key(k.api_key_encrypted)
        router.add_custom_key(provider=k.provider, api_key=plain, label=k.label or "")


async def get_router_for_user(db: AsyncSession, user_id: int, is_admin: bool):
    """
    권한별 AI 라우터 반환:
    - 최고 관리자(admin): 마스터 66개 AI 키 풀 라우터 반환
    - 일반 회원(user): 사용자 본인이 등록한 활성 API 키를 복호화하여 만든 독립 라우터 반환 (등록 키 없으면 None)
    """
    if is_admin:
        return get_ai_router()

    result = await db.execute(
        select(CustomApiKey).where(
            CustomApiKey.user_id == user_id,
            CustomApiKey.is_active == True,
        )
    )
    keys = result.scalars().all()
    if not keys:
        return None

    from backend.ai_router import AIRouter
    user_router = AIRouter()

    # 사용자가 직접 세팅한 키 등록
    for k in keys:
        plain = decrypt_key(k.api_key_encrypted)
        user_router.add_custom_key(provider=k.provider, api_key=plain, label=k.label or "")

    return user_router


def _mask_key(key: str) -> str:
    """API 키 마스킹 (앞 8자 + ... + 뒤 4자)"""
    if len(key) <= 12:
        return "****"
    return f"{key[:8]}...{key[-4:]}"
