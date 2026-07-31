import asyncio
from backend.database import AsyncSessionLocal
from backend.models import CustomApiKey
from sqlalchemy import select, delete

async def check_and_clean():
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(CustomApiKey))
        keys = res.scalars().all()
        print(f"DB 저장된 커스텀 키 갯수: {len(keys)}")
        
        # 중복/테스트로 등록되었던 커스텀 키 삭제하여 내장 66개 기본 상태로 복원
        if keys:
            await session.execute(delete(CustomApiKey))
            await session.commit()
            print("테스트 커스텀 키 모두 초기화 완료!")

asyncio.run(check_and_clean())
