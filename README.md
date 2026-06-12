# 📖 탱탱볼해금 - 프로젝트 문서 패키지

이 폴더의 5개 문서는 **IDE에 그대로 던져서 바로 개발을 시작할 수 있는 컨텍스트 패키지**입니다.

---

## 📋 문서 구성

| 파일 | 용도 | 누가 읽는가 |
|----|----|----|
| **AI_CONTEXT.md** ⭐ | AI 어시스턴트(Cursor/Claude Code)에게 던질 컨텍스트 요약 | **AI 도구 + 개발자** |
| **GAME_DESIGN.md** | 게임 컨셉, 메커니즘, 디자인 톤 정의 | 개발자, 디자이너 |
| **STAGE_DESIGN.md** 🆕 | 20개 스테이지 상세 설계, 속도 곡선, 체크포인트 | 개발자, 레벨 디자이너 |
| **TECHNICAL_SPEC.md** | 기술 스택, 폴더 구조, 핵심 구현 방식 | 개발자 |
| **DEVELOPMENT_ROADMAP.md** | 단계별 작업 순서와 체크리스트 | 프로젝트 매니저, 개발자 |

---

## 🚀 사용 방법

### 1단계: 파일 배치
모든 5개 파일을 프로젝트 루트에 복사합니다.

```bash
your-project/
├── AI_CONTEXT.md          ⭐ (필수)
├── GAME_DESIGN.md
├── STAGE_DESIGN.md        🆕
├── TECHNICAL_SPEC.md
├── DEVELOPMENT_ROADMAP.md
└── src/...
```

### 2단계: IDE 설정

#### Cursor 사용 시
1. 프로젝트 열기
2. `.cursorrules` 파일 생성 후 다음 내용 추가:
   ```
   AI_CONTEXT.md 파일을 반드시 참조하여 모든 코드를 작성해주세요.
   세부 사항이 필요하면 GAME_DESIGN.md, TECHNICAL_SPEC.md를 참고하세요.
   ```
3. Cursor Chat에서 `@AI_CONTEXT.md` 로 컨텍스트 명시

#### Claude Code (VS Code) 사용 시
1. 프로젝트 열기
2. `CLAUDE.md` 파일을 루트에 생성 (이미 있는 AI_CONTEXT.md를 복사하거나 import)
3. Claude Code가 자동으로 컨텍스트 인식

#### 일반 ChatGPT/Claude 웹 사용 시
1. 4개 파일을 모두 업로드 (또는 AI_CONTEXT.md만이라도)
2. "이 컨텍스트로 탱탱볼해금 게임 개발을 시작할게요" 라고 시작

### 3단계: 첫 명령

```
AI_CONTEXT.md를 참조해서, Phase 0 환경 셋업을 시작해주세요.
프로젝트 폴더 구조부터 만들어주세요.
```

---

## 📌 핵심 결정 사항 (한 눈 요약)

### 게임
- **이름**: 탱탱볼해금
- **장르**: 퍼즐/캐주얼 (타이밍 액션)
- **영감**: BOUND (원조 공튀기기)
- **모드**: 모바일 가로 모드
- **조작**: 화면 좌/우 반반 분할 터치
- **물리**: 공의 자동 위아래 바운싱 + 관성 기반 수동 좌우 이동

### 디자인
- **컬러**: 검정 배경 + 흰색 오브젝트 (모노크롬)
- **컨셉**: 흑백 LCD 클래식 아케이드
- **폰트**: Inter + Pretendard (세련된 모던)
- **사운드**: 고전 아날로그 효과음 (탁/팡/띵)

### 시스템
- **진행**: 스테이지 클리어형 (순차 자동 진행)
- **목숨**: 스테이지당 3개
- **MVP 스테이지 수**: **20개**
- **체크포인트**: 5스테이지 단위 (1, 6, 11, 16)
- **속도 곡선**: Stage 1 (1.00초/바운스) → Stage 20 (0.40초/바운스)

### 수익화
- **전면 광고**: 스테이지 10, 15 클리어 직후 (총 2회)
- **보상형 광고**: 게임오버 시 사용자 선택으로 부활 (목숨 +3)

### 기술
- **스택**: React 18 + TypeScript + Vite + Canvas 2D
- **SDK**: @apps-in-toss/framework 2.x
- **시작**: `npx create-ait-app tangtangball`

---

## ⏱ 예상 일정

| 단계 | 기간 |
|----|----|
| Phase 0 ~ 7 (개발 + 검수) | **2~4주** |
| 게임 등급 분류 (병행) | 1~2주 |
| **출시까지** | **약 1개월** |

---

## 🎯 다음 행동 (지금 당장)

1. ✅ 이 **5개 파일**을 프로젝트 루트에 배치
2. ✅ 게임 등급 분류 신청 시작 (시간 오래 걸림)
3. ✅ 앱인토스 콘솔 가입 + 워크스페이스 생성
4. ✅ `npx create-ait-app tangtangball` 실행
5. ✅ AI 도구에 `AI_CONTEXT.md` 참조하도록 설정
6. ✅ "Phase 0부터 시작해줘" 한 마디로 개발 시작

---

## 💡 작업 중 자주 참조할 곳

### 코드 작성 시
→ `AI_CONTEXT.md`의 "핵심 코드 스니펫" 섹션
→ `TECHNICAL_SPEC.md`의 "핵심 구현 가이드"

### 게임 메커니즘 결정 시
→ `GAME_DESIGN.md`의 "게임 메커니즘" 섹션

### 스테이지 디자인 / 난이도 조정 시 🆕
→ `STAGE_DESIGN.md` (속도 곡선, 체크포인트, 20스테이지 상세)

### 디자인 톤 의사결정 시
→ `GAME_DESIGN.md`의 "디자인 톤 & 비주얼" 섹션

### 일정 관리 시
→ `DEVELOPMENT_ROADMAP.md`의 마일스톤 & 체크리스트

### 검수 통과 확인 시
→ `GAME_DESIGN.md`의 "디자인 일관성 가이드"
→ `TECHNICAL_SPEC.md`의 "보안 & 검수 안전장치"
→ `DEVELOPMENT_ROADMAP.md`의 Phase 6 체크리스트

---

## 📚 참고: 앱인토스 공식 문서

- **공식 개발자센터**: https://developers-apps-in-toss.toss.im
- **LLM 최적화 문서 인덱스**: https://developers-apps-in-toss.toss.im/llms.txt
- **개발자 커뮤니티**: https://techchat-apps-in-toss.toss.im
- **운영 문의 (채널톡)**: https://apps-in-toss.channel.io/workflows/787658

---

> 🎮 **모든 의사결정은 완료되었습니다.**
> 이제 코드만 작성하면 됩니다. 즐거운 개발 되세요!
