
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
    // 게이지 이름표: 지금 켜진 능력(과열 · CLEAN 포함)을 보여준다. CLEAN은 남은 시간을 옆에 하얀 막대로
    const label = S.pick ? 'CHOOSE' : fever ? 'BREAK' : S.drive > 0 ? 'OVERDRIVE' : S.heat > 0 ? 'OVERHEAT' : S.clean > 0 ? 'CLEAN' : 'CLIMAX';
    const lcol = fcol || (S.heat > 0 ? ((S.anim >> 2) % 2 ? C.red : C.pink) : S.clean > 0 ? C.white : C.mist);
    hi(IMG.hud, HU.portrait, 6, 6);
    bar('bar5', SLOT5, 33, 8, S.hp / HPMAX, S.hp <= 1 && (S.anim >> 3) % 2 ? C.red : null);
    txt('HP', 34, 21, C.mist, 8, 'left', null);
    // 지금 걸린 마모(CLEAN 동안은 꺼진 채 회색): 무엇이 나를 방해하는지 늘 보이게
    let dx = 8;
    for (const d of debuffsAt(S.lap)) { const c = S.clean > 0 ? '#3c4a52' : C.pink; tri(dx, 36, false, c); txt(d, dx + 10, 34, c, 8, 'left', null); dx += 16 + Math.ceil(ctx.measureText(d).width); }
    const mult = comboMult();
    if (mult > 1) num('x' + mult, 80, 10, mult > 5 ? C.pink : C.yellow, 8);
    hi(IMG.hud, HU.arm, 6, H - 30);
    bar('bar10', SLOT9, 33, H - 21, S.gauge / GAUGE, fcol);
    txt(label, 34, H - 31, lcol, 8, 'left', null);
    if (S.clean > 0 && !S.pick) { const lw = Math.ceil(ctx.measureText(label).width); R(C.white, 34 + lw + 4, H - 28, Math.ceil(36 * S.clean / S.cleanMax), 2); }
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
    if (f.sub) txt(f.sub, W / 2, ny + 48, C.mist, 8, 'center');
    ctx.globalAlpha = 1;
  }
  // PURIFY: 화면의 노이즈가 캐릭터 주변부터 원형으로 걷힌다. 걷어낸 마모만큼의 노이즈를 원 밖에만 다시 그리고, 원의 가장자리가 하얗게 번진다
  // Hit Stop 동안(처음 XF_STOP)은 원이 아직 열리지 않는다
  function drawCleanFx(cam) {
    if (!S.cleanFx) return;
    const t = Math.max(0, 40 - S.cleanFx), r = t * t * .45 + t * 4, fade = Math.min(1, S.cleanFx / 40), cx = HX, cy = Math.round(S.y + VIEW_TOP - cam) - 19;
    ctx.globalAlpha = .35;
    for (let i = 0; i < 120 + S.cleanW * 60; i++) { const x = Math.random() * W, y = Math.random() * H; if (Math.hypot(x - cx, (y - cy) * 1.2) > r) R(Math.random() < .5 ? C.white : C.mist, x, y, 1 + (Math.random() * 2 | 0), 1); }
    if (r > 0) {
      ctx.beginPath(); ctx.ellipse(cx, cy, r, r / 1.2, 0, 0, Math.PI * 2);
      ctx.globalAlpha = .1 * fade; ctx.fillStyle = C.glow; ctx.fill();
      ctx.globalAlpha = .75 * fade; ctx.strokeStyle = C.white; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // ▲▼ 작은 픽셀 삼각형 (테이프 마모 표·라벨)
  const tri = (x, y, up, c) => { for (let r = 0; r < 4; r++) R(c, x + (up ? 3 - r : r), y + r, (up ? r : 3 - r) * 2 + 1, 1); };
  // ◆ 작은 픽셀 마름모 (걷힌 마모)
  const diamond = (x, y, c) => { for (let r = 0; r < 5; r++) { const w = r <= 2 ? r * 2 + 1 : (4 - r) * 2 + 1; R(c, x + 3 - (w >> 1), y + r, w, 1); } };
  // 바퀴가 바뀌어 무엇이 달라졌는지 위쪽에 카세트 라벨처럼: 새로 닳은 것(▼) · 바퀴가 걷어 준 것(◆) · 새 기능이나 능력 성장(▲)
  function drawTapeCard() {
    const card = S.card; if (!card || S.tapeCard <= 0 || loopBusy() || S.banner > 0 || mode !== 'play') return;
    const w = 272, x = Math.round(W / 2 - w / 2), y = 34, h = 20 + card.length * 13;
    ctx.globalAlpha = Math.min(1, S.tapeCard / 20, (240 - S.tapeCard) / 12);
    R(C.ink, x + 2, y + 2, w, h); R(C.ink, x - 1, y - 1, w + 2, h + 2); R('#0a1c26', x, y, w, h); R(C.teal, x, y, w, 2);
    txt('LOOP ' + S.lap + '  TAPE WEAR', x + 6, y + 5, C.mist, 8, 'left', null);
    card.forEach((l, i) => {
      const ly = y + 19 + i * 13, col = l.k === 'bad' ? C.pink : l.k === 'clean' ? C.white : C.glow;
      if (l.k === 'clean') diamond(x + 6, ly + 1, col); else tri(x + 6, ly + 2, l.k === 'good', col);
      txt(l.name, x + 16, ly, col, 8, 'left', null); ktxt(l.text, x + 92, ly - 2, l.k === 'bad' ? C.paper : C.white, 11, 'left', 700);
    });
    ctx.globalAlpha = 1;
  }
