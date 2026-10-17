
  /* ================= 실행 ================= */
  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(100, now - last); last = now;
    while (acc >= STEP) { update(); acc -= STEP; }
    render();
    requestAnimationFrame(frame);
  }
  const go = () => { makeTints(); KCACHE.clear(); enterTitle(); requestAnimationFrame(t => { last = t; frame(t); }); };
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.all([document.fonts.load('700 8px Silkscreen'), document.fonts.load('8px "Press Start 2P"'), document.fonts.load('900 12px "Noto Sans KR"', Object.values(K).join('')), document.fonts.load('700 12px "Noto Sans KR"', Object.values(K).join(''))])
    : Promise.resolve();
  Promise.race([Promise.all([fontsReady, assetsReady]), new Promise(r => setTimeout(r, 3500))]).then(go, go);
