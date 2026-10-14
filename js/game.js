(() => {
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
  const GRAV = 0.45, JUMP1 = -7.6, JUMP2 = -6.6, SPRING = -10.8, STOMP = -7.2, HPMAX = 5, GAUGE = 50, CLIMAX_T = 180;
  const SECRET_AT = 1150, SECRET_LAP = 5, SIGN_GAP = 90;
  // IDIOTAPE LIVE: 5의 배수 바퀴(5, 10, 15…)에만 벽에 IDIOTAPE 무대 그림이 걸리고, 그 그림이 화면에 들어오면 공연이 게임을 점거한다(약 6초)
  // 바퀴가 넘어가기 전에 끝나도록 LIVE_END에서 끊는다
  const liveLap = L => L % SECRET_LAP === 0;
  const LIVE_T = 360, LIVE_IN = 24, LIVE_OUT = 40, LIVE_END = 2500;
  // 낙하: 이 도로는 도시 위 고가도로(표지 그림)라서, 구멍 아래는 빈 공간이 아니라 도로 상판 → 트러스 → 도시 협곡이다
  // SLAB 상판 앞면 두께 · TRUSS under.png 위쪽 트러스 띠 높이 · FAR 협곡 원경(느리게 움직여 멀어 보임) · CAM 카메라가 따라 내려가는 최대 깊이
  const SLAB = 8, TRUSS = 78, FALL_T = 40, FALL_G = .5, FALL_VMAX = 8, CAM_MAX = 340, FAR_Y0 = 160, FAR_PX = .35, FAR_PY = .45;
  const cv = document.getElementById('game');
  const ctx = cv.getContext('2d');
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

  /* ================= 그림: 표지·게임 장면 이미지를 참고로 Higgsfield에서 뽑아 다듬은 것 ================= */
  const load = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(i); i.src = src; });
  const IMG = {};
  const FILES = { hero:'images/hero.png', bg:'images/bg.png', haz:'images/haz.png', hud:'images/hud.png', words:'images/words.png', ring:'images/ring.png', logo:'images/logo.png', title:'images/title.jpg', egg:'images/egg.png', under:'images/under.png', signs:'images/signs.png', keys:'images/keys.png', band:'images/band.png' };
  // under.png: bg.png·표지를 참고로 Higgsfield에서 뽑은 고가도로 아래 도시. 0~TRUSS행은 상판 밑 트러스, 그 아래는 협곡
  const assetsReady = Promise.all(Object.entries(FILES).map(([k, f]) => load(f).then(i => { IMG[k] = i; })));
  // 대기 화면 첫 장: 표지 그림(title.jpg)을 Higgsfield로 움직이게 만든 5초 무한 반복 영상. 첫·끝 프레임이 표지 그림과 같아서 정지 그림에서 자연스럽게 이어진다
  const titleVideo = Object.assign(document.createElement('video'), { src:'images/title-loop.mp4', muted:true, loop:true, playsInline:true, preload:'auto' });
  const playTitle = on => { if (on && titleVideo.paused) titleVideo.play().catch(() => {}); else if (!on && !titleVideo.paused) titleVideo.pause(); };
  const HZ = { drone:[0,0,19,16], bar:[21,0,25,22], crate:[48,0,27,38], block:[77,0,27,14], spring:[106,0,19,12], gate:[127,0,73,48], sign:[202,0,13,18], car:[217,0,52,18], broken:[271,0,18,9], cas:[291,0,16,10] };
  const HU = { portrait:[0,0,51,48], bar10:[53,0,151,22], seg:[206,0,42,14], ring0:[250,0,52,50], ring1:[304,0,51,50], arm:[357,0,48,48], bar5:[407,0,82,22] };
  const WD = { press:[0,0,123,30], ready:[125,0,114,40], go:[241,0,78,40], over:[321,0,148,40], climax:[471,0,146,46], perfect:[619,0,107,36], how:[850,0,112,30], loop:[964,0,82,36] };
  // signs.png: 위험물 스프라이트·배경·표지를 참고로 Higgsfield에서 뽑은 간판과 점프대
  // o = 네온만 꺼진 같은 그림(깜빡임용) · n = 네온 픽셀만 남긴 흰 마스크(색 번짐·반짝임을 네온에만 입히려고)
  const SG = { low64:[0,0,64,23], low64o:[65,0,64,23], low50:[130,0,50,18], low50o:[181,0,50,18], low36:[232,0,36,13], low36o:[269,0,36,13],
               jump:[306,0,48,19], jumpo:[355,0,48,19], pad:[404,0,31,8], pado:[436,0,31,8], rw:[468,0,20,75], rwo:[489,0,20,75],
               low64n:[510,0,64,23], low50n:[575,0,50,18], low36n:[626,0,36,13], jumpn:[663,0,48,19], padn:[712,0,31,8], rwn:[744,0,20,75] };
  // keys.png: Higgsfield로 뽑은 카세트 데크 버튼(↑)을 ←/→로 돌린 것. 방향마다 켜짐 · o 꺼짐 · n 네온 마스크(능력 색을 입힘)
  const KY = { up:[0,0,24,24], upo:[25,0,24,24], upn:[50,0,24,24], left:[75,0,24,24], lefto:[100,0,24,24], leftn:[125,0,24,24],
               right:[150,0,24,24], righto:[175,0,24,24], rightn:[200,0,24,24] };
  // band.png: egg.png의 IDIOTAPE를 참고로 Higgsfield에서 뽑은 연주자 홀로그램(3줄마다 주사선). 줄마다 [기본, 타격A, 타격B] 3프레임, 프레임 크기 w×h
  const BAND = { synth:{ n:3, w:87, h:120, y:0 }, drum:{ n:3, w:105, h:112, y:120 } };
  const SLOT5 = [[7,19],[21,34],[36,48],[50,62],[65,78]], SLOT9 = [[6,20],[22,36],[38,51],[53,67],[69,82],[85,98],[100,114],[116,129],[131,143]];
  const ok = i => i && i.width;
  function pix(img, m, x, y, dw, dh) { if (ok(img)) ctx.drawImage(img, m[0], m[1], m[2], m[3], Math.round(x), Math.round(y), dw || m[2], dh || m[3]); }
  function hi(img, m, x, y, s = .5) { if (ok(img)) ctx.drawImage(img, m[0], m[1], m[2], m[3], x, y, m[2] * s, m[3] * s); }
  const hz = (n, x, y) => pix(IMG.haz, HZ[n], x, y);
  // 간판 그림의 일부 줄·영역만 (r = 그림 안 [x, y, w, h])
  const sgPart = (k, r, x, y) => pix(IMG.signs, [SG[k][0] + r[0], SG[k][1] + r[1], r[2], r[3]], x + r[0], y + r[1]);
  // 그림 한 칸을 한 색으로 칠한 사본 (네온 마스크에 색을 입힐 때)
  const TCACHE = new Map();
  function tintPart(img, m, col) {
    const key = m.join() + col + img.src; if (TCACHE.has(key)) return TCACHE.get(key);
    const c = document.createElement('canvas'); c.width = m[2]; c.height = m[3];
    const g = c.getContext('2d'); g.drawImage(img, m[0], m[1], m[2], m[3], 0, 0, m[2], m[3]);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, m[2], m[3]);
    TCACHE.set(key, c); return c;
  }
  const sgTint = (k, col) => tintPart(IMG.signs, SG[k], col);
  const word = (n, cx, y, s = 1) => hi(IMG.words, WD[n], cx - WD[n][2] * s / 2, y, s);

  const CW = 37, CH = 38;
  let TINT = null;
  function makeTints() {
    const s = IMG.hero; if (!ok(s)) return;
    TINT = {};
    for (const col of [C.teal, C.pink, C.yellow, C.white]) {
      const c = document.createElement('canvas'); c.width = s.width; c.height = s.height;
      const g = c.getContext('2d'); g.drawImage(s, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
      TINT[col] = c;
    }
  }
  function heroFrame(img, f, x, y, s = 1) {
    if (!ok(img)) { R(C.white, x - 6, y - 30, 12, 30); return; }
    ctx.drawImage(img, f * CW, 0, CW, CH, Math.round(x - 18 * s), Math.round(y - CH * s), CW * s, CH * s);
  }
  const runFrame = (anim, speed) => Math.floor(anim / Math.max(2, Math.round(6 - speed * .6))) % 6;

  /* ================= 코스 ================= */
  // B 바리케이드 · W 블록 · T 상자 · P 구멍 · D 드론 · E 전기 게이트 · S 스프링 · L 낮은 간판 · C 뒤에서 오는 차 / lap 등장 바퀴, max 마지막 바퀴, m 움직이는 드론 바퀴, w 폭
  // 낮은 간판: 판 아래가 바닥에서 SIGN_GAP 높이. 톡(약 0.13초 이하) 눌러 낮게 뛰면 통과, 꾹 눌러 높게 뛰면 머리가 부딪힌다
  const OBS = [
    {p:200,t:'B'},{p:360,t:'D'},{p:500,t:'S'},{p:720,t:'P'},{p:880,t:'B'},{p:950,t:'B',lap:2},
    {p:1060,t:'D'},{p:1120,t:'D'},{p:1270,t:'T'},{p:1420,t:'E'},{p:1610,t:'P'},{p:1740,t:'D',m:3},
    {p:1880,t:'W'},{p:1915,t:'B',lap:3},{p:2020,t:'S'},{p:2080,t:'P',w:64},{p:2240,t:'E',lap:2},
    {p:2380,t:'B'},{p:2500,t:'D',lap:2},
    {p:985,t:'L',w:50,max:1},{p:1862,t:'L',w:50},{p:706,t:'L',w:64,lap:2},
    {p:620,t:'C',lap:2},{p:1320,t:'C',lap:3},{p:2120,t:'C',lap:4},{p:960,t:'C',lap:5},
    // tangle: 5바퀴부터 테이프가 엉켜 바로 뒤에 한 번 더 찍힌 복제. 진짜로 부딪히고, FF DASH로 끊을 수 있다
    {p:246,t:'B',lap:5,tangle:1},{p:1322,t:'T',lap:5,tangle:1},{p:2426,t:'B',lap:5,tangle:1}
  ];
  const SIZE = { B:[25,22], W:[27,14], T:[27,38], P:[36,0], D:[19,16], E:[73,48], S:[19,12], L:[50,0], C:[0,0] };
  const PICK = [];
  const arc = (c, peak, n = 5, gap = 15) => { const h = (n - 1) / 2; for (let i = -h; i <= h; i++) PICK.push({ p:c + i * gap, h:Math.round(peak * (1 - (i * i) / ((h + 1) * (h + 1)))) + 6 }); };
  // 카세트 줄은 공중에 떠 있어서 점프해야 먹는다 (h 24는 짧게 톡, 40은 꾹)
  const row = (s, n = 5, h = 40) => { for (let i = 0; i < n; i++) PICK.push({ p:s + i * 15, h }); };
  arc(212, 48); arc(600, 118, 7, 18); row(790); arc(892, 48); arc(1180, 84, 3);
  arc(1284, 64); row(1500); arc(1628, 48); row(1790, 5, 24); arc(2112, 104, 7, 16); arc(2392, 48); row(2440);

  /* ================= 화면 글자 ================= */
  const K = {
    t1:'점프', d1:'길게 누르면 높이, 공중에서 한 번 더',
    t2:'낮은 간판', d2:'간판 아래선 짧게 톡 눌러 낮게 점프',
    t3:'드론 밟기', d3:'위에서 밟으면 부서지고 다시 튀어 오른다',
    t4:'뒤에서 오는 차', d4:'! 표시가 뜨면 차가 지날 때 공중에',
    t5:'전기 게이트', d5:'박자에 맞춰 꺼지는 순간 통과',
    t6:'되감기', d6:'잔상 없이 부딪히면 2초 전으로 되감긴다',
    t7:'CLIMAX', d7:'게이지가 차면 방향키로 ↑정화 ←돌진 →가속',
    pu:'테이프 마모 한 단계를 걷어낸다', br:'무적 돌진, 장애물을 부순다', od:'가속 · 점수 2배 · 잔상 자동 SYNC',
    t8:'잔상', d8:'지난 루프의 나. 대신 맞고, 같이 넘으면 SYNC',
    tw:'한 바퀴마다 테이프가 닳고, 대신 새 기능이 생긴다',
    w1:'화면에 약한 CRT 노이즈', a1:'지난 루프의 내가 따라온다',
    w2:'박자 밖 점프는 낮아진다', a2:'박자에 뛰면 더 높이',
    w3:'신호가 끊겨 장애물이 흐려진다', a3:'잔상이 앞서 달려 길을 보여준다',
    w4:'화면이 찢어지고 장애물이 겹친다', a4:'공중에서 3번째 누르면 빨리감기',
    pause:'스페이스바를 누르면 계속'
  };

  // 테이프 마모: 한 바퀴마다 테이프가 한 단계 닳는다. 단계마다 디버프(▼)와 그걸 이겨낼 데크 기능(▲)이 짝으로 들어온다
  const TAPE = [null,
    { bad:'NOISE', badK:K.w1, good:'ECHO', goodK:K.a1 },
    { bad:'WOW', badK:K.w2, good:'BEAT JUMP', goodK:K.a2 },
    { bad:'DROPOUT', badK:K.w3, good:'ECHO LEAD', goodK:K.a3 },
    { bad:'TANGLE', badK:K.w4, good:'FF DASH', goodK:K.a4 }];
  // CLIMAX 선택: 게이지가 차면 세계가 느려지고 방향키로 하나를 고른다. 지금의 안전(BREAK) · 앞날의 회복(PURIFY) · 점수 욕심(OVERDRIVE)
  // 안 고르면 PICK_T 뒤 BREAK — 흐름이 멈추지 않게
  const POWERS = { up:{ name:'PURIFY', col:C.white, k:K.pu }, left:{ name:'BREAK', col:C.pink, k:K.br }, right:{ name:'OVERDRIVE', col:C.yellow, k:K.od } };
  const PICK_T = 100, PICK_SLOW = .3, DRIVE_T = 240;

  /* ================= 상태 ================= */
  let mode = 'attract', held = false, S = null, attractT = 0, attractScroll = 0;
  let best = 0, bestLoop = 1, newRecord = false;
  try { best = +localStorage.getItem('loopnight-best') || 0; bestLoop = +localStorage.getItem('loopnight-bestloop') || 1; } catch (e) {}
  const speedOf = () => Math.min(6, 3 + 0.3 * (S.lap - 1)) + (S.climax > 0 ? 0.8 : 0) + (S.drive > 0 ? 1.5 : 0);
  // 곡이 있으면 곡의 템포 고정, 없으면 신스 음악이 바퀴·CLIMAX에 따라 빨라진다
  const bpm = () => bgm.active ? BGM.bpm : (116 + Math.min(8, S ? S.lap : 1) * 5) * (S && (S.climax > 0 || S.drive > 0) ? 1.12 : 1);
  const fpb = () => 3600 / bpm();
  const score = () => Math.floor(S.total / 10) + Math.floor(S.pts);
  const newRec = () => new Float32Array(Math.ceil(TRACK / 4) + 2);

  function newGame() {
    S = { d:-220, prevD:-220, total:0, pts:0, lap:1, y:GROUND, vy:0, ground:true, jumps:0, spin:0, buf:0, queued:false, noCut:false,
          hp:HPMAX, inv:0, shake:0, flash:0, freeze:0, slow:0, banner:0, bannerWord:null, sub:'', intro:110, loopFx:0,
          rec:newRec(), ghosts:[], hist:[], past:[], rw:null, pendingRewind:false, live:0, liveLen:0, liveIn:LIVE_IN, liveDone:false, beatHit:false, anim:0, beatT:0, overT:0,
          pops:[], parts:[], debris:[], gauge:0, climax:0, combo:0, chain:0, lapHit:false, falling:0, cars:[], springT:{},
          cam:0, camV:0, trail:[], fallX:0, fallSp:0, padPh:{}, guardFx:null, echoIn:0, ff:0, ffUsed:false, tapeCard:0, beatFx:0, purged:0, pick:null, pickFx:null, drive:0, cleanFx:0,
          broken:new Set(), got:new Set(), near:new Set(), fired:new Set() };
    newRecord = false;
    setMode('play'); music.start(); muffle(20000, .05);
  }
  function setMode(m) {
    const prev = mode; mode = m;
    if (m === 'attract') { attractT = 0; music.stop(); }
    if (m === 'over') music.stop(true);
    if (m !== 'play') muffle(20000, .05);
    if (bgm.active && m === 'pause' && prev === 'play') { bgm.pos = bgmTime(); bgmHalt(); }
    if (bgm.active && m === 'play' && prev === 'pause') bgmPlay(bgm.pos);
  }
  function gameOver() {
    setMode('over'); S.overT = 0;
    if (score() > best) { best = score(); newRecord = true; }
    if (S.lap > bestLoop) bestLoop = S.lap;
    try { localStorage.setItem('loopnight-best', String(best)); localStorage.setItem('loopnight-bestloop', String(bestLoop)); } catch (e) {}
    sfx('over');
  }

  /* ================= 소리 ================= */
  let ac = null, noiseBuf = null, master = null;
  function ensureAudio() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
        const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        master = ac.createBiquadFilter(); master.type = 'lowpass'; master.frequency.value = 20000; master.connect(ac.destination);
        bgm.gain = ac.createGain(); bgm.gain.connect(master);
        bgm.an = ac.createAnalyser(); bgm.an.fftSize = 64; bgm.fq = new Uint8Array(32); bgm.gain.connect(bgm.an);
      } catch (e) { ac = null; }
    }
    if (ac && ac.state === 'suspended') ac.resume();
  }
  function tone(f1, f2, dur, type = 'square', vol = .05, at = 0) {
    if (!ac) return;
    const t = at || ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + .02);
  }
  function noise(t, vol, len = .04, freq = 7000, type = 'highpass') {
    if (!ac || !noiseBuf) return;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + len + .02);
  }
  // 모든 소리의 높은 음역을 f(Hz)까지 dur초 동안 걸러낸다 (선택 중 먹먹하게 → 고르면 확 열림)
  function muffle(f, dur) {
    if (!ac || !master) return;
    const t = ac.currentTime, q = master.frequency; q.cancelScheduledValues(t); q.setValueAtTime(q.value, t); q.exponentialRampToValueAtTime(f, t + dur);
    if (bgm.el && bgm.active) bgm.el.volume = BGM.volume * (f < 5000 ? .4 : 1); // <audio> 재생은 필터 대신 볼륨으로
  }

  /* ================= BGM 재생 ================= */
  // http(s)로 열면 Web Audio로 재생: 정확한 박자 시계 · 되감기 때 곡을 실제로 거꾸로 감기 · 필터 · 실제 스펙트럼.
  // file://로 열어 파일을 직접 읽을 수 없으면 <audio>로 재생(박자는 맞추고, 거꾸로 감기는 생략). 파일이 없으면(404) 신스 음악
  const bgm = { buf:null, rev:null, el:null, src:null, gain:null, an:null, fq:null, startAt:0, pos:0, playing:false, active:false };
  fetch(BGM.src).then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status))
    .then(b => new OfflineAudioContext(2, 1, 44100).decodeAudioData(b))
    .then(buf => {
      bgm.buf = buf;
      const rev = new AudioBuffer({ length:buf.length, numberOfChannels:buf.numberOfChannels, sampleRate:buf.sampleRate });
      for (let c = 0; c < buf.numberOfChannels; c++) rev.getChannelData(c).set(buf.getChannelData(c).slice().reverse());
      bgm.rev = rev;
    })
    .catch(e => {
      if (typeof e === 'number') return;
      const el = new Audio(); el.loop = true; el.preload = 'auto'; el.src = BGM.src;
      el.addEventListener('canplaythrough', () => { bgm.el = el; }, { once:true });
    });
  // 곡 위치 t(초)부터 재생. rev면 그 위치에서 거꾸로(rate배 빠르게) — 되감기 소리
  function bgmPlay(t, rev = false, rate = 1) {
    bgmHalt();
    if (bgm.buf && ac) {
      const s = ac.createBufferSource(), len = bgm.buf.duration;
      s.buffer = rev ? bgm.rev : bgm.buf; s.loop = true; s.playbackRate.value = rate; s.connect(bgm.gain);
      s.start(0, rev ? mod(len - t, len) : mod(t, len));
      bgm.src = s; bgm.startAt = ac.currentTime - t;
    } else if (bgm.el && !rev) { bgm.el.currentTime = mod(t, bgm.el.duration || 1); bgm.el.play().catch(() => {}); }
    bgm.playing = !rev;
  }
  function bgmHalt() { if (bgm.src) { try { bgm.src.stop(); } catch (e) {} bgm.src = null; } if (bgm.el) bgm.el.pause(); bgm.playing = false; }
  // 곡 안의 지금 위치(초). Web Audio에선 곡이 반복돼도 계속 이어지는 값이라 박자가 끊기지 않는다
  const bgmTime = () => !bgm.playing ? bgm.pos : bgm.buf ? ac.currentTime - bgm.startAt : bgm.el.currentTime;
  // 게임의 박자 시계(beatT, 프레임 단위)와 곡 위치(초)를 오간다
  const songToBeat = t => Math.max(0, (t - BGM.beat0) * 60), beatToSong = bt => bt / 60 + BGM.beat0;
  // 매 프레임: DROPOUT이면 곡이 신호 끊긴 듯 작아지고, WOW(테이프 늘어짐)면 음정이 살짝 출렁인다
  function bgmFx() {
    const v = BGM.volume * (dropOn() ? .15 : 1);
    if (bgm.gain) bgm.gain.gain.setTargetAtTime(v, ac.currentTime, .06); else if (bgm.el) bgm.el.volume = v;
    if (bgm.src) bgm.src.playbackRate.value = 1 + Math.max(0, stage() - 1) * .004 * Math.sin(ac.currentTime * 5.3);
  }
  function sfx(n, x = 0) {
    if (!ac) return;
    const now = ac.currentTime;
    if (n === 'jump') { tone(330, 660, .09); noise(now, .03, .05, 3000); }
    else if (n === 'jump2') { tone(520, 1040, .1, 'square', .045); noise(now, .04, .08, 2000); }
    else if (n === 'spring') { tone(200, 900, .25, 'square', .05); tone(400, 1800, .25, 'triangle', .03); }
    else if (n === 'stomp') { tone(600 + x * 80, 200, .1, 'square', .06); noise(now, .07, .08, 1500, 'bandpass'); }
    else if (n === 'close') { tone(1500, 2200, .07, 'triangle', .04); tone(2200, 3000, .12, 'sine', .03, now + .06); }
    else if (n === 'warn') tone(880, 880, .07, 'square', .05);
    else if (n === 'car') noise(now, .14, .5, 600, 'lowpass');
    else if (n === 'zap') noise(now, .06, .12, 4000, 'bandpass');
    else if (n === 'rewind') { tone(1200, 120, .7, 'sawtooth', .05); noise(now, .05, .7, 2500, 'bandpass'); }
    else if (n === 'play') { tone(300, 600, .08, 'square', .04); tone(600, 900, .08, 'square', .04, now + .08); }
    else if (n === 'whoosh') noise(now, .06, .35, 1200, 'bandpass');
    else if (n === 'pick') tone(880 + x * 40, 1320 + x * 40, .06, 'square', .035);
    else if (n === 'hit') { tone(160, 60, .22, 'sawtooth', .07); noise(now, .06, .15, 800, 'lowpass'); }
    else if (n === 'fall') { tone(500, 60, .55, 'triangle', .07); noise(now, .05, .6, 900, 'bandpass'); }
    else if (n === 'wire') { tone(1800, 500, .06, 'square', .025); noise(now, .04, .08, 5000, 'bandpass'); }
    else if (n === 'smash') { tone(220, 50, .15, 'sawtooth', .06); noise(now, .08, .1, 2000); }
    else if (n === 'go') [523, 784, 1047].forEach((f, i) => tone(f, f, .1, 'square', .05, now + i * .06));
    else if (n === 'lap') [523, 659, 784, 1047].forEach((f, i) => tone(f, f, .08, 'square', .045, now + i * .07));
    else if (n === 'perfect') [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, .09, 'square', .05, now + i * .06));
    else if (n === 'climax') [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f * 1.01, .08, 'square', .05, now + i * .05));
    else if (n === 'secret') [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, .1, 'triangle', .06, now + i * .09));
    else if (n === 'over') tone(392, 98, .6, 'triangle', .07);
    else if (n === 'beat') tone(1568, 1568, .05, 'square', .03);
    else if (n === 'riser') { tone(220, 1760, x || .4, 'sawtooth', .035); noise(now, .05, Math.min(.6, x || .4), 3000, 'bandpass'); }
    else if (n === 'livedrop') { tone(120, 30, .5, 'sine', .28); noise(now, .12, .6, 6000); [440, 554, 659, 880].forEach(f => tone(f, f, .3, 'square', .025)); }
    else if (n === 'pickOpen') { tone(880, 180, .35, 'sawtooth', .035); noise(now, .05, .4, 600, 'lowpass'); }
    else if (n === 'choose') { [[523, 784, 1047], [392, 587, 784], [659, 988, 1319]][x].forEach((f, i) => tone(f, f * 1.01, .35, 'square', .04, now + i * .03)); noise(now, .07, .4, 2500, 'bandpass'); }
    else if (n === 'deny') tone(140, 110, .15, 'square', .05);
    else if (n === 'ff') { tone(300, 2400, .28, 'sawtooth', .035); noise(now, .05, .3, 3000, 'bandpass'); }
    else if (n === 'drop') { noise(now, .09, .5, 4000); tone(880, 60, .3, 'square', .03); }
    else if (n === 'guard') { tone(1600, 400, .18, 'square', .045); noise(now, .08, .25, 6000); tone(330, 110, .3, 'sawtooth', .04, now + .05); }
    else if (n === 'sync') [523, 659, 784, 1047].slice(0, x + 1).forEach(f => tone(f, f, .16, 'triangle', .045));
  }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const BASS = [45,45,57,45,43,43,55,43,41,41,53,41,43,43,55,47];
  const LEAD = [69,72,76,81,76,72,69,64];
  const music = { on:false, next:0, step:0, timer:null,
    start() { ensureAudio(); if (!ac) return; this.on = true; this.next = ac.currentTime + .06; this.step = 0;
      bgm.active = !!(bgm.buf || bgm.el);
      if (bgm.active) { if (bgm.gain) { bgm.gain.gain.cancelScheduledValues(ac.currentTime); bgm.gain.gain.value = BGM.volume; } else bgm.el.volume = BGM.volume; bgmPlay(0); }
      if (!this.timer) this.timer = setInterval(() => this.tick(), 25); },
    // fade: 게임오버 땐 곡이 1.2초 동안 서서히 사라진다
    stop(fade) {
      this.on = false; if (!bgm.active) return;
      if (fade && bgm.gain) { bgm.gain.gain.setTargetAtTime(0, ac.currentTime, .35); setTimeout(() => { if (mode !== 'play') bgmHalt(); }, 1200); }
      else bgmHalt();
    },
    tick() {
      if (bgm.active) return;
      if (!ac || !this.on || mode !== 'play' || (S && S.rw)) { if (ac) this.next = ac.currentTime + .05; return; }
      const fever = S && S.climax > 0, st = 60 / bpm() / 2, wow = S ? Math.max(0, stage() - 1) * .004 : 0, lost = S && dropOn(), live = S && liveK() > .2 && S.liveLen - S.live >= S.liveIn;
      while (this.next < ac.currentTime + .12) {
        const i = this.step % 16, t = this.next;
        const fl = 1 + wow * Math.sin(t * 5.3);
        if (live) {
          const root = BASS[i & 12] + 24;
          if (i % 2 === 0) tone(160, 40, .14, 'sine', .22, t);
          else noise(t, .045, .07, 8000);
          if (i % 4 === 2) noise(t, .08, .12, 1500, 'bandpass');
          tone(mtof(BASS[i] - 12), mtof(BASS[i] - 12), st * .8, 'sawtooth', .05, t);
          tone(mtof(root + [0, 7, 12, 7][i % 4]), mtof(root + [0, 7, 12, 7][i % 4]), st * .6, 'square', .03, t);
          this.next += st; this.step++; continue;
        }
        if (lost) noise(t, .03, st, 5000);
        else tone(mtof(BASS[i]) * fl, mtof(BASS[i]) * .999 * fl, st * .9, 'triangle', .09, t);
        if (i % 4 === 0) tone(150, 45, .12, 'sine', .14, t);
        if (i % 2 === 1) noise(t, .022);
        if (i % 8 === 4) noise(t, .05, .1, 1800, 'bandpass');
        if (lost) { /* 신호가 끊긴 동안 멜로디 없음 */ }
        else if (fever) tone(mtof(LEAD[i % 8] + 12), mtof(LEAD[i % 8] + 12), st * .7, 'square', .03, t);
        else if (i % 4 === 2) tone(mtof(BASS[i] + 24), mtof(BASS[i] + 24), st * .45, 'square', .018, t);
        this.next += st; this.step++;
      }
    }
  };

  /* ================= 입력: 스페이스바 하나로 시작·점프·재개 ================= */
  function press() {
    ensureAudio(); held = true;
    if (mode === 'attract') { newGame(); return; }
    if (mode === 'over') { if (S.overT > 45) newGame(); return; }
    if (mode === 'pause') { setMode('play'); return; }
    if (!S.rw) S.queued = true;
  }
  const DIRS = { ArrowUp:'up', KeyW:'up', ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right' };
  addEventListener('keydown', e => {
    const dir = DIRS[e.code];
    if (dir) { e.preventDefault(); if (mode === 'play' && S && S.pick && !S.rw && !e.repeat) choose(dir); return; }
    if (e.code !== 'Space') return;
    e.preventDefault(); if (!e.repeat) press();
  });
  addEventListener('keyup', e => { if (e.code === 'Space') held = false; });
  document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') setMode('pause'); });

  /* ================= 진행 ================= */
  const active = (o, L) => (o.lap || 1) <= L && (!o.max || L <= o.max) && (!o.tangle || L - 1 - S.purged >= 4);
  const wOf = o => o.w || SIZE[o.t][0];
  function eachObs(fn, ahead = 20) {
    for (const off of [0, TRACK]) {
      const L = off ? S.lap + 1 : S.lap;
      for (let i = 0; i < OBS.length; i++) {
        const o = OBS[i]; if (o.t === 'C' || !active(o, L)) continue;
        const sx = Math.round(o.p + off - S.d + HX);
        if (sx < -90 || sx > W + ahead) continue;
        const key = L + ':' + i; if (S.broken.has(key)) continue;
        fn(o, sx, key, L);
      }
    }
  }
  function droneTop(o, L) {
    if (o.m && L >= o.m) return GROUND - 64 + Math.round(Math.sin((S.anim + o.p) / 14) * 10);
    return GROUND - 50 + Math.round(Math.sin(S.anim / 10) * 1.5);
  }
  const gatePhase = o => S.beatT / fpb() + o.p / 97;
  const gateOn = o => Math.floor(gatePhase(o)) % 4 < 2;
  const gateSoon = o => { const ph = gatePhase(o); return Math.floor(ph) % 4 === 3 && ph % 1 > .6; };
  // 공연 세기: 라이저 동안 0→1, 끝나기 전 1→0 · 조명 색은 마디마다 넘어간다
  const liveK = () => S && S.live > 0 ? Math.min(1, (S.liveLen - S.live) / S.liveIn, S.live / LIVE_OUT) : 0;
  const LIVE_COL = [C.pink, C.teal, C.yellow, '#8f6bff'];
  // 테이프 마모: stage = 지금 걸려 있는 디버프 단계(PURIFY로 한 단계씩 걷어낼 수 있다), wearMax = 얻은 능력 단계(걷어내도 유지)
  const stage = () => Math.max(0, Math.min(4, S.lap - 1 - S.purged));
  const wearMax = () => Math.min(4, S.lap - 1);
  const onBeat = () => { const f = fpb(), ph = S.beatT % f; return Math.min(ph, f - ph) <= 5; };
  // DROPOUT(4바퀴~): 약 5초마다 30프레임 지직거림으로 예고한 뒤 45프레임 동안 신호가 끊긴다
  const DROP_P = 300, DROP_PRE = 30, DROP_LEN = 45;
  const dropPh = () => stage() < 3 || S.rw || S.loopFx || S.cam > 0 || S.live > 0 ? -1 : (S.anim + 140) % DROP_P;
  const dropWarn = () => { const p = dropPh(); return p >= 0 && p < DROP_PRE; };
  const dropOn = () => { const p = dropPh(); return p >= DROP_PRE && p < DROP_PRE + DROP_LEN; };
  // 잔상 자리: 평소엔 뒤에서 따라오고, 신호가 끊길 땐(ECHO LEAD) 앞으로 달려 나가 지난 루프의 길을 먼저 보여준다
  // OVERDRIVE 동안엔 표지 그림처럼 바짝 붙어 겹쳐 달린다
  const echoSlot = i => dropWarn() || dropOn() ? HX + 34 * (i + 1) : S.drive > 0 ? HX - 7 * (i + 1) : HX - 24 * (i + 1);
  // 점프대 충전: 약 110px 앞부터 다가갈수록 0→1, 지나치면 0
  const padCharge = sx => { const d = sx - HX; return d < -19 ? 0 : Math.max(0, Math.min(1, (110 - d) / 90)); };
  // WOW(3바퀴~): 테이프가 늘어져 박자를 벗어난 점프는 낮아진다. 대신 박자에 맞추면(BEAT JUMP) 원래보다 높이 뛰고 게이지가 찬다
  function jump(n) {
    const beat = wearMax() >= 2 && onBeat(), k = beat ? 1.05 : stage() >= 2 ? .94 : 1;
    if (n === 1) { S.vy = JUMP1 * k; S.jumps = 1; sfx('jump'); }
    else { S.vy = JUMP2 * k; S.jumps = 2; S.spin = 18; sfx('jump2'); burst(HX, S.y - 4, 8, [C.teal, C.white], 1.4); }
    if (beat) { S.beatFx = 14; addGauge(1); sfx('beat'); }
    if (beat && liveK() > .3) { S.pts += 100; pop('CHEER +100', HX, S.y - 48, C.pink); burst(HX, S.y - 10, 10, LIVE_COL, 2); }
    S.ground = false; S.noCut = false;
  }
  // FF DASH(5바퀴~): 공중에서 세 번째로 누르면 빨리감기 — 잠깐 그 높이에 떠서 빠르게 앞으로 가고, 그동안 장애물을 통과하며 엉킨 장애물은 끊는다
  function ffDash() { S.ff = 16; S.ffUsed = true; S.vy = 0; S.spin = 0; sfx('ff'); burst(HX, S.y - 16, 10, [C.white, C.glow], 1.6); }
  function burst(x, y, n, colors, spd = 1.6) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (.4 + Math.random()) * spd;
      S.parts.push({ x, y, vx:Math.cos(a) * v, vy:Math.sin(a) * v - 1, life:20 + Math.random() * 14, c:colors[i % colors.length] });
    }
  }
  const pop = (text, x, y, c = C.yellow) => S.pops.push({ text, x, y, t:60, c });
  function damage() {
    S.hp--; S.combo = 0; S.chain = 0; S.lapHit = true;
    if (S.hp <= 0) { gameOver(); return false; }
    return true;
  }
  // onGuard: 잔상이 대신 맞았을 때 부딪힌 것을 부수는 일
  function hurt(onGuard) {
    if (S.ghosts.length) { guard(onGuard); return; }
    S.shake = 14; S.freeze = 8; S.flash = 6; sfx('hit');
    burst(HX, S.y - 14, 12, [C.red, C.white]);
    if (damage()) S.pendingRewind = true;
  }
  // 잔상이 대신 맞는다: 가장 가까운 지난 루프의 내가 달려들어 부딪힌 것을 부수고 흩어진다. HP와 되감기는 그대로지만
  // 실수는 실수라 콤보와 PERFECT는 잃는다. 구멍은 못 막는다(잔상은 뒤에서 달리니까)
  function guard(onGuard) {
    const g = S.ghosts.shift();
    S.guardFx = { x:g.x, t:16 };
    S.combo = 0; S.chain = 0; S.lapHit = true; S.inv = 50; S.freeze = 6; S.shake = 8; S.flash = 3;
    burst(HX, S.y - 16, 18, [C.teal, C.white, C.glow], 2.4);
    pop('ECHO GUARD', HX, S.y - 48, C.glow); sfx('guard');
    if (onGuard) onGuard();
  }
  // 구멍에 빠짐: 구멍 가운데쪽으로 미끄러지며 멈추고(fallX) 상판을 뚫고 도시로 떨어진다. 깨진 가장자리 조각이 먼저 쏟아진다
  function fall(sx, w) {
    S.past.push({ d:S.d, total:S.total, y:GROUND, vy:0, ground:true, jumps:0, beatT:S.beatT });
    S.falling = FALL_T; S.ground = false; S.vy = 1.5; S.trail = [];
    S.fallX = S.d + sx + w / 2 - HX; S.fallSp = speedOf();
    for (let i = 0; i < 10; i++) S.parts.push({ x:sx + 3 + Math.random() * (w - 6), y:GROUND + Math.random() * 4, vx:(Math.random() - .5) * .8, vy:1 + Math.random() * 2, g:.55, life:60, c:['#1a5e77', '#051e31', C.yellow][i % 3] });
    sfx('fall');
    if (damage()) S.pendingRewind = true;
  }
  function stepFall() {
    S.falling--;
    S.vy = Math.min(FALL_VMAX, S.vy + FALL_G); S.y += S.vy;
    if (S.d < S.fallX) { const dx = Math.min(S.fallX - S.d, S.fallSp); S.d += dx; S.total += dx; }
    S.fallSp *= .8;
    // 카메라는 몸이 상판을 지난 뒤부터 따라가고, 몸보다 조금 빨리 내려가 점점 아래(도착할 곳)를 더 보여준다
    const prev = S.cam;
    S.cam = Math.max(0, Math.min(CAM_MAX, (S.y - GROUND - 10) * 1.3)); S.camV = S.cam - prev;
    S.trail.push({ y:S.y, cam:S.cam });
    // 전선을 스치면 불꽃: 몇 층을 지나 떨어졌는지 손에 잡히게
    const mid = S.y - 16;
    for (const c of CABLES) { const cy = cableY(c, HX); if (mid - S.vy < cy && mid >= cy) { sfx('wire'); burst(HX, cy, 8, [C.glow, C.white], 1.6); } }
  }
  // 되감기: 부딪히면 테이프가 약 1.6초 전으로 되감긴다 (잃어버린 왕관의 시간 능력을 카세트로 옮긴 것)
  // 떨어졌을 때는 낙하부터 거꾸로 감아서, 구멍으로 다시 빨려 올라가는 모습이 먼저 보인다
  function startRewind() {
    S.pendingRewind = false;
    if (S.past.length < (S.trail.length ? 1 : 2)) { S.inv = 80; return; }
    S.rw = { snaps:S.past.slice(), i:S.past.length - 1, rise:S.trail };
    S.trail = []; S.cars = []; sfx('rewind');
    // 곡도 테이프처럼 거꾸로 감긴다: 되감기 화면이 도는 시간 동안 되돌아갈 지점(가장 오래된 기록의 박자)까지
    if (bgm.active) {
      const now = bgmTime(), back = now - beatToSong(S.rw.snaps[0].beatT), dur = (S.rw.rise.length + S.rw.snaps.length) / 3 / 60;
      bgm.pos = now - back; bgmPlay(now, true, Math.max(1, Math.min(4, back / Math.max(dur, .1))));
    }
  }
  function endRewind() {
    const s = S.rw.snaps[0];
    Object.assign(S, { d:s.d, prevD:s.d, total:s.total, y:s.y, vy:s.vy, ground:s.ground, jumps:s.jumps, beatT:s.beatT, falling:0, noCut:true, cam:0, camV:0, ff:0, ffUsed:false });
    S.rw = null; S.past = []; S.hist = []; S.inv = 80; sfx('play');
    if (bgm.active) bgmPlay(beatToSong(s.beatT));
  }
  function addGauge(n) {
    if (S.climax > 0 || S.drive > 0 || S.pick) return;
    S.gauge = Math.min(GAUGE, S.gauge + n);
    if (S.gauge >= GAUGE) openPick();
  }
  // 게이지가 차면: 세계가 느려지고(30%) 소리가 먹먹해지며, 주인공 둘레에 방향 키 세 개가 차례로 켜진다
  function openPick() { S.pick = { t:0, acc:0 }; S.flash = 3; sfx('pickOpen'); muffle(700, .2); }
  const canPurify = () => stage() > 0;
  // 고른 순간: 짧게 멈칫 + 플래시 + 소리가 확 열리고, 능력이 바로 시작된다
  function choose(dir) {
    if (dir === 'up' && !canPurify()) { sfx('deny'); return; }
    S.pick = null; S.pickFx = { dir, t:48, sub:'' };
    S.freeze = 4; S.flash = 6; S.shake = 6; sfx('choose', dir === 'up' ? 0 : dir === 'left' ? 1 : 2); muffle(20000, .45);
    if (dir === 'left') { S.climax = CLIMAX_T; sfx('climax'); }
    else if (dir === 'up') { S.pickFx.sub = TAPE[stage()].bad; S.purged++; S.gauge = 0; S.cleanFx = 40; S.inv = Math.max(S.inv, 40); }
    else S.drive = DRIVE_T;
  }
  function collect(x, y) {
    S.combo++;
    const mult = Math.min(5, 1 + Math.floor(S.combo / 8));
    S.pts += 50 * mult * (S.drive > 0 ? 2 : 1);
    burst(x, y, 5, [C.yellow, C.teal], 1.1);
    sfx('pick', Math.min(10, S.combo % 10));
    addGauge(1);
  }
  function nextLap() {
    S.ghosts.unshift({ rec:S.rec, x:-40, flash:0 }); if (S.ghosts.length > 3) S.ghosts.pop();
    S.echoIn = 160;
    S.rec = newRec();
    const perfect = !S.lapHit; S.lapHit = false;
    const st0 = stage();
    S.lap++;
    if (S.lap <= 5 || stage() > st0) S.tapeCard = 240; // 새 능력이 생기거나 마모가 한 단계 오르면 라벨
    const keep = s => new Set([...s].filter(k => k.startsWith(S.lap + ':')));
    S.broken = keep(S.broken); S.got = keep(S.got); S.near = keep(S.near); S.fired = keep(S.fired);
    S.loopFx = 70; S.slow = 28; S.banner = 0;
    if (perfect) {
      S.pts += 1000; S.banner = 110; S.bannerWord = 'perfect';
      S.sub = S.hp < HPMAX ? 'HP +1   BONUS +1000' : 'BONUS +1000';
      if (S.hp < HPMAX) S.hp++;
      sfx('perfect');
    } else sfx('lap');
    sfx('whoosh');
    S.liveDone = false;
  }

  function update() {
    if (mode === 'attract') { attractT++; attractScroll += 1.8; return; }
    if (mode === 'over') {
      S.overT++;
      if (S.falling > 0) stepFall();
      stepFx(0);
      if (S.overT > 720) setMode('attract');
      return;
    }
    if (mode !== 'play') return;
    if (S.guardFx && --S.guardFx.t <= 0) S.guardFx = null;
    if (S.pickFx && --S.pickFx.t <= 0) S.pickFx = null;
    if (S.cleanFx > 0) S.cleanFx--;
    if (S.freeze > 0) { S.freeze--; if (S.freeze === 0 && S.pendingRewind && !S.falling) startRewind(); return; }
    if (S.rw) {
      S.anim++;
      if (S.rw.rise.length) {
        let t; for (let k = 0; k < 3 && S.rw.rise.length; k++) t = S.rw.rise.pop();
        S.camV = t.cam - S.cam; S.y = t.y; S.cam = t.cam;
        return;
      }
      S.cam = 0; S.camV = 0;
      S.rw.i -= 3;
      const s = S.rw.snaps[Math.max(0, S.rw.i)];
      S.d = s.d; S.total = s.total; S.y = s.y;
      if (S.rw.i <= 0) endRewind();
      return;
    }
    if (S.pick) {
      if (++S.pick.t >= PICK_T) choose('left');
      else { S.pick.acc += PICK_SLOW; if (S.pick.acc < 1) return; S.pick.acc -= 1; }
    }
    if (S.slow > 0) { S.slow--; if (S.slow % 2) { stepFx(0); return; } }

    S.anim++;
    const pbt = S.beatT;
    S.beatT = bgm.active && bgm.playing ? songToBeat(bgmTime()) : S.beatT + 1;
    S.beatHit = Math.floor(S.beatT / fpb()) !== Math.floor(pbt / fpb()); // 이번 프레임에 박이 넘어갔나
    if (bgm.active) bgmFx();
    const sp = S.falling ? 0 : speedOf() * (S.ff > 0 ? 2.4 : 1);
    S.prevD = S.d; S.d += sp; S.total += sp;
    if (S.climax > 0 || S.drive > 0) S.pts += sp / 10;
    if (S.d >= TRACK) { S.d -= TRACK; S.prevD -= TRACK; S.past = []; nextLap(); }
    if (S.intro > 0 && --S.intro === 40) sfx('go');

    if (S.queued) {
      S.queued = false;
      if (!S.falling) {
        if (S.ground) jump(1);
        else if (S.vy > 0 && GROUND - S.y < 14) S.buf = 8;
        else if (S.jumps < 2) jump(2);
        else if (wearMax() >= 4 && !S.ffUsed) ffDash();
      }
    }
    if (S.buf > 0) { S.buf--; if (S.ground && !S.falling) { jump(1); S.buf = 0; } }
    if (S.spin > 0) S.spin--;

    if (S.falling > 0) {
      stepFall();
      if (S.falling === 0) { if (S.pendingRewind) { startRewind(); return; } S.y = GROUND; S.vy = 0; S.ground = true; S.jumps = 0; S.cam = 0; S.camV = 0; }
    } else if (S.ff > 0) { S.ff--; S.vy = 0; }
    else if (!S.ground) {
      if (!held && !S.noCut && S.vy < -3) S.vy = -3;
      S.vy += GRAV; S.y += S.vy;
      if (S.y >= GROUND) {
        S.y = GROUND; S.vy = 0; S.ground = true; S.jumps = 0; S.chain = 0; S.noCut = false; S.ffUsed = false;
        burst(HX, GROUND - 1, 3, ['#3d5868'], .7);
      }
    }
    if (!S.falling && S.inv === 0) { S.past.push({ d:S.d, total:S.total, y:S.y, vy:S.vy, ground:S.ground, jumps:S.jumps, beatT:S.beatT }); if (S.past.length > 96) S.past.shift(); }
    if (S.d >= 0) S.rec[Math.floor(S.d / 4)] = Math.max(0, GROUND - S.y);
    S.hist.push(S.y); if (S.hist.length > 20) S.hist.shift();
    S.ghosts.forEach((g, i) => { const tx = echoSlot(i); g.x += (tx - g.x) * .09; if (g.flash) g.flash--; });
    if (S.echoIn > 0 && !S.loopFx) S.echoIn--;
    if (S.tapeCard > 0 && !S.loopFx && S.banner <= 0) S.tapeCard--;
    if (S.beatFx > 0) S.beatFx--;
    if (dropPh() === DROP_PRE) sfx('drop');

    // 뒤에서 오는 차
    for (const off of [0, TRACK]) {
      const L = off ? S.lap + 1 : S.lap;
      OBS.forEach((o, i) => {
        if (o.t !== 'C' || !active(o, L)) return;
        const p = o.p + off, key = L + ':' + i;
        if (S.prevD < p && S.d >= p && !S.fired.has(key)) { S.fired.add(key); S.cars.push({ t:0, warn:Math.max(38, 66 - S.lap * 4), x:-60, passed:false }); }
      });
    }
    const hx = HX - 6, hw = 12, hy = S.y - 30, hh = 30;
    for (const car of S.cars) {
      car.t++;
      if (car.t < car.warn) { if (car.t % 12 === 1) sfx('warn'); continue; }
      if (car.t === car.warn) sfx('car');
      car.x += 9;
      const bx = car.x + 4, bw = 44, by = GROUND - 15;
      if (!S.falling && !S.ff && bx < hx + hw && bx + bw > hx) {
        if (S.y > by + 2 && S.climax === 0 && S.inv === 0) { hurt(() => { burst(car.x + 26, GROUND - 9, 14, [C.white, C.red, C.gray], 2.4); car.x = W + 200; }); return; }
        else if (!car.passed && S.y <= by + 2) { car.passed = true; S.pts += 150; pop('DODGE +150', HX, S.y - 48, C.teal); sfx('close'); }
      }
    }
    S.cars = S.cars.filter(c => c.x < W + 60);

    if (!S.falling) {
      let stop = false;
      eachObs((o, sx, key, L) => {
        if (stop || mode !== 'play' || S.freeze) return;
        const w = wOf(o), h = SIZE[o.t][1];
        if (o.t === 'P') {
          if (S.ground && S.inv === 0 && S.climax === 0 && HX > sx + 3 && HX < sx + w - 3) { fall(sx, w); stop = true; }
          return;
        }
        if (o.t === 'S') {
          S.padPh[key] = (S.padPh[key] || 0) + 1 + 2.5 * padCharge(sx) + (S.springT[key] ? 4 : 0);
          if (sx < hx + hw && sx + w > hx && S.y >= GROUND - 14 && (S.ground || S.vy > 0)) {
            S.vy = SPRING; S.ground = false; S.jumps = 1; S.noCut = true; S.springT[key] = 10; S.pts += 50;
            sfx('spring'); burst(HX, GROUND - 6, 10, [C.yellow, C.white], 1.8); pop('BOING!', HX, S.y - 48, C.yellow);
          }
          return;
        }
        let b;
        if (o.t === 'D') { const t = droneTop(o, L); b = { x:sx + 2, y:t + 3, w:w - 4, h:h - 5 }; }
        else if (o.t === 'E') { if (!gateOn(o)) return; b = { x:sx + 16, y:GROUND - 46, w:41, h:44 }; }
        else if (o.t === 'L') b = { x:sx + 2, y:0, w:w - 4, h:GROUND - SIGN_GAP + 4 }; // 그림 머리끝(판정 +8px)이 판에 4px 닿으면 충돌
        else b = { x:sx + 3, y:GROUND - h + 2, w:w - 6, h:h - 2 };
        const xo = b.x < hx + hw && b.x + b.w > hx;
        if (S.ff > 0) {
          if (o.tangle && xo && b.y < hy + hh && b.y + b.h > hy) {
            S.broken.add(key); S.pts += 150; S.shake = 4; sfx('smash');
            burst(b.x + b.w / 2, b.y + b.h / 2, 14, [C.pink, C.glow, C.white], 2.2); pop('CUT +150', HX, S.y - 48, C.pink);
          }
          return;
        }
        if (xo && b.y < hy + hh && b.y + b.h > hy) {
          if (o.t === 'D' && S.vy > 0 && S.y - S.vy <= b.y + 6) {
            S.broken.add(key); S.chain++; S.vy = STOMP; S.jumps = 1; S.noCut = true; S.freeze = 3; S.shake = 4;
            S.pts += 200 * S.chain; addGauge(3);
            S.debris.push({ x:sx, y:b.y, vy:-2 });
            burst(sx + 9, b.y + 4, 12, [C.white, C.teal, C.red], 2);
            pop(S.chain > 1 ? 'STOMP x' + S.chain : 'STOMP +200', HX, S.y - 48, C.white); sfx('stomp', S.chain);
          } else if (S.climax > 0) {
            S.broken.add(key); S.pts += 100; S.shake = 6; sfx('smash');
            const cy = o.t === 'L' ? b.h - 8 : b.y + b.h / 2;
            burst(b.x + b.w / 2, cy, 12, [C.white, C.pink, C.yellow], 2.2);
            pop('+100', b.x + b.w / 2, o.t === 'L' ? b.h + 4 : b.y - 6, C.pink);
          } else if (S.inv === 0) { if (o.t === 'E') sfx('zap'); hurt(() => S.broken.add(key)); stop = true; }
        } else if (xo && !S.ground && o.t !== 'D' && o.t !== 'E' && !S.near.has(key)) {
          const gap = o.t === 'L' ? hy - (b.y + b.h) : b.y - S.y;
          if (gap >= 0 && gap < 8) { S.near.add(key); S.pts += 100; S.slow = 16; pop('CLOSE! +100', HX, S.y - 48, C.white); sfx('close'); burst(HX, S.y, 8, [C.teal, C.white], 1.4); }
        }
      });
      if (stop || mode !== 'play') return;
      // SYNC: 장애물 한가운데를 지나는 순간, 지난 루프의 나와 같은 높이(±8)로 떠 있으면 그 잔상들이 내 몸에 겹친다
      // 같은 동작을 여러 루프 동안 다듬을수록(맞춘 잔상이 많을수록) 보상이 커진다
      if (S.ghosts.length && !S.ground && !S.rw) {
        const h = GROUND - S.y, idx = Math.floor(S.d / 4);
        OBS.forEach((o, i) => {
          if (o.t === 'C' || o.t === 'S' || !active(o, S.lap) || S.broken.has(S.lap + ':' + i)) return;
          const c = o.p + wOf(o) / 2;
          if (!(S.prevD < c && S.d >= c) || h < 6) return;
          const hit = S.drive > 0 ? S.ghosts.slice() : S.ghosts.filter(g => { const e = g.rec[idx] || 0; return e > 6 && Math.abs(e - h) <= 8; });
          if (!hit.length) return;
          const m = hit.length;
          hit.forEach(g => { g.x = HX - 2; g.flash = 16; });
          S.pts += 100 * m * (S.drive > 0 ? 2 : 1); addGauge(1 + m);
          pop(m > 1 ? 'SYNC x' + m : 'SYNC', HX, S.y - 48, C.glow); sfx('sync', m);
          burst(HX, S.y - 16, 6 + m * 3, [C.glow, C.white], 1.3);
        });
      }
    }

    for (const off of [0, TRACK]) {
      const L = off ? S.lap + 1 : S.lap;
      for (let i = 0; i < PICK.length; i++) {
        const k = PICK[i], key = L + ':' + i;
        if (S.got.has(key)) continue;
        const sx = k.p + off - S.d + HX;
        if (sx < HX - 16 || sx > HX + 16) continue;
        const py = GROUND - k.h;
        if (sx + 7 > hx && sx - 7 < hx + hw && py > hy && py - 10 < hy + hh) { S.got.add(key); collect(sx, py - 4); }
      }
    }
    if (S.climax > 0) { S.climax--; S.gauge = GAUGE * S.climax / CLIMAX_T; if (S.climax === 0) { S.gauge = 0; S.inv = 60; } }
    if (S.drive > 0) { S.drive--; S.gauge = GAUGE * S.drive / DRIVE_T; }
    // IDIOTAPE LIVE: 무대 그림이 화면 오른쪽 끝에 들어오는 순간 라이저 → liveIn 뒤 드롭. 박자마다 꽃가루, 마디 첫 박엔 양옆 연주자에게서 픽셀이 터진다
    // 드롭 맞추기: 곡에 drop이 정해져 있으면 곡을 드롭 직전으로 넘기고(DJ 컷), 아니면 다음 마디 첫 박까지 라이저를 늘인다
    const liveAt = SECRET_AT - (W - HX) + 20;
    if (liveLap(S.lap) && !S.liveDone && !S.rw && S.prevD < liveAt && S.d >= liveAt) {
      const f = fpb(), toBar = (4 - (S.beatT / f) % 4) * f;
      if (bgm.active && BGM.drop != null) { S.liveIn = LIVE_IN; bgmPlay(BGM.drop - LIVE_IN / 60); }
      else S.liveIn = Math.round(toBar < 12 ? toBar + 4 * f : toBar);
      S.liveDone = true; S.liveLen = S.live = Math.max(S.liveIn + 120, Math.min(LIVE_T, Math.floor((LIVE_END - S.d) / speedOf()))); sfx('riser', S.liveIn / 60);
    }
    if (S.live > 0) {
      const t = S.liveLen - S.live, f = fpb();
      if (t === S.liveIn) { sfx('livedrop'); S.flash = 7; S.shake = 8; }
      if (t >= S.liveIn && S.beatHit) {
        for (let i = 0; i < 6; i++) { const left = i % 2; S.parts.push({ x:left ? Math.random() * 110 : W - Math.random() * 110, y:-VIEW_TOP - 4, vx:(Math.random() - .5) * .6, vy:.6 + Math.random(), g:.015, life:150, c:LIVE_COL[(i + Math.floor(S.beatT / f)) % 4] }); }
        if (Math.floor(S.beatT / f) % 4 === 0) { burst(56, 120, 16, LIVE_COL, 2.6); burst(W - 56, 120, 16, LIVE_COL, 2.6); }
      }
      if (--S.live === 0) { S.pts += 500; pop('ENCORE +500', HX, S.y - 60, C.yellow); sfx('secret'); }
    }
    for (const k in S.springT) if (--S.springT[k] <= 0) delete S.springT[k];
    if (S.inv > 0) S.inv--;
    if (S.banner > 0) S.banner--;
    if (S.loopFx > 0) S.loopFx--;
    if (S.flash > 0) S.flash--;
    if (S.shake > 0) S.shake--;
    stepFx(sp);
  }
  function stepFx(sp) {
    for (const p of S.parts) { p.x += p.vx - sp * .5; p.y += p.vy; p.vy += p.g || .12; p.life--; }
    S.parts = S.parts.filter(p => p.life > 0);
    for (const d of S.debris) { d.x -= sp; d.vy += .35; d.y = Math.min(GROUND - 9, d.y + d.vy); }
    S.debris = S.debris.filter(d => d.x > -30);
    for (const p of S.pops) { p.t--; p.y -= .4; }
    S.pops = S.pops.filter(p => p.t > 0);
  }

  /* ================= 그리기 도구 ================= */
  const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const mod = (a, n) => ((a % n) + n) % n;
  function txt(s, x, y, color, size = 8, align = 'left', shadow = C.ink, font = F_PIX, weight = '700') {
    ctx.font = `${weight} ${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'top';
    if (shadow) { ctx.fillStyle = shadow; ctx.fillText(s, x + 1, y + 1); }
    ctx.fillStyle = color; ctx.fillText(s, x, y);
  }
  const num = (s, x, y, color, size = 8, align = 'left') => txt(s, x, y, color, size, align, C.ink, F_NUM, '400');
  // 뒷면 태그와 같은 칩 (RUNNER · 1 PLAYER)
  function chip(s, x, y, bg, fg = C.ink) {
    ctx.font = `700 8px ${F_PIX}`; const w = Math.ceil(ctx.measureText(s).width) + 10;
    R(C.ink, x + 2, y + 2, w, 13); R(C.ink, x - 1, y - 1, w + 2, 15); R(bg, x, y, w, 13);
    txt(s, x + 5, y + 2, fg, 8, 'left', null); return w;
  }
  // 한글은 표지 헤드라인처럼 1비트 픽셀 글자로 (Noto Sans KR Black/Bold)
  const KCACHE = new Map();
  function kimg(str, size, color, weight) {
    const key = str + '|' + size + '|' + color + '|' + weight;
    if (KCACHE.has(key)) return KCACHE.get(key);
    const font = `${weight} ${size}px "Noto Sans KR", sans-serif`;
    const m = document.createElement('canvas').getContext('2d'); m.font = font;
    const w = Math.ceil(m.measureText(str).width) + 4, h = size + 8;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.font = font; g.textBaseline = 'top'; g.fillStyle = '#fff'; g.fillText(str, 1, 1);
    const src = g.getImageData(0, 0, w, h), out = g.createImageData(w, h);
    const n = parseInt(color.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
    for (let i = 0; i < w * h; i++) if (src.data[i * 4 + 3] > 110) { out.data[i * 4] = r; out.data[i * 4 + 1] = gg; out.data[i * 4 + 2] = b; out.data[i * 4 + 3] = 255; }
    g.clearRect(0, 0, w, h); g.putImageData(out, 0, 0);
    KCACHE.set(key, c); return c;
  }
  function ktxt(str, x, y, color, size = 12, align = 'left', weight = 900) {
    const c = kimg(str, size, color, weight), s = kimg(str, size, C.ink, weight);
    const dx = Math.round(align === 'center' ? x - c.width / 2 : align === 'right' ? x - c.width : x);
    ctx.drawImage(s, dx + 1, Math.round(y) + 1); ctx.drawImage(c, dx, Math.round(y));
  }
  function dim(a, c = '#02060a') { ctx.globalAlpha = a; R(c, 0, 0, W, H); ctx.globalAlpha = 1; }
  // 화면을 꽉 채우게 가운데를 잘라 그리기 (영상은 픽셀 그림이 아니라서 부드럽게 축소)
  function cover(src, sw, sh) {
    const s = Math.max(W / sw, H / sh), cw = W / s, ch = H / s;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
  }

  /* ================= 배경 (월드 좌표: 0~DECK, 위로 VIEW_TOP만큼 천장이 더 보인다) ================= */
  function drawBG(s, speed, fever, anim, beat) {
    R(C.night, 0, -VIEW_TOP, W, DECK + VIEW_TOP);
    const bg = IMG.bg;
    if (ok(bg)) {
      const per = bg.width * 2;
      for (let x = -mod(Math.round(s), per); x < W; x += per) {
        ctx.drawImage(bg, x, 0);
        ctx.save(); ctx.translate(x + per, 0); ctx.scale(-1, 1); ctx.drawImage(bg, 0, 0); ctx.restore();
        // 늘어난 천장: bg 맨 위 줄들(균일한 천장 어둠)을 위로 뒤집어 이어 붙인다
        ctx.save(); ctx.translate(x, 0); ctx.scale(1, -1); ctx.drawImage(bg, 0, 0, bg.width, VIEW_TOP, 0, 0, bg.width, VIEW_TOP); ctx.restore();
        ctx.save(); ctx.translate(x + per, 0); ctx.scale(-1, -1); ctx.drawImage(bg, 0, 0, bg.width, VIEW_TOP, 0, 0, bg.width, VIEW_TOP); ctx.restore();
      }
    }
    const lamp = fever ? FEVER[(anim >> 3) % 3] : C.teal;
    if (beat) { ctx.globalAlpha = fever ? .16 : .06; R(lamp, 0, -VIEW_TOP, W, GROUND + VIEW_TOP); ctx.globalAlpha = 1; }
    if (fever) { ctx.globalAlpha = .12; R(lamp, 0, -VIEW_TOP, W, GROUND + VIEW_TOP); ctx.globalAlpha = 1; }
    if (speed > 3.6) {
      ctx.globalAlpha = Math.min(.5, (speed - 3.6) * .3);
      for (let i = 0; i < 9; i++) R(fever ? lamp : C.glow, W - mod(s * 2.4 + i * 71, W + 60), 50 + ((i * 37) % 130), 20 + (i * 13) % 30, 1);
      ctx.globalAlpha = 1;
    }
  }
  /* ================= 고가도로 아래: 구멍 너머와 낙하 장면 ================= */
  // 아래 그림들도 터널처럼 박자에 맞춰 숨 쉰다 (BEAT 박자 순간 · BEATP 박자 안 위치 0~1 · LAMP 지금 조명 색)
  let BEAT = false, BEATP = 0, LAMP = C.teal;
  const CABLES = [{ y:DECK + SLAB + 100, sag:10 }, { y:DECK + SLAB + 170, sag:14 }], FOG = [DECK + SLAB + 130, DECK + SLAB + 235], SIGN_X = 150;
  const cableY = (c, x) => c.y + Math.round(c.sag * 4 * (x / W) * (1 - x / W));
  function mirrorTile(img, sy, sh, dy, scroll) {
    const per = img.width * 2;
    for (let x = -mod(Math.round(scroll), per); x < W; x += per) {
      ctx.drawImage(img, 0, sy, img.width, sh, x, dy, img.width, sh);
      ctx.save(); ctx.translate(x + per, 0); ctx.scale(-1, 1); ctx.drawImage(img, 0, sy, img.width, sh, 0, dy, img.width, sh); ctx.restore();
    }
  }
  // 협곡 원경: 도로보다 느리게 움직여 멀리 있는 것처럼 보인다. 구멍 안과 낙하 장면이 같은 그림이라 떨어지기 전부터 어디로 가는지 보인다
  function drawCity(top, bottom) {
    R('#02090f', 0, top, W, bottom - top);
    const img = IMG.under, cam = Math.round(S.cam);
    if (ok(img)) mirrorTile(img, TRUSS, img.height - TRUSS, FAR_Y0 + Math.round(cam * (1 - FAR_PY)), S.total * FAR_PX);
    if (BEAT) { ctx.globalAlpha = .08; R(LAMP, 0, top, W, bottom - top); ctx.globalAlpha = 1; }
  }
  // 전선: 박자마다 전기가 흐른다 (터널 조명과 전기 게이트가 박자에 맞춰 깜빡이는 이유)
  function cable(c) {
    for (let x = 0; x < W; x += 2) { const y = cableY(c, x); R('#24495a', x, y - 1, 2, 1); R('#02090f', x, y, 2, 2); }
    const px = Math.round(BEATP * W);
    for (let k = 0; k < 10; k++) { ctx.globalAlpha = 1 - k / 10; R(k ? LAMP : C.white, px - k * 2, cableY(c, px - k * 2) - 1, 2, 3); }
    ctx.globalAlpha = 1;
  }
  // 되감기 간판: 낙하가 끝나는 깊이에 걸려 있다. 떨어질 땐 ◀◀가 박자에 깜빡이고, 테이프가 감기면 네온이 확 밝아진다
  // 부딪히면 되감긴다는 규칙(설명 06)을 세계 안에서 다시 보여준다
  const RW_ARROWS = [5, 60, 9, 8];
  function rewindSign(x, y) {
    neonSign('rw', x, y, 5, S.anim, 1, !!S.rw);
    if (!S.rw && !(BEAT || BEATP > .5)) sgPart('rwo', RW_ARROWS, x, y);
    if (S.rw) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .7; pix(IMG.signs, SG.rw, x, y); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  }
  // 떨어질 때만 보이는 상판 아래: 트러스(도로와 같이 움직임) → 구멍으로 새는 터널 불빛 → 안개층 → 전선·간판, 마지막으로 상판 앞면
  function drawUnderDeck(pits) {
    const cam = Math.round(S.cam); if (cam <= 0) return;
    const top = DECK + SLAB, bottom = DECK + cam;
    ctx.save(); ctx.beginPath(); ctx.rect(0, top, W, bottom - top); ctx.clip();
    drawCity(top, bottom);
    if (ok(IMG.under)) mirrorTile(IMG.under, 0, TRUSS, top, S.total);
    // 구멍으로 새어 내려오는 터널 불빛: 떨어진 자리이자 되감기로 돌아갈 길
    for (const [px, pw] of pits) {
      const g = ctx.createLinearGradient(0, top, 0, top + 260); g.addColorStop(0, 'rgba(189,243,238,.3)'); g.addColorStop(1, 'rgba(189,243,238,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px + pw, top); ctx.lineTo(px + pw + 16, top + 260); ctx.lineTo(px - 16, top + 260); ctx.closePath(); ctx.fill();
    }
    // 안개층: 한 겹씩 뚫고 지날 때마다 내려간 깊이가 느껴진다
    for (const fy of FOG) {
      const g = ctx.createLinearGradient(0, fy - 18, 0, fy + 18); g.addColorStop(0, 'rgba(143,166,176,0)'); g.addColorStop(.5, 'rgba(143,166,176,.14)'); g.addColorStop(1, 'rgba(143,166,176,0)');
      ctx.fillStyle = g; ctx.fillRect(0, fy - 18, W, 36);
    }
    for (const c of CABLES) cable(c);
    rewindSign(SIGN_X, cableY(CABLES[1], SIGN_X + 10) - 1);
    ctx.restore();
    // 상판 앞면: 도로 가장자리와 같은 색, 반사등 줄이 여기가 고가도로의 끝선이라는 걸 알려준다
    R('#1a5e77', 0, DECK, W, 1); R('#03141f', 0, DECK + 1, W, SLAB - 1);
    for (let x = -mod(Math.round(S.total), 24); x < W; x += 24) R(C.glow, x, DECK + 4, 2, 1);
  }
  // 낙하 속도선(카메라가 빨리 내려갈수록 길어짐)과 깊이 안개(아래 거리의 빛이 차오름). 화면 기준으로 그린다
  function drawFallFx() {
    if (S.cam <= 0) return;
    const depth = S.cam / CAM_MAX, k = Math.min(1, Math.abs(S.camV) / 6);
    const g = ctx.createLinearGradient(0, H * .4, 0, H); g.addColorStop(0, 'rgba(25,211,197,0)'); g.addColorStop(1, `rgba(25,211,197,${(.2 * depth).toFixed(3)})`);
    ctx.fillStyle = g; ctx.fillRect(0, H * .4, W, H * .6);
    if (k < .05) return;
    for (let i = 0; i < 16; i++) {
      const x = (i * 71 + 23) % W, len = 4 + (i % 4) * 4 + Math.round(k * 20);
      const y = mod(i * 113 - S.cam * (1.3 + (i % 3) * .3), H + 60) - 30;
      ctx.globalAlpha = k * (.2 + (i % 3) * .12);
      R(i % 6 === 0 ? C.pink : i % 2 ? C.glow : C.white, x, y, 1, len);
    }
    ctx.globalAlpha = 1;
  }
  /* ================= 테이프 마모 (루프마다 한 단계씩, 화면 효과는 HUD를 건드리지 않는다) ================= */
  // NOISE(2바퀴~): 약한 CRT 스노우와 천천히 굴러 내려가는 밝은 띠. 단계가 오를수록 눈이 조금씩 늘어난다
  function drawTapeNoise() {
    const st = stage(); if (st < 1 || S.rw || S.live > 0 || mode !== 'play') return;
    ctx.globalAlpha = .18;
    for (let i = 0; i < 20 + st * 10; i++) R(Math.random() < .5 ? C.white : C.mist, Math.random() * W, Math.random() * H, 1, 1);
    ctx.globalAlpha = .05; R(C.white, 0, (S.anim * .7) % (H + 40) - 20, W, 10); ctx.globalAlpha = 1;
  }
  // TANGLE(5바퀴~): 강한 글리치 — VHS 트래킹 띠가 화면을 훑으며 그 줄이 옆으로 밀리고, 가끔 화면 전체가 분홍빛으로 이중으로 번진다
  function drawTangle() {
    if (stage() < 4 || S.rw || S.live > 0 || mode !== 'play') return;
    const dur = 40, ph = (S.anim + 53) % 150;
    if (ph < dur) {
      const bh = 12, by = Math.round(H - bh - ph / dur * (H - bh)), dx = ((ph >> 1) % 2 ? 1 : -1) * 3;
      const y0 = Math.round(by * SY), h0 = Math.round(bh * SY);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(cv, 0, y0, cv.width, h0, Math.round(dx * SX), y0, cv.width, h0); ctx.restore();
      ctx.globalAlpha = .18; R(C.white, 0, by, W, 1); ctx.globalAlpha = .25; R(C.pink, 0, by + bh, W, 1); ctx.globalAlpha = 1;
    }
    if ((S.anim + 90) % 240 < 6) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .3;
      ctx.drawImage(cv, Math.round(3 * SX), 0); ctx.restore();
      ctx.globalAlpha = .08; R(C.pink, 0, 0, W, H); ctx.globalAlpha = 1;
    }
  }
  // DROPOUT(4바퀴~): 신호가 끊기는 동안 세계가 잡음에 묻힌다(장애물은 희미한 윤곽만). 잔상과 나는 잡음 위에 남는다. 직전엔 지직거림이 늘며 예고
  function drawDropout() {
    const p = dropPh(); if (p < 0 || p >= DROP_PRE + DROP_LEN) return;
    const top = Math.round(S.cam) - VIEW_TOP;
    if (p < DROP_PRE) {
      ctx.globalAlpha = .5;
      for (let i = 0; i < p * 2; i++) R(Math.random() < .5 ? C.white : C.glow, Math.random() * W, top + Math.random() * H, 1 + (Math.random() * 3 | 0), 1);
      ctx.globalAlpha = 1; return;
    }
    const k = p - DROP_PRE, fade = Math.min(1, k / 4, (DROP_LEN - k) / 6);
    ctx.globalAlpha = .78 * fade; R(C.night, 0, top, W, H);
    ctx.globalAlpha = .55 * fade;
    for (let i = 0; i < 220; i++) R(Math.random() < .7 ? '#3d5868' : C.mist, Math.random() * W, top + Math.random() * H, 1 + (Math.random() * 2 | 0), 1);
    for (let i = 0; i < 3; i++) R(C.white, 0, top + Math.random() * H, W, 1);
    ctx.globalAlpha = 1;
  }
  // 박자 가이드(WOW~): 발밑 괄호가 다음 박자를 향해 좁혀 들고, 박자 순간(±5프레임)엔 하얗게 — 지금 뛰면 BEAT JUMP
  function drawBeatGuide() {
    if (wearMax() < 2 || S.rw || S.falling || mode !== 'play') return;
    const f = fpb(), rem = 1 - (S.beatT % f) / f, off = Math.round(8 + rem * 14), on = onBeat(), y = GROUND + 2, c = on ? C.white : C.glow;
    ctx.globalAlpha = on ? .9 : .4;
    for (const sd of [-1, 1]) { const x = HX + sd * off; R(c, x, y, 1, 5); R(c, sd < 0 ? x : x - 2, y, 3, 1); R(c, sd < 0 ? x : x - 2, y + 4, 3, 1); }
    if (S.beatFx) { const r = 6 + (14 - S.beatFx) * 2; ctx.globalAlpha = S.beatFx / 14; R(C.white, HX - r, GROUND, r * 2, 1); R(C.glow, HX - r - 4, GROUND + 3, r * 2 + 8, 1); }
    ctx.globalAlpha = 1;
  }
  // 엉킨 테이프(5바퀴~): 원본 바로 뒤에 한 번 더 찍힌 복제 — 진짜로 부딪힌다. 갈색 자기 테이프가 감겨 있고 색이 번져 원본과 구분된다
  function tangleFx(o, sx) {
    const m = HZ[{ B:'bar', T:'crate', W:'block' }[o.t]], y = GROUND - m[3];
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = .4; pix(IMG.haz, m, sx - 2, y); ctx.globalAlpha = .25; pix(IMG.haz, m, sx + 2, y);
    ctx.globalCompositeOperation = 'source-over';
    for (let k = 0; k < 3; k++) for (let x = -3; x < m[2] + 3; x++) {
      const ty = Math.round(y + m[3] * (.25 + k * .25) + Math.sin((x + S.anim * (k + 1) * .3 + k * 7) / 3) * 3);
      ctx.globalAlpha = .9; R('#3a2418', sx + x, ty, 1, 2); ctx.globalAlpha = .6; R('#8a5a3a', sx + x, ty, 1, 1);
    }
    if ((S.anim >> 2) % 6 === 0) { ctx.globalAlpha = .7; pix(IMG.haz, [m[0], m[1] + (m[3] >> 1), m[2], 3], sx + 3, y + (m[3] >> 1)); }
    ctx.globalAlpha = 1;
  }
  function ringAt(cx, cy, size, rot, alpha = 1) {
    if (!ok(IMG.ring)) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.drawImage(IMG.ring, -size / 2, -size / 2, size, size); ctx.restore();
  }
  function drawGates() {
    for (const p of [0, TRACK]) {
      const sx = Math.round(p - S.d + HX + 16);
      if (sx < -60 || sx > W + 60) continue;
      ctx.globalAlpha = .16; R(C.teal, sx - 8, -VIEW_TOP, 20, GROUND + VIEW_TOP); ctx.globalAlpha = 1;
      R(C.teal, sx, -VIEW_TOP, 4, GROUND + VIEW_TOP);
      ringAt(sx + 2, 92, 64, S.anim / 18);
    }
  }
  // 벽의 IDIOTAPE 무대 그림: 설명 없이 그냥 벽에 걸려 있다가, 공연이 시작되면 테두리가 박자마다 조명 색으로 번쩍인다
  function drawSecret() {
    if (!liveLap(S.lap)) return;
    const sx = Math.round(SECRET_AT - S.d + HX);
    if (sx < -160 || sx > W) return;
    const k = liveK(), f = fpb(), kick = 1 - (S.beatT % f) / f;
    R(k ? LIVE_COL[Math.floor(S.beatT / f / 4) % 4] : C.out, sx - 3, 59, 156, 92); R('#000', sx - 1, 61, 152, 88);
    if (!ok(IMG.egg)) return;
    ctx.drawImage(IMG.egg, sx, 64);
    if (k) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .45 * k * kick; ctx.drawImage(IMG.egg, sx, 64); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  }
  /* ================= IDIOTAPE LIVE ================= */
  // 스펙트럼(i = 0 낮은 대역 … 15 높은 대역): 곡이 Web Audio로 흐르면 실제 주파수, 아니면 킥에 크게·높은 대역은 잘게 출렁이는 가짜 값
  const eq = (i, kick) => bgm.playing && bgm.buf ? Math.min(1, bgm.fq[Math.min(31, 1 + Math.floor(i * i / 8))] / 230) : Math.min(1, (i < 6 ? .35 + .65 * kick : .25 + .35 * kick) * (.6 + .4 * Math.abs(Math.sin(i * 1.3 + S.anim * (.08 + (i % 5) * .03)))));
  // 홀로그램 연주자: 박자 순간엔 타격 포즈(짝수·홀수 박마다 A/B 번갈아), 박 사이엔 기본 포즈 — 킥에 맞춰 내려치고, 킥마다 조명 색 잔상이 겹친다. 발밑엔 빛 무대
  function holo(n, x, k, kick, col) {
    const b = BAND[n]; if (!ok(IMG.band)) return;
    const fr = kick > .55 ? 1 + Math.floor(S.beatT / fpb()) % 2 : 0, m = [fr * b.w, b.y, b.w, b.h], y = GROUND - 2 - b.h;
    ctx.globalAlpha = .3 * k; R(col, x + 6, GROUND - 3, b.w - 12, 2);
    ctx.globalAlpha = .62 * k; pix(IMG.band, m, x, y);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .4 * k * kick; ctx.drawImage(tintPart(IMG.band, m, col), x + 2, y);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  // 공연 배경(월드 뒤쪽 — 장애물·주인공은 늘 그 위에 또렷하다): 마디마다 바뀌는 조명 색과 박자 펄스, 천장에서 흔들리는 무대 빔, 벽면 EQ
  function drawLiveBack() {
    const k = liveK(); if (!k) return;
    if (bgm.an && bgm.playing) bgm.an.getByteFrequencyData(bgm.fq);
    const f = fpb(), kick = 1 - (S.beatT % f) / f, bar = Math.floor(S.beatT / f / 4), col = LIVE_COL[bar % 4], top = -VIEW_TOP;
    ctx.globalAlpha = k * (.1 + .14 * kick * kick); R(col, 0, top, W, GROUND - top);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const x0 = W * (.14 + i * .24), x1 = x0 + Math.sin(S.anim / 28 + i * 1.7) * 90, len = 230;
      ctx.globalAlpha = k * (.06 + .08 * kick); ctx.fillStyle = LIVE_COL[(bar + i) % 4];
      ctx.beginPath(); ctx.moveTo(x0 - 2, top); ctx.lineTo(x0 + 2, top); ctx.lineTo(x1 + 22, top + len); ctx.lineTo(x1 - 22, top + len); ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    for (let x = 2, i = 0; x < W; x += 8, i++) { const h = Math.round(eq(i % 16, kick) * 26 * k); ctx.globalAlpha = .22 * k; R(LIVE_COL[(i >> 3) % 4], x, 176 - h, 6, h); }
    ctx.globalAlpha = 1;
  }
  // 홀로그램은 벽(무대 그림) 앞 공중에 뜬다 — 벽 다음, 장애물 전에 그린다
  function drawLiveHolo() {
    const k = liveK(); if (!k) return;
    const f = fpb(), kick = 1 - (S.beatT % f) / f, bar = Math.floor(S.beatT / f / 4);
    holo('synth', 0, k, kick, LIVE_COL[(bar + 1) % 4]);
    holo('drum', W - BAND.drum.w, k, kick, LIVE_COL[(bar + 2) % 4]);
  }
  // 공연 앞쪽(화면 가장자리만): 양 끝 LED EQ 기둥, HUD 사이 위쪽 스펙트럼, 테두리를 도는 체이스 라이트.
  // 마디 첫 박엔 3프레임 RGB 분리, 드롭 순간엔 강한 글리치 — 가운데 플레이 영역은 짧은 순간 말고는 덮지 않는다
  function drawLiveFront() {
    const k = liveK(); if (!k || mode !== 'play') return;
    const f = fpb(), ph = S.beatT % f, kick = 1 - ph / f, beatN = Math.floor(S.beatT / f), t = S.liveLen - S.live;
    for (const side of [0, 1]) {
      const lv = eq(side ? 3 : 1, kick) * k, x = side ? W - 7 : 1;
      for (let c = 0; c < 16 && c / 16 < lv; c++) { ctx.globalAlpha = .85; R(c > 12 ? C.pink : c > 8 ? C.yellow : C.glow, x, H - 8 - c * 16, 6, 12); }
    }
    for (let x = 112, i = 0; x < W - 112; x += 5, i++) { ctx.globalAlpha = .8; R(LIVE_COL[(i >> 2) % 4], x, 0, 4, Math.round(eq(i % 16, kick) * 7 * k)); }
    const P = 2 * (W + H);
    for (let j = 0; j < 28; j++) {
      const p = (j / 28 * P + S.anim * 3) % P, c = LIVE_COL[(j + beatN) % 4];
      const [x, y] = p < W ? [p, 0] : p < W + H ? [W - 3, p - W] : p < 2 * W + H ? [2 * W + H - p, H - 3] : [0, P - p];
      ctx.globalAlpha = k; R(c, x, y, 3, 3);
    }
    ctx.globalAlpha = 1;
    const drop = t >= S.liveIn - 2 && t < S.liveIn + 8, bar1 = beatN % 4 === 0 && ph < 3;
    if (drop || bar1) {
      const amp = drop ? 6 : 2;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (let i = 0; i < (drop ? 5 : 2); i++) {
        const y0 = Math.round(Math.random() * H * SY), h0 = Math.round((4 + Math.random() * 10) * SY);
        ctx.drawImage(cv, 0, y0, cv.width, h0, Math.round((Math.random() * 2 - 1) * amp * SX), y0, cv.width, h0);
      }
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (drop ? .45 : .28) * k; ctx.drawImage(cv, Math.round(amp * .6 * SX), 0);
      ctx.restore();
    }
  }
  function drawObs(o, sx, key, L, anim) {
    const t = o.t, base = GROUND;
    if (t === 'B') hz('bar', sx, base - 22);
    else if (t === 'W') hz('block', sx, base - 14);
    else if (t === 'T') hz('crate', sx, base - 38);
    else if (t === 'D') {
      const top = droneTop(o, L);
      hz('drone', sx, top);
      if ((anim >> 2) % 2) { ctx.globalAlpha = .5; R(C.glow, sx + 5, top + 16, 2, 3); R(C.glow, sx + 12, top + 16, 2, 3); ctx.globalAlpha = 1; }
    } else if (t === 'E') {
      if (gateOn(o)) {
        hz('gate', sx, base - 48);
        if ((anim >> 1) % 2) { ctx.globalAlpha = .3; R(C.glow, sx + 15, base - 46, 43, 44); ctx.globalAlpha = 1; }
      } else {
        pix(IMG.haz, [HZ.gate[0], 0, 15, 48], sx, base - 48); pix(IMG.haz, [HZ.gate[0] + 58, 0, 15, 48], sx + 58, base - 48);
        if (gateSoon(o) && (anim >> 1) % 2) for (let i = 0; i < 5; i++) R(C.white, sx + 18 + Math.random() * 36, base - 44 + Math.random() * 40, 2, 1);
      }
    } else if (t === 'S') jumpPad(sx, base, padCharge(sx), S.springT[key] || 0);
    else if (t === 'P') {
      // 무너진 상판 구멍: 검은 빈칸이 아니라 아래 도시가 보인다 (떨어지면 실제로 가는 곳)
      const w = wOf(o), bot = DECK + SLAB;
      ctx.save(); ctx.beginPath(); ctx.rect(sx, base, w, bot - base); ctx.clip();
      drawCity(base, bot);
      // 위는 상판 그늘로 어둡고, 아래로 갈수록 먼 거리의 불빛이 올라온다: 한눈에 '깊다'
      const g = ctx.createLinearGradient(0, base, 0, bot); g.addColorStop(0, 'rgba(2,6,10,.95)'); g.addColorStop(.35, 'rgba(2,6,10,0)'); g.addColorStop(1, 'rgba(25,211,197,.3)');
      ctx.fillStyle = g; ctx.fillRect(sx, base, w, bot - base);
      // 가장자리에서 부스러기가 계속 떨어진다: 지금도 무너지는 자리라는 경고, 빠른 속도에서도 눈에 걸리는 움직임
      for (let k = 0; k < 3; k++) { const ph = (anim + k * 16 + o.p) % 48; ctx.globalAlpha = 1 - ph / 48; R('#1a5e77', sx + 3 + (k * 11 + o.p) % (w - 6), base + ph, 1, 2); }
      ctx.globalAlpha = 1;
      ctx.restore();
      // 잘린 단면(어두움) + 아래 도시 불빛이 비추는 안쪽 모서리 + 삐져나온 철근
      R('#02090f', sx, base, 2, bot - base); R('#02090f', sx + w - 2, base, 2, bot - base);
      ctx.globalAlpha = .75; R(C.glow, sx + 2, base + 8, 1, bot - base - 8); R(C.glow, sx + w - 3, base + 8, 1, bot - base - 8); ctx.globalAlpha = 1;
      R(C.gray, sx + 1, base + 4, 4, 1); R(C.gray, sx + w - 4, base + 9, 3, 1); R(C.gray, sx + 1, DECK + 3, 3, 1); R(C.gray, sx + w - 3, DECK + 5, 2, 1);
      R('#1a5e77', sx, base, 3, 1); R('#1a5e77', sx + w - 3, base, 3, 1);
      for (let i = 0; i < 3; i++) R(i % 2 ? C.ink : C.yellow, sx - 12 + i * 4, base + 3, 4, 2);
    } else if (t === 'L') signboard(sx, base - SIGN_GAP, wOf(o), -VIEW_TOP, o.p, sx < HX + 150);
  }
  /* ================= 살아 있는 네온 간판 ================= */
  // 꺼진 그림 위에 켜진 그림을 겹친다. 박자마다 네온이 살짝 부풀고(음악에 맞춰 숨 쉬는 도시), 아주 가끔 접촉 불량처럼 꺼지고,
  // 더 드물게 VHS 트래킹처럼 한 줄이 밀리며 색이 번지고, 약 2.5초마다 CRT 주사선이 훑고 내려간다. 간판마다 seed가 달라 함께 깜빡이지 않는다
  // calm: 플레이어가 지금 읽어야 하는 간판은 깜빡이거나 찢어지지 않는다 · keep: 아래쪽에서 효과가 건드리지 않을 줄 수
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  function neonSign(k, x, y, seed, t, lit = 1, calm = false, keep = 0) {
    const m = SG[k], w = m[2], h = m[3] - keep;
    pix(IMG.signs, SG[k + 'o'], x, y);
    if (!calm && hash((t >> 2) * 1.31 + seed) < .03) lit *= .15;
    ctx.globalAlpha = lit; pix(IMG.signs, m, x, y);
    if (BEAT && lit > .5) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .25; pix(IMG.signs, m, x, y); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = 1;
    if (calm || !ok(IMG.signs)) return;
    const g = t >> 3;
    if (hash(g * .73 + seed * 1.7) < .015) {
      const r = 2 + Math.floor(hash(g + .5) * (h - 6)), bh = 2 + Math.floor(hash(g + .9) * 2), dx = hash(g + .3) < .5 ? -2 : 2;
      ctx.drawImage(IMG.signs, m[0], m[1] + r, w, bh, x + dx, y + r, w, bh);
      ctx.globalAlpha = .55; ctx.drawImage(sgTint(k + 'n', C.pink), 0, 0, w, h, x - 1, y, w, h); ctx.globalAlpha = 1;
    }
    const sl = (t + seed * 7) % 150;
    if (sl >= 3 && sl < h - 3) { ctx.globalAlpha = .16; R(C.white, x + 3, y + sl, w - 6, 1); ctx.globalAlpha = 1; }
  }
  // 낮은 간판: 천장에서 내려온 막대 두 개가 고정쇠를 잡고, 판 아래 노란 줄무늬의 가장자리가 부딪히는 선
  // 멀리 있을 땐 살아 있는 간판이지만, 다가와 높이를 재야 할 때는 또렷하게 멈추고, 줄무늬(판정 선)는 어떤 효과도 건드리지 않는다
  const LOW_ROD = { low64:[7, 52], low50:[6, 40], low36:[4, 29] };
  function signboard(x, bottom, w, top = 0, seed = 0, calm = false, t = S ? S.anim : 0) {
    const k = w >= 60 ? 'low64' : w >= 44 ? 'low50' : 'low36', m = SG[k];
    x = Math.round(x + (w - m[2]) / 2); const y = bottom + 1 - m[3];
    for (const rx of LOW_ROD[k]) { R(C.ink, x + rx, top, 4, y - top + 1); R('#3d5868', x + rx + 1, top, 2, y - top + 1); }
    neonSign(k, x, y, seed, t, 1, calm, 5);
  }
  /* ================= 점프대 ================= */
  // 장애물(회청색 금속 · 청록/빨강)과 다른 노란색: 밟은 뒤 나오는 BOING·불꽃과 같은 색이라 밟기 전부터 결과를 약속한다
  const PAD_UP = Math.round(SPRING * SPRING / (2 * GRAV)); // 점프대가 올려주는 높이
  function chevron(cx, y, c) { for (let r = 0; r < 5; r++) { R(c, cx - r - 1, y + r, 2, 2); R(c, cx + 1 + r, y + r, 2, 2); } }
  // 판: 바닥에 낮게 붙어 있다(넘을 물건이 아니라 밟을 바닥). 가까워지면 달아오르고, 밟으면 판이 튀어 오르며 스프링이 보인다
  // 그림의 0~3행은 위판(밟으면 튀어 오름), 4~7행은 바닥에 박힌 받침
  const PAD_TOP = [0, 0, 31, 4], PAD_BASE = [0, 4, 31, 4];
  function jumpPad(x, base, charge, t) {
    const lift = t ? Math.round(Math.sin(t / 10 * Math.PI) * 6) : 0, ready = charge > .8 && (S.anim >> 2) % 2;
    const px = x - 6, py = base - SG.pad[3], lit = .5 + .5 * charge;
    ctx.globalAlpha = .15 + .3 * charge; R(C.yellow, px + 2, base, 27, 2);
    ctx.globalAlpha = .06 + .14 * charge; R(C.yellow, px - 1, base + 2, 33, 3); ctx.globalAlpha = 1;
    sgPart('pado', PAD_BASE, px, py); ctx.globalAlpha = lit; sgPart('pad', PAD_BASE, px, py); ctx.globalAlpha = 1;
    for (let k = 0; k < lift; k++) R(k % 2 ? C.gray : C.yellow, x + 4 + (k % 2) * 6, py + 3 - k, 5, 1);
    sgPart('pado', PAD_TOP, px, py - lift); ctx.globalAlpha = lit; sgPart('pad', PAD_TOP, px, py - lift);
    if ((t || ready) && ok(IMG.signs)) { ctx.globalAlpha = .8; ctx.drawImage(sgTint('padn', C.white), 0, 0, 31, 4, px, py - lift, 31, 4); }
    ctx.globalAlpha = 1;
  }
  // 위로 오르는 화살표 기류: 방향(위)과 높이(실제로 떠오르는 높이까지만)를 보여준다
  function padBeam(x, base, key, charge) {
    const t = S.springT[key] || 0, top = base - PAD_UP, h = base - 8 - top, a0 = .1 + .14 * charge + (t ? .25 : 0);
    const g = ctx.createLinearGradient(0, base - 6, 0, top); g.addColorStop(0, `rgba(255,210,63,${a0.toFixed(3)})`); g.addColorStop(1, 'rgba(255,210,63,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 1, top, 21, base - 6 - top);
    const ph = S.padPh[key] || 0;
    for (let i = 0; i < 6; i++) {
      const p = mod(ph + i * h / 6, h);
      ctx.globalAlpha = Math.min(1, (1 - p / h) * (.45 + .5 * charge) + (t ? .3 : 0));
      chevron(x + 9, Math.round(base - 14 - p), t ? C.white : C.yellow);
    }
    ctx.globalAlpha = 1;
  }
  // 가드레일에 단 표지판: LOW 간판과 같은 짜임에 노란 네온. 처음 보는 사람에게 이름을 알려주는 길가 표지
  // 다가가면(charge) 밝아지고 화살표가 한 칸 위로 튀며 하얗게 깜빡인다. 읽어야 할 거리에선 깜빡임·글리치가 멈춘다
  const JUMP_ARROW = [6, 4, 7, 8];
  function jumpSign(padX, charge, seed) {
    const m = SG.jump, x = Math.round(padX - m[2] - 6), y = 120, rail = 178, post = y + m[3];
    R(C.ink, x + 22, post, 4, rail - post); R('#3d5868', x + 23, post, 2, rail - post);
    ctx.globalAlpha = .06 + .12 * charge; R(C.yellow, x - 3, y - 3, m[2] + 6, 21); ctx.globalAlpha = 1;
    neonSign('jump', x, y, seed, S.anim, .55 + .45 * charge, charge > .3, 4);
    if (charge > .5 && (S.anim >> 3) % 2 && ok(IMG.signs)) {
      ctx.globalAlpha = .8; ctx.drawImage(sgTint('jumpn', C.white), JUMP_ARROW[0], JUMP_ARROW[1], JUMP_ARROW[2], JUMP_ARROW[3], x + JUMP_ARROW[0], y + JUMP_ARROW[1] - 1, JUMP_ARROW[2], JUMP_ARROW[3]); ctx.globalAlpha = 1;
    }
  }
  function drawWorldObjects() {
    eachObs((o, sx, key, L) => { if (o.t === 'P') drawObs(o, sx, key, L, S.anim); });
    eachObs((o, sx, key) => { if (o.t === 'S') { const c = padCharge(sx); jumpSign(sx, c, o.p); padBeam(sx, GROUND, key, c); } }, 70);
    for (const off of [0, TRACK]) {
      const L = off ? S.lap + 1 : S.lap;
      for (let i = 0; i < PICK.length; i++) {
        if (S.got.has(L + ':' + i)) continue;
        const k = PICK[i], sx = Math.round(k.p + off - S.d + HX);
        if (sx < -12 || sx > W + 12) continue;
        hz('cas', sx - 8, GROUND - k.h - 10 + Math.round(Math.sin((S.anim + k.p) / 9)));
      }
    }
    eachObs((o, sx, key, L) => { if (o.t !== 'P') { drawObs(o, sx, key, L, S.anim); if (o.tangle) tangleFx(o, sx); } });
    for (const d of S.debris) hz('broken', d.x, d.y);
  }
  function drawCars() {
    for (const car of S.cars) {
      if (car.t < car.warn) {
        const blink = (car.t >> 3) % 2;
        ctx.globalAlpha = .22 + .2 * blink;
        const grad = ctx.createLinearGradient(0, 0, 100, 0); grad.addColorStop(0, '#fff6c8'); grad.addColorStop(1, 'rgba(255,246,200,0)');
        ctx.fillStyle = grad; ctx.fillRect(0, GROUND - 24, 100, 22); ctx.globalAlpha = 1;
        if (blink) pix(IMG.haz, HZ.sign, 10, GROUND - 52, 19, 26);
      } else {
        hz('car', car.x, GROUND - 18);
        ctx.globalAlpha = .5; R('#fff6c8', car.x + 52, GROUND - 12, 34, 2); ctx.globalAlpha = 1;
      }
    }
  }
  // 잔상 = 테이프에 겹쳐 녹음된 지난 루프의 나. 바퀴를 마칠 때마다 하나씩(최대 3) 뒤에서 그 바퀴의 움직임을 그대로 다시 달린다
  // 청록 실루엣은 이것만 뜻한다: 몇 개가 따라오는지가 곧 남은 보호막 수(대신 맞기)
  function drawGhosts() {
    if (!TINT) return;
    S.ghosts.forEach((g, i) => {
      const p = S.d - (HX - g.x);
      const hgt = p >= 0 ? (g.rec[Math.floor(mod(p, TRACK) / 4)] || 0) : 0;
      const f = hgt > .5 ? 6 : runFrame(S.anim + (i + 1) * 4, speedOf());
      if (echoSlot(i) - g.x > 3) {
        ctx.globalAlpha = .45;
        for (let k = 0; k < 4; k++) R(C.glow, g.x - 24 - k * 9 - (S.anim * 4 + k * 13) % 14, GROUND - hgt - 32 + k * 7, 18 + k * 5, 1);
      }
      ctx.globalAlpha = .55 - .13 * i;
      heroFrame(TINT[C.teal], f, g.x, GROUND - hgt);
      if (g.flash) { ctx.globalAlpha = g.flash / 16 * .8; heroFrame(TINT[C.white], f, g.x, GROUND - hgt); }
      // 새로 합류한 잔상에 잠깐 이름표
      if (i === 0 && S.echoIn > 0 && !S.loopFx) { ctx.globalAlpha = Math.min(1, S.echoIn / 30); txt('ECHO', g.x, GROUND - hgt - 50, C.glow, 8, 'center'); }
    });
    ctx.globalAlpha = 1;
  }
  // 대신 맞기: 잔상이 하얗게 달려들어 내 몸에 부딪히고, 루프 고리 모양으로 흩어진다
  function drawGuardFx() {
    const g = S.guardFx; if (!g || !TINT) return;
    const k = Math.min(1, (16 - g.t) / 5), x = g.x + (HX - g.x) * k;
    ctx.globalAlpha = .85 * g.t / 16; heroFrame(TINT[C.white], 6, x, S.y);
    ringAt(HX, S.y - 19, 18 + (16 - g.t) * 5, (16 - g.t) / 4, g.t / 16 * .9);
    ctx.globalAlpha = 1;
  }
  function drawHero(o) {
    const { y, f, hist, speed, anim, blink, fever } = o;
    if (o.fall) {
      // 떨어질 땐 잔상이 위로 남고(되감길 땐 아래로) 몸이 앞으로 기운다: 스스로 뛴 점프와 구분되는 실수의 자세
      const dy = (S.rw ? -1 : 1) * Math.min(18, S.vy * 2.2);
      if (TINT) for (let i = 3; i >= 1; i--) { ctx.globalAlpha = .34 - i * .08; heroFrame(TINT[C.teal], f, HX, y - i * dy); }
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(HX, y - 19); ctx.rotate(Math.min(.45, (y - GROUND) / 600)); ctx.translate(-HX, 19 - y);
      heroFrame(IMG.hero, f, HX, y); ctx.restore();
      return;
    }
    // 몸 뒤 색 잔상은 BREAK(무지개 · 무적)와 OVERDRIVE(노랑·분홍 · 가속) 표시로만 쓴다. 평소 청록 실루엣은 '지난 루프의 나'만 뜻한다
    const trail = fever ? FEVER : o.drive ? [C.yellow, C.pink, C.white] : null;
    const col = i => trail ? trail[(i + (anim >> 2)) % 3] : C.teal;
    if (TINT && trail) {
      for (let i = 4; i >= 1; i--) {
        const hy = hist && hist.length ? hist[Math.max(0, hist.length - 1 - i * 3)] : y;
        ctx.globalAlpha = .5 - i * .08;
        heroFrame(TINT[col(i)], f, HX - i * 8, hy);
      }
    }
    // FF DASH: 하얀 빨리감기 자국이 길게 끌리고 앞에 ▶▶ (청록 실루엣 = 잔상과 섞이지 않게 흰색)
    if (S && S.ff > 0 && TINT) {
      for (let i = 3; i >= 1; i--) { ctx.globalAlpha = .5 - i * .12; heroFrame(TINT[C.white], f, HX - i * 12, y); }
      ctx.globalAlpha = 1;
      for (const ax of [HX + 16, HX + 21]) for (let r = 0; r < 5; r++) R(C.white, ax, y - 26 + r, r <= 2 ? r + 1 : 5 - r, 1);
    }
    const lines = trail ? 6 : speed > 3.8 ? 5 : 3;
    ctx.globalAlpha = trail ? .7 : .45;
    for (let k = 0; k < lines; k++) {
      const len = 10 + ((anim * 7 + k * 23) % 26);
      R(col(k), HX - 20 - len - ((anim * 3 + k * 17) % 22), y - 6 - ((k * 9 + (anim >> 1)) % 26), len, 1);
    }
    ctx.globalAlpha = 1;
    if (!blink) heroFrame(IMG.hero, f, HX, y);
  }
  const heroPose = () => (S.falling > 0 || !S.ground) ? (S.spin > 0 ? 7 : 6) : runFrame(S.anim, speedOf());

  /* ================= HUD: 게임 장면 이미지와 같은 구성 ================= */
  function bar(frame, slots, x, y, frac, col) {
    hi(IMG.hud, HU[frame], x, y);
    const total = slots.length * frac;
    slots.forEach(([a, b], i) => {
      const f = Math.max(0, Math.min(1, total - i)); if (f <= 0) return;
      const w = (b - a) / 2 * f, sx = x + a / 2, sy = y + 3.5;
      if (col) { ctx.globalAlpha = .92; R(col, sx, sy, w, 5); ctx.globalAlpha = 1; }
      else if (ok(IMG.hud)) ctx.drawImage(IMG.hud, HU.seg[0] + 3, HU.seg[1] + 3, HU.seg[2] - 6, HU.seg[3] - 6, sx, sy, w, 5);
    });
  }
  function drawHUD() {
    const fever = S.climax > 0, fcol = fever ? FEVER[(S.anim >> 2) % 3] : S.drive > 0 ? C.yellow : S.pick ? ((S.pick.t >> 2) % 2 ? C.white : C.yellow) : null;
    hi(IMG.hud, HU.portrait, 6, 6);
    bar('bar5', SLOT5, 33, 8, S.hp / HPMAX, S.hp <= 1 && (S.anim >> 3) % 2 ? C.red : null);
    txt('HP', 34, 21, C.mist, 8, 'left', null);
    const mult = Math.min(5, 1 + Math.floor(S.combo / 8));
    if (mult > 1) num('x' + mult, 80, 10, C.yellow, 8);
    hi(IMG.hud, HU.arm, 6, H - 30);
    bar('bar10', SLOT9, 33, H - 21, S.gauge / GAUGE, fcol);
    txt(S.pick ? 'CHOOSE' : S.drive > 0 ? 'OVERDRIVE' : 'CLIMAX', 34, H - 31, fcol || C.mist, 8, 'left', null);
    const rx = W - 32, ry = 4, prog = Math.max(0, Math.min(1, S.d / TRACK));
    hi(IMG.hud, HU.ring0, rx, ry);
    if (ok(IMG.hud)) {
      ctx.save(); ctx.beginPath(); ctx.moveTo(rx + 13, ry + 12.5); ctx.arc(rx + 13, ry + 12.5, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog); ctx.closePath(); ctx.clip();
      hi(IMG.hud, HU.ring1, rx, ry); ctx.restore();
    }
    num(String(S.lap), rx + 13, ry + 9, C.white, 8, 'center');
    txt('LOOP', rx - 4, ry + 8, C.mist, 8, 'right', null);
    num(String(score()).padStart(7, '0'), W - 8, ry + 30, C.white, 8, 'right');
  }

  /* ================= 대기 화면: 표지 그림 + 뒷면 특징 목록 형식 ================= */
  /* ================= CLIMAX 선택 ================= */
  // 선택 UI: 주인공 둘레에 카세트 데크 버튼 세 개가 차례로 깜빡이며 켜진다(↑ PURIFY · ← BREAK · → OVERDRIVE). 둘레 링이 남은 시간
  const KEY_AT = { up:[0, -46], left:[-44, 0], right:[44, 0] };
  function keycap(dir, x, y, lit, col) {
    x = Math.round(x - 12); y = Math.round(y - 12);
    pix(IMG.keys, KY[dir + 'o'], x, y);
    if (lit <= 0 || !ok(IMG.keys)) return;
    const neon = tintPart(IMG.keys, KY[dir + 'n'], col);
    ctx.globalAlpha = lit; pix(IMG.keys, KY[dir], x, y); ctx.drawImage(neon, x, y);
    ctx.globalAlpha = lit * .35; for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(neon, x + ox, y + oy);
    ctx.globalAlpha = 1;
  }
  const keyPos = dir => { const [dx, dy] = KEY_AT[dir]; return [HX + dx, Math.max(38, Math.round(S.y + VIEW_TOP - S.cam) - 19 + dy)]; };
  function drawPick() {
    if (!S.pick || S.rw || mode !== 'play') return;
    const t = S.pick.t, cx = HX, cy = Math.round(S.y + VIEW_TOP - S.cam) - 19;
    ctx.globalAlpha = .7; ctx.strokeStyle = C.white; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, 26, -Math.PI / 2, -Math.PI / 2 + (1 - t / PICK_T) * Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1; ringAt(cx, cy, 64, t / 10, .2);
    Object.keys(POWERS).forEach((dir, i) => {
      const p = POWERS[dir], dis = dir === 'up' && !canPurify(), [x, y] = keyPos(dir);
      const on = t < 4 + i * 4 ? 0 : t < 14 + i * 4 ? ((t >> 1) % 2 ? 1 : .3) : 1;
      keycap(dir, x, y, dis ? 0 : on, p.col);
      const lc = dis ? '#3c4a52' : p.col;
      if (dir === 'up') txt(p.name, x, y - 22, lc, 8, 'center');
      else if (dir === 'left') txt(p.name, x - 15, y - 4, lc, 8, 'right');
      else txt(p.name, x + 15, y - 4, lc, 8, 'left');
    });
  }
  // 고른 순간: 고른 버튼만 네온이 켜진 채 남고 나머지는 꺼지며, CRT가 휘청이고 색이 번진 뒤 능력 이름이 크게 떴다 사라진다
  function drawPickFx() {
    const f = S.pickFx; if (!f) return;
    const k = 48 - f.t, p = POWERS[f.dir];
    if (k < 14) {
      const amp = (14 - k) / 14 * 4;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (let y = 0; y < H; y += 6) {
        const y0 = Math.round(y * SY), h0 = Math.round((y + 6) * SY) - y0;
        ctx.drawImage(cv, 0, y0, cv.width, h0, Math.round(Math.sin(y * .09 + k * .9) * amp * SX), y0, cv.width, h0);
      }
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .22 * (14 - k) / 14; ctx.drawImage(cv, Math.round(3 * SX), 0);
      ctx.restore();
    }
    if (k < 18) Object.keys(POWERS).forEach(dir => {
      const [x, y] = keyPos(dir);
      if (dir === f.dir) keycap(dir, x, y, 1, p.col);
      else { ctx.globalAlpha = Math.max(0, 1 - k / 8); pix(IMG.keys, KY[dir + 'o'], Math.round(x - 12), Math.round(y - 12)); ctx.globalAlpha = 1; }
    });
    const ny = H / 2 - 44, s = k < 6 ? 1 + (6 - k) * .1 : 1;
    ctx.globalAlpha = Math.min(1, f.t / 10);
    ctx.save(); ctx.translate(W / 2, ny); ctx.scale(s, s);
    txt(p.name, -2, 0, C.pink, 24, 'center', null); txt(p.name, 2, 0, C.glow, 24, 'center', null); txt(p.name, 0, 0, p.col, 24, 'center');
    ctx.restore();
    ktxt(p.k, W / 2, ny + 30, C.paper, 11, 'center', 700);
    if (f.sub) txt(f.sub + ' OFF', W / 2, ny + 48, C.mist, 8, 'center');
    ctx.globalAlpha = 1;
  }
  // PURIFY: 테이프 헤드를 닦듯 밝은 줄이 왼쪽에서 오른쪽으로 화면을 훑는다
  function drawCleanFx() {
    if (!S.cleanFx) return;
    const x = Math.round((1 - S.cleanFx / 40) * (W + 24)) - 12;
    ctx.globalAlpha = .12; R(C.glow, 0, 0, x, H); ctx.globalAlpha = .45; R(C.white, x - 8, 0, 8, H); ctx.globalAlpha = 1; R(C.white, x, 0, 2, H);
  }
  // ▲▼ 작은 픽셀 삼각형 (테이프 마모 표·라벨)
  const tri = (x, y, up, c) => { for (let r = 0; r < 4; r++) R(c, x + (up ? 3 - r : r), y + r, (up ? r : 3 - r) * 2 + 1, 1); };
  // 새 마모 단계가 시작되면 위쪽에 카세트 라벨처럼: 무엇이 닳았고(▼) 무엇을 얻었는지(▲)
  function drawTapeCard() {
    const t = TAPE[stage()], g = TAPE[wearMax()]; if (!g || S.tapeCard <= 0 || S.loopFx || S.banner > 0 || mode !== 'play') return;
    const w = 272, x = Math.round(W / 2 - w / 2), y = 34;
    ctx.globalAlpha = Math.min(1, S.tapeCard / 20, (240 - S.tapeCard) / 12);
    R(C.ink, x + 2, y + 2, w, 46); R(C.ink, x - 1, y - 1, w + 2, 48); R('#0a1c26', x, y, w, 46); R(C.teal, x, y, w, 2);
    txt('LOOP ' + S.lap + '  TAPE WEAR', x + 6, y + 5, C.mist, 8, 'left', null);
    if (t) { tri(x + 6, y + 21, false, C.pink); txt(t.bad, x + 16, y + 19, C.pink, 8, 'left', null); ktxt(t.badK, x + 92, y + 17, C.paper, 11, 'left', 700); }
    tri(x + 6, y + 34, true, C.glow); txt(g.good, x + 16, y + 32, C.glow, 8, 'left', null); ktxt(g.goodK, x + 92, y + 30, C.white, 11, 'left', 700);
    ctx.globalAlpha = 1;
  }
  function feature(nn, title, desc, x, y, icon) {
    R(C.ink, x + 2, y + 2, 18, 18); R(C.deep, x, y, 18, 18);
    num(nn, x + 9, y + 5, C.white, 8, 'center');
    ktxt(title, x + 28, y - 1, C.white, 13, 'left', 900);
    ktxt(desc, x + 28, y + 16, C.mist, 11, 'left', 700);
    if (icon) icon(x + 300, y + 10);
  }
  function dotted(x0, y) { for (let x = x0 - 4; x < x0 + 361; x += 4) R('#1d4a52', x, y, 2, 1); }
  function renderAttract() {
    BEAT = false;
    const page = Math.floor(attractT / 480) % 5;
    playTitle(page === 0);
    if (page === 0) {
      if (titleVideo.readyState >= 2) cover(titleVideo, titleVideo.videoWidth, titleVideo.videoHeight);
      else if (ok(IMG.title)) cover(IMG.title, IMG.title.width, IMG.title.height); else R(C.night, 0, 0, W, H);
      const g = ctx.createLinearGradient(0, H - 136, 0, H); g.addColorStop(0, 'rgba(2,6,10,0)'); g.addColorStop(1, 'rgba(2,6,10,.92)');
      ctx.fillStyle = g; ctx.fillRect(0, H - 136, W, 136);
      let x = 10; x += chip('RUNNER', x, 10, C.teal) + 8; chip('1 PLAYER', x, 10, C.white);
      if (ok(IMG.logo)) ctx.drawImage(IMG.logo, W / 2 - 160, H - 108, 320, 67);
      txt('IDT-TOLD-S1-KOR', W - 8, H - 12, C.mist, 8, 'right', null);
      if ((attractT >> 5) % 2 === 0) txt('PRESS START', W / 2, H - 26, C.paper, 8, 'center');
    } else {
      ctx.save(); ctx.translate(0, VIEW_TOP); drawBG(attractScroll, 2.6, false, attractT, false); ctx.restore();
      dim(.88);
      const oy = (H - DECK) / 2;
      if (page === 1 || page === 2) {
        word('how', W / 2, 10 + oy);
        const list = page === 1
          ? [['01', K.t1, K.d1, (x, y) => TINT && heroFrame(TINT[C.teal], 6, x, y + 18)], ['02', K.t2, K.d2, (x, y) => signboard(x - 18, y + 8, 36, y - 16, 3, false, attractT)],
             ['03', K.t3, K.d3, (x, y) => hz('drone', x - 10, y - 4)], ['04', K.t4, K.d4, (x, y) => pix(IMG.haz, HZ.sign, x - 6, y - 8)]]
          : [['05', K.t5, K.d5, (x, y) => pix(IMG.haz, HZ.gate, x - 18, y - 12, 37, 24)], ['06', K.t6, K.d6, (x, y) => ringAt(x, y + 2, 26, attractT / 20)], ['07', K.t7, K.d7, (x, y) => hz('cas', x - 8, y - 2)],
             ['08', K.t8, K.d8, (x, y) => { if (!TINT) return; ctx.globalAlpha = .3; heroFrame(TINT[C.teal], 1, x - 16, y + 18); ctx.globalAlpha = .55; heroFrame(TINT[C.teal], 1, x - 5, y + 18); ctx.globalAlpha = 1; heroFrame(IMG.hero, 1, x + 7, y + 18); }]];
        const dense = list.length > 3, step = dense ? 40 : 50, lx = Math.round(W / 2 - 178);
        list.forEach(([nn, t, d, ic], i) => { const y = (dense ? 46 : 56) + oy + i * step; feature(nn, t, d, lx, y, ic); if (i < list.length - 1) dotted(lx, y + (dense ? 33 : 40)); });
        if (page === 1) txt('SPACE = JUMP', W / 2, 206 + oy, '#3c6a74', 8, 'center', null);
        else txt('ARROW KEYS = CLIMAX CHOICE', W / 2, 206 + oy, '#3c6a74', 8, 'center', null);
      } else if (page === 3) {
        // 테이프 마모 표: 바퀴마다 무엇이 닳고(▼) 무엇이 생기는지(▲)
        txt('TAPE WEAR', W / 2, 12 + oy, C.teal, 16, 'center');
        ktxt(K.tw, W / 2, 34 + oy, C.mist, 11, 'center', 700);
        const lx = Math.round(W / 2 - 178);
        for (let i = 1; i <= 4; i++) {
          const t = TAPE[i], y = 58 + oy + (i - 1) * 42;
          chip(i < 4 ? 'LOOP ' + (i + 1) : 'LOOP 5+', lx, y + 6, C.teal);
          tri(lx + 70, y + 3, false, C.pink); txt(t.bad, lx + 80, y + 1, C.pink, 8, 'left', null); ktxt(t.badK, lx + 150, y - 1, C.paper, 11, 'left', 700);
          tri(lx + 70, y + 19, true, C.glow); txt(t.good, lx + 80, y + 17, C.glow, 8, 'left', null); ktxt(t.goodK, lx + 150, y + 15, C.white, 11, 'left', 700);
          if (i < 4) dotted(lx, y + 36);
        }
      } else {
        // PRESS START 위 빈 공간의 가운데에 기록 묶음을 둔다
        const by = Math.round((H - 35) / 2) - 35;
        txt('BEST SCORE', W / 2, by, C.teal, 16, 'center');
        num(String(best).padStart(7, '0'), W / 2, by + 32, C.white, 16, 'center');
        txt('BEST LOOP ' + bestLoop, W / 2, by + 62, C.mist, 8, 'center');
      }
      for (let i = 0; i < 5; i++) R(i === page ? C.teal : '#173544', 10 + i * 8, H - 12, 5, 5);
      if ((attractT >> 5) % 2 === 0) txt('PRESS START', W / 2, H - 26, C.paper, 8, 'center');
    }
  }

  /* ================= 화면 그리기 ================= */
  function drawRewindFx() {
    ctx.globalAlpha = .28; R('#0b2a33', 0, 0, W, H); ctx.globalAlpha = 1;
    for (let i = 0; i < 6; i++) { const y = (S.anim * 7 + i * 47) % H; ctx.globalAlpha = .25; R(C.white, 0, y, W, 1 + (i % 2)); }
    ctx.globalAlpha = .7;
    for (let i = 0; i < 3; i++) { const y = (S.anim * 13 + i * 90) % H; R('#cfeee9', Math.random() * 40, y, W, 2); }
    ctx.globalAlpha = 1;
    if ((S.anim >> 3) % 2 === 0) { chip('<< REWIND', W / 2 - 34, 40, C.white); }
  }
  function drawLoopFx() {
    const t = 1 - S.loopFx / 70, size = 60 + t * 520, a = Math.max(0, 1 - t * 1.1);
    ringAt(W / 2, H / 2 - 10, size, t * 6, a);
    if (TINT && t < .7) {
      for (let i = 0; i < 8; i++) {
        const ang = t * 7 + i * Math.PI / 4, r = size * .36;
        ctx.globalAlpha = a * .8; heroFrame(TINT[C.teal], (i + (S.anim >> 2)) % 6, W / 2 + Math.cos(ang) * r, H / 2 + 8 + Math.sin(ang) * r * .8, .7);
      }
      ctx.globalAlpha = 1;
    }
    if (S.loopFx > 18) { word('loop', W / 2 - 16, H / 2 - 42); num(String(S.lap), W / 2 + 46, H / 2 - 34, C.white, 16, 'center'); }
  }
  function render() {
    ctx.setTransform(SX, 0, 0, SY, 0, 0); ctx.imageSmoothingEnabled = false;
    if (mode === 'attract') { renderAttract(); return; }
    playTitle(false);
    const fever = S.climax > 0, beat = (S.beatT % fpb()) < 4, cam = Math.round(S.cam);
    BEAT = beat && !S.rw; BEATP = (S.beatT % fpb()) / fpb(); LAMP = fever ? FEVER[(S.anim >> 3) % 3] : C.teal;
    const pits = []; eachObs((o, sx) => { if (o.t === 'P') pits.push([sx, wOf(o)]); });
    ctx.save();
    if (S.shake > 0) ctx.translate(Math.round((Math.random() - .5) * 5), Math.round((Math.random() - .5) * 4));
    else if (liveK() > .3 && S.beatT % fpb() < 2) ctx.translate(Math.round(Math.random() * 2 - 1), Math.round(Math.random() * 2 - 1));
    ctx.translate(0, VIEW_TOP - cam);
    drawBG(S.total, S.falling || cam ? 0 : speedOf(), fever, S.anim, beat && !S.rw);
    drawLiveBack();
    drawUnderDeck(pits);
    drawSecret(); drawLiveHolo(); drawGates(); drawWorldObjects(); drawDropout();
    if (S.pick && !S.rw) { ctx.globalAlpha = .4; R('#02060a', 0, cam - VIEW_TOP, W, H); ctx.globalAlpha = 1; }
    drawGhosts(); drawGuardFx(); drawBeatGuide();
    const hero = { y:S.y, f:heroPose(), hist:S.rw ? null : S.hist, speed:speedOf(), anim:S.anim, blink:S.inv > 0 && !fever && (S.inv >> 2) % 2 === 1, fever, drive:S.drive > 0 };
    if (S.falling > 0 || S.y > GROUND) {
      // 도로 위 + 구멍 안 + 상판 아래에서만 보인다 (도로 단면 속으로 파묻혀 보이지 않게)
      ctx.save(); ctx.beginPath(); ctx.rect(0, -H, W, GROUND + H);
      for (const [px, pw] of pits) ctx.rect(px, GROUND, pw, DECK + SLAB - GROUND);
      ctx.rect(0, DECK + SLAB, W, H + CAM_MAX); ctx.clip();
      drawHero({ ...hero, blink:false, hist:null, fall:true }); ctx.restore();
    }
    else drawHero(hero);
    drawCars();
    for (const p of S.parts) R(p.c, p.x, p.y, 2, 2);
    ctx.restore();
    drawFallFx();
    drawTapeNoise(); drawTangle(); drawLiveFront();
    if (mode === 'play' && dropOn() && (S.anim >> 3) % 2) txt('NO SIGNAL', W / 2, 40, C.white, 8, 'center');
    if (S.slow > 0 && !S.loopFx) { ctx.globalAlpha = .12; R(C.white, 0, 0, W, H); ctx.globalAlpha = 1; }
    if (S.loopFx > 0) drawLoopFx();
    if (S.rw) drawRewindFx();
    drawHUD();
    drawTapeCard();
    drawCleanFx();
    drawPick();
    for (const p of S.pops) txt(p.text, p.x, p.y + VIEW_TOP - cam, p.c, 8, 'center');
    if (fever) { const c = FEVER[(S.anim >> 2) % 3]; R(c, 0, 0, W, 2); R(c, 0, H - 2, W, 2); R(c, 0, 0, 2, H); R(c, W - 2, 0, 2, H); }
    if (S.drive > 0) { const c = (S.anim >> 2) % 2 ? C.yellow : C.pink; R(c, 0, 0, W, 2); R(c, 0, H - 2, W, 2); }
    if (S.flash > 0) { ctx.globalAlpha = S.flash / 10 * .6; R(C.white, 0, 0, W, H); ctx.globalAlpha = 1; }
    if (mode === 'play') drawPickFx();
    if (mode === 'play') {
      if (S.intro > 40) { if ((S.intro >> 3) % 2) word('ready', W / 2, H / 2 - 44); }
      else if (S.intro > 0) word('go', W / 2, H / 2 - 44);
      else if (S.banner > 0 && !S.loopFx) {
        if (S.bannerWord) word(S.bannerWord, W / 2, H / 2 - 52);
        if ((S.banner >> 3) % 2 === 0) txt(S.sub, W / 2, H / 2 - 4, C.white, 8, 'center');
      }
    }
    if (mode === 'pause') { dim(.6); txt('PAUSED', W / 2, H / 2 - 32, C.white, 16, 'center'); ktxt(K.pause, W / 2, H / 2 - 4, C.mist, 12, 'center', 700); }
    if (mode === 'over') {
      dim(Math.min(.7, S.overT / 40));
      if (S.overT > 20) {
        const cy = H / 2;
        word('over', W / 2, cy - 88);
        txt('SCORE', W / 2 - 60, cy - 32, C.mist, 8); num(String(score()).padStart(7, '0'), W / 2 + 70, cy - 32, C.white, 8, 'right');
        txt('BEST', W / 2 - 60, cy - 16, C.mist, 8); num(String(best).padStart(7, '0'), W / 2 + 70, cy - 16, C.white, 8, 'right');
        txt('LOOP', W / 2 - 60, cy, C.mist, 8); num(String(S.lap), W / 2 + 70, cy, C.white, 8, 'right');
        if (newRecord) txt('NEW RECORD', W / 2, cy + 32, C.teal, 8, 'center');
        if (S.overT > 45 && (S.overT >> 5) % 2 === 0) txt('PRESS START', W / 2, cy + 80, C.paper, 8, 'center');
      }
    }
  }

  /* ================= 실행 ================= */
  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(100, now - last); last = now;
    while (acc >= STEP) { update(); acc -= STEP; }
    render();
    requestAnimationFrame(frame);
  }
  const go = () => { makeTints(); KCACHE.clear(); requestAnimationFrame(t => { last = t; frame(t); }); };
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.all([document.fonts.load('700 8px Silkscreen'), document.fonts.load('8px "Press Start 2P"'), document.fonts.load('900 12px "Noto Sans KR"', Object.values(K).join('')), document.fonts.load('700 12px "Noto Sans KR"', Object.values(K).join(''))])
    : Promise.resolve();
  Promise.race([Promise.all([fontsReady, assetsReady]), new Promise(r => setTimeout(r, 3500))]).then(go, go);
})();
