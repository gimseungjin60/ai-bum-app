from datetime import datetime, timezone
from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from config import db


# === Detection Events ===

def create_detection_event(device_id: str, event_type: str, **kwargs):
    """감지 이벤트를 Firestore에 저장"""
    doc_data = {
        "device_id": device_id,
        "type": event_type,
        "timestamp": SERVER_TIMESTAMP,
    }
    if event_type == "session_end":
        doc_data["duration_seconds"] = kwargs.get("duration_seconds", 0)
        doc_data["smile_count"] = kwargs.get("smile_count", 0)

    ref = db.collection("detection_events").add(doc_data)
    return ref[1].id


# === Devices ===

def update_device_heartbeat(device_id: str, current_state: str):
    """디바이스 하트비트 업데이트"""
    doc_ref = db.collection("devices").document(device_id)
    doc_ref.set({
        "device_id": device_id,
        "status": "online",
        "current_state": current_state,
        "last_heartbeat": SERVER_TIMESTAMP,
    }, merge=True)


def update_device_detection(device_id: str):
    """마지막 얼굴 감지 시각 업데이트"""
    doc_ref = db.collection("devices").document(device_id)
    doc_ref.set({
        "last_detection": SERVER_TIMESTAMP,
    }, merge=True)


def get_device(device_id: str):
    """디바이스 정보 조회"""
    doc = db.collection("devices").document(device_id).get()
    if doc.exists:
        return doc.to_dict()
    return None


def get_all_online_devices():
    """온라인 디바이스 목록 조회"""
    docs = db.collection("devices").where("status", "==", "online").stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]


# === Daily Stats ===

def get_daily_stats(device_id: str, date_str: str):
    """일간 통계 조회"""
    doc_id = f"{device_id}_{date_str}"
    doc = db.collection("daily_stats").document(doc_id).get()
    if doc.exists:
        return doc.to_dict()
    return None


def upsert_daily_stats(device_id: str, date_str: str, stats: dict):
    """일간 통계 생성/업데이트"""
    doc_id = f"{device_id}_{date_str}"
    doc_ref = db.collection("daily_stats").document(doc_id)
    doc_ref.set({
        "device_id": device_id,
        "date": date_str,
        **stats,
    }, merge=True)


def get_weekly_stats(device_id: str, dates: list[str]):
    """주간 통계 조회 (날짜 리스트)"""
    results = []
    for date_str in dates:
        stat = get_daily_stats(device_id, date_str)
        if stat:
            results.append(stat)
    return results


# === Detection Events 조회 (집계용) ===

def get_events_for_date(device_id: str, date_str: str):
    """특정 날짜의 감지 이벤트 조회"""
    start = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    end = datetime(start.year, start.month, start.day, 23, 59, 59, tzinfo=timezone.utc)

    docs = (
        db.collection("detection_events")
        .where("device_id", "==", device_id)
        .where("timestamp", ">=", start)
        .where("timestamp", "<=", end)
        .order_by("timestamp")
        .stream()
    )
    return [doc.to_dict() | {"id": doc.id} for doc in docs]


# === Notifications ===

def create_notification(device_id: str, notif_type: str, title: str, body: str):
    """알림 생성"""
    db.collection("notifications").add({
        "device_id": device_id,
        "type": notif_type,
        "title": title,
        "body": body,
        "read": False,
        "createdAt": SERVER_TIMESTAMP,
    })


def has_recent_emergency(device_id: str, hours: int = 24):
    """최근 N시간 내 긴급 알림이 이미 있는지 확인 (중복 방지)"""
    cutoff = datetime.now(timezone.utc).replace(
        hour=datetime.now(timezone.utc).hour - hours if datetime.now(timezone.utc).hour >= hours else 0
    )
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    docs = (
        db.collection("notifications")
        .where("device_id", "==", device_id)
        .where("type", "==", "emergency")
        .where("createdAt", ">=", cutoff)
        .limit(1)
        .stream()
    )
    return any(True for _ in docs)
