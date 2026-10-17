  const gaugeMul = () => lapCfg(S.lap).gauge * (1 + DDA.gauge * S.assist);
  function addGauge(n) {
    if (S.drive > 0) { S.odBank += n; return; }
    if (S.climax > 0 || S.heat > 0 || S.pick) return;
    S.gauge = Math.min(GAUGE, S.gauge + n * gaugeMul());
    if (S.gauge >= GAUGE) openPick();
  }
  // 게이지가 차면: 세계가 느려지고(30%) 소리가 먹먹해지며, 주인공 둘레에 방향 키 세 개가 차례로 켜진다
  function openPick() { S.pick = { t:0, acc:0 }; S.flash = 3; sfx('pickOpen'); muffle(700, .2); }
  // 마모가 있으면 걷어내고, 없으면 다음 바퀴 마모를 미리 봉인한다(한 바퀴 앞까지만)
  const canPurify = () => S.wear > 0 || !S.seal;
  // 능력 지속시간: 바퀴 표의 power 배율(과열은 그만큼 짧게)
  const powerT = t => Math.round(t * lapCfg(S.lap).power);
  function logPick(dir) {
    const e = { dir, lap:S.lap, wear:S.wear, hp:S.hp, ghosts:S.ghosts.length, s0:score(), hit:false, died:false, gain:0, at:Date.now() };
    picks.push(e); if (picks.length > LOG_MAX) picks.shift(); savePicks();
    return e;
  }
  // 능력이 끝나면 그동안 번 점수를 로그에 적는다
  function endPower(dir) { const e = S.pickLog; if (!e || (dir && e.dir !== dir)) return; e.gain = score() - e.s0; S.pickLog = null; savePicks(); }
  // 고른 순간: 짧게 멈칫 + 플래시 + 소리가 확 열리고, 능력이 바로 시작된다
  function choose(dir) {
    if (dir === 'up' && !canPurify()) { sfx('deny'); return; }
    S.pick = null; S.pickFx = { dir, t:48, sub:'' };
    S.freeze = XF_STOP; S.flash = 0; S.shake = 6; S.xfIn = { dir, t:0 }; S.xfOut = null;
    const n = dir === 'up' ? 0 : dir === 'left' ? 1 : 2; sfx('choose', n); sfx('xform', n); muffle(20000, .45);
    endPower(); S.pickLog = logPick(dir);
    if (dir === 'left') { S.climax = S.climaxMax = powerT(CLIMAX_T); S.smash = 0; sfx('climax'); }
    else if (dir === 'up') purify();
    else { S.drive = S.driveMax = powerT(DRIVE_T); S.odBank = 0; }
  }
  // 시간 안에 못 고르면: 아무 능력도 켜지지 않고 게이지가 조금 빠진 채 남는다
  function skipPick() {
    S.pick = null; S.gauge = GAUGE * PICK_KEEP; muffle(20000, .3); sfx('deny');
    pop('NO PICK', HX, S.y - 48, C.mist);
    const e = logPick('none'); e.gain = 0; savePicks();
  }
  function purify() {
    // 화면에 있던 엉킨 장애물은 풀려 흩어진다 (마모를 걷어내기 전에 찾아야 보인다)
    eachObs((o, sx, key) => { if (o.tangle) { S.broken.add(key); burst(sx + wOf(o) / 2, GROUND - 14, 14, [C.white, C.glow, '#8a5a3a'], 2); } });
    const list = debuffsAt(S.lap), w = list.length;
    S.pickFx.sub = w > 0 ? list[w - 1] + ' OFF' : 'NEXT LOOP SEALED';
    if (S.wear > 0) S.wear--; else S.seal = 1;
    S.gauge = 0; S.cleanFx = 40 + XF_STOP; S.cleanW = w; S.inv = Math.max(S.inv, 40);
    S.clean = S.cleanMax = powerT(CLEAN_T + CLEAN_PER * w);
    if (S.lost.length && S.ghosts.length < 3) {
      const g = S.lost.pop(); g.x = HX; g.flash = 24; S.ghosts.push(g); S.echoIn = 0;
      pop('ECHO RESTORED', HX, S.y - 60, C.glow);
    }
  }
  // CLEAN이 끝나 마모가 돌아올 때, 이미 화면 안에 있는 엉킨 장애물이 눈앞에서 갑자기 생기지 않게 한다
  function endClean() { eachObs((o, sx, key) => { if (o.tangle) S.broken.add(key); }); endPower('up'); xfEnd('up'); }
  // BREAK로 부술 때마다: 연속으로 부술수록 +100 × 연속 횟수(최대 ×5)
  function smash(x, y, px, py) {
    S.smash++; const v = 100 * Math.min(5, S.smash);
    S.pts += v; S.shake = 6; sfx('smash');
    burst(x, y, 12 + S.smash * 2, [C.white, C.pink, C.yellow], 2.2);
    // BREAK 변신: 부딪힌 자리에서 큰 사각 픽셀 파편과 충격파
    for (let i = 0; i < 8; i++) { const a = Math.random() * Math.PI * 2, v2 = 1.5 + Math.random() * 2.5; S.parts.push({ x, y, vx:Math.cos(a) * v2, vy:Math.sin(a) * v2 - 1.5, life:24 + Math.random() * 12, c:i % 2 ? C.pink : C.white, s:3 }); }
    S.rings.push({ x, y, t:14, max:14, r:26, c:C.pink });
    pop(S.smash > 1 ? 'SMASH x' + S.smash + ' +' + v : '+' + v, px, py, C.pink);
  }
  // OVERDRIVE: 넘은 장애물에 바짝 붙어 달리던 잔상들이 부딪혀 부순다 (구멍은 부술 수 없다)
  function echoStrike(o, i, m) {
    const sx = Math.round(o.p - S.d + HX), w = wOf(o);
    const y = o.t === 'D' ? droneTop(o, S.lap) + 8 : o.t === 'L' ? GROUND - SIGN_GAP - 8 : GROUND - SIZE[o.t][1] / 2;
    S.broken.add(S.lap + ':' + i); S.shake = 4; sfx('smash');
    if (o.t === 'D') S.debris.push({ x:sx, y:y - 8, vy:-2 });
    burst(sx + w / 2, y, 10 + m * 4, [C.yellow, C.pink, C.white], 2.4);
  }
  /* ---------- 변신 상태 ---------- */
  // 지금 변신한 능력(겹치면 BREAK > OVERDRIVE > PURIFY 순으로 보인다)과 남은 프레임
  const xfDir = () => S.climax > 0 ? 'left' : S.drive > 0 ? 'right' : S.clean > 0 ? 'up' : null;
  const xfLeft = () => S.climax > 0 ? S.climax : S.drive > 0 ? S.drive : S.clean;
  // 네온 세기 0~1: 끝나기 XF_OUT 전부터 줄어들며(접촉 불량처럼 가끔 깜빡) 꺼진다
  function xfK() {
    const left = xfLeft(); if (left >= XF_OUT) return 1;
    return hash(S.anim * .37) < .15 ? .2 : left / XF_OUT;
  }
  // 능력이 끝난 순간: 다른 능력이 아직 켜져 있지 않으면 테이프가 끊기며 원래 모습으로
  function xfEnd(dir) { if (xfDir()) return; S.xfOut = { dir, t:XF_SNAP, ph:ribbonPh(dir) }; sfx('powerdown'); burst(HX, S.y - 19, 10, [XCOL[dir], C.white], 1.2); }
  // 매 프레임 변신 이펙트 재료: BREAK 박자 충격파 · PURIFY 원형 파동과 모여드는 픽셀 · OVERDRIVE 네온 궤적 · 과열 연기
  function xfStep() {
    const d = xfDir(), cy = S.y - 19;
    if (d === 'left' && S.beatHit) S.rings.push({ x:HX, y:cy, t:16, max:16, r:34, c:C.pink });
    if (d === 'up') {
      if (S.anim % 45 === 0) S.rings.push({ x:HX, y:cy, t:44, max:44, r:60, c:C.white, soft:true });
      if (S.anim % 3 === 0) S.xfp.push({ a:Math.random() * Math.PI * 2, r:26 + Math.random() * 16, life:24, c:Math.random() < .5 ? C.white : C.glow });
    }
    if (d === 'right' && !S.falling) S.odTrail.push({ t:S.total, y:S.y - 14 });
    S.odTrail = S.odTrail.filter(p => S.total - p.t < HX + 20);
    if (S.heat > 0 && S.anim % 3 === 0) S.parts.push({ x:HX - 6 + Math.random() * 12, y:S.y - 14 - Math.random() * 16, vx:-.2, vy:-.5, g:-.01, life:26, c:Math.random() < .5 ? '#5a2a30' : C.red });
  }
