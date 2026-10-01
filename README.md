# Marquee Night

A TV-studio trivia board for game nights. The big screen shows a 6 × 5 board; the host runs everything from their phone, which also shows the answers. Teams pick tiles, steal on wrong answers, hit hidden bonus tiles, and finish with a wagered final round.

Product brief and design spec: [Trivia Night Webapp — Product Brief.md](./Trivia%20Night%20Webapp%20%E2%80%94%20Product%20Brief.md) · [Marquee Night - Design Spec.md](./Marquee%20Night%20-%20Design%20Spec.md)

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
```

| Route | What it is |
| --- | --- |
| `/` | Setup on the laptop: pick a saved game, the sample, or a JSON file; enter teams |
| `/tv` | The big screen (1920×1080, scaled to fit). Move the mouse for laptop controls |
| `/host` | The host's phone remote (scan the QR code in the lobby, or type the room code) |
| `/editor` | Write games; saved in this browser, exported as JSON |

### Realtime (phone ↔ TV)

Create `.env.local` with your Supabase project's API settings:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Only Realtime **broadcast** is used (no tables), so the free tier is plenty. Make sure public Realtime channels are allowed in the project settings. Without the keys the app falls back to linking tabs in the same browser, which is handy for development but can't reach a phone.

The QR code points at whatever address the TV page was opened with, so for a real phone during development open the laptop by its LAN IP (or use the deployed URL).

### Laptop shortcuts on `/tv`

`C` correct · `W` wrong · `R` reveal · `Enter` continue · `P` pause/start timer · `S` skip timer · `Z` undo · `M` mute · `F` fullscreen · `H` pin the controls

## Rules (as implemented)

- Correct: picker gains the tile value. Wrong: picker loses it (scores can go negative), and the next team gets one **risk-free** steal. The turn always passes to the next team in order.
- Bonus tiles (up to 2): the picker wagers 0 to their score, or up to 500 if their score is lower. No steal.
- Final round: teams with a positive score wager secretly on the host's phone; answers are revealed lowest score first.
- The host can edit any score and undo the last action at any time.

The answer is never rendered on the TV until it's revealed: the display only ever receives a `PublicView`, which has no answer field until then.

## Game files

A game is one JSON file (format in the product brief). See [`public/sample-game.json`](./public/sample-game.json). Images and audio are embedded as `data:` URIs so a game works offline; the editor compresses images to about 500 KB.

## Development

```bash
npm test           # engine, validation and sound-trigger tests (Vitest)
npm run lint
npm run typecheck
npm run build
```

Code map:

- `src/lib/game/` — the rules engine (pure reducer), TV/phone view projections, JSON validation
- `src/lib/realtime/` — the room channel (Supabase broadcast, BroadcastChannel fallback)
- `src/components/tv/`, `src/components/host/`, `src/components/editor/` — the three surfaces
- `src/lib/sound.ts` — stings synthesized with Web Audio (no audio files)

## Deploying

Import the repo in Vercel, add the two `NEXT_PUBLIC_SUPABASE_*` variables in the project's environment settings, and add your domain under Settings → Domains.
