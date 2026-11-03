(function () {
  const NS = window.STRINGLINE;
  const LEVELS = NS.LEVELS;
  const CHAPTERS = NS.CHAPTERS;
  const Engine = NS.Engine;
  const audio = NS.audio;
  const KEY = "stringline-v2";
  const SVGNS = "http://www.w3.org/2000/svg";

  const $ = function (id) { return document.getElementById(id); };
  const phone = $("phone");

  const C = {
    ink: "#1F2A44",
    brick: "#C4502F",
    brickDk: "#86331F",
    mortar: "#E2D8C6",
    mortarLine: "#CDBFA8",
    mortarDk: "#B9AA92",
    hole: "#2B3A5C",
    holeHi: "#3B4D73",
    old: "#9A8F80",
    oldDk: "#6F6558",
    line: "#FFC83D",
    lineDk: "#C98A0B",
    go: "#5BC236",
    bad: "#E5533D",
    slab: "#B8B1A5",
    slabDk: "#8E877B",
    grass: "#74C043",
    grassDk: "#4C9530"
  };

  /* ---------- Save ---------- */

  const save = loadSave();

  function loadSave() {
    const base = { stars: {}, sfx: true, haptics: true, silentOk: true, seenIntro: false };
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(base, JSON.parse(raw));
      const old = localStorage.getItem("stringline-v1");
      if (old) {
        const o = JSON.parse(old);
        base.sfx = o.sfx !== false;
        base.haptics = o.haptics !== false;
      }
    } catch (e) {}
    return base;
  }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {}
  }

  function totalStars() {
    let n = 0;
    Object.keys(save.stars).forEach(function (k) { n += save.stars[k]; });
    return n;
  }

  function doneCount() { return Object.keys(save.stars).length; }

  function unlocked() {
    let max = 1;
    LEVELS.forEach(function (lv) { if (save.stars[lv.id]) max = Math.max(max, lv.id + 1); });
    return Math.min(max, LEVELS.length);
  }

  function chapterOf(id) {
    return CHAPTERS.find(function (c) { return id >= c.from && id <= c.to; }) || CHAPTERS[0];
  }

  /* ---------- Sound + haptics ---------- */

  const haptics = NS.haptics;
  // One table for every moment in the game: which sound, how loud, which vibration pattern.
  const FX = {
    tap: { s: "tap", g: 0.7, h: 8 },
    back: { s: "back", g: 0.85, h: 8 },
    putback: { s: "back", g: 0.45, rate: 0.85, h: 6 },
    toggle: { s: "toggle", g: 0.8, h: 10 },
    pickup: { s: "pickup", g: 0.55, h: 6 },
    snap: { s: "snap", g: 0.35, h: 4 },
    lay: { fn: "lay", h: 14 },
    course: { s: "course", g: 0.65, twang: true, h: [12, 50, 24] },
    wrong: { s: "wrong", g: 0.9, h: [28, 40, 28] },
    locked: { s: "locked", g: 0.8, h: [20, 30, 20] },
    hint: { s: "hint", g: 0.8, h: [10, 30, 10] },
    hold: { s: "hold", g: 0.8, h: 12 },
    undo: { s: "undo", g: 0.7, h: 10 },
    restart: { s: "restart", g: 0.7, h: 12 },
    win: { s: "win", g: 0.9, h: [20, 60, 20, 60, 60] },
    winBig: { s: "win-big", g: 0.85, h: [20, 60, 20, 60, 20, 60, 90] },
    stuck: { s: "stuck", g: 0.85, h: [40, 60, 40] },
    donnie: { boing: true, h: [10, 30, 10, 30, 10] }
  };

  function fx(name, opts) {
    const f = FX[name];
    if (!f) return;
    const o = opts || {};
    if (save.sfx && audio) {
      if (f.s) audio.play(f.s, { gain: f.g, rate: o.rate || f.rate });
      if (f.fn) audio[f.fn]();
      if (f.twang) audio.twang();
      if (f.boing) {
        audio.boing(o.power);
        audio.play("bong", { gain: 0.3, rate: 1.5 });
      }
    }
    if (f.h != null && haptics) haptics.pulse(f.h);
  }

  /* ---------- Bobblehead ---------- */

  // A damped spring on the head: it sways a little at rest and wobbles when something happens.
  function Bobble(el) {
    this.head = el.querySelector(".bob-head");
    this.a = 0;
    this.v = 0;
    this.y = 0;
    this.vy = 0;
    this.t = Math.random() * 6;
    this.shakeLeft = 0;
  }
  Bobble.prototype.step = function (dt) {
    this.t += dt;
    let rest = Math.sin(this.t * 1.7) * 2.4;
    if (this.shakeLeft > 0) {
      this.shakeLeft -= dt;
      rest += Math.sin(this.t * 26) * 11 * Math.min(1, this.shakeLeft * 3);
    }
    // Two sub-steps keep the spring stable on slow frames.
    for (let i = 0; i < 2; i += 1) {
      const h = dt / 2;
      this.v += (-110 * (this.a - rest) - 6 * this.v) * h;
      this.a += this.v * h;
      this.vy += (-220 * this.y - 12 * this.vy) * h;
      this.y += this.vy * h;
    }
    this.a = Math.max(-16, Math.min(16, this.a));
    this.head.style.transform = "translateY(" + this.y.toFixed(2) + "%) rotate(" + this.a.toFixed(2) + "deg)";
  };
  Bobble.prototype.boing = function (power) {
    const p = power || 1;
    this.v += (Math.random() < 0.5 ? -1 : 1) * 170 * p;
    this.vy -= 14 * p;
  };
  Bobble.prototype.nod = function () { this.vy += 22; };
  Bobble.prototype.shake = function () { this.shakeLeft = 0.55; };

  const homeBob = new Bobble($("home-bob"));
  const coachBob = new Bobble($("coach-bob"));

  /* ---------- Views ---------- */

  let view = "home";

  function show(name) {
    view = name;
    document.querySelectorAll(".view").forEach(function (el) {
      el.classList.toggle("on", el.dataset.view === name);
    });
    if (name === "home") renderHome();
    if (name === "map") renderMap();
    kick();
  }

  let toastTimer = 0;
  function toast(text) {
    const t = $("toast");
    t.textContent = text;
    t.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("on"); }, 1600);
  }

  /* ---------- Shared brick painter ---------- */

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function paintBrick(ctx, x, y, w, h, tone, edge, seed) {
    const r = Math.max(2, Math.min(5, h * 0.18));
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = tone;
    ctx.fill();
    const band = Math.max(2, h * 0.16);
    ctx.save();
    roundRect(ctx, x, y, w, h, r);
    ctx.clip();
    ctx.fillStyle = "rgba(255, 214, 186, 0.32)";
    ctx.fillRect(x, y, w, band);
    ctx.fillStyle = "rgba(70, 20, 8, 0.25)";
    ctx.fillRect(x, y + h - band, w, band);
    ctx.fillStyle = "rgba(70, 20, 8, 0.18)";
    const s = seed || 1;
    const dots = Math.max(2, Math.round(w / 12));
    for (let i = 0; i < dots; i += 1) {
      const dx = x + 4 + ((s * 37 + i * 53) % Math.max(4, w - 8));
      const dy = y + band + 1 + ((s * 17 + i * 29) % Math.max(2, h - band * 2 - 3));
      ctx.fillRect(dx, dy, 2, 2);
    }
    ctx.restore();
    roundRect(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = edge;
    ctx.stroke();
  }

  /* ---------- Home ---------- */

  function renderHome() {
    const open = unlocked();
    const done = doneCount();
    const chap = chapterOf(open);
    $("play-level").textContent = done >= LEVELS.length ? "All walls built" : "Level " + open;
    $("home-chapter").textContent = chap.name;
    $("home-count").textContent = done + " of " + LEVELS.length + " walls";
    $("home-bar").style.width = Math.round((done / LEVELS.length) * 100) + "%";
    fitScene();
  }

  const scene = { t: 0, w: 0, h: 0, dpr: 1, bricks: [], clouds: [], cols: 8, rows: 7, phase: "build", hold: 0 };

  function fitScene() {
    const cv = $("scene");
    const rect = cv.getBoundingClientRect();
    if (!rect.width) return;
    scene.dpr = Math.min(window.devicePixelRatio || 1, 2);
    scene.w = rect.width;
    scene.h = rect.height;
    cv.width = Math.round(rect.width * scene.dpr);
    cv.height = Math.round(rect.height * scene.dpr);
    const logo = document.querySelector(".logo").getBoundingClientRect();
    const bottom = document.querySelector(".home-bottom").getBoundingClientRect();
    scene.top = logo.bottom - rect.top + 24;
    scene.ground = bottom.top - rect.top - 28;
    // Donnie stands on the grass to the left of the wall.
    const dn = $("home-donnie");
    const dh = Math.max(110, Math.min(200, (scene.ground - scene.top) * 0.92));
    const dw = dh * (360 / 717);
    dn.style.height = dh + "px";
    dn.style.width = dw + "px";
    dn.style.top = (scene.ground - dh + 6) + "px";
    dn.classList.add("on");
    scene.left = 12 + dw + 4;
    if (!scene.clouds.length) {
      for (let i = 0; i < 4; i += 1) {
        scene.clouds.push({ x: Math.random() * rect.width, y: 0.06 + i * 0.09 + Math.random() * 0.04, s: 0.7 + Math.random() * 0.6, v: 6 + Math.random() * 8 });
      }
    }
    if (!scene.plan) buildScenePlan();
  }

  function buildScenePlan() {
    const plan = [];
    for (let r = 0; r < scene.rows; r += 1) {
      let c = 0;
      const odd = r % 2 === 1;
      const course = [];
      while (c < scene.cols) {
        let w = 2;
        if (odd && (c === 0 || c === scene.cols - 1)) w = 1;
        if (c + w > scene.cols) w = scene.cols - c;
        course.push({ r: r, c: c, w: w, seed: r * 11 + c * 3 });
        c += w;
      }
      // Lay from both ends toward the middle, like two masons on a line.
      const ordered = [];
      let a = 0;
      let b = course.length - 1;
      while (a <= b) {
        ordered.push(course[a]);
        if (a !== b) ordered.push(course[b]);
        a += 1;
        b -= 1;
      }
      plan.push.apply(plan, ordered);
    }
    scene.plan = plan;
    scene.bricks = [];
    scene.next = 0;
    scene.clock = 0;
    if (scene.firstRun !== false) {
      // Open on a wall that is already going up.
      while (scene.next < plan.length && plan[scene.next].r < 3) {
        scene.bricks.push({ p: plan[scene.next], t: 1 });
        scene.next += 1;
      }
      scene.firstRun = false;
    }
    scene.phase = "build";
    scene.lineY = 0;
  }

  function cloud(ctx, x, y, s) {
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.arc(x, y, 16 * s, 0, Math.PI * 2);
    ctx.arc(x + 20 * s, y - 9 * s, 20 * s, 0, Math.PI * 2);
    ctx.arc(x + 44 * s, y - 2 * s, 15 * s, 0, Math.PI * 2);
    ctx.arc(x + 24 * s, y + 6 * s, 15 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  function stepScene(dt) {
    if (!scene.w) fitScene();
    if (!scene.w) return;
    const ctx = $("scene").getContext("2d");
    const W = scene.w;
    const H = scene.h;
    ctx.setTransform(scene.dpr, 0, 0, scene.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    scene.clouds.forEach(function (c) {
      c.x += c.v * dt;
      if (c.x > W + 40) c.x = -100;
      cloud(ctx, c.x, c.y * H, c.s);
    });

    // Hills and ground
    const g = scene.ground;
    ctx.fillStyle = "#9ED36F";
    ctx.beginPath();
    ctx.moveTo(0, g - 30);
    ctx.quadraticCurveTo(W * 0.25, g - 70, W * 0.55, g - 34);
    ctx.quadraticCurveTo(W * 0.8, g - 6, W, g - 44);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();
    ctx.fillStyle = C.grass;
    ctx.fillRect(0, g, W, H - g);
    ctx.fillStyle = C.grassDk;
    ctx.fillRect(0, g, W, 4);

    // Wall geometry
    const avail = Math.max(80, g - scene.top - 8);
    const m = 3;
    const left = scene.left || 32;
    const room = W - left - 32;
    let cw = Math.min(34, (room - m * (scene.cols - 1)) / scene.cols);
    let ch = cw * 0.62;
    if (scene.rows * (ch + m) > avail) {
      ch = avail / scene.rows - m;
      cw = ch / 0.62;
    }
    const wallW = scene.cols * cw + (scene.cols - 1) * m;
    const ox = left + (room - wallW) / 2 + 12;
    const base = g - 10;

    // Footing
    ctx.fillStyle = C.slab;
    roundRect(ctx, ox - 14, base, wallW + 28, 12, 3);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.ink;
    ctx.stroke();

    // Corner leads (line posts)
    const topY = base - scene.rows * (ch + m) - 18;
    ctx.fillStyle = "#8C6A45";
    ctx.strokeStyle = C.ink;
    [ox - 10, ox + wallW + 4].forEach(function (px) {
      roundRect(ctx, px, topY, 6, base - topY, 2);
      ctx.fill();
      ctx.stroke();
    });

    // Build timeline
    scene.clock += dt;
    if (scene.phase === "build" && scene.clock > 0.32 && scene.next < scene.plan.length) {
      scene.clock = 0;
      const p = scene.plan[scene.next];
      scene.bricks.push({ p: p, t: 0 });
      scene.next += 1;
    }
    if (scene.phase === "build" && scene.next >= scene.plan.length && scene.clock > 2.4) {
      scene.phase = "fade";
      scene.clock = 0;
    }
    if (scene.phase === "fade" && scene.clock > 0.6) buildScenePlan();

    const fade = scene.phase === "fade" ? Math.max(0, 1 - scene.clock / 0.6) : 1;
    ctx.globalAlpha = fade;
    let topFull = -1;
    for (let r = 0; r < scene.rows; r += 1) {
      const need = scene.plan.filter(function (p) { return p.r === r; }).length;
      const have = scene.bricks.filter(function (b) { return b.p.r === r && b.t >= 1; }).length;
      if (have === need) topFull = r; else break;
    }
    scene.bricks.forEach(function (b) {
      b.t = Math.min(1, b.t + dt * 3.2);
      const e = 1 - Math.pow(1 - b.t, 3);
      const x = ox + b.p.c * (cw + m);
      const yEnd = base - (b.p.r + 1) * (ch + m);
      const y = yEnd - (1 - e) * 60;
      const w = b.p.w * cw + (b.p.w - 1) * m;
      paintBrick(ctx, x, y, w, ch, C.brick, C.brickDk, b.p.seed);
    });
    ctx.globalAlpha = 1;

    // Stringline sits on top of the course being laid
    const lineRow = Math.min(scene.rows - 1, topFull + 1);
    const targetY = base - (lineRow + 1) * (ch + m) - 1;
    scene.lineY = scene.lineY ? scene.lineY + (targetY - scene.lineY) * Math.min(1, dt * 6) : targetY;
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(ox - 7, scene.lineY);
    ctx.lineTo(ox + wallW + 7, scene.lineY);
    ctx.stroke();
    ctx.fillStyle = C.line;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.5;
    [ox - 12, ox + wallW + 2].forEach(function (px) {
      roundRect(ctx, px, scene.lineY - 4, 10, 8, 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  /* ---------- Map ---------- */

  function catmull(points) {
    if (points.length < 2) return "";
    let d = "M" + points[0].x.toFixed(1) + " " + points[0].y.toFixed(1);
    for (let i = 0; i < points.length - 1; i += 1) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += " C" + c1x.toFixed(1) + " " + c1y.toFixed(1) + " " + c2x.toFixed(1) + " " + c2y.toFixed(1) + " " + p2.x.toFixed(1) + " " + p2.y.toFixed(1);
    }
    return d;
  }

  function svgEl(name, attrs) {
    const el = document.createElementNS(SVGNS, name);
    Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }

  function starIcon(on) {
    const s = svgEl("svg", { viewBox: "0 0 24 24" });
    if (on) s.setAttribute("class", "on");
    s.appendChild(svgEl("use", { href: "#i-star" }));
    return s;
  }

  function renderMap() {
    const scroller = $("map-scroll");
    const box = $("map-canvas");
    box.innerHTML = "";
    const W = scroller.clientWidth || 390;
    const open = unlocked();
    $("map-stars").textContent = totalStars();

    const STEP = 100;
    const SIGN = 150;
    const PAD_B = 70;
    const amp = Math.min(W * 0.27, 112);
    const cx = W / 2;

    // Lay out from the bottom up, then flip to screen space.
    const items = [];
    let y = PAD_B;
    CHAPTERS.forEach(function (ch, ci) {
      y += ci === 0 ? 40 : SIGN / 2;
      items.push({ kind: "sign", ch: ch, ci: ci, y: y });
      y += SIGN / 2 + 34;
      for (let id = ch.from; id <= ch.to; id += 1) {
        const k = id - ch.from;
        items.push({ kind: "node", id: id, y: y, x: cx + amp * Math.sin(k * 0.9 + 0.35) });
        if (id < ch.to) y += STEP;
      }
    });
    y += 120;
    items.push({ kind: "finish", y: y });
    const H = y + 90;
    items.forEach(function (it) {
      it.sy = H - it.y;
      if (it.kind === "sign" || it.kind === "finish") it.x = cx;
    });
    box.style.height = H + "px";

    // Chapter bands, split halfway through each sign.
    const bandColors = ["#8FCB62", "#C6E59B", "#AEDDF6"];
    const signs = items.filter(function (it) { return it.kind === "sign"; });
    signs.forEach(function (s, i) {
      const band = document.createElement("div");
      band.className = "map-band";
      const bottom = i === 0 ? H : s.sy;
      const top = i === signs.length - 1 ? 0 : signs[i + 1].sy;
      band.style.top = top + "px";
      band.style.height = (bottom - top) + "px";
      band.style.background = bandColors[i % bandColors.length];
      box.appendChild(band);
    });

    // Road through every node and sign, in climb order.
    const pts = items.map(function (it) { return { x: it.x, y: it.sy }; });
    const svg = svgEl("svg", { class: "map-road", width: W, height: H, viewBox: "0 0 " + W + " " + H });
    const d = catmull(pts);
    svg.appendChild(svgEl("path", { d: d, fill: "none", stroke: C.ink, "stroke-width": 26, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    svg.appendChild(svgEl("path", { d: d, fill: "none", stroke: "#F1E2C2", "stroke-width": 19, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    const doneUpTo = items.findIndex(function (it) { return it.kind === "node" && it.id === open; });
    if (doneUpTo > 0) {
      const dd = catmull(pts.slice(0, doneUpTo + 1));
      svg.appendChild(svgEl("path", { d: dd, fill: "none", stroke: C.line, "stroke-width": 19, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    }
    svg.appendChild(svgEl("path", { d: d, fill: "none", stroke: "rgba(31,42,68,0.22)", "stroke-width": 3, "stroke-dasharray": "2 12", "stroke-linecap": "round" }));
    box.appendChild(svg);

    items.forEach(function (it) {
      if (it.kind === "finish") {
        const f = document.createElement("div");
        f.className = "sign finish" + (doneCount() >= LEVELS.length ? " done" : "");
        f.style.top = it.sy + "px";
        f.innerHTML = '<p class="sign-kicker">Finish</p><p class="sign-name">Topped Out</p><p class="sign-blurb">Build all 24 walls</p>';
        box.appendChild(f);
        return;
      }
      if (it.kind === "sign") {
        const s = document.createElement("div");
        s.className = "sign";
        s.style.top = it.sy + "px";
        s.innerHTML = '<p class="sign-kicker">Chapter ' + (it.ci + 1) + '</p><p class="sign-name"></p><p class="sign-blurb"></p>';
        s.querySelector(".sign-name").textContent = it.ch.name;
        s.querySelector(".sign-blurb").textContent = it.ch.blurb;
        box.appendChild(s);
        return;
      }
      const stars = save.stars[it.id] || 0;
      const state = it.id < open || stars ? "done" : it.id === open ? "current" : "locked";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "node " + state;
      btn.style.left = it.x + "px";
      btn.style.top = it.sy + "px";
      btn.setAttribute("aria-label", "Level " + it.id + (state === "locked" ? ", locked" : ""));
      if (state === "locked") {
        const lock = svgEl("svg", { viewBox: "0 0 24 24" });
        lock.appendChild(svgEl("use", { href: "#i-lock" }));
        btn.appendChild(lock);
        btn.addEventListener("click", function () {
          fx("locked");
          btn.classList.remove("nope");
          void btn.offsetWidth;
          btn.classList.add("nope");
          toast("Finish level " + (open) + " first");
        });
      } else {
        const label = document.createElement("span");
        label.textContent = it.id;
        btn.appendChild(label);
        btn.addEventListener("click", function () { fx("tap"); startLevel(it.id - 1); });
      }
      if (haptics) haptics.attach(btn);
      box.appendChild(btn);
      if (state === "done") {
        const row = document.createElement("div");
        row.className = "node-stars";
        row.style.left = it.x + "px";
        row.style.top = (it.sy + 30) + "px";
        for (let i = 0; i < 3; i += 1) row.appendChild(starIcon(i < stars));
        box.appendChild(row);
      }
      if (it.id === open) scrollTarget = it.sy;
    });

    requestAnimationFrame(function () {
      scroller.scrollTop = Math.max(0, scrollTarget - scroller.clientHeight * 0.55);
    });
  }
  let scrollTarget = 0;

  /* ---------- Play ---------- */

  let engine = null;
  let levelIndex = 0;
  let layout = null;
  let selected = "queue";
  let coach = null;
  let seatsUntil = 0;
  let ghost = null;
  let drag = null;
  let particles = [];
  let floats = [];
  let twang = 0;
  let shake = 0;
  let clock = 0;
  let sheetTimer = 0;
  const playClouds = [
    { x: 30, y: 0.15, s: 0.75, v: 5 },
    { x: 230, y: 0.55, s: 0.6, v: 7 },
    { x: 330, y: 0.05, s: 0.5, v: 4 }
  ];

  function brickName(b) {
    if (!b) return "brick";
    if (b.h > 1) return "soldier";
    return { 1: "half brick", 2: "brick", 3: "long brick", 4: "four-unit brick" }[b.w] || b.w + "-unit brick";
  }

  function say(text) {
    const p = $("tip");
    if (p.textContent === text) return;
    p.textContent = text;
    const b = p.parentElement;
    b.classList.remove("flash");
    void b.offsetWidth;
    b.classList.add("flash");
  }

  function startLevel(index) {
    levelIndex = index;
    const lv = LEVELS[index];
    engine = new Engine(lv);
    selected = "queue";
    coach = null;
    ghost = null;
    particles = [];
    floats = [];
    clearTimeout(sheetTimer);
    $("sheet").hidden = true;
    $("play-name").textContent = lv.name;
    $("play-level-label").textContent = "Level " + lv.id;
    say(lv.hint);
    show("play");
    fitWall();
    if (lv.id === 1 && !save.seenIntro) {
      const first = engine.placements(engine.next())[0];
      if (first) coach = { r: first.r, c: first.c, w: engine.next().w, h: engine.next().h, free: true };
    }
    refreshUI();
  }

  function refreshUI() {
    renderRack();
    renderMeter();
    $("btn-undo").disabled = !engine.history.length;
    const left = engine.queue().length + (engine.hold ? 1 : 0);
    $("bricks-left").textContent = left === 1 ? "1 brick left" : left + " bricks left";
  }

  function renderMeter() {
    const box = $("star-meter");
    box.innerHTML = "";
    const n = engine.stars();
    for (let i = 0; i < 3; i += 1) {
      const s = starIcon(true);
      if (i >= n) s.setAttribute("class", "off");
      box.appendChild(s);
    }
  }

  function chipSize(b, maxW, maxH) {
    const unit = Math.min(maxW / 4.4, 30);
    let w = b.w * unit + (b.w - 1) * 2;
    let h = Math.round(unit * 0.64);
    if (b.h > 1) { w = unit; h = unit * 1.28 + 2; }
    const k = Math.min(1, maxW / w, maxH / h);
    return { w: Math.round(w * k), h: Math.round(h * k) };
  }

  function chip(b, maxW, maxH, from) {
    const el = document.createElement("i");
    el.className = "brick";
    const s = chipSize(b, maxW, maxH);
    el.style.width = s.w + "px";
    el.style.height = s.h + "px";
    if (from) el.dataset.from = from;
    return el;
  }

  function renderRack() {
    const hold = $("hold-body");
    const next = $("next-body");
    const later = $("later-body");
    hold.innerHTML = "";
    next.innerHTML = "";
    later.innerHTML = "";
    const holdW = hold.clientWidth || 70;
    const nextW = next.clientWidth || 160;
    if (engine.hold) hold.appendChild(chip(engine.hold, holdW - 6, 52, "hold"));
    else {
      const e = document.createElement("span");
      e.className = "slot-empty";
      e.textContent = "Empty";
      hold.appendChild(e);
    }
    const q = engine.queue();
    if (q[0]) next.appendChild(chip(q[0], Math.min(nextW - 16, 120), 56, "queue"));
    else {
      const e = document.createElement("span");
      e.className = "slot-empty";
      e.textContent = "No bricks left";
      next.appendChild(e);
    }
    const rest = q.slice(1, 4);
    rest.forEach(function (b) {
      const c = chip(b, 64, 22);
      later.appendChild(c);
    });
    $("later-label").textContent = q.length > 1 ? "Then (" + (q.length - 1) + ")" : "Then";
    if (!rest.length) {
      const e = document.createElement("span");
      e.className = "slot-empty";
      e.textContent = "None";
      later.appendChild(e);
    }
    if (selected === "hold" && !engine.hold) selected = "queue";
    $("slot-hold").classList.toggle("selected", selected === "hold" && !!engine.hold);
    $("slot-next").classList.toggle("selected", selected === "queue" && !!q[0] && !!engine.hold);
  }

  function fitWall() {
    const stage = $("stage");
    const cv = $("wall");
    if (!engine) return;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (!W || !H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    const cols = engine.cols;
    const rows = engine.rows;
    const padX = 26;
    const ground = 30;
    const top = 36;
    let m = 3;
    let cw = (W - padX * 2 - m * (cols - 1)) / cols;
    let ch = cw * 0.64;
    const maxH = H - ground - 14 - top;
    if (rows * ch + (rows - 1) * m > maxH) {
      ch = (maxH - (rows - 1) * m) / rows;
      cw = ch / 0.64;
    }
    ch = Math.min(ch, 44);
    cw = Math.min(cw, ch / 0.64);
    const wallW = cols * cw + (cols - 1) * m;
    const wallH = rows * ch + (rows - 1) * m;
    const ox = (W - wallW) / 2;
    const oy = H - ground - 14 - wallH;
    layout = { W: W, H: H, dpr: dpr, cw: cw, ch: ch, m: m, ox: ox, oy: oy, wallW: wallW, wallH: wallH, ground: ground };
  }

  function cellXY(r, c) {
    return {
      x: layout.ox + c * (layout.cw + layout.m),
      y: layout.oy + (engine.rows - 1 - r) * (layout.ch + layout.m)
    };
  }

  function brickRect(r, c, w, h) {
    const top = cellXY(r + h - 1, c);
    return { x: top.x, y: top.y, w: w * layout.cw + (w - 1) * layout.m, h: h * layout.ch + (h - 1) * layout.m };
  }

  function drawWall(dt) {
    if (!engine || !layout) return;
    const ctx = $("wall").getContext("2d");
    const L = layout;
    ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    ctx.clearRect(0, 0, L.W, L.H);
    playClouds.forEach(function (c) {
      c.x += c.v * dt;
      if (c.x > L.W + 40) c.x = -110;
      cloud(ctx, c.x, c.y * (L.oy - 30) + 40, c.s);
    });
    if (shake > 0.3) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    // Ground
    const gy = L.H - L.ground;
    ctx.fillStyle = "#9ED36F";
    ctx.beginPath();
    ctx.moveTo(0, gy - 6);
    ctx.quadraticCurveTo(L.W * 0.3, gy - 22, L.W * 0.62, gy - 8);
    ctx.quadraticCurveTo(L.W * 0.85, gy + 2, L.W, gy - 14);
    ctx.lineTo(L.W, L.H);
    ctx.lineTo(0, L.H);
    ctx.fill();
    ctx.fillStyle = C.grass;
    ctx.fillRect(0, gy, L.W, L.ground);
    ctx.fillStyle = C.grassDk;
    ctx.fillRect(0, gy, L.W, 3);

    // Corner posts that hold the line
    const postTop = L.oy - 26;
    ctx.fillStyle = "#8C6A45";
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    [L.ox - 20, L.ox + L.wallW + 14].forEach(function (px) {
      roundRect(ctx, px, postTop, 6, gy - postTop + 4, 2);
      ctx.fill();
      ctx.stroke();
    });

    // Footing
    const fy = L.oy + L.wallH + 4;
    roundRect(ctx, L.ox - 12, fy, L.wallW + 24, 12, 3);
    ctx.fillStyle = C.slab;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.ink;
    ctx.stroke();

    // Mortar bed behind the wall
    roundRect(ctx, L.ox - 4, L.oy - 4, L.wallW + 8, L.wallH + 8, 6);
    ctx.fillStyle = C.mortar;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = C.ink;
    ctx.stroke();

    for (let r = 0; r < engine.rows; r += 1) {
      for (let c = 0; c < engine.cols; c += 1) {
        const p = cellXY(r, c);
        const m = engine.mask[r][c];
        if (m === 0) {
          ctx.fillStyle = C.hole;
          ctx.fillRect(p.x - L.m / 2, p.y - L.m / 2, L.cw + L.m, L.ch + L.m);
        } else if (m === 1 && engine.fill[r][c] === 0) {
          roundRect(ctx, p.x + 1, p.y + 1, L.cw - 2, L.ch - 2, 3);
          ctx.fillStyle = "rgba(185, 170, 146, 0.32)";
          ctx.fill();
        }
      }
    }
    // Glint on openings
    ctx.save();
    for (let r = 0; r < engine.rows; r += 1) {
      for (let c = 0; c < engine.cols; c += 1) {
        if (engine.mask[r][c] !== 0) continue;
        const p = cellXY(r, c);
        if ((r + c) % 3 === 0) {
          ctx.fillStyle = C.holeHi;
          ctx.beginPath();
          ctx.moveTo(p.x + L.cw * 0.2, p.y + L.ch);
          ctx.lineTo(p.x + L.cw * 0.55, p.y);
          ctx.lineTo(p.x + L.cw * 0.8, p.y);
          ctx.lineTo(p.x + L.cw * 0.45, p.y + L.ch);
          ctx.fill();
        }
      }
    }
    ctx.restore();

    // Old work
    for (let r = 0; r < engine.rows; r += 1) {
      let c = 0;
      while (c < engine.cols) {
        if (engine.mask[r][c] === 2) {
          let w = 1;
          while (c + w < engine.cols && engine.mask[r][c + w] === 2 && w < 2) w += 1;
          const b = brickRect(r, c, w, 1);
          paintBrick(ctx, b.x, b.y, b.w, b.h, C.old, C.oldDk, r * 5 + c);
          c += w;
        } else c += 1;
      }
    }

    // Seats for the brick in hand
    const inHand = drag ? engine.brickFor(drag.from) : engine.brickFor(selected);
    if (inHand && (drag || clock < seatsUntil)) {
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = C.lineDk;
      engine.placements(inHand).forEach(function (s) {
        const b = brickRect(s.r, s.c, inHand.w, inHand.h);
        roundRect(ctx, b.x + 1, b.y + 1, b.w - 2, b.h - 2, 3);
        ctx.fillStyle = "rgba(255, 200, 61, 0.22)";
        ctx.fill();
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    // Placed bricks
    engine.placed.forEach(function (p) {
      p.born = Math.min(1, (p.born || 0) + dt * 6);
      const b = brickRect(p.r, p.c, p.w, p.h);
      const k = 1 + (1 - p.born) * 0.12;
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      paintBrick(ctx, cx - (b.w * k) / 2, cy - (b.h * k) / 2, b.w * k, b.h * k, p.tone, C.brickDk, p.id * 7);
    });

    // Coach (hint) brick
    if (coach) {
      const b = brickRect(coach.r, coach.c, coach.w, coach.h);
      const pulse = 0.5 + 0.5 * Math.sin(clock * 6);
      ctx.globalAlpha = 0.45 + pulse * 0.25;
      paintBrick(ctx, b.x, b.y, b.w, b.h, C.line, C.lineDk, 3);
      ctx.globalAlpha = 1;
      roundRect(ctx, b.x - 3, b.y - 3, b.w + 6, b.h + 6, 5);
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      // Arrow
      const ax = b.x + b.w / 2;
      const ay = b.y - 10 - pulse * 6;
      ctx.fillStyle = C.line;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - 9, ay - 11);
      ctx.lineTo(ax - 4, ay - 11);
      ctx.lineTo(ax - 4, ay - 20);
      ctx.lineTo(ax + 4, ay - 20);
      ctx.lineTo(ax + 4, ay - 11);
      ctx.lineTo(ax + 9, ay - 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Ghost while dragging
    if (ghost) {
      const b = brickRect(ghost.r, ghost.c, ghost.w, ghost.h);
      if (ghost.ok) {
        ctx.globalAlpha = 0.92;
        paintBrick(ctx, b.x, b.y, b.w, b.h, C.brick, C.brickDk, 9);
        ctx.globalAlpha = 1;
        roundRect(ctx, b.x - 3, b.y - 3, b.w + 6, b.h + 6, 5);
        ctx.lineWidth = 3;
        ctx.strokeStyle = C.go;
        ctx.stroke();
      } else {
        roundRect(ctx, b.x, b.y, b.w, b.h, 4);
        ctx.fillStyle = "rgba(229, 83, 61, 0.35)";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = C.bad;
        ctx.stroke();
      }
    }

    // Stringline on the course being laid
    const lr = engine.lineRow();
    if (lr < engine.rows) {
      const p = cellXY(lr, 0);
      const y = p.y - L.m / 2 - 1;
      const x0 = L.ox - 17;
      const x1 = L.ox + L.wallW + 17;
      twang *= Math.pow(0.02, dt);
      const wob = Math.sin(clock * 40) * twang * 5;
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.quadraticCurveTo((x0 + x1) / 2, y + wob, x1, y);
      ctx.stroke();
      ctx.fillStyle = C.line;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1.5;
      [x0 - 5, x1 - 5].forEach(function (px) {
        roundRect(ctx, px, y - 5, 10, 10, 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    // Dust
    particles = particles.filter(function (p) {
      p.life -= dt * 1.6;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      if (p.life <= 0) return false;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
      ctx.globalAlpha = 1;
      return true;
    });

    // Floating words
    floats = floats.filter(function (f) {
      f.life -= dt * 0.8;
      if (f.life <= 0) return false;
      const y = f.y - (1 - f.life) * 30;
      ctx.globalAlpha = Math.min(1, f.life * 2);
      ctx.font = "22px 'Lilita One', sans-serif";
      ctx.textAlign = "center";
      ctx.lineJoin = "round";
      ctx.lineWidth = 5;
      ctx.strokeStyle = C.ink;
      ctx.strokeText(f.text, L.W / 2, y);
      ctx.fillStyle = C.line;
      ctx.fillText(f.text, L.W / 2, y);
      ctx.globalAlpha = 1;
      return true;
    });

    shake *= Math.pow(0.001, dt);
  }

  function dust(rec) {
    const b = brickRect(rec.r, rec.c, rec.w, rec.h);
    for (let i = 0; i < 12; i += 1) {
      particles.push({
        x: b.x + Math.random() * b.w,
        y: b.y + b.h,
        vx: (Math.random() - 0.5) * 120,
        vy: -60 - Math.random() * 90,
        life: 1,
        color: Math.random() > 0.5 ? "#D9CFBE" : "#A89A82"
      });
    }
  }

  const COURSE_LINES = ["Course done. Line moves up.", "That course is true.", "Good bond. Next course.", "Level and tight. Keep going."];
  const WHY = {
    bond: "That joint lands right on the joint below. Slide it over half a brick.",
    support: "Nothing under it yet. Finish the course below first.",
    opening: "That is the opening. Leave it clear.",
    taken: "There is already a brick there.",
    edge: "That runs off the end of the wall."
  };

  function doPlace(from, r, c) {
    const lowBefore = engine.lineRow();
    const rec = engine.place(from, r, c);
    if (!rec) return false;
    if (coach && coach.free) { save.seenIntro = true; persist(); }
    coach = null;
    seatsUntil = 0;
    selected = "queue";
    fx("lay");
    coachBob.nod();
    shake = 3;
    dust(rec);
    const lowAfter = engine.lineRow();
    if (lowAfter > lowBefore) {
      twang = 1;
      fx("course");
      coachBob.boing(0.7);
      if (engine.status !== "won") {
        const p = cellXY(lowBefore, 0);
        floats.push({ text: "Course done", y: p.y - 18, life: 1 });
        say(COURSE_LINES[Math.floor(Math.random() * COURSE_LINES.length)]);
      }
    }
    refreshUI();
    afterMove();
    return true;
  }

  function afterMove() {
    clearTimeout(sheetTimer);
    if (engine.status === "won") {
      say("That is a wall.");
      sheetTimer = setTimeout(winSheet, 700);
    } else if (engine.status === "stuck") {
      sheetTimer = setTimeout(stuckSheet, 500);
    }
  }

  function deny(reason) {
    coachBob.shake();
    fx("wrong");
    say(WHY[reason] || "That brick will not sit there.");
    seatsUntil = clock + 2.2;
  }

  function nearestSeat(brick, r, c, maxD) {
    let best = null;
    let bestD = maxD;
    engine.placements(brick).forEach(function (s) {
      const d = Math.hypot((s.c - c) * 0.8, (s.r - r) * 1.2);
      if (d < bestD) { bestD = d; best = s; }
    });
    return best;
  }

  function pointToCanvas(x, y) {
    const rect = $("wall").getBoundingClientRect();
    return { x: x - rect.left, y: y - rect.top, inside: x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom };
  }

  function overWall(px, py, pad) {
    return px > layout.ox - pad && px < layout.ox + layout.wallW + pad && py > layout.oy - pad && py < layout.oy + layout.wallH + pad;
  }

  /* ---------- Drag from rack ---------- */

  function brickPx(b) {
    return { w: b.w * layout.cw + (b.w - 1) * layout.m, h: b.h * layout.ch + (b.h - 1) * layout.m };
  }

  function onSlotDown(e) {
    if (!engine || engine.status !== "play") return;
    const slot = e.currentTarget;
    const from = slot.dataset.from;
    drag = null;
    pressed = { from: from, x: e.clientX, y: e.clientY, id: e.pointerId, slot: slot, moved: false };
  }
  let pressed = null;
  let lastSeat = "";

  function onSlotMove(e) {
    if (!pressed || e.pointerId !== pressed.id) return;
    const dist = Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y);
    if (!drag && dist > 6) {
      const b = engine.brickFor(pressed.from);
      if (!b) return;
      pressed.moved = true;
      const size = brickPx(b);
      drag = { from: pressed.from, brick: b, w: size.w, h: size.h };
      const el = $("drag");
      el.style.width = size.w + "px";
      el.style.height = size.h + "px";
      el.className = "on";
      const lifted = pressed.slot.querySelector(".brick");
      if (lifted) lifted.classList.add("lifted");
      coach = coach && coach.free ? coach : null;
      try { pressed.slot.setPointerCapture(pressed.id); } catch (err) {}
      lastSeat = "";
      fx("pickup");
    }
    if (drag) moveDrag(e.clientX, e.clientY);
  }

  function moveDrag(x, y) {
    const pr = phone.getBoundingClientRect();
    const lift = drag.h / 2 + 44;
    const cxp = x - pr.left;
    const cyp = y - pr.top - lift;
    const el = $("drag");
    el.style.transform = "translate(" + (cxp - drag.w / 2) + "px," + (cyp - drag.h / 2) + "px)";

    const pt = pointToCanvas(x, y - lift);
    const L = layout;
    ghost = null;
    if (overWall(pt.x, pt.y, Math.max(L.ch * 1.5, 30))) {
      const colF = (pt.x - drag.w / 2 - L.ox) / (L.cw + L.m);
      const rowTop = (pt.y - drag.h / 2 - L.oy) / (L.ch + L.m);
      const c = Math.round(colF);
      const r = engine.rows - drag.brick.h - Math.round(rowTop);
      const seat = nearestSeat(drag.brick, r, c, 1.7);
      if (seat) {
        ghost = { r: seat.r, c: seat.c, w: drag.brick.w, h: drag.brick.h, ok: true };
        const key = seat.r + ":" + seat.c;
        if (key !== lastSeat) { lastSeat = key; fx("snap"); }
      }
      else {
        const cc = Math.max(0, Math.min(engine.cols - drag.brick.w, c));
        const rr = Math.max(0, Math.min(engine.rows - drag.brick.h, r));
        ghost = { r: rr, c: cc, w: drag.brick.w, h: drag.brick.h, ok: false, why: engine.why(rr, cc, drag.brick) };
      }
    }
    el.classList.toggle("snapped", !!(ghost && ghost.ok));
    const hs = $("slot-hold");
    const hr = hs.getBoundingClientRect();
    const overHold = x >= hr.left && x <= hr.right && y >= hr.top - 20 && y <= hr.bottom;
    hs.classList.toggle("drop-ok", overHold && drag.from === "queue" && !engine.hold);
    drag.overHold = overHold;
  }

  function onSlotUp(e) {
    if (!pressed || e.pointerId !== pressed.id) return;
    const p = pressed;
    pressed = null;
    $("slot-hold").classList.remove("drop-ok");
    if (!drag) {
      // A tap on a slot
      if (p.from === "hold") {
        if (engine.hold) { selected = "hold"; seatsUntil = clock + 2.2; fx("tap"); }
        else if (engine.canStash()) { engine.stash(); fx("hold"); say("Parked in Hold. Use it when it fits."); coach = null; afterMove(); }
      } else if (engine.next()) {
        selected = "queue";
        seatsUntil = clock + 2.2;
        fx("tap");
      }
      refreshUI();
      return;
    }
    const d = drag;
    drag = null;
    const el = $("drag");
    let done = false;
    if (ghost && ghost.ok) {
      done = doPlace(d.from, ghost.r, ghost.c);
    } else if (d.overHold && d.from === "queue" && engine.canStash()) {
      engine.stash();
      fx("hold");
      say("Parked in Hold. Use it when it fits.");
      coach = null;
      refreshUI();
      afterMove();
      done = true;
    } else if (ghost && !ghost.ok) {
      deny(ghost.why);
    } else {
      fx("putback");
    }
    ghost = null;
    if (done) {
      el.className = "";
    } else {
      const sr = p.slot.querySelector(".slot-body").getBoundingClientRect();
      const pr = phone.getBoundingClientRect();
      el.classList.add("back");
      el.classList.remove("snapped");
      el.style.transform = "translate(" + (sr.left - pr.left + sr.width / 2 - d.w / 2) + "px," + (sr.top - pr.top + sr.height / 2 - d.h / 2) + "px)";
      setTimeout(function () { el.className = ""; renderRack(); }, 180);
    }
  }

  /* ---------- Tap on wall ---------- */

  let wallPress = null;

  function onWallDown(e) {
    if (!engine || engine.status !== "play") return;
    wallPress = { x: e.clientX, y: e.clientY };
  }

  function onWallUp(e) {
    if (!wallPress) return;
    const moved = Math.hypot(e.clientX - wallPress.x, e.clientY - wallPress.y);
    wallPress = null;
    if (moved > 14 || engine.status !== "play") return;
    const b = engine.brickFor(selected) || engine.next();
    if (!b) return;
    const pt = pointToCanvas(e.clientX, e.clientY);
    const L = layout;
    if (!overWall(pt.x, pt.y, 20)) return;
    const c = Math.floor((pt.x - L.ox) / (L.cw + L.m));
    const r = engine.rows - 1 - Math.floor((pt.y - L.oy) / (L.ch + L.m));
    // Prefer a seat that covers the tapped cell.
    const from = engine.brickFor(selected) ? selected : "queue";
    let seat = null;
    engine.placements(b).forEach(function (s) {
      if (seat) return;
      if (r >= s.r && r < s.r + b.h && c >= s.c && c < s.c + b.w) seat = s;
    });
    if (!seat) seat = nearestSeat(b, r, c - (b.w - 1) / 2, 1.2);
    if (seat) doPlace(from, seat.r, seat.c);
    else {
      const cc = Math.max(0, Math.min(engine.cols - b.w, c));
      deny(engine.why(Math.max(0, Math.min(engine.rows - 1, r)), cc, b));
    }
  }

  /* ---------- Hint ---------- */

  function replay(k) {
    const e = new Engine(engine.level);
    const acts = engine.history.slice(0, engine.history.length - k);
    acts.forEach(function (a) {
      if (a.type === "stash") e.stash();
      else e.place(a.from, a.r, a.c);
    });
    return e;
  }

  function whereText(m, b) {
    let at = "on course " + (m.r + 1);
    let side = "";
    if (m.c === 0) side = "at the left end";
    else if (m.c + b.w === engine.cols) side = "at the right end";
    let span = false;
    for (let x = 0; x < b.w; x += 1) if (engine.isVoid(m.r - 1, m.c + x)) span = true;
    if (span) side = "across the opening";
    return at + (side ? ", " + side : "") + ".";
  }

  function hint() {
    if (!engine || engine.status !== "play") return;
    engine.hints += 1;
    coachBob.nod();
    renderMeter();
    fx("hint");
    const res = engine.solve(150000);
    if (res.ok && res.first) {
      const m = res.first;
      if (m.type === "stash") {
        coach = null;
        say("Drag this " + brickName(engine.next()) + " to Hold. It fits better later.");
        pulse("slot-hold");
        return;
      }
      const b = engine.brickFor(m.from);
      coach = { r: m.r, c: m.c, w: b.w, h: b.h };
      selected = m.from;
      renderRack();
      const lead = m.from === "hold" ? "Use the " + brickName(b) + " in Hold. Set it " : "Set the " + brickName(b) + " ";
      say(lead + whereText(m, b));
      return;
    }
    // No finish from here (or none found in time). Find the fewest undos that get back on track.
    let k = 1;
    for (; k < engine.history.length; k += 1) {
      if (replay(k).solve(40000).ok) break;
    }
    const n = k === 1 ? "move" : k + " moves";
    coach = null;
    say(res.capped
      ? "I cannot see a clean finish from here. Undo the last " + n + " to get back on track."
      : "This wall cannot close from here. Undo the last " + n + ".");
    pulse("btn-undo");
  }

  function pulse(id) {
    const el = $(id);
    el.classList.remove("pulse");
    void el.offsetWidth;
    el.classList.add("pulse");
    setTimeout(function () { el.classList.remove("pulse"); }, 2800);
  }

  /* ---------- Sheets ---------- */

  function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }

  function winSheet() {
    coachBob.boing(1.2);
    const lv = LEVELS[levelIndex];
    const stars = engine.stars();
    const prev = save.stars[lv.id] || 0;
    save.stars[lv.id] = Math.max(prev, stars);
    persist();
    const lastLevel = levelIndex >= LEVELS.length - 1;
    fx(stars === 3 || lastLevel ? "winBig" : "win");
    if (save.sfx && audio) audio.stars(stars);
    $("sheet-ribbon").textContent = "Wall Done";
    $("sheet-ribbon").className = "ribbon";
    const box = $("sheet-stars");
    box.innerHTML = "";
    for (let i = 0; i < 3; i += 1) box.appendChild(starIcon(i < stars));
    $("sheet-title").textContent = stars === 3 ? "Dead on the line" : stars === 2 ? "Good and true" : "It stands";
    const slips = [];
    if (engine.undos) slips.push(plural(engine.undos, "undo"));
    if (engine.hints) slips.push(plural(engine.hints, "hint"));
    $("sheet-text").textContent = slips.length ? slips.join(", ") + ". Try it clean for three stars." : "No undos. No hints.";
    const last = levelIndex >= LEVELS.length - 1;
    $("sheet-primary-text").textContent = last ? "Back to map" : "Next level";
    $("sheet-primary").dataset.act = last ? "map" : "next";
    $("sheet-retry").querySelector("span").textContent = "Replay";
    $("sheet").hidden = false;
  }

  function stuckSheet() {
    coachBob.shake();
    fx("stuck");
    $("sheet-ribbon").textContent = "Stuck";
    $("sheet-ribbon").className = "ribbon stuck";
    $("sheet-stars").innerHTML = "";
    $("sheet-title").textContent = "No seat left";
    $("sheet-text").textContent = "None of your bricks fit anywhere. Undo a move or start the wall again.";
    $("sheet-primary-text").textContent = "Undo";
    $("sheet-primary").dataset.act = "undo";
    $("sheet-retry").querySelector("span").textContent = "Restart";
    $("sheet").hidden = false;
  }

  function undo() {
    if (!engine || !engine.history.length) return;
    engine.undo();
    coach = null;
    ghost = null;
    $("sheet").hidden = true;
    clearTimeout(sheetTimer);
    fx("undo");
    say("Pulled it. Set it true.");
    refreshUI();
  }

  /* ---------- Loop ---------- */

  let raf = 0;
  let last = 0;

  function kick() {
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  }

  function loop(now) {
    raf = 0;
    if (document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    if (view === "home") { stepScene(dt); homeBob.step(dt); }
    else if (view === "play") { drawWall(dt); coachBob.step(dt); }
    else return;
    raf = requestAnimationFrame(loop);
  }

  /* ---------- Bind ---------- */

  function bind() {
    // iPhone only starts audio inside a real gesture, and can drop it later. Check on every one.
    ["pointerdown", "touchend", "click", "keydown"].forEach(function (type) {
      document.addEventListener(type, function () { if (audio) audio.unlock(); }, { capture: true, passive: true });
    });
    if (audio) audio.setSilentOk(save.silentOk !== false);
    if (haptics) {
      haptics.setEnabled(save.haptics);
      document.querySelectorAll(".btn, .round-btn, #home-donnie, .coach-donnie, .slot.hold, .slot.next, #stage, #home-progress").forEach(haptics.attach);
    }

    $("btn-play").addEventListener("click", function () {
      fx("tap");
      const open = unlocked();
      if (doneCount() >= LEVELS.length) show("map");
      else startLevel(open - 1);
    });
    $("home-progress").addEventListener("click", function () { fx("tap"); show("map"); });
    $("home-donnie").addEventListener("click", function () { homeBob.boing(1.3); fx("donnie", { power: 1.3 }); });
    $("coach-bob").parentElement.addEventListener("click", function () { coachBob.boing(1); fx("donnie", { power: 1 }); });
    $("btn-how").addEventListener("click", function () { fx("tap"); show("how"); });
    $("btn-settings").addEventListener("click", function () { fx("tap"); show("settings"); });
    document.querySelectorAll("[data-back]").forEach(function (btn) {
      btn.addEventListener("click", function () { fx("back"); show(btn.dataset.back); });
    });
    $("btn-map-back").addEventListener("click", function () { fx("back"); show("map"); });
    $("btn-hint").addEventListener("click", hint);
    $("btn-undo").addEventListener("click", undo);
    $("btn-retry").addEventListener("click", function () { fx("restart"); startLevel(levelIndex); });

    $("sheet-primary").addEventListener("click", function (e) {
      const act = e.currentTarget.dataset.act;
      if (act !== "undo") fx("tap");
      if (act === "next") startLevel(levelIndex + 1);
      else if (act === "undo") undo();
      else show("map");
    });
    $("sheet-retry").addEventListener("click", function () { fx("restart"); startLevel(levelIndex); });
    $("sheet-map").addEventListener("click", function () { fx("tap"); $("sheet").hidden = true; show("map"); });

    ["slot-hold", "slot-next"].forEach(function (id) {
      const s = $(id);
      s.addEventListener("pointerdown", onSlotDown);
      s.addEventListener("pointermove", onSlotMove);
      s.addEventListener("pointerup", onSlotUp);
      s.addEventListener("pointercancel", function (e) {
        if (pressed && pressed.id === e.pointerId) { pressed = null; drag = null; ghost = null; $("drag").className = ""; renderRack(); }
      });
    });

    // Listen on the stage so taps that land on the haptic overlay still place bricks.
    const stage = $("stage");
    stage.addEventListener("pointerdown", onWallDown);
    stage.addEventListener("pointerup", onWallUp);

    $("set-sfx").checked = save.sfx;
    $("set-haptics").checked = save.haptics;
    $("set-sfx").addEventListener("change", function () { save.sfx = $("set-sfx").checked; persist(); fx("toggle"); });
    $("set-haptics").addEventListener("change", function () {
      save.haptics = $("set-haptics").checked;
      persist();
      if (haptics) haptics.setEnabled(save.haptics);
      fx("toggle");
    });
    if (audio && audio.hasSessionApi()) {
      $("row-silent").hidden = false;
      $("set-silent").checked = save.silentOk !== false;
      $("set-silent").addEventListener("change", function () {
        save.silentOk = $("set-silent").checked;
        persist();
        audio.setSilentOk(save.silentOk);
        fx("toggle");
      });
    }
    $("btn-reset").addEventListener("click", function () {
      fx("tap");
      if (confirm("Clear all stars and progress on this device?")) {
        save.stars = {};
        save.seenIntro = false;
        persist();
        toast("Progress cleared");
      }
    });

    if (window.ResizeObserver) {
      new ResizeObserver(function () { if (engine) { fitWall(); renderRack(); } }).observe($("stage"));
      new ResizeObserver(function () { scene.w = 0; }).observe($("scene"));
    }
    window.addEventListener("resize", function () {
      scene.w = 0;
      if (view === "map") renderMap();
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { if (audio) audio.suspend(); }
      else kick();
    });
  }

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").catch(function () {});
  }

  bind();
  const startView = { home: 1, map: 1, how: 1, settings: 1 }[location.hash.slice(1)] ? location.hash.slice(1) : "home";
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { show(startView); });
  else show(startView);

  NS.debug = {
    engine: function () { return engine; },
    layout: function () { return layout; },
    start: startLevel,
    show: show,
    save: save,
    brickRect: function (r, c, w, h) { return brickRect(r, c, w, h); },
    winSheet: function () { winSheet(); },
    stuckSheet: function () { stuckSheet(); },
    hint: function () { hint(); }
  };
})();
