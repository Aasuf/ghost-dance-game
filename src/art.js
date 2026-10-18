/* 程序化美术：贴图、女鬼动画帧、道具、惊吓特写 */
const Art = (() => {
  function cv(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function seeded(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  function tex(canvas) {
    const g = canvas.getContext('2d');
    const d = g.getImageData(0, 0, canvas.width, canvas.height);
    return { w: canvas.width, h: canvas.height, px: new Uint32Array(d.data.buffer) };
  }
  function rgba(r, g, b, a) { return `rgba(${r|0},${g|0},${b|0},${a})`; }

  /* ---------------- 墙面贴图 ---------------- */
  function texWallpaper() {
    const S = 128, c = cv(S, S), x = c.getContext('2d'), R = seeded(7);
    const g = x.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, '#4d4231'); g.addColorStop(.55, '#443a2c'); g.addColorStop(1, '#312a20');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    // 大马士革暗纹
    x.strokeStyle = 'rgba(130,112,80,.16)'; x.lineWidth = 1;
    for (let ry = -16; ry < S + 24; ry += 32) {
      for (let rx = -16; rx < S + 24; rx += 32) {
        const ox = ((ry / 32) | 0) % 2 ? 16 : 0;
        x.beginPath();
        x.moveTo(rx + ox, ry + 16);
        x.bezierCurveTo(rx + ox + 8, ry + 4, rx + ox + 18, ry + 8, rx + ox + 16, ry + 16);
        x.bezierCurveTo(rx + ox + 14, ry + 26, rx + ox + 4, ry + 26, rx + ox, ry + 16);
        x.stroke();
        x.beginPath();
        x.ellipse(rx + ox, ry + 16, 2.6, 7, 0, 0, 6.28);
        x.stroke();
      }
    }
    // 水渍
    for (let i = 0; i < 22; i++) {
      const sx = R() * S, sy = R() * 90, w = 2 + R() * 8, h = 12 + R() * 60;
      const sg = x.createLinearGradient(sx, sy, sx, sy + h);
      sg.addColorStop(0, 'rgba(18,14,10,.20)');
      sg.addColorStop(1, 'rgba(18,14,10,0)');
      x.fillStyle = sg;
      x.fillRect(sx, sy, w, h);
    }
    // 剥落
    x.fillStyle = 'rgba(96,90,78,.5)';
    for (let i = 0; i < 5; i++) {
      const px = R() * S, py = R() * 54, w = 8 + R() * 22, h = 6 + R() * 20;
      x.beginPath();
      x.moveTo(px, py);
      x.lineTo(px + w * .6, py - 2);
      x.lineTo(px + w, py + h * .5);
      x.lineTo(px + w * .5, py + h);
      x.lineTo(px + 1, py + h * .7);
      x.fill();
    }
    // 护墙板
    const wy = 92;
    x.fillStyle = '#241810'; x.fillRect(0, wy, S, S - wy);
    x.fillStyle = '#3d2a1b'; x.fillRect(0, wy, S, 4);
    x.fillStyle = 'rgba(120,90,60,.25)'; x.fillRect(0, wy + 1, S, 1);
    for (let i = 0; i < 4; i++) {
      const px = i * 32;
      x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(px, wy + 5, 1, S - wy - 5);
      x.fillStyle = 'rgba(120,90,60,.06)'; x.fillRect(px + 1, wy + 5, 1, S - wy - 5);
    }
    // 底部污垢
    const dg = x.createLinearGradient(0, S - 34, 0, S);
    dg.addColorStop(0, 'rgba(0,0,0,0)'); dg.addColorStop(1, 'rgba(0,0,0,.55)');
    x.fillStyle = dg; x.fillRect(0, S - 34, S, 34);
    // 裂纹
    x.strokeStyle = 'rgba(15,12,9,.5)';
    for (let i = 0; i < 4; i++) {
      let px = R() * S, py = R() * S;
      x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 5; k++) { px += (R() - .5) * 14; py += R() * 12; x.lineTo(px, py); }
      x.stroke();
    }
    return tex(c);
  }

  function texWood() {
    const S = 128, c = cv(S, S), x = c.getContext('2d'), R = seeded(21);
    x.fillStyle = '#2a1a10'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 8; i++) {
      const px = i * 16;
      const g = x.createLinearGradient(px, 0, px + 16, 0);
      g.addColorStop(0, '#22140c'); g.addColorStop(.25, '#3a2416');
      g.addColorStop(.7, '#33200f'); g.addColorStop(1, '#1e120a');
      x.fillStyle = g; x.fillRect(px, 0, 15, S);
      x.strokeStyle = 'rgba(10,6,4,.6)'; x.beginPath(); x.moveTo(px + 15.5, 0); x.lineTo(px + 15.5, S); x.stroke();
      // 木纹
      for (let k = 0; k < 7; k++) {
        x.strokeStyle = rgba(120, 84, 54, .06 + R() * .05);
        x.beginPath();
        const gx = px + 2 + R() * 11;
        x.moveTo(gx, 0);
        for (let yy = 0; yy < S; yy += 8) x.lineTo(gx + Math.sin(yy * .11 + k) * 1.6, yy);
        x.stroke();
      }
      // 钉子
      x.fillStyle = 'rgba(10,8,6,.8)';
      [10, 60, 112].forEach(yy => { x.beginPath(); x.arc(px + 3, yy, 1.1, 0, 6.28); x.fill(); });
    }
    const dg = x.createLinearGradient(0, 0, 0, S);
    dg.addColorStop(0, 'rgba(0,0,0,.35)'); dg.addColorStop(.4, 'rgba(0,0,0,0)'); dg.addColorStop(1, 'rgba(0,0,0,.5)');
    x.fillStyle = dg; x.fillRect(0, 0, S, S);
    return tex(c);
  }

  function texMirror() {
    const S = 128, c = cv(S, S), x = c.getContext('2d'), R = seeded(33);
    // 外框
    x.fillStyle = '#150f0b'; x.fillRect(0, 0, S, S);
    x.strokeStyle = '#6b5433'; x.lineWidth = 2; x.strokeRect(4, 4, S - 8, S - 8);
    x.strokeStyle = 'rgba(150,120,70,.35)'; x.lineWidth = 1; x.strokeRect(7, 7, S - 14, S - 14);
    // 镜面
    const g = x.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, '#243036'); g.addColorStop(.35, '#42555d');
    g.addColorStop(.55, '#28363c'); g.addColorStop(.8, '#3a4d54'); g.addColorStop(1, '#162228');
    x.fillStyle = g; x.fillRect(10, 10, S - 20, S - 20);
    // 反射亮带
    for (let i = 0; i < 7; i++) {
      const px = 12 + R() * (S - 24);
      const w = 1 + R() * 9;
      const rg = x.createLinearGradient(px, 10, px + w, 10);
      rg.addColorStop(0, 'rgba(180,210,215,0)');
      rg.addColorStop(.5, `rgba(180,210,215,${.04 + R() * .06})`);
      rg.addColorStop(1, 'rgba(180,210,215,0)');
      x.fillStyle = rg; x.fillRect(px, 10, w, S - 20);
    }
    // 雾状污渍
    for (let i = 0; i < 9; i++) {
      const px = 10 + R() * (S - 20), py = 10 + R() * (S - 20), r = 6 + R() * 26;
      const sg = x.createRadialGradient(px, py, 0, px, py, r);
      sg.addColorStop(0, 'rgba(150,165,160,.10)'); sg.addColorStop(1, 'rgba(150,165,160,0)');
      x.fillStyle = sg; x.beginPath(); x.arc(px, py, r, 0, 6.28); x.fill();
    }
    // 极淡的人影（不是玩家）
    x.save();
    x.globalAlpha = .1;
    x.fillStyle = '#05090b';
    x.beginPath(); x.ellipse(80, 52, 9, 12, 0, 0, 6.28); x.fill();
    x.beginPath(); x.moveTo(70, 64); x.quadraticCurveTo(80, 58, 90, 64);
    x.lineTo(96, 104); x.quadraticCurveTo(80, 112, 64, 104); x.closePath(); x.fill();
    x.restore();
    // 裂纹
    for (let i = 0; i < 3; i++) {
      let px = 20 + R() * (S - 40), py = 20 + R() * (S - 40);
      x.strokeStyle = 'rgba(210,230,230,.22)'; x.lineWidth = .8;
      x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 6; k++) { px += (R() - .5) * 26; py += (R() - .5) * 26; x.lineTo(px, py); }
      x.stroke();
    }
    // 边缘阴影
    const vg = x.createRadialGradient(64, 64, 20, 64, 64, 70);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
    x.fillStyle = vg; x.fillRect(10, 10, S - 20, S - 20);
    return tex(c);
  }

  function texCurtain() {
    const S = 128, c = cv(S, S), x = c.getContext('2d'), R = seeded(51);
    for (let px = 0; px < S; px++) {
      const t = px / S;
      const fold = (Math.sin(t * Math.PI * 8) + Math.sin(t * Math.PI * 14 + 1.2) * .5) * .5 + .5;
      const shade = .22 + fold * .78;
      const r = 24 + 66 * shade, gg = 4 + 16 * shade, b = 8 + 14 * shade;
      x.fillStyle = `rgb(${r|0},${gg|0},${b|0})`;
      x.fillRect(px, 0, 1, S);
      if (fold > .85) {
        x.fillStyle = 'rgba(150,60,55,.18)';
        x.fillRect(px, 0, 1, S);
      }
    }
    // 丝绒竖向纹理
    for (let i = 0; i < 220; i++) {
      const px = R() * S, py = R() * S, h = 2 + R() * 16;
      x.fillStyle = `rgba(10,0,2,${.04 + R() * .08})`;
      x.fillRect(px, py, 1, h);
    }
    // 磨损与污渍
    for (let i = 0; i < 12; i++) {
      const px = R() * S, py = R() * S, r = 2 + R() * 10;
      x.fillStyle = `rgba(20,8,6,${.1 + R() * .18})`;
      x.beginPath(); x.arc(px, py, r, 0, 6.28); x.fill();
    }
    const dg = x.createLinearGradient(0, 0, 0, S);
    dg.addColorStop(0, 'rgba(0,0,0,.45)'); dg.addColorStop(.25, 'rgba(0,0,0,0)');
    dg.addColorStop(.85, 'rgba(0,0,0,.15)'); dg.addColorStop(1, 'rgba(0,0,0,.6)');
    x.fillStyle = dg; x.fillRect(0, 0, S, S);
    return tex(c);
  }

  function texExit() {
    const S = 128, c = cv(S, S), x = c.getContext('2d');
    x.fillStyle = '#170f0a'; x.fillRect(0, 0, S, S);
    x.strokeStyle = '#4a3520'; x.lineWidth = 5; x.strokeRect(2, 2, S - 4, S - 4);
    // 双门
    x.fillStyle = '#2c1c11'; x.fillRect(8, 20, 54, 100); x.fillRect(66, 20, 54, 100);
    x.strokeStyle = '#120b07'; x.lineWidth = 2;
    x.strokeRect(12, 26, 46, 42); x.strokeRect(12, 76, 46, 38);
    x.strokeRect(70, 26, 46, 42); x.strokeRect(70, 76, 46, 38);
    for (let i = 0; i < 2; i++) {
      const px = i ? 70 : 8;
      const g = x.createLinearGradient(px, 0, px + 54, 0);
      g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(.4, 'rgba(120,90,60,.08)'); g.addColorStop(1, 'rgba(0,0,0,.45)');
      x.fillStyle = g; x.fillRect(px, 20, 54, 100);
    }
    // 把手
    x.fillStyle = '#a88a4f';
    x.beginPath(); x.arc(60, 72, 3, 0, 6.28); x.fill();
    x.beginPath(); x.arc(68, 72, 3, 0, 6.28); x.fill();
    // 安全出口灯
    x.fillStyle = 'rgba(20,40,30,.9)'; x.fillRect(30, 4, 68, 15);
    const gg = x.createLinearGradient(0, 4, 0, 19);
    gg.addColorStop(0, 'rgba(120,255,180,.25)'); gg.addColorStop(1, 'rgba(30,120,70,.15)');
    x.fillStyle = gg; x.fillRect(30, 4, 68, 15);
    x.fillStyle = '#9fe3b4'; x.font = 'bold 9px monospace'; x.textAlign = 'center';
    x.fillText('安全出口', 64, 15);
    return tex(c);
  }

  /* ---------------- 地面 / 天花板 ---------------- */
  function texMarble() {
    const S = 128, c = cv(S, S), x = c.getContext('2d'), R = seeded(77);
    for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) {
      const light = (tx + ty) % 2 === 0;
      x.fillStyle = light ? '#6d675b' : '#25231f';
      x.fillRect(tx * 64, ty * 64, 64, 64);
      // 大理石纹
      for (let i = 0; i < 9; i++) {
        x.strokeStyle = light ? `rgba(40,38,34,${.06 + R() * .1})` : `rgba(160,155,142,${.03 + R() * .07})`;
        x.lineWidth = .6 + R();
        x.beginPath();
        let px = tx * 64 + R() * 64, py = ty * 64 + R() * 64;
        x.moveTo(px, py);
        for (let k = 0; k < 5; k++) { px += (R() - .5) * 26; py += (R() - .5) * 16; x.lineTo(px, py); }
        x.stroke();
      }
      x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 1;
      x.strokeRect(tx * 64 + .5, ty * 64 + .5, 63, 63);
    }
    // 污垢
    for (let i = 0; i < 40; i++) {
      const px = R() * S, py = R() * S, r = 2 + R() * 14;
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(12,10,8,${.08 + R() * .12})`); g.addColorStop(1, 'rgba(12,10,8,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 6.28); x.fill();
    }
    return tex(c);
  }

  function texFloorWood() {
    const S = 128, c = cv(S, S), x = c.getContext('2d'), R = seeded(91);
    x.fillStyle = '#24160d'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 8; i++) {
      const py = i * 16;
      const g = x.createLinearGradient(0, py, 0, py + 16);
      g.addColorStop(0, '#3a2414'); g.addColorStop(.5, '#2c1a0f'); g.addColorStop(1, '#1e1109');
      x.fillStyle = g; x.fillRect(0, py, S, 15);
      for (let k = 0; k < 22; k++) {
        x.strokeStyle = `rgba(120,88,54,${.03 + R() * .05})`;
        x.beginPath();
        const yy = py + 2 + R() * 12;
        x.moveTo(0, yy);
        for (let xx = 0; xx < S; xx += 8) x.lineTo(xx, yy + Math.sin(xx * .08 + k) * .8);
        x.stroke();
      }
      x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, py + 15, S, 1);
      // 接缝
      x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect((i * 47) % S, py, 1, 15);
    }
    const vg = x.createRadialGradient(64, 64, 20, 64, 64, 80);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)');
    x.fillStyle = vg; x.fillRect(0, 0, S, S);
    return tex(c);
  }

  function texCarpet() {
    const S = 128, c = cv(S, S), x = c.getContext('2d'), R = seeded(101);
    x.fillStyle = '#3c0d12'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 600; i++) {
      x.fillStyle = `rgba(${90 + R() * 40|0},${20 + R() * 18|0},${24 + R() * 16|0},.14)`;
      x.fillRect(R() * S, R() * S, 1, 2);
    }
    // 金色边饰
    x.strokeStyle = 'rgba(150,116,64,.38)'; x.lineWidth = 2;
    x.strokeRect(9, 9, S - 18, S - 18);
    x.strokeStyle = 'rgba(150,116,64,.18)'; x.lineWidth = 1;
    x.strokeRect(15, 15, S - 30, S - 30);
    // 中央花纹
    x.strokeStyle = 'rgba(150,116,64,.2)';
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * 6.283;
      x.beginPath();
      x.ellipse(64 + Math.cos(a) * 26, 64 + Math.sin(a) * 26, 7, 15, a, 0, 6.283);
      x.stroke();
    }
    // 污渍
    for (let i = 0; i < 12; i++) {
      const px = R() * S, py = R() * S, r = 3 + R() * 16;
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(8,2,3,${.15 + R() * .2})`); g.addColorStop(1, 'rgba(8,2,3,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 6.28); x.fill();
    }
    return tex(c);
  }

  function texCeiling() {
    const S = 128, c = cv(S, S), x = c.getContext('2d'), R = seeded(121);
    x.fillStyle = '#1d1a16'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 900; i++) {
      x.fillStyle = `rgba(${40 + R() * 30|0},${38 + R() * 26|0},${32 + R() * 22|0},.5)`;
      x.fillRect(R() * S, R() * S, 1, 1);
    }
    // 裂缝
    x.strokeStyle = 'rgba(0,0,0,.65)';
    for (let i = 0; i < 4; i++) {
      let px = R() * S, py = R() * S;
      x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 6; k++) { px += (R() - .5) * 24; py += (R() - .5) * 24; x.lineTo(px, py); }
      x.stroke();
    }
    // 渗水
    for (let i = 0; i < 5; i++) {
      const px = R() * S, py = R() * S, r = 6 + R() * 22;
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, 'rgba(20,14,8,.3)'); g.addColorStop(1, 'rgba(20,14,8,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 6.28); x.fill();
    }
    return tex(c);
  }

  /* ---------------- 女鬼绘制 ---------------- */
  function drawBallerina(x, W, H, t, mode, variant) {
    const R = seeded(500 + ((t * 97) | 0) + variant * 31);
    x.clearRect(0, 0, W, H);
    x.save();
    x.scale(W / 240, H / 480);
    const hunt = mode === 'hunt';
    const lunge = mode === 'lunge';
    const broken = variant === 2;
    const sway = Math.sin(t * 6.283) * (hunt ? 3 : 5);
    const breathe = Math.sin(t * 12.566) * 2;
    const tilt = broken ? 1.02 : (variant === 1 ? -0.28 : hunt ? 0.13 : Math.sin(t * 3.14) * 0.09);
    const skinTop = broken ? [154, 150, 144] : (variant === 1 ? [168, 166, 160] : [196, 190, 176]);
    const skinBot = broken ? [62, 62, 60] : (variant === 1 ? [72, 72, 70] : [96, 92, 84]);

    // 幽蓝光晕
    const aura = x.createRadialGradient(120, 250, 8, 120, 250, 128);
    aura.addColorStop(0, variant === 1 ? 'rgba(110,150,150,.20)' : 'rgba(150,185,190,.16)');
    aura.addColorStop(.55, 'rgba(90,140,150,.06)');
    aura.addColorStop(1, 'rgba(60,100,110,0)');
    x.fillStyle = aura; x.fillRect(0, 0, 240, 480);

    // 地面阴影
    const sh = x.createRadialGradient(120, 462, 2, 120, 462, 54);
    sh.addColorStop(0, 'rgba(0,0,0,.6)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = sh; x.beginPath(); x.ellipse(120, 462, 54, 12, 0, 0, 6.28); x.fill();

    // 腿：一条直立，一条轻微提起
    const lift = !hunt && !lunge ? (Math.sin(t * 6.283) * .5 + .5) * 7 : 0;
    const legGrad = x.createLinearGradient(0, 300, 0, 452);
    legGrad.addColorStop(0, rgba(skinTop[0], skinTop[1], skinTop[2], .96));
    legGrad.addColorStop(.55, rgba(skinTop[0] * .7, skinTop[1] * .7, skinTop[2] * .7, .92));
    legGrad.addColorStop(1, rgba(skinBot[0], skinBot[1], skinBot[2], .95));
    x.strokeStyle = legGrad; x.lineCap = 'round';
    x.lineWidth = 12;
    x.beginPath(); x.moveTo(108 + sway * .2, 296); x.lineTo(106, 372); x.lineTo(108, 448); x.stroke();
    x.lineWidth = 11;
    x.beginPath(); x.moveTo(132 + sway * .2, 296); x.lineTo(138, 366 + lift * .4); x.lineTo(136, 440 - lift); x.stroke();
    // 脚尖鞋
    x.fillStyle = variant === 1 ? '#3a1418' : '#5a1a1e';
    x.beginPath(); x.ellipse(108, 452, 7, 12, .05, 0, 6.28); x.fill();
    x.beginPath(); x.ellipse(136 + lift * .05, 446 - lift, 6, 11, -.05, 0, 6.28); x.fill();
    // 缎带
    x.strokeStyle = 'rgba(120,40,40,.55)'; x.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      x.beginPath(); x.moveTo(103, 424 + i * 7); x.lineTo(114, 430 + i * 7); x.stroke();
      x.beginPath(); x.moveTo(131, 418 + i * 7 - lift); x.lineTo(141, 424 + i * 7 - lift); x.stroke();
    }
    // 膝盖与血管
    x.strokeStyle = 'rgba(40,40,36,.22)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(105, 340); x.quadraticCurveTo(112, 346, 106, 352); x.stroke();
    x.beginPath(); x.moveTo(137, 336); x.quadraticCurveTo(131, 342, 137, 349); x.stroke();
    x.strokeStyle = 'rgba(60,42,52,.28)';
    for (let i = 0; i < 5; i++) {
      x.beginPath(); x.moveTo(104 + R() * 4, 308 + i * 16);
      x.quadraticCurveTo(101 + R() * 8, 318 + i * 16, 105 + R() * 3, 328 + i * 16); x.stroke();
    }

    // 芭蕾纱裙：多层破损
    for (let layer = 0; layer < 6; layer++) {
      const rr = 84 - layer * 8;
      const yy = 292 + layer * 4;
      x.beginPath();
      const n = 26;
      for (let i = 0; i <= n; i++) {
        const a = Math.PI + (i / n) * Math.PI;
        const jag = (i % 3 === 0 ? 7 : 2) + R() * 4;
        const ax = 120 + Math.cos(a) * (rr + jag) + sway * .4;
        const ay = yy + Math.sin(a) * 18 + (i % 2 ? 4 : 0);
        if (i === 0) x.moveTo(ax, ay); else x.lineTo(ax, ay);
      }
      x.closePath();
      x.fillStyle = variant === 1
        ? `rgba(${150 - layer * 8},${150 - layer * 8},${146 - layer * 6},${.10 + layer * .055})`
        : `rgba(${214 - layer * 9},${212 - layer * 9},${200 - layer * 10},${.11 + layer * .06})`;
      x.fill();
      x.strokeStyle = `rgba(235,232,220,${.05 + layer * .02})`;
      x.lineWidth = .7; x.stroke();
    }
    // 裙摆血迹
    x.fillStyle = 'rgba(70,8,12,.26)';
    for (let i = 0; i < 7; i++) {
      const px = 60 + R() * 120, py = 300 + R() * 18;
      x.beginPath(); x.ellipse(px, py, 3 + R() * 8, 1.5 + R() * 4, R(), 0, 6.28); x.fill();
    }

    // 躯干
    const torso = x.createLinearGradient(94, 200, 150, 300);
    torso.addColorStop(0, '#151416'); torso.addColorStop(.5, '#242023'); torso.addColorStop(1, '#0d0c0e');
    x.fillStyle = torso;
    x.beginPath();
    x.moveTo(102, 214 + breathe);
    x.quadraticCurveTo(96, 250, 102, 268);
    x.quadraticCurveTo(110, 292, 120, 298);
    x.quadraticCurveTo(130, 292, 138, 268);
    x.quadraticCurveTo(144, 250, 138, 214 + breathe);
    x.closePath(); x.fill();
    // 胸口皮肤
    x.fillStyle = rgba(skinTop[0], skinTop[1], skinTop[2], .93);
    x.beginPath();
    x.moveTo(103, 214 + breathe);
    x.quadraticCurveTo(120, 205 + breathe, 137, 214 + breathe);
    x.lineTo(134, 228 + breathe);
    x.quadraticCurveTo(120, 238 + breathe, 106, 228 + breathe);
    x.closePath(); x.fill();
    // 锁骨
    x.strokeStyle = 'rgba(50,48,42,.45)'; x.lineWidth = 1.1;
    x.beginPath(); x.moveTo(108, 216 + breathe); x.quadraticCurveTo(114, 221 + breathe, 120, 217 + breathe);
    x.quadraticCurveTo(126, 221 + breathe, 133, 216 + breathe); x.stroke();
    // 束腰
    x.strokeStyle = 'rgba(130,120,110,.14)'; x.lineWidth = .8;
    for (let i = 0; i < 6; i++) {
      x.beginPath(); x.moveTo(104, 236 + i * 9); x.quadraticCurveTo(120, 242 + i * 9, 136, 236 + i * 9); x.stroke();
    }
    // 肋骨阴影
    x.strokeStyle = 'rgba(0,0,0,.35)';
    for (let i = 0; i < 4; i++) {
      x.beginPath(); x.moveTo(106, 233 + i * 7); x.quadraticCurveTo(112, 236 + i * 7, 118, 234 + i * 7); x.stroke();
    }
    // 胸前血迹
    x.fillStyle = 'rgba(80,6,10,.4)';
    x.beginPath(); x.ellipse(126, 244, 9, 12, .3, 0, 6.28); x.fill();
    x.beginPath(); x.ellipse(122, 252, 3, 8, .1, 0, 6.28); x.fill();

    // 手臂
    function arm(sx, sy, phase, side) {
      let ex, ey, wx, wy;
      if (lunge) {
        ex = sx + side * 24; ey = sy + 26;
        wx = sx + side * 40; wy = sy + 6;
      } else if (hunt) {
        ex = sx + side * 26; ey = sy + 34;
        wx = sx + side * 22; wy = sy + 92;
      } else {
        const up = side > 0;
        ex = sx + side * (up ? 26 : 22);
        ey = sy + (up ? -34 : 42) + Math.sin(phase) * 6;
        wx = sx + side * (up ? 34 : 40);
        wy = sy + (up ? -78 : 96) + Math.sin(phase + .6) * 5;
      }
      const ag = x.createLinearGradient(sx, sy, wx, wy);
      ag.addColorStop(0, rgba(skinTop[0], skinTop[1], skinTop[2], .98));
      ag.addColorStop(.6, rgba(skinTop[0] * .72, skinTop[1] * .72, skinTop[2] * .72, .95));
      ag.addColorStop(1, rgba(skinBot[0], skinBot[1], skinBot[2], .95));
      x.strokeStyle = ag; x.lineCap = 'round';
      x.lineWidth = 10;
      x.beginPath(); x.moveTo(sx, sy); x.quadraticCurveTo(ex, ey, wx, wy); x.stroke();
      x.lineWidth = 7;
      x.beginPath(); x.moveTo(ex, ey); x.lineTo(wx, wy); x.stroke();
      // 手掌
      x.fillStyle = rgba(skinTop[0] * .82, skinTop[1] * .82, skinTop[2] * .82, .96);
      x.beginPath(); x.ellipse(wx, wy, 5.5, 9, side * .2, 0, 6.28); x.fill();
      // 长手指
      x.strokeStyle = 'rgba(58,56,50,.85)'; x.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const fx = wx + side * (i - 1.5) * 2.4;
        x.beginPath(); x.moveTo(fx, wy + 4);
        x.quadraticCurveTo(fx + side * 6, wy + 12 + i * 2, fx + side * 4, wy + 24 + i * 2.5);
        x.stroke();
      }
      // 指甲
      x.fillStyle = 'rgba(40,30,32,.9)';
      for (let i = 0; i < 4; i++) {
        const fx = wx + side * (i - 1.5) * 2.4 + side * 4;
        x.beginPath(); x.arc(fx, wy + 24 + i * 2.5, 1.1, 0, 6.28); x.fill();
      }
      // 手臂血管
      x.strokeStyle = 'rgba(50,35,48,.25)'; x.lineWidth = .9;
      x.beginPath(); x.moveTo(sx, sy + 6); x.quadraticCurveTo(ex, ey + 4, wx - side * 2, wy); x.stroke();
    }
    const phase = t * 6.283;
    arm(101, 214 + breathe, phase, -1);
    arm(139, 214 + breathe, phase + 2.2, 1);

    // 脖颈
    x.strokeStyle = rgba(skinTop[0] * .9, skinTop[1] * .9, skinTop[2] * .9, .95);
    x.lineWidth = 12; x.lineCap = 'round';
    x.beginPath(); x.moveTo(120, 198 + breathe);
    if (broken) { x.lineTo(134, 188); x.lineTo(138, 178); }
    else x.lineTo(120 + tilt * 10, 176);
    x.stroke();
    if (broken) {
      x.strokeStyle = 'rgba(35,20,24,.65)'; x.lineWidth = 5;
      x.beginPath(); x.moveTo(118, 192); x.lineTo(130, 184); x.stroke();
    }

    // 头部
    x.save();
    x.translate(broken ? 136 : 120, (broken ? 158 : 150) + breathe);
    x.rotate(tilt);
    // 长发（后层）
    x.fillStyle = '#08080a';
    x.beginPath();
    x.moveTo(-24, -16);
    x.quadraticCurveTo(-40, 40, -30, 110);
    x.quadraticCurveTo(-24, 140, -14, 160);
    x.quadraticCurveTo(-4, 130, -6, 90);
    x.quadraticCurveTo(-18, 30, -10, -12);
    x.closePath(); x.fill();
    x.beginPath();
    x.moveTo(24, -16);
    x.quadraticCurveTo(38, 46, 30, 116);
    x.quadraticCurveTo(26, 150, 16, 176);
    x.quadraticCurveTo(6, 140, 8, 96);
    x.quadraticCurveTo(18, 34, 10, -12);
    x.closePath(); x.fill();
    // 脸
    const face = x.createLinearGradient(-20, -24, 20, 30);
    face.addColorStop(0, rgba(skinTop[0], skinTop[1], skinTop[2], .98));
    face.addColorStop(.62, rgba(skinTop[0] * .86, skinTop[1] * .86, skinTop[2] * .86, .98));
    face.addColorStop(1, rgba(skinBot[0], skinBot[1], skinBot[2], .98));
    x.fillStyle = face;
    x.beginPath();
    x.moveTo(-20, -18);
    x.quadraticCurveTo(0, -30, 20, -18);
    x.quadraticCurveTo(26, 6, 18, 22);
    x.quadraticCurveTo(0, 38, -18, 22);
    x.quadraticCurveTo(-26, 6, -20, -18);
    x.fill();
    // 眼窝
    x.fillStyle = '#050506';
    x.beginPath(); x.ellipse(-8, -2, 8.5, 9.5, -.08, 0, 6.28); x.fill();
    x.beginPath(); x.ellipse(9, -2, 8, 9, .1, 0, 6.28); x.fill();
    // 瞳孔微光
    x.fillStyle = 'rgba(190,210,205,.55)';
    x.beginPath(); x.arc(-9, -1, 1.6, 0, 6.28); x.fill();
    x.beginPath(); x.arc(8, -1, 1.4, 0, 6.28); x.fill();
    // 泪痕 / 血泪
    x.strokeStyle = 'rgba(60,10,14,.7)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(-8, 6); x.quadraticCurveTo(-10, 16, -12, 28); x.stroke();
    x.strokeStyle = 'rgba(30,6,8,.55)'; x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(9, 6); x.quadraticCurveTo(12, 14, 13, 22); x.stroke();
    // 鼻
    x.strokeStyle = 'rgba(60,56,50,.35)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(1, 4); x.lineTo(-1, 10); x.lineTo(2, 11); x.stroke();
    // 嘴
    if (lunge || broken) {
      x.fillStyle = '#0a0506';
      x.beginPath(); x.ellipse(1, 20, 10, 14, 0, 0, 6.28); x.fill();
      // 牙
      x.fillStyle = 'rgba(190,182,160,.85)';
      for (let i = 0; i < 5; i++) {
        x.beginPath();
        x.moveTo(-8 + i * 4, 8);
        x.lineTo(-6 + i * 4, 13 + (i % 2) * 2);
        x.lineTo(-4 + i * 4, 8);
        x.fill();
        x.beginPath();
        x.moveTo(-8 + i * 4, 32);
        x.lineTo(-6 + i * 4, 27 - (i % 2) * 2);
        x.lineTo(-4 + i * 4, 32);
        x.fill();
      }
    } else {
      x.strokeStyle = 'rgba(25,8,10,.85)'; x.lineWidth = 2.2;
      x.beginPath(); x.moveTo(-7, 19); x.quadraticCurveTo(0, 22, 7, 19); x.stroke();
      // 缝合线
      x.strokeStyle = 'rgba(80,20,22,.6)'; x.lineWidth = .9;
      for (let i = -3; i <= 3; i++) {
        x.beginPath(); x.moveTo(i * 2.2, 16.5); x.lineTo(i * 2.2 + 1, 22); x.stroke();
      }
    }
    // 面部裂纹
    x.strokeStyle = 'rgba(30,28,24,.5)'; x.lineWidth = .7;
    x.beginPath(); x.moveTo(-18, -12); x.lineTo(-11, -4); x.lineTo(-14, 6); x.stroke();
    x.beginPath(); x.moveTo(16, 9); x.lineTo(10, 14); x.lineTo(14, 22); x.stroke();
    x.strokeStyle = 'rgba(90,84,74,.3)';
    x.beginPath(); x.moveTo(18, -14); x.lineTo(22, -4); x.stroke();
    // 前发
    x.strokeStyle = '#060608'; x.lineWidth = 3.4;
    x.beginPath(); x.moveTo(-20, -20); x.quadraticCurveTo(-6, -26, 4, -22); x.stroke();
    x.lineWidth = 1.6;
    for (let i = 0; i < 9; i++) {
      x.beginPath();
      const sx = -22 + i * 5.6, sy = -20 + Math.sin(i) * 2;
      x.moveTo(sx, sy);
      x.quadraticCurveTo(sx + 3, sy + 18 + (i % 3) * 6, sx - 4 + i * .5, sy + 30 + (i % 4) * 7);
      x.stroke();
    }
    // 头纱（第二形态）
    if (variant === 1) {
      x.fillStyle = 'rgba(10,12,14,.55)';
      x.beginPath();
      x.moveTo(-30, -26); x.quadraticCurveTo(0, -44, 30, -26);
      x.quadraticCurveTo(40, 40, 20, 86);
      x.quadraticCurveTo(0, 70, -20, 86);
      x.quadraticCurveTo(-40, 40, -30, -26);
      x.fill();
      x.strokeStyle = 'rgba(140,150,150,.12)'; x.lineWidth = .8;
      for (let i = 0; i < 12; i++) {
        x.beginPath(); x.moveTo(-28 + i * 5, -30); x.quadraticCurveTo(-36 + i * 6, 30, -22 + i * 4, 86); x.stroke();
      }
    }
    x.restore();

    // 身体污渍 / 胶片颗粒
    for (let i = 0; i < 90; i++) {
      x.fillStyle = `rgba(0,0,0,${R() * .05})`;
      x.fillRect(R() * 240, 120 + R() * 340, 1, 1);
    }
    x.restore();
  }

  function buildGhostFrames() {
    const W = 240, H = 480;
    const sets = { dance: [], hunt: [], lunge: null, veiled: [], broken: [] };
    for (let i = 0; i < 12; i++) {
      const c = cv(W, H);
      drawBallerina(c.getContext('2d'), W, H, i / 12, 'dance', 0);
      sets.dance.push(c);
    }
    for (let i = 0; i < 8; i++) {
      const c = cv(W, H);
      drawBallerina(c.getContext('2d'), W, H, i / 8, 'hunt', 0);
      sets.hunt.push(c);
    }
    for (let i = 0; i < 8; i++) {
      const c = cv(W, H);
      drawBallerina(c.getContext('2d'), W, H, i / 8, i < 4 ? 'dance' : 'hunt', 1);
      sets.veiled.push(c);
    }
    for (let i = 0; i < 8; i++) {
      const c = cv(W, H);
      drawBallerina(c.getContext('2d'), W, H, i / 8, i < 3 ? 'dance' : 'hunt', 2);
      sets.broken.push(c);
    }
    const lc = cv(W, H);
    drawBallerina(lc.getContext('2d'), W, H, .3, 'lunge', 0);
    sets.lunge = lc;
    return sets;
  }

  /* ---------------- 道具 ---------------- */
  function propSeat() {
    const c = cv(180, 220), x = c.getContext('2d'), R = seeded(201);
    // 阴影
    const sh = x.createRadialGradient(90, 210, 2, 90, 210, 60);
    sh.addColorStop(0, 'rgba(0,0,0,.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = sh; x.beginPath(); x.ellipse(90, 210, 60, 12, 0, 0, 6.28); x.fill();
    // 椅背
    const g = x.createLinearGradient(0, 20, 0, 190);
    g.addColorStop(0, '#3e1014'); g.addColorStop(.5, '#5a1a1f'); g.addColorStop(1, '#2a0a0d');
    x.fillStyle = g;
    x.beginPath(); x.roundRect ? x.roundRect(30, 18, 120, 120, 10) : x.rect(30, 18, 120, 120);
    x.fill();
    x.strokeStyle = 'rgba(120,90,60,.35)'; x.lineWidth = 3; x.stroke();
    // 布料高光
    x.strokeStyle = 'rgba(180,110,100,.12)'; x.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      x.beginPath(); x.moveTo(42 + i * 16, 26); x.lineTo(38 + i * 16, 128); x.stroke();
    }
    // 破洞
    x.fillStyle = 'rgba(14,6,6,.7)';
    x.beginPath(); x.ellipse(112, 92, 9, 13, .4, 0, 6.28); x.fill();
    // 坐垫
    const g2 = x.createLinearGradient(0, 130, 0, 180);
    g2.addColorStop(0, '#5c1a1e'); g2.addColorStop(1, '#2b0b0e');
    x.fillStyle = g2;
    x.beginPath(); x.ellipse(90, 158, 58, 22, 0, 0, 6.28); x.fill();
    // 木腿
    x.fillStyle = '#2a170d';
    x.fillRect(44, 176, 7, 36); x.fillRect(129, 176, 7, 36);
    x.fillStyle = 'rgba(120,84,50,.25)';
    x.fillRect(45, 176, 2, 36); x.fillRect(130, 176, 2, 36);
    // 尘
    for (let i = 0; i < 40; i++) {
      x.fillStyle = `rgba(180,160,130,${R() * .08})`;
      x.fillRect(30 + R() * 120, 20 + R() * 160, 1, 1);
    }
    return c;
  }

  function propChandelier() {
    const c = cv(320, 260), x = c.getContext('2d');
    x.strokeStyle = '#2a2118'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(160, 0); x.lineTo(160, 52); x.stroke();
    // 中心
    x.fillStyle = '#181410';
    x.beginPath(); x.ellipse(160, 90, 26, 18, 0, 0, 6.28); x.fill();
    x.strokeStyle = '#6b5433'; x.lineWidth = 2; x.stroke();
    // 枝臂
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const lx = 160 + Math.cos(a) * 118, ly = 96 + Math.sin(a) * 54;
      x.strokeStyle = 'rgba(60,48,32,.9)'; x.lineWidth = 2.4;
      x.beginPath(); x.moveTo(160, 90);
      x.quadraticCurveTo(160 + Math.cos(a) * 70, 70 + Math.sin(a) * 26, lx, ly);
      x.stroke();
      // 蜡烛
      x.fillStyle = 'rgba(210,200,170,.8)';
      x.fillRect(lx - 2, ly - 12, 4, 12);
      const fl = x.createRadialGradient(lx, ly - 17, 0, lx, ly - 17, 12);
      fl.addColorStop(0, 'rgba(255,225,150,.95)');
      fl.addColorStop(.35, 'rgba(240,170,70,.4)');
      fl.addColorStop(1, 'rgba(240,150,60,0)');
      x.fillStyle = fl; x.beginPath(); x.arc(lx, ly - 17, 12, 0, 6.28); x.fill();
      x.fillStyle = 'rgba(255,230,170,.95)';
      x.beginPath(); x.ellipse(lx, ly - 17, 1.8, 4.5, 0, 0, 6.28); x.fill();
    }
    // 水晶垂饰
    x.fillStyle = 'rgba(180,205,210,.25)';
    for (let i = 0; i < 14; i++) {
      const px = 60 + Math.random() * 200, py = 110 + Math.random() * 80;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + 3, py + 12); x.lineTo(px - 3, py + 12); x.fill();
    }
    // 灰尘
    const dust = x.createRadialGradient(160, 120, 10, 160, 120, 150);
    dust.addColorStop(0, 'rgba(200,180,140,.05)'); dust.addColorStop(1, 'rgba(200,180,140,0)');
    x.fillStyle = dust; x.fillRect(0, 0, 320, 260);
    return c;
  }

  function propCandle() {
    const c = cv(80, 160), x = c.getContext('2d');
    // 烛台
    x.fillStyle = '#241a10';
    x.beginPath(); x.ellipse(40, 150, 16, 5, 0, 0, 6.28); x.fill();
    x.fillRect(37, 100, 6, 50);
    x.beginPath(); x.ellipse(40, 100, 12, 4, 0, 0, 6.28); x.fill();
    // 蜡烛
    const g = x.createLinearGradient(30, 60, 50, 60);
    g.addColorStop(0, '#b8ab8c'); g.addColorStop(.5, '#e6d7b4'); g.addColorStop(1, '#9c8e72');
    x.fillStyle = g; x.fillRect(32, 58, 16, 40);
    x.fillStyle = 'rgba(255,240,200,.4)'; x.fillRect(35, 58, 2, 40);
    // 蜡泪
    x.strokeStyle = 'rgba(220,205,170,.7)'; x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(47, 62); x.quadraticCurveTo(49, 72, 47, 80); x.stroke();
    // 火焰光晕
    const fl = x.createRadialGradient(40, 48, 0, 40, 48, 34);
    fl.addColorStop(0, 'rgba(255,235,170,.75)');
    fl.addColorStop(.3, 'rgba(255,190,90,.28)');
    fl.addColorStop(1, 'rgba(255,160,60,0)');
    x.fillStyle = fl; x.beginPath(); x.arc(40, 48, 34, 0, 6.28); x.fill();
    x.fillStyle = 'rgba(255,240,200,.95)';
    x.beginPath(); x.ellipse(40, 48, 4, 11, 0, 0, 6.28); x.fill();
    x.fillStyle = 'rgba(255,180,70,.9)';
    x.beginPath(); x.ellipse(40, 50, 2.2, 7, 0, 0, 6.28); x.fill();
    return c;
  }

  function propMannequin() {
    const c = cv(160, 320), x = c.getContext('2d');
    const sh = x.createRadialGradient(80, 310, 2, 80, 310, 52);
    sh.addColorStop(0, 'rgba(0,0,0,.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = sh; x.beginPath(); x.ellipse(80, 310, 52, 10, 0, 0, 6.28); x.fill();
    // 木质底座
    x.fillStyle = '#24160d';
    x.beginPath(); x.ellipse(80, 300, 34, 9, 0, 0, 6.28); x.fill();
    x.fillRect(77, 210, 6, 90);
    // 人台
    const g = x.createLinearGradient(50, 80, 110, 240);
    g.addColorStop(0, '#6f5a40'); g.addColorStop(.4, '#8d7453'); g.addColorStop(1, '#3a2c1e');
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(80, 70);
    x.quadraticCurveTo(108, 76, 104, 120);
    x.quadraticCurveTo(100, 160, 92, 196);
    x.quadraticCurveTo(80, 212, 68, 196);
    x.quadraticCurveTo(60, 160, 56, 120);
    x.quadraticCurveTo(52, 76, 80, 70);
    x.fill();
    // 颈部断口
    x.fillStyle = '#2c2116';
    x.beginPath(); x.ellipse(80, 72, 14, 5, 0, 0, 6.28); x.fill();
    x.fillStyle = '#5b4630';
    x.beginPath(); x.ellipse(80, 70, 10, 3.4, 0, 0, 6.28); x.fill();
    // 破损纱裙
    x.fillStyle = 'rgba(205,198,180,.34)';
    x.beginPath();
    x.moveTo(56, 150); x.lineTo(104, 150);
    x.lineTo(124, 196); x.lineTo(104, 190); x.lineTo(96, 206);
    x.lineTo(84, 192); x.lineTo(72, 210); x.lineTo(62, 190); x.lineTo(40, 200);
    x.closePath(); x.fill();
    x.strokeStyle = 'rgba(240,235,220,.15)'; x.lineWidth = .8;
    for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(56 + i * 5, 150); x.lineTo(44 + i * 8, 202); x.stroke(); }
    // 尘埃
    x.fillStyle = 'rgba(0,0,0,.28)';
    x.beginPath(); x.ellipse(72, 118, 5, 12, .3, 0, 6.28); x.fill();
    return c;
  }

  function propKey() {
    const c = cv(64, 64), x = c.getContext('2d');
    const glow = x.createRadialGradient(32, 34, 1, 32, 34, 30);
    glow.addColorStop(0, 'rgba(240,200,120,.65)');
    glow.addColorStop(.35, 'rgba(210,160,80,.22)');
    glow.addColorStop(1, 'rgba(200,150,70,0)');
    x.fillStyle = glow; x.fillRect(0, 0, 64, 64);
    x.strokeStyle = '#d6b06a'; x.lineWidth = 3; x.lineCap = 'round';
    x.beginPath(); x.arc(32, 26, 9, 0, 6.28); x.stroke();
    x.beginPath(); x.moveTo(32, 35); x.lineTo(32, 54); x.stroke();
    x.beginPath(); x.moveTo(32, 48); x.lineTo(41, 48); x.stroke();
    x.beginPath(); x.moveTo(32, 54); x.lineTo(39, 54); x.stroke();
    x.strokeStyle = 'rgba(255,230,170,.5)'; x.lineWidth = 1;
    x.beginPath(); x.arc(32, 26, 9, 3.4, 5.6); x.stroke();
    return c;
  }

  function propMannequinWhite() {
    const c = cv(220, 440), x = c.getContext('2d'), R = seeded(407);
    // 地面阴影
    const sh = x.createRadialGradient(110, 428, 2, 110, 428, 66);
    sh.addColorStop(0, 'rgba(0,0,0,.65)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = sh; x.beginPath(); x.ellipse(110, 428, 66, 12, 0, 0, 6.28); x.fill();
    const white = x.createLinearGradient(70, 100, 150, 420);
    white.addColorStop(0, '#f1eee4'); white.addColorStop(.45, '#d8d3c6');
    white.addColorStop(.8, '#a9a499'); white.addColorStop(1, '#6f6b62');
    // 腿
    x.strokeStyle = white; x.lineCap = 'round';
    x.lineWidth = 13;
    x.beginPath(); x.moveTo(100, 300); x.lineTo(98, 366); x.lineTo(101, 420); x.stroke();
    x.lineWidth = 12;
    x.beginPath(); x.moveTo(120, 300); x.lineTo(123, 368); x.lineTo(119, 420); x.stroke();
    // 关节缝
    x.strokeStyle = 'rgba(20,18,16,.8)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(92, 366); x.lineTo(106, 369); x.stroke();
    x.beginPath(); x.moveTo(116, 368); x.lineTo(130, 366); x.stroke();
    // 足尖鞋
    x.fillStyle = '#1b1416';
    x.beginPath(); x.ellipse(101, 427, 7, 11, .05, 0, 6.28); x.fill();
    x.beginPath(); x.ellipse(119, 427, 7, 11, -.05, 0, 6.28); x.fill();
    // 芭蕾纱裙
    for (let layer = 0; layer < 5; layer++) {
      const rr = 80 - layer * 9, yy = 286 + layer * 4;
      x.beginPath();
      for (let i = 0; i <= 24; i++) {
        const a = Math.PI + (i / 24) * Math.PI;
        const jag = (i % 3 === 0 ? 7 : 1) + R() * 4;
        const px = 110 + Math.cos(a) * (rr + jag), py = yy + Math.sin(a) * 18;
        if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      x.closePath();
      x.fillStyle = `rgba(${238 - layer * 7},${236 - layer * 7},${227 - layer * 8},${.12 + layer * .06})`;
      x.fill();
      x.strokeStyle = `rgba(255,255,250,${.06 + layer * .02})`; x.lineWidth = .7; x.stroke();
    }
    // 躯干
    const tg = x.createLinearGradient(86, 195, 140, 300);
    tg.addColorStop(0, '#efebe0'); tg.addColorStop(.55, '#cfc9bb'); tg.addColorStop(1, '#8c877b');
    x.fillStyle = tg;
    x.beginPath();
    x.moveTo(92, 205); x.quadraticCurveTo(84, 250, 95, 272);
    x.quadraticCurveTo(105, 296, 110, 302);
    x.quadraticCurveTo(117, 294, 128, 272);
    x.quadraticCurveTo(138, 248, 130, 205);
    x.closePath(); x.fill();
    // 关节黑缝
    x.strokeStyle = 'rgba(22,19,17,.75)'; x.lineWidth = 1.6;
    x.beginPath(); x.moveTo(90, 252); x.quadraticCurveTo(110, 260, 131, 252); x.stroke();
    x.beginPath(); x.moveTo(96, 278); x.quadraticCurveTo(110, 287, 125, 278); x.stroke();
    // 手臂
    function wArm(sx, sy, ex, ey, wx, wy) {
      x.strokeStyle = white; x.lineCap = 'round';
      x.lineWidth = 10;
      x.beginPath(); x.moveTo(sx, sy); x.quadraticCurveTo(ex, ey, wx, wy); x.stroke();
      x.lineWidth = 7;
      x.beginPath(); x.moveTo(ex, ey); x.lineTo(wx, wy); x.stroke();
      x.fillStyle = '#ded9cc';
      x.beginPath(); x.ellipse(wx, wy, 5, 9, 0, 0, 6.28); x.fill();
      x.strokeStyle = 'rgba(25,22,20,.9)'; x.lineWidth = 1.4;
      for (let i = 0; i < 4; i++) {
        x.beginPath(); x.moveTo(wx + (i - 1.5) * 2.4, wy + 4);
        x.lineTo(wx + (i - 1.5) * 3.4, wy + 20 + i * 2); x.stroke();
      }
    }
    wArm(93, 210, 70, 250, 58, 300);
    wArm(129, 210, 152, 238, 160, 282);
    // 颈
    x.strokeStyle = '#d6d1c4'; x.lineWidth = 11;
    x.beginPath(); x.moveTo(110, 195); x.lineTo(112, 174); x.stroke();
    // 头
    x.save();
    x.translate(112, 150); x.rotate(-.08);
    const fg = x.createLinearGradient(-24, -30, 24, 30);
    fg.addColorStop(0, '#f4f1e8'); fg.addColorStop(.6, '#d9d4c7'); fg.addColorStop(1, '#98938a');
    x.fillStyle = fg;
    x.beginPath();
    x.moveTo(-22, -18); x.quadraticCurveTo(0, -32, 22, -18);
    x.quadraticCurveTo(28, 8, 18, 24); x.quadraticCurveTo(0, 40, -18, 24);
    x.quadraticCurveTo(-28, 8, -22, -18); x.fill();
    // 没有瞳孔的眼窝
    x.fillStyle = 'rgba(25,23,21,.85)';
    x.beginPath(); x.ellipse(-8, 0, 6.4, 5.2, -.08, 0, 6.28); x.fill();
    x.beginPath(); x.ellipse(9, 0, 6.2, 5, .08, 0, 6.28); x.fill();
    // 缝合的嘴
    x.strokeStyle = 'rgba(30,25,23,.75)'; x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(-8, 19); x.quadraticCurveTo(0, 22, 8, 19); x.stroke();
    for (let i = -3; i <= 3; i++) {
      x.beginPath(); x.moveTo(i * 2.4, 16.5); x.lineTo(i * 2.4 + 1, 22); x.stroke();
    }
    // 裂纹
    x.strokeStyle = 'rgba(45,40,35,.5)'; x.lineWidth = .9;
    x.beginPath(); x.moveTo(-20, -12); x.lineTo(-10, -2); x.lineTo(-15, 8); x.stroke();
    x.beginPath(); x.moveTo(18, 10); x.lineTo(10, 16); x.lineTo(15, 26); x.stroke();
    x.restore();
    // 血迹
    x.fillStyle = 'rgba(90,8,12,.55)';
    x.beginPath(); x.ellipse(96, 100, 5, 12, .4, 0, 6.28); x.fill();
    x.beginPath(); x.ellipse(120, 64, 3, 9, -.2, 0, 6.28); x.fill();
    x.beginPath(); x.ellipse(85, 392, 6, 14, .2, 0, 6.28); x.fill();
    x.fillStyle = 'rgba(70,6,9,.4)';
    x.beginPath(); x.ellipse(119, 400, 4, 10, -.3, 0, 6.28); x.fill();
    // 灰尘/污点
    for (let i = 0; i < 80; i++) {
      x.fillStyle = `rgba(20,18,16,${R() * .05})`;
      x.fillRect(R() * 220, 60 + R() * 360, 1, 1);
    }
    return c;
  }

  function propHangingDress() {
    const c = cv(150, 300), x = c.getContext('2d');
    x.strokeStyle = 'rgba(150,140,120,.3)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(75, 0); x.lineTo(75, 22); x.stroke();
    x.fillStyle = '#1a1210';
    x.beginPath(); x.moveTo(58, 20); x.lineTo(92, 20); x.lineTo(86, 46); x.lineTo(64, 46); x.fill();
    // 裙
    const g = x.createLinearGradient(30, 40, 120, 290);
    g.addColorStop(0, 'rgba(185,175,155,.55)');
    g.addColorStop(.45, 'rgba(130,122,108,.5)');
    g.addColorStop(1, 'rgba(60,54,48,.45)');
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(64, 46); x.lineTo(86, 46);
    x.quadraticCurveTo(96, 120, 116, 230);
    x.lineTo(106, 240); x.lineTo(96, 226); x.lineTo(86, 248);
    x.lineTo(76, 228); x.lineTo(66, 250); x.lineTo(56, 226); x.lineTo(44, 242);
    x.lineTo(34, 228);
    x.quadraticCurveTo(54, 120, 64, 46);
    x.fill();
    x.strokeStyle = 'rgba(230,225,210,.12)'; x.lineWidth = .8;
    for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(64 + i * 2, 50); x.lineTo(40 + i * 6, 230); x.stroke(); }
    // 血迹
    x.fillStyle = 'rgba(70,8,10,.35)';
    x.beginPath(); x.ellipse(66, 150, 10, 20, .3, 0, 6.28); x.fill();
    return c;
  }

  function propGramophone() {
    const c = cv(180, 180), x = c.getContext('2d');
    x.fillStyle = '#24160d';
    x.fillRect(30, 120, 120, 50);
    x.fillStyle = '#3a2515'; x.fillRect(34, 124, 112, 42);
    x.fillStyle = '#8a6a3a';
    x.beginPath(); x.ellipse(90, 120, 44, 10, 0, 0, 6.28); x.fill();
    // 唱盘
    x.fillStyle = '#0b0b0c';
    x.beginPath(); x.ellipse(90, 118, 36, 8, 0, 0, 6.28); x.fill();
    // 喇叭
    x.fillStyle = '#5a4327';
    x.beginPath(); x.moveTo(92, 112); x.quadraticCurveTo(124, 70, 148, 30);
    x.quadraticCurveTo(166, 44, 128, 96); x.closePath(); x.fill();
    x.strokeStyle = '#9a7a45'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(92, 112); x.quadraticCurveTo(124, 70, 148, 30); x.stroke();
    x.fillStyle = '#1a120a';
    x.beginPath(); x.ellipse(148, 30, 18, 9, -.7, 0, 6.28); x.fill();
    // 摇柄
    x.strokeStyle = '#7a5c34'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(30, 145); x.lineTo(14, 145); x.lineTo(14, 158); x.stroke();
    return c;
  }

  function propSofa() {
    const c = cv(320, 190), x = c.getContext('2d'), R = seeded(311);
    const sh = x.createRadialGradient(160, 182, 4, 160, 182, 110);
    sh.addColorStop(0, 'rgba(0,0,0,.58)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = sh; x.beginPath(); x.ellipse(160, 182, 118, 16, 0, 0, 6.28); x.fill();
    // 椅背
    const g = x.createLinearGradient(0, 16, 0, 150);
    g.addColorStop(0, '#2b1a1c'); g.addColorStop(.45, '#4a2226'); g.addColorStop(1, '#1b1012');
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(42, 140); x.quadraticCurveTo(34, 38, 80, 24);
    x.quadraticCurveTo(160, 8, 240, 24); x.quadraticCurveTo(286, 38, 278, 140);
    x.closePath(); x.fill();
    x.strokeStyle = 'rgba(150,110,80,.25)'; x.lineWidth = 2; x.stroke();
    // 靠垫分割
    x.strokeStyle = 'rgba(0,0,0,.35)';
    x.beginPath(); x.moveTo(160, 26); x.lineTo(158, 132); x.stroke();
    // 坐垫
    const g2 = x.createLinearGradient(0, 120, 0, 172);
    g2.addColorStop(0, '#54282b'); g2.addColorStop(1, '#241315');
    x.fillStyle = g2;
    x.beginPath(); x.ellipse(160, 146, 112, 28, 0, 0, 6.28); x.fill();
    // 扶手
    x.fillStyle = '#35191c';
    x.beginPath(); x.ellipse(52, 132, 24, 17, -.2, 0, 6.28); x.fill();
    x.beginPath(); x.ellipse(268, 132, 24, 17, .2, 0, 6.28); x.fill();
    // 木脚
    x.fillStyle = '#24140c';
    x.fillRect(58, 164, 8, 22); x.fillRect(254, 164, 8, 22);
    // 磨损
    for (let i = 0; i < 18; i++) {
      x.fillStyle = `rgba(160,120,90,${R() * .08})`;
      x.beginPath(); x.ellipse(60 + R() * 200, 40 + R() * 110, 1 + R() * 7, 1 + R() * 3, R(), 0, 6.28); x.fill();
    }
    return c;
  }

  function propTable() {
    const c = cv(240, 150), x = c.getContext('2d'), R = seeded(317);
    const sh = x.createRadialGradient(120, 142, 2, 120, 142, 82);
    sh.addColorStop(0, 'rgba(0,0,0,.5)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = sh; x.beginPath(); x.ellipse(120, 142, 84, 10, 0, 0, 6.28); x.fill();
    const g = x.createLinearGradient(0, 52, 0, 76);
    g.addColorStop(0, '#5a3a22'); g.addColorStop(.55, '#3a2414'); g.addColorStop(1, '#1e1109');
    x.fillStyle = g;
    x.beginPath(); x.ellipse(120, 62, 94, 19, 0, 0, 6.28); x.fill();
    x.fillStyle = '#24150c';
    x.fillRect(48, 72, 9, 60); x.fillRect(183, 72, 9, 60);
    x.fillStyle = 'rgba(120,90,58,.22)';
    for (let i = 0; i < 8; i++) { x.fillRect(56, 78 + i * 6, 3, 50); }
    // 桌面污渍
    for (let i = 0; i < 4; i++) {
      x.fillStyle = `rgba(15,8,5,${.15 + R() * .2})`;
      x.beginPath(); x.ellipse(60 + R() * 120, 55 + R() * 12, 3 + R() * 8, 1 + R() * 3, R(), 0, 6.28); x.fill();
    }
    return c;
  }

  function propMirror() {
    const c = cv(170, 320), x = c.getContext('2d'), R = seeded(331);
    x.fillStyle = '#140e09';
    x.beginPath();
    x.moveTo(14, 12); x.lineTo(156, 12); x.lineTo(160, 300);
    x.quadraticCurveTo(85, 316, 10, 300); x.closePath(); x.fill();
    x.strokeStyle = '#6f5531'; x.lineWidth = 4;
    x.beginPath();
    x.moveTo(20, 18); x.lineTo(150, 18); x.lineTo(153, 292);
    x.quadraticCurveTo(85, 306, 17, 292); x.closePath(); x.stroke();
    const g = x.createLinearGradient(0, 20, 170, 300);
    g.addColorStop(0, '#202a2e'); g.addColorStop(.4, '#39494d');
    g.addColorStop(.7, '#1a2428'); g.addColorStop(1, '#0d1417');
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(28, 26); x.lineTo(142, 26); x.lineTo(145, 284);
    x.quadraticCurveTo(85, 297, 25, 284); x.closePath(); x.fill();
    // 一个不属于你的影子
    x.save(); x.globalAlpha = .13; x.fillStyle = '#050808';
    x.beginPath(); x.ellipse(92, 122, 16, 22, .05, 0, 6.28); x.fill();
    x.beginPath(); x.moveTo(70, 148); x.quadraticCurveTo(92, 136, 114, 148);
    x.lineTo(122, 270); x.quadraticCurveTo(90, 284, 60, 270); x.closePath(); x.fill();
    x.restore();
    for (let i = 0; i < 3; i++) {
      let px = 30 + R() * 110, py = 40 + R() * 220;
      x.strokeStyle = 'rgba(200,220,220,.18)'; x.lineWidth = .8;
      x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 5; k++) { px += (R() - .5) * 30; py += (R() - .5) * 30; x.lineTo(px, py); }
      x.stroke();
    }
    const vg = x.createRadialGradient(85, 160, 30, 85, 160, 180);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
    x.fillStyle = vg; x.beginPath(); x.ellipse(85, 160, 70, 145, 0, 0, 6.28); x.fill();
    return c;
  }

  /* ---------------- 惊吓特写 ---------------- */
  function buildFace() {
    const S = 900, c = cv(S, S), x = c.getContext('2d'), R = seeded(666);
    x.fillStyle = '#050405'; x.fillRect(0, 0, S, S);
    // 头发背景
    x.strokeStyle = '#020203'; x.lineWidth = 9;
    for (let i = 0; i < 70; i++) {
      x.beginPath();
      const sx = R() * S;
      x.moveTo(sx, -40);
      x.bezierCurveTo(sx + (R() - .5) * 260, 260, sx + (R() - .5) * 340, 560, sx + (R() - .5) * 400, S + 40);
      x.stroke();
    }
    // 脸
    const fg = x.createRadialGradient(450, 380, 40, 450, 420, 440);
    fg.addColorStop(0, '#c9c2b1');
    fg.addColorStop(.45, '#9d9686');
    fg.addColorStop(.78, '#575248');
    fg.addColorStop(1, '#171614');
    x.fillStyle = fg;
    x.beginPath();
    x.moveTo(450, 40);
    x.bezierCurveTo(680, 30, 790, 240, 760, 470);
    x.bezierCurveTo(730, 700, 620, 860, 450, 880);
    x.bezierCurveTo(280, 860, 170, 700, 140, 470);
    x.bezierCurveTo(110, 240, 220, 30, 450, 40);
    x.fill();
    // 皮肤纹理
    for (let i = 0; i < 2600; i++) {
      const px = 160 + R() * 580, py = 60 + R() * 800;
      x.fillStyle = `rgba(${R() > .5 ? 40 : 220},${R() > .5 ? 38 : 214},${R() > .5 ? 34 : 200},${R() * .04})`;
      x.fillRect(px, py, 1.5, 1.5);
    }
    // 裂纹
    for (let i = 0; i < 9; i++) {
      let px = 220 + R() * 460, py = 100 + R() * 500;
      x.strokeStyle = `rgba(20,18,16,${.25 + R() * .35})`;
      x.lineWidth = 1 + R() * 2;
      x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 8; k++) {
        px += (R() - .5) * 60; py += R() * 42;
        x.lineTo(px, py);
        if (R() > .6) { x.lineTo(px + (R() - .5) * 40, py + R() * 40); x.moveTo(px, py); }
      }
      x.stroke();
    }
    // 左眼窝（大）
    x.fillStyle = '#020203';
    x.beginPath(); x.ellipse(325, 350, 92, 74, -.08, 0, 6.28); x.fill();
    x.strokeStyle = 'rgba(20,10,10,.8)'; x.lineWidth = 5;
    x.beginPath(); x.ellipse(325, 350, 100, 82, -.08, 0, 6.28); x.stroke();
    // 眼球
    const eg = x.createRadialGradient(328, 356, 4, 328, 356, 52);
    eg.addColorStop(0, '#ded7bf'); eg.addColorStop(.55, '#9c9380'); eg.addColorStop(1, '#3c3a32');
    x.fillStyle = eg; x.beginPath(); x.arc(328, 356, 46, 0, 6.28); x.fill();
    x.fillStyle = '#1b201d'; x.beginPath(); x.arc(332, 358, 22, 0, 6.28); x.fill();
    x.fillStyle = '#050505'; x.beginPath(); x.arc(333, 359, 9, 0, 6.28); x.fill();
    x.fillStyle = 'rgba(250,250,240,.9)'; x.beginPath(); x.arc(318, 342, 4, 0, 6.28); x.fill();
    // 血丝
    x.strokeStyle = 'rgba(120,20,16,.5)'; x.lineWidth = 1.4;
    for (let i = 0; i < 7; i++) {
      const a = R() * 6.28;
      x.beginPath(); x.moveTo(328 + Math.cos(a) * 16, 356 + Math.sin(a) * 16);
      x.quadraticCurveTo(328 + Math.cos(a) * 34, 356 + Math.sin(a) * 34, 328 + Math.cos(a) * 44, 356 + Math.sin(a) * 44);
      x.stroke();
    }
    // 右眼（被头发半遮）
    x.fillStyle = '#030304';
    x.beginPath(); x.ellipse(600, 320, 62, 52, .12, 0, 6.28); x.fill();
    x.fillStyle = 'rgba(200,195,175,.35)';
    x.beginPath(); x.arc(606, 326, 17, 0, 6.28); x.fill();
    // 血泪
    const blood = x.createLinearGradient(0, 380, 0, 720);
    blood.addColorStop(0, 'rgba(110,14,14,.9)');
    blood.addColorStop(1, 'rgba(50,4,4,.2)');
    x.fillStyle = blood;
    x.beginPath();
    x.moveTo(330, 400); x.quadraticCurveTo(300, 560, 322, 720);
    x.quadraticCurveTo(344, 760, 350, 700);
    x.quadraticCurveTo(360, 540, 352, 402);
    x.fill();
    x.beginPath();
    x.moveTo(600, 360); x.quadraticCurveTo(590, 470, 606, 560);
    x.quadraticCurveTo(620, 500, 616, 362); x.fill();
    // 嘴：巨大张开的黑洞
    x.fillStyle = '#070203';
    x.beginPath();
    x.moveTo(300, 610);
    x.bezierCurveTo(380, 560, 520, 560, 600, 620);
    x.bezierCurveTo(560, 800, 360, 810, 300, 610);
    x.fill();
    x.strokeStyle = 'rgba(60,16,16,.8)'; x.lineWidth = 6;
    x.beginPath(); x.moveTo(300, 610); x.bezierCurveTo(380, 560, 520, 560, 600, 620); x.stroke();
    // 牙
    x.fillStyle = 'rgba(190,180,155,.88)';
    for (let i = 0; i < 9; i++) {
      const px = 320 + i * 32;
      x.beginPath(); x.moveTo(px, 592 + Math.sin(i) * 6); x.lineTo(px + 13, 640 + (i % 2) * 8); x.lineTo(px + 26, 596); x.fill();
      x.beginPath(); x.moveTo(px + 4, 742 - (i % 2) * 8); x.lineTo(px + 15, 700); x.lineTo(px + 24, 744); x.fill();
    }
    // 嘴角血
    x.fillStyle = 'rgba(90,8,10,.7)';
    x.beginPath(); x.moveTo(300, 610); x.quadraticCurveTo(260, 700, 286, 760); x.quadraticCurveTo(300, 690, 316, 630); x.fill();
    x.beginPath(); x.moveTo(600, 620); x.quadraticCurveTo(640, 700, 610, 790); x.quadraticCurveTo(596, 700, 584, 630); x.fill();
    // 前发
    x.strokeStyle = 'rgba(5,5,6,.9)'; x.lineWidth = 7;
    for (let i = 0; i < 26; i++) {
      const sx = 170 + R() * 560;
      x.beginPath(); x.moveTo(sx, -20);
      x.bezierCurveTo(sx + (R() - .5) * 200, 240, sx + (R() - .5) * 260, 520, sx + (R() - .5) * 300, 880);
      x.stroke();
    }
    // 暗角
    const vg = x.createRadialGradient(450, 420, 160, 450, 420, 620);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(.75, 'rgba(0,0,0,.55)'); vg.addColorStop(1, '#000');
    x.fillStyle = vg; x.fillRect(0, 0, S, S);
    // 故障条
    for (let i = 0; i < 22; i++) {
      const py = R() * S, h = 1 + R() * 10;
      x.fillStyle = `rgba(${R() > .5 ? 200 : 10},${R() > .5 ? 20 : 10},${R() > .5 ? 20 : 30},${R() * .18})`;
      x.fillRect(0, py, S, h);
    }
    return c;
  }

  function buildBlood() {
    const W = 900, H = 1500, c = cv(W, H), x = c.getContext('2d'), R = seeded(999);
    x.clearRect(0, 0, W, H);
    // 边缘溅射
    for (let side = 0; side < 4; side++) {
      for (let i = 0; i < 26; i++) {
        const along = R();
        let px, py;
        if (side === 0) { px = along * W; py = R() * 160; }
        else if (side === 1) { px = along * W; py = H - R() * 200; }
        else if (side === 2) { px = R() * 150; py = along * H; }
        else { px = W - R() * 170; py = along * H; }
        const r = 4 + R() * 46;
        const g = x.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, `rgba(${90 + R() * 40|0},6,8,${.45 + R() * .4})`);
        g.addColorStop(.7, 'rgba(80,4,6,.28)');
        g.addColorStop(1, 'rgba(70,2,4,0)');
        x.fillStyle = g;
        x.beginPath(); x.arc(px, py, r, 0, 6.28); x.fill();
        // 流淌
        if (R() > .55) {
          x.strokeStyle = 'rgba(90,6,8,.5)';
          x.lineWidth = 2 + R() * 6;
          x.beginPath(); x.moveTo(px, py);
          x.quadraticCurveTo(px + (R() - .5) * 20, py + (side < 2 ? (1 - side * 2) * 120 : 60), px + (R() - .5) * 16, py + (side < 2 ? (1 - side * 2) * (180 + R() * 240) : 150));
          x.stroke();
        }
      }
    }
    // 颗粒
    for (let i = 0; i < 420; i++) {
      x.fillStyle = `rgba(110,10,10,${R() * .35})`;
      x.beginPath(); x.arc(R() * W, R() * H, .5 + R() * 2.4, 0, 6.28); x.fill();
    }
    return c;
  }

  function buildGrain() {
    const S = 160, c = cv(S, S), x = c.getContext('2d');
    const d = x.createImageData(S, S);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.random() * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 22 + Math.random() * 26;
    }
    x.putImageData(d, 0, 0);
    return c.toDataURL('image/png');
  }

  let data = null;

  function build() {
    if (data) return data;
    const t0 = performance.now();
    data = {
      walls: [texWallpaper(), texWood(), texMirror(), texCurtain(), texExit()],
      floors: [texMarble(), texFloorWood(), texCarpet()],
      ceil: texCeiling(),
      ghosts: buildGhostFrames(),
      props: {
        seat: propSeat(), chandelier: propChandelier(), candle: propCandle(),
        mannequin: propMannequin(), key: propKey(), dress: propHangingDress(),
        mannequinWhite: propMannequinWhite(),
        gramophone: propGramophone(), sofa: propSofa(), table: propTable(), mirror: propMirror()
      },
      face: buildFace(),
      blood: buildBlood(),
      grain: buildGrain()
    };
    data.buildMs = performance.now() - t0;
    return data;
  }

  function paintMenuGhost(canvas) {
    const x = canvas.getContext('2d');
    drawBallerina(x, canvas.width, canvas.height, .18, 'dance', 0);
  }

  return { build, paintMenuGhost, drawBallerina };
})();
