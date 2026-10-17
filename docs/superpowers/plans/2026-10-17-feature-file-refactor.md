# Feature File Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 기능과 동작을 그대로 유지하면서 기능별 소스 파일로 분리한다.

**Architecture:** 원래 IIFE 내부 코드를 기능 경계에서 나누고, Node.js 표준 라이브러리만 사용하는 빌드로 동일한 IIFE를 생성한다. CSS도 원래 순서대로 결합한다. 완성된 `dist/`를 포함하여 HTML 직접 열기와 정적 호스팅을 유지한다.

**Tech Stack:** Vanilla JavaScript, Canvas 2D, CSS, Node.js 내장 테스트 러너.

**Spec:** 사용자 요청: “현재 기능은 그대로 유지하면서 기존 단일 HTML/JS/CSS 구조를 기능별 파일로 리팩터링해라. 동작 변경은 하지 마라.”

## Global Constraints

- 게임 수치, 입력, 렌더링, 오디오, 저장 키와 공개 `LOOPNIGHT` API를 유지한다.
- 함수 본문, 초기화 순서, IIFE의 공유 범위, CSS 선언 순서를 유지한다.
- 런타임 패키지나 외부 빌드 의존성을 추가하지 않는다.
- `index.html`의 DOM과 이미지·음원 상대 경로를 유지한다.

## Review Focus

- 로컬 파일에서의 오디오 fallback과 정적 배포: 기존 코드와 빌드 결과의 바이트 동등성을 확인한다.
- 초기화 전에 입력이 연결되는 순서: 원본 순서를 유지하고 상태 전환을 검사한다.
- 점프와 방향키 능력 선택: 입력 이벤트로 상태 변화를 검사한다.
- 탭 비활성화와 재개, 저장 데이터: 테스트용 환경에서 동작을 검사한다.
- 화면 비율과 CSS 우선순위: 리사이즈 검사와 CSS 원본 비교를 수행한다.

### Task 1: 기준 동작과 빌드 계약 검증

**Files:** `tests/game.test.mjs`, `tests/helpers/game-runtime.mjs`, `tests/build.test.mjs`

- [x] 원본 파일을 임시 위치에 보존하고 기존 동작 테스트를 실행한다.
- [x] 기능별 파일에서 원래 실행 파일을 생성하는 빌드 계약 테스트를 작성하고, 빌드가 없어 실패하는지 확인한다.

### Task 2: 기능별 파일 분리

**Files:** `js/config.js`, `js/assets.js`, `js/course.js`, `js/rules.js`, `js/state.js`, `js/audio.js`, `js/input.js`, `js/course-runtime.js`, `js/player.js`, `js/powers.js`, `js/progression.js`, `js/update.js`, `js/render/*.js`, `js/game.js`, `css/base.css`, `css/screen.css`, `css/effects.css`, `scripts/build.mjs`, `package.json`, `index.html`, `dist/*`

- [x] 완전한 선언/함수 경계에서만 추출하고 순서를 빌드 목록에 명시한다.
- [x] `js/game.js`는 실행 루프와 에셋/폰트 준비 처리만 남긴다.
- [x] 원래 HTML에서 스크립트와 스타일 참조만 `dist/`로 변경한다.
- [x] 빌드된 JS/CSS가 원본과 바이트 단위로 같은지 확인한다.

### Task 3: 검증과 사용 안내

**Files:** `README.md`, 위 테스트 및 빌드 결과

- [x] `npm test`, `npm run build`, `npm run check`를 통과한다.
- [x] 파일별 책임과 수정 후 빌드 방법을 README에 기록한다.
- [x] 최종 diff와 누락 파일·에셋 경로를 검토한다.

## Execution notes

- 사용자가 현재 작업 폴더의 리팩터링을 요청했으므로 이 폴더에서 변경하고 커밋/배포는 수행하지 않는다.
- 기존 동작 보존은 characterization tests와 바이트 비교로 검증하며 게임 기능을 새로 구현하지 않는다.
- 브라우저 도구의 `file://` 접근은 URL 보안 정책으로 거부되었다. 해당 제한을 우회하지 않고 로컬 코드 검증을 수행한다.
- 기준 동작 테스트 11개는 원본에서 먼저 통과했다. 빌드 연결 테스트 2개는 분리 전 실패하고 구현 후 통과했다.
- 테스트 대역에 빠진 Canvas 이미지 데이터 API를 보완했다. 원본 게임 로직의 실패가 아니며 게임 코드는 변경하지 않았다.
- 분리 후 전체 13개 테스트, 빌드, 생성물 일치 검사와 `git diff --check`가 통과했다.
- 원본과 생성물의 SHA-256: JS `2f1e3680275841229e52c58dfc9ee238aae705c35140695ad2edab7928248724`, CSS `48691fcf7b5702534b104db3e63e09e8bcabe2375561b00ad91f3fa9642af217`.
- HTML은 스크립트·스타일 경로 두 곳만 바뀌었다. 이미지·음원 상대 경로 15개가 존재하며 배포 파일에 테스트용 접근 코드가 없음을 확인했다.
- 독립 코드 검토에서 수정 필요 사항이 발견되지 않았다. 검토자가 Git HEAD 원본과 생성물의 해시 일치 및 테스트 13개·빌드 검사를 재확인했다.
