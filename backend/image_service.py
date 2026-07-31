import os
import io
import requests
import logging
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger("backend.image_service")

class ImageOverlayService:
    def create_hero_image_with_overlay(self, image_url: str, badge_text: str = "🔥 가성비 TOP 5 추천") -> str:
        """
        Downloads the 1st product image, overlays a sleek promotional badge on top,
        and returns a base64 Data URL or modified image path for high-CTR OpenGraph sharing.
        """
        try:
            resp = requests.get(image_url, timeout=5)
            if resp.status_code != 200:
                return image_url  # Fallback to original image URL

            img = Image.open(io.BytesIO(resp.content)).convert("RGBA")
            width, height = img.size

            # Create a semi-transparent overlay banner at top or bottom
            overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(overlay)

            # Draw a vibrant gradient-style badge box at top-left
            badge_box = [20, 20, min(360, width - 20), 80]
            draw.rectangle(badge_box, fill=(79, 70, 229, 230))  # Indigo background with opacity

            # Text overlay
            try:
                font = ImageFont.truetype("arial.ttf", 24)
            except Exception:
                font = ImageFont.load_default()

            draw.text((35, 38), badge_text, fill=(255, 255, 255, 255), font=font)

            # Composite images
            composite = Image.alpha_composite(img, overlay).convert("RGB")

            # Save to byte buffer
            buffered = io.BytesIO()
            composite.save(buffered, format="JPEG", quality=85)
            import base64
            b64_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
            return f"data:image/jpeg;base64,{b64_str}"

        except Exception as e:
            logger.warning(f"Image overlay processing failed, using original URL: {e}")
            return image_url

# Singleton instance
image_service = ImageOverlayService()
