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
      if (i === 0 && S.echoIn > 0 && !loopBusy()) { ctx.globalAlpha = Math.min(1, S.echoIn / 30); txt('ECHO', g.x, GROUND - hgt - 50, C.glow, 8, 'center'); }
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
  /* ================= 변신 (TAPE-RUNNER) ================= */
  // 자기 테이프 띠: 몸 둘레 기운 타원 궤도를 도는 검은 띠. back = 몸 뒤로 지나가는 반쪽(몸보다 먼저 그린다)
  // cut(0~1) = 끊긴 정도: 두 조각이 반대로 날아가며 처진다
  const ribbonPh = d => S.anim * (d === 'right' ? .22 : d === 'left' ? .16 : .08);
  const ribbonR = it => it < 10 ? 46 - it * 2.4 : 22 + Math.sin(S.anim / 9) * 1.5;
  function tapeRibbon(cx, cy, r, ph, back, a, col, cut = 0) {
    for (let i = 0; i < 44; i++) {
      const t = ph + i / 44 * Math.PI * 1.75, sn = Math.sin(t);
      if ((sn < 0) !== back) continue;
      const side = i < 22 ? -1 : 1;
      const x = cx + Math.cos(t) * r + side * cut * 18, y = cy + sn * r * .3 - Math.cos(t) * r * .22 + side * cut * 6 + cut * cut * 16;
      ctx.globalAlpha = a; R('#1a0f0a', x, y, 2, 2); R('#6b4a30', x, y, 2, 1);
      if (i % 9 === (S.anim >> 1) % 9) R(col, x, y, 2, 1);
    }
    ctx.globalAlpha = 1;
  }
  function drawRings() {
    for (const r of S.rings) {
      const k = r.t / r.max, rad = 4 + r.r * (1 - k);
      if (r.soft) { ctx.globalAlpha = .35 * k; ctx.strokeStyle = r.c; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(r.x, r.y, rad, rad * .85, 0, 0, Math.PI * 2); ctx.stroke(); continue; }
      ctx.globalAlpha = .9 * k;
      for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; R(i % 4 ? r.c : C.white, r.x + Math.cos(a) * rad, r.y + Math.sin(a) * rad * .85, 2, 2); }
    }
    ctx.globalAlpha = 1;
  }
  // OVERDRIVE 네온 궤적: 지나간 자리에 노란 선이 남아 세계와 함께 뒤로 흘러간다(능력이 끝나도 화면 밖으로 나갈 때까지)
  function drawOdTrail() {
    const T = S.odTrail;
    for (let i = 0; i < T.length; i++) {
      const p = T[i], x = HX - (S.total - p.t), nx = i + 1 < T.length ? HX - (S.total - T[i + 1].t) : x + 1;
      ctx.globalAlpha = .85 * (1 - (S.total - p.t) / (HX + 20)); R(C.yellow, x, p.y, Math.max(1, Math.ceil(nx - x)), 1);
      if (i % 3 === 0) { ctx.globalAlpha *= .5; R(C.white, x, p.y - 1, 1, 1); }
    }
    ctx.globalAlpha = 1;
  }
  // 몸 뒤: 충격파 · 궤적 · 테이프 뒤쪽 반 · 방향마다 다른 잔상 (끝나 갈수록 잔상 간격이 좁아져 몸으로 합쳐진다)
  // ← 크고 거칠게 떨리는 붉은 잔상 · → 길고 빠른 잔상과 앞쪽에 순간 겹치는 에코 · ↑ 몸을 감싸는 흰 빛
  function drawXfBack(o) {
    drawOdTrail(); drawRings();
    const d = o.xf, it = S.xfIn ? S.xfIn.t : 99; if (!d || !TINT || it < 4) return;
    const k = xfK(), cy = o.y - 19, hy = i => o.hist && o.hist.length ? o.hist[Math.max(0, o.hist.length - 1 - i * 3)] : o.y;
    tapeRibbon(HX, cy, ribbonR(it), ribbonPh(d), true, 1, XCOL[d]);
    if (d === 'left') for (let i = 3; i >= 1; i--) { ctx.globalAlpha = (.42 - i * .1) * k; heroFrame(TINT[i % 2 ? C.pink : C.red], o.f, HX - i * 11 * k + Math.round(Math.random() * 2 - 1), hy(i), 1 + .08 * i * k); }
    else if (d === 'right') {
      for (let i = 6; i >= 1; i--) { ctx.globalAlpha = (.5 - i * .07) * k; heroFrame(TINT[i % 2 ? C.yellow : C.white], o.f, HX - i * 9 * k, hy(i)); }
      if (S.anim % 26 < 3 && k === 1) { ctx.globalAlpha = .35; heroFrame(TINT[C.yellow], o.f, HX + 10, o.y); ctx.globalAlpha = .18; heroFrame(TINT[C.yellow], o.f, HX + 20, o.y); }
    } else if (XTINT) { ctx.globalAlpha = .22 * k; for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) heroFrame(XTINT.body, o.f, HX + ox, o.y + oy); }
    ctx.globalAlpha = 1;
  }
  // 변신한 몸: 변신 순간엔 하얀 실루엣 → 변신 그림 위로 흰빛이 빠지며 드러난다. 네온은 박자에 숨 쉬고, 끝나 갈 땐 아래부터 꺼진다
  // OVERDRIVE는 가끔 2프레임씩 앞으로 튀어 프레임이 건너뛴 듯 보인다(판정은 그대로)
  function xfBody(f, y, d) {
    const it = S.xfIn ? S.xfIn.t : 99, x = HX + (d === 'right' && S.anim % 26 < 2 ? 3 : 0);
    if (!XTINT || !TINT) { heroFrame(IMG.hero, f, x, y); return; }
    if (it < 4) { heroFrame(TINT[C.white], f, x, y); return; }
    const k = xfK(), neon = XTINT[XCOL[d]], dx = Math.round(x - 18), dy = Math.round(y - CH), rows = Math.ceil(CH * k);
    if (k < 1) heroFrame(IMG.hero, f, x, y);
    ctx.globalAlpha = k; heroFrame(IMG.hero_x, f, x, y);
    if (rows > 0) {
      ctx.globalAlpha = BEAT ? 1 : .85; ctx.drawImage(neon, f * CW, 0, CW, rows, dx, dy, CW, rows);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (BEAT ? .45 : .28) * k;
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(neon, f * CW, 0, CW, rows, dx + ox, dy + oy, CW, rows);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (it < 10) { ctx.globalAlpha = (10 - it) / 6; heroFrame(XTINT.body, f, x, y); }
    ctx.globalAlpha = 1;
  }
  // 몸 앞: 테이프 앞쪽 반 · 변신 순간 궤도에서 모여드는 픽셀과 RGB 분리 · PURIFY의 모여드는 픽셀 · 해제 때 끊겨 날아가는 테이프
  function drawXfFront(o) {
    const d = o.xf, it = S.xfIn ? S.xfIn.t : 99, cy = o.y - 19;
    if (d) {
      tapeRibbon(HX, cy, ribbonR(it), ribbonPh(d), false, it < 4 ? it / 4 : 1, XCOL[d]);
      if (it < 12) for (let i = 0; i < 18; i++) {
        const a = i / 18 * Math.PI * 2 + it * .06, rr = 42 * (1 - it / 12);
        ctx.globalAlpha = 1 - it / 14; R(i % 3 ? XCOL[d] : C.white, HX + Math.cos(a) * rr, cy + Math.sin(a) * rr * .8, 2, 2);
      }
      if (it >= 4 && it < 14 && TINT) {
        const k = 1 - (it - 4) / 10, sp = Math.round(4 * k);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .55 * k;
        heroFrame(TINT[C.pink], o.f, HX - sp, o.y); heroFrame(TINT[C.teal], o.f, HX + sp, o.y);
        ctx.globalCompositeOperation = 'source-over';
      }
      for (const p of S.xfp) { ctx.globalAlpha = Math.min(1, p.life / 10); R(p.c, HX + Math.cos(p.a) * p.r, cy + Math.sin(p.a) * p.r * .8, 1, 1); }
    }
    if (S.xfOut) {
      const p = 1 - S.xfOut.t / XF_SNAP, c = XCOL[S.xfOut.dir];
      tapeRibbon(HX, cy, 22, S.xfOut.ph, true, 1 - p, c, p); tapeRibbon(HX, cy, 22, S.xfOut.ph, false, 1 - p, c, p);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 - p * 2, rr = 26 * (1 - p); ctx.globalAlpha = 1 - p * .8; R(i % 2 ? c : C.white, HX + Math.cos(a) * rr, cy + Math.sin(a) * rr * .8, 1, 1); }
    }
    ctx.globalAlpha = 1;
  }
  // 변신 순간의 카메라: Hit Stop 동안 주인공 쪽으로 확 당겨졌다가(1.1배) 능력이 시작되며 풀린다
  function xfZoom() {
    const t = S.xfIn ? S.xfIn.t : -1; if (t < 0) return 1;
    return t < 4 ? 1 + .1 * t / 4 : t < XF_STOP ? 1.1 : 1 + .1 * Math.pow(1 - (t - XF_STOP) / (XF_IN - XF_STOP), 2);
  }
  // 화면 기준 이펙트: BREAK 몸 주변 가로 찢김 · OVERDRIVE 위아래 가장자리 속도선 · 변신 순간 플래시(흰색 → 능력 색)
  function drawXfScreen(cam) {
    const d = xfDir(), it = S.xfIn ? S.xfIn.t : 99, hy = Math.round(S.y + VIEW_TOP - cam);
    if (mode !== 'play') return;
    if (d === 'left' && it >= XF_STOP && (S.anim >> 1) % 3 === 0) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (let i = 0; i < 2; i++) {
        const by = hy - 40 + Math.floor(Math.random() * 40), bh = 2 + Math.floor(Math.random() * 4), dx = (Math.random() < .5 ? -1 : 1) * (2 + Math.floor(Math.random() * 3));
        const sx = Math.round((HX - 30) * SX), sy = Math.round(by * SY), sw = Math.round(64 * SX), sh = Math.round(bh * SY);
        ctx.drawImage(cv, sx, sy, sw, sh, sx + Math.round(dx * SX), sy, sw, sh);
      }
      ctx.restore();
    }
    if (d === 'right') {
      const k = xfK();
      for (let i = 0; i < 14; i++) {
        const len = 24 + (i * 13) % 40, y = i % 2 === 0 ? 3 + (i * 7) % 26 : H - 4 - (i * 7) % 26, x = W - mod(S.anim * (9 + (i % 4) * 2) + i * 67, W + len);
        ctx.globalAlpha = (.25 + (i % 3) * .12) * k; R(i % 4 ? C.yellow : C.white, x, y, len, 1);
      }
    }
    if (S.xfIn && it >= 4 && it < 9) { ctx.globalAlpha = .5 * (1 - (it - 4) / 5); R(it < 6 ? C.white : XCOL[S.xfIn.dir], 0, 0, W, H); }
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
    // 몸 뒤 색 잔상은 변신(drawXfBack)이 맡는다. 평소 청록 실루엣은 '지난 루프의 나'만 뜻한다
    const trail = !!o.xf;
    const col = i => trail ? (i % 2 ? XCOL[o.xf] : XACC[o.xf]) : C.teal;
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
      const off = (anim * 3 + k * 17) % 22, ly = y - 6 - ((k * 9 + (anim >> 1)) % 26);
      // 게이트 2단계부터는 속도선이 앞에서 뒤가 아니라 뒤에서 앞으로(시간이 거꾸로) 흐른다
      if (gateZone() >= 2) R(col(k), HX + 18 + off, ly, len, 1); else R(col(k), HX - 20 - len - off, ly, len, 1);
    }
    ctx.globalAlpha = 1;
    if (o.xf) xfBody(f, y, o.xf);
    else if (!blink) heroFrame(IMG.hero, f, HX, y);
  }
  const heroPose = () => (S.falling > 0 || !S.ground) ? (S.spin > 0 ? 7 : 6) : runFrame(S.anim, speedOf());
