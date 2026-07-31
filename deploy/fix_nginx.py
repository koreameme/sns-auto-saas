import re, shutil, subprocess

with open('/tmp/wordpress.conf.bak', 'w') as f:
    result = subprocess.run(['cat', '/etc/nginx/sites-available/wordpress'], capture_output=True, text=True)
    f.write(result.stdout)
    content = result.stdout

# 손상된 snsauto 블록 제거
content = re.sub(r'    # SNS AutoJoin FastAPI.*?    }\n\n', '', content, flags=re.DOTALL)

# 올바른 Nginx 프록시 블록 (단순 변수명 사용)
nginx_block = r"""
    # SNS AutoJoin FastAPI 백엔드 프록시 (/snsauto/)
    location /snsauto/ {
        proxy_pass         http://127.0.0.1:8000/;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout    120s;
        proxy_connect_timeout 10s;
        proxy_send_timeout    120s;
    }

"""

content = content.replace('    location / {', nginx_block + '    location / {', 1)

with open('/tmp/wordpress_new.conf', 'w') as f:
    f.write(content)

subprocess.run(['sudo', 'cp', '/tmp/wordpress_new.conf', '/etc/nginx/sites-available/wordpress'])
result = subprocess.run(['sudo', 'nginx', '-t'], capture_output=True, text=True)
print(result.stdout + result.stderr)
