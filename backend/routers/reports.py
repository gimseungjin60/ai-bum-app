from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone, timedelta
from services.firestore_service import get_daily_stats, get_device
from services.stats_service import get_weekly_summary

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/daily")
async def get_daily_report(
    device_id: str = Query(..., description="디바이스 ID"),
    date: str = Query(None, description="날짜 (YYYY-MM-DD), 미입력 시 오늘"),
):
    """일간 리포트 조회"""
    if date is None:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    stats = get_daily_stats(device_id, date)
    if not stats:
        return {
            "device_id": device_id,
            "date": date,
            "total_detection_seconds": 0,
            "session_count": 0,
            "smile_count": 0,
            "mood_score": 0,
            "hourly_detection": {},
            "first_detection": None,
            "last_detection": None,
        }

    return stats


@router.get("/weekly")
async def get_weekly_report(
    device_id: str = Query(..., description="디바이스 ID"),
):
    """주간 리포트 조회 (최근 7일)"""
    summary = get_weekly_summary(device_id)
    if not summary:
        return {
            "device_id": device_id,
            "daily_stats": [],
            "avg_mood_score": 0,
            "total_smile_count": 0,
            "avg_detection_hours": 0,
            "mood_change_percent": 0,
        }

    return {"device_id": device_id, **summary}


@router.get("/summary")
async def get_home_summary(
    device_id: str = Query(..., description="디바이스 ID"),
):
    """홈화면 요약 (현재 상태 + 오늘 통계)"""
    device = get_device(device_id)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_stats = get_daily_stats(device_id, today)

    last_detection = None
    if device and device.get("last_detection"):
        ld = device["last_detection"]
        if hasattr(ld, "isoformat"):
            last_detection = ld.isoformat()
        elif hasattr(ld, "timestamp"):
            last_detection = datetime.fromtimestamp(
                ld.timestamp(), tz=timezone.utc
            ).isoformat()

    return {
        "device_id": device_id,
        "device_status": device.get("status", "offline") if device else "offline",
        "current_state": device.get("current_state", "idle") if device else "idle",
        "today_detection_seconds": today_stats.get("total_detection_seconds", 0) if today_stats else 0,
        "today_smile_count": today_stats.get("smile_count", 0) if today_stats else 0,
        "today_session_count": today_stats.get("session_count", 0) if today_stats else 0,
        "mood_score": today_stats.get("mood_score", 0) if today_stats else 0,
        "last_detection": last_detection,
    }
