# Stringline

A bricklaying puzzle for phones. Drag bricks from the rack onto the wall and lay every course in running bond: a joint can never sit right on a joint in the course below. Donnie the mason gives hints.

Plain HTML, CSS and JavaScript. No build step. Installable as a PWA.

## Run locally

```
python3 -m http.server 8765
```

Then open http://localhost:8765.

## Deploy

Any static host works. On Vercel, import the repo with the "Other" framework preset and no build command.

## Levels

`js/levels.js` is generated. After changing level specs or engine rules, run:

```
node tools/build-levels.js
```

It lays out every wall, builds the rack, and checks that each level can be finished.

Design notes and research are in [DESIGN.md](DESIGN.md).
