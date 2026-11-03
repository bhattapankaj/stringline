/*
  Sound engine. Short samples from Kenney's CC0 packs (assets/sfx) plus two synths:
  the stringline twang (plucked string) and Donnie's head boing (a wobbling spring).

  iPhone notes:
  - Audio only starts inside a real tap, so unlock() runs on every gesture until it is running.
  - navigator.audioSession lets sound play with the ring switch on silent (Safari 17+).
  - Home Screen apps can lose their audio context after a while; it is rebuilt when that happens.
*/
(function (root) {
  const NS = root.STRINGLINE = root.STRINGLINE || {};
  const FILES = ["tap", "back", "toggle", "pickup", "snap", "lay1", "lay2", "lay3", "lay4", "grit1", "grit2", "grit3",
    "course", "wrong", "locked", "hint", "hold", "undo", "restart", "star", "win", "win-big", "stuck", "bong"];

  let ctx = null;
  let master = null;
  let raw = {};
  let buffers = {};
  let decoding = null;
  let silentOk = true;

  function Ctor() { return root.AudioContext || root.webkitAudioContext; }

  // Fetch the files right away; decode once there is a context.
  const fetched = Promise.all(FILES.map(function (name) {
    return fetch("./assets/sfx/" + name + ".wav")
      .then(function (r) { return r.ok ? r.arrayBuffer() : null; })
      .then(function (ab) { if (ab) raw[name] = ab; })
      .catch(function () {});
  }));

  function setSession() {
    try {
      if (navigator.audioSession) navigator.audioSession.type = silentOk ? "playback" : "ambient";
    } catch (e) {}
  }

  function build() {
    const C = Ctor();
    if (!C) return null;
    try { if (ctx && ctx.close) ctx.close(); } catch (e) {}
    setSession();
    ctx = new C({ latencyHint: "interactive" });
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.knee.value = 6;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(limiter);
    limiter.connect(ctx.destination);
    buffers = {};
    decoding = fetched.then(function () {
      return Promise.all(Object.keys(raw).map(function (name) {
        return new Promise(function (done) {
          // decodeAudioData detaches its input, so decode a copy and keep the original for rebuilds.
          const copy = raw[name].slice(0);
          const onOk = function (b) { buffers[name] = b; done(); };
          const p = ctx.decodeAudioData(copy, onOk, function () { done(); });
          if (p && p.then) p.then(onOk, function () { done(); });
        });
      }));
    });
    return ctx;
  }

  // Call inside every user gesture. Cheap when already running.
  function unlock() {
    if (!ctx || ctx.state === "closed") build();
    if (!ctx) return;
    if (ctx.state === "interrupted") build();
    if (ctx.state !== "running") {
      try { ctx.resume(); } catch (e) {}
      // A silent buffer played inside the gesture is what finally wakes iOS.
      try {
        const b = ctx.createBuffer(1, 1, 22050);
        const s = ctx.createBufferSource();
        s.buffer = b;
        s.connect(ctx.destination);
        s.start(0);
      } catch (e) {}
    }
  }

  function ready() { return ctx && ctx.state === "running"; }

  function play(name, opts) {
    if (!ready()) return;
    const buf = buffers[name];
    if (!buf) return;
    const o = opts || {};
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = o.rate || 1;
    const g = ctx.createGain();
    g.gain.value = o.gain == null ? 1 : o.gain;
    src.connect(g);
    g.connect(master);
    src.start(ctx.currentTime + (o.delay || 0));
  }

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function jitter(amount) { return 1 + (Math.random() * 2 - 1) * amount; }

  // Plucked string (Karplus-Strong): the mason's line snapping tight.
  function twang(gain) {
    if (!ready()) return;
    const sr = ctx.sampleRate;
    const dur = 1.1;
    const freq = 196 * jitter(0.02);
    const period = Math.round(sr / freq);
    const n = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    const ring = new Float32Array(period);
    for (let i = 0; i < period; i += 1) ring[i] = Math.random() * 2 - 1;
    let idx = 0;
    for (let i = 0; i < n; i += 1) {
      const next = (idx + 1) % period;
      const v = (ring[idx] + ring[next]) * 0.4985;
      d[i] = ring[idx];
      ring[idx] = v;
      idx = next;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    // Slight bend down, like a line settling after it is plucked.
    src.playbackRate.setValueAtTime(1.03, ctx.currentTime);
    src.playbackRate.exponentialRampToValueAtTime(1, ctx.currentTime + 0.25);
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 3200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain == null ? 0.55 : gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    src.connect(tone);
    tone.connect(g);
    g.connect(master);
    src.start();
  }

  // Cartoon spring boing that matches the bobblehead wobble.
  function boing(power) {
    if (!ready()) return;
    const p = Math.max(0.5, Math.min(1.5, power || 1));
    const t = ctx.currentTime;
    const dur = 0.55 + 0.2 * p;
    const steps = 96;
    const curve = new Float32Array(steps);
    const base = 150 * jitter(0.06);
    for (let i = 0; i < steps; i += 1) {
      const x = i / (steps - 1);
      const wob = Math.sin(x * Math.PI * 2 * (7 + 3 * p)) * Math.exp(-x * 3.2) * 0.42 * p;
      curve[i] = base * (1 + 0.55 * x) * (1 + wob);
    }
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueCurveAtTime(curve, t, dur);
    const sub = ctx.createOscillator();
    sub.type = "sine";
    const subCurve = curve.map(function (v) { return v / 2; });
    sub.frequency.setValueCurveAtTime(subCurve, t, dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const sg = ctx.createGain();
    sg.gain.value = 0.6;
    osc.connect(g);
    sub.connect(sg);
    sg.connect(g);
    g.connect(master);
    osc.start(t);
    sub.start(t);
    osc.stop(t + dur + 0.05);
    sub.stop(t + dur + 0.05);
  }

  NS.audio = {
    unlock: unlock,
    ready: ready,
    play: play,
    twang: twang,
    boing: boing,
    setSilentOk: function (on) { silentOk = !!on; setSession(); },
    hasSessionApi: function () { return !!navigator.audioSession; },
    suspend: function () { try { if (ctx && ctx.state === "running") ctx.suspend(); } catch (e) {} },
    // Named effects used by the game.
    lay: function () {
      play(pick(["lay1", "lay2", "lay3", "lay4"]), { gain: 0.95, rate: jitter(0.06) });
      play(pick(["grit1", "grit2", "grit3"]), { gain: 0.55, rate: jitter(0.08), delay: 0.006 });
    },
    stars: function (n) {
      for (let i = 0; i < n; i += 1) play("star", { gain: 0.8, rate: [1, 1.19, 1.41][i], delay: 0.25 + i * 0.15 });
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
