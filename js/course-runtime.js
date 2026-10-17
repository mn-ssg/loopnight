
  /* ================= 진행 ================= */
  // 그 바퀴에 깔리는 장애물: 등장 바퀴 범위 · IDIOTAPE 첫 구간(calm) 제외 · 엉킨 복제는 그 바퀴에 TANGLE이 걸릴 때만 · 코스 검증이 끈 것 제외
  const present = (o, L) => (o.lap || 1) <= L && (!o.max || L <= o.max) && !calmCut(o, L);
  const active = (o, L) => present(o, L) && (!o.tangle || (debuffsAt(L).includes('TANGLE') && !S.clean)) && !validateLap(L).off.has(o);
  // 뒤차는 내 옆을 지나는 자리(경고 + 약 17프레임 뒤)로 따진다
  const carAt = (o, L) => o.p + lapCfg(L).speed * (lapCfg(L).carWarn + 17);
  const calmCut = (o, L) => {
    if (!liveLap(L) || (o.lap || 1) <= 1) return false;
    const x = o.t === 'C' ? carAt(o, L) : o.p;
    return x >= CALM_FROM && x < CALM_FROM + lapCfg(L).speed * CALM_T;
  };
  const wOf = o => o.w || SIZE[o.t][0];
  /* ---------- 코스 검증 ---------- */
  // 점프 궤적을 게임과 같은 방식(프레임마다 vy += GRAV, y += vy)으로 계산한다. k = 높이 배율(WOW 박자 밖), dbl = 떨어지기 직전 2단 점프
  // n = 높이 h보다 높이 떠 있는 프레임 수, rise = 바닥에서 h를 넘기까지 걸리는 프레임
  function arcAbove(h, k, dbl) {
    let y = 0, v = JUMP1 * k, n = 0, rise = 0, two = !dbl;
    for (let t = 1; t < 240; t++) {
      if (!two && v > 0 && y + v + GRAV >= -h) { v = JUMP2 * k; two = true; }
      v += GRAV; y += v;
      if (y >= 0) break;
      if (-y > h) { n++; if (!rise) rise = t; }
    }
    return { n, rise:rise || 99 };
  }
  // 바퀴 L에 깔릴 장애물을 그 바퀴의 가장 느린 속도(숨은 보정 포함)와 WOW 박자 밖 점프로 넘을 수 있는지 미리 확인한다
  // 낮은 간판 아래 지면 장애물은 간판 밑에서 16px 이상 여유가 있어야 하고, 사이에서 내려왔다 다시 오를 시간이 없는 묶음은 MAX_CHAIN개까지 · 2단 점프 한 번에 넘을 수 있어야 한다
  // 전기 게이트는 박자로 푸는 장애물(꺼진 순간 지나가거나 뛰어넘는다)이라 이웃과 묶지 않고, 켜져 있어도 혼자 2단 점프로 넘을 수 있는지만 본다
  // 어기면 나중에 덧붙은 장애물부터(엉킨 복제 → 늦게 등장하는 순) 그 바퀴에서 끄고 콘솔에 알린다 — 코스를 손으로 고쳐도 회피 불가능한 조합이 깔리지 않게
  const VALID = [], HAZ_H = { B:20, W:12, T:36, E:46 }, HERO_W = 12;
  function validateLap(L) {
    if (VALID[L]) return VALID[L];
    const c = lapCfg(L), v = c.speed * (1 - DDA.speed), k = c.debuffs.includes('WOW') ? c.wow : 1, tangle = c.debuffs.includes('TANGLE');
    const off = new Set(), res = VALID[L] = { off, cut:[], n:0, chain:0, slack:99 };
    const signs = OBS.filter(o => o.t === 'L' && present(o, L)).map(o => [o.p + 2 - HERO_W / 2, o.p + wOf(o) - 2 + HERO_W / 2]);
    for (let tries = 0; tries < 20; tries++) {
      // 지면 장애물: 히트박스(± 몸 반폭)를 지나는 동안 높이 h 위 · 구멍: 몸 가운데가 들어가는 동안 공중
      const hz = OBS.filter(o => present(o, L) && !off.has(o) && (!o.tangle || tangle) && (HAZ_H[o.t] || o.t === 'P')).map(o => {
        const x0 = o.t === 'E' ? o.p + 16 : o.p + 3, x1 = o.t === 'E' ? o.p + 57 : o.p + wOf(o) - 3;
        return o.t === 'P' ? { o, a:x0, b:x1, h:0 } : { o, a:x0 - HERO_W / 2, b:x1 + HERO_W / 2, h:HAZ_H[o.t] };
      }).sort((p, q) => p.a - q.a);
      let bad = null;
      for (const z of hz) if (z.h > SIGN_GAP - 50 && signs.some(([s0, s1]) => z.a < s1 && z.b > s0)) bad = bad || [z];
      const chains = []; let cur = null;
      for (const z of hz) {
        if (cur && z.o.t !== 'E' && cur.list[0].o.t !== 'E' && (z.a - cur.b) / v < arcAbove(cur.h, k).rise + arcAbove(z.h, k).rise + 1) { cur.list.push(z); cur.b = Math.max(cur.b, z.b); cur.h = Math.max(cur.h, z.h); continue; }
        chains.push(cur = { a:z.a, b:z.b, h:z.h, list:[z] });
      }
      res.n = hz.length; res.chain = 0; res.slack = 99;
      for (const ch of chains) {
        const need = (ch.b - ch.a) / v + TIMING, can = arcAbove(ch.h, k, true).n;
        res.slack = Math.min(res.slack, Math.floor(can - need)); res.chain = Math.max(res.chain, ch.list.length);
        if (can < need || ch.list.length > MAX_CHAIN) bad = bad || ch.list;
      }
      if (!bad) break;
      const opt = bad.filter(z => z.o.tangle || (z.o.lap || 1) > 1).sort((p, q) => (q.o.tangle ? 99 : q.o.lap) - (p.o.tangle ? 99 : p.o.lap));
      if (!opt.length) { console.warn('LOOP NIGHT: LOOP ' + L + ' 넘기 힘든 묶음', bad.map(z => z.o.t + z.o.p).join(' ')); break; }
      off.add(opt[0].o); res.cut.push(opt[0].o.t + opt[0].o.p);
    }
    if (res.cut.length) console.warn('LOOP NIGHT: LOOP ' + L + ' 검증으로 끈 장애물', res.cut.join(' '));
    return res;
  }
  function eachObs(fn, ahead = 20) {
    for (const off of [0, TRACK]) {
      const L = off ? S.lap + 1 : S.lap;
      for (let i = 0; i < OBS.length; i++) {
        const o = OBS[i]; if (o.t === 'C' || !active(o, L)) continue;
        const sx = Math.round(o.p + off - S.d + HX);
        if (sx < -90 || sx > W + ahead) continue;
        const key = L + ':' + i; if (S.broken.has(key)) continue;
        fn(o, sx, key, L);
      }
    }
  }
  function droneTop(o, L) {
    if (o.m && L >= o.m) return GROUND - 64 + Math.round(Math.sin((S.anim + o.p) / 14) * 10);
    return GROUND - 50 + Math.round(Math.sin(S.anim / 10) * 1.5);
  }
  const gatePhase = o => S.beatT / fpb() + o.p / 97;
  const gateOn = o => Math.floor(gatePhase(o)) % 4 < 2;
  const gateSoon = o => { const ph = gatePhase(o); return Math.floor(ph) % 4 === 3 && ph % 1 > .6; };
  // 공연 세기: 라이저 동안 0→1, 끝나기 전 1→0 · 조명 색은 마디마다 넘어간다
