import sys
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 모듈 경로 추가
sys.path.insert(0, os.path.dirname(__file__))

from config import CORS_ORIGINS
from routers.events import router as events_router
from routers.reports import router as reports_router
from routers.photos import router as photos_router
from scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 스케줄러 관리"""
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="AI-bum Backend",
    description="스마트 프레임 얼굴 감지 이벤트 수신 및 알림/리포트 서버",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(events_router)
app.include_router(reports_router)
app.include_router(photos_router)


@app.get("/")
async def root():
    return {
        "name": "AI-bum Backend",
        "version": "1.0.0",
        "endpoints": {
            "이벤트 수신": "POST /api/events",
            "하트비트": "POST /api/heartbeat",
            "일간 리포트": "GET /api/reports/daily?device_id=xxx",
            "주간 리포트": "GET /api/reports/weekly?device_id=xxx",
            "홈 요약": "GET /api/reports/summary?device_id=xxx",
        },
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
