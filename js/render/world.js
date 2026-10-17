
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
  const CABLES = [{ y:DECK + SLAB + 100, sag:10, off:0 }, { y:DECK + SLAB + 170, sag:14, off:140 }], CABLE_SPAN = 300, FOG = [DECK + SLAB + 130, DECK + SLAB + 235], SIGN_X = 150;
  // 전선은 CABLE_SPAN마다 기둥에 걸려 늘어지고, 도로보다 느리게(0.6배) 흘러 멀리 있는 것처럼 보인다
  const cableY = (c, x) => { const u = mod(x + S.total * .6 + c.off, CABLE_SPAN) / CABLE_SPAN; return c.y + Math.round(c.sag * 4 * u * (1 - u)); };
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
    if (mode !== 'title' && !S.enter) rewindSign(SIGN_X, cableY(CABLES[1], SIGN_X + 10) - 1);
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
