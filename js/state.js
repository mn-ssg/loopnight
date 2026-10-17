
  /* ================= 상태 ================= */
  let mode = 'title', held = false, S = null, titleT = 0, idleT = 0;
  let best = 0, bestLoop = 1, newRecord = false;
  try { best = +localStorage.getItem('loopnight-best') || 0; bestLoop = +localStorage.getItem('loopnight-bestloop') || 1; } catch (e) {}
  // 플레이 로그: CLIMAX 선택마다 방향 · 바퀴 · 마모 · HP · 잔상 수, 능력이 끝날 때 그동안 번 점수와 맞았는지(hit) · 그 사이 게임오버(died)
  // 콘솔에서 LOOPNIGHT.log()로 방향별 선택률 표, LOOPNIGHT.clear()로 비우기. 대기 화면 기록 페이지에도 선택률 한 줄
  const LOG_KEY = 'loopnight-picks', LOG_MAX = 500;
  let picks = [];
  try { picks = JSON.parse(localStorage.getItem(LOG_KEY)) || []; } catch (e) {}
  const savePicks = () => { try { localStorage.setItem(LOG_KEY, JSON.stringify(picks)); } catch (e) {} };
  const pickRate = () => {
    const n = { left:0, up:0, right:0 }; for (const p of picks) if (p.dir in n) n[p.dir]++;
    const all = n.left + n.up + n.right; return all ? { all, left:n.left / all, up:n.up / all, right:n.right / all } : null;
  };
  // 피격 로그: 부딪힐 때마다 무엇에(B 바리케이드 · W 블록 · T 상자 · D 드론 · E 게이트 · L 간판 · P 구멍 · C 뒤차) · 바퀴 · 걸린 마모 ·
  // DROPOUT/IDIOTAPE 중이었나 · 켜진 능력 · 잔상이 막았나(guarded) · 그 피격으로 게임오버(fatal). LOOPNIGHT.log()에 사망 원인 표로 나온다
  const HIT_KEY = 'loopnight-hits', FAIL_KEY = 'loopnight-fails';
  let hits = [], fails = { lap:0, n:0 };
  try { hits = JSON.parse(localStorage.getItem(HIT_KEY)) || []; fails = JSON.parse(localStorage.getItem(FAIL_KEY)) || fails; } catch (e) {}
  const saveHits = () => { try { localStorage.setItem(HIT_KEY, JSON.stringify(hits)); localStorage.setItem(FAIL_KEY, JSON.stringify(fails)); } catch (e) {} };
  window.LOOPNIGHT = {
    log() {
      const NAME = { left:'← BREAK', up:'↑ PURIFY', right:'→ OVERDRIVE', none:'(시간 초과)' }, rate = pickRate(), sum = {}, laps = {};
      for (const p of picks) {
        const r = sum[p.dir] || (sum[p.dir] = { n:0, hit:0, died:0, gain:0 });
        r.n++; r.hit += p.hit ? 1 : 0; r.died += p.died ? 1 : 0; r.gain += p.gain || 0;
        if (p.dir === 'none') continue;
        const b = p.lap >= 5 ? 'LOOP 5+' : 'LOOP ' + p.lap, l = laps[b] || (laps[b] = { '← BREAK':0, '↑ PURIFY':0, '→ OVERDRIVE':0 });
        l[NAME[p.dir]]++;
      }
      const table = {};
      for (const d of ['left', 'up', 'right', 'none']) {
        const r = sum[d]; if (!r) continue;
        table[NAME[d]] = { '선택률':d === 'none' || !rate ? '-' : (rate[d] * 100).toFixed(1) + '%', '횟수':r.n, '능력 중 피격':r.hit, '게임오버':r.died, '평균 획득 점수':d === 'none' ? '-' : Math.round(r.gain / r.n) };
      }
      console.table(table); console.table(laps);
      // 바퀴별 피격 원인 · 게임오버 원인(그 순간의 조건 포함)
      const byLap = {}, fatal = {};
      for (const h of hits) {
        const c = h.t + (h.tangle ? '(엉킴)' : ''), r = byLap['LOOP ' + h.lap] || (byLap['LOOP ' + h.lap] = {});
        r[c] = (r[c] || 0) + 1;
        if (h.fatal) { const k = 'LOOP ' + h.lap + ' · ' + c + (h.drop ? ' · DROPOUT' : '') + (h.live ? ' · IDIOTAPE' : '') + (h.power ? ' · ' + h.power : ''); fatal[k] = (fatal[k] || 0) + 1; }
      }
      console.table(byLap); console.table(fatal);
      return picks.length;
    },
    // 코스 검증 결과: 바퀴마다 장애물 수 · 가장 긴 묶음 · 가장 빠듯한 여유(프레임) · 검증이 끈 장애물
    validate(n = 12) { const t = {}; for (let L = 1; L <= n; L++) { const v = validateLap(L); t['LOOP ' + L] = { '속도':lapCfg(L).speed.toFixed(2), '장애물':v.n, '최장 묶음':v.chain, '최소 여유(f)':v.slack, '끈 것':v.cut.join(' ') || '-' }; } console.table(t); },
    clear() { picks = []; hits = []; fails = { lap:0, n:0 }; savePicks(); saveHits(); }
  };
  // 속도: 바퀴 표의 기본 속도(숨은 보정만큼 느리게) + BREAK 돌진, OVERDRIVE 배율. 어떤 경우에도 장애물이 화면에 들어와 닿기까지 MIN_REACT 프레임은 남긴다
  const speedOf = () => Math.min((W + 20 - HX) / MIN_REACT,
    (lapCfg(S.lap).speed * (1 - DDA.speed * S.assist) + (S.climax > 0 ? 0.8 : 0)) * (S.drive > 0 ? OD_SPEED : 1));
  // 곡이 있으면 곡의 템포 고정, 없으면 신스 음악이 바퀴·CLIMAX에 따라 빨라진다
  const bpm = () => bgm.active ? BGM.bpm : (116 + Math.min(8, S ? S.lap : 1) * 5) * (S && (S.climax > 0 || S.drive > 0) ? 1.12 : 1);
  const fpb = () => 3600 / bpm();
  const score = () => Math.floor(S.total / 10) + Math.floor(S.pts);
  const newRec = () => new Float32Array(Math.ceil(TRACK / 4) + 2);

  function freshState() {
    return { d:-220, prevD:-220, total:0, pts:0, lap:1, y:GROUND, vy:0, ground:true, jumps:0, spin:0, buf:0, queued:false, noCut:false,
          hp:HPMAX, inv:0, shake:0, flash:0, freeze:0, slow:0, banner:0, bannerWord:null, sub:'', enter:null,
          rec:newRec(), ghosts:[], hist:[], past:[], rw:null, pendingRewind:false, live:0, liveLen:0, liveIn:LIVE_IN, liveDone:false, beatHit:false, anim:0, beatT:0, overT:0,
          pops:[], parts:[], debris:[], gauge:0, climax:0, combo:0, chain:0, lapHit:false, falling:0, cars:[], springT:{},
          cam:0, camV:0, trail:[], fallX:0, fallSp:0, padPh:{}, guardFx:null, echoIn:0, ff:0, ffUsed:false, tapeCard:0, beatFx:0, pick:null, pickFx:null, drive:0, cleanFx:0,
          heat:0, clean:0, cleanMax:1, smash:0, odBank:0, lost:[], pickLog:null, climaxMax:CLIMAX_T, driveMax:DRIVE_T,
          wear:0, seal:0, card:null, assist:0, lapHits:0, lastHit:null,
          xfIn:null, xfOut:null, rings:[], xfp:[], odTrail:[], cleanW:0,
          warp:null, osd:null, gateCue:false, reel:0, pastFx:0, pastFilm:null,
          broken:new Set(), got:new Set(), near:new Set(), fired:new Set() };
  }
  // 타이틀: 새 세계를 만들어 카메라를 내린 채 흘려보낸다. 소리가 이미 허용된 뒤(게임오버 뒤 돌아온 경우)면 곡이 벽 너머처럼 먹먹하게 흐른다
  function enterTitle() {
    S = freshState(); S.d = S.prevD = -(W - HX) - 80 - GATE_GAP / 2; S.cam = TITLE_CAM;
    titleT = 0; idleT = 0; snaps.length = 0;
    setMode('title');
    if (ac && ac.state === 'running') { music.start(); muffle(700, .4); }
  }
  // 시작: 세계는 멈추지 않는다. 다가오는 게이트 가운데 첫 장애물이 아직 화면 밖에 있을 만큼 앞선 것을 출발선(p = 0)으로 삼는다
  // 게이트가 GATE_GAP마다 반복되니 그만큼 좌표를 옮겨도 화면은 그대로다. 곡은 처음부터 다시 틀지 않고 먹먹함만 걷어낸다
  function startGame(fromOver) {
    const j = Math.max(0, Math.floor(-(S.d + W - HX - 120) / GATE_GAP));
    S.d += j * GATE_GAP; S.prevD += j * GATE_GAP;
    S.enter = { t:fromOver ? 18 : 0 }; newRecord = false;
    setMode('play');
    if (music.on) muffle(20000, .5); else { music.start(); muffle(20000, .05); }
    sfx('play');
  }
  function setMode(m) {
    const prev = mode; mode = m;
    if (m === 'over') music.stop(true);
    if (m !== 'play') muffle(20000, .05);
    if (bgm.active && m === 'pause' && prev === 'play') { bgm.pos = bgmTime(); bgmHalt(); }
    if (bgm.active && m === 'play' && prev === 'pause') bgmPlay(bgm.pos);
  }
  function gameOver() {
    setMode('over'); S.overT = 0;
    if (S.pickLog) { S.pickLog.died = true; endPower(); }
    // 숨은 보정용: 같은 바퀴에서 연속으로 몇 번 끝났나 · 마지막 피격이 사망 원인
    fails = fails.lap === S.lap ? { lap:S.lap, n:fails.n + 1 } : { lap:S.lap, n:1 };
    if (S.lastHit) S.lastHit.fatal = true;
    saveHits();
    if (score() > best) { best = score(); newRecord = true; }
    if (S.lap > bestLoop) bestLoop = S.lap;
    try { localStorage.setItem('loopnight-best', String(best)); localStorage.setItem('loopnight-bestloop', String(bestLoop)); } catch (e) {}
    sfx('over');
  }
