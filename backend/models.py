"""
models.py - SQLAlchemy ORM 모델 정의
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON
from sqlalchemy.sql import func
from backend.database import Base


class User(Base):
    """SaaS 사용자 계정"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(String(50), default="user")           # admin / user
    status = Column(String(50), default="approved")      # approved / pending / rejected
    plan = Column(String(50), default="free")           # free / starter / pro / enterprise
    github_id = Column(String(255), nullable=True)     # GitHub ID (e.g. koreameme001)
    blog_url = Column(String(500), nullable=True)      # e.g. https://koreameme001.github.io
    installation_status = Column(String(50), default="NOT_INSTALLED") # NOT_INSTALLED / COMPLETED
    daily_limit = Column(Integer, default=10)
    monthly_credits = Column(Integer, default=30)
    used_credits = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CustomApiKey(Base):
    """사용자가 동적으로 추가한 AI API Key"""
    __tablename__ = "custom_api_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    provider = Column(String(100), nullable=False)     # groq / mistral / cohere / openai 등
    label = Column(String(200), nullable=True)          # 사용자 정의 레이블
    api_key_encrypted = Column(Text, nullable=False)    # 암호화된 API 키
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SnsAccount(Base):
    """연동된 SNS 플랫폼 계정 및 OAuth 토큰"""
    __tablename__ = "sns_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    platform = Column(String(50), nullable=False)       # youtube / x / instagram / facebook / threads / tiktok / pinterest
    account_name = Column(String(255), nullable=True)
    access_token_encrypted = Column(Text, nullable=True)
    refresh_token_encrypted = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    extra_data = Column(JSON, nullable=True)            # 플랫폼별 추가 정보
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PostHistory(Base):
    """포스팅 이력"""
    __tablename__ = "post_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    platform = Column(String(50), nullable=False)
    post_type = Column(String(50), nullable=False)      # video / image / text / thread
    title = Column(String(500), nullable=True)
    content_summary = Column(Text, nullable=True)
    status = Column(String(50), default="pending")      # pending / published / failed
    platform_post_id = Column(String(255), nullable=True)
    ai_provider_used = Column(String(100), nullable=True)  # 어떤 AI 키가 사용됐는지
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PaymentOrder(Base):
    """결제 및 무통장 입금 신청 이력"""
    __tablename__ = "payment_orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    payment_method = Column(String(50), nullable=False) # card / bank_transfer
    plan = Column(String(50), default="pro")
    amount = Column(Integer, default=39000)
    depositor_name = Column(String(100), nullable=True)
    status = Column(String(50), default="pending")      # pending / approved / rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())

