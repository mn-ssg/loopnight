  const liveK = () => S && S.live > 0 ? Math.min(1, (S.liveLen - S.live) / S.liveIn, S.live / LIVE_OUT) : 0;
  const LIVE_COL = [C.pink, C.teal, C.yellow, '#8f6bff'];
  // 테이프 마모: S.wear = 이 바퀴 마모 목록(LOOPS의 debuffs) 앞에서부터 몇 개가 걸려 있나. 바퀴를 넘을 때마다 한 칸씩 차오르되 목록 길이까지만(넘친 만큼 쌓이지 않아
  // PURIFY가 후반에도 늘 한 칸을 실제로 걷는다). PURIFY는 맨 뒤(가장 센 것)부터 걷고, 마모가 없을 때 쓰면 seal: 다음 바퀴에 차오르는 한 칸을 막는다
  // 걸린 마모는 CLEAN 동안 모두 꺼진다 · wearMax = 얻은 데크 기능 단계(2~5바퀴에 하나씩, 걷어내도 유지)
  const lapDebuffs = L => lapCfg(L).debuffs.slice(0, MAX_DEBUFF);
  const nextWear = () => Math.min(lapDebuffs(S.lap + 1).length, S.wear + (S.seal ? 0 : 1));
  const debuffsAt = L => lapDebuffs(L).slice(0, L === S.lap ? S.wear : nextWear());
  const activeDebuffs = () => S.clean > 0 ? [] : debuffsAt(S.lap);
  const has = n => S.clean <= 0 && debuffsAt(S.lap).includes(n);
  const wearMax = () => Math.min(4, S.lap - 1);
  // WOW: 걸린 마모가 많을수록 곡이 더 출렁인다
  const wowAmt = () => has('WOW') ? .004 * activeDebuffs().length : 0;
  // BREAK와 과열 동안은 몸이 무겁다(2단 점프 · FF DASH 불가), OVERDRIVE 동안은 공중에서 한 번 더 뛴다
  const heavy = () => S.climax > 0 || S.heat > 0;
  const airMax = () => heavy() ? 1 : S.drive > 0 ? 3 : 2;
  const onBeat = () => { const f = fpb(), ph = S.beatT % f; return Math.min(ph, f - ph) <= 5; };
  // DROPOUT: 주기마다 DROP_PRE 프레임 지직거림으로 예고한 뒤 신호가 끊긴다(주기 · 길이는 바퀴 표, 숨은 보정만큼 짧게). 끊긴 동안에도 장애물 윤곽은 남는다
  const DROP_PRE = 30;
  const dropCfg = () => lapCfg(S.lap).drop || [300, 0];
  const dropLen = () => Math.round(dropCfg()[1] * (1 - DDA.drop * S.assist));
  const dropPh = () => !has('DROPOUT') || S.rw || loopBusy() || S.cam > 0 || S.live > 0 ? -1 : (S.anim + 140) % dropCfg()[0];
  const dropWarn = () => { const p = dropPh(); return p >= 0 && p < DROP_PRE; };
  const dropOn = () => { const p = dropPh(); return p >= DROP_PRE && p < DROP_PRE + dropLen(); };
  // 뒤차 경고: 바퀴 표(+ 숨은 보정). 경고가 뜬 뒤 차가 닿기까지(약 14프레임 더) MIN_REACT는 남긴다
  const carWarn = () => Math.max(MIN_REACT - 14, Math.round(lapCfg(S.lap).carWarn + DDA.car * S.assist));
  // 잔상 자리: 평소엔 뒤에서 따라오고, 신호가 끊길 땐(ECHO LEAD) 앞으로 달려 나가 지난 루프의 길을 먼저 보여준다
  // OVERDRIVE 동안엔 표지 그림처럼 바짝 붙어 겹쳐 달린다
  // 게이트 2단계부터는 시간이 거꾸로 흐르기 시작해, 잔상들이 뒤에서 앞으로 미끄러져 나간다
  const echoSlot = i => gateZone() >= 2 ? HX + 22 * (i + 1) : dropWarn() || dropOn() ? HX + 34 * (i + 1) : S.drive > 0 ? HX - 7 * (i + 1) : HX - 24 * (i + 1);
  // 점프대 충전: 약 110px 앞부터 다가갈수록 0→1, 지나치면 0
  const padCharge = sx => { const d = sx - HX; return d < -19 ? 0 : Math.max(0, Math.min(1, (110 - d) / 90)); };
  // WOW(3바퀴~): 테이프가 늘어져 박자를 벗어난 점프는 낮아진다(바퀴 표의 wow). 대신 박자에 맞추면(BEAT JUMP) 원래보다 높이 뛰고 게이지가 찬다
  // BREAK 중엔 몸이 무거워 낮게(높이 85%), OVERDRIVE 중엔 높게(높이 120%) 뛴다
  function jump(n) {
    const beat = wearMax() >= 2 && onBeat(), k = (beat ? 1.05 : has('WOW') ? lapCfg(S.lap).wow : 1) * (S.climax > 0 ? BREAK_JUMP : S.drive > 0 ? OD_JUMP : 1);
    if (n === 1) { S.vy = JUMP1 * k; S.jumps = 1; sfx('jump'); }
    else { S.vy = JUMP2 * k; S.jumps++; S.spin = 18; sfx('jump2'); burst(HX, S.y - 4, 8, S.drive > 0 ? [C.yellow, C.white] : [C.teal, C.white], 1.4); }
    if (beat) { S.beatFx = 14; addGauge(1); sfx('beat'); }
    if (beat && liveK() > .3) { S.pts += 100; pop('CHEER +100', HX, S.y - 48, C.pink); burst(HX, S.y - 10, 10, LIVE_COL, 2); }
    S.ground = false; S.noCut = false;
  }
  // FF DASH(5바퀴~): 공중에서 세 번째로 누르면 빨리감기 — 잠깐 그 높이에 떠서 빠르게 앞으로 가고, 그동안 장애물을 통과하며 엉킨 장애물은 끊는다
  function ffDash() { S.ff = 16; S.ffUsed = true; S.vy = 0; S.spin = 0; sfx('ff'); burst(HX, S.y - 16, 10, [C.white, C.glow], 1.6); }
  function burst(x, y, n, colors, spd = 1.6) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (.4 + Math.random()) * spd;
      S.parts.push({ x, y, vx:Math.cos(a) * v, vy:Math.sin(a) * v - 1, life:20 + Math.random() * 14, c:colors[i % colors.length] });
    }
  }
  const pop = (text, x, y, c = C.yellow) => S.pops.push({ text, x, y, t:60, c });
  // 능력이 켜져 있는 동안 맞으면 플레이 로그에 남긴다
  const markHit = () => { if (S.pickLog) { S.pickLog.hit = true; savePicks(); } };
  function damage() {
    S.hp--; S.combo = 0; S.chain = 0; S.lapHit = true; markHit();
    if (S.hp <= 0) { gameOver(); return false; }
    return true;
  }
  // 피격 기록(사망 원인 · 숨은 보정): o = 부딪힌 것 { t, tangle }
  function logHit(o, guarded) {
    S.lapHits++;
    const e = { lap:S.lap, t:o.t, tangle:!!o.tangle, guarded, deb:activeDebuffs().join('+'), drop:dropOn() || dropWarn(), live:S.live > 0,
                power:xfDir() ? POWERS[xfDir()].name : S.heat > 0 ? 'OVERHEAT' : '', hp:S.hp, fatal:false };
    hits.push(e); if (hits.length > LOG_MAX) hits.shift(); saveHits(); S.lastHit = e;
  }
  // onGuard: 잔상이 대신 맞았을 때 부딪힌 것을 부수는 일 · o: 부딪힌 것(피격 기록용)
  function hurt(onGuard, o) {
    logHit(o, S.ghosts.length > 0);
    if (S.ghosts.length) { guard(onGuard); return; }
    S.shake = 14; S.freeze = 8; S.flash = 6; sfx('hit');
    burst(HX, S.y - 14, 12, [C.red, C.white]);
    if (damage()) S.pendingRewind = true;
  }
  // 잔상이 대신 맞는다: 가장 가까운 지난 루프의 내가 달려들어 부딪힌 것을 부수고 흩어진다. HP와 되감기는 그대로지만
  // 실수는 실수라 콤보와 PERFECT는 잃는다. 구멍은 못 막는다(잔상은 뒤에서 달리니까)
  function guard(onGuard) {
    const g = S.ghosts.shift();
    S.lost.push(g); if (S.lost.length > 3) S.lost.shift(); // 흩어진 잔상은 PURIFY로 되살릴 수 있다
    S.guardFx = { x:g.x, t:16 }; markHit();
    S.combo = 0; S.chain = 0; S.lapHit = true; S.inv = 50; S.freeze = 6; S.shake = 8; S.flash = 3;
    burst(HX, S.y - 16, 18, [C.teal, C.white, C.glow], 2.4);
    pop('ECHO GUARD', HX, S.y - 48, C.glow); sfx('guard');
    if (onGuard) onGuard();
  }
  // 구멍에 빠짐: 구멍 가운데쪽으로 미끄러지며 멈추고(fallX) 상판을 뚫고 도시로 떨어진다. 깨진 가장자리 조각이 먼저 쏟아진다
  function fall(sx, w) {
    S.past.push({ d:S.d, total:S.total, y:GROUND, vy:0, ground:true, jumps:0, beatT:S.beatT });
    S.falling = FALL_T; S.ground = false; S.vy = 1.5; S.trail = [];
    S.fallX = S.d + sx + w / 2 - HX; S.fallSp = speedOf();
    for (let i = 0; i < 10; i++) S.parts.push({ x:sx + 3 + Math.random() * (w - 6), y:GROUND + Math.random() * 4, vx:(Math.random() - .5) * .8, vy:1 + Math.random() * 2, g:.55, life:60, c:['#1a5e77', '#051e31', C.yellow][i % 3] });
    sfx('fall'); logHit({ t:'P' }, false);
    if (damage()) S.pendingRewind = true;
  }
  function stepFall() {
    S.falling--;
    S.vy = Math.min(FALL_VMAX, S.vy + FALL_G); S.y += S.vy;
    if (S.d < S.fallX) { const dx = Math.min(S.fallX - S.d, S.fallSp); S.d += dx; S.total += dx; }
    S.fallSp *= .8;
    // 카메라는 몸이 상판을 지난 뒤부터 따라가고, 몸보다 조금 빨리 내려가 점점 아래(도착할 곳)를 더 보여준다
    const prev = S.cam;
    S.cam = Math.max(0, Math.min(CAM_MAX, (S.y - GROUND - 10) * 1.3)); S.camV = S.cam - prev;
    S.trail.push({ y:S.y, cam:S.cam });
    // 전선을 스치면 불꽃: 몇 층을 지나 떨어졌는지 손에 잡히게
    const mid = S.y - 16;
    for (const c of CABLES) { const cy = cableY(c, HX); if (mid - S.vy < cy && mid >= cy) { sfx('wire'); burst(HX, cy, 8, [C.glow, C.white], 1.6); } }
  }
  // 되감기: 부딪히면 테이프가 약 1.6초 전으로 되감긴다 (잃어버린 왕관의 시간 능력을 카세트로 옮긴 것)
  // 떨어졌을 때는 낙하부터 거꾸로 감아서, 구멍으로 다시 빨려 올라가는 모습이 먼저 보인다
  function startRewind() {
    S.pendingRewind = false;
    if (S.past.length < (S.trail.length ? 1 : 2)) { S.inv = 80; return; }
    S.rw = { snaps:S.past.slice(), i:S.past.length - 1, rise:S.trail };
    S.trail = []; S.cars = []; sfx('rewind');
    // 곡도 테이프처럼 거꾸로 감긴다: 되감기 화면이 도는 시간 동안 되돌아갈 지점(가장 오래된 기록의 박자)까지
    if (bgm.active) {
      const now = bgmTime(), back = now - beatToSong(S.rw.snaps[0].beatT), dur = (S.rw.rise.length + S.rw.snaps.length) / 3 / 60;
      bgm.pos = now - back; bgmPlay(now, true, Math.max(1, Math.min(4, back / Math.max(dur, .1))));
    }
  }
  function endRewind() {
    const s = S.rw.snaps[0];
    Object.assign(S, { d:s.d, prevD:s.d, total:s.total, y:s.y, vy:s.vy, ground:s.ground, jumps:s.jumps, beatT:s.beatT, falling:0, noCut:true, cam:0, camV:0, ff:0, ffUsed:false });
    S.rw = null; S.past = []; S.hist = []; S.inv = 80; sfx('play');
    if (bgm.active) bgmPlay(beatToSong(s.beatT));
  }
  // OVERDRIVE 중에 번 게이지는 쌓아 뒀다가 끝날 때 돌려받고, BREAK와 과열 중엔 차지 않는다. CLEAN 중엔 그대로 찬다
  // 충전량은 바퀴 표의 gauge 배율(후반일수록 많이) × 숨은 보정
