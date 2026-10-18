/* 全程序化音频：无外部素材，离线可用 */
const Sound = (() => {
  let ctx = null;
  let master = null;
  let reverb = null;
  let amb = null;
  let noiseBuf = null;
  let muted = false;
  let started = false;
  let boxOn = false;
  let nextBox = 0;
  let boxStep = 0;
  let heartNext = 0;
  let lastWhisper = 0;

  const MELODY = [
    587.33, 698.46, 880.00, 783.99, 587.33, 523.25, 440.00, 0,
    523.25, 587.33, 698.46, 587.33, 466.16, 440.00, 392.00, 0,
    587.33, 698.46, 880.00, 1046.50, 880.00, 783.99, 698.46, 0,
    659.25, 587.33, 523.25, 466.16, 440.00, 415.30, 392.00, 0
  ];

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.72;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 22;
    comp.ratio.value = 4;
    comp.attack.value = 0.006;
    comp.release.value = 0.28;
    master.connect(comp).connect(ctx.destination);

    // 生成一段短混响，把八音盒和尖叫推远
    const len = Math.floor(ctx.sampleRate * 2.6);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.4) * 0.55;
      }
    }
    reverb = ctx.createConvolver();
    reverb.buffer = ir;
    const rg = ctx.createGain();
    rg.gain.value = 0.55;
    reverb.connect(rg).connect(master);

    // 白噪声底
    const nlen = Math.floor(ctx.sampleRate * 2);
    noiseBuf = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;
    started = true;
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  function setMuted(m) {
    muted = !!m;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.72, now(), 0.1);
  }

  function toReverb(node, amt) {
    if (!reverb) return;
    const g = ctx.createGain();
    g.gain.value = amt;
    node.connect(g).connect(reverb);
  }

  function startAmbience() {
    if (!ctx || amb) return;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(0.055, now(), 2.5);
    g.connect(master);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 170;
    lp.Q.value = 1.4;
    lp.connect(g);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator();
    o1.type = 'sawtooth'; o1.frequency.value = 55;
    o2.type = 'sine'; o2.frequency.value = 82.4; o2.detune.value = 7;
    o3.type = 'sine'; o3.frequency.value = 27.5; o3.detune.value = -9;
    const g3 = ctx.createGain(); g3.gain.value = 0.32; o3.connect(g3).connect(lp);
    o1.connect(lp); o2.connect(lp);
    // 极轻的耳压高频
    const hi = ctx.createOscillator(), hg = ctx.createGain(), hf = ctx.createBiquadFilter();
    hi.type = 'sine'; hi.frequency.value = 1180;
    hf.type = 'bandpass'; hf.frequency.value = 1180; hf.Q.value = 14;
    hg.gain.value = 0.004;
    hi.connect(hf).connect(hg).connect(master);
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
    lfo.frequency.value = 0.06; lfoG.gain.value = 11;
    lfo.connect(lfoG).connect(hi.frequency);
    // 房间空气噪声
    const ns = ctx.createBufferSource(); ns.buffer = noiseBuf; ns.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 320; nf.Q.value = 0.7;
    const ng = ctx.createGain(); ng.gain.value = 0.018;
    ns.connect(nf).connect(ng).connect(g);
    [o1, o2, o3, hi, lfo, ns].forEach(n => n.start());
    amb = { g, osc: [o1, o2, o3], hi, lfo };
  }

  function stopAmbience() {
    if (!amb) return;
    const a = amb; amb = null;
    a.g.gain.setTargetAtTime(0, now(), 0.8);
    setTimeout(() => { try { a.osc.forEach(o => o.stop()); a.hi.stop(); a.lfo.stop(); } catch (e) {} }, 2600);
  }

  function heartbeat(rate) {
    if (!ctx || muted) return;
    const t = now();
    if (t < heartNext) return;
    heartNext = t + Math.max(0.36, 1.15 - rate * 0.7);
    thump(0, 0.85 + rate * 0.25);
    thump(0.17, 0.55 + rate * 0.16);
    if (rate > 0.85) thump(0.3, 0.3);
  }

  function thump(delay, amp) {
    const t = now() + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(62, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.16);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16 * amp, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.26);
  }

  function whisper() {
    if (!ctx || muted) return;
    const t = now();
    if (t - lastWhisper < 1.7) return;
    lastWhisper = t;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.6;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
    const f = 700 + Math.random() * 1300;
    bp.frequency.setValueAtTime(f, t);
    bp.frequency.linearRampToValueAtTime(f * (0.5 + Math.random()), t + 0.9);
    bp.Q.value = 9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; src.connect(bp).connect(g).connect(pan).connect(master); }
    else src.connect(bp).connect(g).connect(master);
    toReverb(g, 0.5);
    src.start(t); src.stop(t + 1.05);
  }

  function sting() {
    if (!ctx || muted) return;
    const t = now();
    // 高频噪声尖刺
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    s.connect(hp).connect(g).connect(master);
    toReverb(g, 0.7);
    s.start(t); s.stop(t + 0.75);
    // 下行弦音
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(880 - i * 140, t);
      o.frequency.exponentialRampToValueAtTime(110, t + 1.0);
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.035, t + 0.02);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
      o.connect(lp).connect(og).connect(master);
      o.start(t); o.stop(t + 1.15);
    }
  }

  function scream() {
    if (!ctx) return;
    const t = now();
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    const ws = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = i / 512 - 1;
      curve[i] = Math.tanh(x * 3.5);
    }
    ws.curve = curve;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400;
    ws.connect(lp).connect(g).connect(master);
    toReverb(g, 0.8);
    [1, 1.5, 2.02, 2.51].forEach((m, i) => {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = i === 0 ? 'sawtooth' : 'square';
      o.frequency.setValueAtTime(740 * m, t);
      o.frequency.exponentialRampToValueAtTime(220 * m * 0.6, t + 1.6);
      og.gain.value = 0.09 / (i + 1);
      o.connect(og).connect(ws);
      o.start(t); o.stop(t + 1.85);
    });
    const n = ctx.createBufferSource(); n.buffer = noiseBuf;
    const ng = ctx.createGain(); ng.gain.value = 0.28;
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1600; nf.Q.value = 0.6;
    n.connect(nf).connect(ng).connect(g);
    n.start(t); n.stop(t + 1.4);
  }

  function step(hard) {
    if (!ctx || muted) return;
    const t = now();
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    s.playbackRate.value = 0.55 + Math.random() * 0.25;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = hard ? 420 : 250;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(hard ? 0.13 : 0.06, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    s.connect(lp).connect(g).connect(master);
    s.start(t); s.stop(t + 0.2);
  }

  function breath(inhale) {
    if (!ctx || muted) return;
    const t = now();
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.setValueAtTime(inhale ? 520 : 780, t);
    bp.frequency.linearRampToValueAtTime(inhale ? 900 : 380, t + 0.7);
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.14);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    s.connect(bp).connect(g).connect(master);
    s.start(t); s.stop(t + 0.85);
  }

  function pickup() {
    if (!ctx || muted) return;
    const t = now();
    [880, 1318.5, 1760].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.09, t + i * 0.06 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.06 + 0.9);
      o.connect(g).connect(master);
      toReverb(g, 0.7);
      o.start(t + i * 0.06); o.stop(t + i * 0.06 + 1);
    });
  }

  function unlock() {
    if (!ctx || muted) return;
    const t = now();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(196, t);
    o.frequency.exponentialRampToValueAtTime(392, t + 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.1, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    o.connect(g).connect(master);
    toReverb(g, 0.9);
    o.start(t); o.stop(t + 2.5);
    // 门轴
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(300, t);
    bp.frequency.linearRampToValueAtTime(900, t + 1.4); bp.Q.value = 6;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.06, t + 0.2);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    s.connect(bp).connect(ng).connect(master);
    s.start(t); s.stop(t + 1.7);
  }

  function musicBox(on) {
    boxOn = !!on;
  }

  function tick() {
    if (!ctx || !boxOn || muted) return;
    const t = now();
    if (nextBox < t) nextBox = t + 0.05;
    while (nextBox < t + 0.35) {
      const f = MELODY[boxStep % MELODY.length];
      if (f > 0) note(f, nextBox);
      nextBox += 0.42;
      boxStep++;
    }
  }

  function note(freq, t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq * (1 + (Math.random() - 0.5) * 0.006);
    const o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.type = 'triangle';
    o2.frequency.value = freq * 2.01;
    g2.gain.value = 0.22;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.075, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    o.connect(g); o2.connect(g2).connect(g);
    g.connect(master);
    toReverb(g, 0.75);
    o.start(t); o.stop(t + 1.6);
    o2.start(t); o2.stop(t + 1.6);
  }

  function glass() {
    if (!ctx || muted) return;
    const t = now();
    for (let i = 0; i < 7; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 1600 + Math.random() * 3600;
      const st = t + Math.random() * 0.25;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.03, st + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.5 + Math.random() * 0.6);
      o.connect(g).connect(master);
      toReverb(g, 0.8);
      o.start(st); o.stop(st + 1.2);
    }
  }

  function heel(pan, vol) {
    if (!ctx || muted) return;
    const t = now();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(1350, t);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.07);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.035 * (vol || 1), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    let out = g;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = clampPan(pan);
      g.connect(p); out = p;
    }
    o.connect(g);
    out.connect(master);
    if (reverb) { const rg = ctx.createGain(); rg.gain.value = 0.22; out.connect(rg).connect(reverb); }
    o.start(t); o.stop(t + 0.14);
  }

  function clampPan(p) { return !p ? 0 : (p < -1 ? -1 : (p > 1 ? 1 : p)); }

  return {
    init, setMuted, startAmbience, stopAmbience, heartbeat, whisper, sting, scream,
    step, breath, pickup, unlock, musicBox, tick, glass,
    heel,
    get ready() { return !!ctx; },
    get muted() { return muted; },
    get time() { return now(); }
  };
})();
