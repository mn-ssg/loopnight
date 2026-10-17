
  /* ================= 소리 ================= */
  let ac = null, noiseBuf = null, master = null, cut = null;
  function ensureAudio() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
        const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        master = ac.createBiquadFilter(); master.type = 'lowpass'; master.frequency.value = 20000;
        cut = ac.createGain(); master.connect(cut).connect(ac.destination); // 게이트 통과 때 모든 소리를 순간 끊는 스위치
        bgm.gain = ac.createGain(); bgm.gain.connect(master);
        bgm.an = ac.createAnalyser(); bgm.an.fftSize = 64; bgm.fq = new Uint8Array(32); bgm.gain.connect(bgm.an);
      } catch (e) { ac = null; }
    }
    if (ac && ac.state === 'suspended') ac.resume();
  }
  function tone(f1, f2, dur, type = 'square', vol = .05, at = 0) {
    if (!ac) return;
    const t = at || ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + .02);
  }
  function noise(t, vol, len = .04, freq = 7000, type = 'highpass') {
    if (!ac || !noiseBuf) return;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + len + .02);
  }
  // 모든 소리의 높은 음역을 f(Hz)까지 dur초 동안 걸러낸다 (선택 중 먹먹하게 → 고르면 확 열림)
  function muffle(f, dur) {
    if (!ac || !master) return;
    const t = ac.currentTime, q = master.frequency; q.cancelScheduledValues(t); q.setValueAtTime(q.value, t); q.exponentialRampToValueAtTime(f, t + dur);
    if (bgm.el && bgm.active) bgm.el.volume = BGM.volume * (f < 5000 ? .4 : 1); // <audio> 재생은 필터 대신 볼륨으로
  }

  // 오디오를 순간 끊는다(sec초 뒤 복귀) · 바로 되살린다
  function audioCut(sec) { if (!cut) return; const t = ac.currentTime, g = cut.gain; g.cancelScheduledValues(t); g.setValueAtTime(0, t); g.setValueAtTime(1, t + sec); }
  function audioOn() { if (!cut) return; const t = ac.currentTime; cut.gain.cancelScheduledValues(t); cut.gain.setValueAtTime(1, t); }

  /* ================= BGM 재생 ================= */
  // http(s)로 열면 Web Audio로 재생: 정확한 박자 시계 · 되감기 때 곡을 실제로 거꾸로 감기 · 필터 · 실제 스펙트럼.
  // file://로 열어 파일을 직접 읽을 수 없으면 <audio>로 재생(박자는 맞추고, 거꾸로 감기는 생략). 파일이 없으면(404) 신스 음악
  const bgm = { buf:null, rev:null, el:null, src:null, gain:null, an:null, fq:null, startAt:0, pos:0, playing:false, active:false };
  fetch(BGM.src).then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status))
    .then(b => new OfflineAudioContext(2, 1, 44100).decodeAudioData(b))
    .then(buf => {
      bgm.buf = buf;
      const rev = new AudioBuffer({ length:buf.length, numberOfChannels:buf.numberOfChannels, sampleRate:buf.sampleRate });
      for (let c = 0; c < buf.numberOfChannels; c++) rev.getChannelData(c).set(buf.getChannelData(c).slice().reverse());
      bgm.rev = rev;
    })
    .catch(e => {
      if (typeof e === 'number') return;
      const el = new Audio(); el.loop = true; el.preload = 'auto'; el.src = BGM.src;
      el.addEventListener('canplaythrough', () => { bgm.el = el; }, { once:true });
    });
  // 곡 위치 t(초)부터 재생. rev면 그 위치에서 거꾸로(rate배 빠르게) — 되감기 소리
  function bgmPlay(t, rev = false, rate = 1) {
    bgmHalt();
    if (bgm.buf && ac) {
      const s = ac.createBufferSource(), len = bgm.buf.duration;
      s.buffer = rev ? bgm.rev : bgm.buf; s.loop = true; s.playbackRate.value = rate; s.connect(bgm.gain);
      s.start(0, rev ? mod(len - t, len) : mod(t, len));
      bgm.src = s; bgm.startAt = ac.currentTime - t;
    } else if (bgm.el && !rev) { bgm.el.currentTime = mod(t, bgm.el.duration || 1); bgm.el.play().catch(() => {}); }
    bgm.playing = !rev;
  }
  // 게이트에 다가가는 동안: 곡을 거꾸로 돌린 소리가 통과 순간까지 아주 작게 차오른다 (Web Audio로 곡을 읽었을 때만)
  function bgmGhost(dur) {
    if (!bgm.rev || !ac || !bgm.playing) return;
    const s = ac.createBufferSource(), g = ac.createGain(), len = bgm.buf.duration, t = ac.currentTime;
    s.buffer = bgm.rev; s.connect(g).connect(master);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.2 * BGM.volume, t + dur);
    s.start(t, mod(len - bgmTime(), len)); s.stop(t + dur); bgm.ghost = s;
  }
  function bgmHalt() { if (bgm.src) { try { bgm.src.stop(); } catch (e) {} bgm.src = null; } if (bgm.el) bgm.el.pause(); bgm.playing = false; }
  // 곡 안의 지금 위치(초). Web Audio에선 곡이 반복돼도 계속 이어지는 값이라 박자가 끊기지 않는다
  const bgmTime = () => !bgm.playing ? bgm.pos : bgm.buf ? ac.currentTime - bgm.startAt : bgm.el.currentTime;
  // 게임의 박자 시계(beatT, 프레임 단위)와 곡 위치(초)를 오간다
  const songToBeat = t => Math.max(0, (t - BGM.beat0) * 60), beatToSong = bt => bt / 60 + BGM.beat0;
  // 매 프레임: DROPOUT이면 곡이 신호 끊긴 듯 작아지고, WOW(테이프 늘어짐)면 음정이 살짝 출렁인다
  function bgmFx() {
    const v = BGM.volume * (dropOn() ? .15 : 1);
    if (bgm.gain) bgm.gain.gain.setTargetAtTime(v, ac.currentTime, .06); else if (bgm.el) bgm.el.volume = v;
    if (bgm.src) bgm.src.playbackRate.value = 1 + wowAmt() * Math.sin(ac.currentTime * 5.3);
  }
  function sfx(n, x = 0) {
    if (!ac) return;
    const now = ac.currentTime;
    if (n === 'jump') { tone(330, 660, .09); noise(now, .03, .05, 3000); }
    else if (n === 'jump2') { tone(520, 1040, .1, 'square', .045); noise(now, .04, .08, 2000); }
    else if (n === 'spring') { tone(200, 900, .25, 'square', .05); tone(400, 1800, .25, 'triangle', .03); }
    else if (n === 'stomp') { tone(600 + x * 80, 200, .1, 'square', .06); noise(now, .07, .08, 1500, 'bandpass'); }
    else if (n === 'close') { tone(1500, 2200, .07, 'triangle', .04); tone(2200, 3000, .12, 'sine', .03, now + .06); }
    else if (n === 'warn') tone(880, 880, .07, 'square', .05);
    else if (n === 'car') noise(now, .14, .5, 600, 'lowpass');
    else if (n === 'zap') noise(now, .06, .12, 4000, 'bandpass');
    else if (n === 'rewind') { tone(1200, 120, .7, 'sawtooth', .05); noise(now, .05, .7, 2500, 'bandpass'); }
    else if (n === 'play') { tone(300, 600, .08, 'square', .04); tone(600, 900, .08, 'square', .04, now + .08); }
    else if (n === 'whoosh') noise(now, .06, .35, 1200, 'bandpass');
    else if (n === 'pick') tone(880 + x * 40, 1320 + x * 40, .06, 'square', .035);
    else if (n === 'hit') { tone(160, 60, .22, 'sawtooth', .07); noise(now, .06, .15, 800, 'lowpass'); }
    else if (n === 'fall') { tone(500, 60, .55, 'triangle', .07); noise(now, .05, .6, 900, 'bandpass'); }
    else if (n === 'wire') { tone(1800, 500, .06, 'square', .025); noise(now, .04, .08, 5000, 'bandpass'); }
    else if (n === 'smash') { tone(220, 50, .15, 'sawtooth', .06); noise(now, .08, .1, 2000); }
    else if (n === 'go') [523, 784, 1047].forEach((f, i) => tone(f, f, .1, 'square', .05, now + i * .06));
    else if (n === 'lap') [523, 659, 784, 1047].forEach((f, i) => tone(f, f, .08, 'square', .045, now + i * .07));
    else if (n === 'perfect') [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, .09, 'square', .05, now + i * .06));
    else if (n === 'climax') [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f * 1.01, .08, 'square', .05, now + i * .05));
    else if (n === 'secret') [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, .1, 'triangle', .06, now + i * .09));
    else if (n === 'over') tone(392, 98, .6, 'triangle', .07);
    else if (n === 'beat') tone(1568, 1568, .05, 'square', .03);
    else if (n === 'riser') { tone(220, 1760, x || .4, 'sawtooth', .035); noise(now, .05, Math.min(.6, x || .4), 3000, 'bandpass'); }
    else if (n === 'livedrop') { tone(120, 30, .5, 'sine', .28); noise(now, .12, .6, 6000); [440, 554, 659, 880].forEach(f => tone(f, f, .3, 'square', .025)); }
    else if (n === 'pickOpen') { tone(880, 180, .35, 'sawtooth', .035); noise(now, .05, .4, 600, 'lowpass'); }
    else if (n === 'choose') { [[523, 784, 1047], [392, 587, 784], [659, 988, 1319]][x].forEach((f, i) => tone(f, f * 1.01, .35, 'square', .04, now + i * .03)); noise(now, .07, .4, 2500, 'bandpass'); }
    else if (n === 'deny') tone(140, 110, .15, 'square', .05);
    // 변신: 몸을 울리는 낮은 베이스 펄스 + 능력마다 다른 윗소리 / 해제: 피치가 떨어지며 테이프가 툭 끊긴다
    else if (n === 'xform') {
      tone(95, 32, .5, 'sine', .32); noise(now, .1, .3, 260, 'lowpass');
      if (x === 1) { tone(220, 55, .35, 'sawtooth', .05, now + .07); noise(now + .07, .08, .2, 1200, 'bandpass'); }
      else if (x === 0) { tone(1046, 1568, .45, 'sine', .045, now + .07); tone(1568, 2093, .45, 'triangle', .025, now + .1); }
      else { tone(330, 1760, .3, 'square', .03, now + .07); noise(now + .07, .06, .3, 4000, 'bandpass'); }
    }
    // 게이트: 다가가면 거꾸로 감긴 심벌처럼 통과 순간까지 차오르는 소리(x = 남은 초) · 통과 때 테이프가 감기며 피치가 떨어지는 소리(x = 길이) · 새 바퀴의 강한 재진입
    else if (n === 'swell') {
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noiseBuf; s.loop = true; f.type = 'highpass'; f.frequency.setValueAtTime(1200, now); f.frequency.exponentialRampToValueAtTime(7000, now + x);
      g.gain.setValueAtTime(.0001, now); g.gain.exponentialRampToValueAtTime(.09, now + x);
      s.connect(f).connect(g).connect(master); s.start(now); s.stop(now + x);
    }
    else if (n === 'tapewarp') { tone(1400, 70, x, 'sawtooth', .05); tone(320, 40, x, 'square', .025); noise(now, .07, x, 2200, 'bandpass'); }
    else if (n === 'reentry') { tone(160, 38, .55, 'sine', .34); noise(now, .1, .7, 5000); [262, 392, 523, 784].forEach((f, i) => tone(f, f, .35, 'square', .03, now + i * .02)); }
    else if (n === 'powerdown') { tone(700, 90, .32, 'square', .03); noise(now + .2, .12, .03, 6000); }
    else if (n === 'ff') { tone(300, 2400, .28, 'sawtooth', .035); noise(now, .05, .3, 3000, 'bandpass'); }
    else if (n === 'drop') { noise(now, .09, .5, 4000); tone(880, 60, .3, 'square', .03); }
    else if (n === 'guard') { tone(1600, 400, .18, 'square', .045); noise(now, .08, .25, 6000); tone(330, 110, .3, 'sawtooth', .04, now + .05); }
    else if (n === 'sync') [523, 659, 784, 1047].slice(0, x + 1).forEach(f => tone(f, f, .16, 'triangle', .045));
  }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const BASS = [45,45,57,45,43,43,55,43,41,41,53,41,43,43,55,47];
  const LEAD = [69,72,76,81,76,72,69,64];
  const music = { on:false, next:0, step:0, timer:null,
    start() { ensureAudio(); if (!ac) return; this.on = true; this.next = ac.currentTime + .06; this.step = 0;
      bgm.active = !!(bgm.buf || bgm.el);
      if (bgm.active) { if (bgm.gain) { bgm.gain.gain.cancelScheduledValues(ac.currentTime); bgm.gain.gain.value = BGM.volume; } else bgm.el.volume = BGM.volume; bgmPlay(0); }
      if (!this.timer) this.timer = setInterval(() => this.tick(), 25); },
    // fade: 게임오버 땐 곡이 1.2초 동안 서서히 사라진다
    stop(fade) {
      this.on = false; if (!bgm.active) return;
      if (fade && bgm.gain) { bgm.gain.gain.setTargetAtTime(0, ac.currentTime, .35); setTimeout(() => { if (!this.on) bgmHalt(); }, 1200); }
      else bgmHalt();
    },
    tick() {
      if (bgm.active) return;
      if (!ac || !this.on || (mode !== 'play' && mode !== 'title') || (S && (S.rw || S.warp))) { if (ac) this.next = ac.currentTime + .05; return; }
      const fever = S && S.climax > 0, st = 60 / bpm() / 2, wow = S ? wowAmt() : 0, lost = S && dropOn(), live = S && liveK() > .2 && S.liveLen - S.live >= S.liveIn;
      while (this.next < ac.currentTime + .12) {
        const i = this.step % 16, t = this.next;
        const fl = 1 + wow * Math.sin(t * 5.3);
        if (live) {
          const root = BASS[i & 12] + 24;
          if (i % 2 === 0) tone(160, 40, .14, 'sine', .22, t);
          else noise(t, .045, .07, 8000);
          if (i % 4 === 2) noise(t, .08, .12, 1500, 'bandpass');
          tone(mtof(BASS[i] - 12), mtof(BASS[i] - 12), st * .8, 'sawtooth', .05, t);
          tone(mtof(root + [0, 7, 12, 7][i % 4]), mtof(root + [0, 7, 12, 7][i % 4]), st * .6, 'square', .03, t);
          this.next += st; this.step++; continue;
        }
        if (lost) noise(t, .03, st, 5000);
        else tone(mtof(BASS[i]) * fl, mtof(BASS[i]) * .999 * fl, st * .9, 'triangle', .09, t);
        if (i % 4 === 0) tone(150, 45, .12, 'sine', .14, t);
        if (i % 2 === 1) noise(t, .022);
        if (i % 8 === 4) noise(t, .05, .1, 1800, 'bandpass');
        if (lost) { /* 신호가 끊긴 동안 멜로디 없음 */ }
        else if (fever) tone(mtof(LEAD[i % 8] + 12), mtof(LEAD[i % 8] + 12), st * .7, 'square', .03, t);
        else if (i % 4 === 2) tone(mtof(BASS[i] + 24), mtof(BASS[i] + 24), st * .45, 'square', .018, t);
        this.next += st; this.step++;
      }
    }
  };
