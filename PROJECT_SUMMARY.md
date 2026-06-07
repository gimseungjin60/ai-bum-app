# AI-bum 프로젝트 정리

> 캡스톤 디자인 / 시연 2026-05-11
> AI 손주 페르소나 액자 + 보호자 앱

## 저장소 구조

| 위치 | 역할 |
|---|---|
| `D:\ai-bum-app` | 보호자 앱 (React Native / Expo) |
| `D:\senior-smile-project` | 시니어 디바이스 (React 프론트 + Python FastAPI 백엔드) |

두 앱은 **Firebase Firestore + 시니어 백엔드 REST API**로 양방향 통신.

## 하드웨어

- **시니어**: 라즈베리파이5 + 갤럭시 탭 (탭이 마이크/오디오/디스플레이 역할)
- **보호자**: 스마트폰 (Expo / iOS·Android)

## 시스템 흐름

```
[시니어 디바이스]                    [Firebase]                      [보호자 앱]
   카메라/마이크  ──>  voice_agent  ──>  Firestore  ──>  실시간 상태/푸시  ──>  스마트폰
   라즈베리5            (Python)          sessions                              (RN+Expo)
   갤럭시탭                              medication_logs
                                         events / photos
```

## 핵심 기능

### 시니어 디바이스
- 7살 손주 페르소나 대화 (OpenAI GPT-4o-mini + Whisper STT + TTS)
- 호출어 "앨범아" + 14종 발음 변형 (앨버마/앨봄아/앰범아 등)
- 얼굴 감지 시에만 마이크 활성 (프라이버시)
- 복약 음성 인식 → 시간대 매칭(±2h)으로 자동 처방 매핑
- TV/광고/노래 가사 오인식 방지 시스템 프롬프트
- 부정문 회피 ("약 안 먹었어" 잘못된 복용 처리 방지)
- 응급 키워드 20종 감지 → 보호자 푸시
- 사진/음성 메시지 양방향 + 정시 복약·일정 알림 스케줄러

### 보호자 앱
- 6자리 코드 페어링 + **다중 시니어 페어링(N:M)** + 활성 시니어 전환
- 홈: 시니어 실시간 상태 (대화중/대기/응급)
- 복약 캘린더: 시간대별 표시, 잔량 추적, 미복용 경고
- 일정 캘린더: 7일 그리드, 일정 추가 후 해당 날짜 자동 이동
- 일간/주간 리포트 (감정 점수, 방문 횟수, 대화 요약)
- 사진 큐레이션, 음성 메시지, Expo 푸시

## 기술 스택

- **백엔드**: Python FastAPI, OpenAI API (Whisper/GPT-4o-mini/TTS), MediaPipe, Firebase Admin
- **보호자 앱**: React Native + Expo, Firebase Auth, AsyncStorage, Expo Push
- **시니어 프론트**: React (디바이스 화면, 자막 표시)
- **데이터**: Firebase Firestore (실시간), 로컬 medications.json
- **인증**: JWT + Firebase

## 차별점

1. **정서 케어 중심** — 모니터링이 아닌 따뜻한 동반자
2. **노인 음성 특화** — 발음/방언/부정문까지 인식 데이터 강화
3. **TV·광고 오인식 방지** — 시스템 프롬프트로 잘못된 발화 자동 무시
4. **다대다 페어링** — 한 보호자가 여러 시니어, 한 시니어를 여러 가족이
5. **시간대 자동 매칭** — 어르신은 "약 먹었어" 한 마디만 — 약 이름 안 물어봄

## 최근 작업 흐름

### 2026-05-09
- 보호자: 복약 캘린더 / 잔량 / 일정 / 사진 큐레이션 / 웹 폰 프레임 추가
- 시니어: 시간대 매칭 / 잔량 차감 / 정시 알림 / 리포트 감정 분류

### 2026-05-10
- 보호자: 캘린더 보강 (오늘 셀 강조 / 일정 추가 자동 이동 / 범례)
- 시니어: `fix/voice-recognition` 머지 — 음성 임계값 1500→300 + 시스템 프롬프트 대폭 강화
- 시니어: voice_agent 인식 데이터 91줄 보강 (발음/방언/부정문 회피)
- 양쪽: **다대다(N:M) 인프라 구축**
  - 시니어 `pairing.py`: `users.pairings[]` 배열 추가
  - 보호자 `AuthContext`: 다중 페어링 + activeSeniorId
  - 보호자 `api.js`: X-Device-Id 헤더 자동 첨부
  - 보호자 `SeniorManagerScreen` 신규 + Settings 진입

## 머지 결정 요약

| 브런치 | 결과 | 사유 |
|---|---|---|
| 시니어 `fix/voice-recognition` | 머지 완료 | 시연 안정성 핵심, 충돌 없음 |
| 시니어 `origin/main` (cf1016f, FER+) | 보류 | `main.py`·`voice_agent.py` 충돌, 시연 안정성 위험 |
| 시니어 `feature/reactivity-report-and-security` | 보류 | `main.py` 933줄 변경 — 시연 직전 위험 |
| 보호자 `feature/auth-and-ui-redesign` | 보류 | 회원가입/로그인 도입이 시연 동선 변경 |

## 시연 시나리오

1. 어르신이 액자 앞에 앉음 → 얼굴 감지 → 인사
2. "앨범아" 호출 → 대화 활성화 → 자유 대화
3. "약 먹었어" → 시간대 자동 매칭 → 보호자 앱 캘린더에 즉시 표시
4. 보호자가 사진 전송 → 디바이스에서 "사진 왔어요!" 알림
5. 보호자 앱에서 캘린더/리포트/다대다 시니어 관리 화면 시연

## 시연 전 필수 액션

1. 라즈베리에서 `cd backend && pip install -r requirements.txt` (python-multipart 신규)
2. 보호자 앱으로 약 1~2개 등록 — medications.json 자동 생성, 시연 시간 ±2시간 내 슬롯
3. 음성 발화 통일: "앨범아" → "약 먹었어" (부정문 회피)
4. 갤럭시 탭 마이크 환경에서 ambient noise 2초 측정 동작 확인

## 향후 로드맵 (시연 후)

- 치매 예방 게임 / 스트레칭 콘텐츠
- 무기력 감지 → 모션 미러링 게임 (MediaPipe Pose, 신체+심리 동시 자극)
- 보류된 브런치 정식 머지 (FER+ 감정, reactivity-report-and-security, auth-and-ui-redesign)
- 클라우드 정식 호스팅 (Railway/Render/Fly.io 또는 Firebase Functions)
- 다대다 정식 활성화 (시니어 백엔드의 X-Device-Id 라우팅, WebSocket 분리)
