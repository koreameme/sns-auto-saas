import os
import requests
import logging

logger = logging.getLogger("backend.youtube_service")

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")

class YouTubeEmbedService:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or YOUTUBE_API_KEY

    def search_youtube_video(self, keyword: str) -> dict:
        """
        Searches YouTube Data API v3 for relevant product review / unboxing videos.
        Returns embed iframe HTML or fallback iframe HTML.
        """
        if not self.api_key:
            # Fallback search embed when API key is not configured
            encoded_kw = requests.utils.quote(f"{keyword} 솔직 후기 리뷰")
            fallback_iframe = f"""<div class="youtube-embed-container my-6 relative pb-[56.25%] h-0 overflow-hidden rounded-xl shadow-lg border border-gray-200">
  <iframe src="https://www.youtube.com/embed?listType=search&list={encoded_kw}" 
          class="absolute top-0 left-0 w-full h-full border-0" 
          allowfullscreen loading="lazy" title="{keyword} 관련 유튜브 상품 리뷰 영상"></iframe>
</div>"""
            return {"status": "success", "keyword": keyword, "iframe_html": fallback_iframe, "is_fallback": True}

        try:
            url = f"https://www.googleapis.com/youtube/v3/search"
            params = {
                "part": "snippet",
                "q": f"{keyword} 솔직후기 리뷰",
                "type": "video",
                "maxResults": 1,
                "relevanceLanguage": "ko",
                "key": self.api_key
            }
            resp = requests.get(url, params=params, timeout=5)
            if resp.status_code == 200:
                items = resp.json().get("items", [])
                if items:
                    video_id = items[0]["id"]["videoId"]
                    title = items[0]["snippet"]["title"]
                    iframe_html = f"""<div class="youtube-embed-container my-6 relative pb-[56.25%] h-0 overflow-hidden rounded-xl shadow-lg border border-gray-200">
  <iframe src="https://www.youtube.com/embed/{video_id}" 
          class="absolute top-0 left-0 w-full h-full border-0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen loading="lazy" title="{title}"></iframe>
</div>"""
                    return {"status": "success", "video_id": video_id, "title": title, "iframe_html": iframe_html, "is_fallback": False}
        except Exception as e:
            logger.warning(f"YouTube API search error, using fallback: {e}")

        # Default fallback
        encoded_kw = requests.utils.quote(f"{keyword} 리뷰")
        fallback_iframe = f"""<div class="youtube-embed-container my-6 relative pb-[56.25%] h-0 overflow-hidden rounded-xl shadow-lg border border-gray-200">
  <iframe src="https://www.youtube.com/embed?listType=search&list={encoded_kw}" 
          class="absolute top-0 left-0 w-full h-full border-0" 
          allowfullscreen loading="lazy" title="{keyword} 관련 유튜브 상품 리뷰 영상"></iframe>
</div>"""
        return {"status": "success", "keyword": keyword, "iframe_html": fallback_iframe, "is_fallback": True}

# Singleton instance
youtube_service = YouTubeEmbedService()
