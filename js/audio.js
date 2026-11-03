(function () {
  let ctx = null;

  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function beep(freq, dur, type, gain, when) {
    const c = ac();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain || 0.04, c.currentTime + (when || 0));
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + (when || 0) + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(c.currentTime + (when || 0));
    o.stop(c.currentTime + (when || 0) + dur + 0.02);
  }

  function noise(dur, gain) {
    const c = ac();
    if (!c) return;
    const n = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = c.createBufferSource();
    const g = c.createGain();
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 680;
    s.buffer = n;
    g.gain.value = gain || 0.05;
    s.connect(f);
    f.connect(g);
    g.connect(c.destination);
    s.start();
  }

  window.STRINGLINE = window.STRINGLINE || {};
  window.STRINGLINE.audio = {
    unlock: function () { ac(); },
    lay: function () {
      noise(0.09, 0.045);
      beep(92, 0.08, "sine", 0.05);
    },
    deny: function () {
      beep(140, 0.09, "square", 0.03);
      beep(90, 0.12, "square", 0.03, 0.05);
    },
    hold: function () { beep(210, 0.05, "triangle", 0.03); },
    twang: function () {
      beep(440, 0.07, "triangle", 0.035);
      beep(660, 0.1, "triangle", 0.025, 0.05);
    },
    win: function () {
      beep(392, 0.1, "triangle", 0.04);
      beep(494, 0.1, "triangle", 0.04, 0.09);
      beep(587, 0.16, "triangle", 0.045, 0.18);
    },
    fail: function () {
      beep(196, 0.14, "sawtooth", 0.03);
      beep(130, 0.2, "sawtooth", 0.03, 0.1);
    },
    tap: function () { beep(240, 0.03, "square", 0.02); }
  };
})();
