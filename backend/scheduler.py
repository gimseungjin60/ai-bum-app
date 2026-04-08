from apscheduler.schedulers.asyncio import AsyncIOScheduler
from services.notification_service import check_emergency_alerts, check_warning_alerts
from services.stats_service import aggregate_daily_stats
from services.firestore_service import get_all_online_devices
from datetime import datetime, timezone


scheduler = AsyncIOScheduler(timezone="Asia/Seoul")


def run_emergency_check():
    """30분마다: 24시간 미감지 체크"""
    try:
        check_emergency_alerts()
        print(f"[스케줄러] 긴급 알림 체크 완료 - {datetime.now()}")
    except Exception as e:
        print(f"[스케줄러] 긴급 알림 체크 실패: {e}")


def run_warning_check():
    """매일 22:00: 감지 빈도 감소 체크"""
    try:
        check_warning_alerts()
        print(f"[스케줄러] 주의 알림 체크 완료 - {datetime.now()}")
    except Exception as e:
        print(f"[스케줄러] 주의 알림 체크 실패: {e}")


def run_daily_aggregation():
    """매일 23:55: 일간 통계 집계"""
    try:
        devices = get_all_online_devices()
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        for device in devices:
            device_id = device.get("device_id", device.get("id"))
            aggregate_daily_stats(device_id, today)

        print(f"[스케줄러] 일간 통계 집계 완료 - {today}")
    except Exception as e:
        print(f"[스케줄러] 일간 통계 집계 실패: {e}")


def start_scheduler():
    """스케줄러 시작"""
    # 30분마다: 긴급 알림 체크
    scheduler.add_job(run_emergency_check, "interval", minutes=30, id="emergency_check")

    # 매일 22:00: 주의 알림 체크
    scheduler.add_job(run_warning_check, "cron", hour=22, minute=0, id="warning_check")

    # 매일 23:55: 일간 통계 집계
    scheduler.add_job(run_daily_aggregation, "cron", hour=23, minute=55, id="daily_aggregation")

    scheduler.start()
    print("[스케줄러] 시작됨 - 긴급(30분), 주의(22:00), 통계(23:55)")


def stop_scheduler():
    """스케줄러 중지"""
    if scheduler.running:
        scheduler.shutdown()
        print("[스케줄러] 중지됨")
