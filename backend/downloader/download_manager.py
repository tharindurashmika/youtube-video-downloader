"""
Download Manager & Queue Engine.
Handles asynchronous queued downloads, pause/resume/cancel,
merging separate video/audio streams, and TV compatibility conversions.
"""
import os
import sys
import uuid
import time
import shutil
import asyncio
import logging
import yt_dlp
from pathlib import Path
from typing import Dict, Any, Optional, Set, Callable
from datetime import datetime

from backend.database.db import (
    get_setting,
    save_download,
    get_download,
    get_downloads_list,
    update_download_progress,
    update_download_status,
    delete_download_record
)
from backend.media.ffmpeg_manager import (
    get_ffmpeg_binary,
    probe_file,
    convert_media_file,
    merge_separate_streams
)
from backend.utils.sanitizer import sanitize_filename, format_bytes

logger = logging.getLogger("download_manager")

class DownloadTask:
    def __init__(self, download_id: str, request_data: Dict[str, Any]):
        self.download_id = download_id
        self.request_data = request_data
        self.is_cancelled = False
        self.is_paused = False
        self.current_ydl: Optional[yt_dlp.YoutubeDL] = None

class DownloadManager:
    def __init__(self):
        self.queue: Optional[asyncio.Queue] = None
        self.active_tasks: Dict[str, DownloadTask] = {}
        self.websocket_subscribers: Set[Any] = set()
        self.worker_task: Optional[asyncio.Task] = None
        self.max_concurrent = int(get_setting("max_concurrent_downloads", "2") or 2)
        self.semaphore: Optional[asyncio.Semaphore] = None
        self.running = False

    def _ensure_async_objects(self):
        if self.queue is None:
            self.queue = asyncio.Queue()
        if self.semaphore is None:
            self.semaphore = asyncio.Semaphore(self.max_concurrent)

    async def start(self):
        self._ensure_async_objects()
        self.running = True
        self.worker_task = asyncio.create_task(self._queue_worker())
        logger.info("Download Manager worker initialized.")

    async def stop(self):
        self.running = False
        if self.worker_task:
            self.worker_task.cancel()

    def register_ws(self, ws: Any):
        self.websocket_subscribers.add(ws)

    def unregister_ws(self, ws: Any):
        self.websocket_subscribers.discard(ws)

    async def broadcast_ws(self, event_type: str, data: Dict[str, Any]):
        message = {"type": event_type, "payload": data}
        dead_sockets = set()
        for ws in self.websocket_subscribers:
            try:
                await ws.send_json(message)
            except Exception:
                dead_sockets.add(ws)
        for ws in dead_sockets:
            self.websocket_subscribers.discard(ws)

    async def enqueue_download(self, request_data: Dict[str, Any]) -> str:
        download_id = str(uuid.uuid4())[:8]
        url = request_data["url"]
        
        # Check duplicate
        existing = get_downloads_list()
        for item in existing:
            if item["url"] == url and item["status"] in ["completed", "downloading", "queued"] and not request_data.get("force_duplicate", False):
                # Return existing id or raise
                if item["status"] == "completed" and item["file_path"] and os.path.exists(item["file_path"]):
                    raise ValueError(f"This video has already been downloaded: '{item.get('title')}'. Check the Media Library.")

        tv_profile = request_data.get("tv_profile", "universal")

        initial_record = {
            "id": download_id,
            "url": url,
            "title": request_data.get("title") or "Preparing download...",
            "channel": request_data.get("channel") or "YouTube",
            "duration": request_data.get("duration", 0),
            "thumbnail_url": request_data.get("thumbnail_url"),
            "resolution": request_data.get("resolution", "1080p"),
            "fps": request_data.get("fps", 30),
            "container": request_data.get("container", "mp4"),
            "video_codec": request_data.get("custom_video_codec") or "H.264",
            "audio_codec": request_data.get("custom_audio_codec") or "AAC",
            "file_size": 0,
            "file_path": None,
            "status": "queued",
            "progress": 0.0,
            "speed": 0.0,
            "eta": 0,
            "error_message": None,
            "tv_profile": tv_profile,
            "tv_compatible": True if tv_profile in ["universal", "high_quality"] else False,
            "created_at": datetime.now().isoformat()
        }
        save_download(initial_record)

        task = DownloadTask(download_id, request_data)
        self.active_tasks[download_id] = task
        self._ensure_async_objects()
        await self.queue.put(task)

        await self.broadcast_ws("download_queued", initial_record)
        return download_id

    async def pause_download(self, download_id: str) -> bool:
        if download_id in self.active_tasks:
            task = self.active_tasks[download_id]
            task.is_paused = True
            update_download_status(download_id, "paused")
            await self.broadcast_ws("download_paused", {"id": download_id, "status": "paused"})
            return True
        return False

    async def resume_download(self, download_id: str) -> bool:
        item = get_download(download_id)
        if not item or item["status"] != "paused":
            return False
        
        # Re-queue
        task = DownloadTask(download_id, {
            "url": item["url"],
            "title": item["title"],
            "resolution": item["resolution"],
            "container": item["container"],
            "tv_profile": item["tv_profile"]
        })
        self.active_tasks[download_id] = task
        update_download_status(download_id, "queued")
        await self.queue.put(task)
        await self.broadcast_ws("download_queued", {"id": download_id, "status": "queued"})
        return True

    async def cancel_download(self, download_id: str) -> bool:
        if download_id in self.active_tasks:
            task = self.active_tasks[download_id]
            task.is_cancelled = True
        update_download_status(download_id, "cancelled", error_message="Cancelled by user.")
        await self.broadcast_ws("download_cancelled", {"id": download_id, "status": "cancelled"})
        return True

    async def retry_download(self, download_id: str) -> bool:
        item = get_download(download_id)
        if not item:
            return False
        
        task = DownloadTask(download_id, {
            "url": item["url"],
            "title": item["title"],
            "resolution": item["resolution"],
            "container": item["container"],
            "tv_profile": item["tv_profile"],
            "thumbnail_url": item["thumbnail_url"],
            "channel": item["channel"],
            "duration": item["duration"]
        })
        self.active_tasks[download_id] = task
        update_download_status(download_id, "queued", error_message=None)
        await self.queue.put(task)
        await self.broadcast_ws("download_queued", {"id": download_id, "status": "queued"})
        return True

    async def _queue_worker(self):
        while self.running:
            task = await self.queue.get()
            # Concurrency limit
            asyncio.create_task(self._process_task_with_semaphore(task))
            self.queue.task_done()

    async def _process_task_with_semaphore(self, task: DownloadTask):
        async with self.semaphore:
            await self._execute_download(task)

    async def _execute_download(self, task: DownloadTask):
        download_id = task.download_id
        req = task.request_data
        # Capture the main loop here: progress hooks run in worker threads,
        # where asyncio.get_event_loop() raises "no current event loop".
        main_loop = asyncio.get_running_loop()
        url = req["url"]
        
        # Check if already cancelled
        if task.is_cancelled:
            return

        download_dir = get_setting("download_dir") or str(Path.cwd() / "downloads")
        temp_dir = get_setting("temp_dir") or str(Path.cwd() / "temp_downloads")
        os.makedirs(download_dir, exist_ok=True)
        os.makedirs(temp_dir, exist_ok=True)

        ffmpeg_bin = get_ffmpeg_binary()
        ffmpeg_dir = str(Path(ffmpeg_bin).parent) if os.path.isabs(ffmpeg_bin) else None

        update_download_status(download_id, "downloading")
        await self.broadcast_ws("download_status", {"id": download_id, "status": "downloading"})

        audio_only = req.get("audio_only", False)
        target_container = req.get("container", "mp4").lower()
        tv_profile = req.get("tv_profile", "universal")

        # Hook to update DB & WebSocket
        last_update_time = [0.0]
        def progress_hook(d):
            if task.is_cancelled:
                raise Exception("DOWNLOAD_CANCELLED")
            if task.is_paused:
                raise Exception("DOWNLOAD_PAUSED")

            status = d.get("status")
            if status == "downloading":
                total_bytes = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
                downloaded_bytes = d.get("downloaded_bytes") or 0
                speed = d.get("speed") or 0.0
                eta = d.get("eta") or 0

                percent = 0.0
                if total_bytes > 0:
                    percent = round((downloaded_bytes / total_bytes) * 100.0, 1)

                # Throttle socket sends to ~3 times per second
                now = time.time()
                if now - last_update_time[0] >= 0.3 or percent >= 100.0:
                    last_update_time[0] = now
                    update_download_progress(download_id, percent, speed, eta, status="downloading", file_size=total_bytes)
                    asyncio.run_coroutine_threadsafe(
                        self.broadcast_ws("download_progress", {
                            "id": download_id,
                            "progress": percent,
                            "speed": speed,
                            "eta": eta,
                            "downloaded_bytes": downloaded_bytes,
                            "total_bytes": total_bytes,
                            "status": "downloading"
                        }),
                        main_loop
                    )

        # Build yt-dlp format selector
        v_fid = req.get("video_format_id")
        a_fid = req.get("audio_format_id")
        
        if audio_only:
            format_spec = "bestaudio/best"
        elif v_fid and a_fid:
            format_spec = f"{v_fid}+{a_fid}/bestvideo+bestaudio/best"
        elif v_fid:
            format_spec = f"{v_fid}+bestaudio/bestvideo+bestaudio/best"
        else:
            res_height = req.get("height", 1080)
            format_spec = f"bestvideo[height<={res_height}]+bestaudio/best[height<={res_height}]/best"

        # Unique temp template
        temp_template = os.path.join(temp_dir, f"{download_id}_%(title).100s.%(ext)s")

        ydl_opts: Dict[str, Any] = {
            'format': format_spec,
            'outtmpl': temp_template,
            'progress_hooks': [progress_hook],
            'quiet': True,
            'no_warnings': True,
            'socket_timeout': 30,
            'nocheckcertificate': True
        }

        if ffmpeg_dir:
            ydl_opts['ffmpeg_location'] = ffmpeg_dir

        if audio_only:
            audio_fmt = req.get("audio_target_format", "mp3")
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': audio_fmt,
                'preferredquality': '192',
            }]

        try:
            # Run yt-dlp download in thread pool to not block asyncio
            loop = main_loop
            
            def run_ytdl():
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    task.current_ydl = ydl
                    return ydl.extract_info(url, download=True)

            info = await loop.run_in_executor(None, run_ytdl)
            
            raw_title = info.get("title") or req.get("title") or "video"
            safe_title = sanitize_filename(raw_title)
            final_ext = "mp3" if audio_only else target_container

            # Find downloaded temp file
            found_files = list(Path(temp_dir).glob(f"{download_id}_*"))
            if not found_files:
                raise RuntimeError("Downloaded file could not be located in temporary directory.")

            # Filter out .part or .ytdl files
            valid_files = [f for f in found_files if not f.suffix.endswith((".part", ".ytdl"))]
            if not valid_files:
                raise RuntimeError("Download incomplete: only partial chunks found.")

            source_file = str(valid_files[0])

            # Prepare final destination file path
            dest_filename = f"{safe_title}.{final_ext}"
            final_dest_path = os.path.join(download_dir, dest_filename)
            
            # Avoid overwriting distinct downloads with identical name
            counter = 1
            while os.path.exists(final_dest_path):
                dest_filename = f"{safe_title} ({counter}).{final_ext}"
                final_dest_path = os.path.join(download_dir, dest_filename)
                counter += 1

            # Check if TV optimization / conversion is requested and not audio-only
            if not audio_only and tv_profile in ["universal", "high_quality", "custom"]:
                update_download_status(download_id, "converting")
                await self.broadcast_ws("download_status", {
                    "id": download_id,
                    "status": "converting",
                    "message": "Preparing TV compatibility (H.264 / AAC / Fast-Start)..."
                })

                def conv_cb(pct, msg):
                    asyncio.run_coroutine_threadsafe(
                        self.broadcast_ws("download_progress", {
                            "id": download_id,
                            "progress": pct,
                            "speed": 0.0,
                            "eta": 0,
                            "status": "converting",
                            "message": msg
                        }),
                        main_loop
                    )

                custom_opts = {
                    "video_codec": req.get("custom_video_codec", "h264"),
                    "audio_codec": req.get("custom_audio_codec", "aac"),
                    "crf": req.get("custom_crf", 20),
                    "faststart": req.get("enable_faststart", True)
                }

                # Run conversion in executor
                await loop.run_in_executor(
                    None,
                    lambda: convert_media_file(
                        input_file=source_file,
                        output_file=final_dest_path,
                        target_profile=tv_profile,
                        custom_options=custom_opts,
                        progress_callback=conv_cb
                    )
                )

                # Clean up source temp file
                if os.path.exists(source_file):
                    os.remove(source_file)

            else:
                # Direct move
                shutil.move(source_file, final_dest_path)

            # Probe final file for verified technical info & TV compatibility score
            probe_result = probe_file(final_dest_path)
            file_size = os.path.getsize(final_dest_path)
            v_streams = probe_result.get("video_streams", [])
            a_streams = probe_result.get("audio_streams", [])

            vcodec = v_streams[0]["codec"] if v_streams else "none"
            acodec = a_streams[0]["codec"] if a_streams else "none"
            fps = int(v_streams[0].get("fps") or 30) if v_streams else 30
            height_actual = v_streams[0].get("height") or 1080 if v_streams else 0
            res_str = f"{height_actual}p" if height_actual > 0 else (req.get("resolution") or "Audio")

            # Update final record in SQLite
            completed_record = {
                "id": download_id,
                "url": url,
                "title": raw_title,
                "channel": info.get("uploader") or req.get("channel") or "YouTube",
                "duration": info.get("duration") or req.get("duration") or 0,
                "thumbnail_url": info.get("thumbnail") or req.get("thumbnail_url"),
                "resolution": res_str,
                "fps": fps,
                "container": final_ext,
                "video_codec": vcodec,
                "audio_codec": acodec,
                "file_size": file_size,
                "file_path": final_dest_path,
                "status": "completed",
                "progress": 100.0,
                "speed": 0.0,
                "eta": 0,
                "error_message": None,
                "tv_profile": tv_profile,
                "tv_compatible": probe_result.get("tv_compatibility", {}).get("is_tv_ready", True),
                "media_info_json": probe_result,
                "completed_at": datetime.now().isoformat()
            }
            save_download(completed_record)

            await self.broadcast_ws("download_completed", completed_record)
            logger.info(f"Download complete: {final_dest_path}")

        except Exception as e:
            err_msg = str(e)
            if "DOWNLOAD_CANCELLED" in err_msg:
                update_download_status(download_id, "cancelled", error_message="Download cancelled by user.")
                await self.broadcast_ws("download_cancelled", {"id": download_id, "status": "cancelled"})
            elif "DOWNLOAD_PAUSED" in err_msg:
                update_download_status(download_id, "paused")
                await self.broadcast_ws("download_paused", {"id": download_id, "status": "paused"})
            else:
                logger.error(f"Download task {download_id} error: {e}")
                update_download_status(download_id, "failed", error_message=err_msg)
                await self.broadcast_ws("download_failed", {"id": download_id, "status": "failed", "error": err_msg})
        finally:
            self.active_tasks.pop(download_id, None)
            # Clean up residual temp files for this id if cancelled or completed
            for tmp in Path(temp_dir).glob(f"{download_id}_*"):
                try:
                    if os.path.exists(tmp):
                        os.remove(tmp)
                except Exception:
                    pass

# Singleton instance
download_manager = DownloadManager()
