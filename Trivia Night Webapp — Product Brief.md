# Trivia Night Webapp — Product Brief

Sep 30, 2026 · @Diego Carreon

## Overview

A browser-based, TV-studio-style trivia board for game nights with uni friends: teams take turns picking a question from a 6 × 5 grid, where higher point values mean harder questions.

- **Who plays:** a group of friends split into teams, in one room, with one person hosting.
- **How it runs:** the big screen (TV or projector) shows the board; the host drives everything from their phone, which also shows the correct answers.
- **Where questions come from:** written in a built-in editor or imported from a JSON file, with images and audio supported.
- **Where it lives:** a GitHub repo, deployed on Vercel under your own domain.

## How a game night works

The host sets up on a laptop connected to the TV, pairs their phone with a room code, and runs the whole game from the phone.

1. **Load a game:** the host opens the site on the laptop, picks a saved game or imports a JSON file.
2. **Set up teams:** enter team names and pick a color for each; the order entered is the turn order.
3. **Pair the phone:** the big screen shows a room code and QR code; the host scans it and their phone becomes the remote.
4. **Play turns:** the active team names a category and value; the host taps that tile on the phone and the question opens full-screen on the TV.
5. **Judge:** the team answers out loud; the host marks right or wrong on the phone, and scores update on the TV.
6. **Steal if wrong:** the next team in turn order gets one attempt (full rules below).
7. **Final round:** when the board is cleared, every team wagers on one last question.
8. **Winner screen:** final standings with a celebration moment on the TV.

## Game rules

Only the team that picks a question answers it; a wrong answer costs them the points and passes one steal attempt to the next team in turn order.

| Rule | How it works |
| --- | --- |
| Board | 6 categories × 5 questions, values 100 / 200 / 300 / 400 / 500 |
| Turn order | Teams pick in a fixed rotation; the turn passes to the next team after every question |
| Correct answer | The picking team gains the tile's value |
| Wrong answer | The picking team loses the tile's value (scores can go negative) |
| Steal | The next team in turn order gets one attempt; right = they gain the value, wrong = they lose it |
| Nobody gets it | The host reveals the answer on the TV and the tile is closed |
| Answer timer | Countdown shown on the TV and the host's phone, default 30 s, configurable per game; host can pause or skip |
| Bonus tiles | 1–2 hidden tiles per board; the picking team wagers any amount from 0 up to their score (or 500 if their score is lower), no steal |
| Final wager round | One question after the board is cleared; every team with a positive score wagers secretly, host enters wagers on the phone, all answers revealed together |
| Host override | The host can edit any score at any time to fix mistakes |

Open questions: should a stealing team also lose points on a wrong answer, or is stealing risk-free? Does the turn pass after a successful steal, or does the stealer pick next?

## Screens and views

The app has three surfaces: a big-screen display the room watches, a phone remote only the host sees, and an editor for preparing games beforehand.

### Main display (TV / projector, landscape, 16:9)

- **Lobby:** game title, room code + QR for the host's phone, team list.
- **Board:** 6 category headers, 30 value tiles; played tiles go dark; scoreboard strip along the bottom with the active team highlighted.
- **Question view:** full-screen question text, image or audio, timer ring, category and value.
- **Bonus tile reveal:** a dramatic "Bonus!" animation before the wager.
- **Answer reveal:** correct answer plus which team scored or lost points.
- **Final round:** category reveal, wager lock-in, question, then team-by-team reveal.
- **Winner screen:** podium with final scores.

### Host remote (phone, portrait)

- Mini version of the board to pick tiles.
- The current question **and its correct answer**, never shown on the TV until revealed.
- Big buttons: Correct, Wrong, Reveal answer, Start / pause timer.
- Wager input for bonus tiles and the final round.
- Score editing and undo last action.

### Editor (laptop)

- Create a game: title, 6 categories, 30 questions with answers, optional image/audio per question.
- Mark which tiles are bonus tiles (or randomize).
- Write the final-round question.
- Import JSON, export JSON, and a saved-games list in the browser.

## Question content

A game is one self-contained JSON file: you can write it in the editor or by hand, share it with friends, and reuse it offline.

```json
{
  "title": "Uni Trivia Night #1",
  "timerSeconds": 30,
  "categories": [
    {
      "name": "Campus Lore",
      "questions": [
        {
          "value": 100,
          "question": "Which building has the broken vending machine?",
          "answer": "The library annex",
          "media": { "type": "image", "src": "data:image/jpeg;base64,..." },
          "bonus": false
        }
      ]
    }
  ],
  "final": {
    "category": "Pop Culture",
    "question": "...",
    "answer": "..."
  }
}
```

- **Media:** images and audio are embedded as base64 by default so the file works with no internet; a URL in `src` also works.
- **File size:** keep images under about 500 KB each; the editor compresses images on upload.
- **Validation:** import checks for 6 categories, 5 questions each, and a final question, and shows clear errors if something is missing.

## Visual direction

Game-show glam: it should feel like a TV studio set at night, bold and glowing, readable from the back of a room.

- **Palette:** deep navy or near-black background, electric blue tiles, gold/amber for values and highlights, one hot accent (magenta or cyan) for the active team.
- **Type:** a condensed, heavy display face for values and categories; a clean sans for question text. Question text at least 48 px on the TV.
- **Light and motion:** soft glows on tiles, a marquee-light border on the board, tiles flip open into the question, confetti or spotlight sweep on the winner screen.
- **Sound:** optional stings for tile open, correct, wrong, timer ending and bonus reveal, with a mute toggle on the host remote.
- **Team identity:** each team has a color used on the scoreboard, turn indicator and score animations.
- **Originality:** an original look, not a copy of any TV show's branding, logo or board design.
- **Phone remote:** same palette but utilitarian: big tap targets, high contrast, usable one-handed in a dim room.

## Tech architecture and hosting

A Next.js app on Vercel, with Supabase Realtime keeping the host's phone and the TV in sync, so there is no server of your own to run.

&#91;embedded content: architecture · display, host remote, realtime relay, hosting\]

The TV screen owns the game state; the phone sends actions (pick tile, correct, wrong, wager) and receives the current question and its answer. If the phone drops, it rejoins with the same room code and gets the full state again.

| Piece | Choice | Why |
| --- | --- | --- |
| Framework | Next.js (React) + TypeScript | First-class on Vercel, easy for Claude Code to build |
| Styling and motion | Tailwind CSS + Framer Motion | Fast to theme; handles tile flips, glows, confetti |
| Realtime sync | Supabase Realtime (free tier) | Vercel functions can't hold open websocket connections; Supabase handles it with no backend code |
| Saved games | Browser storage + JSON files | No accounts or database needed for v1 |
| Code | GitHub repo | Every push auto-deploys to Vercel |
| Hosting | Vercel Hobby plan (free) | Preview URL per branch, production on your domain |
| Domain | Added in Vercel project settings | Point DNS at Vercel (A record or CNAME), HTTPS is automatic |

Alternatives to Supabase for sync: PartyKit, Ably or Liveblocks all work the same way; Supabase is picked for its generous free tier and room to add accounts later.

## Scope and next steps

v1 is everything needed for one great night: board, rules, host remote, editor, JSON import/export.

| In v1 | Later |
| --- | --- |
| 6 × 5 board, turn order, steals, negative scores | Players buzz in on their own phones |
| Timer, bonus tiles, final wager round | AI-drafted questions from a topic |
| Host phone remote with answers | Multiple rounds (double values) |
| Editor + JSON import/export, images and audio | Accounts and cloud-saved game library |
| Game-show glam visuals and sound | Stats: best team, hardest category |

### Open questions

- What's the domain, and is it already on Vercel or at another registrar?
  - It is \[\].dcarreon.com / another register is arc.dcarreon.com
- How many teams usually play? The layout assumes 2–6.
  - yeah, like 4
- Does the app need a name or logo?
  - Maybe
- Steal penalty and who picks after a steal (see Game rules).

### Next steps

- [x] Answer the open questions above
- [ ] Design the main display, host remote and editor screens in Claude Design
- [ ] Create the GitHub repo and build the app with Claude Code
- [ ] Create the Supabase project and add its keys to Vercel
- [ ] Deploy on Vercel and connect the domain
- [ ] Write the first game and run a test night
