"""
URL validation and authorization checks for YouTube media extraction.
Restricts to supported and authorized video endpoints.
"""
import re
from urllib.parse import urlparse

YOUTUBE_DOMAINS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be"
}

def is_valid_youtube_url(url: str) -> bool:
    if not url or not isinstance(url, str):
        return False

    url = url.strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        return False

    try:
        parsed = urlparse(url)
        hostname = (parsed.hostname or "").lower()
        
        # Check against allowed youtube domains
        if hostname not in YOUTUBE_DOMAINS:
            # Check subdomains
            if not any(hostname.endswith("." + d) for d in YOUTUBE_DOMAINS if not d.startswith("www.")):
                return False

        # Check path or query contains video identifier
        if "youtu.be" in hostname:
            video_id = parsed.path.lstrip("/")
            return bool(re.match(r"^[a-zA-Z0-9_-]{11}", video_id))
        
        # Watch URL or shorts
        if "/watch" in parsed.path:
            return "v=" in parsed.query
        
        if "/shorts/" in parsed.path:
            video_id = parsed.path.split("/shorts/")[1].split("/")[0]
            return bool(re.match(r"^[a-zA-Z0-9_-]{11}", video_id))

        if "/embed/" in parsed.path:
            video_id = parsed.path.split("/embed/")[1].split("/")[0]
            return bool(re.match(r"^[a-zA-Z0-9_-]{11}", video_id))

        return False
    except Exception:
        return False

