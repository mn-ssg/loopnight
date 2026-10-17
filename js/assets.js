
  /* ================= 그림: 표지·게임 장면 이미지를 참고로 Higgsfield에서 뽑아 다듬은 것 ================= */
  const load = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(i); i.src = src; });
  const IMG = {};
  const FILES = { hero:'images/hero.png', bg:'images/bg.png', haz:'images/haz.png', hud:'images/hud.png', words:'images/words.png', ring:'images/ring.png', logo:'images/logo.png', egg:'images/egg.png', under:'images/under.png', signs:'images/signs.png', keys:'images/keys.png', band:'images/band.png', hero_x:'images/hero_x.png', gate:'images/gate.png' };
  // under.png: bg.png·표지를 참고로 Higgsfield에서 뽑은 고가도로 아래 도시. 0~TRUSS행은 상판 밑 트러스, 그 아래는 협곡
  const assetsReady = Promise.all(Object.entries(FILES).map(([k, f]) => load(f).then(i => { IMG[k] = i; })));
  // logo.png · words.png: 새 로고와 게임 스프라이트를 참고로 Higgsfield에서 한 장에 함께 뽑은 픽셀 글자 세트(같은 글꼴).
  // 실제 픽셀 격자를 찾아 1칸 = 게임 1픽셀로 다시 찍고 게임 팔레트로 맞춘 것 — 위는 흰색, 아래는 옅은 청록, 남색 외곽선, LOOP의 O는 카세트 릴
  const HZ = { drone:[0,0,19,16], bar:[21,0,25,22], crate:[48,0,27,38], block:[77,0,27,14], spring:[106,0,19,12], gate:[127,0,73,48], sign:[202,0,13,18], car:[217,0,52,18], broken:[271,0,18,9], cas:[291,0,16,10] };
  const HU = { portrait:[0,0,51,48], bar10:[53,0,151,22], seg:[206,0,42,14], ring0:[250,0,52,50], ring1:[304,0,51,50], arm:[357,0,48,48], bar5:[407,0,82,22] };
  const WD = { over:[0, 0, 154, 19], how:[156, 0, 182, 19], perfect:[340, 0, 130, 19] };
  // signs.png: 위험물 스프라이트·배경·표지를 참고로 Higgsfield에서 뽑은 간판과 점프대
  // o = 네온만 꺼진 같은 그림(깜빡임용) · n = 네온 픽셀만 남긴 흰 마스크(색 번짐·반짝임을 네온에만 입히려고)
  const SG = { low64:[0,0,64,23], low64o:[65,0,64,23], low50:[130,0,50,18], low50o:[181,0,50,18], low36:[232,0,36,13], low36o:[269,0,36,13],
               jump:[306,0,48,19], jumpo:[355,0,48,19], pad:[404,0,31,8], pado:[436,0,31,8], rw:[468,0,20,75], rwo:[489,0,20,75],
               low64n:[510,0,64,23], low50n:[575,0,50,18], low36n:[626,0,36,13], jumpn:[663,0,48,19], padn:[712,0,31,8], rwn:[744,0,20,75] };
  // keys.png: Higgsfield로 뽑은 카세트 데크 버튼(↑)을 ←/→로 돌린 것. 방향마다 켜짐 · o 꺼짐 · n 네온 마스크(능력 색을 입힘)
  const KY = { up:[0,0,24,24], upo:[25,0,24,24], upn:[50,0,24,24], left:[75,0,24,24], lefto:[100,0,24,24], leftn:[125,0,24,24],
               right:[150,0,24,24], righto:[175,0,24,24], rightn:[200,0,24,24] };
  // gate.png: bg.png·간판을 스타일 참고로 Higgsfield에서 뽑은 Loop Gateway 부품 — 천장 마운트(링 중심 28,80) · 카세트 릴 · 바닥 받침(링 중심 36,25)
  const GT = { mount:[0, 0, 56, 109], reel:[57, 0, 40, 40], base:[98, 0, 73, 68] };
  // hero_x.png: hero.png 8프레임을 참고로 Higgsfield에서 뽑은 변신 형태(TAPE-RUNNER) — 바이저 눈 · 머리끝 발광, 몸을 두른 네온 회로, 뒤로 흩어지는 노이즈 픽셀
  // 윗줄(0~CH) = 변신한 몸, 아랫줄(CH~2CH) = 네온 픽셀만 남긴 흰 마스크(능력 색을 입힌다). 프레임 배치는 hero.png와 같다
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
  const word = (n, cx, y) => pix(IMG.words, WD[n], Math.round(cx - WD[n][2] / 2), y); // 픽셀 글자는 1:1, 정수 위치에만

  const CW = 37, CH = 38;
  let TINT = null, XTINT = null;
  // 그림의 한 줄(sy부터 CH 높이)을 한 색으로 칠한 사본
  function tintRow(img, sy, col) {
    const c = document.createElement('canvas'); c.width = img.width; c.height = CH;
    const g = c.getContext('2d'); g.drawImage(img, 0, sy, img.width, CH, 0, 0, img.width, CH);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, CH);
    return c;
  }
  function makeTints() {
    const x = IMG.hero_x;
    // 변신 네온: 능력마다 다른 색 · 흰색 몸 실루엣은 변신 순간 번쩍임용
    if (ok(x)) { XTINT = { body:tintRow(x, 0, C.white) }; for (const col of [C.pink, C.white, C.yellow, C.red, C.glow]) XTINT[col] = tintRow(x, CH, col); }
    const s = IMG.hero; if (!ok(s)) return;
    TINT = {};
    for (const col of [C.teal, C.pink, C.yellow, C.white, C.red]) {
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
