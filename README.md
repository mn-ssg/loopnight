# LOOP NIGHT

Canvas 기반 게임. `index.html`을 직접 열거나 프로젝트 전체를 정적 서버에 올리면 실행됩니다.

## 소스 수정과 실행

기능별 소스는 `js/`, `css/`에 있습니다. 수정한 뒤 Node.js 20 이상에서 실행합니다. 외부 패키지 설치는 필요 없습니다.

```sh
npm run build
npm test
npm run check
```

- `build`: 소스를 정해진 순서로 결합하여 `dist/game.js`, `dist/style.css`를 생성합니다.
- `test`: 게임 상태·입력·저장·화면 크기와 빌드 연결을 검사합니다.
- `check`: 빌드 결과가 현재 소스와 일치하는지, JavaScript 문법이 유효한지 확인합니다. 파일을 수정하지 않습니다.

`dist/`는 생성 파일입니다. 직접 수정하지 않고 소스를 수정한 뒤 다시 빌드합니다. 정적 배포와 HTML 직접 열기를 유지하기 위해 생성 파일도 저장소에 포함합니다. 배포에 필요한 파일은 `index.html`, `dist/`, `images/`, `audio/`입니다.

## 기능별 파일

| 파일 | 책임 |
| --- | --- |
| `index.html` | 문서, 폰트, 게임 캔버스와 빌드 결과 연결 |
| `js/config.js` | BGM 설정, 게임 상수, 화면 크기 조정, 색상 |
| `js/assets.js` | 이미지 로드, 스프라이트 좌표, 색상 변환과 이미지 그리기 |
| `js/course.js` | 장애물·카세트 배치, 바퀴별 난이도 |
| `js/rules.js` | 안내 문구, 마모·능력·전환 연출 설정 |
| `js/state.js` | 공유 상태, 기록 저장, 공개 진단 API, 타이틀·시작·종료 |
| `js/audio.js` | Web Audio, BGM, 효과음, 신스 음악 |
| `js/input.js` | 키보드 입력과 탭 비활성화 시 일시정지 |
| `js/course-runtime.js` | 코스 검증, 장애물 순회, 드론·게이트 판정 |
| `js/player.js` | 마모 상태, 점프, 피격·가드, 낙하, 되감기 |
| `js/powers.js` | 게이지, CLIMAX 선택, 능력과 변신 상태 |
| `js/progression.js` | 수집, 바퀴 전환, 게이트 통과, 장면 기록 |
| `js/update.js` | 타이틀과 게임의 프레임별 진행·충돌 처리 |
| `js/render/drawing.js` | 도형, 영문·한글 픽셀 글자 |
| `js/render/world.js` | 배경, 고가도로 아래 도시, 낙하 연출 |
| `js/render/tape-effects.js` | 테이프 노이즈, 마모·박자 효과 |
| `js/render/gateway.js` | 게이트, 시간 균열, 워프, 루프 표시 |
| `js/render/live.js` | IDIOTAPE 공연 연출 |
| `js/render/obstacles.js` | 장애물, 네온 간판, 점프대, 차량 |
| `js/render/hero.js` | 잔상, 캐릭터, 변신 연출 |
| `js/render/hud.js` | HUD, 능력 선택 화면, 마모 안내 |
| `js/render/title.js` | 타이틀, 설명·기록 페이지 |
| `js/render/scene.js` | HUD 합성, 화면 레이어 순서, 일시정지·게임오버 화면 |
| `js/game.js` | 프레임 루프, 폰트·이미지 준비 후 실행 |
| `css/base.css` | 기본 스타일, 색상 변수, safe area |
| `css/screen.css` | 전체 화면 배치와 캔버스 표시 |
| `css/effects.css` | CRT 주사선, 비네팅, 반사 |
| `scripts/build.mjs` | 소스 순서와 빌드·일치 검사 |

## 공유 범위와 초기화 순서

게임의 기존 상태와 함수는 하나의 비공개 IIFE 범위를 공유합니다. 기능 파일들은 빌드 시 그 범위 안에서 결합되며 개별 `<script>`로 로드하지 않습니다. 순서는 `scripts/build.mjs`에 명시되어 있습니다. 입력 연결, 에셋 로드, 상태 초기화 순서와 `window.LOOPNIGHT.log/validate/clear` API를 유지합니다.

이번 분리는 원래 함수 본문과 수치, CSS 선언 순서를 그대로 옮겼습니다. 생성된 JavaScript와 CSS는 리팩터링 전 실행 파일과 바이트 단위로 동일합니다. 공유 상태를 별도 모듈 API로 바꾸는 작업은 포함하지 않습니다.

## 검증 범위

Node.js 테스트는 원래 게임 코드를 VM에서 실행해 상태 전환과 입력을 검사합니다. Canvas·이미지·오디오 브라우저 API는 테스트 대역을 사용하므로 실제 화면 픽셀이나 소리 품질 검증을 대신하지 않습니다. 테스트용 상태 접근 코드는 테스트 VM에만 주입하며 배포 파일에는 포함하지 않습니다.
