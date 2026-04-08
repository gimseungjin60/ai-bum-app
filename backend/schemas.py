from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# === 요청 모델 ===

class EventCreate(BaseModel):
    device_id: str
    type: str  # "session_start" | "session_end"
    duration_seconds: Optional[int] = None  # session_end 시
    smile_count: Optional[int] = None       # session_end 시


class HeartbeatCreate(BaseModel):
    device_id: str
    current_state: str  # "idle" | "greeting" | "active"


# === 응답 모델 ===

class EventResponse(BaseModel):
    id: str
    device_id: str
    type: str
    timestamp: str


class DailyStatsResponse(BaseModel):
    device_id: str
    date: str
    total_detection_seconds: int
    session_count: int
    smile_count: int
    mood_score: int
    hourly_detection: dict
    first_detection: Optional[str] = None
    last_detection: Optional[str] = None


class WeeklyStatsResponse(BaseModel):
    device_id: str
    week_start: str
    week_end: str
    daily_stats: list[DailyStatsResponse]
    avg_mood_score: float
    total_smile_count: int
    avg_detection_hours: float
    mood_change_percent: float


class SummaryResponse(BaseModel):
    device_id: str
    device_status: str
    current_state: str
    today_detection_seconds: int
    today_smile_count: int
    today_session_count: int
    mood_score: int
    last_detection: Optional[str] = None
