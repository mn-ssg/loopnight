  /* ================= 테이프 마모 (바퀴 표대로, 화면 효과는 HUD를 건드리지 않는다) ================= */
  // NOISE: 약한 CRT 스노우와 천천히 굴러 내려가는 밝은 띠. 마모가 걸려 있는 동안 늘 깔리고, 걸린 마모가 많을수록 눈이 조금씩 늘어난다
  function drawTapeNoise() {
    const n = activeDebuffs().length; if (!n || S.rw || S.live > 0 || mode !== 'play') return;
    ctx.globalAlpha = .18;
    for (let i = 0; i < 20 + n * 10; i++) R(Math.random() < .5 ? C.white : C.mist, Math.random() * W, Math.random() * H, 1, 1);
    ctx.globalAlpha = .05; R(C.white, 0, (S.anim * .7) % (H + 40) - 20, W, 10); ctx.globalAlpha = 1;
  }
  // TANGLE(5바퀴~): 강한 글리치 — VHS 트래킹 띠가 화면을 훑으며 그 줄이 옆으로 밀리고, 가끔 화면 전체가 분홍빛으로 이중으로 번진다(세기는 바퀴 표의 vfx)
  function drawTangle() {
    if (!has('TANGLE') || S.rw || S.live > 0 || mode !== 'play') return;
    const v = lapCfg(S.lap).vfx;
    const dur = 40, ph = (S.anim + 53) % 150;
    if (ph < dur) {
      const bh = 12, by = Math.round(H - bh - ph / dur * (H - bh)), dx = ((ph >> 1) % 2 ? 1 : -1) * 3;
      const y0 = Math.round(by * SY), h0 = Math.round(bh * SY);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(cv, 0, y0, cv.width, h0, Math.round(dx * SX), y0, cv.width, h0); ctx.restore();
      ctx.globalAlpha = .18; R(C.white, 0, by, W, 1); ctx.globalAlpha = .25; R(C.pink, 0, by + bh, W, 1); ctx.globalAlpha = 1;
    }
    if ((S.anim + 90) % 240 < 6) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .3 * v;
      ctx.drawImage(cv, Math.round(3 * SX), 0); ctx.restore();
      ctx.globalAlpha = .08 * v; R(C.pink, 0, 0, W, H); ctx.globalAlpha = 1;
    }
  }
  // DROPOUT: 신호가 끊기는 동안 세계가 잡음에 묻힌다. 색과 디테일은 잃어도 장애물 윤곽(한 색 실루엣)은 잡음 위에 남는다 — 무엇이 어디 있는지는 늘 보이게
  // 잔상과 나도 잡음 위에 남는다. 직전엔 지직거림이 늘며 예고
  function drawDropout() {
    const p = dropPh(), len = dropLen(); if (p < 0 || p >= DROP_PRE + len) return;
    const top = Math.round(S.cam) - VIEW_TOP;
    if (p < DROP_PRE) {
      ctx.globalAlpha = .5;
      for (let i = 0; i < p * 2; i++) R(Math.random() < .5 ? C.white : C.glow, Math.random() * W, top + Math.random() * H, 1 + (Math.random() * 3 | 0), 1);
      ctx.globalAlpha = 1; return;
    }
    const k = p - DROP_PRE, fade = Math.min(1, k / 4, (len - k) / 6);
    ctx.globalAlpha = .74 * fade; R(C.night, 0, top, W, H);
    ctx.globalAlpha = .55 * fade;
    for (let i = 0; i < 220; i++) R(Math.random() < .7 ? '#3d5868' : C.mist, Math.random() * W, top + Math.random() * H, 1 + (Math.random() * 2 | 0), 1);
    for (let i = 0; i < 3; i++) R(C.white, 0, top + Math.random() * H, W, 1);
    hazardOutline(.75 * fade);
    ctx.globalAlpha = 1;
  }
  // 장애물 윤곽: 그림 모양 그대로 한 색으로. 신호처럼 가끔 흐려질 뿐 사라지지 않는다. 점프대는 노랗게(밟을 곳)
  const HZ_OF = { B:'bar', W:'block', T:'crate', D:'drone' };
  function hazardOutline(a) {
    const col = C.mist;
    eachObs((o, sx, key, L) => {
      ctx.globalAlpha = a * (hash(S.anim * .31 + o.p) < .12 ? .55 : 1);
      const n = HZ_OF[o.t];
      if (n) { const y = o.t === 'D' ? droneTop(o, L) : GROUND - HZ[n][3]; if (ok(IMG.haz)) ctx.drawImage(tintPart(IMG.haz, HZ[n], col), sx, y); else R(col, sx, y, HZ[n][2], HZ[n][3]); }
      else if (o.t === 'E' && ok(IMG.haz)) {
        if (gateOn(o)) ctx.drawImage(tintPart(IMG.haz, HZ.gate, col), sx, GROUND - 48);
        else for (const dx of [0, 58]) ctx.drawImage(tintPart(IMG.haz, [HZ.gate[0] + dx, 0, 15, 48], col), sx + dx, GROUND - 48);
      }
      else if (o.t === 'P') { const w = wOf(o); R(col, sx, GROUND, 2, 12); R(col, sx + w - 2, GROUND, 2, 12); R(C.yellow, sx - 12, GROUND + 3, 12, 2); }
      else if (o.t === 'S') R(C.yellow, sx - 4, GROUND - 4, 27, 3);
      else if (o.t === 'L') {
        const w = wOf(o), k = w >= 60 ? 'low64' : w >= 44 ? 'low50' : 'low36', m = SG[k], x = Math.round(sx + (w - m[2]) / 2), y = GROUND - SIGN_GAP + 1 - m[3];
        for (const rx of LOW_ROD[k]) R(col, x + rx + 1, -VIEW_TOP, 2, y + VIEW_TOP);
        if (ok(IMG.signs)) ctx.drawImage(tintPart(IMG.signs, m, col), x, y); else R(col, x, y, m[2], m[3]);
      }
    });
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
