
  /* ================= 화면 글자 ================= */
  const K = {
    t1:'점프', d1:'길게 누르면 높이, 공중에서 한 번 더',
    t2:'낮은 간판', d2:'간판 아래선 짧게 톡 눌러 낮게 점프',
    t3:'드론 밟기', d3:'위에서 밟으면 부서지고 다시 튀어 오른다',
    t4:'뒤에서 오는 차', d4:'! 표시가 뜨면 차가 지날 때 공중에',
    t5:'전기 게이트', d5:'박자에 맞춰 꺼지는 순간 통과',
    t6:'되감기', d6:'잔상 없이 부딪히면 2초 전으로 되감긴다',
    t7:'CLIMAX', d7:'게이지가 차면 방향키로 ←돌파 ↑정화 →가속',
    pu:'마모 한 단계 제거 · 잠시 마모 면역 · 잔상 복구', br:'짧은 무적 돌진 · 연속으로 부술수록 점수 · 2단 점프 불가', od:'가속 · 높은 점프 · 3단 점프 · 잔상이 장애물을 부순다',
    t8:'잔상', d8:'지난 루프의 나. 대신 맞고, 같이 넘으면 SYNC',
    tw:'바퀴마다 테이프가 닳고(동시에 최대 3개), 대신 새 기능이 생긴다',
    w1:'화면에 약한 CRT 노이즈', a1:'지난 루프의 내가 따라온다',
    w2:'박자 밖 점프는 낮아진다', a2:'박자에 뛰면 더 높이',
    w3:'신호가 끊겨 장애물이 윤곽만 남는다', a3:'잔상이 앞서 달려 길을 보여준다',
    deck:'능력 지속시간 · 게이지 충전이 늘었다', hc:'헤드를 닦았다',
    w4:'화면이 찢어지고 장애물이 겹친다', a4:'공중에서 3번째 누르면 빨리감기',
    pause:'스페이스바를 누르면 계속'
  };

  // 테이프 마모: 마모(▼)와 그걸 이겨낼 데크 기능(▲)이 짝으로 들어온다. 어느 바퀴에 무엇이 걸리는지는 LOOPS 표의 debuffs가 정한다
  // 데크 기능은 2~5바퀴에 하나씩 생겨 계속 남는다(마모를 걷어내도)
  const TAPE = [null,
    { bad:'NOISE', badK:K.w1, good:'ECHO', goodK:K.a1 },
    { bad:'WOW', badK:K.w2, good:'BEAT JUMP', goodK:K.a2 },
    { bad:'DROPOUT', badK:K.w3, good:'ECHO LEAD', goodK:K.a3 },
    { bad:'TANGLE', badK:K.w4, good:'FF DASH', goodK:K.a4 }];
  const BAD_K = {}; for (const t of TAPE) if (t) BAD_K[t.bad] = t.badK;
  // CLIMAX 선택: 게이지가 차면 세계가 느려지고 방향키로 하나를 고른다
  // ← BREAK 공격·돌파: 짧게(CLIMAX_T) 무적으로 부수며 지나간다. 대신 몸이 무거워 2단 점프·FF DASH가 막히고, 끝나면 HEAT_T 동안 과열(게이지 안 참 · 2단 점프 불가)
  // ↑ PURIFY 생존·정화: 지금 걸린 가장 센 마모를 걷어내고(이번 바퀴 동안 · 다음 바퀴에 다시 한 칸 닳는다. 마모가 없으면 다음 바퀴 마모를 미리 봉인),
  //                     CLEAN 동안 모든 마모 면역 · 잃은 잔상 하나 복구 · SYNC 판정이 넓어지고 게이지가 계속 찬다
  //                     마모가 많을수록 CLEAN이 길어져서 후반일수록 값어치가 오른다. 단 CLEAN 중에도 게이지가 차므로, PURIFY만 연달아 골라
  //                     마모 면역이 끊기지 않는 일이 없게 CLEAN은 한 바퀴의 절반쯤만 덮는다(CLEAN_T + CLEAN_PER × 마모, 바퀴 표의 power 배율)
  // → OVERDRIVE 속도·숙련: 무적 없이 빠르고 높이 뛴다(3단 점프). 넘은 장애물은 바짝 붙은 잔상들이 부수고(ECHO STRIKE), 그동안 번 게이지는 끝날 때 1.5배로 돌려받는다
  // 안 고르면 PICK_T 뒤 선택 없이 게이지가 PICK_KEEP만큼 남는다 — 흐름은 멈추지 않고, 어느 쪽도 기본값이 되지 않게
  const POWERS = { up:{ name:'PURIFY', col:C.white, k:K.pu }, left:{ name:'BREAK', col:C.pink, k:K.br }, right:{ name:'OVERDRIVE', col:C.yellow, k:K.od } };
  const PICK_T = 100, PICK_SLOW = .3, PICK_KEEP = .6, DRIVE_T = 300, HEAT_T = 60, CLEAN_T = 150, CLEAN_PER = 30;
  const BREAK_JUMP = .92, OD_JUMP = 1.1, OD_SPEED = 1.4, OD_BANK = 1.5;
  // 변신 연출: 입력 → XF_STOP 동안 Hit Stop(세계 정지, 실루엣이 하얗게) → 4프레임째 변신 → XF_IN까지 화면 반응(줌 · RGB 분리 · 플래시 · 베이스) → 능력 실행
  // 끝나기 XF_OUT 전부터 네온이 아래부터 꺼지고 잔상이 몸으로 모이며, 끝나는 순간 테이프 띠가 끊겨 날아간다(XF_SNAP)
  const XCOL = { left:C.pink, up:C.white, right:C.yellow }, XACC = { left:C.red, up:C.glow, right:C.white };
  const XF_STOP = 8, XF_IN = 22, XF_OUT = 24, XF_SNAP = 20;
  // Loop Gateway (TAPE RIFT): 천장 릴과 바닥 릴 사이에 세로로 감긴 자기 테이프, 그 사이가 찢어진 시간 균열 — 균열 안에선 이번 바퀴의 실제 장면이 거꾸로 흐른다
  // GATE_AP 접근 1·2·3단계 거리(px) · WARP_T 통과 연출(바퀴가 쌓일수록 WARP_PER씩 길어져 최대 1초) · OSD_T 루프 번호 표시(처음 OSD_BIG 동안 가운데 크게)
  // SNAP_EVERY 프레임마다 화면을 녹화해 SNAP_MAX장까지 남긴다 (균열 · 되감기 필름 · 과거 장면 깜빡임)
  const GATE_TOP = 26, GATE_BOT = 186, REEL_R = 20, RIFT_W = 18;
  // 타이틀: 실제 게임 세계가 플레이 속도로 흐르는 화면 위에 로고와 PRESS ANY KEY만. 카메라를 TITLE_CAM만큼 내려 고가도로 아래 도시까지 보인다
  // 출발선 앞 구간엔 게이트가 GATE_GAP마다 똑같이 다시 지나가서, 세계 자체가 반복된다는 걸 말없이 보여준다
  // IDLE_T 동안 입력이 없으면 설명·기록 페이지(INFO_T씩 4장)를 같은 배경 위에 보여주고 돌아온다
  // 시작(ENTER_T, 약 1초): 로고가 사라지고 → 카메라가 플레이 위치로 올라오며 → 주인공이 달려 들어와(ENTER_CTRL부터 조작) → HUD가 켜진다
  // LOGO_W 로고 폭(논리 px, 예전 픽셀 로고와 같은 폭) · WORD_H words.png 글자 높이(논리 px)
  const TITLE_CAM = 150, GATE_GAP = 720, IDLE_T = 1200, INFO_T = 360, ENTER_T = 56, ENTER_CTRL = 34, LOGO_W = 214, LOGO_GLOW = .2, WORD_H = 26;
  const GATE_AP = [600, 300, 120], WARP_T = 45, WARP_PER = 4, OSD_T = 150, OSD_BIG = 72, SNAP_EVERY = 20, SNAP_MAX = 36;
  // 깨진 CRT 자막으로 새어 나오는 시스템 메시지 (LOOP_은 지금 바퀴 번호가 붙는다)
  const GLITCH = ['REWIND', 'TIME ERROR', 'AGAIN', '00:00:00', '<<', 'TRACKING', 'ERR 0x0F', 'LOOP_'], GLITCH_HIT = ['REWIND', '<<', '-00:00:01:36', 'ERR'];
