# SNS AutoPost Pro

> 구글 이메일 1개로 7대 SNS 플랫폼에 AI 기반 자동/반자동 포스팅을 지원하는 **단독 스탠드얼론 SaaS 프로그램**

## 🚀 주요 기능

- **OSMU 포스팅 스튜디오**: 유튜브 대본 → YouTube, X, Instagram, Facebook, Threads, TikTok, Pinterest 7개 플랫폼 콘텐츠 동시 AI 생성
- **66개 AI API 키 무중단 라우팅**: Groq(22) + Mistral(22) + Cohere(22) Round-Robin 순환 - Rate Limit 사실상 제로
- **동적 API 키 관리**: SaaS 설정 UI에서 언제든 새 AI 모델 API 키를 추가/삭제 가능 (런타임 즉시 반영)
- **구글 계정 1개 SNS 연동 가이드**: 단계별 플랫폼별 가입 및 OAuth API 발급 온보딩 가이드
- **수익화 플랜**: Free / Pro(월 구독) / Enterprise(단독 판매) 플랜 지원

## 📁 프로젝트 구조

```
sns_auto_join/
├── .env                      # 66개 AI API 키 환경 변수
├── start.ps1                 # 전체 실행 스크립트
├── backend/
│   ├── main.py               # FastAPI 단독 백엔드 서버
│   ├── ai_router.py          # Groq/Mistral/Cohere 66개 키 Multi-Router
│   ├── key_manager.py        # 동적 API 키 암호화 관리
│   ├── osmu_engine.py        # 7대 SNS 원소스 멀티유즈 변환 엔진
│   ├── database.py           # SQLite 비동기 DB
│   ├── models.py             # ORM 모델 (User, SnsAccount, PostHistory 등)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.jsx            # 메인 라우터 & 레이아웃
        ├── api.js             # 백엔드 API 클라이언트
        ├── index.css          # 글로벌 다크 테마 디자인 시스템
        ├── components/
        │   └── Sidebar.jsx
        └── pages/
            ├── Dashboard.jsx  # AI 키 풀 현황 + SNS 연동 상태
            ├── OsmuStudio.jsx # 7대 SNS 동시 포스팅 스튜디오
            ├── SnsAccounts.jsx
            ├── Onboarding.jsx # 플랫폼별 가입 & API 발급 가이드
            ├── ApiKeyManager.jsx # 동적 API 키 추가/관리
            └── Billing.jsx   # 구독 플랜 & 수익화
```

## 🛠️ 빠른 시작

### 1. 백엔드 패키지 설치
```powershell
pip install -r backend/requirements.txt
```

### 2. 프론트엔드 패키지 설치
```powershell
cd frontend
npm install
cd ..
```

### 3. 전체 실행 (백엔드 + 프론트엔드)
```powershell
.\start.ps1
```

또는 개별 실행:
```powershell
# 터미널 1 - 백엔드
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# 터미널 2 - 프론트엔드
cd frontend && npm run dev
```

### 4. 접속
- **대시보드**: http://localhost:5173
- **API 문서**: http://localhost:8000/docs

## 🤖 AI 키 구성 (66개)

| Provider | 키 수량 | 주요 역할 |
| :--- | :---: | :--- |
| Groq (Llama 3.x) | 22개 | 초고속 숏폼 대본, 태그, 틱톡 캡션 |
| Mistral (Large/Small) | 22개 | SEO 긴 글, 유튜브 설명, 페북 포스트 |
| Cohere (Command R+) | 22개 | 소셜 캡션, 요약, 핀터레스트 설명글 |
| **합계** | **66개** | **Rate Limit 제로화 Round-Robin** |

## 💰 수익화 플랜

| 플랜 | 가격 | 주요 기능 |
| :--- | :--- | :--- |
| Free | 무료 | 월 5회 생성, 7대 SNS 지원 |
| Pro | ₩39,000/월 | 무제한 AI 생성, 전체 자동화, 예약 발행 |
| Enterprise | ₩290,000 (영구) | 단독 프로그램 판매, 소스 커스터마이징 |
