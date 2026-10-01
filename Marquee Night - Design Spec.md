# Marquee Night — Design Spec for Claude Code

The companion to `Trivia Night Webapp - Product Brief.md`. The brief covers rules, architecture and the JSON format. This file covers how every screen looks. Visual reference: `Marquee Night Screens.dc.html` (screen IDs 1a–1n below match the badges in that file).

- **App name:** Marquee Night
- **Chosen direction:** A · Studio Glow (1a). Direction B · Marquee Bulbs (1b) is documented at the end as an alternative theme.
- **Steal rule:** risk-free. A wrong steal costs nothing, and the turn passes to the next team as usual.
- **Sample content** in the mocks is placeholder only; real questions come from the user's JSON.

## Design tokens (Direction A)

Put these in `tailwind.config` as theme colors and fonts.

### Colors

| Token | Value | Use |
| --- | --- | --- |
| `bg` | `#050818` | Page background (TV + phone) |
| `bg-glow` | `#1b2e7a` → `#0a1233` → `#050818` | Radial gradient from top-center on the TV board and lobby |
| `panel` | `#0b1438` | Score cards, lobby code card |
| `panel-border` | `#1d2b6b` | 2px borders on panels |
| `cat-bg` / `cat-border` | `#0d1a52` / `#2446c8` | Category header cells |
| `tile` | gradient `#3569ff` → `#1a3fdc` → `#1231b0` (top→bottom) | Open value tiles |
| `tile-played` | `#0a1233`, border `#16225a` | Played tiles (empty, dark) |
| `gold` | `#ffc53d` | Values, highlights, answer card, primary buttons |
| `gold-dark` | `#7a4b00` | 3px hard drop shadow under gold values |
| `hot` | `#ff3ea5` | Active-team ring and "PICKING" tag |
| `text` | `#eef1ff` | Primary text |
| `text-muted` | `#b9c3ff` / `#7d88c4` | Secondary / tertiary text |
| `correct` | `#2fbf5b` (button), `#7ee06b` (score delta) | |
| `wrong` | `#e5484d` (button), `#ff6b6b` (score delta) | |
| `final-bg` | radial `#3a1a5c` → `#140a33` → `#050818` | Final-round screens only (purple shift) |

Team colors (assigned in setup; used for dots, bars and borders):
`#35d6ff` cyan · `#b18cff` violet · `#7ee06b` lime · `#ff8a5c` coral. Add two more for 6 teams: `#ffd35c` yellow, `#ff6b9a` pink.

### Type (Google Fonts)

- **Display:** `Big Shoulders Display` 800/900: values, categories, scores, big labels. Uppercase for categories and labels, letter-spacing 0.04–0.14em.
- **Body:** `Archivo` 400–700: question text, team names, UI.
- **Mono:** `IBM Plex Mono` 500: small meta labels (room code, "ANSWER · HOST ONLY", section eyebrows), letter-spacing 0.1–0.24em.

TV sizes (1920×1080 base, scaled to fit the viewport):
- Tile value: 76px 900 gold, `text-shadow: 0 0 22px rgba(255,197,61,.6), 0 3px 0 #7a4b00`
- Category: 38px 800 uppercase
- Question text: 96px Archivo 600, centered, `text-wrap: balance` (never below 48px; shrink long questions down to that floor)
- Team score: 58px 900; team name 28px 600

### Glow and shape

- Tile shadow: `0 0 28px rgba(53,105,255,.45), inset 0 2px 0 rgba(255,255,255,.35), inset 0 -4px 0 rgba(0,0,0,.25)`, radius 10px
- Active ring: 4px `hot` border, 4px outside the card, `box-shadow: 0 0 32px rgba(255,62,165,.6)`
- Answer card: gold fill, `box-shadow: 0 0 70px rgba(255,197,61,.55)`, radius 20px
- Radii: tiles 10, cards 14–20, phone buttons 12–20

## TV display (16:9, fixed 1920×1080 canvas scaled to fit)

Render at 1920×1080 and use CSS `transform: scale()` to fit the window, letterboxed on `bg`.

### 1c Lobby
Two columns. Left: "MARQUEE NIGHT" wordmark (180px gold, glow), game title (48px), then "TEAMS · TURN ORDER" eyebrow and team pills (color dot + name). Right: a panel with a QR code (340px), "HOST, SCAN OR ENTER", the room code (132px, letter-spacing .12em) and the site URL.

### 1a Board
- Header row (56px): wordmark left, game title center, "ROOM K7QX" mono right.
- 6-column category row (108px tall) above a 6×5 grid of tiles (108px rows, 14px gaps). Padding 32px top, 80px sides.
- Played tiles: dark and empty.
- Scoreboard strip at the bottom: 4 equal cards (132px) with a vertical team-color bar, name and score. The active team gets the hot-pink ring plus a "PICKING" tag on the top-left edge.
- Negative scores use a real minus sign (−300).

### 1a Question view
Background: a brighter radial blue (`#1d3ab8` center). Top-left: category (48px) + value (64px gold). Top-right: timer ring (160px, 12px stroke, track `#18286e`, progress gold, seconds in the center). Center: question text. Bottom: dot + "{Team} answering". Media (image/audio) goes to the left of the text in a 560px block when present (see 1b for that layout).

Transition from the board: the tile flips (Framer Motion rotateY) and scales up to full screen.

### 1d Bonus reveal
Full-bleed dark background with slowly rotating gold spotlight rays (`repeating-conic-gradient`) and a radial vignette. Eyebrow: "FOOD COURT · 300". Center: "BONUS!" at 300px gold with a heavy glow and a hard drop shadow. Below: "{Team}, place your wager" and "Up to {max} · no steal on this tile". Animate: rays rotate, text scales in with overshoot, then a sound sting.

### 1e Answer reveal
Category + value, the question at 44px muted, then the answer in the big gold card (200px display). Result chips at the bottom: the picking team's delta (red −400), and the stealer's chip with a green border/glow, a "STEAL" label and +400. If nobody gets it, show only the answer, with no chips.

### 1f Final round · wager lock-in
Purple background (`final-bg`). Eyebrow "FINAL ROUND", category at 180px, then "Wager in secret. The host is entering bets now." Four team cards across the bottom showing name, score and status: `LOCKED IN` (green), `WAGERING…` (gold), `SITS OUT` (muted, for teams with a score ≤ 0).

### 1g Final round · reveal
Question at the top, answer in a mono label at top-right. Team cards revealed one at a time: their answer (96px), wager and new score. Border is green if correct, red if wrong; cards not yet revealed are dashed and read "UP NEXT".

### 1h Winner
A spotlight cone from the top center. Eyebrow "{GAME TITLE} · CHAMPIONS", the winner's name at 190px gold. Podium blocks at the bottom (2nd blue, 1st gold and tallest, 3rd dark blue) with rank, name and score; 4th+ listed small in the bottom-right. Add confetti in team colors and a spotlight sweep (Framer Motion).

## Host remote (phone, portrait, 390 wide reference)

Utilitarian, one-handed, for a dim room. Same palette. Every tap target is **at least 44px**, and the primary actions are 120px tall.

### 1i Pick a tile
- Top: "ROOM K7QX · LIVE" plus Undo and Mute buttons.
- Turn banner: a hot-pink bordered card, "{Team} are picking".
- Mini board: 6 columns with abbreviated category labels, 52px value tiles; played tiles are dark and disabled.
- Bottom: a 2×2 grid of team scores.

### 1j Question live
Category · value, the question text (18px), then a gold **ANSWER · HOST ONLY** card (the answer is never sent to the TV until it's revealed). Timer (0:18 + bar), with Pause and Skip buttons. Big **CORRECT** (green) / **WRONG** (red) buttons, 120px tall. A secondary "Reveal answer on TV" button.

### 1k Steal attempt
Shown after a Wrong. Header shows the picker's penalty (e.g. "OWLS −400"). A violet "STEAL · RISK-FREE / {Team} get one try" card, the answer card, then CORRECT (+value) and WRONG (grey, "no penalty"). Secondary: "Nobody got it · reveal".

### 1l Wager (bonus + final)
The title "BONUS · {CATEGORY}", "{Team} wager", a large gold-bordered value field, the allowed range hint, a 3×4 keypad (1–9, Max, 0, ⌫), and a "LOCK WAGER" gold button. In the final round, repeat this for each eligible team.

### 1m Edit scores
A "Last: … Undo" row, then a card per team with −/+ steppers (100 per step) around the score; tap the score to type a value. "Done" closes the screen.

## Editor (laptop, 1440×900 reference, fluid)

Three columns: sidebar 260 · board 1fr · inspector 400.

- **Sidebar:** wordmark, New game (gold) + Import, a "SAVED GAMES" list (selected item highlighted), and at the bottom Export JSON + "Play on this screen" (blue).
- **Board:** Title and Timer (s) fields, "Randomize bonus", tabs (Board / Final round), then a 6-column grid: editable category names and 30 question cells (value in gold, a snippet of the question text, a pink `BONUS` badge). Empty cells get a dashed red border and read "Empty" in red; the selected cell gets a 2px blue border. A status line underneath: "22 of 30 written · 2 bonus tiles · final question missing".
- **Inspector:** the selected tile title, a Question textarea, an Answer input, a Media dropzone (striped, "Drop image or audio · compressed to ~500 KB"), a Bonus toggle, and Preview on TV / Save buttons.

## Motion and sound summary

- Tile open: flip + scale to full screen (~600ms)
- Score change: the number counts up/down, with a flash of the delta in green/red
- Active team change: the ring slides to the next card
- Bonus: rays rotate, text overshoots in
- Winner: confetti in team colors + spotlight sweep
- Sounds: tile open, correct, wrong, timer end, bonus. Mute toggle on the remote.

## Alternative theme: Direction B · Marquee Bulbs (1b)

To make this a switchable theme:
- Background `#0c0a09` (warm black). The board sits inside a **bulb frame**: `radial-gradient(circle,#ffe3a3 0 5px,rgba(255,200,90,.25) 6px,transparent 9px) 0 0/30px 30px` on `#1a120a`, 22px padding, radius 18.
- Tiles are flat `#13288f` with a 3px `#f5b83d` border and an inner `#0f1f70` inset; values in `Barlow Condensed` 800 at 80px gold.
- Categories have no box, just a 4px gold underline.
- Team standings go in a 380px right-hand column (a left border in the team color); active team highlight is cyan `#29e3ff` with an "UP" tag.
- The question view has the question inside a single blue card with a gold inner border, media on the left, and a horizontal timer bar at the bottom.
- Body font: `Barlow`.
