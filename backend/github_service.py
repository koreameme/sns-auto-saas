import os
import requests
import base64
import logging

logger = logging.getLogger("backend.github_service")

# System GitHub PAT token (from environment or default)
GITHUB_SYSTEM_TOKEN = os.getenv("GITHUB_SYSTEM_TOKEN", os.getenv("GITHUB_TOKEN", ""))

class GitHubBlogService:
    def __init__(self, token: str = None):
        self.token = token or GITHUB_SYSTEM_TOKEN
        self.headers = {
            "Authorization": f"token {self.token}",
            "Accept": "application/vnd.github.v3+json"
        }

    def create_github_blog(self, github_id: str) -> dict:
        """
        Calls GitHub REST API to automatically create {github_id}.github.io repository
        or a dedicated sns-auto-blog repository, uploads base theme files, and enables GitHub Pages.
        """
        repo_name = f"{github_id}.github.io"
        logger.info(f"🚀 Creating GitHub blog repository for: {github_id} ({repo_name})")

        # Check if repo already exists or create new
        url = f"https://api.github.com/user/repos"
        payload = {
            "name": repo_name,
            "description": f"Official Auto Blog for {github_id}",
            "private": False,
            "auto_init": True
        }

        resp = requests.post(url, headers=self.headers, json=payload)
        
        # If repo exists (422) or created (201)
        if resp.status_code not in (201, 422):
            # Fallback to org / user endpoint if token user is different
            user_repo_url = f"https://api.github.com/repos/{github_id}/{repo_name}"
            check_resp = requests.get(user_repo_url, headers=self.headers)
            if check_resp.status_code != 200:
                logger.warning(f"Repo creation response: {resp.status_code} - {resp.text}")

        # Upload base index.html template
        index_html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{github_id}의 추천 리뷰 오토 블로그</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">
</head>
<body class="bg-gray-50 text-gray-800 antialiased font-sans">
    <header class="bg-indigo-600 text-white py-8 shadow-lg">
        <div class="max-w-4xl mx-auto px-4">
            <h1 class="text-3xl font-bold">✨ {github_id}의 제휴 핫딜 & 솔직 리뷰</h1>
            <p class="mt-2 text-indigo-100">가성비 우수 상품과 최신 특가 소식을 1초 만에 확인하세요.</p>
        </div>
    </header>
    <main class="max-w-4xl mx-auto px-4 py-8">
        <h2 class="text-2xl font-bold mb-6 text-gray-900">최신 포스팅 목록</h2>
        <div id="posts-list" class="space-y-4">
            <div class="p-6 bg-white rounded-xl shadow-md border border-gray-100">
                <span class="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full mb-2">🟢 정상 연동 완료</span>
                <h3 class="text-xl font-bold">블로그 생성이 완벽하게 준비되었습니다!</h3>
                <p class="text-gray-600 mt-2">대시보드에서 5개 제휴 URL을 입력하시면 구글 SEO 최적화 글이 이곳에 자동 게시됩니다.</p>
            </div>
        </div>
    </main>
</body>
</html>"""

        self.commit_file_to_repo(github_id, repo_name, "index.html", index_html, "Initial blog template setup")

        # Enable GitHub Pages
        pages_url = f"https://api.github.com/repos/{github_id}/{repo_name}/pages"
        pages_payload = {"source": {"branch": "main", "path": "/"}}
        requests.post(pages_url, headers=self.headers, json=pages_payload)

        blog_url = f"https://{github_id}.github.io"
        return {
            "status": "success",
            "github_id": github_id,
            "repo_name": repo_name,
            "blog_url": blog_url,
            "message": f"🎉 {blog_url} 블로그 개설 및 업로드 준비가 완벽하게 완료되었습니다!"
        }

    def commit_file_to_repo(self, github_id: str, repo_name: str, path: str, content_str: str, commit_message: str) -> dict:
        """
        Commits an HTML/Markdown file to the GitHub repository using GitHub REST API.
        """
        url = f"https://api.github.com/repos/{github_id}/{repo_name}/contents/{path}"
        content_b64 = base64.b64encode(content_str.encode("utf-8")).decode("utf-8")

        # Get sha if file exists
        get_resp = requests.get(url, headers=self.headers)
        sha = None
        if get_resp.status_code == 200:
            sha = get_resp.json().get("sha")

        payload = {
            "message": commit_message,
            "content": content_b64
        }
        if sha:
            payload["sha"] = sha

        resp = requests.put(url, headers=self.headers, json=payload)
        if resp.status_code in (200, 201):
            return {"status": "success", "path": path, "commit": resp.json().get("commit", {}).get("sha")}
        else:
            logger.error(f"Failed to commit file to GitHub: {resp.status_code} - {resp.text}")
            return {"status": "error", "message": resp.text}

# Singleton instance
github_service = GitHubBlogService()
