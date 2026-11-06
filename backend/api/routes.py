"""
FastAPI Routes for Personal Video Downloader & TV Media Manager.
"""
import os
import shutil
import subprocess
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any, Optional

from backend.models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    DownloadRequest,
    DownloadItem,
    SettingsModel,
    ConvertRequest
)
from backend.services.analyzer import extract_video_info
from backend.downloader.download_manager import download_manager
from backend.database.db import (
    get_download,
    get_downloads_list,
    get_all_settings,
    set_setting,
    delete_download_record,
    update_download_status,
    save_download
)
from backend.media.ffmpeg_manager import (
    check_ffmpeg_health,
    probe_file,
    convert_media_file
)
from backend.utils.sanitizer import is_safe_path

router = APIRouter(prefix="/api")

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_url(req: AnalyzeRequest):
    try:
        data = extract_video_info(req.url)
        return data
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

@router.get("/downloads", response_model=List[Dict[str, Any]])
async def list_downloads(status: Optional[str] = None):
    items = get_downloads_list(status_filter=status)
    return items

@router.get("/downloads/{download_id}")
async def get_single_download(download_id: str):
    item = get_download(download_id)
    if not item:
        raise HTTPException(status_code=404, detail="Download record not found")
    return item

@router.post("/downloads")
async def start_download(req: DownloadRequest):
    try:
        download_id = await download_manager.enqueue_download(req.dict())
        return {"id": download_id, "status": "queued", "message": "Download task queued successfully"}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue download: {str(e)}")

@router.post("/downloads/{download_id}/pause")
async def pause_download_item(download_id: str):
    success = await download_manager.pause_download(download_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot pause this download task.")
    return {"status": "paused", "id": download_id}

@router.post("/downloads/{download_id}/resume")
async def resume_download_item(download_id: str):
    success = await download_manager.resume_download(download_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot resume this download task.")
    return {"status": "resumed", "id": download_id}

@router.post("/downloads/{download_id}/cancel")
async def cancel_download_item(download_id: str):
    success = await download_manager.cancel_download(download_id)
    return {"status": "cancelled", "id": download_id}

@router.post("/downloads/{download_id}/retry")
async def retry_download_item(download_id: str):
    success = await download_manager.retry_download(download_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found to retry.")
    return {"status": "queued", "id": download_id}

@router.delete("/downloads/{download_id}")
async def delete_download_item(download_id: str, delete_file: bool = Query(False)):
    item = get_download(download_id)
    if not item:
        raise HTTPException(status_code=404, detail="Download record not found")

    file_path = item.get("file_path")
    if delete_file and file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Could not delete file from disk: {e}")

    delete_download_record(download_id)
    await download_manager.broadcast_ws("download_deleted", {"id": download_id})
    return {"status": "deleted", "id": download_id}

@router.post("/downloads/{download_id}/open-folder")
async def open_containing_folder(download_id: str):
    item = get_download(download_id)
    if not item:
        raise HTTPException(status_code=404, detail="Download record not found")

    file_path = item.get("file_path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Target file does not exist on disk.")

    try:
        # Windows explorer select
        norm_path = os.path.normpath(file_path)
        subprocess.Popen(f'explorer.exe /select,"{norm_path}"')
        return {"status": "opened", "file_path": norm_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to open explorer: {e}")

@router.post("/downloads/{download_id}/play")
async def play_video_locally(download_id: str):
    item = get_download(download_id)
    if not item:
        raise HTTPException(status_code=404, detail="Download record not found")

    file_path = item.get("file_path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Video file not found on disk.")

    try:
        # Launch with default Windows media player
        os.startfile(os.path.normpath(file_path))
        return {"status": "playing", "file_path": file_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to play file: {e}")

@router.get("/downloads/{download_id}/mediainfo")
async def get_download_mediainfo(download_id: str):
    item = get_download(download_id)
    if not item:
        raise HTTPException(status_code=404, detail="Download record not found")

    file_path = item.get("file_path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Media file does not exist on disk.")

    info = probe_file(file_path)
    return info

@router.post("/downloads/{download_id}/convert")
async def convert_existing_download(download_id: str, req: ConvertRequest):
    item = get_download(download_id)
    if not item:
        raise HTTPException(status_code=404, detail="Download record not found")

    src_path = item.get("file_path")
    if not src_path or not os.path.exists(src_path):
        raise HTTPException(status_code=404, detail="Source file does not exist on disk.")

    p = Path(src_path)
    out_dir = p.parent
    new_ext = req.target_container.lower()
    base_name = p.stem.replace("_tv_ready", "")
    new_filename = f"{base_name}_tv_ready.{new_ext}"
    out_path = os.path.join(out_dir, new_filename)

    update_download_status(download_id, "converting")
    await download_manager.broadcast_ws("download_status", {
        "id": download_id,
        "status": "converting",
        "message": f"Converting to {req.target_tv_profile}..."
    })

    try:
        def conv_cb(pct, msg):
            pass # can broadcast if needed

        success = convert_media_file(
            input_file=src_path,
            output_file=out_path,
            target_profile=req.target_tv_profile,
            custom_options={"crf": req.custom_crf or 20},
            progress_callback=conv_cb
        )

        new_probe = probe_file(out_path)
        item["file_path"] = out_path
        item["container"] = new_ext
        item["status"] = "completed"
        item["tv_profile"] = req.target_tv_profile
        item["tv_compatible"] = new_probe.get("tv_compatibility", {}).get("is_tv_ready", True)
        item["media_info_json"] = new_probe
        item["file_size"] = os.path.getsize(out_path)
        save_download(item)

        await download_manager.broadcast_ws("download_completed", item)
        return {"status": "completed", "file_path": out_path, "tv_compatible": item["tv_compatible"]}
    except Exception as e:
        update_download_status(download_id, "failed", error_message=str(e))
        raise HTTPException(status_code=500, detail=f"Conversion error: {e}")

@router.get("/settings")
async def get_settings_endpoint():
    settings = get_all_settings()
    return settings

@router.put("/settings")
async def update_settings_endpoint(settings_update: Dict[str, Any]):
    for key, val in settings_update.items():
        set_setting(key, str(val))
    
    if "max_concurrent_downloads" in settings_update:
        try:
            download_manager.max_concurrent = int(settings_update["max_concurrent_downloads"])
            download_manager.semaphore = asyncio.Semaphore(download_manager.max_concurrent)
        except Exception:
            pass

    return get_all_settings()

@router.get("/system/diagnostics")
async def get_system_diagnostics():
    ffmpeg_info = check_ffmpeg_health()
    download_dir = get_all_settings().get("download_dir", str(Path.cwd() / "downloads"))
    
    # Disk usage
    total_space = 0
    free_space = 0
    used_space = 0
    pct_used = 0.0

    try:
        target_path = download_dir if os.path.exists(download_dir) else "."
        usage = shutil.disk_usage(target_path)
        total_space = usage.total
        free_space = usage.free
        used_space = usage.used
        pct_used = round((used_space / total_space) * 100.0, 1) if total_space > 0 else 0.0
    except Exception:
        pass

    import yt_dlp
    ytdl_version = yt_dlp.version.__version__

    return {
        "ffmpeg": ffmpeg_info,
        "ytdl_version": ytdl_version,
        "download_dir": download_dir,
        "storage": {
            "total_bytes": total_space,
            "free_bytes": free_space,
            "used_bytes": used_space,
            "used_percentage": pct_used
        }
    }
