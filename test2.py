import urllib.request
import json
import sys

data = json.dumps({"keywords": ["test"], "language": "ko", "tone": "casual"}).encode("utf-8")
req = urllib.request.Request("http://localhost:8000/api/osmu/generate-from-keywords", data=data, headers={"Content-Type": "application/json"})

try:
    with urllib.request.urlopen(req) as response:
        print("STATUS:", response.status)
        print("BODY:", response.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print("ERROR STATUS:", e.code)
    print("ERROR BODY:", e.read().decode("utf-8"))
except Exception as e:
    print("OTHER ERROR:", e)
