"""
Unit & Integration tests for Personal Video Downloader & TV Media Manager.
"""
import unittest
import os
import shutil
from pathlib import Path

from backend.utils.url_validator import is_valid_youtube_url
from backend.utils.sanitizer import sanitize_filename, format_bytes, format_duration
from backend.media.tv_profiles import analyze_stream_tv_compatibility
from backend.database.db import (
    init_db,
    save_download,
    get_download,
    get_downloads_list,
    set_setting,
    get_setting,
    delete_download_record
)
from backend.media.ffmpeg_manager import check_ffmpeg_health

class TestVideoDownloader(unittest.TestCase):
    def setUp(self):
        init_db()

    def test_url_validator(self):
        # Valid URLs
        self.assertTrue(is_valid_youtube_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ"))
        self.assertTrue(is_valid_youtube_url("http://youtube.com/watch?v=dQw4w9WgXcQ"))
        self.assertTrue(is_valid_youtube_url("https://youtu.be/dQw4w9WgXcQ"))
        self.assertTrue(is_valid_youtube_url("https://m.youtube.com/watch?v=dQw4w9WgXcQ"))
        self.assertTrue(is_valid_youtube_url("https://www.youtube.com/shorts/dQw4w9WgXcQ"))

        # Invalid or malicious URLs
        self.assertFalse(is_valid_youtube_url("https://malicious-site.com/exploit"))
        self.assertFalse(is_valid_youtube_url("file:///etc/passwd"))
        self.assertFalse(is_valid_youtube_url("javascript:alert(1)"))
        self.assertFalse(is_valid_youtube_url(""))
        self.assertFalse(is_valid_youtube_url("not a url"))

    def test_sanitizer(self):
        # Prohibited Windows characters: \ / : * ? " < > |
        unsafe = 'Video: "Cool" / <Awesome> *Project*? | 2026'
        safe = sanitize_filename(unsafe)
        self.assertNotIn(":", safe)
        self.assertNotIn('"', safe)
        self.assertNotIn("/", safe)
        self.assertNotIn("<", safe)
        self.assertNotIn(">", safe)
        self.assertNotIn("*", safe)
        self.assertNotIn("?", safe)
        self.assertNotIn("|", safe)

        # Byte formatting
        self.assertEqual(format_bytes(1024), "1.00 KB")
        self.assertEqual(format_bytes(1048576 * 5), "5.00 MB")
        self.assertEqual(format_bytes(1073741824 * 2), "2.00 GB")

        # Duration formatting
        self.assertEqual(format_duration(65), "01:05")
        self.assertEqual(format_duration(3665), "01:01:05")

    def test_tv_profiles(self):
        # Case 1: H.264 + AAC in MP4 -> Direct Play Ready (Score 99 or 100, no re-encode)
        res = analyze_stream_tv_compatibility(
            video_codec="avc1.640028",
            audio_codec="mp4a.40.2",
            container="mp4",
            target_profile="universal"
        )
        self.assertEqual(res["strategy"], "direct_copy")
        self.assertFalse(res["needs_video_transcode"])
        self.assertFalse(res["needs_audio_transcode"])

        # Case 2: H.264 video + Opus audio -> Only audio transcode
        res2 = analyze_stream_tv_compatibility(
            video_codec="avc1.640028",
            audio_codec="opus",
            container="webm",
            target_profile="universal"
        )
        self.assertEqual(res2["strategy"], "audio_transcode_only")
        self.assertFalse(res2["needs_video_transcode"])
        self.assertTrue(res2["needs_audio_transcode"])

        # Case 3: VP9 video + Opus audio -> Full transcode to H.264 + AAC
        res3 = analyze_stream_tv_compatibility(
            video_codec="vp9",
            audio_codec="opus",
            container="webm",
            target_profile="universal"
        )
        self.assertEqual(res3["strategy"], "full_transcode")
        self.assertTrue(res3["needs_video_transcode"])
        self.assertTrue(res3["needs_audio_transcode"])

    def test_database_crud(self):
        test_id = "test_item_99"
        record = {
            "id": test_id,
            "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "title": "Test TV Video",
            "channel": "Test Channel",
            "duration": 210,
            "resolution": "1080p",
            "container": "mp4",
            "status": "completed",
            "progress": 100.0,
            "file_size": 15000000,
            "tv_profile": "universal",
            "tv_compatible": True
        }
        save_download(record)

        fetched = get_download(test_id)
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched["title"], "Test TV Video")
        self.assertEqual(fetched["status"], "completed")

        delete_download_record(test_id)
        self.assertIsNone(get_download(test_id))

    def test_ffmpeg_health(self):
        health = check_ffmpeg_health()
        self.assertTrue(health["installed"])
        self.assertTrue(health["features"]["h264"])
        self.assertTrue(health["features"]["aac"])

if __name__ == "__main__":
    unittest.main()

