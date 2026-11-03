/*
  Level builder. Run: node tools/build-levels.js
  For each wall spec it lays a valid running-bond tiling, turns the lay order into a rack,
  applies a few swaps (so Hold matters), and keeps only racks the solver can finish.
  Output: js/levels.js
*/
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const ctx = { console: console, window: {} };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/engine.js"), "utf8").replace('typeof module !== "undefined"', "false"), ctx);
const NS = ctx.window.STRINGLINE;

function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const CHAPTERS = [
  { id: "lead", name: "The Lead", blurb: "Lay true courses", from: 1, to: 8 },
  { id: "open", name: "Openings", blurb: "Windows and doors", from: 9, to: 16 },
  { id: "arch", name: "The Arch", blurb: "Spans and soldiers", from: 17, to: 24 }
];

/*
  wall: top row first. "." = lay brick, "#" = opening, "x" = old brick already there.
  sizes: brick widths the builder may use, best first. long: prefer the longest brick over openings.
  swaps: how many out-of-order bricks in the rack. soldiers: columns on the top course for 1x2 soldiers.
*/
const SPECS = [
  { name: "First Course", sizes: [2], swaps: 0, wall: ["......"],
    hint: "Drag the brick from the rack onto the wall. Fill the whole course." },
  { name: "The Half", sizes: [2, 1], swaps: 0, wall: ["......", "......"],
    hint: "Start course two with the half brick. Joints must never sit on joints." },
  { name: "Keep Off", sizes: [2, 1], swaps: 0, wall: ["........", "........", "........"],
    hint: "Each joint lands over the middle of the brick below. That is running bond." },
  { name: "Ten Feet", sizes: [2, 1], swaps: 0, wall: ["..........", "..........", ".........."],
    hint: "Wider wall, same rule. Half bricks only go at the ends." },
  { name: "Rack Mix", sizes: [2, 1], swaps: 1, wall: ["........", "........", "........"],
    hint: "A brick came up early. Drag it to Hold and use it when it fits." },
  { name: "Utility", sizes: [3, 2, 1], swaps: 1, wall: ["............", "............", "............"],
    hint: "The three-unit brick covers more wall. Use it to reach past a joint." },
  { name: "Old Work", sizes: [2, 1], swaps: 1, wall: ["..........", "x.........", "xx........"],
    hint: "Gray brick is old work with a stepped edge. Lay new brick into the steps." },
  { name: "Lead Wall", sizes: [2, 3, 1], swaps: 2, wall: ["............", "............", "............", "............", "............"],
    hint: "Five courses. Plan one course ahead and keep Hold free." },

  { name: "Punch a Hole", sizes: [2, 1, 3], long: true, swaps: 0, wall: ["..........", "...####...", "...####...", ".........."],
    hint: "The dark gap is a window. Build around it, then cross the top with long bricks." },
  { name: "Jambs", sizes: [2, 1, 3], long: true, swaps: 1, wall: ["............", "....####....", "....####....", "............"],
    hint: "The sides of a window are jambs. Build both up before you cross the top." },
  { name: "Two Lights", sizes: [2, 1, 3, 4], long: true, swaps: 1, wall: ["..............", "..####..####..", "..####..####..", ".............."],
    hint: "Two windows. Keep the pier between them strong." },
  { name: "Door", sizes: [2, 1, 3], long: true, swaps: 1, wall: ["............", "....####....", "....####....", "....####....", "....####...."],
    hint: "A door starts at the ground. Build each side, then close the top." },
  { name: "Lintel Run", sizes: [2, 4, 1], long: true, swaps: 2, wall: ["..............", "....######....", "....######....", ".............."],
    hint: "Save the four-unit brick. It is the only one long enough to cover the window." },
  { name: "The Pier", sizes: [2, 1, 3], long: true, swaps: 1, wall: ["xxx.........", "xxxx..####..", "xxx...####..", "xxxx........"],
    hint: "Old work on the left, a window on the right. Fit the new brick between them." },
  { name: "Ribbon", sizes: [2, 1, 4], long: true, swaps: 2, wall: ["..............", "..............", "....######....", ".............."],
    hint: "A wide low window. Only a four-unit brick reaches far enough to cover it." },
  { name: "School Wall", sizes: [2, 4, 3, 1], long: true, swaps: 2, wall: ["................", "..####....####..", "..####....####..", "..####....####..", "................"],
    hint: "Two tall windows. Watch the rack and hold a long brick for each top." },

  { name: "Headers", sizes: [1, 2], swaps: 2, wall: [".........", ".........", "........."],
    hint: "Lots of half bricks. They can sit anywhere as long as joints stay apart." },
  { name: "Soldier", sizes: [2, 1], soldiers: [4, 5], swaps: 1, wall: ["..........", "..........", ".........."],
    hint: "The tall brick stands on end and fills two courses. Set it on a finished course." },
  { name: "Step In", sizes: [2, 3, 1], long: true, swaps: 2, wall: ["............", "....####....", "...######...", "............"],
    hint: "The opening steps in. Build the sides first, then cross the top." },
  { name: "The Arch", sizes: [2, 3, 4, 1], long: true, swaps: 2, wall: ["..............", ".....####.....", "....######....", "...########...", ".............."],
    hint: "A stepped arch. Each course reaches a little further over the opening." },
  { name: "King Span", sizes: [2, 4, 3, 1], long: true, swaps: 2, wall: ["..............", "....######....", "....######....", "....######....", ".............."],
    hint: "A wide window needs long bricks on top. Do not use them too early." },
  { name: "Odd Width", sizes: [2, 1, 3], swaps: 3, wall: ["...........", "...........", "...........", "..........."],
    hint: "Eleven wide. Some courses need a half brick at one end." },
  { name: "Night Pour", sizes: [2, 4, 3, 1], long: true, swaps: 3, wall: ["................", "...####..####...", "...####..####...", "...####..####...", "................"],
    hint: "Tight rack. Every long brick you hold has a job over a window." },
  { name: "Keep the Line", sizes: [2, 3, 4, 1], long: true, swaps: 3, wall: ["................", ".....######.....", "....########....", "...##########...", "................", "................"],
    hint: "Last wall of the building. No undos and no hints for three stars." }
];

function tile(spec, seed) {
  const r = rng(seed);
  const level = { wall: spec.wall, bricks: [] };
  const e = new NS.Engine(level);
  const order = [];
  const soldierCols = spec.soldiers || [];
  const top = e.rows - 1;
  // Reserve soldier cells: a soldier spans the top two courses.
  function lay(brick, rr, cc) {
    e.source = order.concat([brick]);
    e.qi = order.length;
    e.status = "play";
    const rec = e.place("queue", rr, cc);
    if (rec) order.push(brick);
    return rec;
  }
  function firstEmpty() {
    for (let rr = 0; rr < e.rows; rr += 1) {
      for (let cc = 0; cc < e.cols; cc += 1) {
        if (e.mask[rr][cc] === 1 && e.fill[rr][cc] === 0) {
          if (soldierCols.length && rr >= top - 1 && soldierCols.indexOf(cc) >= 0) continue;
          return { r: rr, c: cc };
        }
      }
    }
    return null;
  }
  let guard = 0;
  function dfs() {
    if (guard++ > 20000) return false;
    const cell = firstEmpty();
    // Soldiers go in once the course under them is done.
    if (soldierCols.length) {
      for (let i = 0; i < soldierCols.length; i += 1) {
        const sc = soldierCols[i];
        if (e.fill[top - 1][sc] === 0 && (!cell || cell.r >= top - 1) && e.courseFull(top - 2)) {
          if (lay({ w: 1, h: 2 }, top - 1, sc)) {
            if (dfs()) return true;
            e.undo();
            order.pop();
            return false;
          }
        }
      }
    }
    if (!cell) return e.wallDone();
    let sizes = spec.sizes.slice();
    // Shuffle a little but keep preference order mostly.
    sizes.sort(function (a, b) { return (spec.sizes.indexOf(a) + r() * 1.6) - (spec.sizes.indexOf(b) + r() * 1.6); });
    if (spec.long && cell.r > 0) {
      let overVoid = false;
      for (let x = 0; x < 4; x += 1) if (e.isVoid(cell.r - 1, cell.c + x)) overVoid = true;
      if (overVoid) sizes = spec.sizes.slice().sort(function (a, b) { return b - a; });
    }
    for (let i = 0; i < sizes.length; i += 1) {
      const b = { w: sizes[i], h: 1 };
      if (lay(b, cell.r, cell.c)) {
        if (dfs()) return true;
        e.undo();
        order.pop();
      }
    }
    return false;
  }
  return dfs() ? order : null;
}

function encode(b) { return b.h > 1 ? { w: b.w, h: b.h } : b.w; }

function solves(spec, bricks, budget) {
  const e = new NS.Engine({ wall: spec.wall, bricks: bricks });
  const t = Date.now();
  const res = e.solve(budget);
  return { ok: res.ok, ms: Date.now() - t, nodes: res.nodes };
}

// Does laying every brick in rack order, bottom-left first, without Hold, get stuck?
function needsHold(spec, bricks) {
  const e = new NS.Engine({ wall: spec.wall, bricks: bricks });
  while (e.status === "play") {
    const spots = e.placements(e.next());
    if (!spots.length) return true;
    e.place("queue", spots[0].r, spots[0].c);
  }
  return e.status !== "won";
}

const LEVELS = [];
SPECS.forEach(function (spec, i) {
  const id = i + 1;
  let order = null;
  let seed = 1000 + id * 7;
  for (let tries = 0; tries < 60 && !order; tries += 1) {
    order = tile(spec, seed + tries * 31);
  }
  if (!order) throw new Error("No tiling for level " + id);
  const base = order.map(encode);
  let bricks = base;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const r = rng(77 + id + attempt * 1013);
    let trialSet = base.slice();
    let applied = 0;
    for (let t = 0; t < 400 && applied < spec.swaps; t += 1) {
      const a = 1 + Math.floor(r() * (trialSet.length - 2));
      const x = NS.parseBrick(trialSet[a]);
      const y = NS.parseBrick(trialSet[a + 1]);
      if (x.w === y.w && x.h === y.h) continue;
      const trial = trialSet.slice();
      trial[a] = trialSet[a + 1];
      trial[a + 1] = trialSet[a];
      const sv = solves(spec, trial, 60000);
      if (sv.ok && sv.ms < 120) {
        trialSet = trial;
        applied += 1;
      }
    }
    bricks = trialSet;
    if (!spec.swaps || needsHold(spec, bricks)) break;
  }
  const applied = spec.swaps;
  const s = solves(spec, bricks, 400000);
  if (!s.ok) throw new Error("Level " + id + " not solvable");
  const chapter = CHAPTERS.find(function (c) { return id >= c.from && id <= c.to; });
  LEVELS.push({ id: id, name: spec.name, chapter: chapter.id, hint: spec.hint, wall: spec.wall, bricks: bricks });
  console.log(String(id).padStart(2), spec.name.padEnd(14), "bricks", String(bricks.length).padStart(2), "swaps", applied + "/" + spec.swaps, "hold", needsHold(spec, bricks) ? "yes" : "no ", "solve", s.ms + "ms");
});

function fmtLevel(lv) {
  const bricks = "[" + lv.bricks.map(function (b) { return typeof b === "number" ? b : "{ w: " + b.w + ", h: " + b.h + " }"; }).join(", ") + "]";
  return [
    "    {",
    "      id: " + lv.id + ",",
    "      name: " + JSON.stringify(lv.name) + ",",
    "      chapter: " + JSON.stringify(lv.chapter) + ",",
    "      hint: " + JSON.stringify(lv.hint) + ",",
    "      wall: [",
    lv.wall.map(function (row) { return "        " + JSON.stringify(row); }).join(",\n"),
    "      ],",
    "      bricks: " + bricks,
    "    }"
  ].join("\n");
}

const out = [
  "/* Generated by tools/build-levels.js. Every rack here is checked solvable. */",
  "(function (root) {",
  "  const NS = root.STRINGLINE = root.STRINGLINE || {};",
  "",
  "  NS.CHAPTERS = " + JSON.stringify(CHAPTERS, null, 2).replace(/\n/g, "\n  ") + ";",
  "",
  "  NS.LEVELS = [",
  LEVELS.map(fmtLevel).join(",\n"),
  "  ];",
  "})(typeof window !== \"undefined\" ? window : globalThis);",
  ""
].join("\n");

fs.writeFileSync(path.join(ROOT, "js/levels.js"), out);
console.log("wrote js/levels.js");
