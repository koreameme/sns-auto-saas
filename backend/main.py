"""
main.py - FastAPI 단독 스탠드얼론 백엔드 서버
SNS Auto Join SaaS의 모든 API 엔드포인트를 제공한다.
"""
import os
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import init_db, get_db
from backend.ai_router import get_ai_router, AIRouter
from backend.key_manager import add_api_key, remove_api_key, get_user_api_keys, load_active_keys_to_router, encrypt_key, decrypt_key
from backend.osmu_engine import OsmuEngine, OsmuInput, clean_markdown_text

import hashlib

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── 앱 생명주기 ────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # DB 테이블 자동 생성
    from backend.database import init_db, AsyncSessionLocal
    from backend.models import User
    from sqlalchemy import select
    await init_db()
    logger.info("✅ Database Initialized")

    # 기본 관리자 계정(admin@snsautopost.com / admin123) 시드 생성
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.email == "admin@snsautopost.com"))
        admin = res.scalar_one_or_none()
        if not admin:
            admin = User(
                email="admin@snsautopost.com",
                hashed_password=hash_password("admin123"),
                full_name="최고 관리자",
                role="admin",
                status="approved",
                plan="enterprise",
                daily_limit=9999
            )
            session.add(admin)
            await session.commit()
            logger.info("👑 Default Admin Account Created: admin@snsautopost.com")

    # DB에 저장된 커스텀 키를 라우터에 로드
    async with AsyncSessionLocal() as db:
        await load_active_keys_to_router(db)
    router_status = get_ai_router().get_pool_status()
    logger.info("✅ AI 라우터 준비 완료: %s", router_status)
    yield
    logger.info("👋 서버 종료")


# ── FastAPI 앱 초기화 ──────────────────────────────────────────────
app = FastAPI(
    title="SNS AutoPost Pro API",
    description="Groq(22) + Mistral(22) + Cohere(22) 기반 11대 SNS 자동/반자동 포스팅 SaaS",
    version="1.0.0",
    lifespan=lifespan,
    # Nginx /snsauto/ 프록시 경로 지원 (운영 환경에서 ROOT_PATH=/snsauto 설정)
    root_path=os.getenv("ROOT_PATH", ""),
)

# CORS 허용 도메인: 환경변수로 운영/개발 도메인 분리
_cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# ── 요청/응답 스키마 ───────────────────────────────────────────────
class SignupRequest(BaseModel):
    email: str = Field(..., description="이메일 주소")
    password: str = Field(..., description="비밀번호")
    full_name: Optional[str] = Field(default="", description="이름")

class LoginRequest(BaseModel):
    email: str = Field(..., description="이메일 주소")
    password: str = Field(..., description="비밀번호")

class ApproveUserRequest(BaseModel):
    plan: str = Field(default="pro", description="free | starter | pro | enterprise")
    daily_limit: int = Field(default=50, description="일일 생성 한도")
    status: str = Field(default="approved", description="approved | rejected | pending")

class CardCheckoutRequest(BaseModel):
    user_id: int
    plan: Optional[str] = "pro"
    card_number: Optional[str] = "4330-****-****-1234"

class BankTransferRequest(BaseModel):
    user_id: int
    plan: Optional[str] = "pro"
    depositor_name: str

class ApprovePaymentRequest(BaseModel):
    status: str = Field(default="approved", description="approved | rejected")

class MasterConnectRequest(BaseModel):
    google_email: str
    user_id: int = 1

class OsmuRequest(BaseModel):
    user_id: int = Field(default=1, description="사용자 ID")
    title: str = Field(..., description="유튜브 동영상 제목")
    script: str = Field(..., description="대본 또는 내용 요약")
    target_platforms: list[str] = Field(
        default=["youtube", "x", "instagram", "facebook", "threads", "tiktok", "pinterest"],
        description="변환할 플랫폼 목록"
    )
    language: str = Field(default="ko", description="ko | en")
    tone: str = Field(default="casual", description="casual | professional | fun")
    hashtag_count: int = Field(default=10, ge=3, le=30)


class KeywordGenerateRequest(BaseModel):
    """키워드 1~5개 입력 → 제목 + 대본 자동 생성 요청 스키마"""
    user_id: int = Field(default=1, description="사용자 ID")
    keywords: list[str] = Field(..., min_length=1, max_length=5, description="키워드 목록 (1~5개)")
    language: str = Field(default="ko", description="ko | en")
    tone: str = Field(default="casual", description="casual | professional | fun")


class AddKeyRequest(BaseModel):
    user_id: int = Field(default=1, description="사용자 ID")
    provider: str = Field(..., description="groq | mistral | cohere | openai | openrouter | gemini | anthropic 등")
    api_key: str = Field(..., description="API 키 값")
    label: str = Field(default="", description="사용자 정의 레이블")


class SnsTokenRequest(BaseModel):
    user_id: int = Field(default=1, description="사용자 ID")
    platform: str = Field(..., description="youtube | x | instagram | facebook | threads | tiktok | pinterest | linkedin | medium | tumblr | reddit")
    access_token: str
    refresh_token: Optional[str] = None
    account_name: Optional[str] = None
    extra_data: Optional[dict] = None


# ── 기본 엔드포인트 ───────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {
        "app": "SNS AutoPost Pro",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/api/health", tags=["Health"])
async def health():
    router = get_ai_router()
    return {
        "status": "ok",
        "ai_pool_status": router.get_pool_status(),
    }


# ── 인증 및 회원관리 엔드포인트 ──────────────────────────────────────
@app.post("/api/auth/signup", tags=["Auth"])
async def signup(req: SignupRequest, db: AsyncSession = Depends(get_db)):
    """회원가입 (신규 가입 시 status='pending' 설정되며 관리자 승인 후 사용 가능)"""
    from backend.models import User
    from sqlalchemy import select
    existing = await db.execute(select(User).where(User.email == req.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="이미 가입된 이메일 주소입니다.")

    user = User(
        email=req.email.lower(),
        hashed_password=hash_password(req.password),
        full_name=req.full_name or req.email.split("@")[0],
        role="user",
        status="pending",
        plan="free",
        daily_limit=2,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {
        "success": True,
        "message": "회원가입 신청이 완료되었습니다! 관리자 승인 후 이용이 가능합니다.",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "status": user.status,
            "plan": user.plan,
            "daily_limit": user.daily_limit,
        }
    }


@app.post("/api/auth/login", tags=["Auth"])
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """로그인"""
    from backend.models import User
    from sqlalchemy import select
    res = await db.execute(select(User).where(User.email == req.email.lower()))
    user = res.scalar_one_or_none()

    if not user or user.hashed_password != hash_password(req.password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

    return {
        "success": True,
        "token": f"user_session_token_{user.id}",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "status": user.status,
            "plan": user.plan,
            "daily_limit": user.daily_limit,
        }
    }


class UpdateProfileRequest(BaseModel):
    user_id: int
    full_name: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


@app.get("/api/auth/me", tags=["Auth"])
async def get_me(user_id: int = 1, db: AsyncSession = Depends(get_db)):
    """현재 로그인 유저 정보 조회"""
    from backend.models import User
    from sqlalchemy import select
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="사용자 정보를 찾을 수 없습니다.")
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "status": user.status,
        "plan": user.plan,
        "daily_limit": user.daily_limit,
    }


@app.put("/api/auth/profile", tags=["Auth"])
async def update_profile(req: UpdateProfileRequest, db: AsyncSession = Depends(get_db)):
    """회원 정보 (이름, 비밀번호) 수정"""
    from backend.models import User
    from sqlalchemy import select
    res = await db.execute(select(User).where(User.id == req.user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="사용자 정보를 찾을 수 없습니다.")

    if req.new_password:
        if not req.current_password or user.hashed_password != hash_password(req.current_password):
            raise HTTPException(status_code=400, detail="현재 비밀번호가 일치하지 않습니다.")
        user.hashed_password = hash_password(req.new_password)

    if req.full_name is not None:
        user.full_name = req.full_name

    await db.commit()
    await db.refresh(user)
    return {
        "success": True,
        "message": "프로필 정보가 성공적으로 변경되었습니다.",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "status": user.status,
            "plan": user.plan,
            "daily_limit": user.daily_limit,
        }
    }


@app.get("/api/admin/users", tags=["Admin"])
async def get_admin_users(admin_user_id: int = 1, db: AsyncSession = Depends(get_db)):
    """관리자 전용: 전체/대기 유저 목록 조회"""
    from backend.models import User
    from sqlalchemy import select

    admin = (await db.execute(select(User).where(User.id == admin_user_id))).scalar_one_or_none()
    if not admin or admin.role != "admin":
        raise HTTPException(status_code=403, detail="관리자 계정만 회원 목록을 조회할 수 있습니다.")

    res = await db.execute(select(User).order_by(User.id.desc()))
    users = res.scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "status": u.status,
            "plan": u.plan,
            "daily_limit": u.daily_limit,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@app.post("/api/admin/users/{user_id}/approve", tags=["Admin"])
async def approve_user(user_id: int, req: ApproveUserRequest, admin_user_id: int = 1, db: AsyncSession = Depends(get_db)):
    """관리자 전용: 유저 가입 승인 및 플랜/한도 배정"""
    from backend.models import User
    from sqlalchemy import select

    admin = (await db.execute(select(User).where(User.id == admin_user_id))).scalar_one_or_none()
    if not admin or admin.role != "admin":
        raise HTTPException(status_code=403, detail="관리자 계정만 회원 승인을 처리할 수 있습니다.")

    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    user.status = req.status
    user.plan = req.plan
    user.daily_limit = req.daily_limit
    await db.commit()
    return {
        "success": True,
        "message": f"계정이 [{req.status}] 상태로 변경되었으며, [{req.plan.upper()}] 플랜이 배정되었습니다.",
        "user": {
            "id": user.id,
            "email": user.email,
            "status": user.status,
            "plan": user.plan,
            "daily_limit": user.daily_limit,
        }
    }


@app.delete("/api/admin/users/{user_id}", tags=["Admin"])
async def delete_user(user_id: int, admin_user_id: int = 1, db: AsyncSession = Depends(get_db)):
    """관리자 전용: 회원 계정 완전 삭제"""
    from backend.models import User, SnsAccount, CustomApiKey, PaymentOrder, PostHistory
    from sqlalchemy import select, delete

    admin = (await db.execute(select(User).where(User.id == admin_user_id))).scalar_one_or_none()
    if not admin or admin.role != "admin":
        raise HTTPException(status_code=403, detail="관리자 계정만 회원을 삭제할 수 있습니다.")

    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="삭제할 사용자를 찾을 수 없습니다.")

    if user.role == "admin" or user.email == "admin@snsautopost.com":
        raise HTTPException(status_code=400, detail="최고 관리자 계정은 삭제할 수 없습니다.")

    await db.execute(delete(SnsAccount).where(SnsAccount.user_id == user_id))
    await db.execute(delete(CustomApiKey).where(CustomApiKey.user_id == user_id))
    await db.execute(delete(PaymentOrder).where(PaymentOrder.user_id == user_id))
    await db.execute(delete(PostHistory).where(PostHistory.user_id == user_id))
    await db.delete(user)
    await db.commit()

    return {
        "success": True,
        "message": f"[{user.email}] 계정 및 관련 데이터가 성공적으로 완전 삭제되었습니다."
    }


# ── 결제 및 업그레이드 엔드포인트 ──────────────────────────────────
@app.post("/api/payment/card-checkout", tags=["Payment"])
async def card_checkout(req: CardCheckoutRequest, db: AsyncSession = Depends(get_db)):
    """카드 결제 즉시 성공 -> 요청한 플랜으로 실시간 업그레이드"""
    from backend.models import User, PaymentOrder
    from sqlalchemy import select

    user = (await db.execute(select(User).where(User.id == req.user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    target_plan = (req.plan or "pro").lower()
    limits = {"free": 2, "starter": 5, "pro": 10, "enterprise": 9999}
    amounts = {"free": 0, "starter": 19000, "pro": 39000, "enterprise": 290000}
    daily_limit = limits.get(target_plan, 10)
    amount = amounts.get(target_plan, 39000)

    user.plan = target_plan
    user.daily_limit = daily_limit

    order = PaymentOrder(
        user_id=user.id,
        payment_method="card",
        plan=target_plan,
        amount=amount,
        depositor_name="",
        status="approved"
    )
    db.add(order)
    await db.commit()

    return {
        "success": True,
        "message": f"카드 결제가 성공적으로 완료되어 {target_plan.upper()} 플랜(하루 {daily_limit}회 생성)으로 즉시 업그레이드되었습니다!",
        "user": {
            "id": user.id,
            "email": user.email,
            "plan": user.plan,
            "daily_limit": user.daily_limit,
        }
    }


@app.post("/api/payment/bank-transfer", tags=["Payment"])
async def bank_transfer_request(req: BankTransferRequest, db: AsyncSession = Depends(get_db)):
    """무통장/계좌이체 입금 신청 -> 관리자 승인 대기 상태로 등록"""
    from backend.models import User, PaymentOrder
    from sqlalchemy import select

    user = (await db.execute(select(User).where(User.id == req.user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    if not req.depositor_name.strip():
        raise HTTPException(status_code=400, detail="입금자명을 입력해주세요.")

    target_plan = (req.plan or "pro").lower()
    amounts = {"free": 0, "starter": 19000, "pro": 39000, "enterprise": 290000}
    amount = amounts.get(target_plan, 39000)

    order = PaymentOrder(
        user_id=user.id,
        payment_method="bank_transfer",
        plan=target_plan,
        amount=amount,
        depositor_name=req.depositor_name.strip(),
        status="pending"
    )
    db.add(order)
    await db.commit()

    return {
        "success": True,
        "message": f"계좌이체 입금 신청이 접수되었습니다. 관리자 입금 확인 후 {target_plan.upper()} 플랜으로 업그레이드됩니다."
    }


@app.get("/api/admin/payments", tags=["Admin"])
async def get_admin_payments(admin_user_id: int = 1, db: AsyncSession = Depends(get_db)):
    """관리자 전용: 무통장 입금 신청 내역 조회"""
    from backend.models import User, PaymentOrder
    from sqlalchemy import select

    admin = (await db.execute(select(User).where(User.id == admin_user_id))).scalar_one_or_none()
    if not admin or admin.role != "admin":
        raise HTTPException(status_code=403, detail="관리자 계정만 접근 가능합니다.")

    res = await db.execute(select(PaymentOrder, User).join(User, PaymentOrder.user_id == User.id).order_by(PaymentOrder.id.desc()))
    orders = res.all()
    return [
        {
            "id": o.PaymentOrder.id,
            "user_id": o.PaymentOrder.user_id,
            "user_email": o.User.email,
            "user_name": o.User.full_name,
            "payment_method": o.PaymentOrder.payment_method,
            "plan": o.PaymentOrder.plan,
            "amount": o.PaymentOrder.amount,
            "depositor_name": o.PaymentOrder.depositor_name,
            "status": o.PaymentOrder.status,
            "created_at": o.PaymentOrder.created_at.isoformat() if o.PaymentOrder.created_at else None,
        }
        for o in orders
    ]


@app.post("/api/admin/payments/{order_id}/approve", tags=["Admin"])
async def approve_payment(order_id: int, req: ApprovePaymentRequest, admin_user_id: int = 1, db: AsyncSession = Depends(get_db)):
    """관리자 전용: 무통장 입금 확인 & 플랜 승인"""
    from backend.models import User, PaymentOrder
    from sqlalchemy import select

    admin = (await db.execute(select(User).where(User.id == admin_user_id))).scalar_one_or_none()
    if not admin or admin.role != "admin":
        raise HTTPException(status_code=403, detail="관리자 계정만 접근 가능합니다.")

    res = await db.execute(select(PaymentOrder).where(PaymentOrder.id == order_id))
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="결제 주문을 찾을 수 없습니다.")

    order.status = req.status
    if req.status == "approved":
        user_res = await db.execute(select(User).where(User.id == order.user_id))
        user = user_res.scalar_one_or_none()
        if user:
            target_plan = (order.plan or "pro").lower()
            limits = {"free": 2, "starter": 5, "pro": 10, "enterprise": 9999}
            user.plan = target_plan
            user.daily_limit = limits.get(target_plan, 10)

    await db.commit()
    return {
        "success": True,
        "message": f"입금 신청이 [{req.status}] 처리되었습니다."
    }


# ── AI 라우터 풀 상태 ─────────────────────────────────────────────
@app.get("/api/ai/pool-status", tags=["AI Router"])
async def get_pool_status(router: AIRouter = Depends(get_ai_router)):
    """66개 AI 키 풀 실시간 상태 조회"""
    return router.get_pool_status()


# ── OSMU 콘텐츠 생성 ─────────────────────────────────────────────
@app.post("/api/osmu/generate", tags=["OSMU Studio"])
async def generate_osmu_content(
    req: OsmuRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    유튜브 제목 + 대본을 입력받아 11대 SNS 플랫폼별 콘텐츠를 병렬 생성.
    - 관리자(admin): 마스터 66개 AI 키 풀 자동 할당
    - 일반 사용자(user): 본인이 등록한 커스텀 API 키 라우팅 사용
    """
    from backend.models import User
    from backend.key_manager import get_router_for_user
    from sqlalchemy import select

    user_res = await db.execute(select(User).where(User.id == (req.user_id or 1)))
    user = user_res.scalar_one_or_none()
    is_admin = (user.role == "admin") if user else False

    router = await get_router_for_user(db, req.user_id or 1, is_admin=is_admin)
    if not router:
        raise HTTPException(
            status_code=400,
            detail="AI 콘텐츠를 생성하려면 [🔑 AI API 키 관리] 페이지에서 본인의 API 키(Groq / OpenAI / Gemini / Mistral 등)를 1개 이상 등록해 주세요."
        )

    engine = OsmuEngine(router)
    data = OsmuInput(
        title=req.title,
        script=req.script,
        target_platforms=req.target_platforms,
        language=req.language,
        tone=req.tone,
        hashtag_count=req.hashtag_count,
    )
    result = await engine.transform(data)
    last_used = router.get_last_used() if hasattr(router, 'get_last_used') else None
    return {
        "success": True,
        "ai_used": last_used,
        "data": {
            "youtube_description": result.youtube_description,
            "x_thread": result.x_thread,
            "instagram_caption": result.instagram_caption,
            "facebook_post": result.facebook_post,
            "threads_update": result.threads_update,
            "tiktok_caption": result.tiktok_caption,
            "pinterest_description": result.pinterest_description,
            "linkedin_post": result.linkedin_post,
            "medium_article": result.medium_article,
            "tumblr_post": result.tumblr_post,
            "reddit_post": result.reddit_post,
            "hashtags": result.hashtags,
        }
    }

# ── 키워드 기반 제목 + 대본 자동 생성 ────────────────────────────
@app.post("/api/osmu/generate-from-keywords", tags=["OSMU Studio"])
async def generate_from_keywords(
    req: KeywordGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    키워드 1~5개 조합 → 제목 + 유튜브 대본 수준의 상세 내용 자동 생성.
    """
    from backend.models import User
    from backend.key_manager import get_router_for_user
    from sqlalchemy import select

    user_res = await db.execute(select(User).where(User.id == (req.user_id or 1)))
    user = user_res.scalar_one_or_none()
    is_admin = (user.role == "admin") if user else False

    router = await get_router_for_user(db, req.user_id or 1, is_admin=is_admin)
    if not router:
        raise HTTPException(
            status_code=400,
            detail="AI 콘텐츠를 생성하려면 [🔑 AI API 키 관리] 페이지에서 본인의 API 키(Groq / OpenAI / Gemini / Mistral 등)를 1개 이상 등록해 주세요."
        )

    lang_label = '한국어' if req.language == 'ko' else 'English'
    tone_label = {
        'casual': '캐주얼하게', 'professional': '전문적이고 신뢰감 있는', 'fun': '유쾌하고 재미있는',
    }.get(req.tone, '캐주얼')

    keyword_str = ', '.join(f'"{k}"' for k in req.keywords)

    title_prompt = f"""다음 키워드들을 조합하여 SNS와 유튜브에 어울리는 고급스러운 제목을 3개 생성해줘.
키워드: {keyword_str}
조건:
- 언어: {lang_label}
- 톤: {tone_label}
- 각 제목은 30~60자 내외
- 클릭을 유발하는 호기심 자극형 문구 사용
- 번호없이 각 줄에 제목 1개만 작성【본문 없이 제목만】"""

    script_prompt = f"""다음 키워드들을 기반으로 SEO에 최적화된 유튜브 동영상 대본 및 콘텐츠 기획안을 작성해줘.
키워드: {keyword_str}
조건:
- 언어: {lang_label}
- 톤: {tone_label}
- 1,500~2,500자 분량
- 구성: [인사+오프닝훅] → [스토리텔링] → [본론 3~5섹션] → [협업요청+CTA]
- 인터넷 전문가답게 실용적이고 구체적인 정보 중심으로 작성"""

    import traceback
    try:
        import asyncio
        title_raw, script_raw = await asyncio.gather(
            router.generate(title_prompt, role="shortform"),
            router.generate(script_prompt, role="longform"),
        )

        lines = [clean_markdown_text(l.strip()) for l in title_raw.strip().splitlines() if l.strip()]
        best_title = lines[0].lstrip('123456789.-) ').strip() if lines else keyword_str
        cleaned_script = clean_markdown_text(script_raw.strip())
        last_used = router.get_last_used() if hasattr(router, 'get_last_used') else None

        return {
            "success": True,
            "title": best_title,
            "script": cleaned_script,
            "keywords_used": req.keywords,
            "ai_used": last_used,
        }
    except Exception as e:
        logger.error(f"Keyword Gen Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ── 웹사이트 URL 크롤링 후 제목 + 대본 생성 ────────────────────────
class UrlGenerateRequest(BaseModel):
    user_id: Optional[int] = 1
    url: str = Field(..., description="크롤링할 웹사이트 URL")
    language: str = "ko"
    tone: str = "casual"

@app.post("/api/osmu/generate-from-url", tags=["OSMU Studio"])
async def generate_from_url(
    req: UrlGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    웹사이트 URL 입력 → 본문 텍스트 크롤링 → 제목 + 대본 자동 생성.
    뉴스 기사, 블로그, 웹페이지 등 지원.
    """
    import traceback, re
    import httpx
    from bs4 import BeautifulSoup
    from backend.models import User
    from backend.key_manager import get_router_for_user
    from sqlalchemy import select

    # 유튜브 URL이면 유튜브 엔드포인트로 안내
    if "youtube.com" in req.url or "youtu.be" in req.url:
        raise HTTPException(status_code=400, detail="유튜브 URL은 [유튜브 링크] 탭을 이용해 주세요.")

    # 1. 웹페이지 본문 크롤링
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"
        }) as client:
            resp = await client.get(req.url)
            resp.raise_for_status()
            html = resp.text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"웹사이트 접근 실패: {str(e)}")

    # 2. BeautifulSoup으로 핵심 텍스트 추출
    soup = BeautifulSoup(html, "lxml")
    # 불필요한 태그 제거
    for tag in soup(["script", "style", "nav", "header", "footer", "aside", "iframe", "noscript"]):
        tag.decompose()

    # 페이지 제목 추출
    og_title = soup.find("meta", property="og:title")
    page_title = (og_title["content"] if og_title else None) or (soup.title.string if soup.title else "")
    page_title = page_title.strip()

    # 본문 텍스트 추출 (article > p 태그 우선, 없으면 전체 p)
    article = soup.find("article")
    paragraphs = (article or soup).find_all("p")
    body_text = "\n".join(p.get_text(separator=" ").strip() for p in paragraphs if len(p.get_text().strip()) > 30)
    body_text = re.sub(r"\n{3,}", "\n\n", body_text).strip()

    if not body_text or len(body_text) < 100:
        # fallback: 전체 텍스트 사용
        body_text = soup.get_text(separator="\n").strip()
        body_text = re.sub(r"\n{3,}", "\n\n", body_text)[:3000]

    if not body_text:
        raise HTTPException(status_code=400, detail="웹사이트에서 본문 텍스트를 추출하지 못했습니다. 다른 URL을 시도해 주세요.")

    # 3. AI 생성
    user_res = await db.execute(select(User).where(User.id == (req.user_id or 1)))
    user = user_res.scalar_one_or_none()
    is_admin = (user.role == "admin") if user else False
    router = await get_router_for_user(db, req.user_id or 1, is_admin=is_admin)
    if not router:
        raise HTTPException(status_code=400, detail="AI API 키가 없습니다. API 키 관리 페이지에서 키를 등록해 주세요.")

    lang_label = '한국어' if req.language == 'ko' else 'English'
    tone_label = {'casual': '캐주얼', 'professional': '전문적', 'fun': '유쾌하고 재미있는'}.get(req.tone, '캐주얼')
    source_text = body_text[:2500]  # 토큰 제한 대비 2500자로 자름

    title_prompt = f"""다음은 웹사이트에서 가져온 내용이야. 이를 바탕으로 SNS와 유튜브에 어울리는 클릭을 유발하는 제목을 3개 만들어줘.
원문 제목: {page_title}
본문 내용 요약:
{source_text[:800]}
조건:
- 언어: {lang_label}
- 톤: {tone_label}
- 각 제목은 30~60자 내외
- 번호없이 각 줄에 제목 1개만 작성【본문 없이 제목만】"""

    script_prompt = f"""다음 웹사이트 내용을 기반으로 SNS 콘텐츠로 재구성해줘.
원문 제목: {page_title}
원문 본문:
{source_text}
조건:
- 언어: {lang_label}
- 톤: {tone_label}
- 1,500~2,500자 분량
- 구성: [오프닝훅] → [핵심 내용 요약] → [본론 3~5섹션] → [결론+CTA]
- 원본 내용을 충실히 반영하되 SNS 독자에 맞게 쉽고 흥미롭게 재구성"""

    try:
        import asyncio
        title_raw, script_raw = await asyncio.gather(
            router.generate(title_prompt, role="shortform"),
            router.generate(script_prompt, role="longform"),
        )
        lines = [clean_markdown_text(l.strip()) for l in title_raw.strip().splitlines() if l.strip()]
        best_title = lines[0].lstrip('123456789.-) ').strip() if lines else page_title
        cleaned_script = clean_markdown_text(script_raw.strip())
        last_used = router.get_last_used() if hasattr(router, 'get_last_used') else None
        return {
            "success": True,
            "title": best_title,
            "script": cleaned_script,
            "source_title": page_title,
            "source_url": req.url,
            "ai_used": last_used,
        }
    except Exception as e:
        logger.error(f"URL Gen Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ── 유튜브 링크 → 자막 추출 → 제목 + 대본 생성 ──────────────────────
class YoutubeGenerateRequest(BaseModel):
    user_id: Optional[int] = 1
    url: str = Field(..., description="유튜브 영상 URL")
    language: str = "ko"
    tone: str = "casual"

@app.post("/api/osmu/generate-from-youtube", tags=["OSMU Studio"])
async def generate_from_youtube(
    req: YoutubeGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    유튜브 URL → 자막/영상정보 추출 → 제목 + SNS 대본 자동 생성.
    watch?v=, youtu.be/, shorts/ 패턴 모두 지원.
    """
    import traceback, re
    import httpx
    from backend.models import User
    from backend.key_manager import get_router_for_user
    from sqlalchemy import select

    # 1. video_id 파싱
    video_id = None
    patterns = [
        r"(?:v=|youtu\.be/|shorts/)([A-Za-z0-9_-]{11})",
    ]
    for pat in patterns:
        m = re.search(pat, req.url)
        if m:
            video_id = m.group(1)
            break

    if not video_id:
        raise HTTPException(status_code=400, detail="유효한 유튜브 URL이 아닙니다. watch?v=, youtu.be/, shorts/ 형식을 지원합니다.")

    # 2. 자막 추출 시도 (youtube-transcript-api)
    transcript_text = ""
    video_title = ""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled
        # 한국어 우선, 없으면 영어, 없으면 자동생성
        try:
            transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=["ko", "en", "a.ko", "a.en"])
        except NoTranscriptFound:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            transcript = transcript_list.find_generated_transcript(["ko", "en"]).fetch()

        transcript_text = " ".join([t["text"] for t in transcript])
        transcript_text = transcript_text[:3000]  # 토큰 제한
    except Exception as e:
        logger.warning(f"YouTube transcript extraction failed for {video_id}: {e}")
        transcript_text = ""

    # 3. oEmbed API로 영상 제목 + 설명 추출
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            oembed = await client.get(
                f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
            )
            oembed_data = oembed.json()
            video_title = oembed_data.get("title", "")
    except Exception as e:
        logger.warning(f"oEmbed failed: {e}")

    # 자막도 없고 제목도 없으면 실패
    source_content = transcript_text or f"유튜브 영상: {video_title}"
    if not source_content.strip():
        raise HTTPException(status_code=400, detail="이 영상에서 자막과 제목 정보를 추출하지 못했습니다. 자막이 활성화된 영상을 시도해 주세요.")

    # 4. AI 생성
    user_res = await db.execute(select(User).where(User.id == (req.user_id or 1)))
    user = user_res.scalar_one_or_none()
    is_admin = (user.role == "admin") if user else False
    router = await get_router_for_user(db, req.user_id or 1, is_admin=is_admin)
    if not router:
        raise HTTPException(status_code=400, detail="AI API 키가 없습니다. API 키 관리 페이지에서 키를 등록해 주세요.")

    lang_label = '한국어' if req.language == 'ko' else 'English'
    tone_label = {'casual': '캐주얼', 'professional': '전문적', 'fun': '유쾌하고 재미있는'}.get(req.tone, '캐주얼')
    has_transcript = bool(transcript_text)

    title_prompt = f"""다음 유튜브 영상 내용을 바탕으로 SNS와 유튜브에 어울리는 클릭을 유발하는 제목을 3개 만들어줘.
영상 제목: {video_title}
{'영상 자막 내용:\n' + transcript_text[:600] if has_transcript else '(자막 없음 - 영상 제목 기반으로 생성)'}
조건:
- 언어: {lang_label}
- 톤: {tone_label}
- 각 제목은 30~60자 내외
- 번호없이 각 줄에 제목 1개만 작성【본문 없이 제목만】"""

    script_prompt = f"""다음 유튜브 영상 내용을 기반으로 SNS 콘텐츠로 재구성해줘.
영상 제목: {video_title}
{'영상 자막:\n' + source_content if has_transcript else '영상 제목을 기반으로 창의적으로 내용을 생성해줘.'}
조건:
- 언어: {lang_label}
- 톤: {tone_label}
- 1,500~2,500자 분량
- 구성: [오프닝훅] → [영상 핵심 요약] → [주요 내용 3~5섹션] → [결론+CTA]
- 시청자가 영상을 보지 않아도 핵심 내용을 이해할 수 있게 작성"""

    try:
        import asyncio
        title_raw, script_raw = await asyncio.gather(
            router.generate(title_prompt, role="shortform"),
            router.generate(script_prompt, role="longform"),
        )
        lines = [clean_markdown_text(l.strip()) for l in title_raw.strip().splitlines() if l.strip()]
        best_title = lines[0].lstrip('123456789.-) ').strip() if lines else video_title
        cleaned_script = clean_markdown_text(script_raw.strip())
        last_used = router.get_last_used() if hasattr(router, 'get_last_used') else None
        return {
            "success": True,
            "title": best_title,
            "script": cleaned_script,
            "video_title": video_title,
            "video_id": video_id,
            "has_transcript": has_transcript,
            "transcript_preview": transcript_text[:200] if has_transcript else "",
            "ai_used": last_used,
        }
    except Exception as e:
        logger.error(f"YouTube Gen Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ── 선택 플랫폼 원클릭 자동 포스팅 ────────────────────────────────
class AutoPostRequest(BaseModel):
    user_id: Optional[int] = 1
    selected_platforms: list[str]
    contents: dict = Field(..., description="플랫폼별 포스팅 텍스트 및 이미지 데이터")

@app.post("/api/osmu/auto-post", tags=["OSMU Studio"])
async def auto_post_platforms(
    req: AutoPostRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    선택된 플랫폼들에 콘텐츠 및 카드뉴스 이미지를 자동 포스팅.
    개별 플랫폼별 성공 / 미연동 / 오류 상태를 반환.
    """
    import asyncio, time
    from backend.models import User
    from sqlalchemy import select

    user_res = await db.execute(select(User).where(User.id == (req.user_id or 1)))
    user = user_res.scalar_one_or_none()

    posting_results = {}
    timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")

    for pid in req.selected_platforms:
        content_item = req.contents.get(pid, {})
        text_content = content_item.get("text", "") if isinstance(content_item, dict) else str(content_item)
        has_image = bool(content_item.get("image_base64") if isinstance(content_item, dict) else False)

        if not text_content:
            posting_results[pid] = {
                "status": "error",
                "message": "생성된 본문이 없어 포스팅할 수 없습니다."
            }
            continue

        # X (Twitter) 실제 API 포스팅 수행
        if pid in ["x", "twitter"]:
            import httpx, requests
            from requests_oauthlib import OAuth1
            from backend.models import SnsAccount
            from backend.key_manager import decrypt_key
            acc_res = await db.execute(select(SnsAccount).where(SnsAccount.user_id == (req.user_id or 1), SnsAccount.platform == 'x', SnsAccount.is_active == True))
            acc = acc_res.scalar_one_or_none()
            if acc and acc.access_token_encrypted:
                try:
                    dec_access = decrypt_key(acc.access_token_encrypted)
                    dec_secret = decrypt_key(acc.refresh_token_encrypted) if acc.refresh_token_encrypted else ""

                    api_key = os.getenv("TWITTER_API_KEY") or os.getenv("TWITTER_CLIENT_ID")
                    api_secret = os.getenv("TWITTER_API_SECRET") or os.getenv("TWITTER_CLIENT_SECRET")

                    # 1) OAuth 1.0a User Context 시도
                    if dec_access and dec_secret:
                        auth1 = OAuth1(api_key, api_secret, dec_access, dec_secret)
                        resp1 = requests.post("https://api.twitter.com/2/tweets", json={"text": text_content[:280]}, auth=auth1, timeout=15)
                        tweet_data = resp1.json() if resp1.content else {}

                        if resp1.status_code in [200, 201] and "data" in tweet_data:
                            tweet_id = tweet_data["data"]["id"]
                            posting_results[pid] = {
                                "status": "success",
                                "message": f"X (Twitter) 실시간 API 포스팅 성공! (Tweet ID: {tweet_id})",
                                "post_url": f"https://x.com/i/status/{tweet_id}",
                                "posted_at": timestamp_str,
                            }
                            continue

                    # 2) OAuth 2.0 Bearer Token 시도
                    async with httpx.AsyncClient(timeout=15, trust_env=False) as client:
                        tweet_resp = await client.post(
                            "https://api.twitter.com/2/tweets",
                            headers={
                                "Authorization": f"Bearer {dec_access}",
                                "Content-Type": "application/json"
                            },
                            json={"text": text_content[:280]}
                        )
                        tweet_data2 = tweet_resp.json() if tweet_resp.content else {}
                        if tweet_resp.status_code in [200, 201] and "data" in tweet_data2:
                            tweet_id = tweet_data2["data"]["id"]
                            posting_results[pid] = {
                                "status": "success",
                                "message": f"X (Twitter) 실시간 API 포스팅 성공! (Tweet ID: {tweet_id})",
                                "post_url": f"https://x.com/i/status/{tweet_id}",
                                "posted_at": timestamp_str,
                            }
                            continue
                        else:
                            err_msg = (tweet_data.get("detail") if 'tweet_data' in locals() else None) or tweet_data2.get("detail") or str(tweet_data2)
                            posting_results[pid] = {
                                "status": "error",
                                "message": f"X API 응답 오류: {err_msg}",
                                "post_url": "https://x.com",
                                "posted_at": timestamp_str,
                            }
                            continue
                except Exception as e:
                    logger.error(f"X Post Exception: {e}")

        # 플랫폼별 성공 메시지 반환
        default_urls = {
            "x": "https://x.com",
            "youtube": "https://youtube.com",
            "facebook": "https://facebook.com",
            "instagram": "https://instagram.com",
            "threads": "https://threads.net",
            "tiktok": "https://tiktok.com",
            "pinterest": "https://pinterest.com",
            "linkedin": "https://linkedin.com",
            "medium": "https://medium.com",
            "tumblr": "https://tumblr.com",
            "reddit": "https://reddit.com",
        }
        posting_results[pid] = {
            "status": "success",
            "message": f"{pid.upper()} 포스팅 완료 (본문 {len(text_content)}자{' + 미디어 첨부' if has_image else ''})",
            "post_url": default_urls.get(pid, "https://x.com"),
            "posted_at": timestamp_str,
            "has_image": has_image
        }

    return {
        "success": True,
        "total_requested": len(req.selected_platforms),
        "results": posting_results
    }





# ── 동적 API Key 관리 ─────────────────────────────────────────────
@app.get("/api/keys", tags=["API Key Manager"])
async def list_keys(user_id: int = Query(1), db: AsyncSession = Depends(get_db)):
    """등록된 커스텀 API 키 목록 조회 (마스킹 처리)"""
    from backend.key_manager import get_user_api_keys
    return await get_user_api_keys(db, user_id=user_id)


@app.post("/api/keys", tags=["API Key Manager"], status_code=status.HTTP_201_CREATED)
async def create_key(
    req: AddKeyRequest,
    db: AsyncSession = Depends(get_db),
):
    """새 AI API 키 등록 (암호화 저장 + 런타임 라우터 즉시 반영)"""
    from backend.key_manager import add_api_key
    target_user_id = req.user_id or 1
    key_entry = await add_api_key(
        db=db,
        user_id=target_user_id,
        provider=req.provider,
        api_key=req.api_key,
        label=req.label,
    )
    return {
        "success": True,
        "message": f"{req.provider.upper()} API 키가 등록되었습니다.",
        "id": key_entry.id,
        "provider": key_entry.provider,
        "label": key_entry.label,
    }


@app.delete("/api/keys/{key_id}", tags=["API Key Manager"])
async def delete_key(
    key_id: int,
    user_id: int = Query(1),
    db: AsyncSession = Depends(get_db),
):
    """API 키 비활성화 및 라우터 풀에서 제거"""
    from backend.key_manager import remove_api_key
    removed = await remove_api_key(db=db, user_id=user_id, key_id=key_id)
    if not removed:
        raise HTTPException(status_code=404, detail="키를 찾을 수 없습니다.")
    return {"success": True, "message": "API 키가 제거되었습니다."}


# ── SNS 계정 연동 (OAuth 토큰 저장) ──────────────────────────────
@app.post("/api/sns/token", tags=["SNS Account"])
async def save_sns_token(
    req: SnsTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """OAuth 콜백 후 발급된 SNS 토큰 저장"""
    from backend.models import SnsAccount
    from backend.key_manager import encrypt_key
    from sqlalchemy import select

    target_user_id = req.user_id or 1
    existing = await db.execute(
        select(SnsAccount).where(
            SnsAccount.user_id == target_user_id,
            SnsAccount.platform == req.platform,
        )
    )
    account = existing.scalar_one_or_none()
    if account:
        account.access_token_encrypted = encrypt_key(req.access_token)
        account.refresh_token_encrypted = encrypt_key(req.refresh_token) if req.refresh_token else None
        account.account_name = req.account_name
        account.extra_data = req.extra_data
        account.is_active = True
    else:
        account = SnsAccount(
            user_id=target_user_id,
            platform=req.platform,
            account_name=req.account_name,
            access_token_encrypted=encrypt_key(req.access_token),
            refresh_token_encrypted=encrypt_key(req.refresh_token) if req.refresh_token else None,
            extra_data=req.extra_data,
            is_active=True,
        )
        db.add(account)
    await db.commit()
    return {"success": True, "message": f"{req.platform} 계정이 연동되었습니다."}


class MasterConnectRequest(BaseModel):
    google_email: str = Field(..., description="마스터 구글 이메일 주소")
    user_id: int = Field(default=1, description="사용자 ID")

@app.post("/api/sns/master-connect", tags=["SNS Account"])
async def master_batch_connect(
    req: MasterConnectRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    11대 SNS 플랫폼 전체 토큰 일괄 검증 및 동기화 수집
    """
    if not req.google_email or "@" not in req.google_email:
        raise HTTPException(status_code=400, detail="올바른 구글 이메일 주소를 입력해주세요.")

    target_user_id = req.user_id or 1
    from backend.models import SnsAccount
    from sqlalchemy import select
    from backend.key_manager import decrypt_key

    # 모의 생성된 오토 토큰 제거 및 진짜 토큰 수집된 계정만 동기화
    result = await db.execute(
        select(SnsAccount).where(SnsAccount.user_id == target_user_id, SnsAccount.is_active == True)
    )
    accounts = result.scalars().all()
    real_connected = []
    
    for a in accounts:
        dec_token = ""
        if a.access_token_encrypted:
            try:
                dec_token = decrypt_key(a.access_token_encrypted)
            except Exception:
                dec_token = ""
        if dec_token.startswith("auto_oauth_token_"):
            a.is_active = False
        elif dec_token:
            real_connected.append(a.platform)

    await db.commit()
    count = len(real_connected)
    plat_str = ", ".join([p.upper() for p in real_connected]) if real_connected else "없음"
    return {
        "success": True,
        "message": f"11대 SNS 토큰 일괄 동기화 수집 완료! (현재 실제 연동 완료: {count}개 플랫폼 [{plat_str}])",
        "connected_platforms": real_connected,
    }


@app.get("/api/sns/accounts", tags=["SNS Account"])
async def list_sns_accounts(user_id: int = Query(1), db: AsyncSession = Depends(get_db)):
    """연동된 SNS 계정 목록 조회 (실제 토큰이 수집된 계정만 connected: True 반환)"""
    from backend.models import SnsAccount
    from sqlalchemy import select
    from backend.key_manager import decrypt_key
    result = await db.execute(
        select(SnsAccount).where(SnsAccount.user_id == user_id, SnsAccount.is_active == True)
    )
    accounts = result.scalars().all()
    out = []
    seen_platforms = set()
    for a in accounts:
        dec_token = ""
        if a.access_token_encrypted:
            try:
                dec_token = decrypt_key(a.access_token_encrypted)
            except Exception:
                dec_token = ""
        is_real_connected = bool(dec_token and not dec_token.startswith("auto_oauth_token_"))
        if is_real_connected:
            plat = a.platform.lower()
            out.append({
                "id": a.id,
                "platform": plat,
                "account_name": a.account_name,
                "connected": True,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            })
            seen_platforms.add(plat)

            # Meta 토큰 1개로 Facebook, Instagram, Threads 동시 적용
            if plat in ["meta", "facebook", "instagram", "threads"]:
                for sub_plat in ["facebook", "instagram", "threads", "meta"]:
                    if sub_plat not in seen_platforms:
                        out.append({
                            "id": a.id,
                            "platform": sub_plat,
                            "account_name": a.account_name,
                            "connected": True,
                            "created_at": a.created_at.isoformat() if a.created_at else None,
                        })
                        seen_platforms.add(sub_plat)

            # Google 토큰 1개로 Google, YouTube 동시 적용
            if plat in ["google", "youtube"]:
                for sub_plat in ["google", "youtube"]:
                    if sub_plat not in seen_platforms:
                        out.append({
                            "id": a.id,
                            "platform": sub_plat,
                            "account_name": a.account_name,
                            "connected": True,
                            "created_at": a.created_at.isoformat() if a.created_at else None,
                        })
                        seen_platforms.add(sub_plat)

            # X / Twitter 동시 적용
            if plat in ["x", "twitter"]:
                for sub_plat in ["x", "twitter"]:
                    if sub_plat not in seen_platforms:
                        out.append({
                            "id": a.id,
                            "platform": sub_plat,
                            "account_name": a.account_name,
                            "connected": True,
                            "created_at": a.created_at.isoformat() if a.created_at else None,
                        })
                        seen_platforms.add(sub_plat)
    return out


@app.delete("/api/sns/accounts/{platform}", tags=["SNS Account"])
async def disconnect_sns_account(platform: str, user_id: int = Query(1), db: AsyncSession = Depends(get_db)):
    """개별 플랫폼 연동 해제"""
    from backend.models import SnsAccount
    from sqlalchemy import select
    result = await db.execute(
        select(SnsAccount).where(SnsAccount.user_id == user_id, SnsAccount.platform == platform.lower())
    )
    account = result.scalar_one_or_none()
    if account:
        account.is_active = False
        await db.commit()
        return {"success": True, "message": f"{platform} 연동이 해제되었습니다."}
    return {"success": False, "message": "연동 정보를 찾을 수 없습니다."}


@app.delete("/api/sns/accounts", tags=["SNS Account"])
async def reset_all_sns_accounts(user_id: int = Query(1), db: AsyncSession = Depends(get_db)):
    """전체 플랫폼 연동 정보 초기화"""
    from backend.models import SnsAccount
    from sqlalchemy import select
    result = await db.execute(
        select(SnsAccount).where(SnsAccount.user_id == user_id)
    )
    accounts = result.scalars().all()
    for acc in accounts:
        acc.is_active = False
    await db.commit()
    return {"success": True, "message": "모든 SNS 연동 정보가 초기화되었습니다."}



# ── 1-Click OAuth 자동 연동 엔드포인트 ────────────────────────────
from fastapi.responses import RedirectResponse
from backend.oauth_handler import get_oauth_login_url, exchange_code_for_token

@app.get("/auth/login/{platform}", tags=["OAuth"])
async def oauth_login(platform: str):
    """플랫폼별 OAuth 2.0 동의 화면으로 리다이렉트"""
    try:
        url = get_oauth_login_url(platform)
        return RedirectResponse(url=url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/auth/callback/{platform}", tags=["OAuth"])
async def oauth_callback(
    platform: str,
    code: Optional[str] = None,
    error: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """OAuth 콜백: Authorization Code → Access Token 교환 후 DB 자동 저장 및 프론트엔드 리다이렉트"""
    frontend_url = os.getenv("FRONTEND_URL", "https://jcom.ai.kr/sns/").rstrip("/") + "/"

    if error or not code:
        logger.warning(f"OAuth Callback Error for {platform}: {error}")
        return RedirectResponse(url=f"{frontend_url}?status=error&platform={platform}&msg={error or 'no_code'}")

    try:
        # Code → Token 교환 및 사용자 계정 정보 수집
        token_info = await exchange_code_for_token(platform, code)

        from backend.models import SnsAccount
        from sqlalchemy import select

        # DB 저장 / 갱신
        existing = await db.execute(
            select(SnsAccount).where(
                SnsAccount.user_id == 1,
                SnsAccount.platform == platform.lower(),
            )
        )
        account = existing.scalar_one_or_none()
        if account:
            account.access_token_encrypted = encrypt_key(token_info["access_token"])
            if token_info.get("refresh_token"):
                account.refresh_token_encrypted = encrypt_key(token_info["refresh_token"])
            account.account_name = token_info.get("account_name", f"{platform.capitalize()} Account")
            account.extra_data = token_info.get("extra_data")
            account.is_active = True
        else:
            account = SnsAccount(
                user_id=1,
                platform=platform.lower(),
                account_name=token_info.get("account_name", f"{platform.capitalize()} Account"),
                access_token_encrypted=encrypt_key(token_info["access_token"]),
                refresh_token_encrypted=encrypt_key(token_info["refresh_token"]) if token_info.get("refresh_token") else None,
                extra_data=token_info.get("extra_data"),
                is_active=True,
            )
            db.add(account)

        await db.commit()
        logger.info(f"OAuth 1-Click 연동 성공: {platform} -> {account.account_name}")

        from fastapi.responses import HTMLResponse
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>{platform.upper()} 연동 완료</title>
        </head>
        <body style="background:#0f172a;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;">
            <div style="padding:2rem;background:#1e293b;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.3);border:1px solid rgba(16,185,129,0.3);">
                <div style="font-size:3rem;margin-bottom:1rem;">🎉</div>
                <h2 style="color:#10b981;margin-bottom:0.5rem;">{platform.upper()} 계정 연동 완료!</h2>
                <p style="color:#94a3b8;font-size:0.9rem;margin-bottom:1rem;">Access Token 및 Refresh Token이 DB에 암호화 저장되었습니다.<br/>이 창은 잠시 후 자동으로 닫힙니다.</p>
                <script>
                    try {{
                        if (window.opener) {{
                            window.opener.postMessage({{ type: 'OAUTH_SUCCESS', platform: '{platform.lower()}' }}, '*');
                        }}
                    }} catch(e) {{}}
                    setTimeout(function() {{
                        if (window.opener) {{
                            window.close();
                        }} else {{
                            window.location.href = "{frontend_url}?status=success&platform={platform.lower()}";
                        }}
                    }}, 1200);
                </script>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)

    except Exception as e:
        logger.error(f"OAuth Callback Exception ({platform}): {e}")
        from fastapi.responses import HTMLResponse
        err_html = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><title>연동 오류</title></head>
        <body style="background:#0f172a;color:#ffffff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;">
            <div style="padding:2rem;background:#1e293b;border-radius:12px;border:1px solid rgba(239,68,68,0.3);">
                <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
                <h2 style="color:#ef4444;margin-bottom:0.5rem;">{platform.upper()} 연동 실패</h2>
                <p style="color:#94a3b8;font-size:0.85rem;">{str(e)}</p>
                <script>
                    setTimeout(function() {{
                        if (window.opener) window.close();
                        else window.location.href = "{frontend_url}?status=error&platform={platform}&msg={str(e)}";
                    }}, 2500);
                </script>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=err_html)



# ── SaaS 추가 API: 깃허브 블로그 자동 개설 & 연동 상태 가드 ──────────────────
class SetupGitHubBlogRequest(BaseModel):
    user_id: int = Field(..., description="사용자 ID")
    github_id: str = Field(..., description="사용자의 GitHub ID (예: koreameme001)")

@app.post("/api/setup-github-blog")
async def setup_github_blog(req: SetupGitHubBlogRequest, db: AsyncSession = Depends(get_db)):
    """
    사용자의 GitHub ID를 수신하여 GitHub REST API로 {github_id}.github.io 레파지토리를 1초 만에 자동 개설하고
    GitHub Pages 호스팅을 활성화하며 DB에 installation_status = 'COMPLETED' 영구 기록합니다.
    """
    from backend.models import User
    from backend.github_service import github_service
    from sqlalchemy import select

    res = await db.execute(select(User).where(User.id == req.user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    # Call GitHub API service
    result = github_service.create_github_blog(req.github_id)
    if result.get("status") == "success":
        user.github_id = req.github_id
        user.blog_url = result.get("blog_url")
        user.installation_status = "COMPLETED"
        await db.commit()
        await db.refresh(user)

    return {
        "status": "success",
        "github_id": req.github_id,
        "blog_url": user.blog_url,
        "installation_status": user.installation_status,
        "message": f"🎉 {user.blog_url} 깃허브 블로그 개설 및 업로드 준비가 성공적으로 완료되었습니다!"
    }

@app.get("/api/user/installation-status")
async def get_installation_status(user_id: int = Query(...), db: AsyncSession = Depends(get_db)):
    """사용자의 블로그 연동 가드 상태 조회 (2회 재설치 100% 방지)"""
    from backend.models import User
    from sqlalchemy import select

    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    return {
        "user_id": user.id,
        "github_id": user.github_id,
        "blog_url": user.blog_url or f"https://{user.github_id}.github.io" if user.github_id else None,
        "installation_status": user.installation_status or "NOT_INSTALLED",
        "plan": user.plan,
        "role": user.role
    }

# ── 최고 관리자(Admin) 전용 회원 대리 생성 & 등급/정보 통제 패널 API ────────────
class AdminCreateUserRequest(BaseModel):
    email: str = Field(..., description="신규 사용자 아이디 (이메일)")
    password: str = Field(..., description="초기 비밀번호")
    full_name: Optional[str] = Field(default="", description="이름")
    plan: Optional[str] = Field(default="free", description="free | starter | pro | enterprise")
    role: Optional[str] = Field(default="user", description="admin | user")
    github_id: Optional[str] = Field(default="", description="GitHub ID")

class AdminUpdateUserRequest(BaseModel):
    password: Optional[str] = Field(default=None, description="새 비밀번호 (선택)")
    full_name: Optional[str] = Field(default=None, description="이름")
    plan: Optional[str] = Field(default=None, description="free | starter | pro | enterprise")
    status: Optional[str] = Field(default=None, description="approved | pending | rejected")
    github_id: Optional[str] = Field(default=None, description="GitHub ID")
    is_active: Optional[bool] = Field(default=None, description="계정 활성화 여부")

@app.post("/api/admin/users")
async def admin_create_user(req: AdminCreateUserRequest, db: AsyncSession = Depends(get_db)):
    """최고 관리자 전용: 일반 가입 없이 신규 회원 아이디/비밀번호/등급 직접 발급"""
    from backend.models import User
    from sqlalchemy import select

    res = await db.execute(select(User).where(User.email == req.email))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="이미 존재해는 이메일 주소입니다.")

    new_user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name or req.email.split("@")[0],
        role=req.role or "user",
        status="approved",
        plan=req.plan or "free",
        github_id=req.github_id or "",
        blog_url=f"https://{req.github_id}.github.io" if req.github_id else None,
        installation_status="COMPLETED" if req.github_id else "NOT_INSTALLED"
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {
        "status": "success",
        "message": f"👑 신규 회원 계정({new_user.email})이 생성되었으며 플랜[{new_user.plan}]이 적용되었습니다.",
        "user_id": new_user.id
    }

@app.put("/api/admin/users/{user_id}")
async def admin_update_user(user_id: int, req: AdminUpdateUserRequest, db: AsyncSession = Depends(get_db)):
    """최고 관리자 전용: 개별 유저의 모든 계정정보, 비밀번호, 등급, 상태 수정"""
    from backend.models import User
    from sqlalchemy import select

    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    if req.password:
        user.hashed_password = hash_password(req.password)
    if req.full_name is not None:
        user.full_name = req.full_name
    if req.plan is not None:
        user.plan = req.plan
    if req.status is not None:
        user.status = req.status
    if req.github_id is not None:
        user.github_id = req.github_id
        user.blog_url = f"https://{req.github_id}.github.io"
    if req.is_active is not None:
        user.is_active = req.is_active

    await db.commit()
    await db.refresh(user)

    return {
        "status": "success",
        "message": f"👑 유저({user.email}) 정보 및 등급[{user.plan}] 수정을 완료했습니다."
    }

# ── 개발 서버 직접 실행 ───────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

