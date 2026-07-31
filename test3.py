import asyncio
import httpx
import time

async def test():
    start = time.time()
    async with httpx.AsyncClient(timeout=120, trust_env=False) as c:
        r = await c.post(
            'http://localhost:8000/api/osmu/generate-from-keywords',
            json={'keywords': ['test'], 'language': 'ko', 'tone': 'casual'}
        )
        elapsed = time.time() - start
        print(f'Status: {r.status_code}  ({elapsed:.1f}s)')
        print(f'Body: {r.text[:500]}')

asyncio.run(test())
