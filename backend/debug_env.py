"""
.env 파싱 결과에서 실제로 어떤 키가 로드되는지 확인
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path("..") / ".env")

groq_raw = os.getenv("GROQ_API_KEYS", "")
keys = [k.strip() for k in groq_raw.split(",") if k.strip()]

print(f"총 Groq 키 수: {len(keys)}")
for i, k in enumerate(keys[:3]):
    print(f"  [{i}] repr={repr(k[:30])}  len={len(k)}")
