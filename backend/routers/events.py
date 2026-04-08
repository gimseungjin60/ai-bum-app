from fastapi import APIRouter, HTTPException
from schemas import EventCreate, HeartbeatCreate, EventResponse
from services.firestore_service import (
    create_detection_event,
    update_device_heartbeat,
    update_device_detection,
)

router = APIRouter(prefix="/api", tags=["events"])


@router.post("/events", response_model=EventResponse)
async def receive_event(event: EventCreate):
    """디바이스에서 감지 이벤트 수신"""
    if event.type not in ("session_start", "session_end"):
        raise HTTPException(status_code=400, detail="type은 session_start 또는 session_end만 가능")

    # Firestore에 이벤트 저장
    event_id = create_detection_event(
        device_id=event.device_id,
        event_type=event.type,
        duration_seconds=event.duration_seconds,
        smile_count=event.smile_count,
    )

    # session_start일 때 디바이스의 last_detection 업데이트
    if event.type == "session_start":
        update_device_detection(event.device_id)

    # session_end일 때도 업데이트 (세션 종료 시점)
    if event.type == "session_end":
        update_device_detection(event.device_id)

    return EventResponse(
        id=event_id,
        device_id=event.device_id,
        type=event.type,
        timestamp="",  # SERVER_TIMESTAMP는 서버에서 설정
    )


@router.post("/heartbeat")
async def receive_heartbeat(heartbeat: HeartbeatCreate):
    """디바이스 하트비트 수신 (60초마다)"""
    update_device_heartbeat(
        device_id=heartbeat.device_id,
        current_state=heartbeat.current_state,
    )
    return {"status": "ok"}
