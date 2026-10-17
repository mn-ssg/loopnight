
  // 타이틀: 세계가 플레이 속도로 흐른다(주인공 · 충돌 없음). 게이트 한 칸만큼 지나면 그만큼 뒤로 감아도 화면은 그대로다
  function titleStep() {
    titleT++; idleT++; S.anim++;
    S.beatT = bgm.active && bgm.playing ? songToBeat(bgmTime()) : S.beatT + 1;
    const sp = speedOf(); S.prevD = S.d; S.d += sp; S.total += sp; S.reel += .06;
    if (S.d >= -(W - HX) - 80) { S.d -= GATE_GAP; S.prevD -= GATE_GAP; }
    if (idleT >= IDLE_T + INFO_T * 4) idleT = 0;
  }
  const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  function update() {
    if (mode === 'title') { titleStep(); return; }
    if (mode === 'over') {
      S.overT++;
      if (S.falling > 0) stepFall();
      stepFx(0);
      if (S.overT > 720) enterTitle();
      return;
    }
    if (mode !== 'play') return;
    // 시작 전환: 카메라가 플레이 위치로 올라오고, 주인공이 들어와 자리를 잡는 순간 조작이 열린다
    if (S.enter) {
      const e = S.enter; e.t++;
      S.cam = TITLE_CAM * (1 - ease(Math.min(1, e.t / 36))); S.camV = 0;
      if (e.t === ENTER_CTRL) sfx('go');
      if (e.t >= ENTER_T) { S.enter = null; S.cam = 0; }
    }
    if (S.guardFx && --S.guardFx.t <= 0) S.guardFx = null;
    if (S.pickFx && --S.pickFx.t <= 0) S.pickFx = null;
    if (S.cleanFx > 0) S.cleanFx--;
    // 변신 연출은 Hit Stop 동안에도 흐른다(세계만 멈춘다)
    if (S.xfIn && ++S.xfIn.t >= XF_IN) S.xfIn = null;
    if (S.xfOut && --S.xfOut.t <= 0) S.xfOut = null;
    if (S.osd && ++S.osd.t >= OSD_T) S.osd = null;
    if (S.pastFx > 0) S.pastFx--;
    if (S.warp) { warpStep(); return; }
    if (S.freeze > 0) { S.freeze--; if (S.freeze === 0 && S.pendingRewind && !S.falling) startRewind(); return; }
    if (S.rw) {
      S.anim++;
      if (S.rw.rise.length) {
        let t; for (let k = 0; k < 3 && S.rw.rise.length; k++) t = S.rw.rise.pop();
        S.camV = t.cam - S.cam; S.y = t.y; S.cam = t.cam;
        return;
      }
      S.cam = 0; S.camV = 0;
      S.rw.i -= 3;
      const s = S.rw.snaps[Math.max(0, S.rw.i)];
      S.d = s.d; S.total = s.total; S.y = s.y;
      if (S.rw.i <= 0) endRewind();
      return;
    }
    if (S.pick) {
      if (++S.pick.t >= PICK_T) skipPick();
      else { S.pick.acc += PICK_SLOW; if (S.pick.acc < 1) return; S.pick.acc -= 1; }
    }
    if (S.slow > 0) { S.slow--; if (S.slow % 2) { stepFx(0); return; } }

    S.anim++;
    // 숨은 보정: 목표치(같은 바퀴 연속 게임오버 · 이번 바퀴 피격 수)로 천천히 다가간다
    const goal = Math.min(1, Math.max(0, S.lap === fails.lap ? (fails.n - 1) * .5 : 0, (S.lapHits - 2) * .5));
    S.assist += Math.max(-DDA.ramp, Math.min(DDA.ramp, goal - S.assist));
    const pbt = S.beatT;
    S.beatT = bgm.active && bgm.playing ? songToBeat(bgmTime()) : S.beatT + 1;
    S.beatHit = Math.floor(S.beatT / fpb()) !== Math.floor(pbt / fpb()); // 이번 프레임에 박이 넘어갔나
    if (bgm.active) bgmFx();
    const sp = S.falling ? 0 : speedOf() * (S.ff > 0 ? 2.4 : 1);
    S.prevD = S.d; S.d += sp; S.total += sp;
    if (S.climax > 0 || S.drive > 0) S.pts += sp / 10;
    if (S.d >= TRACK) { S.d -= TRACK; S.prevD -= TRACK; S.past = []; nextLap(); }

    if (S.queued) {
      S.queued = false;
      if (!S.falling) {
        if (S.ground) jump(1);
        else if (S.vy > 0 && GROUND - S.y < 14) S.buf = 8;
        else if (S.jumps < airMax()) jump(2);
        else if (wearMax() >= 4 && !S.ffUsed && !heavy()) ffDash();
      }
    }
    if (S.buf > 0) { S.buf--; if (S.ground && !S.falling) { jump(1); S.buf = 0; } }
    if (S.spin > 0) S.spin--;

    if (S.falling > 0) {
      stepFall();
      if (S.falling === 0) { if (S.pendingRewind) { startRewind(); return; } S.y = GROUND; S.vy = 0; S.ground = true; S.jumps = 0; S.cam = 0; S.camV = 0; }
    } else if (S.ff > 0) { S.ff--; S.vy = 0; }
    else if (!S.ground) {
      if (!held && !S.noCut && S.vy < -3) S.vy = -3;
      S.vy += GRAV; S.y += S.vy;
      if (S.y >= GROUND) {
        S.y = GROUND; S.vy = 0; S.ground = true; S.jumps = 0; S.chain = 0; S.noCut = false; S.ffUsed = false;
        burst(HX, GROUND - 1, 3, ['#3d5868'], .7);
      }
    }
    if (!S.falling && S.inv === 0) { S.past.push({ d:S.d, total:S.total, y:S.y, vy:S.vy, ground:S.ground, jumps:S.jumps, beatT:S.beatT }); if (S.past.length > 96) S.past.shift(); }
    if (S.d >= 0) S.rec[Math.floor(S.d / 4)] = Math.max(0, GROUND - S.y);
    S.hist.push(S.y); if (S.hist.length > 20) S.hist.shift();
    S.ghosts.forEach((g, i) => { const tx = echoSlot(i); g.x += (tx - g.x) * .09; if (g.flash) g.flash--; });
    if (S.echoIn > 0 && !loopBusy()) S.echoIn--;
    if (S.tapeCard > 0 && !loopBusy() && S.banner <= 0) S.tapeCard--;
    if (S.beatFx > 0) S.beatFx--;
    xfStep(); gateStep();
    if (dropPh() === DROP_PRE) sfx('drop');

    // 뒤에서 오는 차
    for (const off of [0, TRACK]) {
      const L = off ? S.lap + 1 : S.lap;
      OBS.forEach((o, i) => {
        if (o.t !== 'C' || !active(o, L)) return;
        const p = o.p + off, key = L + ':' + i;
        if (S.prevD < p && S.d >= p && !S.fired.has(key)) { S.fired.add(key); S.cars.push({ t:0, warn:carWarn(), x:-60, passed:false }); }
      });
    }
    const hx = HX - 6, hw = 12, hy = S.y - 30, hh = 30;
    for (const car of S.cars) {
      car.t++;
      if (car.t < car.warn) { if (car.t % 12 === 1) sfx('warn'); continue; }
      if (car.t === car.warn) sfx('car');
      car.x += 9;
      const bx = car.x + 4, bw = 44, by = GROUND - 15;
      if (!S.falling && !S.ff && bx < hx + hw && bx + bw > hx) {
        if (S.y > by + 2 && S.climax > 0 && !car.passed) { car.passed = true; smash(car.x + 26, GROUND - 9, HX, S.y - 48); car.x = W + 200; }
        else if (S.y > by + 2 && S.climax === 0 && S.inv === 0) { hurt(() => { burst(car.x + 26, GROUND - 9, 14, [C.white, C.red, C.gray], 2.4); car.x = W + 200; }, { t:'C' }); return; }
        else if (!car.passed && S.y <= by + 2) { car.passed = true; S.pts += 150; pop('DODGE +150', HX, S.y - 48, C.teal); sfx('close'); }
      }
    }
    S.cars = S.cars.filter(c => c.x < W + 60);

    if (!S.falling) {
      let stop = false;
      eachObs((o, sx, key, L) => {
        if (stop || mode !== 'play' || S.freeze) return;
        const w = wOf(o), h = SIZE[o.t][1];
        if (o.t === 'P') {
          if (S.ground && S.inv === 0 && S.climax === 0 && HX > sx + 3 && HX < sx + w - 3) { fall(sx, w); stop = true; }
          return;
        }
        if (o.t === 'S') {
          S.padPh[key] = (S.padPh[key] || 0) + 1 + 2.5 * padCharge(sx) + (S.springT[key] ? 4 : 0);
          if (sx < hx + hw && sx + w > hx && S.y >= GROUND - 14 && (S.ground || S.vy > 0)) {
            S.vy = SPRING; S.ground = false; S.jumps = 1; S.noCut = true; S.springT[key] = 10; S.pts += 50;
            sfx('spring'); burst(HX, GROUND - 6, 10, [C.yellow, C.white], 1.8); pop('BOING!', HX, S.y - 48, C.yellow);
          }
          return;
        }
        let b;
        if (o.t === 'D') { const t = droneTop(o, L); b = { x:sx + 2, y:t + 3, w:w - 4, h:h - 5 }; }
        else if (o.t === 'E') { if (!gateOn(o)) return; b = { x:sx + 16, y:GROUND - 46, w:41, h:44 }; }
        else if (o.t === 'L') b = { x:sx + 2, y:0, w:w - 4, h:GROUND - SIGN_GAP + 4 }; // 그림 머리끝(판정 +8px)이 판에 4px 닿으면 충돌
        else b = { x:sx + 3, y:GROUND - h + 2, w:w - 6, h:h - 2 };
        const xo = b.x < hx + hw && b.x + b.w > hx;
        if (S.ff > 0) {
          if (o.tangle && xo && b.y < hy + hh && b.y + b.h > hy) {
            S.broken.add(key); S.pts += 150; S.shake = 4; sfx('smash');
            burst(b.x + b.w / 2, b.y + b.h / 2, 14, [C.pink, C.glow, C.white], 2.2); pop('CUT +150', HX, S.y - 48, C.pink);
          }
          return;
        }
        if (xo && b.y < hy + hh && b.y + b.h > hy) {
          if (o.t === 'D' && S.vy > 0 && S.y - S.vy <= b.y + 6) {
            S.broken.add(key); S.chain++; S.vy = STOMP; S.jumps = 1; S.noCut = true; S.freeze = 3; S.shake = 4;
            S.pts += 200 * S.chain; addGauge(3);
            S.debris.push({ x:sx, y:b.y, vy:-2 });
            burst(sx + 9, b.y + 4, 12, [C.white, C.teal, C.red], 2);
            pop(S.chain > 1 ? 'STOMP x' + S.chain : 'STOMP +200', HX, S.y - 48, C.white); sfx('stomp', S.chain);
          } else if (S.climax > 0) {
            S.broken.add(key);
            smash(b.x + b.w / 2, o.t === 'L' ? b.h - 8 : b.y + b.h / 2, b.x + b.w / 2, o.t === 'L' ? b.h + 4 : b.y - 6);
          } else if (S.inv === 0) { if (o.t === 'E') sfx('zap'); hurt(() => S.broken.add(key), o); stop = true; }
        } else if (xo && !S.ground && o.t !== 'D' && o.t !== 'E' && !S.near.has(key)) {
          const gap = o.t === 'L' ? hy - (b.y + b.h) : b.y - S.y;
          if (gap >= 0 && gap < 8) { S.near.add(key); S.pts += 100; S.slow = 16; pop('CLOSE! +100', HX, S.y - 48, C.white); sfx('close'); burst(HX, S.y, 8, [C.teal, C.white], 1.4); }
        }
      });
      if (stop || mode !== 'play') return;
      // SYNC: 장애물 한가운데를 지나는 순간, 지난 루프의 나와 같은 높이(±8)로 떠 있으면 그 잔상들이 내 몸에 겹친다
      // 같은 동작을 여러 루프 동안 다듬을수록(맞춘 잔상이 많을수록) 보상이 커진다
      if (S.ghosts.length && !S.ground && !S.rw) {
        const h = GROUND - S.y, idx = Math.floor(S.d / 4);
        OBS.forEach((o, i) => {
          if (o.t === 'C' || o.t === 'S' || !active(o, S.lap) || S.broken.has(S.lap + ':' + i)) return;
          const c = o.p + wOf(o) / 2;
          if (!(S.prevD < c && S.d >= c) || h < 6) return;
          // 허용 높이는 바퀴 표의 echo(후반일수록 넓게), CLEAN 중엔 테이프가 깨끗해 +6 더 넓다
          const tol = lapCfg(S.lap).echo + (S.clean > 0 ? 6 : 0);
          const hit = S.drive > 0 ? S.ghosts.slice() : S.ghosts.filter(g => { const e = g.rec[idx] || 0; return e > 6 && Math.abs(e - h) <= tol; });
          if (!hit.length) return;
          const m = hit.length, strike = S.drive > 0 && o.t !== 'P';
          hit.forEach(g => { g.x = HX - 2; g.flash = 16; });
          S.pts += 100 * m * (S.drive > 0 ? 2 : 1); addGauge(1 + m);
          if (strike) echoStrike(o, i, m);
          pop(strike ? (m > 1 ? 'ECHO STRIKE x' + m : 'ECHO STRIKE') : m > 1 ? 'SYNC x' + m : 'SYNC', HX, S.y - 48, strike ? C.yellow : C.glow); sfx('sync', m);
          burst(HX, S.y - 16, 6 + m * 3, [C.glow, C.white], 1.3);
        });
      }
    }

    for (const off of [0, TRACK]) {
      const L = off ? S.lap + 1 : S.lap;
      for (let i = 0; i < PICK.length; i++) {
        const k = PICK[i], key = L + ':' + i;
        if (S.got.has(key) || k.lap > L) continue;
        const sx = k.p + off - S.d + HX;
        if (sx < HX - 16 || sx > HX + 16) continue;
        const py = GROUND - k.h;
        if (sx + 7 > hx && sx - 7 < hx + hw && py > hy && py - 10 < hy + hh) { S.got.add(key); collect(sx, py - 4); }
      }
    }
    // BREAK가 끝나면 아주 짧은 무적 뒤 과열(후반일수록 짧게). OVERDRIVE가 끝나면 쌓아 둔 게이지를 1.5배로 돌려받는다. CLEAN이 끝나면 마모가 돌아온다
    if (S.climax > 0) { S.climax--; S.gauge = GAUGE * S.climax / S.climaxMax; if (S.climax === 0) { S.gauge = 0; S.inv = 20; S.heat = Math.round(HEAT_T / lapCfg(S.lap).power); endPower('left'); xfEnd('left'); } }
    if (S.drive > 0) {
      S.drive--; S.gauge = GAUGE * S.drive / S.driveMax;
      if (S.drive === 0) {
        const n = Math.round(S.odBank * OD_BANK); S.odBank = 0; endPower('right'); xfEnd('right');
        if (n) { pop('CHARGE +' + Math.round(Math.min(1, n * gaugeMul() / GAUGE) * 100) + '%', HX, S.y - 60, C.yellow); addGauge(n); }
      }
    }
    if (S.heat > 0) S.heat--;
    if (S.clean > 0 && --S.clean === 0) endClean();
    // IDIOTAPE LIVE: 무대 그림이 화면 오른쪽 끝에 들어오는 순간 라이저 → liveIn 뒤 드롭. 박자마다 꽃가루, 마디 첫 박엔 양옆 연주자에게서 픽셀이 터진다
    // 드롭 맞추기: 곡에 drop이 정해져 있으면 곡을 드롭 직전으로 넘기고(DJ 컷), 아니면 다음 마디 첫 박까지 라이저를 늘인다
    const liveAt = SECRET_AT - (W - HX) + 20;
    if (liveLap(S.lap) && !S.liveDone && !S.rw && S.prevD < liveAt && S.d >= liveAt) {
      const f = fpb(), toBar = (4 - (S.beatT / f) % 4) * f;
      if (bgm.active && BGM.drop != null) { S.liveIn = LIVE_IN; bgmPlay(BGM.drop - LIVE_IN / 60); }
      else S.liveIn = Math.round(toBar < 12 ? toBar + 4 * f : toBar);
      S.liveDone = true; S.liveLen = S.live = Math.max(S.liveIn + 120, Math.min(LIVE_T, Math.floor((LIVE_END - S.d) / speedOf()))); sfx('riser', S.liveIn / 60);
    }
    if (S.live > 0) {
      const t = S.liveLen - S.live, f = fpb();
      // 드롭: 시간이 잠깐 늘어진다(반 속도 12프레임) — 화면이 터지는 순간 손이 바빠지지 않게
      if (t === S.liveIn) { sfx('livedrop'); S.flash = 7; S.shake = 8; S.slow = 24; }
      if (t >= S.liveIn && S.beatHit) {
        for (let i = 0; i < 6; i++) { const left = i % 2; S.parts.push({ x:left ? Math.random() * 110 : W - Math.random() * 110, y:-VIEW_TOP - 4, vx:(Math.random() - .5) * .6, vy:.6 + Math.random(), g:.015, life:150, c:LIVE_COL[(i + Math.floor(S.beatT / f)) % 4] }); }
        if (Math.floor(S.beatT / f) % 4 === 0) { burst(56, 120, 16, LIVE_COL, 2.6); burst(W - 56, 120, 16, LIVE_COL, 2.6); }
      }
      if (--S.live === 0) { S.pts += 500; pop('ENCORE +500', HX, S.y - 60, C.yellow); sfx('secret'); }
    }
    for (const k in S.springT) if (--S.springT[k] <= 0) delete S.springT[k];
    if (S.inv > 0) S.inv--;
    if (S.banner > 0 && !loopBusy()) S.banner--;
    if (S.flash > 0) S.flash--;
    if (S.shake > 0) S.shake--;
    stepFx(sp);
  }
  function stepFx(sp) {
    for (const p of S.parts) { p.x += p.vx - sp * .5; p.y += p.vy; p.vy += p.g || .12; p.life--; }
    S.parts = S.parts.filter(p => p.life > 0);
    for (const d of S.debris) { d.x -= sp; d.vy += .35; d.y = Math.min(GROUND - 9, d.y + d.vy); }
    S.debris = S.debris.filter(d => d.x > -30);
    for (const p of S.pops) { p.t--; p.y -= .4; }
    S.pops = S.pops.filter(p => p.t > 0);
    for (const r of S.rings) r.t--;
    S.rings = S.rings.filter(r => r.t > 0);
    for (const p of S.xfp) { p.r *= .86; p.life--; }
    S.xfp = S.xfp.filter(p => p.life > 0 && p.r > 1);
  }
