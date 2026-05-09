"""
보호자 인증 시스템
- 회원가입/로그인 (이메일+비밀번호)
- JWT 토큰 발급/검증
- Firestore users 컬렉션 사용
"""

import hashlib
import logging
import os
import time
from typing import Optional

import bcrypt
import jwt

from config import db

logger = logging.getLogger(__name__)

_raw_secret = os.getenv("JWT_SHARED_SECRET")
if not _raw_secret:
    raise RuntimeError("JWT_SHARED_SECRET 환경변수가 설정되지 않았습니다. ai-bum-app/backend/.env에 추가하세요.")
JWT_SECRET = hashlib.sha256(_raw_secret.encode()).hexdigest()
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 72


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def _create_token(user_id: str, name: str) -> str:
    payload = {
        "user_id": user_id,
        "name": name,
        "exp": int(time.time()) + JWT_EXPIRE_HOURS * 3600,
        "iat": int(time.time()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> Optional[dict]:
    if not token:
        return None
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def signup(email: str, password: str, name: str) -> dict:
    if db is None:
        logger.error("[Auth] Firestore 미연결")
        return {"success": False, "error": "인증 서버가 데이터베이스에 연결되지 않았습니다."}

    if not email or not password or not name:
        return {"success": False, "error": "이메일, 비밀번호, 이름을 모두 입력해주세요."}

    if len(password) < 4:
        return {"success": False, "error": "비밀번호는 4자 이상이어야 합니다."}

    user_id = f"user_{hashlib.md5(email.encode()).hexdigest()[:10]}"
    hashed_pw = _hash_password(password)
    user_data = {
        "user_id": user_id,
        "email": email,
        "name": name,
        "password": hashed_pw,
        "role": "보호자",
        "created_at": time.time(),
        "device_id": None,
        "family_id": None,
    }

    try:
        existing = list(db.collection("users").where("email", "==", email).limit(1).stream())
        if existing:
            return {"success": False, "error": "이미 가입된 이메일입니다."}
        db.collection("users").document(user_id).set(user_data)
    except Exception as e:
        logger.error(f"[Auth] Firestore 저장 실패: {e}")
        return {"success": False, "error": "서버 오류가 발생했습니다."}

    token = _create_token(user_id, name)
    logger.info(f"[Auth] 회원가입 완료: {email}")
    return {
        "success": True,
        "token": token,
        "user": {"user_id": user_id, "email": email, "name": name},
    }


def login(email: str, password: str) -> dict:
    if db is None:
        logger.error("[Auth] Firestore 미연결")
        return {"success": False, "error": "인증 서버가 데이터베이스에 연결되지 않았습니다."}

    if not email or not password:
        return {"success": False, "error": "이메일과 비밀번호를 입력해주세요."}

    try:
        docs = list(db.collection("users").where("email", "==", email).limit(1).stream())
        user_data = docs[0].to_dict() if docs else None
    except Exception as e:
        logger.error(f"[Auth] Firestore 조회 실패: {e}")
        return {"success": False, "error": "서버 오류가 발생했습니다."}

    if not user_data:
        return {"success": False, "error": "이메일 또는 비밀번호가 올바르지 않습니다."}

    if not _verify_password(password, user_data.get("password", "")):
        return {"success": False, "error": "이메일 또는 비밀번호가 올바르지 않습니다."}

    token = _create_token(user_data["user_id"], user_data["name"])
    logger.info(f"[Auth] 로그인 성공: {email}")
    return {
        "success": True,
        "token": token,
        "user": {
            "user_id": user_data["user_id"],
            "email": user_data["email"],
            "name": user_data["name"],
            "device_id": user_data.get("device_id"),
            "family_id": user_data.get("family_id"),
        },
    }


def get_user(user_id: str) -> Optional[dict]:
    if db is None:
        return None
    try:
        doc = db.collection("users").document(user_id).get()
        if doc.exists:
            user = doc.to_dict()
            user.pop("password", None)
            return user
    except Exception as e:
        logger.error(f"[Auth] 사용자 조회 실패: {e}")
    return None
