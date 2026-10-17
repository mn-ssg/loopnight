  function feature(nn, title, desc, x, y, icon) {
    R(C.ink, x + 2, y + 2, 18, 18); R(C.deep, x, y, 18, 18);
    num(nn, x + 9, y + 5, C.white, 8, 'center');
    ktxt(title, x + 28, y - 1, C.white, 13, 'left', 900);
    ktxt(desc, x + 28, y + 16, C.mist, 11, 'left', 700);
    if (icon) icon(x + 300, y + 10);
  }
  function dotted(x0, y) { for (let x = x0 - 4; x < x0 + 361; x += 4) R('#1d4a52', x, y, 2, 1); }
  /* ================= 타이틀 ================= */
  // 화면 위엔 로고와 PRESS ANY KEY만. 로고 뒤에만 아주 옅은 타원 어둠과 그림자를 깔아(박스 없이) 흐르는 배경이 그대로 보이면서도 읽힌다
  // 평소엔 조용하다: 6~9초에 한 번 로고가 몇 프레임 살짝 찢어지며 색이 갈라지거나 밝기가 흔들리고, PRESS ANY KEY는 박자에 맞춰 밝기만 숨 쉰다
  function drawLogo(a, t) {
    const lg = IMG.logo; if (!ok(lg) || a <= 0) return;
    // 픽셀 로고: 화면 너비의 LOGO_W를 넘지 않는 가장 큰 정수 배율로만 키운다(픽셀이 고르게 남게)
    const k = Math.max(1, Math.floor(W * LOGO_W / lg.width)), w = lg.width * k, h = lg.height * k, x = Math.round(W / 2 - w / 2), y = Math.round(H * .3 - h / 2), cy = y + h / 2;
    const g = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, w * .62); g.addColorStop(0, `rgba(2,6,10,${(.6 * a).toFixed(3)})`); g.addColorStop(1, 'rgba(2,6,10,0)');
    ctx.save(); ctx.translate(W / 2, cy); ctx.scale(1, .4); ctx.translate(-W / 2, -cy); ctx.fillStyle = g; ctx.fillRect(0, cy - w * .62, W, w * 1.24); ctx.restore();
    // 시작해서 사라지는 중엔 글리치 없이 조용히 빠진다
    const cyc = t % 480, gl = mode === 'title' && cyc > 470 - Math.floor(hash(Math.floor(t / 480)) * 90) && cyc <= 474 - Math.floor(hash(Math.floor(t / 480)) * 90), flick = mode === 'title' && (cyc === 233 || cyc === 235);
    ctx.globalAlpha = .7 * a; ctx.drawImage(tintPart(lg, [0, 0, lg.width, lg.height], C.ink), x + k, y + 2 * k, w, h);
    if ('filter' in ctx) { ctx.filter = 'blur(3px)'; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = LOGO_GLOW * a; ctx.drawImage(lg, x, y, w, h); ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = a * (flick ? .55 : 1); ctx.drawImage(lg, x, y, w, h);
    if (gl) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5 * a;
      ctx.drawImage(tintPart(lg, [0, 0, lg.width, lg.height], C.pink), x - 2, y, w, h); ctx.drawImage(tintPart(lg, [0, 0, lg.width, lg.height], C.glow), x + 2, y, w, h);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a;
      for (let i = 0; i < 2; i++) { const sy = Math.floor(hash(t * .7 + i) * lg.height * .8), sh = Math.max(1, Math.floor(lg.height * (.08 + hash(t + i) * .1))); ctx.drawImage(lg, 0, sy, lg.width, sh, x + (i ? 2 : -2) * k, y + sy * k, w, sh * k); }
    }
    ctx.globalAlpha = 1;
  }
  function drawPressKey(a, t) {
    if (a <= 0) return;
    const f = fpb(), k = 1 - (S.beatT % f) / f, y = H - 34;
    ctx.globalAlpha = a * (.5 + .4 * k * k); txt('PRESS ANY KEY', W / 2, y, C.paper, 8, 'center');
    if (hash(Math.floor(t / 2) * .37) < .02) { ctx.globalAlpha = .5 * a; txt('PRESS ANY KEY', W / 2 - 1, y, C.pink, 8, 'center', null); txt('PRESS ANY KEY', W / 2 + 1, y, C.glow, 8, 'center', null); }
    ctx.globalAlpha = 1;
  }
  // 방치하면 같은 배경 위에 설명 · 테이프 마모 표 · 기록이 한 장씩 (원래 대기 화면의 그 페이지들)
  function drawInfo(page) {
    const oy = (H - DECK) / 2;
    if (page === 1 || page === 2) {
      word('how', W / 2, 16 + oy);
      const list = page === 1
        ? [['01', K.t1, K.d1, (x, y) => TINT && heroFrame(TINT[C.teal], 6, x, y + 18)], ['02', K.t2, K.d2, (x, y) => signboard(x - 18, y + 8, 36, y - 16, 3, false, titleT)],
           ['03', K.t3, K.d3, (x, y) => hz('drone', x - 10, y - 4)], ['04', K.t4, K.d4, (x, y) => pix(IMG.haz, HZ.sign, x - 6, y - 8)]]
        : [['05', K.t5, K.d5, (x, y) => pix(IMG.haz, HZ.gate, x - 18, y - 12, 37, 24)], ['06', K.t6, K.d6, (x, y) => ringAt(x, y + 2, 26, titleT / 20)], ['07', K.t7, K.d7, (x, y) => hz('cas', x - 8, y - 2)],
           ['08', K.t8, K.d8, (x, y) => { if (!TINT) return; ctx.globalAlpha = .3; heroFrame(TINT[C.teal], 1, x - 16, y + 18); ctx.globalAlpha = .55; heroFrame(TINT[C.teal], 1, x - 5, y + 18); ctx.globalAlpha = 1; heroFrame(IMG.hero, 1, x + 7, y + 18); }]];
      const step = 40, lx = Math.round(W / 2 - 178);
      list.forEach(([nn, t, d, ic], i) => { const y = 46 + oy + i * step; feature(nn, t, d, lx, y, ic); if (i < list.length - 1) dotted(lx, y + 33); });
      txt(page === 1 ? 'SPACE = JUMP' : 'ARROW KEYS = CLIMAX CHOICE', W / 2, 206 + oy, '#3c6a74', 8, 'center', null);
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
      const by = Math.round((H - 35) / 2) - 35;
      txt('BEST SCORE', W / 2, by, C.teal, 16, 'center');
      num(String(best).padStart(7, '0'), W / 2, by + 32, C.white, 16, 'center');
      txt('BEST LOOP ' + bestLoop, W / 2, by + 62, C.mist, 8, 'center');
      const r = pickRate(), pc = v => Math.round(v * 100) + '%';
      if (r) txt('BREAK ' + pc(r.left) + '   PURIFY ' + pc(r.up) + '   OVERDRIVE ' + pc(r.right), W / 2, by + 86, '#3c6a74', 8, 'center', null);
    }
  }
  // 타이틀 위에 얹는 것 전부: 아주 약한 CRT 그레인 · 로고(또는 방치 중엔 설명 페이지) · PRESS ANY KEY. a = 전체 세기(시작하면 빠르게 사라진다)
  function drawTitleUI(a) {
    ctx.globalAlpha = .06 * a; for (let i = 0; i < 40; i++) R(Math.random() < .5 ? C.white : C.mist, Math.random() * W, Math.random() * H, 1, 1); ctx.globalAlpha = 1;
    const it = idleT - IDLE_T, info = mode === 'title' && it >= 0 ? Math.min(1, it / 20, (INFO_T * 4 - it) / 20) : 0;
    if (info > 0) {
      dim(.84 * info);
      if (info >= 1) drawInfo(1 + Math.floor(it / INFO_T));
    }
    drawLogo(a * (1 - info), titleT);
    drawPressKey(a, titleT);
  }
