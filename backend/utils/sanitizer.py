"""
File sanitization, path security, and string formatting utilities.
"""
import re
import os
from pathlib import Path

# Characters prohibited in Windows filenames: \ / : * ? " < > |
WINDOWS_INVALID_CHARS = re.compile(r'[\\/:*?"<>|]')

def sanitize_filename(filename: str, max_length: int = 150) -> str:
    """
    Sanitizes title into a safe Windows filename without path traversal risks.
    """
    if not filename:
        return "video"
    
    # Strip dangerous characters
    clean = WINDOWS_INVALID_CHARS.sub("_", filename)
    # Remove control characters
    clean = "".join(c for c in clean if c.isprintable())
    # Replace multiple spaces/underscores
    clean = re.sub(r'[\s_]+', ' ', clean).strip()
    # Remove leading/trailing dots and spaces
    clean = clean.strip(". ")
    
    if not clean:
        clean = "video"
        
    if len(clean) > max_length:
        clean = clean[:max_length].rstrip(". ")
        
    return clean

def is_safe_path(base_dir: str, target_path: str) -> bool:
    """
    Guards against path traversal by verifying target_path resides within base_dir.
    """
    try:
        base = Path(base_dir).resolve()
        target = Path(target_path).resolve()
        return base in target.parents or base == target
    except Exception:
        return False

def format_bytes(size_bytes: int) -> str:
    """
    Formats byte size to human-readable format.
    """
    if not size_bytes or size_bytes <= 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB", "TB"]
    size = float(size_bytes)
    idx = 0
    while size >= 1024.0 and idx < len(units) - 1:
        size /= 1024.0
        idx += 1
    return f"{size:.2f} {units[idx]}"

def format_duration(seconds: int) -> str:
    """
    Formats seconds into HH:MM:SS or MM:SS.
    """
    if not seconds or seconds <= 0:
        return "00:00"
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"

