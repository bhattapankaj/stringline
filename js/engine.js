/* Stringline engine: wall state, bond rules, rack + hold, and a solver used for hints. */
(function (root) {
  const NS = root.STRINGLINE = root.STRINGLINE || {};

  function parseBrick(item) {
    if (typeof item === "number") return { w: item, h: 1 };
    return { w: item.w, h: item.h || 1 };
  }

  const TONES = ["#B8462C", "#C4502F", "#A93F28", "#BF4A2B", "#AE4329", "#C9583A"];

  function Engine(level) {
    this.level = level;
    this.cols = level.wall[0].length;
    this.rows = level.wall.length;
    this.mask = [];   // 0 opening, 1 target, 2 existing brick
    this.fill = [];   // 0 empty, -1 existing, >0 brick id
    this.tall = {};   // brick id -> true for soldiers
    this.placed = [];
    this.source = level.bricks.map(parseBrick);
    this.qi = 0;      // queue is source.slice(qi)
    this.hold = null;
    this.history = [];
    this.nextId = 1;
    this.undos = 0;
    this.hints = 0;
    this.status = "play";

    for (let r = 0; r < this.rows; r += 1) {
      this.mask[r] = [];
      this.fill[r] = [];
      const src = level.wall[this.rows - 1 - r];
      for (let c = 0; c < this.cols; c += 1) {
        const ch = src[c];
        this.mask[r][c] = ch === "#" ? 0 : ch === "x" ? 2 : 1;
        this.fill[r][c] = ch === "x" ? -1 : 0;
      }
    }
  }

  Engine.prototype.next = function () { return this.source[this.qi] || null; };
  Engine.prototype.queue = function () { return this.source.slice(this.qi); };
  Engine.prototype.brickFor = function (from) { return from === "hold" ? this.hold : this.next(); };

  Engine.prototype.isVoid = function (r, c) {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.mask[r][c] === 0;
  };

  Engine.prototype.filled = function (r, c) {
    if (r < 0) return true;
    if (c < 0 || c >= this.cols || r >= this.rows) return false;
    return this.fill[r][c] !== 0;
  };

  // A head joint in row r at boundary b (between columns b-1 and b).
  Engine.prototype.jointAt = function (r, b) {
    if (r < 0 || b <= 0 || b >= this.cols) return false;
    if (this.mask[r][b - 1] === 0 || this.mask[r][b] === 0) return false;
    const L = this.fill[r][b - 1];
    const R = this.fill[r][b];
    if (L === 0 || R === 0 || L === R) return false;
    if (this.tall[L] || this.tall[R]) return false;
    return true;
  };

  // Would an end of a new brick at boundary b in row r become a head joint?
  Engine.prototype.endIsJoint = function (r, b, outside) {
    if (b <= 0 || b >= this.cols) return false;
    return this.mask[r][outside] !== 0;
  };

  Engine.prototype.why = function (r, c, brick) {
    if (!brick) return "none";
    const w = brick.w;
    const h = brick.h;
    if (r < 0 || c < 0 || c + w > this.cols || r + h > this.rows) return "edge";
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const m = this.mask[r + y][c + x];
        if (m === 0) return "opening";
        if (m === 2 || this.fill[r + y][c + x] !== 0) return "taken";
      }
    }
    if (r > 0) {
      let rest = 0;
      for (let x = 0; x < w; x += 1) {
        const cc = c + x;
        if (this.isVoid(r - 1, cc)) continue;
        if (!this.filled(r - 1, cc)) return "support";
        rest += 1;
      }
      if (rest === 0) return "support";
    }
    if (h === 1 && r > 0) {
      if (this.endIsJoint(r, c, c - 1) && this.jointAt(r - 1, c)) return "bond";
      if (this.endIsJoint(r, c + w, c + w) && this.jointAt(r - 1, c + w)) return "bond";
    }
    return "ok";
  };

  Engine.prototype.validAt = function (r, c, brick) { return this.why(r, c, brick) === "ok"; };

  Engine.prototype.placements = function (brick) {
    const out = [];
    if (!brick) return out;
    for (let r = 0; r < this.rows; r += 1) {
      for (let c = 0; c <= this.cols - brick.w; c += 1) {
        if (this.validAt(r, c, brick)) out.push({ r: r, c: c });
      }
    }
    return out;
  };

  Engine.prototype.place = function (from, r, c) {
    if (this.status !== "play") return null;
    const brick = this.brickFor(from);
    if (!brick || !this.validAt(r, c, brick)) return null;
    const id = this.nextId;
    this.nextId += 1;
    for (let y = 0; y < brick.h; y += 1) {
      for (let x = 0; x < brick.w; x += 1) this.fill[r + y][c + x] = id;
    }
    if (brick.h > 1) this.tall[id] = true;
    const rec = { type: "place", from: from, id: id, r: r, c: c, w: brick.w, h: brick.h, brick: brick, tone: TONES[id % TONES.length], born: 0 };
    this.placed.push(rec);
    this.history.push(rec);
    if (from === "hold") this.hold = null;
    else this.qi += 1;
    this.refresh();
    return rec;
  };

  Engine.prototype.canStash = function () {
    return this.status === "play" && !this.hold && !!this.next();
  };

  Engine.prototype.stash = function () {
    if (!this.canStash()) return false;
    this.hold = this.next();
    this.qi += 1;
    this.history.push({ type: "stash" });
    this.refresh();
    return true;
  };

  Engine.prototype.undo = function () {
    if (!this.history.length) return null;
    const rec = this.history.pop();
    if (rec.type === "stash") {
      this.qi -= 1;
      this.hold = null;
    } else {
      for (let y = 0; y < rec.h; y += 1) {
        for (let x = 0; x < rec.w; x += 1) this.fill[rec.r + y][rec.c + x] = 0;
      }
      delete this.tall[rec.id];
      this.placed = this.placed.filter(function (p) { return p.id !== rec.id; });
      if (rec.from === "hold") this.hold = rec.brick;
      else this.qi -= 1;
    }
    this.undos += 1;
    this.status = "play";
    this.refresh();
    return rec;
  };

  Engine.prototype.courseFull = function (r) {
    for (let c = 0; c < this.cols; c += 1) {
      if (this.mask[r][c] === 1 && this.fill[r][c] === 0) return false;
    }
    return true;
  };

  Engine.prototype.wallDone = function () {
    for (let r = 0; r < this.rows; r += 1) if (!this.courseFull(r)) return false;
    return true;
  };

  Engine.prototype.lineRow = function () {
    for (let r = 0; r < this.rows; r += 1) if (!this.courseFull(r)) return r;
    return this.rows;
  };

  Engine.prototype.anyMove = function () {
    if (this.placements(this.next()).length) return true;
    if (this.hold && this.placements(this.hold).length) return true;
    if (this.canStash()) return true;
    return false;
  };

  Engine.prototype.refresh = function () {
    if (this.wallDone()) this.status = "won";
    else if (!this.anyMove()) this.status = "stuck";
    else this.status = "play";
  };

  Engine.prototype.stars = function () {
    const slips = this.undos + this.hints;
    if (slips === 0) return 3;
    if (slips <= 2) return 2;
    return 1;
  };

  /* ---------- Solver ---------- */

  Engine.prototype.key = function () {
    let s = this.qi + "|" + (this.hold ? this.hold.w + "x" + this.hold.h : "-") + "|";
    for (let r = 0; r < this.rows; r += 1) {
      for (let c = 0; c < this.cols; c += 1) {
        const f = this.fill[r][c];
        if (f === 0) s += "0";
        else if (c > 0 && this.fill[r][c - 1] === f) s += "1";
        else s += this.tall[f] ? "3" : "2";
      }
    }
    return s;
  };

  // Fast dead-end check. For every open stretch of a course whose course below is settled,
  // test whether the brick sizes still in play can fill it without stacking a joint.
  // It only ever over-estimates what is possible, so it never cuts a real solution.
  // Fast dead-end check, used to prune the solver. For every open stretch of every course it
  // asks: can the bricks still in play fill this, and what is the least they must spend doing it?
  // Courses whose base is laid also check joints. It only ever under-counts, so it never cuts a
  // real solution.
  Engine.prototype.deadEnd = function () {
    const rest = this.source.slice(this.qi);
    if (this.hold) rest.push(this.hold);
    if (!rest.length) return !this.wallDone();
    const count = {};
    let soldiers = 0;
    rest.forEach(function (b) {
      if (b.h > 1) soldiers += 1;
      else count[b.w] = (count[b.w] || 0) + 1;
    });
    const widths = Object.keys(count).map(Number);
    if (soldiers && !count[1]) widths.push(1);
    // Budgets: halves (soldiers can stand in), and bricks at least 3 or 4 long.
    const classes = [
      { test: function (w) { return w === 1; }, have: (count[1] || 0) + soldiers, need: 0 },
      { test: function (w) { return w >= 3; }, have: (count[3] || 0) + (count[4] || 0) + (count[5] || 0) + (count[6] || 0), need: 0 },
      { test: function (w) { return w >= 4; }, have: (count[4] || 0) + (count[5] || 0) + (count[6] || 0), need: 0 }
    ];
    for (let r = 0; r < this.rows; r += 1) {
      let c = 0;
      while (c < this.cols) {
        if (this.mask[r][c] !== 1 || this.fill[r][c] !== 0) { c += 1; continue; }
        const a = c;
        while (c < this.cols && this.mask[r][c] === 1 && this.fill[r][c] === 0) c += 1;
        let settled = true;
        if (r > 0) {
          for (let x = a; x < c; x += 1) {
            if (this.mask[r - 1][x] === 1 && this.fill[r - 1][x] === 0) { settled = false; break; }
          }
        }
        const mins = this.segmentNeeds(r, a, c, widths, classes, settled);
        if (!mins) return true;
        for (let i = 0; i < classes.length; i += 1) classes[i].need += mins[i];
      }
    }
    for (let i = 0; i < classes.length; i += 1) if (classes[i].need > classes[i].have) return true;
    return false;
  };

  // Can this stretch be filled? If so, the fewest bricks of each class any filling must use.
  Engine.prototype.segmentNeeds = function (r, a, b, widths, classes, settled) {
    const len = b - a;
    const self = this;
    function legal(i, w) {
      const end = i + w;
      if (end > len) return false;
      const x0 = a + i;
      const x1 = a + end;
      if (r === 0) return true;
      let rest = 0;
      for (let x = x0; x < x1; x += 1) if (!self.isVoid(r - 1, x)) rest += 1;
      if (rest === 0) return false;
      if (!settled) return true;
      if (i > 0 && self.jointAt(r - 1, x0)) return false;
      if (end < len && self.jointAt(r - 1, x1)) return false;
      if (end === len && x1 < self.cols && self.mask[r][x1] !== 0 && self.jointAt(r - 1, x1)) return false;
      if (i === 0 && x0 > 0 && self.mask[r][x0 - 1] !== 0 && self.jointAt(r - 1, x0)) return false;
      return true;
    }
    const INF = 1e9;
    const out = [];
    for (let t = 0; t < classes.length; t += 1) {
      const best = new Array(len + 1).fill(INF);
      best[0] = 0;
      for (let i = 0; i < len; i += 1) {
        if (best[i] === INF) continue;
        for (let k = 0; k < widths.length; k += 1) {
          const w = widths[k];
          if (!legal(i, w)) continue;
          const v = best[i] + (classes[t].test(w) ? 1 : 0);
          if (v < best[i + w]) best[i + w] = v;
        }
      }
      if (best[len] === INF) return null;
      out.push(best[len]);
    }
    return out;
  };

  Engine.prototype.moves = function () {
    const out = [];
    const self = this;
    const q = this.next();
    // Lowest course first keeps the search close to how a mason works.
    if (q) this.placements(q).forEach(function (p) { out.push({ type: "place", from: "queue", r: p.r, c: p.c }); });
    if (this.hold) this.placements(this.hold).forEach(function (p) { out.push({ type: "place", from: "hold", r: p.r, c: p.c }); });
    out.sort(function (a, b) { return a.r - b.r || a.c - b.c; });
    if (this.canStash()) out.push({ type: "stash" });
    return out;
  };

  Engine.prototype.apply = function (m) {
    if (m.type === "stash") return this.stash();
    return !!this.place(m.from, m.r, m.c);
  };

  // Returns the first move of a full solution from here, or null. Leaves state untouched.
  Engine.prototype.solve = function (budget) {
    const seen = new Set();
    const self = this;
    const savedStatus = this.status;
    const savedUndos = this.undos;
    let nodes = 0;
    const limit = budget || 200000;
    const path = [];
    function dfs() {
      if (self.wallDone()) return true;
      if (nodes > limit) return false;
      const k = self.key();
      if (seen.has(k)) return false;
      seen.add(k);
      nodes += 1;
      if (self.deadEnd()) return false;
      const ms = self.moves();
      for (let i = 0; i < ms.length; i += 1) {
        self.status = "play";
        if (!self.apply(ms[i])) continue;
        path.push(ms[i]);
        if (dfs()) return true;
        path.pop();
        self.undo();
      }
      return false;
    }
    const ok = dfs();
    for (let i = path.length - 1; i >= 0; i -= 1) this.undo();
    this.undos = savedUndos;
    this.status = savedStatus;
    return { ok: ok, first: ok ? path[0] || null : null, nodes: nodes, path: ok ? path.slice() : null, capped: nodes > limit };
  };

  NS.Engine = Engine;
  NS.parseBrick = parseBrick;
  NS.TONES = TONES;
  if (typeof module !== "undefined") module.exports = NS;
})(typeof window !== "undefined" ? window : globalThis);
