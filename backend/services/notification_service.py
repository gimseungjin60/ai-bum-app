from datetime import datetime, timezone, timedelta
from services.firestore_service import (
    get_all_online_devices,
    create_notification,
    has_recent_emergency,
    get_daily_stats,
)
from config import EMERGENCY_THRESHOLD_HOURS, WARNING_DETECTION_RATIO


def check_emergency_alerts():
    """24시간 미감지 디바이스 체크 → 긴급 알림 생성"""
    devices = get_all_online_devices()
    now = datetime.now(timezone.utc)

    for device in devices:
        last_detection = device.get("last_detection")
        if last_detection is None:
            continue

        # Firestore Timestamp → datetime 변환
        if hasattr(last_detection, "timestamp"):
            last_dt = datetime.fromtimestamp(last_detection.timestamp(), tz=timezone.utc)
        else:
            last_dt = last_detection

        elapsed = now - last_dt
        if elapsed >= timedelta(hours=EMERGENCY_THRESHOLD_HOURS):
            device_id = device.get("device_id", device.get("id"))

            # 중복 방지: 최근 24시간 내 이미 긴급 알림이 있으면 스킵
            if has_recent_emergency(device_id, hours=EMERGENCY_THRESHOLD_HOURS):
                continue

            create_notification(
                device_id=device_id,
                notif_type="emergency",
                title="24시간 얼굴 미감지",
                body=f"24시간 동안 어르신의 얼굴이 감지되지 않았습니다. 신속한 확인이 필요합니다.",
            )


def check_warning_alerts():
    """오늘 감지량이 7일 평균의 60% 미만이면 주의 알림"""
    devices = get_all_online_devices()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    for device in devices:
        device_id = device.get("device_id", device.get("id"))

        # 오늘 통계 가져오기
        today_stats = get_daily_stats(device_id, today)
        if not today_stats:
            continue

        today_seconds = today_stats.get("total_detection_seconds", 0)

        # 지난 7일 평균 계산
        total_past = 0
        count = 0
        for i in range(1, 8):
            date_str = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
            past_stats = get_daily_stats(device_id, date_str)
            if past_stats:
                total_past += past_stats.get("total_detection_seconds", 0)
                count += 1

        if count == 0:
            continue

        avg_seconds = total_past / count

        if avg_seconds > 0 and today_seconds < avg_seconds * WARNING_DETECTION_RATIO:
            decrease_pct = round((1 - today_seconds / avg_seconds) * 100)
            create_notification(
                device_id=device_id,
                notif_type="warning",
                title="얼굴 감지 빈도 감소",
                body=f"평소보다 얼굴 감지 횟수가 {decrease_pct}% 줄었습니다. 안부를 여쭈어보는 건 어떨까요?",
            )
