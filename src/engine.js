/* 芭蕾舞女鬼 · 镜厅 —— 光线投射恐怖生存 */
(() => {
  'use strict';

  const $ = s => document.querySelector(s);
  window.__errors = window.__errors || [];
  window.addEventListener('error', e => {
    window.__errors.push(String(e.message) + ' @' + (e.filename || '') + ':' + (e.lineno || 0));
  });
  window.addEventListener('unhandledrejection', e => {
    window.__errors.push('Promise: ' + String(e.reason));
  });
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const norm = a => {
    a = a % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a < -Math.PI) a += Math.PI * 2;
    return a;
  };
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ================= 地图 ================= */
  const MW = 32, MH = 32;
  let map = new Uint8Array(MW * MH);
  let floorMap = new Uint8Array(MW * MH);
  let openCells = [];

  function buildWorld() {
    map.fill(1);
    floorMap.fill(0);
    const carve = (x0, y0, x1, y1, ft) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (x < 1 || y < 1 || x >= MW - 1 || y >= MH - 1) continue;
        const i = y * MW + x;
        map[i] = 0;
        floorMap[i] = ft;
      }
    };
    // 一间封闭的黑房间
    carve(9, 10, 21, 18, 1);

    // 墙面材质
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const i = y * MW + x;
      if (!map[i]) continue;
      let t = 1;
      // 东墙是一整面旧镜子
      if (x === 22 && y >= 10 && y <= 18) t = 3;
      // 上锁的房门
      if (x === 15 && y === 19) t = 5;
      map[i] = t;
    }
    openCells = [];
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      if (!map[y * MW + x]) openCells.push([x, y]);
    }
  }

  const cellAt = (x, y) => {
    if (x < 0 || y < 0 || x >= MW || y >= MH) return 1;
    return map[(y | 0) * MW + (x | 0)];
  };
  const isWall = (x, y) => cellAt(x, y) !== 0;

  /* ================= 游戏状态 ================= */
  const G = {
    mode: 'menu',
    paused: false,
    t: 0,
    runTime: 0,
    level: 1,
    keys: 0,
    charm: true,
    shake: 0,
    flashScare: 0,
    mirrorTimer: 28,
    apparitionTimer: 34,
    msgTimer: 0,
    dyingT: 0,
    won: false,
    phase: 'dance', act: 1, actMax: 5, actT: 0, actDur: 16,
    pauseT: 0, pauseDur: 5, switchT: 0, dancer: 4,
    immersion: 70, gaze: false, nearestDist: 99, safeDist: 3.2,
    finaleT: 0, stareLost: 0, lungeT: 0, lungeReason: '',
    finaleFrom: null, doorOpen: false, lungeFromFinale: false
  };

  const P = {
    x: 7.5, y: 27.4, dir: -Math.PI / 2,
    pitch: 0, bob: 0, bobAmt: 0,
    stamina: 100, breath: 100, battery: 100,
    flashlight: true, holding: false,
    keys: 0, sprinting: false, moving: false,
    breathLock: 0, staminaDelay: 0, invuln: 0,
    stepT: 0, gasp: 0,
    hidden: null, hideSpot: null, hidePrompt: null, hideT: 0
  };

  const hideSpots = [
    { type: 'wardrobe', x: 13.6, y: 7.7, ix: 13.1, iy: 8.6, ex: 13.1, ey: 9.0, label: '躲进衣柜' },
    { type: 'bed', x: 8.6, y: 9.4, ix: 8.6, iy: 10.45, ex: 8.6, ey: 10.8, label: '躲到床下' }
  ];

  const MANNEQUINS = [
    { x: 11.5, y: 12.5 },
    { x: 18.5, y: 12.5 },
    { x: 10.5, y: 15.8 },
    { x: 19.5, y: 15.8 },
    { x: 15.0, y: 10.8 }
  ];

  let ghosts = [];
  let items = [];
  let props = [];
  let visions = [];
  let lights = [];
  let fieldPlayer = null, fieldPlayerAt = -1, fieldTarget = null, fieldTargetCell = -1;
  let fieldPlayerCell = -1;

  /* ================= 画布 ================= */
  const view = $('#scene');
  const vctx = view.getContext('2d', { alpha: false });
  let RW = 1, RH = 1, f = 1, horizon = 1;
  let img = null, buf = null, zbuf = null;
  const QUALITY = [0.56, 0.72, 0.9];
  let quality = 1;
  let brightness = 1.15;
  let soundOn = true;
  let flashCloud = new Float32Array(1);
  let coneCol = new Float32Array(1);
  let VIGNETTE = null;

  let ART = null;
  let grainURL = '';

  function resize() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    const scale = QUALITY[quality] || 0.64;
    RW = Math.max(220, Math.min(820, Math.round(w * scale)));
    RH = Math.max(220, Math.min(1100, Math.round(RW * h / w)));
    view.width = RW;
    view.height = RH;
    img = vctx.createImageData(RW, RH);
    buf = new Uint32Array(img.data.buffer);
    zbuf = new Float32Array(RW);
    coneCol = new Float32Array(RW);
    flashCloud = new Float32Array(RW);
    const fov = h > w ? 1.34 : 1.22;
    f = (RW / 2) / Math.tan(fov / 2);
    document.body.classList.toggle('portrait', h > w * 1.05);
  }

  /* ================= 输入 ================= */
  const input = {
    keys: Object.create(null),
    joyX: 0, joyY: 0, joyActive: false,
    lookX: 0, lookY: 0,
    hidePressed: false,
    stickId: null, lookId: null,
    lastLookX: 0, lastLookY: 0,
    stickCX: 0, stickCY: 0
  };

  function bindInput() {
    window.addEventListener('keydown', e => {
      input.keys[e.code] = true;
      if (e.code === 'Escape') { if (G.mode === 'play') togglePause(true); }
      if (e.code === 'KeyF' && G.mode === 'play') toggleFlash();
      if (e.code === 'KeyE' && G.mode === 'play') input.hidePressed = true;
      if (e.code === 'Space' && G.mode === 'play') e.preventDefault();
      if ((e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD' || e.code === 'Space') && G.mode === 'play') e.preventDefault();
    });
    window.addEventListener('keyup', e => { input.keys[e.code] = false; });

    const canvas = view;
    canvas.addEventListener('click', () => {
      if (G.mode === 'play' && !isTouch && canvas.requestPointerLock) {
        try { canvas.requestPointerLock(); } catch (err) {}
      }
    });
    document.addEventListener('mousemove', e => {
      if (G.mode !== 'play' || G.paused) return;
      if (document.pointerLockElement === canvas) {
        input.lookX += e.movementX * 0.0022;
        input.lookY += e.movementY * 0.0018;
      }
    });
    // 桌面端拖拽视角（未锁定指针时）
    view.addEventListener('mousedown', e => {
      if (G.mode !== 'play' || isTouch || document.pointerLockElement) return;
      input.lookId = 'mouse';
      input.lastLookX = e.clientX; input.lastLookY = e.clientY;
    });
    window.addEventListener('mousemove', e => {
      if (input.lookId !== 'mouse') return;
      input.lookX += (e.clientX - input.lastLookX) * 0.0024;
      input.lookY += (e.clientY - input.lastLookY) * 0.002;
      input.lastLookX = e.clientX; input.lastLookY = e.clientY;
    });
    window.addEventListener('mouseup', () => { input.lookId = null; });

    const stick = $('#stick'), knob = $('#knob');
    const half = () => { const r = stick.getBoundingClientRect(); input.stickCX = r.left + r.width / 2; input.stickCY = r.top + r.height / 2; };

    view.addEventListener('pointerdown', e => {
      if (G.mode !== 'play' || G.paused) return;
      if (e.pointerType === 'mouse') return;
      if (e.clientX < window.innerWidth * 0.46) {
        input.stickId = e.pointerId;
        input.joyActive = true;
        half();
        const dx = e.clientX - input.stickCX, dy = e.clientY - input.stickCY;
        const d = Math.hypot(dx, dy), max = 55;
        const k = d > max ? max / d : 1;
        knob.style.transform = `translate(${dx * k}px,${dy * k}px)`;
        input.joyX = clamp(dx / max, -1, 1);
        input.joyY = clamp(dy / max, -1, 1);
        view.setPointerCapture && view.setPointerCapture(e.pointerId);
      } else {
        input.lookId = e.pointerId;
        input.lastLookX = e.clientX; input.lastLookY = e.clientY;
        view.setPointerCapture && view.setPointerCapture(e.pointerId);
      }
    });
    view.addEventListener('pointermove', e => {
      if (input.stickId === e.pointerId) {
        const dx = e.clientX - input.stickCX, dy = e.clientY - input.stickCY;
        const d = Math.hypot(dx, dy), max = 55;
        const k = d > max ? max / d : 1;
        knob.style.transform = `translate(${dx * k}px,${dy * k}px)`;
        input.joyX = clamp(dx / max, -1, 1);
        input.joyY = clamp(dy / max, -1, 1);
      } else if (input.lookId === e.pointerId) {
        input.lookX += (e.clientX - input.lastLookX) * 0.0042;
        input.lookY += (e.clientY - input.lastLookY) * 0.0034;
        input.lastLookX = e.clientX; input.lastLookY = e.clientY;
      }
    });
    const endPointer = e => {
      if (input.stickId === e.pointerId) {
        input.stickId = null; input.joyActive = false; input.joyX = 0; input.joyY = 0;
        knob.style.transform = 'translate(0,0)';
      }
      if (input.lookId === e.pointerId) input.lookId = null;
    };
    view.addEventListener('pointerup', endPointer);
    view.addEventListener('pointercancel', endPointer);
    view.addEventListener('pointerleave', e => {
      if (input.stickId === e.pointerId && !e.buttons) endPointer(e);
    });

    // 触屏按钮
    const hold = (el, on, off) => {
      el.addEventListener('pointerdown', e => { e.preventDefault(); el.classList.add('active'); on(); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => el.addEventListener(ev, () => { el.classList.remove('active'); off && off(); }));
    };
    hold($('#btnSprint'), () => { input.sprintHeld = true; }, () => { input.sprintHeld = false; });
    hold($('#btnBreath'), () => { input.breathHeld = true; }, () => { input.breathHeld = false; });
    $('#btnLight').addEventListener('pointerdown', e => { e.preventDefault(); toggleFlash(); });
    const hideBtn = $('#btnHide');
    if (hideBtn) hideBtn.addEventListener('pointerdown', e => { e.preventDefault(); input.hidePressed = true; });
  }

  const isTouch = (navigator.maxTouchPoints || 0) > 0 || matchMedia('(pointer: coarse)').matches;

  /* ================= 音效辅助 ================= */
  function toggleFlash() {
    if (G.mode !== 'play' || G.paused) return;
    if (G.phase === 'survival') return;
    if (P.battery <= 0.5) {
      toast('手电没有电了', '关掉它，等一会儿', true, 1.6);
      P.flashlight = false;
    } else {
      P.flashlight = !P.flashlight;
      const b = $('#btnLight');
      if (b) b.classList.toggle('on', P.flashlight);
      Sound.step(true);
    }
  }

  /* ================= 地图辅助 ================= */
  function canStand(x, y, r) {
    r = r || 0.24;
    const pts = [[x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r]];
    for (const [px, py] of pts) if (isWall(px, py)) return false;
    for (const m of (G.mans || MANNEQUINS)) {
      if (Math.hypot(x - m.x, y - m.y) < 0.4) return false;
    }
    return true;
  }

  function wallFree(x, y, r) {
    r = r || 0.2;
    return !isWall(x - r, y - r) && !isWall(x + r, y - r) &&
      !isWall(x - r, y + r) && !isWall(x + r, y + r);
  }

  function canSee(ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const d = Math.hypot(dx, dy);
    if (d < 0.001) return true;
    const steps = Math.ceil(d / 0.18);
    const sx = dx / steps, sy = dy / steps;
    let x = ax, y = ay;
    for (let i = 1; i < steps; i++) {
      x += sx; y += sy;
      if (isWall(x, y)) return false;
    }
    return true;
  }

  function bfsField(tx, ty) {
    const field = new Int16Array(MW * MH).fill(-1);
    const q = new Int32Array(MW * MH);
    let head = 0, tail = 0;
    const sx = tx | 0, sy = ty | 0;
    if (sx < 0 || sy < 0 || sx >= MW || sy >= MH || isWall(sx, sy)) return field;
    const si = sy * MW + sx;
    field[si] = 0; q[tail++] = si;
    while (head < tail) {
      const i = q[head++];
      const x = i % MW, y = (i / MW) | 0;
      const d = field[i] + 1;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oy) continue;
        const nx = x + ox, ny = y + oy;
        if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
        if (ox && oy && (isWall(x + ox, y) || isWall(x, y + oy))) continue;
        const ni = ny * MW + nx;
        if (field[ni] !== -1 || isWall(nx, ny)) continue;
        field[ni] = d; q[tail++] = ni;
      }
    }
    return field;
  }

  function nextStepDir(field, gx, gy) {
    const cx = gx | 0, cy = gy | 0;
    const ci = cy * MW + cx;
    if (ci < 0 || ci >= field.length || field[ci] < 0) return null;
    let best = field[ci], bx = -1, by = -1;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oy) continue;
      const nx = cx + ox, ny = cy + oy;
      if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
      if (ox && oy && (isWall(cx + ox, cy) || isWall(cx, cy + oy))) continue;
      const v = field[ny * MW + nx];
      if (v >= 0 && v < best) { best = v; bx = nx; by = ny; }
    }
    if (bx < 0) return null;
    return { x: bx + 0.5, y: by + 0.5 };
  }

  /* ================= 初始化一局 ================= */
  function resetRun() {
    P.x = 15.5; P.y = 17.6; P.dir = -Math.PI / 2; P.pitch = 0;
    P.stamina = 100; P.breath = 100; P.battery = 100;
    P.flashlight = false; P.holding = false; P.invuln = 0;
    P.keys = 0; P.gasp = 0; P.breathLock = 0; P.staminaDelay = 0;
    P.bob = 0; P.stepT = 0;
    P.hidden = null; P.hideSpot = null; P.hidePrompt = null; P.hideT = 0;
    G.runTime = 0; G.level = 1; G.keys = 0; G.charm = false;
    G.phase = 'survival'; G.act = 1;
    G.roundTime = 0; G.target = 75; G.stare = 100; G.gaze = false;
    G.possessed = 4; G.switchT = 0; G.switchInterval = 12;
    G.speed = 0.82; G.dist = 6.8; G.remaining = G.target;
    G.mans = MANNEQUINS.map(m => ({ x: m.x, y: m.y, baseX: m.x, baseY: m.y }));
    G.immersion = 100; G.actT = 0; G.actDur = 75; G.pauseT = 0;
    G.finaleT = 0; G.stareLost = 0; G.escapeT = 0;
    G.lungeT = 0; G.lungeReason = ''; G.finaleFrom = null; G.doorOpen = false;
    G.shake = 0; G.flashScare = 0; G.mirrorTimer = 26; G.apparitionTimer = 32;
    G.spotCd = 0; G.lostCd = 0;
    G.danger = 0; G.nearest = 99;
    G.spawned4 = G.spawned7 = G.spawned10 = false;
    G.dyingT = 0; G.won = false;
    input.joyX = input.joyY = 0; input.lookX = input.lookY = 0;
    input.breathHeld = false; input.sprintHeld = false;
    input.keys = Object.create(null);
    fieldPlayer = null; fieldTarget = null; fieldPlayerCell = -1; fieldTargetCell = -1;
    visions = [];

    items = [];
    props = [];
    lights = [];

    ghosts = [];
    spawnGhost(G.mans[G.possessed].x, G.mans[G.possessed].y, 0);
    if (ghosts[0]) ghosts[0].state = 'dance';

    const l = $('#charm'); if (l) l.style.display = 'none';
    const lb = $('#btnLight'); if (lb) { lb.classList.remove('on'); lb.style.display = 'none'; }
    const battMeter = document.querySelector('.bar.batt'); if (battMeter) { const mm = battMeter.closest('.meter'); if (mm) mm.style.display = 'none'; }
    const bl = document.getElementById('blood'); if (bl) bl.style.opacity = '0';
    const ho = document.getElementById('hideOverlay'); if (ho) { ho.className = ''; ho.style.opacity = '0'; }
    const hb = document.getElementById('btnHide'); if (hb) hb.classList.add('hidden');
  }

  function mkItem(x, y) { return { x, y, taken: false, bob: Math.random() * 6 }; }
  function addProp(type, x, y, h, elev, alpha) {
    const p = { type, x, y, h, elev, alpha: alpha || 0.85, seed: Math.random() * 10 };
    props.push(p);
    return p;
  }

  function spawnGhost(x, y, variant) {
    ghosts.push({
      x, y, variant: variant || 0,
      state: 'idle', dir: rnd(-3, 3),
      speed: 1.52, sight: 8.5, alert: 0,
      lastSeen: { x, y }, lostT: 0, searchT: 0,
      tele: rnd(9, 15), stateT: 0, frameT: 0,
      wander: { x, y }, wanderT: 0, lungeT: 0, lungeCd: 5,
      stun: 0, phase: Math.random() * 10, hitCd: 0, stepT: 0, visible: true
    });
  }

  function baseGhostSpeed() {
    return Math.min(2.62, 1.52 + 0.105 * (G.level - 1) + G.runTime * 0.0012);
  }
  function baseGhostSight() {
    return Math.min(17, 8.5 + 0.62 * (G.level - 1));
  }

  /* ================= 主循环 ================= */
  let lastT = 0, frameAvg = 16, perfT = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    if (!lastT) lastT = ts;
    let dt = (ts - lastT) / 1000;
    lastT = ts;
    if (dt > 0.1) dt = 0.1;
    if (dt <= 0) return;

    if (G.mode === 'play' && !G.paused) {
      G.t += dt;
      G.runTime += dt;
      update(dt);
    } else if (G.mode === 'intro' || G.mode === 'dying' || G.mode === 'menu') {
      G.t += dt;
      if (G.mode === 'dying') updateDying(dt);
      if (G.mode === 'menu') animateMenuGhost(dt);
    }
    if (G.mode !== 'menu') render();

    // 自适应画质
    frameAvg = frameAvg * 0.94 + dt * 1000 * 0.06;
    perfT += dt;
    if (perfT > 4 && G.mode === 'play') {
      perfT = 0;
      if (frameAvg > 27 && quality > 0) { quality--; resize(); }
    }
  }

  /* ================= 更新 ================= */
  function update(dt) {
    updatePlayer(dt);
    updateSurvival(dt);
    updateFX(dt);
    updateUI(dt);
    Sound.tick();
  }

  /* ================= 黑暗中盯住她 ================= */
  function updateSurvival(dt) {
    if (G.mode !== 'play' || !G.mans) return;
    G.roundTime += dt;
    G.level = 1 + Math.floor(G.roundTime / 15);
    G.remaining = Math.max(0, G.target - G.roundTime);
    const man = G.mans[G.possessed];
    const mx = man.x - P.x, my = man.y - P.y;
    const d = Math.hypot(mx, my);
    G.dist = d;
    G.speed = Math.min(2.25, 0.82 + (G.level - 1) * 0.16 + G.roundTime * 0.004);
    if (d > 0.01) {
      const vx = -mx / d * G.speed * dt, vy = -my / d * G.speed * dt;
      if (wallFree(man.x + vx, man.y, 0.18)) man.x += vx;
      if (wallFree(man.x, man.y + vy, 0.18)) man.y += vy;
    }
    const ang = Math.abs(norm(Math.atan2(my, mx) - P.dir));
    G.gaze = canSee(P.x, P.y, man.x, man.y) && ang < 0.5;
    if (G.gaze) G.stare = Math.min(100, G.stare + 34 * dt);
    else G.stare = Math.max(0, G.stare - (42 + (G.level - 1) * 4) * dt);

    G.switchT += dt;
    G.switchInterval = Math.max(3.0, 12 - (G.level - 1) * 1.7);
    if (G.switchT >= G.switchInterval) switchPossession();

    const g = ghosts[0];
    if (g) { g.x = man.x; g.y = man.y; g.state = 'dance'; g.visible = true; }

    if (d < 0.8 || G.stare <= 0) { if (G.mode === 'play') die(); return; }
    if (G.roundTime >= G.target) { winSurvival(); return; }

    G.danger = clamp(1 - d / 9, 0, 1) * 0.7 + (1 - G.stare / 100) * 0.3;
    Sound.heartbeat(G.danger);
    Sound.musicBox(true);
  }

  function switchPossession() {
    let n = G.possessed;
    while (n === G.possessed) n = (Math.random() * G.mans.length) | 0;
    G.possessed = n;
    G.switchT = 0;
    G.stare = Math.max(0, G.stare - 5);
    const g = ghosts[0], m = G.mans[n];
    if (g) { g.x = m.x; g.y = m.y; g.visible = true; g.state = 'dance'; }
    Sound.glass();
    Sound.sting();
    toast('聚光灯移动了', '立刻正视新的假人', true, 1.8);
  }

  function winSurvival() {
    if (G.mode !== 'play') return;
    G.mode = 'win';
    G.won = true;
    Sound.musicBox(false);
    Sound.unlock();
    Sound.stopAmbience();
    const mm = Math.floor(G.roundTime / 60), ss = Math.floor(G.roundTime % 60);
    $('#wnTime').textContent = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    $('#wnLv').textContent = G.level;
    $('#wnRank').textContent = G.stare > 65 ? 'S' : G.stare > 35 ? 'A' : 'B';
    $('#win').classList.remove('hidden');
    $('#hud').classList.add('hidden');
    $('#touch').classList.add('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
    const j = $('#jumpscare'); if (j) j.style.display = 'none';
  }

  /* ================= 表演 / 谢幕 ================= */
  function updatePerformance(dt) {
    if (G.mode !== 'play') return;
    const m = MANNEQUINS[G.dancer];
    const g = ghosts[0];
    const dx = m.x - P.x, dy = m.y - P.y;
    const dist = Math.hypot(dx, dy);
    G.nearestDist = Math.min(...MANNEQUINS.map(q => Math.hypot(q.x - P.x, q.y - P.y)));
    G.safeDist = 3.1 + G.act * 0.22;
    G.gaze = canSee(P.x, P.y, m.x, m.y) && dist < 16 &&
      Math.abs(norm(Math.atan2(dy, dx) - P.dir)) < 0.46;

    if (G.phase === 'dance') {
      G.actT += dt;
      let delta = -9.5;
      if (G.gaze) delta += 15.5; else delta -= 2;
      if (!P.moving) delta += 4.5; else delta -= (P.sprinting ? 12 : 7);
      if (G.nearestDist < G.safeDist) delta -= 8;
      if (P.holding) delta += 2.2;
      if (P.gasp > 0) delta -= 10;
      delta -= (G.act - 1) * 0.9;
      G.immersion = clamp(G.immersion + delta * dt, 0, 100);
      if (G.immersion <= 0.05) { triggerLunge('她看穿了你的走神'); return; }
      if (dist < 2.3) {
        G.immersion = Math.max(0, G.immersion - 16 * dt);
        if (Math.random() < dt * 0.35) { triggerLunge('你离她太近了'); return; }
      }
      if (G.actT >= G.actDur) startPause();
    } else if (G.phase === 'pause') {
      G.pauseT += dt;
      G.immersion = clamp(G.immersion + 3.2 * dt, 0, 100);
      if (G.pauseT >= G.pauseDur) {
        if (G.act >= G.actMax) startFinale();
        else {
          G.act++;
          G.level = G.act;
          chooseNextDancer();
          G.phase = 'switch'; G.switchT = 0;
        }
      }
    } else if (G.phase === 'switch') {
      G.switchT += dt;
      if (G.switchT > 0.55 && g) {
        g.x = MANNEQUINS[G.dancer].x; g.y = MANNEQUINS[G.dancer].y;
        g.state = 'dance'; g.visible = true;
      }
      if (G.switchT > 1.55) startDance();
    } else if (G.phase === 'finale') {
      updateFinale(dt);
    } else if (G.phase === 'lunge') {
      G.lungeT -= dt;
      if (G.lungeT <= 0) {
        if (G.charm) {
          G.charm = false;
          const c = $('#charm');
          if (c) { c.classList.add('broken'); const s = c.querySelector('span'); if (s) s.textContent = '护身符已碎'; }
          $('#jumpscare').style.display = 'none';
          $('#whiteout').style.opacity = '0';
          P.invuln = 2;
          G.immersion = 62; G.actT = 0;
          G.dancer = (G.dancer + 2) % MANNEQUINS.length;
          if (g) { g.x = MANNEQUINS[G.dancer].x; g.y = MANNEQUINS[G.dancer].y; g.state = 'dance'; g.visible = true; }
          if (G.lungeFromFinale) {
            startFinale();
            toast('护身符碎了', '她退回客厅中央 · 再看她一次', true, 3.4);
          } else {
            G.phase = 'dance';
            Sound.musicBox(true);
            toast('护身符碎了', '她退回假人里 · 没有第二次', true, 3.2);
          }
        } else {
          die();
        }
      }
    }

    Sound.musicBox(G.phase === 'dance' || G.phase === 'switch');
    if (g && G.phase !== 'finale' && G.phase !== 'lunge') {
      if (G.phase === 'dance') { g.x = m.x; g.y = m.y; g.state = 'dance'; g.visible = true; }
      else if (G.phase === 'pause') { g.x = m.x; g.y = m.y; g.state = 'pause'; g.visible = true; }
    }
    const danger = clamp(1 - G.nearestDist / 14, 0, 1) * 0.55 + (1 - G.immersion / 100) * 0.45;
    G.danger = danger;
    Sound.heartbeat(danger);
    G.level = G.act;
  }

  function startPause() {
    G.phase = 'pause'; G.pauseT = 0;
    G.pauseDur = Math.max(3.4, 5.4 - G.act * 0.28);
    Sound.musicBox(false);
    toast('她停住了', '趁现在，离所有假人远一点', false, 3.4);
  }

  function chooseNextDancer() {
    let n = G.dancer;
    while (n === G.dancer) n = (Math.random() * MANNEQUINS.length) | 0;
    G.dancer = n;
    if (ghosts[0]) ghosts[0].visible = false;
    Sound.glass();
    toast('她换了一个假人', '找到她', true, 2.4);
  }

  function startDance() {
    G.phase = 'dance'; G.actT = 0;
    G.actDur = Math.max(9.5, 15.5 - (G.act - 1) * 1.1);
    G.immersion = Math.max(G.immersion, 58);
    const m = MANNEQUINS[G.dancer], g = ghosts[0];
    if (g) { g.x = m.x; g.y = m.y; g.visible = true; g.state = 'dance'; }
    Sound.musicBox(true);
    toast(`第 ${G.act} 幕`, '盯着她 · 不要动', false, 2.2);
  }

  function startFinale() {
    G.phase = 'finale'; G.finaleT = 0; G.stareLost = 0; G.escapeT = 0;
    // 镜头切回门厅：女鬼从客厅中央走向你
    P.x = 15.5; P.y = 20.7; P.dir = -Math.PI / 2; P.pitch = 0;
    G.finaleFrom = { x: 15.0, y: 14.2 };
    const g = ghosts[0];
    if (g) { g.state = 'finale'; g.visible = true; g.x = 15.0; g.y = 14.2; }
    Sound.musicBox(false);
    Sound.sting();
    toast('谢幕', '不要移开视线 · 不要跑', true, 4.2);
  }

  function updateFinale(dt) {
    G.finaleT += dt;
    const t = clamp(G.finaleT / 18, 0, 1);
    const g = ghosts[0];
    if (!g) return;
    const endX = P.x + (G.finaleFrom.x - P.x) * 0.07;
    const endY = P.y + (G.finaleFrom.y - P.y) * 0.07;
    g.x = lerp(G.finaleFrom.x, endX, t);
    g.y = lerp(G.finaleFrom.y, endY, t);
    g.state = t > 0.82 ? 'finaleclose' : 'finale';
    g.visible = true;
    const dx = g.x - P.x, dy = g.y - P.y;
    const d = Math.hypot(dx, dy);
    G.nearestDist = Math.min(G.nearestDist, d);
    const gaze = canSee(P.x, P.y, g.x, g.y) &&
      Math.abs(norm(Math.atan2(dy, dx) - P.dir)) < 0.5;
    G.gaze = gaze;
    if (gaze) G.stareLost = Math.max(0, G.stareLost - dt * 1.6);
    else G.stareLost += dt;
    if (G.escapeT > 0.75) { triggerLunge('你转身想跑'); return; }
    if (G.stareLost > 1.35) { triggerLunge('你移开了视线'); return; }
    if (t >= 1) { G.doorOpen = true; winGame(); }
  }

  function triggerLunge(reason) {
    if (G.phase === 'lunge' || G.mode !== 'play') return;
    G.lungeFromFinale = G.phase === 'finale';
    G.phase = 'lunge'; G.lungeT = 1.9; G.lungeReason = reason;
    G.shake = 2;
    Sound.scream();
    Sound.musicBox(false);
    const j = $('#jumpscare');
    j.style.display = 'flex'; j.style.opacity = '1';
    if (navigator.vibrate) { try { navigator.vibrate([70, 40, 160, 50, 220]); } catch (e) {} }
    if (!G.charm) {
      die();
    }
  }

  function updatePlayer(dt) {
    // 视角
    let lookX = input.lookX, lookY = input.lookY;
    input.lookX = 0; input.lookY = 0;
    const sens = 1.0;
    P.dir += lookX * sens;
    P.pitch = clamp(P.pitch + lookY * 0.7, -0.28, 0.28);
    P.dir = norm(P.dir);

    // 输入轴
    let fwd = 0, str = 0;
    if (input.keys['KeyW'] || input.keys['ArrowUp']) fwd += 1;
    if (input.keys['KeyS'] || input.keys['ArrowDown']) fwd -= 1;
    if (input.keys['KeyD'] || input.keys['ArrowRight']) str += 1;
    if (input.keys['KeyA'] || input.keys['ArrowLeft']) str -= 1;
    fwd += -input.joyY;
    str += input.joyX;
    const mag = Math.hypot(fwd, str);
    if (mag > 1) { fwd /= mag; str /= mag; }
    const finale = G.phase === 'finale';
    if (finale) {
      if (mag > 0.08) G.escapeT = (G.escapeT || 0) + dt;
      else G.escapeT = Math.max(0, (G.escapeT || 0) - dt * 2);
      fwd = 0; str = 0;
    }
    if (G.phase === 'lunge') { fwd = 0; str = 0; }
    P.moving = mag > 0.08 && !finale && G.phase !== 'lunge';

    // 屏息
    const wantHold = (input.breathHeld || input.keys['Space']) && P.breathLock <= 0;
    if (wantHold && P.breath > 0) {
      P.holding = true;
      P.breath = Math.max(0, P.breath - dt * 19);
      if (P.breath <= 0) {
        P.holding = false; P.breathLock = 2.4; P.gasp = 1;
        Sound.breath(false);
        toast('你喘出了声', '她听见了', true, 1.4);
      }
    } else {
      if (P.holding) Sound.breath(true);
      P.holding = false;
      P.breath = Math.min(100, P.breath + dt * (P.breathLock > 0 ? 6 : 13));
    }
    if (P.breathLock > 0) P.breathLock -= dt;
    if (P.gasp > 0) P.gasp -= dt;

    // 冲刺
    const wantSprint = (input.sprintHeld || input.keys['ShiftLeft'] || input.keys['ShiftRight']) && P.stamina > 2 && P.moving;
    P.sprinting = !!wantSprint;
    if (P.sprinting) {
      P.stamina = Math.max(0, P.stamina - dt * 24);
      P.staminaDelay = 0.9;
    } else {
      P.staminaDelay -= dt;
      if (P.staminaDelay <= 0) P.stamina = Math.min(100, P.stamina + dt * (P.holding ? 8 : 14));
    }

    // 电量
    if (P.flashlight) {
      P.battery = Math.max(0, P.battery - dt * 0.8);
      if (P.battery <= 0) { P.flashlight = false; const b = $('#btnLight'); if (b) b.classList.remove('on'); toast('手电熄灭了', '', true, 1.6); }
    } else {
      P.battery = Math.min(100, P.battery + dt * 1.5);
    }

    // 移动
    const speed = (P.sprinting ? 3.32 : 2.02) * (P.holding ? 0.78 : 1) * (P.gasp > 0 ? 0.92 : 1);
    const dirX = Math.cos(P.dir), dirY = Math.sin(P.dir);
    const rightX = -dirY, rightY = dirX;
    let mx = dirX * fwd + rightX * str;
    let my = dirY * fwd + rightY * str;
    const ml = Math.hypot(mx, my);
    if (ml > 0.001) {
      mx /= ml; my /= ml;
      const nx = P.x + mx * speed * dt, ny = P.y + my * speed * dt;
      if (canStand(nx, P.y)) P.x = nx;
      if (canStand(P.x, ny)) P.y = ny;
      P.bob += dt * (P.sprinting ? 12.5 : 7.4);
      P.bobAmt = lerp(P.bobAmt, P.sprinting ? 1 : 0.55, dt * 8);
      // 脚步声
      P.stepT -= dt;
      if (P.stepT <= 0) {
        P.stepT = P.sprinting ? 0.29 : 0.44;
        Sound.step(P.sprinting);
      }
    } else {
      P.bobAmt = lerp(P.bobAmt, 0, dt * 6);
    }

    if (P.invuln > 0) P.invuln -= dt;

  }

  function updateGhosts(dt) {
    const pCell = (P.y | 0) * MW + (P.x | 0);
    if (!fieldPlayer || pCell !== fieldPlayerCell || (G.t - fieldPlayerAt) > 0.45) {
      fieldPlayer = bfsField(P.x, P.y);
      fieldPlayerCell = pCell;
      fieldPlayerAt = G.t;
    }

    let nearest = 999;
    for (const g of ghosts) {
      const d = Math.hypot(g.x - P.x, g.y - P.y);
      nearest = Math.min(nearest, d);
      g.stun = Math.max(0, g.stun - dt);
      g.hitCd = Math.max(0, g.hitCd - dt);
      g.lungeCd = Math.max(0, g.lungeCd - dt);
      g.phase += dt;
      if (g.stun > 0) { g.state = 'stun'; continue; }

      g.speed = baseGhostSpeed() * (g.variant ? 0.96 : 1);
      g.sight = baseGhostSight() * (g.variant ? 0.92 : 1);

      const los = canSee(g.x, g.y, P.x, P.y);
      let sight = g.sight;
      if (P.flashlight) sight *= 1.12;
      else sight *= 0.72;
      if (P.holding) sight *= 0.42;
      const noise = P.sprinting ? 8.5 : (P.moving ? 4.2 : 1.4);
      const heard = d < noise * (P.holding ? 0.28 : 1) * (P.gasp > 0 ? 1.5 : 1);
      const seen = los && d < sight;

      // 足尖鞋的“嗒、嗒”声
      g.stepT -= dt;
      if (g.stepT <= 0 && (g.state === 'hunt' || g.state === 'search') && d < 14) {
        g.stepT = g.state === 'hunt' ? 0.46 : 0.78;
        const ang = norm(Math.atan2(g.y - P.y, g.x - P.x) - P.dir);
        Sound.heel(Math.sin(ang) * 0.8, clamp(1 - d / 15, 0.12, 1));
      }

      if (seen || heard) {
        const wasHunt = g.state === 'hunt';
        if (!wasHunt && g.state !== 'stun') {
          if (seen && d < 12) { Sound.sting(); G.shake = Math.max(G.shake, 0.5); P.pitch += 0.01; }
          else Sound.whisper();
          if (seen && G.spotCd <= 0) {
            G.spotCd = 8;
            toast('她看见你了', '关灯 · 屏息 · 别跑直线', true, 2.2);
          }
        }
        g.state = 'hunt';
        g.lastSeen.x = P.x; g.lastSeen.y = P.y;
        g.lostT = 0;
        g.alert = Math.min(1, g.alert + dt * 2);
      } else if (g.state === 'hunt') {
        g.lostT += dt;
        if (g.lostT > (P.holding ? 2.4 : 4.2)) {
          g.state = 'search'; g.searchT = 5.5;
          if (G.lostCd <= 0) { G.lostCd = 10; toast('她失去了方向', '保持安静', false, 1.8); }
        }
      }

      if (g.state === 'hunt') {
        g.alert = 1;
        // 冲刺扑击
        if (los && d > 2.2 && d < 7 && g.lungeCd <= 0 && Math.random() < dt * 0.5) {
          g.lungeT = 1.15; g.lungeCd = rnd(5, 9);
          Sound.sting();
          toast('她扑过来了', '侧移，别直线跑', true, 1.2);
        }
        let sp = g.speed * (g.lungeT > 0 ? 1.55 : 1);
        if (g.lungeT > 0) g.lungeT -= dt;
        moveTowards(g, g.lastSeen.x, g.lastSeen.y, sp, dt, fieldPlayer);
      } else if (g.state === 'search') {
        g.searchT -= dt;
        moveTowards(g, g.lastSeen.x, g.lastSeen.y, g.speed * 0.62, dt, fieldPlayer);
        if (g.searchT <= 0) { g.state = 'idle'; g.wanderT = 0; }
      } else if (g.state === 'idle') {
        g.alert = Math.max(0, g.alert - dt * 0.5);
        g.wanderT -= dt;
        if (!g.wander || g.wanderT <= 0) {
          const c = openCells[(Math.random() * openCells.length) | 0];
          g.wander = { x: c[0] + 0.5, y: c[1] + 0.5 };
          g.wanderT = rnd(4, 8);
        }
        moveTowards(g, g.wander.x, g.wander.y, g.speed * 0.47, dt, null);
        g.stateT += dt;
        if (g.stateT > 9 && d > 11) { g.stateT = 0; }
      }

      // 传送：当玩家看不见时，悄悄换位置
      if (g.state !== 'stun') {
        g.tele -= dt;
        const visible = canSee(P.x, P.y, g.x, g.y) &&
          Math.abs(norm(Math.atan2(g.y - P.y, g.x - P.x) - P.dir)) < 1.0;
        if (g.tele <= 0 && !visible && d > 7) {
          const spot = findTeleportSpot(g);
          if (spot) {
            g.x = spot.x; g.y = spot.y;
            g.state = 'search'; g.lastSeen.x = P.x; g.lastSeen.y = P.y; g.searchT = 6;
            Sound.glass();
            G.shake = Math.max(G.shake, 0.35);
            toast('镜子后面有声音', '', true, 1.4);
          }
          g.tele = Math.max(7, 16 - G.level * 0.5);
        }
      }

      // 攻击
      if (d < 0.72 && P.invuln <= 0 && g.state !== 'stun') {
        g.hitCd = 2;
        hitPlayer(g);
      }
    }

    // 音乐盒 / 低语 / 心跳
    Sound.musicBox(nearest < 15 || G.keys >= 5);
    const danger = clamp(1 - nearest / 15, 0, 1);
    if (nearest < 11 && Math.random() < dt * 0.55) Sound.whisper();
    Sound.heartbeat(danger);
    G.nearest = nearest;
    G.danger = danger;

    // 出现新的她
    if ((G.level === 4 || G.level === 7 || G.level === 10) && ghosts.length < 3 && !G['spawned' + G.level]) {
      G['spawned' + G.level] = true;
      const spots = [[4.5, 16.5], [26.5, 24.5], [27.5, 6.5]];
      const s = spots[(ghosts.length - 1) % spots.length];
      spawnGhost(s[0], s[1], ghosts.length >= 2 ? 2 : 1);
      Sound.sting();
      toast('镜子里多了一个影子', '她不是一个人', true, 3);
    }
  }

  function findTeleportSpot(g) {
    for (let i = 0; i < 40; i++) {
      const c = openCells[(Math.random() * openCells.length) | 0];
      const x = c[0] + 0.5, y = c[1] + 0.5;
      const d = Math.hypot(x - P.x, y - P.y);
      if (d > 4.5 && d < 10 && !canSee(P.x, P.y, x, y)) return { x, y };
    }
    return null;
  }

  function moveTowards(g, tx, ty, speed, dt, field) {
    let goalX = tx, goalY = ty;
    const sameCell = ((g.x | 0) === (tx | 0) && (g.y | 0) === (ty | 0));
    if (!sameCell && field) {
      const n = nextStepDir(field, g.x, g.y);
      if (n) { goalX = n.x; goalY = n.y; }
    }
    const dx = goalX - g.x, dy = goalY - g.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.001) return;
    const vx = dx / d * speed * dt, vy = dy / d * speed * dt;
    const r = 0.27;
    if (canStand(g.x + vx, g.y, r)) g.x += vx;
    else if (canStand(g.x, g.y + vy, r)) g.y += vy;
    else {
      // 简单绕墙
      if (canStand(g.x + vx, g.y + Math.sign(vy) * 0.15, r)) g.y += Math.sign(vy) * 0.15;
      else if (canStand(g.x + Math.sign(vx) * 0.15, g.y + vy, r)) g.x += Math.sign(vx) * 0.15;
    }
    g.dir = Math.atan2(dy, dx);
  }

  function hitPlayer(g) {
    if (G.charm) {
      G.charm = false;
      P.invuln = 3.2;
      G.flashScare = 1;
      G.shake = 1.2;
      Sound.scream();
      const c = $('#charm'); if (c) c.classList.add('broken');
      // 她被弹开
      g.stun = 3.4;
      g.x = P.x + rnd(-1, 1); g.y = P.y + rnd(-1, 1);
      let tries = 0;
      while (!canStand(g.x, g.y, 0.3) && tries++ < 60) {
        const c2 = openCells[(Math.random() * openCells.length) | 0];
        g.x = c2[0] + 0.5; g.y = c2[1] + 0.5;
      }
      g.tele = 12;
      toast('护身符碎了', '她退回了镜子深处 · 没有第二次', true, 3.6);
      document.getElementById('blood').style.opacity = '0.85';
      setTimeout(() => { document.getElementById('blood').style.opacity = '0'; }, 1800);
    } else {
      die();
    }
  }

  function updateItems(dt) {
    for (const it of items) it.bob += dt * 2;
  }

  function updateTimers(dt) {
    const nl = 1 + Math.floor(G.runTime / 22);
    if (nl > G.level) {
      G.level = nl;
      Sound.sting();
      G.shake = 0.7;
      toast(`第 ${G.level} 夜`, nightLine(G.level), true, 3.2);
      // 升级时她变强
      for (const g of ghosts) {
        g.speed = baseGhostSpeed();
        g.sight = baseGhostSight();
      }
    }

    G.apparitionTimer -= dt;
    if (G.apparitionTimer <= 0) {
      G.apparitionTimer = rnd(30, 55);
      if (G.danger < 0.55) spawnVision();
    }
    G.mirrorTimer -= dt;
    if (G.mirrorTimer <= 0) {
      G.mirrorTimer = rnd(45, 80);
      if (G.danger > 0.25 && Math.random() < 0.5) mirrorScare();
    }
    if (G.msgTimer > 0) G.msgTimer -= dt;
    if (G.spotCd > 0) G.spotCd -= dt;
    if (G.lostCd > 0) G.lostCd -= dt;
  }

  function nightLine(lv) {
    const lines = [
      '镜子开始呼吸', '她的脚步更近了', '八音盒走音了', '灯在退开',
      '镜厅比刚才更长', '你听见第二双足尖', '墙纸后面有指甲声', '她开始跑',
      '别数镜子', '黎明还很远'
    ];
    return lines[Math.min(lines.length - 1, lv - 2)] || '';
  }

  function spawnVision() {
    const dist = rnd(5, 8);
    const vx = P.x + Math.cos(P.dir) * dist;
    const vy = P.y + Math.sin(P.dir) * dist;
    if (!canStand(vx, vy, 0.1)) return;
    if (!canSee(P.x, P.y, vx, vy)) return;
    visions.push({ x: vx, y: vy, life: 1.7, max: 1.7 });
    Sound.sting();
    G.shake = 0.6;
  }

  function mirrorScare() {
    G.flashScare = 0.5;
    Sound.glass();
    const f = $('#jumpscare');
    if (f && G.mode === 'play') {
      f.style.display = 'flex';
      f.style.opacity = '0.42';
      setTimeout(() => { f.style.display = 'none'; f.style.opacity = '1'; }, 210);
    }
  }

  function updateFX(dt) {
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 1.6);
    if (G.flashScare > 0) G.flashScare = Math.max(0, G.flashScare - dt * 2);
    for (let i = visions.length - 1; i >= 0; i--) {
      visions[i].life -= dt;
      if (visions[i].life <= 0) visions.splice(i, 1);
    }
    P.pitch = lerp(P.pitch, clamp(P.pitch, -0.25, 0.25), dt * 4);
  }

  function updateDying(dt) {
    G.dyingT += dt;
    if (G.dyingT > 1.75 && G.mode === 'dying') {
      G.mode = 'over';
      $('#jumpscare').style.display = 'none';
      $('#whiteout').style.opacity = '0';
      showOver();
    }
  }

  /* ================= 渲染 ================= */
  function render() {
    if (!ART) return;
    const hz = RH * 0.5 + P.pitch * RH + Math.sin(P.bob) * P.bobAmt * RH * 0.006;
    horizon = hz;
    const dirX = Math.cos(P.dir), dirY = Math.sin(P.dir);
    const planeX = -dirY * (RW / 2) / f;
    const planeY = dirX * (RW / 2) / f;
    const camZ = 0.5;
    const flick = 0.86 + Math.sin(G.t * 37.1) * 0.05 + Math.sin(G.t * 13.7) * 0.04 +
      (P.battery < 25 ? (Math.sin(G.t * 61) > 0.55 ? -0.55 : 0) : 0) + (P.flashlight ? 0 : 0);
    const flash = (P.flashlight ? 1 : 0) * clamp(flick, 0.25, 1);
    const amb = G.phase === 'survival' ? 0.02 : Math.max(0.085, 0.135 - G.act * 0.004);
    const fovTan = Math.tan(1.34 / 2);
    for (let x = 0; x < RW; x++) {
      const camX = 2 * x / RW - 1;
      const a = Math.atan(camX * fovTan);
      coneCol[x] = Math.pow(Math.max(0, Math.cos(a * 1.32)), 1.55);
    }

    drawFloorCeil(dirX, dirY, planeX, planeY, camZ, amb, flash, flick);
    drawWalls(dirX, dirY, planeX, planeY, camZ, amb, flash, flick);
    vctx.putImageData(img, 0, 0);
    drawSprites(dirX, dirY, planeX, planeY, camZ, amb, flash);
    // 画面上叠加细微尘埃
    vctx.save();
    vctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const a = (i * 97.13 + G.t * 8) % RW;
      const b = (i * 53.7 + Math.sin(G.t * 0.4 + i) * 30 + G.t * 3.2) % RH;
      vctx.fillStyle = 'rgba(190,175,140,' + (0.02 + (i % 3) * 0.012) + ')';
      vctx.fillRect(a, b, 1, 1);
    }
    vctx.restore();

    // 镜头抖动
    const sh = G.shake;
    if (sh > 0.001) {
      const sx = (Math.random() - 0.5) * sh * 14;
      const sy = (Math.random() - 0.5) * sh * 10;
      view.style.transform = `translate(${sx}px,${sy}px) scale(1.012)`;
    } else {
      view.style.transform = 'none';
    }
    const danger = G.danger || 0;
    $('#vignette').style.opacity = String(0.75 + danger * 0.25);
    $('#distorted').style.opacity = String(danger * 0.4 + (G.flashScare > 0 ? 0.5 : 0));
    view.style.filter = danger > 0.75
      ? `saturate(${1 - danger * 0.35}) contrast(${1.05 + danger * 0.12}) brightness(${1 - danger * 0.08})`
      : 'none';
  }

  function drawFloorCeil(dirX, dirY, planeX, planeY, camZ, amb, flash, flick) {
    const flTex = ART.floors;
    const ceil = ART.ceil;
    const rdx0 = dirX - planeX, rdy0 = dirY - planeY;
    const rdx1 = dirX + planeX, rdy1 = dirY + planeY;
    const hz = horizon;
    const flashOn = flash;
    const lvDark = clamp(1 - G.level * 0.02, 0.8, 1);
    const ceilDark = 0.55 * lvDark;
    for (let y = 0; y < RH; y++) {
      const floor = y > hz;
      const p = floor ? (y - hz) : (hz - y);
      if (p < 0.8) {
        // 地平线黑带
        let idx = y * RW;
        for (let x = 0; x < RW; x++) buf[idx + x] = 0xff000000;
        continue;
      }
      const rowDist = (f * camZ) / p;
      const stepX = rowDist * (rdx1 - rdx0) / RW;
      const stepY = rowDist * (rdy1 - rdy0) / RW;
      let fx = P.x + rowDist * rdx0;
      let fy = P.y + rowDist * rdy0;
      const att = flashOn * 1.95 * brightness / (1 + rowDist * rowDist * 0.045);
      const tintR = 0.8 + 0.2 * (att / (att + amb + 0.001));
      const tintB = 1.0 - 0.12 * (att / (att + amb + 0.001));
      const base = (floor ? amb : amb * ceilDark) * brightness;
      let idx = y * RW;
      const texCeil = ceil;
      for (let x = 0; x < RW; x++) {
        const cx = fx | 0, cy = fy | 0;
        let t, tw, th, px;
        if (floor) {
          let ft = 0;
          if (cx >= 0 && cy >= 0 && cx < MW && cy < MH) ft = floorMap[cy * MW + cx];
          t = flTex[ft] || flTex[0];
        } else {
          t = texCeil;
        }
        tw = t.w; th = t.h;
        let tx = (fx * tw) | 0, ty = (fy * th) | 0;
        tx &= (tw - 1); ty &= (th - 1);
        const c = t.px[ty * tw + tx];
        let br = base + att * coneCol[x];
        if (br > 1.3) br = 1.3;
        const r = (c & 255) * br * tintR;
        const g = ((c >> 8) & 255) * br;
        const b = ((c >> 16) & 255) * br * tintB;
        buf[idx + x] = 0xff000000 |
          ((b > 255 ? 255 : b) << 16) |
          ((g > 255 ? 255 : g) << 8) |
          (r > 255 ? 255 : r);
        fx += stepX; fy += stepY;
      }
    }
  }

  function drawWalls(dirX, dirY, planeX, planeY, camZ, amb, flash, flick) {
    const wallTex = ART.walls;
    for (let x = 0; x < RW; x++) {
      const camX = 2 * x / RW - 1;
      const rdx = dirX + planeX * camX;
      const rdy = dirY + planeY * camX;
      let mapX = P.x | 0, mapY = P.y | 0;
      const ddx = Math.abs(1 / (rdx || 1e-9));
      const ddy = Math.abs(1 / (rdy || 1e-9));
      let stepX, stepY, sideDistX, sideDistY;
      if (rdx < 0) { stepX = -1; sideDistX = (P.x - mapX) * ddx; }
      else { stepX = 1; sideDistX = (mapX + 1 - P.x) * ddx; }
      if (rdy < 0) { stepY = -1; sideDistY = (P.y - mapY) * ddy; }
      else { stepY = 1; sideDistY = (mapY + 1 - P.y) * ddy; }
      let side = 0, hit = 0, type = 1;
      for (let i = 0; i < 64; i++) {
        if (sideDistX < sideDistY) { sideDistX += ddx; mapX += stepX; side = 0; }
        else { sideDistY += ddy; mapY += stepY; side = 1; }
        if (mapX < 0 || mapY < 0 || mapX >= MW || mapY >= MH) { hit = 1; type = 1; break; }
        const t = map[mapY * MW + mapX];
        if (t) { hit = 1; type = t; break; }
      }
      let perp = side === 0
        ? (mapX - P.x + (1 - stepX) / 2) / (rdx || 1e-9)
        : (mapY - P.y + (1 - stepY) / 2) / (rdy || 1e-9);
      if (perp < 0.02) perp = 0.02;
      zbuf[x] = perp;
      const lineH = f / perp;
      let drawStart = horizon - lineH * camZ;
      const step = 1 / lineH;
      let texPos = (drawStart < 0 ? -drawStart : 0) * step;
      if (drawStart < 0) drawStart = 0;
      let drawEnd = horizon + lineH * camZ;
      if (drawEnd > RH) drawEnd = RH;
      const tex = wallTex[(type - 1)] || wallTex[0];
      const tw = tex.w, th = tex.h;
      let wallX;
      if (side === 0) wallX = P.y + perp * rdy;
      else wallX = P.x + perp * rdx;
      wallX -= Math.floor(wallX);
      let texX = (wallX * tw) | 0;
      if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) texX = tw - texX - 1;
      texX &= (tw - 1);

      // 光照
      const hitX = P.x + rdx * perp, hitY = P.y + rdy * perp;
      let light = amb * (side ? 0.8 : 1);
      const att = flash * 2.25 / (1 + perp * perp * 0.042);
      light += att * coneCol[x];
      for (let li = 0; li < lights.length; li++) {
        const L = lights[li];
        const ddx2 = hitX - L.x, ddy2 = hitY - L.y;
        const d2 = ddx2 * ddx2 + ddy2 * ddy2;
        if (d2 < 26) light += L.p * (0.75 + 0.25 * Math.sin(G.t * 9 + li)) / (1 + d2 * 2.2);
      }
      light *= brightness;
      if (light > 2.0) light = 2.0;
      const warm = att / (att + amb + 0.0001);
      const rM = 0.82 + 0.18 * warm, gM = 0.87 + 0.08 * warm, bM = 0.96 - 0.08 * warm;
      let idx = (drawStart | 0) * RW + x;
      for (let y = drawStart | 0; y < drawEnd; y++) {
        const ty = (texPos * th) & (th - 1);
        texPos += step;
        const c = tex.px[(ty | 0) * tw + texX];
        const r = (c & 255) * light * rM;
        const g = ((c >> 8) & 255) * light * gM;
        const b = ((c >> 16) & 255) * light * bM;
        buf[idx] = 0xff000000 |
          ((b > 255 ? 255 : b) << 16) |
          ((g > 255 ? 255 : g) << 8) |
          (r > 255 ? 255 : r);
        idx += RW;
      }
    }
  }

  function drawSpotlight(sx, top, bottom, w) {
    const ctx = vctx;
    const topY = Math.max(0, top - (bottom - top) * 0.6);
    const botY = bottom;
    const halfTop = Math.max(2, w * 0.16);
    const halfBot = Math.max(10, w * 1.35);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, topY, 0, botY);
    g.addColorStop(0, 'rgba(210,225,255,0.025)');
    g.addColorStop(0.5, 'rgba(220,232,255,0.07)');
    g.addColorStop(0.86, 'rgba(235,245,255,0.16)');
    g.addColorStop(1, 'rgba(255,255,255,0.03)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx - halfTop, topY);
    ctx.lineTo(sx + halfTop, topY);
    ctx.lineTo(sx + halfBot, botY);
    ctx.lineTo(sx - halfBot, botY);
    ctx.closePath();
    ctx.fill();
    const hy = top + (bottom - top) * 0.12;
    const hr = Math.max(9, w * 0.8);
    const rg = ctx.createRadialGradient(sx, hy, 1, sx, hy, hr);
    rg.addColorStop(0, 'rgba(245,250,255,0.35)');
    rg.addColorStop(0.45, 'rgba(225,238,255,0.12)');
    rg.addColorStop(1, 'rgba(220,235,255,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(sx, hy, hr, 0, 6.28); ctx.fill();
    const pr = Math.max(14, w * 1.6);
    const pg = ctx.createRadialGradient(sx, botY, 1, sx, botY, pr);
    pg.addColorStop(0, 'rgba(235,245,255,0.18)');
    pg.addColorStop(1, 'rgba(220,235,255,0)');
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.ellipse(sx, botY, pr, Math.max(4, w * 0.22), 0, 0, 6.28); ctx.fill();
    const span = Math.max(1, botY - topY);
    for (let i = 0; i < 26; i++) {
      const ph = (G.t * 0.05 + i * 0.061) % 1;
      const yy = topY + ph * span;
      const hw = halfTop + (halfBot - halfTop) * ph;
      const xx = sx + Math.sin(i * 2.7 + G.t * 0.7) * hw * 0.86;
      ctx.fillStyle = 'rgba(240,248,255,' + (0.05 + (i % 3) * 0.03) + ')';
      ctx.fillRect(xx, yy, 1.2, 1.2);
    }
    ctx.restore();
  }

  function drawSprites(dirX, dirY, planeX, planeY, camZ, amb, flash) {
    const list = [];
    for (const pr of props) {
      if (pr.type === 'mannequin' && pr.mi === G.dancer && G.phase !== 'finale') continue;
      const d = (pr.x - P.x) ** 2 + (pr.y - P.y) ** 2;
      if (d < 400) list.push({ x: pr.x, y: pr.y, kind: 'prop', p: pr, d });
    }
    if (G.mans) {
      for (let i = 0; i < G.mans.length; i++) {
        if (i === G.possessed) continue;
        const m = G.mans[i];
        const d = (m.x - P.x) ** 2 + (m.y - P.y) ** 2;
        if (d < 400) list.push({ x: m.x, y: m.y, kind: 'whiteM', p: m, d });
      }
    }
    for (const it of items) {
      if (!it.taken) {
        const d = (it.x - P.x) ** 2 + (it.y - P.y) ** 2;
        if (d < 400) list.push({ x: it.x, y: it.y, kind: 'item', p: it, d });
      }
    }
    for (const g of ghosts) {
      const d = (g.x - P.x) ** 2 + (g.y - P.y) ** 2;
      if (d < 900) list.push({ x: g.x, y: g.y, kind: 'ghost', p: g, d });
    }
    for (const v of visions) {
      const d = (v.x - P.x) ** 2 + (v.y - P.y) ** 2;
      list.push({ x: v.x, y: v.y, kind: 'vision', p: v, d });
    }
    list.sort((a, b) => b.d - a.d);

    const invDet = 1 / (planeX * dirY - dirX * planeY);
    for (const it of list) {
      const relX = it.x - P.x, relY = it.y - P.y;
      const tx = invDet * (dirY * relX - dirX * relY);
      const ty = invDet * (-planeY * relX + planeX * relY);
      if (ty <= 0.15) continue;
      const screenX = (RW / 2) * (1 + tx / ty);
      if (screenX < -RW * 0.6 || screenX > RW * 1.6) continue;

      let imgC, h, elev = 0, alpha = 1;
      if (it.kind === 'prop') {
        const p = it.p;
        imgC = ART.props[p.type];
        h = p.h; elev = p.elev; alpha = p.alpha;
      } else if (it.kind === 'item') {
        imgC = ART.props.key;
        h = 0.24; elev = 0.12 + Math.sin(it.p.bob) * 0.03; alpha = 1;
      } else if (it.kind === 'whiteM') {
        imgC = ART.props.mannequinWhite;
        h = 0.9; elev = 0; alpha = 1;
      } else if (it.kind === 'ghost') {
        const g = it.p;
        if (!g.visible) continue;
        const pd = Math.hypot(g.x - P.x, g.y - P.y);
        if (G.phase === 'lunge') imgC = ART.ghosts.lunge;
        else if (G.phase === 'finale' || g.state === 'finale' || g.state === 'finaleclose') {
          imgC = pd < 2.6 ? ART.ghosts.lunge
            : ART.ghosts.hunt[((G.t * 7) | 0) % ART.ghosts.hunt.length];
        } else if (G.phase === 'pause') {
          imgC = ART.ghosts.dance[2];
        } else {
          const frames = ART.ghosts.dance;
          imgC = frames[((G.t * 5 + g.phase) | 0) % frames.length];
        }
        h = 0.96; elev = 0.012 + Math.sin(G.t * 1.4 + g.phase) * 0.006;
        alpha = 0.96;
      } else {
        imgC = ART.ghosts.dance[(G.t * 7) % ART.ghosts.dance.length | 0];
        h = 0.9; elev = 0.02; alpha = clamp(it.p.life / it.p.max, 0, 1) * 0.8;
      }
      if (!imgC) continue;

      const spriteH = (f * h) / ty;
      const spriteW = spriteH * (imgC.width / imgC.height);
      const bottom = horizon + f * (camZ - elev) / ty;
      const top = bottom - spriteH;
      if (bottom < 0 || top > RH) continue;
      if (it.kind === 'ghost') drawSpotlight(screenX, top, bottom, spriteW);

      let light = amb * 2.2;
      if (it.kind === 'ghost' || it.kind === 'whiteM') {
        light = 1.0;
      } else if (flash) {
        const ang = Math.atan2(relY, relX);
        const da = Math.abs(norm(ang - P.dir));
        const cone = clamp(1 - da / 0.62, 0, 1);
        light += 0.9 * cone * flash / (1 + ty * ty * 0.055);
      }
      light *= brightness;
      if (it.kind !== 'ghost' && it.kind !== 'whiteM') {
        alpha *= clamp(0.28 + light * 0.85, 0.15, 1);
      }

      // 地面阴影
      if (it.kind !== 'item' && elev < 0.4) {
        vctx.save();
        vctx.globalAlpha = alpha * 0.35;
        const g = vctx.createRadialGradient(screenX, bottom, 1, screenX, bottom, spriteW * 0.45);
        g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        vctx.fillStyle = g;
        vctx.beginPath();
        vctx.ellipse(screenX, bottom, spriteW * 0.45, Math.max(2, spriteH * 0.045), 0, 0, 6.28);
        vctx.fill();
        vctx.restore();
      }

      // 手电/发光道具的柔光
      if (it.kind === 'ghost' || it.kind === 'item' || it.kind === 'whiteM') {
        vctx.save();
        vctx.globalCompositeOperation = 'lighter';
        const rr = Math.max(spriteW * 0.9, 8);
        const gg = vctx.createRadialGradient(screenX, top + spriteH * 0.45, 1, screenX, top + spriteH * 0.45, rr);
        const a = it.kind === 'item' ? 0.22 : it.kind === 'whiteM' ? 0.13 : 0.12;
        gg.addColorStop(0, it.kind === 'item' ? `rgba(255,205,120,${a})`
          : it.kind === 'whiteM' ? `rgba(235,245,255,${a})` : `rgba(160,205,220,${a})`);
        gg.addColorStop(1, 'rgba(0,0,0,0)');
        vctx.fillStyle = gg;
        vctx.fillRect(screenX - rr, top + spriteH * 0.45 - rr, rr * 2, rr * 2);
        vctx.restore();
      }

      const strips = 10;
      const dw = spriteW / strips;
      vctx.globalAlpha = alpha;
      vctx.imageSmoothingEnabled = true;
      for (let s = 0; s < strips; s++) {
        const dx = screenX - spriteW / 2 + s * dw;
        const cx = Math.floor(screenX - spriteW / 2 + (s + 0.5) * dw);
        if (cx < 0 || cx >= RW) continue;
        if (zbuf[cx] < ty - 0.05) continue;
        const sw = imgC.width / strips;
        vctx.drawImage(imgC, s * sw, 0, sw, imgC.height, dx, top, dw + 0.6, spriteH);
      }
      vctx.globalAlpha = 1;
    }
  }

  /* ================= 菜单幽灵动画 ================= */
  let menuGhostT = 0, menuLast = 0;
  function animateMenuGhost(dt) {
    menuLast += dt;
    if (menuLast < 0.14) return;
    menuLast = 0;
    menuGhostT += 0.14;
    const c = $('#menuGhost');
    if (!c) return;
    const ctx = c.getContext('2d');
    const frames = ART.ghosts.dance;
    const imgc = frames[(menuGhostT * 4) % frames.length | 0];
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.globalAlpha = 0.95;
    ctx.drawImage(imgc, 0, 0, c.width, c.height);
  }

  /* ================= UI ================= */
  let uiT = 0;
  function updateUI(dt) {
    uiT += dt;
    if (uiT < 0.1) return;
    uiT = 0;
    const mm = Math.floor(G.runTime / 60), ss = Math.floor(G.runTime % 60);
    $('#surv').textContent = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    const now = new Date();
    $('#tc').textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    $('#lv').textContent = G.level;
    $('#mstamina').style.width = G.stare + '%';
    $('#mbreath').style.width = P.stamina + '%';
    $('#mbattery').style.width = P.battery + '%';
    $('#mstamina').classList.toggle('low', G.stare < 35);
    $('#mbreath').classList.toggle('low', P.stamina < 18);
    $('#mbattery').classList.toggle('low', P.battery < 16);
    $('#distText').textContent = `她 ${(Math.max(0.1, G.dist) * 1.6).toFixed(1)} m · 剩余 ${Math.ceil(G.remaining)}s`;

    // 生存提示
    let pt = '', sub = '', red = false, show = true;
    if (G.stare < 35) { pt = '盯着她'; sub = '视线快断了'; red = true; }
    else if (G.dist < 2.4) { pt = '她快到了'; sub = '后退 · 别转身'; red = true; }
    else if (G.switchT < 1.0) { pt = '她换了一个假人'; sub = '找聚光灯'; red = true; }
    else { pt = '凝视中'; sub = '保持距离'; }
    const pel = $('#phaseText');
    pel.innerHTML = pt + (sub ? `<small>${sub}</small>` : '');
    pel.classList.toggle('show', show);
    pel.classList.toggle('red', red);

    // 心电图
    drawECG(60 + Math.round((G.danger || 0) * 80));
    $('#bpm').textContent = `${60 + Math.round((G.danger || 0) * 80)} BPM`;

    // 提示
    let hint = isTouch ? '左摇杆后退 · 右半屏始终盯住她' : 'WASD 后退 · 鼠标始终盯住她 · Shift 冲刺';
    if (G.stare < 35) hint = '把视线锁在聚光灯下的假人身上';
    else if (G.dist < 2.4) hint = '往后退 · 不要转身';
    else hint = '盯着她 · 绕着房间后退';
    $('#hint').textContent = hint;

    // 十字准星随呼吸
    const ch = $('#crosshair');
    ch.style.opacity = String(0.55 + Math.sin(G.t * 2.2) * 0.08);
    ch.classList.toggle('watching', !!G.gaze);
  }

  const ecgBuf = [];
  function drawECG(bpm) {
    const c = $('#ecg');
    if (!c) return;
    const x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    const W = c.width, H = c.height;
    x.strokeStyle = 'rgba(120,180,170,.7)';
    x.lineWidth = 1;
    x.beginPath();
    const phase = (G.t * bpm / 60) % 1;
    for (let i = 0; i < W; i++) {
      const t = i / W * 2 + phase * 2;
      const p = t % 1;
      let y = H * 0.62;
      if (p > 0.42 && p < 0.47) y -= Math.sin((p - 0.42) / 0.05 * Math.PI) * H * 0.5;
      else if (p > 0.47 && p < 0.52) y += Math.sin((p - 0.47) / 0.05 * Math.PI) * H * 0.28;
      else if (p > 0.58 && p < 0.72) y -= Math.sin((p - 0.58) / 0.14 * Math.PI) * H * 0.12;
      if (i === 0) x.moveTo(i, y); else x.lineTo(i, y);
    }
    x.stroke();
  }

  function toast(text, sub, red, dur) {
    const el = $('#toast');
    el.innerHTML = text + (sub ? `<small>${sub}</small>` : '');
    el.classList.toggle('red', !!red);
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), (dur || 2.2) * 1000);
  }

  /* ================= 流程 ================= */
  function startGame() {
    resetRun();
    G.mode = 'play';
    G.paused = false;
    $('#menu').classList.add('hidden');
    $('#intro').classList.add('hidden');
    $('#over').classList.add('hidden');
    $('#win').classList.add('hidden');
    $('#pause').classList.add('hidden');
    $('#jumpscare').style.display = 'none';
    $('#hud').classList.remove('hidden');
    $('#touch').classList.toggle('hidden', !isTouch);
    Sound.startAmbience();
    Sound.musicBox(true);
    toast('灯灭了', '聚光灯照到的假人 · 一直盯着它', false, 4.2);
    setTimeout(() => toast('坚持到天亮', '75 秒 · 她会越来越快', false, 3), 4400);
    if (isTouch) {
      try {
        const el = document.documentElement;
        if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
      } catch (e) {}
    }
    if (ART) render();
  }

  function togglePause(on) {
    if (G.mode !== 'play') return;
    G.paused = on === undefined ? !G.paused : on;
    $('#pause').classList.toggle('hidden', !G.paused);
    if (G.paused) drawMap();
    if (G.paused && document.pointerLockElement) document.exitPointerLock();
  }

  function drawMap() {
    const c = $('#map');
    if (!c) return;
    const x = c.getContext('2d');
    const S = c.width, cs = S / MW;
    x.clearRect(0, 0, S, S);
    x.fillStyle = '#07070a'; x.fillRect(0, 0, S, S);
    // 地面
    for (let yy = 0; yy < MH; yy++) for (let xx = 0; xx < MW; xx++) {
      const i = yy * MW + xx;
      if (map[i]) continue;
      x.fillStyle = floorMap[i] === 2 ? '#1b1113' : (floorMap[i] === 1 ? '#181410' : '#141416');
      x.fillRect(xx * cs, yy * cs, cs - 0.3, cs - 0.3);
    }
    // 墙体：只画贴着地面的墙
    for (let yy = 0; yy < MH; yy++) for (let xx = 0; xx < MW; xx++) {
      const i = yy * MW + xx;
      const t = map[i];
      if (!t) continue;
      let near = false;
      for (let oy = -1; oy <= 1 && !near; oy++) for (let ox = -1; ox <= 1; ox++) {
        const nx = xx + ox, ny = yy + oy;
        if (nx >= 0 && ny >= 0 && nx < MW && ny < MH && !map[ny * MW + nx]) { near = true; break; }
      }
      if (!near) continue;
      const col = t === 3 ? '#28363c' : t === 4 ? '#3b1218' : t === 5 ? '#86653a' : t === 2 ? '#251a11' : '#30281c';
      x.fillStyle = col;
      x.fillRect(xx * cs, yy * cs, cs - 0.25, cs - 0.25);
    }
    // 假人
    (G.mans || MANNEQUINS).forEach((m, i) => {
      const px = m.x * cs, py = m.y * cs;
      const active = i === G.possessed;
      if (active) {
        const g = x.createRadialGradient(px, py, 0, px, py, 14);
        g.addColorStop(0, 'rgba(255,205,120,.65)'); g.addColorStop(1, 'rgba(255,190,90,0)');
        x.fillStyle = g; x.beginPath(); x.arc(px, py, 14, 0, 6.28); x.fill();
      }
      x.fillStyle = active ? '#e0b772' : '#6f6759';
      x.beginPath(); x.arc(px, py, active ? 4 : 3, 0, 6.28); x.fill();
    });
    x.fillStyle = 'rgba(160,145,118,.35)';
    x.font = '9px "Songti SC", serif';
    x.fillText('房间', 15 * cs - 12, 14 * cs - 3);
    // 出口
    const ex = 15 * cs, ey = 18.8 * cs;
    x.fillStyle = G.doorOpen ? '#7fbf8c' : '#4b3b25';
    x.fillRect(ex - cs * 0.45, ey - cs * 0.3, cs * 0.9, cs * 0.35);
    if (G.doorOpen) {
      const g = x.createRadialGradient(ex, ey, 1, ex, ey, 16);
      g.addColorStop(0, 'rgba(120,230,150,.5)'); g.addColorStop(1, 'rgba(100,200,130,0)');
      x.fillStyle = g; x.beginPath(); x.arc(ex, ey, 16, 0, 6.28); x.fill();
    }
    // 玩家
    const px = P.x * cs, py = P.y * cs;
    x.save();
    x.translate(px, py);
    x.rotate(P.dir);
    x.fillStyle = 'rgba(235,225,200,.18)';
    x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 22, -0.55, 0.55); x.closePath(); x.fill();
    x.fillStyle = '#e6d9bd';
    x.beginPath(); x.moveTo(8, 0); x.lineTo(-4, 4); x.lineTo(-4, -4); x.closePath(); x.fill();
    x.restore();
    x.fillStyle = '#efe4ca';
    x.beginPath(); x.arc(px, py, 3.2, 0, 6.28); x.fill();
    x.strokeStyle = 'rgba(220,205,175,.75)'; x.lineWidth = 1;
    x.beginPath(); x.arc(px, py, 6, 0, 6.28); x.stroke();
    // 指北
    x.fillStyle = 'rgba(150,135,110,.7)';
    x.font = '10px monospace';
    x.fillText('N', 8, 15);
    x.beginPath(); x.moveTo(19, 12); x.lineTo(17, 4); x.lineTo(15, 12); x.fill();
    // 外框
    x.strokeStyle = 'rgba(170,145,110,.18)';
    x.strokeRect(0.5, 0.5, S - 1, S - 1);
    const mm = Math.floor(G.runTime / 60), ss = Math.floor(G.runTime % 60);
    $('#pauseMeta').textContent = `第 ${G.level} 阶段 · 凝视 ${Math.round(G.stare)}% · 剩余 ${Math.ceil(G.remaining)}s`;
  }

  function die() {
    if (G.mode !== 'play') return;
    G.mode = 'dying';
    G.dyingT = 0;
    Sound.musicBox(false);
    Sound.scream();
    G.shake = 2;
    const j = $('#jumpscare');
    j.style.display = 'flex';
    j.style.opacity = '1';
    $('#whiteout').style.opacity = '1';
    setTimeout(() => { $('#whiteout').style.opacity = '0'; }, 900);
    if (navigator.vibrate) { try { navigator.vibrate([90, 40, 180, 60, 260]); } catch (e) {} }
    if (document.pointerLockElement) document.exitPointerLock();
  }

  function showOver() {
    const mm = Math.floor(G.runTime / 60), ss = Math.floor(G.runTime % 60);
    $('#stTime').textContent = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    $('#stLv').textContent = G.level;
    $('#stKeys').textContent = `${Math.round(G.stare)}%`;
    $('#over').classList.remove('hidden');
    $('#hud').classList.add('hidden');
    $('#touch').classList.add('hidden');
    $('#overTitle').textContent = '她抓住了你';
    $('#overSub').textContent = G.stare <= 0 ? '你移开了视线。' : '她贴到了你的面前。';
    Sound.stopAmbience();
  }

  function winGame() {
    if (G.mode !== 'play') return;
    G.mode = 'win';
    G.won = true;
    Sound.musicBox(false);
    Sound.unlock();
    Sound.stopAmbience();
    const mm = Math.floor(G.runTime / 60), ss = Math.floor(G.runTime % 60);
    $('#wnTime').textContent = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    $('#wnLv').textContent = G.level;
    const rank = G.runTime > 360 ? 'S' : G.runTime > 240 ? 'A' : G.runTime > 120 ? 'B' : 'C';
    $('#wnRank').textContent = rank;
    $('#win').classList.remove('hidden');
    $('#hud').classList.add('hidden');
    $('#touch').classList.add('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
    const j = $('#jumpscare');
    j.style.display = 'none';
  }

  /* ================= 启动 ================= */
  function init() {
    buildWorld();
    resize();
    document.body.classList.toggle('touch', isTouch);
    const compEl = document.querySelector('.compass');
    if (compEl) compEl.style.display = 'none';
    document.querySelectorAll('.keys,.keys-label').forEach(el => { el.style.display = 'none'; });
    ART = Art.build();
    grainURL = ART.grain;
    document.documentElement.style.setProperty('--grain', `url(${grainURL})`);
    document.documentElement.style.setProperty('--blood', `url(${ART.blood.toDataURL('image/png')})`);
    const faceC = $('#face');
    faceC.width = ART.face.width; faceC.height = ART.face.height;
    faceC.getContext('2d').drawImage(ART.face, 0, 0);

    const ghost = $('#menuGhost');
    ghost.width = 280; ghost.height = 560;
    Art.paintMenuGhost(ghost);

    bindInput();
    window.addEventListener('resize', () => { resize(); });
    window.visualViewport && window.visualViewport.addEventListener('resize', resize);

    // 画质/音效
    const qs = $('#qualitySeg');
    qs.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      qs.querySelectorAll('button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      quality = +b.dataset.q;
      try { localStorage.setItem('ballet_q', quality); } catch (e) {}
      resize();
    }));
    const ss = $('#soundSeg');
    ss.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      ss.querySelectorAll('button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      soundOn = b.dataset.s === '1';
      Sound.setMuted(!soundOn);
    }));
    const bs = $('#brightSeg');
    const BRIGHT = [0.85, 1.15, 1.55];
    if (bs) bs.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      bs.querySelectorAll('button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      brightness = BRIGHT[+b.dataset.b] || 1.15;
      try { localStorage.setItem('ballet_b', b.dataset.b); } catch (e) {}
    }));
    try {
      const q = localStorage.getItem('ballet_q');
      if (q !== null && qs.querySelector(`[data-q="${q}"]`)) {
        qs.querySelectorAll('button').forEach(x => x.classList.remove('on'));
        qs.querySelector(`[data-q="${q}"]`).classList.add('on');
        quality = +q;
      }
      const bb = localStorage.getItem('ballet_b');
      if (bb !== null && bs && bs.querySelector(`[data-b="${bb}"]`)) {
        bs.querySelectorAll('button').forEach(x => x.classList.remove('on'));
        bs.querySelector(`[data-b="${bb}"]`).classList.add('on');
        brightness = BRIGHT[+bb] || 1.15;
      }
    } catch (e) {}

    // 按钮
    $('#btnStart').addEventListener('click', () => {
      try { Sound.init(); Sound.setMuted(!soundOn); } catch (err) { window.__errors.push('audio: ' + err.message); }
      tryFullscreen();
      $('#menu').classList.add('hidden');
      $('#intro').classList.remove('hidden');
      G.mode = 'intro';
      G.introT = 0;
      setTimeout(() => { if (G.mode === 'intro') startGame(); }, 3400);
    });
    $('#intro').addEventListener('pointerdown', () => { if (G.mode === 'intro') startGame(); });
    $('#btnHelp').addEventListener('click', () => $('#help').classList.remove('hidden'));
    $('#btnHelpClose').addEventListener('click', () => $('#help').classList.add('hidden'));
    $('#btnPause').addEventListener('click', () => togglePause(true));
    $('#btnResume').addEventListener('click', () => togglePause(false));
    $('#btnPauseHelp').addEventListener('click', () => $('#help').classList.remove('hidden'));
    $('#btnQuit').addEventListener('click', quitToMenu);
    $('#btnRetry').addEventListener('click', () => { Sound.init(); startGame(); });
    $('#btnAgain').addEventListener('click', () => { Sound.init(); startGame(); });
    $('#btnMenu').addEventListener('click', quitToMenu);
    $('#btnWinMenu').addEventListener('click', quitToMenu);
    $('#btnMute').addEventListener('click', () => {
      soundOn = !soundOn;
      Sound.setMuted(!soundOn);
      $('#btnMute').textContent = soundOn ? '♪' : '×';
      const sg = $('#soundSeg');
      if (sg) {
        sg.querySelectorAll('button').forEach(x => x.classList.remove('on'));
        sg.querySelector(`[data-s="${soundOn ? 1 : 0}"]`).classList.add('on');
      }
    });
    $('#btnFull').addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {});
      } else document.exitFullscreen && document.exitFullscreen();
    });
    document.addEventListener('fullscreenchange', resize);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && G.mode === 'play' && !G.paused) togglePause(true);
    });

    if (!isTouch) $('#touch').classList.add('hidden');
    else $('#hint').textContent = '左半屏摇杆 · 右半屏拖动';

    // 调试：无头截图用（不影响正常游玩）
    const qp = new URLSearchParams(location.search);
    if (qp.has('noanim')) {
      const st = document.createElement('style');
      st.textContent = '*{animation:none!important;transition:none!important}';
      document.head.appendChild(st);
    }
    if (qp.has('plain')) {
      const t = document.createElement('div');
      t.style.cssText = 'position:fixed;left:0;top:0;width:90px;height:90px;background:#fff;z-index:99999';
      document.body.appendChild(t);
    }
    if (qp.has('auto') || qp.has('debug') || qp.has('click')) {
      const dbg = document.createElement('div');
      dbg.id = 'debug';
      dbg.style.cssText = 'position:fixed;left:0;bottom:0;z-index:99;background:#000c;color:#0f0;font:9px monospace;padding:3px;white-space:pre-wrap;max-width:100%';
      document.body.appendChild(dbg);
      setInterval(() => {
        let bright = 0, sum = 0, n = 0, maxc = 0;
        let pix = null;
        if (img && G.mode !== 'menu') {
          pix = vctx.getImageData(0, 0, RW, RH).data;
          const dd = pix;
          for (let yy = 0; yy < RH; yy += 10) {
            for (let xx = 0; xx < RW; xx += 10) {
              const i = (yy * RW + xx) * 4;
              const v = (dd[i] + dd[i + 1] + dd[i + 2]) / 3;
              sum += v; n++; if (v > 20) bright++; if (v > maxc) maxc = v;
            }
          }
        }
        const h1 = document.querySelector('h1');
        const hr = h1 ? h1.getBoundingClientRect() : null;
        const sb = document.querySelector('#btnStart');
        const sbr = sb ? sb.getBoundingClientRect() : null;
        const bcover = sbr ? (() => { const el = document.elementFromPoint(sbr.x + sbr.width / 2, sbr.y + sbr.height / 2); return el ? (el.id || el.className || el.tagName) : '-'; })() : '-';
        const g0 = ghosts[0];
        let reachInfo = '-';
        if (G.mode === 'play') {
          const rf = bfsField(P.x, P.y);
          let rc = 0;
          for (const it of items) if (!it.taken && rf[(it.y | 0) * MW + (it.x | 0)] >= 0) rc++;
          const exitOk = rf[22 * MW + 15] >= 0;
          reachInfo = rc + '/' + items.filter(x => !x.taken).length + (exitOk ? '/exit' : '/NOEXIT');
        }
        let gs = null;
        if (g0) {
          const dirX = Math.cos(P.dir), dirY = Math.sin(P.dir);
          const planeX = -dirY * (RW / 2) / f, planeY = dirX * (RW / 2) / f;
          const invDet = 1 / (planeX * dirY - dirX * planeY);
          const rx = g0.x - P.x, ry = g0.y - P.y;
          const tx = invDet * (dirY * rx - dirX * ry);
          const ty = invDet * (-planeY * rx + planeX * ry);
          if (ty > 0.1) {
            const sx = (RW / 2) * (1 + tx / ty);
            const sh = f * 0.9 / ty;
            const bt = horizon + f * 0.5 / ty;
            gs = { sx, top: bt - sh, h: sh, w: sh * 0.5, ty };
          }
        }
        let gmax = 0, gsum = 0, gn = 0, bmax = 0;
        if (gs && pix) {
          const x0 = Math.max(0, gs.sx - gs.w / 2 | 0), x1 = Math.min(RW - 1, gs.sx + gs.w / 2 | 0);
          const y0 = Math.max(0, gs.top | 0), y1 = Math.min(RH - 1, gs.top + gs.h | 0);
          const dd = pix;
          for (let yy = y0; yy <= y1; yy += 1) for (let xx = x0; xx <= x1; xx += 1) {
            const i = (yy * RW + xx) * 4;
            const v = (dd[i] + dd[i + 1] + dd[i + 2]) / 3;
            gsum += v; gn++; if (v > gmax) gmax = v;
          }
        }
        if (pix) {
          const dd = pix;
          for (let yy = 0; yy < RH; yy += 7) for (let xx = 0; xx < RW; xx += 7) {
            const i = (yy * RW + xx) * 4;
            const v = (dd[i] + dd[i + 1] + dd[i + 2]) / 3;
            if (v > bmax) bmax = v;
          }
        }
        dbg.textContent =
          `mode=${G.mode} px=${P.x.toFixed(2)},${P.y.toFixed(2)} dir=${P.dir.toFixed(2)} ` +
          `phase=${G.phase} act=${G.act} imm=${(G.immersion || 0).toFixed(0)} gaze=${G.gaze ? 1 : 0} ` +
          `dist=${(G.dist || 0).toFixed(2)} stare=${(G.stare || 0).toFixed(0)} ` +
          `ghosts=${ghosts.length} keys=${P.keys} lvl=${G.level} rw=${RW}x${RH} ` +
          `avg=${(sum / Math.max(1, n)).toFixed(1)} lit=${(bright / Math.max(1, n) * 100).toFixed(1)}% max=${maxc.toFixed(0)} ` +
          `ghost=${g0 ? (g0.x.toFixed(2) + ',' + g0.y.toFixed(2) + ':' + g0.state) : '-'} ` +
          `gs=${gs ? [gs.sx | 0, gs.top | 0, gs.w | 0, gs.h | 0].join(',') : '-'} ` +
          `gpx=${gn ? (gsum / gn).toFixed(1) + '/' + gmax.toFixed(0) : '-'} bmax=${bmax.toFixed(0)} ` +
          `reach=${reachInfo} open=${openCells.length} ` +
          `h1=${hr ? [hr.x | 0, hr.y | 0, hr.width | 0, hr.height | 0].join(',') : '-'} ` +
          `vp=${window.innerWidth}x${window.innerHeight} dpr=${window.devicePixelRatio} ` +
          `menu=${(() => { const m = document.getElementById('menu'); const r = m.getBoundingClientRect(); return [r.width | 0, r.height | 0, getComputedStyle(m).display, getComputedStyle(document.body).backgroundColor].join('/'); })()} ` +
          `h1s=${(() => { const s = getComputedStyle(h1); return [s.color, s.opacity, s.fontSize, s.fontFamily.slice(0, 18)].join('/'); })()} ` +
          `cover=${(() => { const el = document.elementFromPoint(hr.x + 40, hr.y + hr.height / 2); return el ? (el.id || el.className || el.tagName) : '-'; })()} ` +
          `startBtn=${sbr ? [sbr.x | 0, sbr.y | 0, sbr.width | 0, sbr.height | 0].join(',') : '-'}/${bcover} ` +
          `ov=${(() => {
            const sels = ['.hud-bottom-left', '.hud-bottom-right', '.hud-actions', '.compass', '#stick', '.touch-right', '.hint'];
            const rs = sels.map(s => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); if (r.width === 0) return null; return { s, r }; }).filter(Boolean);
            const hits = [];
            for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
              const a = rs[i].r, b = rs[j].r;
              const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              if (ox > 2 && oy > 2) hits.push(rs[i].s + 'x' + rs[j].s + '(' + (ox | 0) + ',' + (oy | 0) + ')');
            }
            return hits.length ? hits.join(' ') : 'none';
          })()} ` +
          `menuH=${(() => { const m = document.querySelector('.menu-inner'); const r = m ? m.getBoundingClientRect() : null; return r ? (r.height | 0) + '/' + (window.innerHeight | 0) : '-'; })()} ` +
          `err=${window.__errors.length ? window.__errors.join(' | ') : 'none'}`;
      }, 500);
      if (qp.has('click')) {
        setTimeout(() => {
          const b = document.querySelector('#btnStart');
          if (b) b.click();
        }, 600);
      }
      if (qp.has('auto')) {
        try { startGame(); } catch (e) { window.__errors.push('auto: ' + e.message + ' ' + (e.stack || '')); }
      }
      if (qp.get('pose') === 'hall') {
        P.x = 14.6; P.y = 16.5; P.dir = 0;
        ghosts[0].x = 20.2; ghosts[0].y = 16.5;
        ghosts[0].stun = 999;
        G.runTime = 137; G.level = 7;
        P.keys = 2; G.keys = 2;
        for (let i = 0; i < 2; i++) items[i].taken = true;
      }
      if (qp.get('pose') === 'close') {
        P.x = 15.4; P.y = 16.5; P.dir = 0; P.pitch = -0.03;
        ghosts[0].x = 18.6; ghosts[0].y = 16.5;
        ghosts[0].stun = 999;
        P.battery = 74;
      }
      if (qp.get('pose') === 'chase') {
        P.x = 10.5; P.y = 16.5; P.dir = 0; P.battery = 100;
        ghosts[0].x = 22.5; ghosts[0].y = 16.5;
        ghosts[0].state = 'hunt';
        ghosts[0].lastSeen = { x: P.x, y: P.y };
      }
      if (qp.has('die')) setTimeout(() => die(), 1200);
      if (qp.has('win')) setTimeout(() => { P.keys = 5; G.keys = 5; winGame(); }, 1200);
      if (qp.has('pause')) setTimeout(() => togglePause(true), 400);
      if (qp.has('lookaway')) P.dir = Math.PI / 2;
      if (qp.has('finale')) startFinale();
      if (qp.has('fastwin')) G.target = 2;
      if (qp.has('sim')) {
        const n = Math.min(1200, +qp.get('sim') || 100);
        for (let i = 0; i < n; i++) {
          if (G.mode !== 'play') break;
          G.t += 0.05; G.runTime += 0.05;
          update(0.05);
        }
      }
      if (qp.get('nohud')) $('#hud').classList.add('hidden');
      if (qp.has('touchui')) {
        document.body.classList.add('touch');
        $('#touch').classList.remove('hidden');
      }
    }

    requestAnimationFrame(loop);
  }

  function tryFullscreen() {
    if (!isTouch) return;
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
      }
    } catch (e) {}
  }

  function quitToMenu() {
    G.mode = 'menu';
    G.paused = false;
    Sound.musicBox(false);
    Sound.stopAmbience();
    $('#over').classList.add('hidden');
    $('#win').classList.add('hidden');
    $('#pause').classList.add('hidden');
    $('#hud').classList.add('hidden');
    $('#touch').classList.add('hidden');
    $('#menu').classList.remove('hidden');
    $('#jumpscare').style.display = 'none';
    if (document.pointerLockElement) document.exitPointerLock();
  }

  window.addEventListener('load', init);
})();
