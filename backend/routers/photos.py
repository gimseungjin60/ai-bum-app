from fastapi import APIRouter, Query
from config import db

router = APIRouter(prefix="/api", tags=["photos"])


@router.get("/photos")
async def get_photos(
    limit: int = Query(20, description="가져올 사진 수"),
    device_id: str = Query("frame-001", description="디바이스 ID"),
):
    """최신 사진 목록 조회 (디바이스 슬라이드쇼용)"""
    docs = (
        db.collection("photos")
        .order_by("createdAt", direction="DESCENDING")
        .limit(limit)
        .stream()
    )

    photos = []
    for doc in docs:
        data = doc.to_dict()
        created_at = data.get("createdAt")
        if created_at and hasattr(created_at, "isoformat"):
            created_at_str = created_at.isoformat()
        elif created_at and hasattr(created_at, "timestamp"):
            from datetime import datetime, timezone
            created_at_str = datetime.fromtimestamp(
                created_at.timestamp(), tz=timezone.utc
            ).isoformat()
        else:
            created_at_str = None

        photos.append({
            "id": doc.id,
            "uri": data.get("uri", ""),
            "uploaderName": data.get("uploaderName", "가족"),
            "caption": data.get("caption", ""),
            "emoji": data.get("emoji", "😊"),
            "createdAt": created_at_str,
        })

    return {"photos": photos, "total": len(photos)}
