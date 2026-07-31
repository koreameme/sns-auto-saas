import json, urllib.request

url = 'http://127.0.0.1:8000/api/auth/login'
payload = json.dumps({'email': 'admin@snsautopost.com', 'password': 'admin123'}).encode('utf-8')
req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as resp:
        print("LOGIN_SUCCESS:", resp.read().decode())
except Exception as e:
    print("LOGIN_ERROR:", e)
