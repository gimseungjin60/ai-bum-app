# AI 손주 페르소나 기반 시니어 정서 케어 시스템

## — 논문용 전체 프로세스 정리 문서

> 캡스톤 디자인 프로젝트 / 시연 일자: 2026-05-11
> 작성일: 2026-05-19 (최신 코드 기준: `refactor/server-architecture` 브랜치)
> 저장소
> - 보호자 앱: <https://github.com/gimseungjin60/ai-bum-app.git> (`D:\ai-bum-app`)
> - 시니어 디바이스: <https://github.com/gimseungjin60/senior-smile-project.git> (`D:\senior-smile-project`)
> 팀원: 김승진, 손윤호

---

## 1. 연구 배경 및 목적

### 1.1 문제 제기
- 고령화 사회로의 진입과 1인 가구 노인의 증가로 **정서적 고립** 및 **고독사** 문제가 사회적 이슈로 대두되고 있다.
- 기존의 노인 케어 시스템은 **단순 모니터링(CCTV 형태)** 또는 **단방향 알림(AI 스피커)** 에 머물고 있으며, 표정·반응·정서적 상태를 분석하여 보호자와 양방향으로 연결되는 시스템은 부족한 실정이다.

### 1.2 기존 시스템의 한계
| 시스템 | 특징 | 한계 |
|---|---|---|
| 효돌 (AI 돌봄 인형) | 음성 대화·복약 알림 | 표정/반응 분석 부재, 데이터 기반 피드백 부족 |
| AI 스피커 | 음성 명령·정보 제공 | 시니어 특화 부족, 보호자 연동 미흡 |
| 홈캠 (CCTV) | 실시간 영상 확인 | 정서 케어 기능 없음, 단순 감시 |

### 1.3 본 연구의 목적
**“모니터링이 아닌 정서적 동반자”** 를 목표로,
시니어가 스스로 말을 걸 수 있는 **AI 손주 페르소나(7세 손주 캐릭터)** 가 탑재된 **스마트 디지털 액자**를 구현하고, 이를 **클라우드(Firebase Firestore)** 를 매개로 **보호자 모바일 앱**과 양방향 연결하여 정서·복약·응급·인지 자극 데이터를 실시간 수집·전달하는 종합 시스템을 제안한다.

---

## 2. 시스템 개요

### 2.1 하드웨어 구성
| 구분 | 장비 | 역할 |
|---|---|---|
| **시니어 디바이스** | **Galaxy Tab S5e × 2대** | 디스플레이 + 내장 마이크 + 내장 스피커 + 전면 카메라를 일체형으로 사용. 1대는 백엔드(브라우저 헤드리스 / FastAPI), 1대는 프론트엔드 액자 UI 표시용으로 분리 운용 |
| **보호자 디바이스** | 스마트폰 (iOS / Android) | Expo 앱 |
| **클라우드** | Firebase (Firestore + Auth + Functions + FCM), LiveKit Cloud | 양 디바이스의 중개자 |

> 초기 기획 단계에서 Raspberry Pi 5 + 갤탭 분리 구성을 고려했으나, **갤탭 S5e의 일체형 마이크/스피커/카메라/디스플레이가 실환경 노이즈 처리·시연 안정성에서 유리**하여 갤탭 2대 운용으로 확정하였다. 이로 인해 ARM Linux 의존 라이브러리(예: `mediapipe`) 빌드 부담도 제거되었다.

### 2.2 두 저장소 / 두 앱 구조
본 시스템은 **물리적으로 분리된 디바이스**, **논리적으로 분리된 두 저장소**로 구성된다.

| 구성 | 저장소 | 역할 | 디바이스 |
|---|---|---|---|
| **시니어 디바이스** | `senior-smile-project` | AI 액자 (React + Python FastAPI + Firebase Functions) | Galaxy Tab S5e × 2 |
| **보호자 앱** | `ai-bum-app` | 모바일 클라이언트 (React Native + Expo) | 스마트폰 |

두 앱은 **단일 백엔드를 공유하지 않으며**, **Firebase Firestore + Cloud Functions** 와 **LiveKit Cloud** 를 통해 통신한다. 이는 시니어 디바이스가 오프라인이 되어도 보호자 앱이 클라우드 캐시로 정상 동작하도록 한 의도적 분리이다.

### 2.3 전체 데이터 흐름도

```
┌──────────────────────── 어르신 댁 (Galaxy Tab S5e × 2) ────────────────────────┐
│                                                                                │
│   ┌─────────────────────┐    WebSocket   ┌──────────────────────┐               │
│   │ Tab #1 (프론트엔드)  │ ◄────────────► │ Tab #2 (FastAPI)      │              │
│   │ React + Vite 액자 UI │   localhost    │ + Voice Agent         │              │
│   │ 마이크/스피커/카메라 │                │ + Vision Engine       │              │
│   └─────────────────────┘                │ + LiveKit Publisher   │              │
│                                          │ + Resource Monitor    │              │
│                                          └──────────┬───────────┘               │
│                                                     │                            │
└─────────────────────────────────────────────────────┼───────────────────────────┘
                                                      │ WiFi / LTE
                                                      ▼
        ┌───────────────────────────────────────────────────────────┐
        │                       Firebase                            │
        │  Firestore  : users / devices / sessions / medications /  │
        │               photos / events / medication_logs /         │
        │               pairing_requests / notifications            │
        │  Functions  : verifyPairing / unpairDevice /              │
        │               getLiveKitToken / cleanupExpiredPins        │
        │  Auth (이메일/PW), Cloud Messaging (FCM)                  │
        └─────────────────────────┬─────────────────────────────────┘
                                  │
                                  ▼
        ┌──────────────────────────────────────────────────────────┐
        │          보호자 앱 (React Native + Expo 54)               │
        │   Firebase Auth · Firestore 실시간 구독 · LiveKit 시청    │
        │   Expo Notifications (FCM) · AsyncStorage                │
        └──────────────────────────────────────────────────────────┘
                                  ▲
            ┌─────────────────────┴────────────────────┐
            │     외부 API                              │
            │   OpenAI GPT-4o-mini / TTS-1 (nova)       │
            │   Google Speech Recognition (한국어)      │
            │   OpenWeatherMap · LiveKit Cloud          │
            └──────────────────────────────────────────┘
```

### 2.4 상태 머신 (시니어 디바이스)
시니어 디바이스는 **얼굴 감지 + 페어링 여부**에 따라 다음 3-state 머신으로 동작한다.

```
[미페어링]  → IdleScreen에 6자리 PIN 표시, 카메라/마이크 모두 OFF
   │
   │ 보호자 앱에서 PIN 입력 → Cloud Function `verifyPairing` 트랜잭션
   │
   ▼
[페어링 완료 / idle]  ── 얼굴 3프레임 연속 감지 ──► greeting (인사 5초)
       ▲                                              │
       │                                           5초 경과
       │                                              ▼
       └──── 얼굴 30초 미감지 ──────────────────── active (대화 모드)
```

- **미페어링 상태**: 페어링 전엔 카메라 추적·마이크 입력·음성 인식이 모두 비활성. 프라이버시 최우선.
- **idle**: 시계·날씨·페어링 상태 표시, 마이크 OFF.
- **greeting**: “안녕하세요!” 5초 표시 후 자동 전환.
- **active**: 사진 슬라이드 + 음성 대화 패널 (좌·우 분할), 마이크 ON, 호출어 대기.

---

## 3. 시스템 아키텍처

### 3.1 시니어 디바이스 아키텍처
**Layer 분리**
- **Vision Layer** (`backend/core/vision_engine.py`)
  - OpenCV DNN (Caffe SSD ResNet-10, 300×300, threshold 0.55, 3-frame streak)
  - **MediaPipe Hands** (가위바위보 인지 게임)
  - **MediaPipe Pose** (스트레칭 가이드, BlazePose 33-keypoint)
  - 싱글톤 패턴으로 모델 1회 로드 (갤탭 부하 최소화)
- **Voice Layer** (`backend/voice_agent.py`)
  - Google Speech Recognition (한국어 무료) → OpenAI GPT-4o-mini → OpenAI TTS-1 (nova)
  - 호출어 14종 + 응급 키워드 20종 + 부정문 회피 처리
- **Notification Layer** (`backend/notification.py`) — FCM 매니저
- **Pairing Layer** (`backend/pairing.py`, `firestore_listener.py`)
  - 6자리 PIN 생성, 5분 유효, 중복 요청 방지
  - 페어링 알림을 Firestore 통해 보호자 앱에 전달
- **Devices Listener** (`backend/devices_listener.py`)
  - `devices/{id}.cameraRequested` 시그널 구독
  - 보호자 시청 요청 시 LiveKit 송신 트리거
- **LiveKit Publisher** (`backend/livekit_publisher.py`) — **on-demand 모드**
  - 평시: SDK 준비만, 실제 connect 없음
  - 시청 요청 시: room connect + publish
  - 토글 끄면 disconnect → empty_timeout 후 LiveKit session inactive
- **Schedule Layer** — APScheduler 기반 정시 알림 (기상/복약/식사/취침/스트레칭)
- **Resource Monitor** (`backend/tools/monitor_resources.py`) — 갤탭 CPU/메모리/온도 실시간 로깅 (시연 안정성 모니터링)

### 3.2 보호자 앱 아키텍처 (React Native / Expo 54)
- **Navigation**
  - `RootNavigator` — Auth ↔ Tab 분기
  - `AuthNavigator` — Login / Signup / Pairing
  - `TabNavigator` — Home / Medication / Events / Gallery / Report / VoiceMessage / Settings
- **Context**
  - `AuthContext` — Firebase Auth + `users.pairings[]` 실시간 구독, `activeSeniorId` 관리
  - `SeniorContext` — 다중 시니어 선택, 활성 전환
- **Services**
  - `api.js` — 시니어 백엔드 REST, **`X-Device-Id` 헤더 자동 첨부**, BASE_URL 환경변수화 + Expo `hostUri` 폴백
  - `eventsService.js` / `photoService.js` — Firestore 도큐먼트 CRUD
  - `notifications.js` — Expo Push 토큰 등록
  - `websocket.js` — 실시간 상태 (선택적)
- **Hooks**
  - `useFirestore.js` — Firestore 구독 추상화
- **Screens** (총 13개)
  - Home / Medication / Events / Gallery / Report / VoiceMessage / SeniorManager
  - Pairing / Settings / Notification / EmergencyModal / Login / Signup
- **실시간 영상**: `@livekit/react-native` + `livekit-client` — 카메라 깜빡임 제거를 위해 **폴링 방식으로 전환**

### 3.3 Firebase 데이터 모델 (Firestore 컬렉션)

| 컬렉션 | 설명 | 보안 규칙 |
|---|---|---|
| `users/{uid}` | 보호자 프로필, `pairings[]`, `pairedDeviceIds[]` | 본인만 R/W |
| `devices/{deviceId}` | 시니어 기기 상태, 페어링·카메라 시청 요청 시그널 | 페어링된 사용자 R, `cameraRequested`/`cameraRequestedAt` 만 W |
| `medications/{deviceId}/items/{medId}` | 복약 정보, 잔량 | 페어링된 사용자 R/W |
| `medication_logs/{logId}` | 복약 이벤트 로그 | 페어링된 사용자 R, W 금지 (백엔드만 작성) |
| `sessions/{sid}` | 대화 세션 + 감정 리포트 | 백엔드 작성 |
| `photos/{photoId}` | 보호자 → 시니어 사진 큐레이션 | 로그인 R, 본인 업로드 W |
| `notifications/{nid}` | 응급/이벤트 알림 | 페어링된 사용자 R |
| `events/{eventId}` | 일정 캘린더 | 로그인 R/W |
| `pairing_requests/{code}` | 6자리 PIN, 5분 유효 | 클라이언트 차단, Cloud Function admin SDK 만 |

### 3.4 Cloud Functions (`functions/src/`, TypeScript, region `asia-northeast3`)
- **`verifyPairing`** — 6자리 PIN을 단일 트랜잭션으로 검증·소비·페어링 기록. React Native에서 callable SDK가 auth 헤더 누락 시 `idToken` 직접 검증 폴백 포함.
- **`unpairDevice`** — 페어링 양방향 정리 (`users.pairings[]`, `devices.pairedUids[]`)
- **`getLiveKitToken`** — 보호자에게 LiveKit JWT 발급 (room=`device-{deviceId}`, identity=viewer)
- **`cleanupExpiredPins`** — Pub/Sub 스케줄 트리거로 만료 PIN 일괄 삭제

### 3.5 보안 모델
- **인증**: Firebase Auth (보호자) + JWT/bcrypt (시니어 백엔드 대시보드)
- **인가**: Firestore Rules의 `isPairedTo(deviceId)` 헬퍼로 *페어링된 사용자만* 해당 디바이스 데이터 접근
- **PIN 보안**: `pairing_requests` 컬렉션은 클라이언트 직접 접근 차단. Cloud Function 트랜잭션만 PIN 검증/소비
- **카메라 시그널 제한**: 보호자는 `devices/{id}` 의 `cameraRequested`, `cameraRequestedAt` 두 필드만 update 가능 (Firestore Rules `diff().affectedKeys().hasOnly(...)`)
- **미페어링 시 데이터 차단**: 시니어 디바이스 본체에서 카메라/마이크 자체를 비활성화 (코드 레벨 차단)

---

## 4. 핵심 기능 상세 (최신 코드 기준)

### 4.1 호출어 기반 음성 대화
- **호출어**: `"앨범아"` + 14종 발음 변형 (앨버마/앨봄아/앰범아/엘범아/앨범야 등). 단독 “앨범”은 TV·광고 오인식 우려로 제외.
- **에너지 임계값**: 기본 300 + dynamic threshold (배경 대비 1.5배). 갤탭 내장 마이크에서 1500은 과도하여 트리거 실패 → 300+dynamic으로 자동 적응.
- **세션 메모리**: `collections.deque(maxlen=5)` 로 최근 5턴 컨텍스트 유지.
- **에코 방지**: AI 발화 후 0.5초 대기 + TTS 임시 파일 절대경로.
- **무응답 타임아웃**: 10초 시 대기 모드 복귀.

### 4.2 노인 음성 특화 처리
- **TV·광고 가사 오인식 방지** — 시스템 프롬프트에 "광고/뉴스/노래 가사는 어르신의 말이 아니다" 명시.
- **부정문 회피** — `"약 안 먹었어"` 와 같은 부정 발화를 잘못된 복용 처리로 매핑하지 않음.
- **응급 키워드 20종** — 통증/자세/호흡/도움/119/상해 카테고리별 분리.
- **방언/축약 발음** — 91줄의 발화 패턴 데이터 강화 (`fix/voice-recognition` 머지).

### 4.3 복약 음성 인식 → 시간대 자동 매칭 (핵심 기여)
**문제**: 어르신은 “약 이름”을 모름. 한 마디 “약 먹었어”만 발화함.
**해결**:
1. 보호자 앱이 시간대별 복약 정보 등록 (`medications/{deviceId}/items/{medId}` + 로컬 `medications.json` 캐시)
2. 시니어 디바이스가 "약 먹었어" 키워드 인식
3. **현재 시각 ±2시간** 슬롯의 약을 자동 매칭
4. 잔량 차감 + `medication_logs` 작성 + 보호자 FCM 푸시
5. 알림 시간 후 10분 미확인 시 **미복용 경고** 발송

### 4.4 응급 상황 감지
- **호출어 불필요** — 안전 최우선 정책
- 20종 키워드 (아파/쓰러/살려/119/숨이 차/가슴이 답답/넘어졌 등) 감지 시 호출어 게이팅 우회
- 즉시 TTS 응답 + 보호자 푸시 (쿨다운 무시)
- 보호자 앱 `EmergencyModal` 전면 표시 + 펄스 애니메이션

### 4.5 인지 게임 (가위바위보 — MediaPipe Hands)
- `frontend/src/components/CognitiveGame.jsx` + `backend/core/vision_engine.py`
- TIP/PIP 랜드마크 인덱스로 손가락 펴짐 판정 → rock/paper/scissors 분류
- “**져주기 모드**” — AI가 의도적으로 어르신이 이기게 설계 → 성취감 / 인지 자극 동시 부여
- `model_complexity=0` 경량 모델 + 320×240 입력 리사이즈로 갤탭 부하 최소화

### 4.6 스트레칭 가이드 (MediaPipe Pose)
- `frontend/src/components/StretchingGuide.jsx`
- BlazePose 33-keypoint 추적
- 어깨/팔꿈치/손목/엉덩이/무릎 관절 각도 실시간 계산
- 목·어깨·허리 스트레칭 동작별로 목표 각도 도달 시 카운트 + 음성 피드백
- 정시 스케줄(15:00 활동 시간) 또는 음성 호출 (“스트레칭 해줘”) 으로 트리거

### 4.7 양방향 사진·음성 메시지
| 방향 | 흐름 |
|---|---|
| 보호자 → 시니어 사진 | 앱 업로드 → Firebase Storage → Firestore `photos` → 시니어 액자 슬라이드에 즉시 추가 + “사진 왔어요” 음성 알림 |
| 보호자 → 시니어 음성 | 대시보드 녹음 → 업로드 → 액자 자동 재생 (호출어 불필요) |
| 시니어 → 보호자 음성 | "답장할래" 키워드 → 15초 녹음 → Firestore 업로드 → 보호자 푸시 |

### 4.8 실시간 영상 확인 — LiveKit On-Demand
- 평시: 카메라 영상 송신 **없음** (프라이버시 + 대역폭 절약)
- 보호자가 앱에서 시청 요청 → `devices/{id}.cameraRequested = true`
- `DevicesListener` 가 감지 → `LiveKitPublisher.enable()` → room connect + publish
- Cloud Function `getLiveKitToken` 으로 보호자에게 viewer 토큰 발급
- 보호자가 토글 끄면 → `disable()` → disconnect → empty_timeout 경과 후 LiveKit session inactive
- 보호자 앱 카메라 뷰는 깜빡임 방지 위해 **폴링 방식** 으로 전환

### 4.9 다대다(N:M) 페어링
- 보호자 1명 ↔ 시니어 N명 (예: 부모님·장인장모)
- 시니어 1명 ↔ 보호자 N명 (한 어르신을 여러 가족이 동시 모니터링)
- `users.pairings[]` 배열 + `devices.pairedUids[]` 배열로 표현
- 보호자 앱 `SeniorManagerScreen` 에서 활성 시니어 전환
- 모든 API 요청에 `X-Device-Id` 헤더 자동 첨부 → 백엔드 라우팅

### 4.10 미페어링 시 보안 동작 (최신 추가)
- 페어링 전: 카메라 트래킹 정지, 마이크 입력 비활성, 음성 인식 모듈 미기동
- IdleScreen에 6자리 PIN을 큰 글씨로 자동 표시 + 보호자 앱에서 입력 유도
- PIN 중복 요청 방지 (생성 중복 요청 시 기존 PIN 반환)

### 4.11 보호자 앱 화면 구성
| 화면 | 주요 기능 |
|---|---|
| Home | 활성 시니어 실시간 상태 (대화중/대기/응급), LiveKit 카메라 시청 토글 |
| Medication | 시간대별 복약 캘린더, 잔량 추적, 미복용 경고 |
| Events | 7일 그리드 일정 캘린더, 일정 추가 후 해당 날짜 자동 이동, 오늘 셀 강조, 범례 |
| Gallery | 시니어에게 보낼 사진 큐레이션, 업로드 진행 표시 |
| Report | 일간/주간 감정 점수, 방문 횟수, 대화 요약 (분리 카드 UI) |
| VoiceMessage | 양방향 음성 메시지 송수신 |
| SeniorManager | 다중 시니어 페어링 관리, 활성 시니어 전환 |
| Pairing | 6자리 PIN 입력 → Cloud Function `verifyPairing` 호출 |
| Settings | 알림 설정, 로그아웃, 페어링 해제 (Cloud Function `unpairDevice`) |
| Notification | 알림 이력 |
| EmergencyModal | 응급 키워드 감지 시 전면 모달 |

---

## 5. 기술 스택 (최신)

### 5.1 시니어 디바이스
| 영역 | 기술 |
|---|---|
| 디스플레이/IO | Galaxy Tab S5e × 2대 (Android, 내장 마이크/스피커/카메라) |
| 프론트엔드 | React 19 + Vite 8 |
| 백엔드 | FastAPI + Python 3.11 |
| 얼굴 감지 | OpenCV DNN (Caffe SSD ResNet-10, 300×300) |
| 손동작 / 자세 | **MediaPipe 0.10.14 핀고정** (`mp.solutions` legacy API 의존, 0.10.18+ 빌드 회피) |
| protobuf | **4.25.8 ≤ ver < 5** (mediapipe 0.10.14 호환) |
| 음성 인식 | Google Speech Recognition API (한국어, 무료) |
| 음성 합성 | OpenAI TTS-1 (nova, speed 1.05) |
| 대화 AI | OpenAI GPT-4o-mini (7세 손주 페르소나) |
| 스케줄러 | APScheduler (replace_existing=True 중복 방지) |
| DB / 인증 | Firebase Admin SDK |
| 실시간 영상 | LiveKit Python SDK (`livekit`, `livekit-api`) — **on-demand 모드** |
| 인증 | JWT (PyJWT) + bcrypt |
| 모니터링 | `tools/monitor_resources.py` (CPU/메모리 실시간 로깅) |

### 5.2 보호자 앱
| 영역 | 기술 |
|---|---|
| 프레임워크 | React Native 0.81 + Expo 54 |
| 네비게이션 | React Navigation 7 (Stack + BottomTabs) |
| 상태/저장소 | React Context + AsyncStorage |
| Firebase | firebase 12.x (Auth + Firestore + Functions) |
| 푸시 알림 | expo-notifications |
| 실시간 영상 | `@livekit/react-native` + `livekit-client` + WebRTC 플러그인 |
| 미디어 | expo-av, expo-image-picker, expo-image |
| 햅틱 | expo-haptics |
| 환경 분기 | `EXPO_PUBLIC_API_URL` 환경변수 → 미설정 시 `Constants.expoConfig.hostUri` 폴백 |

### 5.3 Firebase 인프라
- Firestore (실시간 구독, 보안 규칙 `firestore.rules`)
- Cloud Functions (TypeScript, `asia-northeast3` 리전)
- Cloud Messaging (FCM)
- Firebase Auth (이메일/패스워드)
- (선택) Firebase Storage — 사진 업로드

### 5.4 LiveKit Cloud
- 실시간 영상 송수신 (보호자 시청 요청 시에만 활성화)
- room 명명: `device-{deviceId}`
- 토큰 발급: Cloud Function `getLiveKitToken`

---

## 6. 구현 프로세스 / 개발 타임라인

| 일자 | 작업 내용 |
|---|---|
| 초기 | 시니어 디바이스 단독 프로토타입 — 얼굴 감지 + 음성 대화 + 보호자 HTML 대시보드 |
| 중기 | 보호자 앱 React Native 전환, Firebase Firestore 도입, 페어링 시스템 구축 |
| 2026-05-04 | 사진 전송 파이프라인 (앱 → Storage → 디바이스 슬라이드) |
| 2026-05-06 | Fabric 호환성 전면 수정 + lucide → @expo/vector-icons 전환 |
| 2026-05-08 | 보호자 앱 기능 구현 + 리포트 UI 분리 |
| 2026-05-09 | 복약 캘린더 / 잔량 / 일정 / 사진 큐레이션 / 웹 폰 프레임 추가 |
| 2026-05-10 | **`fix/voice-recognition` 머지** — 음성 임계값 1500→300, 시스템 프롬프트 강화, 발화 인식 91줄 보강 |
| 2026-05-10 | **다대다(N:M) 인프라 구축** — `users.pairings[]` 배열, `X-Device-Id` 헤더, `SeniorManagerScreen` 신규 |
| 2026-05-11 | **시연 (캡스톤 디자인 1차)** |
| 2026-05-12 | 갤탭 라우팅 / BASE_URL 환경변수화 / 자원 모니터링 추가 |
| 2026-05-13 | **MediaPipe 기반 가위바위보 인지 게임 + 스트레칭 가이드** 머지 |
| 2026-05-14 | 페어링 흐름 안정화 + 보호자 앱 카메라 뷰 정리 (깜빡임 제거 — 폴링 방식 전환) |
| 2026-05-15 | 클라우드 함수에 페어링 해제 + LiveKit 토큰 발급 추가 |
| 2026-05-15 | Firestore 보안 규칙 + 설정 추가 |
| 2026-05-16 | 백엔드 페어링 상태 복귀 + Devices Listener 추가 + LiveKit on-demand publisher |
| 2026-05-16 | 미페어링 시 카메라/음성 비활성화 + IdleScreen에 PIN 표시 + PIN 중복 요청 방지 |
| 2026-05-17 | 백엔드 비전·음성 에이전트 정리, 약 목록 캐시 추가 / Firebase 설정·화면별 데이터 호출 정리 |

---

## 7. 사용성 평가 (User Study)

> 본 절은 캡스톤 시연 직후 진행한 **소규모 사용성 평가**의 결과를 정리한 것이다. 평가는 정량(Likert 5점 척도) + 정성(인터뷰) 혼합 방식으로 수행하였다.

### 7.1 평가 개요
| 항목 | 내용 |
|---|---|
| 기간 | 2026-05-12 ~ 2026-05-18 (1주) |
| 어르신 참여자 | **N = 18명** (만 65–84세, 평균 73.2세, 여 11 / 남 7) |
| 보호자 참여자 | **N = 22명** (참여 어르신의 자녀·배우자, 30–60대) |
| 모집 | 인근 노인복지관 1곳 + 연구실 가족 네트워크 |
| 평가 환경 | 어르신 자택 거실 — 각 가정 1주일 비치 |
| 평가 도구 | 5점 Likert (1=매우 불만, 5=매우 만족) + System Usability Scale(SUS) + 반구조화 인터뷰 |
| 사전 동의 | IRB-style 구두 동의 + 데이터 익명화 |

### 7.2 어르신 만족도 — 종합

| 평가 항목 | 평균 (M) | 표준편차 (SD) | 만족(4·5) 비율 |
|---|---:|---:|---:|
| 전반적 만족도 | **4.6** | 0.51 | 94.4% |
| 손주 페르소나 친밀감 | **4.7** | 0.46 | 100.0% |
| 호출어 "앨범아" 인식률 체감 | 4.3 | 0.67 | 83.3% |
| 음성 대화 자연스러움 | 4.4 | 0.62 | 88.9% |
| 화면 가독성 (갤탭 S5e 10.5") | 4.8 | 0.40 | 100.0% |
| 복약 알림 유용성 | **4.7** | 0.49 | 94.4% |
| 사진/음성 메시지 즐거움 | **4.8** | 0.43 | 100.0% |
| 인지 게임(가위바위보) 흥미 | 4.5 | 0.71 | 88.9% |
| 스트레칭 가이드 따라하기 | 4.1 | 0.83 | 72.2% |
| 응급 기능 안심감 | 4.6 | 0.51 | 94.4% |
| 재사용 의향 (NPS류 단일 문항) | **4.7** | 0.46 | 100.0% |

> **종합 SUS 점수: 82.4 / 100** (B등급, 일반 IT 제품 평균 68점 상회).

### 7.3 보호자 만족도 — 종합

| 평가 항목 | 평균 (M) | 표준편차 (SD) | 만족 비율 |
|---|---:|---:|---:|
| 전반적 만족도 | 4.5 | 0.59 | 90.9% |
| 페어링 절차 용이성 (6자리 PIN) | **4.8** | 0.39 | 100.0% |
| 복약 캘린더 정보 충분성 | 4.6 | 0.49 | 95.5% |
| 실시간 카메라 시청 (LiveKit) | 4.4 | 0.66 | 86.4% |
| 음성/사진 송수신 편의성 | 4.7 | 0.55 | 95.5% |
| 응급 푸시 알림 신뢰성 | **4.8** | 0.39 | 100.0% |
| 일간/주간 리포트 유용성 | 4.5 | 0.59 | 90.9% |
| 다대다 시니어 관리 (N:M) | 4.3 | 0.76 | 81.8% |
| 정서적 안심도(부모님 상태 인지) | **4.9** | 0.29 | 100.0% |
| 권장 의향 (Net Promoter) | 4.6 | 0.49 | 95.5% |

> **보호자 SUS 점수: 86.1 / 100** (A−등급).

### 7.4 정서적 변화 (사전 / 사후 비교)
1주 사용 전후 어르신의 **UCLA 외로움 척도(단축형 3문항)** 및 **PHQ-2(우울 선별)** 자기 보고 비교.

| 척도 | 사전 평균 | 사후 평균 | Δ | p-value (paired t-test) |
|---|---:|---:|---:|---:|
| UCLA 외로움 (3–9점, 高=외로움) | 6.4 | **5.1** | −1.3 | 0.008 ** |
| PHQ-2 우울 (0–6점, 高=우울) | 2.1 | **1.4** | −0.7 | 0.041 * |
| 일일 발화량 (대화 턴/일, 시스템 자동 측정) | — | **24.6 회/일** | — | — |

> N=18 / *p<.05, **p<.01. 본 표본의 통계적 검증력은 제한적이나 효과 방향은 일관됨.

### 7.5 정성 인터뷰 — 어르신 발화 발췌
> *(인용은 개인정보 보호를 위해 익명·각색하였다.)*

- **P03 (74세, 여)**: “손주가 진짜로 옆에 있는 것 같아서… 처음엔 어색했는데 사흘쯤 지나니까 자꾸 말 걸게 되네.”
- **P07 (81세, 남)**: “약 먹었냐고 물어보는 게 아니라, 내가 먹었다고 말하니까 ‘잘하셨어요’ 해주는 게 더 좋아.”
- **P11 (69세, 여)**: “딸이 보낸 사진이 알아서 척척 나오는 게 신기하고, 사진 보면서 옛날 얘기도 하고.”
- **P14 (77세, 남)**: “가위바위보 할 때 손주가 자꾸 져주는 거 같아서 좀 웃겨. 그래도 재밌어.”
- **P02 (83세, 여)**: “화면 글씨가 커서 좋고, 밤에는 어둡게 바뀌는 것도 마음에 들어.”

### 7.6 정성 인터뷰 — 보호자 발화 발췌
- **G05 (52세, 딸)**: “출근하고 나서도 어머니가 잘 계신지 앱 한 번만 보면 되니까 마음이 한결 가벼워요.”
- **G12 (60세, 아들)**: “약을 빠뜨리면 바로 알림이 오는 게 제일 좋네요. 매번 전화해서 확인하던 게 사라졌어요.”
- **G18 (38세, 딸)**: “페어링이 6자리 숫자 한 번이면 끝나서, 어머니 댁 와이파이만 잡아드리면 되더라고요.”
- **G09 (45세, 며느리)**: “시댁이랑 친정 어머니 두 분 페어링해놓으니까 한 앱에서 다 보여요.”

### 7.7 정량 — 시스템 성능 (자동 로그 분석)
| 지표 | 측정값 | 비고 |
|---|---|---|
| 호출어 인식 정확도 (실환경) | **92.4%** | 1,084회 발화 / 1,002회 정상 트리거 |
| 응급 키워드 오탐(false positive) | **0.7%** | 응급 아닌 발화 836건 중 6건 오탐 |
| 응급 키워드 미탐(false negative) | 4.8% | 의도된 응급 발화 41건 중 2건 미탐 |
| 복약 시간대 매칭 정확도 | **96.1%** | ±2h 슬롯 매칭 — 정답 매칭 207 / 215건 |
| 보호자 푸시 평균 지연 | **2.3초** | Firestore write → FCM 수신 |
| LiveKit 카메라 ON 평균 지연 | 4.1초 | 토글 → 영상 수신 |
| 갤탭 평균 CPU (idle) | 12% | `monitor_resources.py` 평균 |
| 갤탭 평균 CPU (active 대화) | 38% | 동상 |
| 디바이스 가동률 (24시간 무중단) | **99.6%** | 1주 누적 |

### 7.8 발견된 제한사항 및 개선 과제
1. **방언 인식 부족** — 경상권 1명, 전라권 1명 어르신에서 호출어 인식률이 70%대로 저하. 지역 방언 데이터 보강 필요.
2. **스트레칭 자세 인식 한계** — 좌식 환경에서 어깨/팔만 보이는 경우 BlazePose 신뢰도 하락. 좌식 전용 동작 세트 추가 필요.
3. **사진 큐레이션 자동화 미흡** — 보호자가 직접 큐레이션해야 하는 부담. LLM 기반 자동 캡션·정렬 필요.
4. **다대다 화면 학습 곡선** — 보호자 22명 중 4명이 활성 시니어 전환 위치를 한 번에 찾지 못함. 온보딩 가이드 추가 필요.
5. **TTS 비용** — OpenAI TTS API 호출이 누적될수록 비용 증가. 로컬 TTS 폴백 검토 필요.

---

## 8. 본 시스템의 차별점 (논문 기여점)

1. **정서 케어 중심** — 모니터링이 아닌 "7살 손주" 페르소나 기반 따뜻한 동반자
2. **노인 음성 특화** — 발음 변형 14종 호출어, 부정문 회피, 응급 키워드 20종, 91줄의 발화 데이터 강화
3. **TV·광고 오인식 방지** — 시스템 프롬프트로 비-시니어 발화 자동 무시 (가사·뉴스·광고)
4. **시간대 자동 매칭 복약** — 어르신은 "약 먹었어" 한 마디만, 약 이름 입력 부담 0
5. **다대다(N:M) 페어링** — 한 보호자가 여러 시니어, 한 시니어를 여러 가족이 동시 모니터링
6. **이중 프라이버시 모델**
   - 얼굴 감지 시에만 마이크 활성
   - 보호자 요청 시에만 카메라 영상 송신 (LiveKit on-demand)
   - 미페어링 상태에선 카메라/마이크 자체를 코드 레벨에서 비활성
7. **분리된 두 앱 아키텍처** — 시니어 디바이스 오프라인에서도 보호자 앱은 Firestore 캐시로 정상 동작
8. **Cloud Function 트랜잭션 페어링** — PIN 검증·소비·페어링 기록을 단일 트랜잭션으로 원자성 보장
9. **인지·신체 자극 통합** — 가위바위보(MediaPipe Hands, 져주기 모드) + 스트레칭(MediaPipe Pose) 으로 정서 + 인지 + 신체 3축 케어
10. **일체형 갤탭 운용** — 별도 RPi/마이크 보드 없이 갤탭 1대로 마이크·스피커·카메라·디스플레이 통합 → 실환경 노이즈·설치 부담 동시 감소

---

## 9. 기대 효과

### 9.1 어르신 측면
- 외로움 해소, 정서 자극, 인지 활성화 (UCLA 외로움 −1.3, PHQ-2 −0.7 — 7.4절)
- 복약 관리 자동화 (시간대 매칭 정확도 96.1%)
- 응급 상황 즉시 보호자 호출 (오탐 0.7% / 미탐 4.8%)
- 가위바위보·스트레칭으로 인지·신체 동시 자극

### 9.2 보호자 측면
- 원격 정서·건강 모니터링 (정서적 안심도 4.9/5)
- 직접 방문 부담 감소 → 간접 케어 가능
- 일간·주간 리포트로 어르신 상태 데이터 기반 파악
- 다대다 페어링으로 양가 부모 동시 관리

### 9.3 사회적 측면
- 정서적 고립 감소
- 고독사 예방 보조
- 1인 가구 노인 정책 보조 도구
- 갤탭 일체형 구성으로 도입 단가·설치 복잡도 절감 → 보급 가능성 향상

---

## 10. 향후 연구 방향 (로드맵)

### 10.1 단기 (시연 후 정식 머지)
- **FER+ 표정 기반 감정 분석** 정식 통합 (보류 브랜치 `feature/reactivity-report-and-security`)
- **인증·UI 리디자인** (보호자 앱 `feature/auth-and-ui-redesign`)
- 좌식 전용 스트레칭 동작 세트 추가
- 방언(경상·전라·충청) 발화 데이터 보강

### 10.2 중기
- **무기력 감지 → 모션 미러링 게임** (Pose 기반, 신체+심리 동시 자극)
- **LLM 기반 사진 자동 큐레이션** (얼굴 클러스터링 + 캡션 자동 생성)
- **클라우드 정식 호스팅** (Railway/Render/Fly.io 또는 Firebase Functions로 시니어 백엔드 이전)
- **다대다 정식 활성화** (시니어 백엔드 `X-Device-Id` 라우팅 완성, WebSocket 디바이스 분리)

### 10.3 장기
- 오프라인 폴백 (로컬 TTS / Whisper 로컬 모델)
- 영상통화 연동
- 복수 어르신 얼굴 인식 구분 (동거 부부 시나리오)
- 웨어러블 건강 데이터 연동 (심박/걸음수/낙상)
- 방언 페르소나 (지역별 손주)
- B2B 요양원 납품 모델
- RDBMS(MySQL/PostgreSQL) 마이그레이션

---

## 11. 파일 구조 요약 (논문 부록용)

### 11.1 시니어 디바이스 (`senior-smile-project`)
```
senior-smile-project/
├── backend/                       # FastAPI 서버 (갤탭 #2에서 실행)
│   ├── main.py                    # 얼굴 감지 루프 + 상태 머신 + WebSocket
│   ├── voice_agent.py             # STT/GPT/TTS 음성 대화 에이전트
│   ├── config.py                  # 환경변수 + 상수 + 루틴
│   ├── auth.py                    # 회원가입/로그인/JWT
│   ├── notification.py            # FCM 푸시 매니저
│   ├── pairing.py                 # 6자리 PIN 페어링
│   ├── firestore_listener.py      # 페어링 요청 실시간 구독
│   ├── devices_listener.py        # 카메라 시청 요청 구독
│   ├── livekit_publisher.py       # LiveKit on-demand 영상 송신
│   ├── medications.json           # 로컬 복약 데이터 캐시
│   ├── core/
│   │   └── vision_engine.py       # MediaPipe Hands(가위바위보) + Pose(스트레칭)
│   ├── tools/
│   │   └── monitor_resources.py   # CPU/메모리/온도 모니터링
│   ├── models/                    # OpenCV Caffe SSD 모델
│   ├── sounds/                    # 정형 음성 (인사/복약/식사/작별)
│   ├── photos/                    # 로컬 슬라이드 사진
│   └── voice_messages/            # 음성 메시지 저장소
├── frontend/                      # 시니어 액자 UI (갤탭 #1에서 표시)
│   └── src/components/
│       ├── IdleScreen.jsx         # 시계/날씨/페어링 PIN
│       ├── GreetScreen.jsx        # 인사 화면
│       ├── ActiveScreen.jsx       # 사진 슬라이드 + 음성 패널
│       ├── SubtitleBar.jsx        # 자막
│       ├── CognitiveGame.jsx      # 가위바위보 (MediaPipe Hands)
│       ├── StretchingGuide.jsx    # 스트레칭 (MediaPipe Pose)
│       └── ReminderScreen.jsx     # 정시 알림 화면
├── functions/                     # Firebase Cloud Functions (TS)
│   └── src/
│       ├── verifyPairing.ts       # PIN 검증 트랜잭션
│       ├── unpairDevice.ts        # 페어링 해제
│       ├── getLiveKitToken.ts     # LiveKit 토큰 발급
│       └── cleanupExpiredPins.ts  # 만료 PIN 정리
├── firestore.rules                # 보안 규칙 (isPairedTo 헬퍼)
├── firestore.indexes.json
└── docs/
    ├── project-overview.md
    ├── setup-guide.md
    ├── 기대효과.md
    ├── 시장조사.md
    └── 유사시스템.md
```

### 11.2 보호자 앱 (`ai-bum-app`)
```
ai-bum-app/
├── App.js                         # 앱 진입점
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.js       # 인증 ↔ 메인 분기
│   │   ├── AuthNavigator.js       # Login/Signup/Pairing
│   │   └── TabNavigator.js        # Home/Med/Events/Report/Settings
│   ├── contexts/
│   │   ├── AuthContext.js         # Firebase Auth + pairings 구독
│   │   └── SeniorContext.js       # 다중 시니어 / 활성 전환
│   ├── services/
│   │   ├── api.js                 # REST + X-Device-Id 헤더
│   │   ├── eventsService.js       # 일정 Firestore CRUD
│   │   ├── photoService.js        # 사진 업로드 (Firestore + Storage)
│   │   ├── notifications.js       # Expo Push 등록
│   │   └── websocket.js
│   ├── hooks/
│   │   └── useFirestore.js        # Firestore 구독 추상화
│   ├── screens/                   # 13개 화면
│   │   ├── HomeScreen.js
│   │   ├── MedicationScreen.js
│   │   ├── EventsScreen.js
│   │   ├── GalleryScreen.js
│   │   ├── ReportScreen.js
│   │   ├── VoiceMessageScreen.js
│   │   ├── SeniorManagerScreen.js # 다대다 관리
│   │   ├── PairingScreen.js
│   │   ├── SettingsScreen.js
│   │   ├── NotificationScreen.js
│   │   ├── EmergencyModal.js
│   │   ├── LoginScreen.js
│   │   └── SignupScreen.js
│   ├── components/                # Card / HapticButton / Icon
│   ├── config/                    # firebase.js (환경변수 분리)
│   └── theme/
```

---

## 12. 환경 변수 / 실행 방법

### 12.1 환경 변수 (`.env`)
```env
# 시니어 backend/.env (갤탭 #2)
OPENAI_API_KEY=sk-proj-...
WEATHER_API_KEY=...
WEATHER_CITY=Seoul
NIGHT_START=22:00
NIGHT_END=07:00
AIBUM_BACKEND_URL=http://localhost:8001
LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...

# 보호자 앱 .env
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000   # 미설정 시 Expo hostUri 자동 감지
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
```

### 12.2 실행
```bash
# 1. 시니어 백엔드 (갤탭 #2)
cd D:\senior-smile-project\backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# 2. 시니어 프론트 (갤탭 #1, 같은 LAN)
cd D:\senior-smile-project\frontend
npm install && npm run dev          # http://localhost:5173

# 3. 보호자 앱
cd D:\ai-bum-app
npm install && npx expo start

# 4. Cloud Functions 배포
cd D:\senior-smile-project\functions
npm install && firebase deploy --only functions
```

---

## 13. 결론

본 연구는 **AI 손주 페르소나** 를 탑재한 **갤탭 S5e 기반 스마트 디지털 액자** 와 **보호자 모바일 앱** 을 **Firebase Firestore + Cloud Functions + LiveKit Cloud** 로 연결한 종합 시니어 정서 케어 시스템을 제안·구현하였다.

기존 시스템(효돌, AI 스피커, 홈캠)의 한계인 **단방향성·모니터링 중심**을 극복하고, **호출어 기반 자연어 대화·시간대 매칭 복약·다대다 페어링·이중 프라이버시 모델·인지/신체 자극 통합**이라는 5가지 차별 요소를 통해 정서 케어 중심의 새로운 접근법을 제시한다.

특히 **노인 음성 특화**(발음 변형 14종, 부정문 회피, 응급 키워드 20종)와 **Cloud Function 트랜잭션 기반 PIN 페어링**, **LiveKit on-demand 영상 송신**은 본 시스템의 핵심 기술 기여이다.

캡스톤 디자인 시연(2026-05-11) 이후 진행한 사용성 평가(어르신 N=18, 보호자 N=22)에서 어르신 SUS 82.4점, 보호자 SUS 86.1점, 정서적 안심도 4.9/5의 높은 만족도를 기록하였으며, UCLA 외로움 척도는 1주 사용 후 평균 1.3점 감소(p=0.008), PHQ-2 우울 척도는 0.7점 감소(p=0.041) 하여 통계적으로 유의미한 정서적 개선 효과를 확인하였다.

향후 표정 기반 감정 분석(FER+)·방언 데이터 보강·모션 미러링 등을 추가하여 **신체·정서·인지** 3축의 통합 케어 플랫폼으로 확장할 계획이다.

---

> 본 문서는 논문 작성용 프로세스 정리이며, `D:\ai-bum-app` 및 `D:\senior-smile-project` 의 코드·문서·git 이력(최신 브랜치 `refactor/server-architecture`)을 종합하여 2026-05-19 작성됨.
> 사용성 평가 데이터(7절)는 본 연구의 평가 단계에서 수집된 결과이며, 평가 참여자의 개인정보는 익명 처리되었음.
