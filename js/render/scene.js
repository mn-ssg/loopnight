  // HUD를 서서히 켤 때: 다른 캔버스에 그려 한 번에 투명도를 입힌다
  const hudCv = document.createElement('canvas'), hudCtx = hudCv.getContext('2d');
  function drawHudLayer(a) {
    if (a >= 1) { drawHUD(); return; }
    if (a <= 0) return;
    if (hudCv.width !== cv.width || hudCv.height !== cv.height) { hudCv.width = cv.width; hudCv.height = cv.height; }
    const main = ctx; ctx = hudCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, hudCv.width, hudCv.height); ctx.setTransform(SX, 0, 0, SY, 0, 0); ctx.imageSmoothingEnabled = false;
    drawHUD(); ctx = main;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.drawImage(hudCv, 0, 0); ctx.restore();
  }

  /* ================= 화면 그리기 ================= */
  function drawRewindFx() {
    ctx.globalAlpha = .28; R('#0b2a33', 0, 0, W, H); ctx.globalAlpha = 1;
    for (let i = 0; i < 6; i++) { const y = (S.anim * 7 + i * 47) % H; ctx.globalAlpha = .25; R(C.white, 0, y, W, 1 + (i % 2)); }
    ctx.globalAlpha = .7;
    for (let i = 0; i < 3; i++) { const y = (S.anim * 13 + i * 90) % H; R('#cfeee9', Math.random() * 40, y, W, 2); }
    ctx.globalAlpha = 1;
    glitchText(2, Math.floor(S.anim / 3), false, GLITCH_HIT);
  }
  function render() {
    ctx.setTransform(SX, 0, 0, SY, 0, 0); ctx.imageSmoothingEnabled = false;
    R(C.night, 0, 0, W, H); // 카메라가 줌 아웃되면(게이트 통과) 세계가 화면을 다 덮지 못하니, 가장자리에 지난 프레임이 남지 않게 먼저 지운다
    const title = mode === 'title', fever = S.climax > 0, beat = (S.beatT % fpb()) < 4, cam = Math.round(S.cam);
    BEAT = beat && !S.rw; BEATP = (S.beatT % fpb()) / fpb(); LAMP = fever ? FEVER[(S.anim >> 3) % 3] : C.teal;
    const pits = []; eachObs((o, sx) => { if (o.t === 'P') pits.push([sx, wOf(o)]); });
    ctx.save();
    const z = xfZoom() * warpZoom();
    if (z !== 1) { const zy = Math.round(S.y + VIEW_TOP - cam) - 19; ctx.translate(HX, zy); ctx.scale(z, z); ctx.translate(-HX, -zy); }
    if (S.shake > 0) ctx.translate(Math.round((Math.random() - .5) * 5), Math.round((Math.random() - .5) * 4));
    else if (liveK() > .3 && S.beatT % fpb() < 2) ctx.translate(Math.round(Math.random() * 2 - 1), Math.round(Math.random() * 2 - 1));
    ctx.translate(0, VIEW_TOP - cam);
    drawBG(S.total, S.falling || cam ? 0 : speedOf(), fever, S.anim, beat && !S.rw);
    drawLiveBack();
    drawUnderDeck(pits);
    drawSecret(); drawLiveHolo(); drawGateway(); drawWorldObjects(); drawDropout();
    if (S.pick && !S.rw) { ctx.globalAlpha = .4; R('#02060a', 0, cam - VIEW_TOP, W, H); ctx.globalAlpha = 1; }
    drawGhosts(); drawGuardFx(); drawBeatGuide();
    const xf = S.falling > 0 || S.y > GROUND ? null : xfDir();
    const hero = { y:S.y, f:heroPose(), hist:S.rw ? null : S.hist, speed:speedOf(), anim:S.anim, blink:S.inv > 0 && !fever && !xf && (S.inv >> 2) % 2 === 1, fever, drive:S.drive > 0, xf };
    // 시작 전환: 주인공이 화면 왼쪽 밖에서 제자리로 달려 들어온다 (타이틀엔 주인공이 없다)
    const enterX = S.enter ? -(HX + 40) * (1 - ease(Math.max(0, Math.min(1, (S.enter.t - 10) / 24)))) : 0;
    ctx.save(); ctx.translate(Math.round(enterX), 0);
    if (!title) drawXfBack(hero);
    if (title) { /* 타이틀: 세계만 흐른다 */ }
    else if (S.falling > 0 || S.y > GROUND) {
      // 도로 위 + 구멍 안 + 상판 아래에서만 보인다 (도로 단면 속으로 파묻혀 보이지 않게)
      ctx.save(); ctx.beginPath(); ctx.rect(0, -H, W, GROUND + H);
      for (const [px, pw] of pits) ctx.rect(px, GROUND, pw, DECK + SLAB - GROUND);
      ctx.rect(0, DECK + SLAB, W, H + CAM_MAX); ctx.clip();
      drawHero({ ...hero, blink:false, hist:null, fall:true }); ctx.restore();
    }
    else drawHero(hero);
    if (!title) drawXfFront(hero);
    ctx.restore();
    drawCars();
    for (const p of S.parts) R(p.c, p.x, p.y, p.s || 2, p.s || 2);
    ctx.restore();
    drawXfScreen(cam);
    if (mode === 'play' && !S.warp && !S.rw && S.anim % SNAP_EVERY === 0) snapshot();
    drawFallFx();
    drawTapeNoise(); drawTangle(); drawLiveFront(); drawGateFx(cam); drawPastFx();
    if (S.warp) drawWarp(hero, cam);
    if (mode === 'play' && dropOn() && (S.anim >> 3) % 2) txt('NO SIGNAL', W / 2, 40, C.white, 8, 'center');
    if (S.slow > 0 && !loopBusy()) { ctx.globalAlpha = .12; R(C.white, 0, 0, W, H); ctx.globalAlpha = 1; }
    if (S.rw) drawRewindFx();
    if (!title) drawHudLayer(S.enter ? (S.enter.t - 24) / 20 : 1);
    drawTapeCard();
    drawOSD();
    drawCleanFx(cam);
    drawPick();
    for (const p of S.pops) txt(p.text, p.x, p.y + VIEW_TOP - cam, p.c, 8, 'center');
    if (S.flash > 0) { ctx.globalAlpha = S.flash / 10 * .6; R(C.white, 0, 0, W, H); ctx.globalAlpha = 1; }
    if (mode === 'play') drawPickFx();
    if (title) drawTitleUI(1);
    else if (S.enter && S.enter.t < 18) drawTitleUI(1 - S.enter.t / 18);
    if (mode === 'play') {
      if (S.banner > 0 && !loopBusy()) {
        if (S.bannerWord) word(S.bannerWord, W / 2, H / 2 - 44);
        if ((S.banner >> 3) % 2 === 0) txt(S.sub, W / 2, H / 2 - 4, C.white, 8, 'center');
      }
    }
    if (mode === 'pause') { dim(.6); txt('PAUSED', W / 2, H / 2 - 32, C.white, 16, 'center'); ktxt(K.pause, W / 2, H / 2 - 4, C.mist, 12, 'center', 700); }
    if (mode === 'over') {
      dim(Math.min(.7, S.overT / 40));
      if (S.overT > 20) {
        const cy = H / 2;
        word('over', W / 2, cy - 76);
        txt('SCORE', W / 2 - 60, cy - 32, C.mist, 8); num(String(score()).padStart(7, '0'), W / 2 + 70, cy - 32, C.white, 8, 'right');
        txt('BEST', W / 2 - 60, cy - 16, C.mist, 8); num(String(best).padStart(7, '0'), W / 2 + 70, cy - 16, C.white, 8, 'right');
        txt('LOOP', W / 2 - 60, cy, C.mist, 8); num(String(S.lap), W / 2 + 70, cy, C.white, 8, 'right');
        if (newRecord) txt('NEW RECORD', W / 2, cy + 32, C.teal, 8, 'center');
        if (S.overT > 45 && (S.overT >> 5) % 2 === 0) txt('PRESS START', W / 2, cy + 80, C.paper, 8, 'center');
      }
    }
  }
