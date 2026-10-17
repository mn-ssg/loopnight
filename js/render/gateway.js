  /* ================= Loop Gateway: TAPE RIFT ================= */
  // 천장 마운트 · 바닥 받침 → 균열 → 양옆 자기 테이프 → 위아래 릴 순으로 그린다 (주인공보다 뒤)
  // 바퀴가 쌓일수록(gl) 색이 번지고(1) · 균열 속 장면이 번쩍이고(2) · 테이프가 끊기고 릴이 흔들리고(3) · 게이트 자체가 찢어진다(4)
  function drawRift(gx, gl, near) {
    const top = GATE_TOP + 6, bot = GATE_BOT - 6, film = S.warp ? S.warp.film : snaps, tick = S.anim >> 2;
    ctx.save(); ctx.beginPath();
    for (let y = top; y <= bot; y += 4) ctx.lineTo(gx - RIFT_W + Math.floor(hash(y * .37 + tick * .11) * 4), y);
    for (let y = bot; y >= top; y -= 4) ctx.lineTo(gx + RIFT_W - Math.floor(hash(y * .53 + tick * .17) * 4), y);
    ctx.closePath(); ctx.clip();
    R('#03141f', gx - RIFT_W, top, RIFT_W * 2, bot - top);
    // 균열 속: 녹화된 이번 바퀴 장면이 새 장면 → 옛 장면 순으로 거꾸로 넘어간다 (주인공이 있던 자리를 가운데로)
    if (film.length) {
      const n = film.length, f = film[n - 1 - (Math.floor(S.anim / (S.warp ? 1 : 3)) % n)], fw = (bot - top) * W / H;
      ctx.globalAlpha = .8; ctx.drawImage(f, gx - fw * HX / W, top, fw, bot - top);
    }
    ctx.globalAlpha = .22 + .2 * near; R(C.glow, gx - RIFT_W, top, RIFT_W * 2, bot - top);
    ctx.globalAlpha = .3; for (let y = top + (S.anim % 3); y < bot; y += 3) R(C.ink, gx - RIFT_W, y, RIFT_W * 2, 1);
    ctx.globalAlpha = .7; for (let i = 0; i < 6 + gl * 4; i++) R(C.white, gx - RIFT_W + Math.random() * RIFT_W * 2, top + Math.random() * (bot - top), 2, 1);
    // 트래킹 띠가 아래에서 위로 감겨 올라간다(되감기)
    ctx.globalAlpha = .55; R(C.white, gx - RIFT_W, bot - mod(S.anim * 3, bot - top), RIFT_W * 2, 2);
    if (gl >= 2 && hash(S.anim * .41 + gx) < .08) { ctx.globalAlpha = .6; R(C.white, gx - RIFT_W, top, RIFT_W * 2, bot - top); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  // 세로로 감긴 자기 테이프: 가까워질수록 떨리고, 3단계부터는 군데군데 끊겨 끝이 늘어진다
  function tapeStrand(x, gl, side, near) {
    const gap = GATE_TOP + 50 + side * 40, gapH = gl >= 3 ? 8 + gl * 3 : 0;
    for (let y = GATE_TOP; y < GATE_BOT; y += 2) {
      if (Math.abs(y - gap) < gapH) continue;
      const wob = Math.round(Math.sin(y / 9 + S.anim / 5 + side) * (.5 + near * 1.5 + (gl >= 3 ? 1 : 0)));
      R('#1a0f0a', x + wob, y, 2, 2); R('#6b4a30', x + wob + (side < 0 ? 0 : 1), y, 1, 2);
    }
  }
  function reel(cx, cy, gl) {
    if (!ok(IMG.gate)) { ringAt(cx, cy, REEL_R * 2, S.reel); return; }
    const m = GT.reel, wob = gl >= 3 ? Math.round(Math.sin(S.anim * .7 + cy) * (gl - 2)) : 0;
    ctx.save(); ctx.translate(cx + wob, cy); ctx.rotate(S.reel + (gl >= 4 ? Math.sin(S.anim * .9) * .4 : 0));
    ctx.drawImage(IMG.gate, m[0], m[1], m[2], m[3], -m[2] / 2, -m[3] / 2, m[2], m[3]);
    if (gl >= 1) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .18 + .06 * gl;
      ctx.drawImage(tintPart(IMG.gate, m, C.pink), -m[2] / 2 - 1 - (gl >> 1), -m[3] / 2); ctx.drawImage(tintPart(IMG.gate, m, C.glow), -m[2] / 2 + 1 + (gl >> 1), -m[3] / 2);
    }
    ctx.restore();
  }
  function drawGateway() {
    const ps = [TRACK, 0];
    for (let p = -GATE_GAP; p > S.d - HX - 60; p -= GATE_GAP) ps.push(p); // 출발선 앞 구간(타이틀 · 출발 전)의 반복 게이트
    for (const p of ps) {
      const gx = Math.round(p - S.d + HX);
      if (gx < -60 || gx > W + 60) continue;
      const gl = p === TRACK ? Math.min(4, S.lap - 1) : Math.max(0, Math.min(4, S.lap - 2)), near = p === TRACK ? Math.max(0, 1 - gateDist() / GATE_AP[0]) : 0;
      // 다가갈수록 균열 둘레가 청록으로 번진다
      ctx.globalAlpha = .06 + .14 * near; R(C.teal, gx - 30, -VIEW_TOP, 60, GROUND + VIEW_TOP); ctx.globalAlpha = 1;
      if (ok(IMG.gate)) {
        pix(IMG.gate, GT.mount, gx - 28, GATE_TOP - 80);
        pix(IMG.gate, GT.base, gx - 36, GATE_BOT - 25);
      }
      drawRift(gx, gl, near);
      tapeStrand(gx - REEL_R, gl, -1, near); tapeStrand(gx + REEL_R - 2, gl, 1, near);
      reel(gx, GATE_TOP, gl); reel(gx, GATE_BOT, gl);
      // 4단계: 게이트 자체가 가로로 찢어지고 가끔 색이 뒤집힌다
      if (gl >= 4 && ok(IMG.gate)) {
        for (let i = 0; i < 3; i++) {
          const y = Math.floor(hash(S.anim * .13 + i * 7) * (GATE_BOT - GATE_TOP)) + GATE_TOP - 20, dx = Math.round((hash(S.anim * .29 + i) - .5) * 10);
          pix(IMG.gate, [GT.mount[0], 70, GT.mount[2], 4], gx - 28 + dx, y);
        }
        if (hash(S.anim * .07 + gx) < .06) { ctx.globalCompositeOperation = 'difference'; R(C.white, gx - 40, -VIEW_TOP, 80, GROUND + VIEW_TOP); ctx.globalCompositeOperation = 'source-over'; }
      }
    }
  }
  /* ---------- 깨진 CRT 자막 ---------- */
  const LANE_TOP = 96; // 화면 기준: 이보다 아래는 장애물(간판 판 · 드론 · 지면)이 지나가는 높이
  // 세계가 고장 나며 새어 나오는 시스템 메시지: 같은 자리에 몇 프레임 머물다 사라지고, 가로 띠로만 보이며 색이 갈라진다 (UI가 아니라 화면의 고장)
  // yMax: 자막이 내려올 수 있는 가장 아래(게임 중엔 장애물이 지나는 높이를 덮지 않게 위쪽에만)
  function glitchText(n, seed, big, words = GLITCH, yMax = H - 38) {
    for (let i = 0; i < n; i++) {
      const r = k => hash(seed * 7.13 + i * 31.7 + k * 3.1);
      let w = words[Math.floor(r(1) * words.length)];
      if (w === 'LOOP_') w += String(S.lap).padStart(2, '0');
      const size = big && r(2) < .35 ? 16 : 8, x = Math.round(12 + r(3) * (W - 130)), y = Math.round(18 + r(4) * (yMax - 18));
      ctx.font = `700 ${size}px ${F_PIX}`; const tw = Math.ceil(ctx.measureText(w).width);
      const band = Math.max(3, Math.floor((.35 + r(5) * .65) * (size + 2))), by = y - 1 + Math.floor(r(6) * (size + 3 - band));
      ctx.save(); ctx.beginPath(); ctx.rect(x - 4, by, tw + 8, band); ctx.clip();
      ctx.globalAlpha = .6; R(C.ink, x - 3, y - 2, tw + 6, size + 4);
      ctx.globalAlpha = .95; txt(w, x - 1 - (size >> 3), y, C.pink, size, 'left', null); txt(w, x + 1 + (size >> 3), y, C.glow, size, 'left', null); txt(w, x, y, C.white, size, 'left', null);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  // 화면 기준 캔버스 띠 밀기 (y·h 논리 좌표, dx 논리 px)
  function shiftBand(y, h, dx, x = 0, w = W) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sx = Math.round(x * SX), sy = Math.round(y * SY), sw = Math.round(w * SX), sh = Math.max(1, Math.round(h * SY));
    ctx.drawImage(cv, sx, sy, sw, sh, sx + Math.round(dx * SX), sy, sw, sh); ctx.restore();
  }
  // 게이트 접근(화면 기준): 1단계 게이트 쪽이 살짝 출렁 · 3단계 RGB 분리가 커지고, 화면 일부가 1~2프레임씩 과거 장면으로 깜빡이며 자막이 새기 시작
  // 과거 장면 조각과 자막은 화면 위쪽(LANE_TOP 위, 천장 쪽)에만 — 지면 · 간판 높이의 장애물을 가리지 않는다
  function drawGateFx(cam) {
    const z = gateZone(); if (!z || mode !== 'play') return;
    const gx = Math.round(TRACK - S.d + HX), gl = Math.min(4, S.lap - 1), near = Math.max(0, 1 - gateDist() / GATE_AP[0]);
    for (let i = 0; i < 2 + z; i++) { const y = Math.floor(hash(S.anim * .21 + i * 5) * (H - 10)); shiftBand(y, 3 + z, Math.round(Math.sin(S.anim * .5 + i) * (1 + near * 2)), Math.max(0, gx - 60), 120); }
    if (z < 3) return;
    const amp = 1 + gl * .7;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .14 + .05 * gl;
    ctx.drawImage(cv, Math.round(amp * SX), 0); ctx.restore();
    if (snaps.length && S.anim % 5 < 2) {
      const sd = Math.floor(S.anim / 5), f = snaps[Math.floor(hash(sd) * snaps.length)];
      const w = 80 + Math.floor(hash(sd + .3) * 140), h = 30 + Math.floor(hash(sd + .6) * 30), x = Math.floor(hash(sd + .9) * (W - w)), y = Math.floor(hash(sd + 1.2) * (LANE_TOP - h));
      ctx.globalAlpha = .55; ctx.drawImage(f, x / 2, y / 2, w / 2, h / 2, x, y, w, h); ctx.globalAlpha = 1;
    }
    glitchText(1 + (gl >> 1), Math.floor(S.anim / 3), false, GLITCH, LANE_TOP - 14);
  }
  /* ---------- 통과: 시간 되감기 ---------- */
  // 카메라: 순간 줌 아웃(0.88) → 되감는 동안 천천히 → 끝에 빠르게 줌 인(1.08 → 1)
  function warpZoom() {
    if (!S.warp) return 1;
    const p = S.warp.t / S.warp.len;
    return p < .2 ? 1 - .12 * p / .2 : p < .82 ? .88 + .04 * (p - .2) / .62 : 1.08 - .08 * (p - .82) / .18;
  }
  function drawWarp(hero, cam) {
    const w = S.warp, p = w.t / w.len, g = w.g, film = w.film, n = film.length, z = warpZoom();
    const shake = g >= 3 ? 2 + g : 1;
    ctx.save();
    ctx.translate(Math.round((Math.random() - .5) * shake), Math.round((Math.random() - .5) * shake));
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    // 화면이 가로로 늘어나며 녹화된 장면들이 거꾸로 빠르게 넘어간다. 3→4바퀴부터는 지나간 장면과 지금 화면이 겹쳐 보인다
    if (p < .82 && n) {
      const q = Math.min(1, p / .82), k = Math.min(n - 1, Math.floor(q * n)), st = 1 + .16 * Math.sin(q * Math.PI);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(st, 1 / (1 + (st - 1) * .5)); ctx.translate(-W / 2, -H / 2);
      ctx.globalAlpha = Math.min(1, p * 14) * (g >= 2 ? .7 : 1); ctx.drawImage(film[k], 0, 0, W, H);
      if (k + 1 < n) { ctx.globalAlpha = .35; ctx.drawImage(film[k + 1], -8, 0, W, H); }
      ctx.restore();
    }
    ctx.globalAlpha = .16; R('#0b2a33', -20, -20, W + 40, H + 40);
    // 파티클이 거꾸로 흐른다(오른쪽으로)
    for (let i = 0; i < 30; i++) { const len = 6 + (i % 4) * 5; ctx.globalAlpha = .35 + (i % 3) * .15; R(i % 3 ? C.glow : C.white, mod(i * 53 + w.t * (8 + (i % 5) * 3), W + 40) - 20, (i * 37) % H, len, 1); }
    // 주인공: 잔상이 앞쪽에서 몸으로 거꾸로 겹쳐 들어온다
    ctx.save(); ctx.translate(0, VIEW_TOP - cam);
    if (TINT) for (let i = 4; i >= 1; i--) { ctx.globalAlpha = .45 - i * .08; heroFrame(TINT[i % 2 ? C.teal : C.white], hero.f, HX + i * 10 * (1 - p), hero.y); }
    ctx.globalAlpha = 1; if (hero.xf) xfBody(hero.f, hero.y, hero.xf); else heroFrame(IMG.hero, hero.f, HX, hero.y);
    ctx.restore();
    ctx.restore(); ctx.globalAlpha = 1;
    // VHS: 스캔라인 폭주 · 트래킹 에러 띠 · 위아래 가장자리가 테이프처럼 말림 · RGB 분리
    for (let i = 0; i < 10 + g * 6; i++) { ctx.globalAlpha = .2 + Math.random() * .2; R(C.white, 0, Math.random() * H, W, 1); }
    ctx.globalAlpha = 1;
    const ty = mod(w.t * 11, H + 30) - 15;
    shiftBand(ty, 14 + g * 4, (Math.random() * 2 - 1) * (6 + g * 3));
    for (let r = 0; r < 5; r++) { const c = (5 - r) * (5 - r) * .5 * Math.sin(w.t * .6 + r); shiftBand(H - 6 * (r + 1), 6, c); shiftBand(6 * r, 6, -c); }
    ctx.globalAlpha = .5; R(C.ink, 0, H - 4, W, 4); R(C.ink, 0, 0, W, 3); ctx.globalAlpha = 1;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .3 + .05 * g;
    ctx.drawImage(cv, Math.round((2 + g * 1.5) * SX), 0); ctx.restore();
    // 5바퀴 이후: 시간 시스템 붕괴 — 색 반전 · 화면 찢김
    if (g >= 4) {
      if (w.t % 7 === 0) { ctx.globalCompositeOperation = 'difference'; R(C.white, 0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
      for (let i = 0; i < 3; i++) shiftBand(Math.random() * H, 8 + Math.random() * 24, (Math.random() * 2 - 1) * 24);
    }
    glitchText(2 + g * 2, Math.floor(w.t / 2), true);
    // 첫 프레임 플래시 → 끝에선 화면이 꺼지며 00:00:00:00
    if (w.t < 2) { ctx.globalAlpha = .8; R(C.white, 0, 0, W, H); }
    if (p >= .82) {
      ctx.globalAlpha = .85 * (1 - (p - .82) / .18); R('#02060a', 0, 0, W, H);
      ctx.globalAlpha = 1; if ((w.t >> 1) % 2 === 0) num('00:00:00:00', W / 2, H / 2 - 8, C.white, 16, 'center');
    }
    ctx.globalAlpha = 1;
  }
  // 3→4바퀴부터: 통과 뒤에도 지나간 장면이 지금 화면 위에 반투명으로 잠깐 남는다
  function drawPastFx() {
    const f = S.pastFilm; if (!S.pastFx || !f || !f.length) return;
    ctx.globalAlpha = .28 * S.pastFx / 40; ctx.drawImage(f[Math.floor(hash(S.pastFx >> 2) * f.length)], 0, 0, W, H); ctx.globalAlpha = 1;
  }
  /* ---------- 루프 번호 OSD ---------- */
  // 되감기가 끝나고 화면이 안정되는 순간 VHS 화면 표시처럼: 가운데 크게(▶ PLAY · LOOP // 03 · 타임코드 · REC ●) → 오른쪽 아래로 작아져 잠시 남는다
  // 타임코드는 새 루프 시작부터 실제로 흐르고, 시간이 많이 고장 난 뒤(g 4)엔 숫자가 깨진다
  const tc = t => '00:00:' + String(Math.floor(t / 60) % 60).padStart(2, '0') + ':' + String(Math.floor(t / 2) % 30).padStart(2, '0');
  const playTri = (x, y, c) => { for (let i = 0; i < 7; i++) R(c, x, y + i, Math.min(i, 6 - i) + 1, 1); };
  function drawOSD() {
    const o = S.osd; if (!o || mode !== 'play') return;
    const lap = String(o.lap).padStart(2, '0'), bad = o.g >= 4 && hash(o.t * .7) < .3;
    const L = 'LOOP // ' + (bad ? lap[0] + String.fromCharCode(48 + Math.floor(hash(o.t) * 10)) : lap), T = bad ? tc(Math.floor(hash(o.t * 1.3) * 99999)) : tc(o.t);
    const rec = (o.t >> 4) % 2 === 0;
    if (o.t < OSD_BIG) {
      const open = Math.min(1, o.t / 6), close = o.t > OSD_BIG - 8 ? (OSD_BIG - o.t) / 8 : 1, jit = o.t < 8 || (o.g >= 3 && hash(o.t * .3) < .12) ? Math.round((hash(o.t) - .5) * 8) : 0;
      const x0 = Math.round(W / 2 - 80) + jit, y0 = Math.round(H / 2 - 40), cy = y0 + 24;
      ctx.save(); ctx.translate(0, cy); ctx.scale(1, Math.max(.05, open * close)); ctx.translate(0, -cy);
      if (o.t < 16 || (o.t >> 3) % 2 === 0) { playTri(x0, y0 + 1, C.white); txt('PLAY', x0 + 11, y0, C.white, 8, 'left'); }
      num(L, x0 - 1, y0 + 14, C.pink, 16); num(L, x0 + 1, y0 + 14, C.glow, 16); num(L, x0, y0 + 14, C.white, 16);
      num(T, x0, y0 + 38, C.white, 8);
      if (rec) { R(C.red, x0 + 126, y0 + 38, 6, 6); txt('REC', x0 + 136, y0 + 37, C.white, 8, 'left'); }
      ctx.restore();
    } else {
      ctx.globalAlpha = Math.min(1, (OSD_T - o.t) / 20);
      num(L.replace(/ /g, ''), W - 8, H - 30, C.white, 8, 'right'); num(T, W - 8, H - 18, C.mist, 8, 'right');
      if (rec) R(C.red, W - 88, H - 30, 5, 5);
      ctx.globalAlpha = 1;
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
