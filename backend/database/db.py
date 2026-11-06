"""
Database module for Personal Video Downloader & TV Media Manager.
Uses SQLite for persistent settings and download history.
"""
import sqlite3
import os
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "backend" / "media_manager.db"

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS downloads (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT,
        channel TEXT,
        duration INTEGER DEFAULT 0,
        thumbnail_url TEXT,
        resolution TEXT,
        fps INTEGER DEFAULT 30,
        container TEXT DEFAULT 'mp4',
        video_codec TEXT,
        audio_codec TEXT,
        file_size INTEGER DEFAULT 0,
        file_path TEXT,
        status TEXT DEFAULT 'queued',
        progress REAL DEFAULT 0.0,
        speed REAL DEFAULT 0.0,
        eta INTEGER DEFAULT 0,
        error_message TEXT,
        tv_profile TEXT DEFAULT 'universal',
        tv_compatible INTEGER DEFAULT 1,
        media_info_json TEXT,
        created_at TEXT,
        completed_at TEXT
    )
    """)

    # Populate default settings if not already present
    default_downloads_dir = str(BASE_DIR / "downloads")
    default_temp_dir = str(BASE_DIR / "temp_downloads")
    
    # Check default ffmpeg
    default_ffmpeg = "ffmpeg"
    airy_path = r"C:\Program Files (x86)\Airy Team\Airy\tools\ffmpeg.exe"
    if os.path.exists(airy_path):
        default_ffmpeg = airy_path

    defaults = {
        "download_dir": default_downloads_dir,
        "temp_dir": default_temp_dir,
        "default_resolution": "1080p",
        "default_container": "mp4",
        "default_tv_profile": "universal",
        "max_concurrent_downloads": "2",
        "ffmpeg_path": default_ffmpeg,
        "theme": "dark",
        "delete_temp_files": "true",
        "enable_faststart": "true",
        "strict_yuv420p": "true"
    }

    for key, val in defaults.items():
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, val))

    conn.commit()
    conn.close()

# Auto-initialize DB tables if not exist
try:
    init_db()
except Exception:
    pass


def get_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return row["value"]
    return default

def get_all_settings() -> Dict[str, str]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings")
    rows = cursor.fetchall()
    conn.close()
    return {row["key"]: row["value"] for row in rows}

def set_setting(key: str, value: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    """, (key, value))
    conn.commit()
    conn.close()

def save_download(download_data: Dict[str, Any]):
    conn = get_db_connection()
    cursor = conn.cursor()
    fields = [
        "id", "url", "title", "channel", "duration", "thumbnail_url",
        "resolution", "fps", "container", "video_codec", "audio_codec",
        "file_size", "file_path", "status", "progress", "speed", "eta",
        "error_message", "tv_profile", "tv_compatible", "media_info_json",
        "created_at", "completed_at"
    ]
    placeholders = ", ".join(["?"] * len(fields))
    col_names = ", ".join(fields)
    update_clause = ", ".join([f"{col} = excluded.{col}" for col in fields if col != "id"])

    values = [
        download_data.get("id"),
        download_data.get("url"),
        download_data.get("title"),
        download_data.get("channel"),
        download_data.get("duration", 0),
        download_data.get("thumbnail_url"),
        download_data.get("resolution"),
        download_data.get("fps", 30),
        download_data.get("container", "mp4"),
        download_data.get("video_codec"),
        download_data.get("audio_codec"),
        download_data.get("file_size", 0),
        download_data.get("file_path"),
        download_data.get("status", "queued"),
        download_data.get("progress", 0.0),
        download_data.get("speed", 0.0),
        download_data.get("eta", 0),
        download_data.get("error_message"),
        download_data.get("tv_profile", "universal"),
        1 if download_data.get("tv_compatible", True) else 0,
        json.dumps(download_data.get("media_info_json")) if download_data.get("media_info_json") else None,
        download_data.get("created_at", datetime.now().isoformat()),
        download_data.get("completed_at")
    ]

    cursor.execute(f"""
        INSERT INTO downloads ({col_names}) VALUES ({placeholders})
        ON CONFLICT(id) DO UPDATE SET {update_clause}
    """, values)
    conn.commit()
    conn.close()

def get_download(download_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM downloads WHERE id = ?", (download_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    if d.get("media_info_json"):
        try:
            d["media_info_json"] = json.loads(d["media_info_json"])
        except Exception:
            pass
    return d

def get_downloads_list(status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if status_filter:
        cursor.execute("SELECT * FROM downloads WHERE status = ? ORDER BY created_at DESC", (status_filter,))
    else:
        cursor.execute("SELECT * FROM downloads ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    result = []
    for row in rows:
        d = dict(row)
        if d.get("media_info_json"):
            try:
                d["media_info_json"] = json.loads(d["media_info_json"])
            except Exception:
                pass
        result.append(d)
    return result

def update_download_progress(download_id: str, progress: float, speed: float, eta: int, status: str = "downloading", file_size: int = 0):
    conn = get_db_connection()
    cursor = conn.cursor()
    if file_size > 0:
        cursor.execute("""
            UPDATE downloads 
            SET progress = ?, speed = ?, eta = ?, status = ?, file_size = ?
            WHERE id = ?
        """, (progress, speed, eta, status, file_size, download_id))
    else:
        cursor.execute("""
            UPDATE downloads 
            SET progress = ?, speed = ?, eta = ?, status = ?
            WHERE id = ?
        """, (progress, speed, eta, status, download_id))
    conn.commit()
    conn.close()

def update_download_status(download_id: str, status: str, error_message: Optional[str] = None, file_path: Optional[str] = None, completed_at: Optional[str] = None, file_size: Optional[int] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "UPDATE downloads SET status = ?, error_message = ?"
    params: List[Any] = [status, error_message]
    
    if file_path:
        query += ", file_path = ?"
        params.append(file_path)
    if completed_at:
        query += ", completed_at = ?"
        params.append(completed_at)
    if file_size is not None and file_size > 0:
        query += ", file_size = ?"
        params.append(file_size)
        
    query += " WHERE id = ?"
    params.append(download_id)
    
    cursor.execute(query, params)
    conn.commit()
    conn.close()

def delete_download_record(download_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM downloads WHERE id = ?", (download_id,))
    conn.commit()
    conn.close()
