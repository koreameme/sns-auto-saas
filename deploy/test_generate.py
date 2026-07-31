import json, urllib.request

url = 'http://127.0.0.1:8000/api/osmu/generate-from-keywords'
payload = json.dumps({'user_id': 1, 'keywords': ['1인 창업 성공 노하우'], 'language': 'ko', 'tone': 'casual'}).encode('utf-8')
req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print("GENERATE_SUCCESS!")
        print("Title:", res.get('title'))
        print("AI Used:", res.get('ai_used'))
except Exception as e:
    print("GENERATE_ERROR:", e)
