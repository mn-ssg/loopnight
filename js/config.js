  /* ================= BGM 설정: 「Too Old to Die Young」 ================= */
  // 음원 파일을 src 경로에 넣으면(LOOP NIGHT/audio/too-old-to-die-young.mp3) 다음 판부터 이 곡이 음악을 맡는다.
  // 파일이 없으면 지금처럼 게임이 직접 연주하는 신스 음악. mp3 · m4a · ogg · wav 모두 가능(확장자에 맞게 src만 바꾸면 된다)
  // bpm   : 곡의 템포. 전기 게이트 · BEAT JUMP · 박자 가이드 · 공연 연출이 모두 이 박자를 따른다
  // beat0 : 곡에서 첫 박(킥)이 울리는 시각(초). 화면 박자가 소리보다 빠르면 키우고, 늦으면 줄인다
  // drop  : 곡에서 가장 센 드롭이 터지는 시각(초). 정하면 IDIOTAPE LIVE가 시작될 때 곡을 드롭 직전으로 넘겨 화면의 드롭과 같은 순간에 터진다.
  //         null이면 곡은 그대로 흐르고, 공연의 드롭을 다음 마디 첫 박에 맞춘다
  // volume: 곡 볼륨(0~1). 효과음은 따로
  const BGM = { src:'audio/too-old-to-die-young.mp3', bpm:120, beat0:0, drop:null, volume:.8 };

  /* ================= 기본: 기준 화면 1920×1080 = 논리 해상도 480×270의 정확히 4배 ================= */
  // 높이 270은 고정. 창 비율이 16:9와 다르면 늘이지 않고 가로 시야 W를 넓히거나 줄여 화면을 꽉 채운다(16:10 ~ 21:9). 그보다 극단적인 비율에서만 남는 쪽에 여백
  // 월드는 원래 높이를 그대로 쓴다: DECK = 도로 아래 가장자리(고가도로 상판 앞면). 늘어난 VIEW_TOP만큼은 천장 쪽 시야라서 도로가 화면 아래에 맞닿는 구도는 그대로
  const BASE_W = 1920, BASE_H = 1080, H = 270, DECK = 256, VIEW_TOP = H - DECK, MIN_AR = 16 / 10, MAX_AR = 21 / 9;
  let W = BASE_W * H / BASE_H, SX = BASE_H / H, SY = BASE_H / H;
  const GROUND = 208, HX = 120, TRACK = 2600, STEP = 1000 / 60;
  const GRAV = 0.45, JUMP1 = -7.6, JUMP2 = -6.6, SPRING = -10.8, STOMP = -7.2, HPMAX = 5, GAUGE = 50, CLIMAX_T = 108;
  const SECRET_AT = 1150, SECRET_LAP = 5, SIGN_GAP = 90;
  // IDIOTAPE LIVE: 5의 배수 바퀴(5, 10, 15…)에만 벽에 IDIOTAPE 무대 그림이 걸리고, 그 그림이 화면에 들어오면 공연이 게임을 점거한다(약 6초)
  // 바퀴가 넘어가기 전에 끝나도록 LIVE_END에서 끊는다
  const liveLap = L => L % SECRET_LAP === 0;
  const LIVE_T = 360, LIVE_IN = 24, LIVE_OUT = 40, LIVE_END = 2500;
  // 낙하: 이 도로는 도시 위 고가도로(표지 그림)라서, 구멍 아래는 빈 공간이 아니라 도로 상판 → 트러스 → 도시 협곡이다
  // SLAB 상판 앞면 두께 · TRUSS under.png 위쪽 트러스 띠 높이 · FAR 협곡 원경(느리게 움직여 멀어 보임) · CAM 카메라가 따라 내려가는 최대 깊이
  const SLAB = 8, TRUSS = 78, FALL_T = 40, FALL_G = .5, FALL_VMAX = 8, CAM_MAX = 340, FAR_Y0 = 160, FAR_PX = .35, FAR_PY = .45;
  const cv = document.getElementById('game');
  let ctx = cv.getContext('2d'); // HUD를 서서히 켤 때만 잠깐 다른 캔버스로 바꿔 그린다
  // 캔버스의 실제 픽셀 = 화면에 보이는 크기 × 기기 배율 (1080p 전체 화면이면 정확히 1920×1080). CSS로 다시 늘이지 않아 픽셀이 흐려지지 않는다
  function fit() {
    const vw = innerWidth, vh = innerHeight, ar = vw / vh, a = Math.min(MAX_AR, Math.max(MIN_AR, ar));
    W = Math.round(H * a);
    const cw = a === ar ? vw : Math.min(vw, vh * a), ch = a === ar ? vh : Math.min(vh, vw / a);
    const k = Math.min(devicePixelRatio || 1, 2160 / ch);
    cv.width = Math.round(cw * k); cv.height = Math.round(ch * k);
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    SX = cv.width / W; SY = cv.height / H;
  }
  fit();
  addEventListener('resize', fit);
  // 표지·뒷면과 같은 색
  const C = {
    teal:'#19d3c5', glow:'#2fe0d0', deep:'#0e7c7b', white:'#ffffff', paper:'#ece8de', ink:'#111111', night:'#06111a',
    gray:'#8a8a8a', mist:'#8fa6b0', red:'#e53935', yellow:'#ffd23f', pink:'#ff5d8f', out:'#24495a'
  };
  const FEVER = [C.pink, C.yellow, C.teal];
  const F_PIX = 'Silkscreen, monospace', F_NUM = '"Press Start 2P", monospace';
