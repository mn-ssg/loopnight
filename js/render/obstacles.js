  const rimK = () => mode !== 'play' ? 0 : Math.min(1, lapCfg(S.lap).vfx + liveK() * .6 + (dropWarn() ? .3 : 0));
  function hzRim(n, x, y) {
    const a = rimK();
    if (a > 0 && ok(IMG.haz)) {
      const c = tintPart(IMG.haz, HZ[n], C.paper); ctx.globalAlpha = .4 * a;
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(c, Math.round(x) + ox, Math.round(y) + oy);
      ctx.globalAlpha = 1;
    }
    hz(n, x, y);
  }
  function drawObs(o, sx, key, L, anim) {
    const t = o.t, base = GROUND;
    if (t === 'B') hzRim('bar', sx, base - 22);
    else if (t === 'W') hzRim('block', sx, base - 14);
    else if (t === 'T') hzRim('crate', sx, base - 38);
    else if (t === 'D') {
      const top = droneTop(o, L);
      hzRim('drone', sx, top);
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
        const k = PICK[i];
        if (S.got.has(L + ':' + i) || k.lap > L) continue;
        const sx = Math.round(k.p + off - S.d + HX), cy = GROUND - k.h - 10 + Math.round(Math.sin((S.anim + k.p) / 9));
        if (sx < -12 || sx > W + 12) continue;
        hz('cas', sx - 8, cy);
        // 충전 구간의 카세트는 하얗게 달아오른다
        if (!off && chargeZone() && TRACK - k.p < GATE_AP[0] && ok(IMG.haz)) { ctx.globalAlpha = .35 + .35 * Math.sin((S.anim + k.p) / 4); ctx.drawImage(tintPart(IMG.haz, HZ.cas, C.white), sx - 8, cy); ctx.globalAlpha = 1; }
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
