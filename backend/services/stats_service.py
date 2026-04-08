from datetime import datetime, timezone, timedelta
from services.firestore_service import get_events_for_date, upsert_daily_stats, get_daily_stats


def calculate_mood_score(total_seconds: int, smile_count: int, session_count: int) -> int:
    """기분 점수 계산 (0-100)
    - 감지 시간 비율 (16시간 활동 기준): 최대 70점
    - 미소 빈도 (세션당 평균 5회 기준): 최대 30점
    """
    max_active_seconds = 16 * 3600  # 16시간
    time_score = min(total_seconds / max_active_seconds, 1.0) * 70

    smile_per_session = smile_count / max(session_count, 1)
    smile_score = min(smile_per_session / 5, 1.0) * 30

    return round(time_score + smile_score)


def aggregate_daily_stats(device_id: str, date_str: str):
    """특정 날짜의 detection_events를 집계하여 daily_stats 생성"""
    events = get_events_for_date(device_id, date_str)

    if not events:
        return None

    total_seconds = 0
    session_count = 0
    smile_count = 0
    first_detection = None
    last_detection = None
    hourly_detection = {f"{h:02d}": 0 for h in range(24)}

    for event in events:
        ts = event.get("timestamp")
        if ts is None:
            continue

        # Firestore Timestamp → datetime
        if hasattr(ts, "timestamp"):
            dt = datetime.fromtimestamp(ts.timestamp(), tz=timezone.utc)
        else:
            dt = ts

        if first_detection is None:
            first_detection = dt
        last_detection = dt

        if event.get("type") == "session_end":
            duration = event.get("duration_seconds", 0)
            total_seconds += duration
            session_count += 1
            smile_count += event.get("smile_count", 0)

            # 히트맵: 세션 종료 시간대에 duration 추가
            hour_key = f"{dt.hour:02d}"
            hourly_detection[hour_key] += duration

    mood_score = calculate_mood_score(total_seconds, smile_count, session_count)

    stats = {
        "total_detection_seconds": total_seconds,
        "session_count": session_count,
        "smile_count": smile_count,
        "mood_score": mood_score,
        "hourly_detection": hourly_detection,
        "first_detection": first_detection,
        "last_detection": last_detection,
    }

    upsert_daily_stats(device_id, date_str, stats)
    return stats


def get_weekly_summary(device_id: str):
    """주간 요약 데이터 생성"""
    today = datetime.now(timezone.utc)
    daily_list = []

    for i in range(7):
        date_str = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        stat = get_daily_stats(device_id, date_str)
        if stat:
            daily_list.append(stat)

    if not daily_list:
        return None

    avg_mood = sum(s.get("mood_score", 0) for s in daily_list) / len(daily_list)
    total_smiles = sum(s.get("smile_count", 0) for s in daily_list)
    avg_hours = sum(s.get("total_detection_seconds", 0) for s in daily_list) / len(daily_list) / 3600

    # 이번 주 vs 지난 주 mood 변화
    this_week_mood = avg_mood
    prev_list = []
    for i in range(7, 14):
        date_str = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        stat = get_daily_stats(device_id, date_str)
        if stat:
            prev_list.append(stat)

    prev_mood = sum(s.get("mood_score", 0) for s in prev_list) / len(prev_list) if prev_list else this_week_mood
    mood_change = round(this_week_mood - prev_mood, 1)

    return {
        "daily_stats": daily_list,
        "avg_mood_score": round(avg_mood, 1),
        "total_smile_count": total_smiles,
        "avg_detection_hours": round(avg_hours, 1),
        "mood_change_percent": mood_change,
    }
