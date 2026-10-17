
  /* ================= 입력: 타이틀은 아무 키나, 그 뒤로는 스페이스바 하나로 점프·재개 ================= */
  function press() {
    ensureAudio(); held = true;
    if (mode === 'title') { startGame(); return; }
    if (mode === 'over') { if (S.overT > 45) { enterTitle(); startGame(true); } return; }
    if (mode === 'pause') { setMode('play'); return; }
    if (S.enter && S.enter.t < ENTER_CTRL) return; // 주인공이 아직 달려 들어오는 중
    if (!S.rw) S.queued = true;
  }
  const DIRS = { ArrowUp:'up', KeyW:'up', ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right' };
  addEventListener('keydown', e => {
    if (mode === 'title' && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (DIRS[e.code] || e.code === 'Space') e.preventDefault();
      press(); held = e.code === 'Space'; return;
    }
    const dir = DIRS[e.code];
    if (dir) { e.preventDefault(); if (mode === 'play' && S && S.pick && !S.rw && !e.repeat) choose(dir); return; }
    if (e.code !== 'Space') return;
    e.preventDefault(); if (!e.repeat) press();
  });
  addEventListener('keyup', e => { if (e.code === 'Space') held = false; });
  document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') setMode('pause'); });
