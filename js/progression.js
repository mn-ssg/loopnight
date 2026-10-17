  const comboMult = () => Math.min(S.drive > 0 ? 8 : 5, 1 + Math.floor(S.combo / 8));
  // 충전 구간: 게이트에 다가가는 동안(gateGauge > 1인 바퀴만) 카세트가 하얗게 달아올라 게이지가 더 찬다 — 5바퀴 직전에 능력을 준비해 들어가게
  const chargeZone = () => lapCfg(S.lap).gateGauge > 1 && gateZone() >= 1;
  function collect(x, y) {
    S.combo++;
    const mult = comboMult(), boost = chargeZone();
    S.pts += 50 * mult * (S.drive > 0 ? 2 : 1);
    burst(x, y, boost ? 9 : 5, boost ? [C.white, C.yellow] : [C.yellow, C.teal], 1.1);
    sfx('pick', Math.min(10, S.combo % 10));
    addGauge(boost ? lapCfg(S.lap).gateGauge : 1);
  }
  function nextLap() {
    const g = Math.min(4, S.lap - 1); // 이번 전환의 고장 단계: 1→2 바퀴 0 … 5바퀴부터 4
    S.ghosts.unshift({ rec:S.rec, x:-40, flash:0 }); if (S.ghosts.length > 3) S.ghosts.pop();
    S.echoIn = 160;
    S.rec = newRec();
    const perfect = !S.lapHit; S.lapHit = false;
    const before = debuffsAt(S.lap), pw0 = lapCfg(S.lap).power, nw = nextWear();
    S.lap++; S.wear = nw; S.seal = 0; S.lapHits = 0;
    // 테이프 라벨: 새로 걸린 마모(▼) · 바퀴가 걷어낸 마모(✦ clean) · 새 데크 기능(▲, 2~5바퀴) 또는 능력 성장(▲ DECK, 표에 있는 바퀴까지)
    const now = debuffsAt(S.lap), c = lapCfg(S.lap), card = [];
    for (const d of now) if (!before.includes(d)) card.push({ k:'bad', name:d, text:BAD_K[d] });
    if (c.clean) for (const d of before) if (!now.includes(d)) card.push({ k:'clean', name:c.clean, text:d + ' 해제 · ' + K.hc });
    if (S.lap <= 5) card.push({ k:'good', name:TAPE[wearMax()].good, text:TAPE[wearMax()].goodK });
    else if (S.lap < LOOPS.length && c.power > pw0) card.push({ k:'good', name:'DECK +' + Math.round((c.power - 1) * 100) + '%', text:K.deck });
    S.card = card.length ? card : null; S.tapeCard = card.length ? 240 : 0;
    const keep = s => new Set([...s].filter(k => k.startsWith(S.lap + ':')));
    S.broken = keep(S.broken); S.got = keep(S.got); S.near = keep(S.near); S.fired = keep(S.fired);
    S.banner = 0;
    if (perfect) {
      S.pts += 1000; S.banner = 110; S.bannerWord = 'perfect';
      S.sub = S.hp < HPMAX ? 'HP +1   BONUS +1000' : 'BONUS +1000';
      if (S.hp < HPMAX) S.hp++;
      S.lapSfx = 'perfect'; // 되감기가 끝나 음악이 다시 들어올 때 울린다
    }
    S.liveDone = false;
    startWarp(g);
  }
  /* ---------- Loop Gateway ---------- */
  // 게이트(이번 바퀴 끝)까지 남은 거리와 접근 단계 1·2·3. 통과 중·낙하 중엔 0
  const gateDist = () => TRACK - S.d;
  const gateZone = () => { if (!S || S.warp || S.falling || S.d < 0) return 0; const d = gateDist(); return d < GATE_AP[2] ? 3 : d < GATE_AP[1] ? 2 : d < GATE_AP[0] ? 1 : 0; };
  // 되감기 연출이나 가운데 OSD가 떠 있는 동안은 다른 안내(PERFECT · 테이프 라벨 · ECHO 이름표)가 기다린다
  const loopBusy = () => !!S.warp || (!!S.osd && S.osd.t < OSD_BIG);
  // 릴 회전: 평소 앞으로 돌다가 1단계에서 느려지고 2단계부터 거꾸로, 3단계와 통과 중엔 빠르게 되감는다
  const reelSpin = () => { const d = gateDist(); return S.warp ? -.6 : d < GATE_AP[2] ? -.3 : d < GATE_AP[1] ? -.08 : d < GATE_AP[0] ? .06 * (d - GATE_AP[1]) / (GATE_AP[0] - GATE_AP[1]) : .06; };
  function gateStep() {
    S.reel += reelSpin();
    const z = gateZone();
    if (z >= 1 && !S.gateCue) { S.gateCue = true; const sec = gateDist() / Math.max(1, speedOf()) / 60; sfx('swell', sec); bgmGhost(sec); }
    // 2단계부터: 주변 픽셀이 세계와 반대 방향(뒤 → 앞)으로 흐른다
    if (z >= 2 && S.anim % 2 === 0) S.parts.push({ x:Math.random() * W * .7, y:10 + Math.random() * (GROUND - 20), vx:speedOf() * .5 + 2 + Math.random() * 2, vy:0, g:.0001, life:28, c:Math.random() < .5 ? C.glow : C.white, s:1 });
  }
  // 게이트 통과: 세계가 멈추고, 녹화해 둔 이번 바퀴 장면이 거꾸로 빠르게 감긴다. 오디오가 순간 끊긴 뒤 테이프 감기는 소리와 함께 피치가 떨어지고, 곡도 실제로 거꾸로 감긴다
  function startWarp(g) {
    const len = Math.min(60, WARP_T + WARP_PER * g);
    S.warp = { t:0, len, g, film:snaps.slice().reverse() };
    S.cars = []; S.gateCue = false;
    if (bgm.ghost) { try { bgm.ghost.stop(); } catch (e) {} bgm.ghost = null; }
    audioCut(.07); sfx('tapewarp', len / 60); muffle(900, len / 60 * .8);
    if (bgm.active) { const now = bgmTime(), rate = 3; bgm.pos = now - rate * len / 60; bgmPlay(now, true, rate); }
  }
  function warpStep() {
    const w = S.warp; w.t++; S.reel += reelSpin();
    // 4→5바퀴부터: 음악이 끊기듯 더듬는다
    if (w.g >= 3 && cut && w.t > 5) cut.gain.setValueAtTime((w.t >> 1) % 3 === 0 ? 0 : 1, ac.currentTime);
    if (w.t >= w.len) endWarp();
  }
  // 되감기가 끝나면: 음악이 강하게 다시 들어오고(신스 음악은 마디 처음부터), 화면이 안정되며 VHS OSD에 새 루프 번호가 뜬다
  // 3→4바퀴부터는 지난 장면이 통과 뒤에도 잠깐 현재 화면에 겹쳐 남는다
  function endWarp() {
    const w = S.warp; S.warp = null;
    audioOn(); muffle(20000, .05); sfx('reentry');
    if (S.lapSfx) { sfx(S.lapSfx); S.lapSfx = null; }
    if (bgm.active) bgmPlay(bgm.pos);
    music.step = 0;
    S.osd = { t:0, lap:S.lap, g:w.g };
    S.pastFx = w.g >= 2 ? 40 : 0; S.pastFilm = w.film;
    S.shake = 6 + w.g * 2; S.flash = 3;
    snaps.length = 0;
  }
  // 녹화: 이번 바퀴의 화면을 반 해상도로 남긴다
  const snaps = [];
  let snapAt = -1;
  function snapshot() {
    if (snapAt === S.anim) return; snapAt = S.anim;
    const c = document.createElement('canvas'); c.width = Math.round(W / 2); c.height = Math.round(H / 2);
    const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.drawImage(cv, 0, 0, c.width, c.height);
    snaps.push(c); if (snaps.length > SNAP_MAX) snaps.shift();
  }
