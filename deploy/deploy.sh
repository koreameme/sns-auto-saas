#!/bin/bash
# ============================================================
# deploy.sh - SNS AutoJoin 백엔드 서버 배포 스크립트
# 실행 방법: bash deploy/deploy.sh
# ============================================================
set -e

SERVER_USER="ubuntu"
SERVER_HOST="168.107.48.17"
SERVER_SSH_KEY="C:/Users/JHL/quantumgold6/ssh-key-2026-06-28.key"
DEPLOY_DIR="/home/ubuntu/sns_auto_backend"
LOCAL_DIR="$(dirname "$0")/.."

echo "🚀 ===== SNS AutoJoin 백엔드 배포 시작 ====="

# 1단계: 서버에 디렉터리 생성
echo "📁 [1/6] 서버 디렉터리 생성 중..."
ssh -i "$SERVER_SSH_KEY" -o StrictHostKeyChecking=no \
    "$SERVER_USER@$SERVER_HOST" "mkdir -p $DEPLOY_DIR"

# 2단계: 백엔드 코드 rsync 동기화 (민감 파일 제외)
echo "📤 [2/6] 백엔드 코드 업로드 중..."
rsync -avz --progress \
    -e "ssh -i $SERVER_SSH_KEY -o StrictHostKeyChecking=no" \
    --exclude=".env" \
    --exclude="__pycache__" \
    --exclude="*.pyc" \
    --exclude=".git" \
    --exclude="frontend" \
    --exclude="*.db" \
    "$LOCAL_DIR/" \
    "$SERVER_USER@$SERVER_HOST:$DEPLOY_DIR/"

# 3단계: 패키지 설치
echo "📦 [3/6] 패키지 설치 중 (litellm-env 활용)..."
ssh -i "$SERVER_SSH_KEY" -o StrictHostKeyChecking=no \
    "$SERVER_USER@$SERVER_HOST" \
    "/home/ubuntu/litellm-env/bin/pip install -q -r $DEPLOY_DIR/backend/requirements.txt"

# 4단계: systemd 서비스 설치
echo "⚙️  [4/6] Systemd 서비스 등록 중..."
ssh -i "$SERVER_SSH_KEY" -o StrictHostKeyChecking=no \
    "$SERVER_USER@$SERVER_HOST" \
    "sudo cp $DEPLOY_DIR/deploy/sns-backend.service /etc/systemd/system/sns-backend.service && \
     sudo systemctl daemon-reload && \
     sudo systemctl enable sns-backend && \
     sudo systemctl restart sns-backend"

# 5단계: Nginx 설정 적용
echo "🔧 [5/6] Nginx 설정 적용 중..."
ssh -i "$SERVER_SSH_KEY" -o StrictHostKeyChecking=no \
    "$SERVER_USER@$SERVER_HOST" \
    "sudo nginx -t && sudo systemctl reload nginx"

# 6단계: UFW 방화벽 활성화
echo "🛡️  [6/6] 방화벽(UFW) 활성화 중..."
ssh -i "$SERVER_SSH_KEY" -o StrictHostKeyChecking=no \
    "$SERVER_USER@$SERVER_HOST" \
    "sudo ufw allow 22/tcp && \
     sudo ufw allow 80/tcp && \
     sudo ufw allow 443/tcp && \
     sudo ufw --force enable"

echo ""
echo "✅ ===== 배포 완료! ====="
echo "🌐 백엔드 API 주소: https://jcom.ai.kr/snsauto/api/health"
echo ""
echo "⚠️  주의사항:"
echo "   - 서버에 .env 파일이 없으면 서버가 정상 작동하지 않습니다!"
echo "   - .env.production.example 을 참고하여 서버에 .env 파일을 생성하세요."
echo "   - CORS_ORIGINS 에 실제 Netlify 배포 주소를 입력하세요."
