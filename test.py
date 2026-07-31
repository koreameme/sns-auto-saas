import requests
import json

try:
    res = requests.post('http://localhost:8000/api/osmu/generate-from-keywords', json={'keywords':['테스트'], 'language':'ko', 'tone':'casual'})
    print("STATUS:", res.status_code)
    print("BODY:", res.text)
except Exception as e:
    print(e)
