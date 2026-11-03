# Stringline design notes

Working notes for the redesign. Research first, then the system we use, then the sprint log.
Every screen and every line of copy should be checked against the "Never do" list before it ships.

---

## 1. Research notes

### What good mobile game home screens do
- One obvious primary action. Royal Match drives everything through a single Play button on the home screen, and event icons sit around it without competing ([Funovus](https://www.funovus.com/blogs/royal-match-dominates-match-3-what-can-all-designers-learn/)).
- The Play button is large and easy to find, and the most prominent options lead straight into the game ([Packt, mobile game design](https://www.packtpub.com/en-IT/learning/how-to-tutorials/mobile-game-design-best-practices)).
- Players want in fast. Keep intro animations short ([Packt](https://www.packtpub.com/en-IT/learning/how-to-tutorials/mobile-game-design-best-practices)).
- The menu should look like the game: same art style, same tone ([Xsolla, game menus](https://xsolla.com/blog/5-words-to-remember-when-designing-your-game-menu)).
- Back sits in the same place on every screen ([Packt](https://www.packtpub.com/en-IT/learning/how-to-tutorials/mobile-game-design-best-practices)).
- What the screen says: the game name, the next level number on the Play button ("Level 12"), and progress. No slogans, no paragraphs.

### What Supercell did in the 2026 Clash of Clans UI rework
Source: [Supercell, "We've revamped the Clash of Clans user interface"](https://supercell.com/en/games/clashofclans/blog/news/weve-revamped-the-clash-of-clans-user-interface/)
- "The right buttons in the right place." Few things were removed. Things moved to where they are used.
- The two core actions get equal weight and sit in the bottom corners, where thumbs are.
- Group by context: anything you do before a battle lives inside the Battle button.
- Show things only when they matter (Clan War and Edit Layout appear when relevant, the shop pip only when there is a reason).
- Each tab shows only the currency it spends. Less clutter, more room.

### Clash-style visual language (what makes it feel like a game and not a website)
- Chunky buttons: thick dark outline, a light top highlight, and a solid darker "lip" under the button so it reads as 3D. Light comes from above, so the shadow sits at the bottom ([3D button anatomy](https://medium.com/fizday/3d-button-anatomy-video-tutorial-on-how-to-create-one-54d31277d998), [Designmodo stacked shadow](https://designmodo.com/3d-css3-button/)).
- White button text with a dark outline or hard drop shadow so it stays readable on bright fills ([Roblox DevForum](https://devforum.roblox.com/t/i-need-help-making-a-specific-type-of-ui/913395)).
- Press state: the button moves down onto its lip. It feels physical.
- Logo is a heavy custom display face. In-game text is cleaner and built for reading numbers fast ([MadeGoodDesigns](https://madegooddesigns.com/?p=9265)).

### Level maps (saga maps)
- A single winding path the player climbs one level at a time. It is the progress bar ([Game Developer](https://www.gamedeveloper.com/design/rethinking-progression-in-mobile-puzzle-games)).
- The path must be continuous and every node must sit on it. A broken path reads as broken progress.
- Open the map scrolled to the current level ([UX Collective on Candy Crush](https://uxdesign.cc/does-candy-crush-have-a-good-ux-3c1a865d24e)).
- New mechanics need room to be learned before they are mixed ([PocketGamer.biz, King interview](https://www.pocketgamer.biz/crafting-candy-crushs-difficulty-blockers-level-design-ai-and-the-complexity-staircase)).

### Spacing and hierarchy
- Use an 8 point scale (4, 8, 16, 24, 32, 48). Related things sit close, groups get more space ([Cieden](https://cieden.com/book/sub-atomic/spacing/spacing-best-practices), [LogRocket](https://blog.logrocket.com/8-best-ways-define-component-spacing-design-system)).
- Internal padding is never larger than the gap outside the element.
- Let whitespace make structure before reaching for borders and boxes ([Buffini grid](https://brand.buffini.com/grid_system)).

### AI slop: the tells we avoid
Sources: [Impeccable, "The visible tells of AI design"](https://impeccable.style/slop), [Pixelslop pattern catalog](https://cdn.jsdelivr.net/npm/pixelslop@0.3.8/dist/skill/resources/ai-slop-patterns.md), [925 Studios](https://www.925studios.co/blog/ai-slop-design-tells), [Why AI keeps building the purple gradient site](https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website)

**Never do**
- Em dashes in copy. Use a full stop.
- Inter, Geist, Roboto, Open Sans, or any font picked by default.
- Purple to blue gradients, cyan on dark, neon glows, gradient text.
- Glassmorphism, blurred panels, glowing orbs, radial halos behind content.
- Rows of identical icon + heading + text cards.
- Cards inside cards. Cards wrapping everything.
- One-sided thick accent borders.
- Pill badge or tiny label above a headline that repeats it.
- Everything centered. Everything the same spacing.
- Every button primary. One primary per screen.
- Bounce and elastic easing on routine UI. Constant wiggling.
- Hype copy ("supercharge", "seamless", "unleash"), "X, not Y" slogans, rule-of-three lists, curly fake-humble phrases.
- Pure #000 and #FFF backgrounds.
- All-caps body text. Caps are for short labels only.
- Text under 14px. Body text at 16px.

---

## 2. Design system

### Palette
Built from the job site: fired brick, mortar, the yellow mason's line, sky, grass, and the dark ink outline that holds Clash-style art together.

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#1F2A44` | Outlines, primary text |
| `--ink-soft` | `#4A5672` | Secondary text |
| `--sky-hi` | `#56B6EE` | Top of the sky |
| `--sky-lo` | `#BFE7FB` | Horizon |
| `--grass` | `#74C043` | Ground |
| `--grass-dk` | `#4C9530` | Ground shade |
| `--brick` | `#C4502F` | Bricks, logo shadow |
| `--brick-dk` | `#86331F` | Brick outline |
| `--mortar` | `#F3EEE4` | Panels |
| `--mortar-dk` | `#D9CFBE` | Panel lip, empty seats |
| `--line` | `#FFC83D` | Stringline, stars, current level |
| `--line-dk` | `#C98A0B` | Gold lip |
| `--go` | `#5BC236` | Primary action |
| `--go-dk` | `#2F8A1F` | Primary lip |
| `--steel` | `#3C8EE0` | Secondary action |
| `--steel-dk` | `#215E9E` | Secondary lip |
| `--stone` | `#A9B2BF` | Locked |

Rules: green is only for the one primary action on a screen. Gold means "the line" (current, stars, hint). Red brick is content, never a button.

### Type
- Display: **Lilita One**. Logo, screen titles, buttons, level numbers. Heavy and rounded like Clash lettering.
- Text: **Nunito** 700 to 900. Hints, labels, body. Rounded to match, very legible at small sizes.
- Scale: 13 label caps, 15 small, 16 body, 20 button, 24 title, 32 big title, 56 logo.
- Button and title text is white with an ink outline and a 2px hard drop shadow.

### Space and shape
- Spacing scale: 4, 8, 12, 16, 24, 32, 48. Screen gutter 16.
- Radius: 14 buttons, 18 panels, full circle for map nodes and icon buttons.
- Outline: 3px ink on chunky elements, 2px on small ones.
- Depth: one solid lip (`0 4px 0`) per raised element. No blurred shadows except under the map nodes.
- Tap targets 44px minimum, primary 64px tall.

### Screens
- **Home**: icon buttons top left (How to play) and top right (Settings), mirrored. The logo over a live scene of a wall building itself course by course with the stringline moving up. The bottom third holds one green Play button that says the next level, and a slim progress bar under it.
- **Map**: one continuous road, drawn with the same curve the nodes are placed on. Bottom to top, like a building going up: grass, then meadow, then sky. Each chapter gets a sign on the road, and a Topped Out sign closes the climb. Opens on the current level.
- **Play**: header (back, level title, undo + restart), live star meter under the title. Donnie and his speech bubble sit up top with the Hint button, using the sky the wide walls leave empty. The wall stands on the ground right above the rack, so every drag is short and stays in thumb reach. Rack: Hold on the left, Next big in the middle, the upcoming bricks on the right.
- **Win / Stuck**: a panel over the dimmed wall. One green button (Next or Undo), small secondary actions.

### Copy voice
Donnie talks like a mason on site: short, plain, specific. Say what to do and where. One idea per line.
Good: "Set the long brick at the left end of course 3."
Bad: "Great job! Let's keep the momentum going and unlock your potential!"

---

## 3. Sprint log

### Sprint 1. Engine and levels
- [x] Fixed the bond rule. It was inverted: it blocked bricks that bridge a joint and allowed stacked joints, so 13 of 24 levels could not be finished.
- [x] Old work now has a toothed edge, the way masons tie new brick into old.
- [x] Hold is now a simple park slot: drag a brick there, use it later.
- [x] Solver in the engine. Every level is generated by `tools/build-levels.js` and proven solvable.
- [x] Difficulty climbs: from level 10 on, the rack order forces you to use Hold.

### Sprint 2. Design system
- [x] Research notes (this file).
- [x] Palette, type, spacing, depth tokens in `css/app.css`.
- [x] Lilita One + Nunito, bundled locally. Anton and Archivo are no longer used.

### Sprint 3. Screens
- [x] Home rebuilt around one Play button and a live wall scene. Removed the star count and location stamp.
- [x] Map rebuilt: continuous road, nodes on the road, chapter signs, no overlaps.
- [x] Play screen: drag and drop from the rack (to the wall or to Hold), snap preview with green outline, gold seat outlines while dragging. Donnie moved into the hint panel above the wall.
- [x] Win and stuck panels.

### Sprint 4. Hints and feedback
- [x] Hint uses the solver: it shows the exact seat for a move that still finishes the wall.
- [x] If the wall can no longer be finished, the hint says how many bricks to undo.
- [x] Wrong drops say why: stacked joint, nothing underneath, opening, already taken.
- [x] Stars count undos and hints together, shown live under the title.

### Sprint 5. QA
- [x] Every level played to the end in a headless browser using real touch drag gestures, including Hold.
- [x] Hint checked on fresh walls, mid-wall, and on broken walls (it asks for the right number of undos).
- [x] Solver prunes dead walls by checking every open stretch against the bricks left, so most dead ends are proven in milliseconds.
- [x] Service worker switched to network first, so a new build shows up without clearing the cache.
- [x] Screenshots checked at 390x844 and 360x740.
- [x] Copy checked against the "Never do" list.

### Sprint 6. Donnie bobblehead and settings
- [x] Split Donnie's art into a head layer and a body layer (`donnie-head.png`, `donnie-body.png`). The head swings from the chin on a damped spring, a true bobblehead instead of the whole-body gif sway.
- [x] Donnie reacts: nods when a brick is laid or a hint is shown, wobbles when a course is finished or the wall is won, shakes his head on a wrong drop or when stuck. Tap him to make his head bounce.
- [x] Full-body Donnie stands on the grass beside the wall on the home screen, as part of the scene, not the hero.
- [x] Settings toggles rebuilt from real elements (track + knob) instead of a pseudo-element on the checkbox, so the knob sits centered in every browser.

### Sprint 7. App icon
Tried three directions: Donnie peeking over a wall, a navy bond-and-line symbol, and a Donnie close-up. None looked like the game. Research says that when the icon does not match what the game is, players resist installing it ([Applied Sciences, 2021](https://mdpi.com/2076-3417/11/21/9911)), and that the icon should share the game's art style and hint at the core gameplay ([Supersonic](https://supersonic.com/learn/blog/5-design-tips-for-hyper-casual-icons-to-improve-your-app-store-cvr/), [Game Developer](https://www.gamedeveloper.com/production/picking-the-perfect-app-icon)).

- [x] **Final icon: the game's core moment, drawn with the game's own painter.** Sky and grass, the wall in running bond between the two posts, the yellow line pulled tight with its line blocks, the last seat outlined in gold, and a brick coming down with the green snap outline the game shows when a drag lands.
- [x] Favicon: the same scene cut down to bricks in bond, the yellow line, sky and grass. Reads at 16 px.
- [x] `tools/icon.html` draws everything with the same palette and brick painting as `js/app.js`. Modes: `app`, `bg`, `fg` (Icon Composer layers), `fav`. Open it in a browser to export PNGs.
- [x] Outputs: 1024 App Store master (opaque, square corners), PWA 192 and 512, Apple touch 180, favicon SVG + 32 + 48 PNG, background and foreground layers in `assets/icon-layers/`.

### Sprint 8. Sound and haptics
Sounds are from Kenney's CC0 packs (Interface Sounds, Impact Sounds, Music Jingles): free for commercial use, no attribution required. Each file is trimmed to start instantly, normalized, and stored as a small mono WAV in `assets/sfx` (about 440 KB total). Jingles were picked by measuring their melody: rising for a win, falling for stuck.

| Moment | Sound | Vibration (Android) |
|---|---|---|
| Any button | short blip (`tap`) | 8 ms |
| Back | soft low blip (`back`) | 8 ms |
| Settings toggle | `toggle` | 10 ms |
| Pick up a brick | light pluck (`pickup`) | 6 ms |
| Brick snaps to a seat while dragging | tiny tick (`snap`) | 4 ms |
| Brick laid | knock plus concrete grit, pitch varies each time (`lay` + `grit`) | 14 ms |
| Drop off the wall, brick returns | quiet `back` | 6 ms |
| Course finished | stringline twang (plucked string synth) + chime (`course`) | 12, 50, 24 |
| Wrong move | low bonk (`wrong`) | 28, 40, 28 |
| Locked level | `locked` + node shake | 20, 30, 20 |
| Hint | glass ding (`hint`) | 10, 30, 10 |
| Park in Hold | `hold` | 12 ms |
| Undo | reverse swoosh (`undo`) | 10 ms |
| Restart | `restart` | 12 ms |
| Win | rising pizzicato jingle (`win`), plus a star ding for each star at rising pitch | 20, 60, 20, 60, 60 |
| Three stars or last wall | bigger rising steel jingle (`win-big`) | longer pattern |
| Stuck | falling pizzicato jingle (`stuck`) | 40, 60, 40 |
| Tap Donnie's head | spring boing synth that wobbles like the head + `bong` | 10, 30, 10, 30, 10 |

iPhone specifics
- Safari has no Vibration API. iOS fires its own haptic when a `<input type="checkbox" switch>` is toggled through a real tap on its label, so every tappable element gets a clear label over it (`js/haptics.js`, same method as the `ios-haptics` library). On iOS 26.5 and later only real taps work, so drags have no haptic there. On older iOS a scripted tap works and every moment above vibrates.
- Audio unlocks inside every gesture until it is running, and the context is rebuilt if a Home Screen app loses it.
- `navigator.audioSession` lets sound play with the silent switch on. Settings has a toggle for this on iPhone.

### Next ideas
- Daily wall with a shared seed.
- Real brick and trowel sound recordings.
- A short first-run demo hand on level 1.
