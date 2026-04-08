import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

# Firebase Admin SDK 초기화
# 서비스 계정 키 JSON 파일 경로를 환경변수로 설정
# FIREBASE_CREDENTIALS=./serviceAccountKey.json
FIREBASE_CREDENTIALS = os.getenv("FIREBASE_CREDENTIALS", "./serviceAccountKey.json")

# Firebase 초기화 (중복 방지)
if not firebase_admin._apps:
    if os.path.exists(FIREBASE_CREDENTIALS):
        cred = credentials.Certificate(FIREBASE_CREDENTIALS)
        firebase_admin.initialize_app(cred)
    else:
        # 서비스 계정 키가 없으면 기본 자격증명 사용 (GCP 환경)
        firebase_admin.initialize_app()

db = firestore.client()

# 상수
DEVICE_HEARTBEAT_TIMEOUT = 300  # 5분 동안 하트비트 없으면 오프라인
EMERGENCY_THRESHOLD_HOURS = 24  # 24시간 미감지 시 긴급 알림
WARNING_DETECTION_RATIO = 0.6   # 7일 평균 대비 60% 미만이면 주의 알림
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:8081",
    "http://localhost:19006",
]
