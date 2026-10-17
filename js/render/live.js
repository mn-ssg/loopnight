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
  // 장애물 테두리 빛: 화면 고장 연출(바퀴 표의 vfx · IDIOTAPE · DROPOUT 예고)이 셀수록 옅은 빛 테두리를 둘러 어두운 배경 · 연출 속에서도 모양이 읽히게(1바퀴엔 없다)
