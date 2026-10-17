
  /* ================= 코스 ================= */
  // B 바리케이드 · W 블록 · T 상자 · P 구멍 · D 드론 · E 전기 게이트 · S 스프링 · L 낮은 간판 · C 뒤에서 오는 차 / lap 등장 바퀴, max 마지막 바퀴, m 움직이는 드론 바퀴, w 폭
  // 낮은 간판: 판 아래가 바닥에서 SIGN_GAP 높이. 톡(약 0.13초 이하) 눌러 낮게 뛰면 통과, 꾹 눌러 높게 뛰면 머리가 부딪힌다
  // 뒤차는 이미 뛰어야 하는 장애물 위를 지나가게 둔다(620 → 바리케이드 880 · 1035 → 상자 쌍 · 2120 → 바리케이드 2380) — 속도가 바뀌어도 지나는 자리가 드론 밑 같은 틈에 걸리지 않게
  // 6바퀴부터는 속도 대신 '아까 본 구간의 의미'가 바뀐다: 6바퀴 드론 구간 끝에 뒤차 + 엉킨 상자 쌍 · 하늘 길(OVERDRIVE) / 7바퀴 DROPOUT 복귀 / 8바퀴 두 번째 바리케이드 위에 간판(낮게 톡)
  const OBS = [
    {p:200,t:'B'},{p:360,t:'D'},{p:500,t:'S'},{p:720,t:'P'},{p:880,t:'B'},{p:950,t:'B',lap:2},
    {p:1060,t:'D'},{p:1120,t:'D'},{p:1270,t:'T'},{p:1420,t:'E'},{p:1610,t:'P'},{p:1740,t:'D',m:3},
    {p:1880,t:'W'},{p:1915,t:'B',lap:3},{p:2020,t:'S'},{p:2080,t:'P',w:64},{p:2240,t:'E',lap:2},
    {p:2380,t:'B'},{p:2500,t:'D',lap:2},
    {p:985,t:'L',w:50,max:1},{p:1862,t:'L',w:50},{p:706,t:'L',w:64,lap:2},{p:944,t:'L',w:36,lap:8},
    {p:620,t:'C',lap:2},{p:1320,t:'C',lap:3},{p:2120,t:'C',lap:4},{p:1035,t:'C',lap:5},
    // tangle: 5바퀴부터 테이프가 엉켜 바로 뒤에 한 번 더 찍힌 복제. 진짜로 부딪히고, FF DASH로 끊을 수 있다
    {p:246,t:'B',lap:5,tangle:1},{p:1322,t:'T',lap:5,tangle:1},{p:2426,t:'B',lap:5,tangle:1}
  ];
  const SIZE = { B:[25,22], W:[27,14], T:[27,38], P:[36,0], D:[19,16], E:[73,48], S:[19,12], L:[50,0], C:[0,0] };
  const PICK = [];
  const arc = (c, peak, n = 5, gap = 15) => { const h = (n - 1) / 2; for (let i = -h; i <= h; i++) PICK.push({ p:c + i * gap, h:Math.round(peak * (1 - (i * i) / ((h + 1) * (h + 1)))) + 6 }); };
  // 카세트 줄은 공중에 떠 있어서 점프해야 먹는다 (h 24는 짧게 톡, 40은 꾹). lap: 그 바퀴부터 나타난다
  const row = (s, n = 5, h = 40, lap = 1) => { for (let i = 0; i < n; i++) PICK.push({ p:s + i * 15, h, lap }); };
  arc(212, 48); arc(600, 118, 7, 18); row(790); arc(892, 48); arc(1180, 84, 3);
  arc(1284, 64); row(1500); arc(1628, 48); row(1790, 5, 24); arc(2112, 104, 7, 16); arc(2392, 48); row(2440);
  // 하늘 길(6바퀴~): 전기 게이트 위 높은 줄. 2단 점프로는 안 닿고 OVERDRIVE의 3단 점프로만 — 능력을 고르면 새 길이 열린다
  row(1404, 5, 140, 6);

  /* ================= 바퀴별 난이도: 난이도 숫자는 전부 여기서만 조정한다 ================= */
  // 바퀴가 오를수록 확실히 어려워지되, 한 바퀴에 새 요소는 한두 개만 — 속도 · 디버프 · 장애물 · 화면 효과가 한꺼번에 곱해져 오르지 않게
  // 1 이해한다 · 2 조금 빨라졌다 · 3 능력을 써야겠다 · 4 집중해야 한다 · 5 미쳐가기 시작한다(새 패턴 · 연출 위주, 수치는 조금만) · 6+ 시스템을 쓰면 더 간다
  // speed     기본 달리기 속도(px/프레임, 3 = 100%)
  // debuffs   이 바퀴의 테이프 마모(약한 것 → 센 것). 바퀴를 넘을 때마다 한 칸씩 차오르고 PURIFY는 맨 뒤(가장 센 것)부터 걷는다. 동시에 MAX_DEBUFF개까지
  //           4바퀴에서 NOISE가 DROPOUT으로 굳고, 5바퀴는 HEAD CLEAN(VHS 자동 헤드 청소)이 DROPOUT을 걷어 새 마모(TANGLE)와 IDIOTAPE에 집중하게 한다
  // drop      DROPOUT [주기, 끊김 길이](프레임) · wow WOW 동안 박자 밖 점프 높이 배율 · carWarn 뒤차 ! 경고(프레임)
  // power     능력 지속시간 배율(BREAK · OVERDRIVE · CLEAN, 과열은 그만큼 짧아진다) — 후반일수록 능력도 같이 자란다
  // gauge     게이지 충전 배율 · gateGauge 게이트 접근 구간(GATE_AP[0] 안)의 카세트 배율 — 5바퀴 직전에 능력을 준비해 들어가게
  // echo      SYNC 높이 허용(±px, 잔상 강화) · vfx 화면 고장 연출 세기 0~1(판정과 무관한 연출만, 장애물 테두리 빛도 이만큼)
  // clean     바퀴가 바뀌며 사라진 마모를 알리는 이름(테이프 라벨)
  const MAX_DEBUFF = 3, MIN_REACT = 45;
  const LOOPS = [null,
    { speed:3.00, debuffs:[],                         drop:null,     wow:1,   carWarn:62, power:1,    gauge:1,    gateGauge:1, echo:8,  vfx:0   },
    { speed:3.30, debuffs:['NOISE'],                  drop:null,     wow:1,   carWarn:60, power:1,    gauge:1,    gateGauge:1, echo:8,  vfx:.15 },
    { speed:3.55, debuffs:['NOISE', 'WOW'],           drop:null,     wow:.94, carWarn:56, power:1,    gauge:1,    gateGauge:1, echo:8,  vfx:.3  },
    { speed:3.80, debuffs:['WOW', 'DROPOUT'],         drop:[360,30], wow:.94, carWarn:52, power:1.05, gauge:1.1,  gateGauge:2, echo:8,  vfx:.5  },
    { speed:3.95, debuffs:['WOW', 'TANGLE'],          drop:null,     wow:.94, carWarn:50, power:1.1,  gauge:1.1,  gateGauge:1, echo:9,  vfx:.8, clean:'HEAD CLEAN' },
    { speed:4.10, debuffs:['WOW', 'TANGLE'],          drop:null,     wow:.94, carWarn:48, power:1.15, gauge:1.15, gateGauge:1, echo:10, vfx:.85 },
    { speed:4.25, debuffs:['WOW', 'TANGLE', 'DROPOUT'], drop:[330,36], wow:.94, carWarn:46, power:1.2, gauge:1.2, gateGauge:1, echo:10, vfx:.9  },
    { speed:4.40, debuffs:['WOW', 'TANGLE', 'DROPOUT'], drop:[315,40], wow:.93, carWarn:44, power:1.25, gauge:1.25, gateGauge:1, echo:11, vfx:1 }];
  // 9바퀴부터(Soft Cap): 마지막 줄에서 LOOP_CAP 쪽으로 바퀴마다 남은 거리의 SOFT만큼만 다가간다 — 계속 어려워지지만 증가 폭이 점점 줄어든다
  const LOOP_CAP = { speed:4.9, drop:[300,44], wow:.92, carWarn:42, power:1.35, gauge:1.35, echo:12, vfx:1 }, SOFT = .25;
  const CFG = [];
  function lapCfg(L) {
    if (CFG[L]) return CFG[L];
    const last = LOOPS.length - 1;
    if (L <= last) return (CFG[L] = LOOPS[Math.max(1, L)]);
    const a = LOOPS[last], k = 1 - Math.pow(1 - SOFT, L - last), mix = (x, y) => x + (y - x) * k;
    const c = Object.assign({}, a, { gateGauge:1, clean:null });
    for (const f in LOOP_CAP) c[f] = Array.isArray(a[f]) ? a[f].map((v, i) => Math.round(mix(v, LOOP_CAP[f][i]))) : mix(a[f], LOOP_CAP[f]);
    c.carWarn = Math.round(c.carWarn);
    return (CFG[L] = c);
  }
  // 숨은 보정(Dynamic Difficulty): 같은 바퀴에서 계속 실패할 때만 아주 조금 돕고, 잘한다고 더 어렵게 만들지는 않는다
  // 판을 넘어: 같은 바퀴에서 연속 게임오버(2번째부터 0.5씩) · 판 안에서: 한 바퀴에 2번 넘게 부딪힘(0.5씩). 0~1을 ramp씩 천천히 오가고, 그 바퀴를 넘기면 사라진다
  // assist 1일 때 speed 속도 −4%(장애물 사이 시간 +4%) · gauge 게이지 +10% · drop DROPOUT 끊김 −20% · car 뒤차 경고 +8프레임
  const DDA = { speed:.04, gauge:.1, drop:.2, car:8, ramp:.004 };
  // IDIOTAPE LIVE 첫 CALM_T 프레임 동안 지나갈 구간(CALM_FROM부터)은 1바퀴 배치만 남는다 — 연출을 알아보는 동안 정보가 넘치지 않게.
  // 바퀴가 시작될 때 이미 정해져 있어서, 보이던 장애물이 눈앞에서 사라지는 일은 없다
  const CALM_T = 150, CALM_FROM = SECRET_AT - 300;
  // 코스 검증: 착지해서 다시 뛸 틈이 없는 장애물 묶음은 MAX_CHAIN개까지, 2단 점프 한 번 안에 넘을 수 있어야 한다(TIMING 프레임 여유 포함)
  const MAX_CHAIN = 3, TIMING = 4;
