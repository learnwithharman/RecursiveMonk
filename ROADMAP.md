# RecursiveMonk — Dev Roadmap

Personal build plan. One small chunk at a time, ship something playable early.

---

## Phase 1 — Foundation *(in progress)*

| Task | Status |
|------|--------|
| Express + Socket.IO server | ✅ Done |
| Create / join room with code | ✅ Done |
| Lobby — player list, host badge | ✅ Done |
| Host starts game (min 2 players) | ✅ Done |
| Shuffle deck, deal 7 cards, show top card | ✅ Done |
| Rejoin after disconnect | ⬜ Later |

---

## Phase 2 — Core Gameplay *(in progress)*

| Task | Status |
|------|--------|
| Play a card (valid move check) | ✅ Done |
| Draw card & auto-pass turn | ✅ Done |
| Turn rotation (basic) | ✅ Done |
| Turn rotation (Skip, Reverse effects) | ✅ Done |
| Draw Two (+2 card effect) | ✅ Done |
| Reshuffle draw pile when empty | ✅ Done |

---

## Phase 3 — Special Rules

| Task | Status |
|------|--------|
| Wild — pick a color | ✅ Done |
| Wild Draw Four (+4) | ✅ Done |
| "UNO!" call + penalty | ✅ Done |
| Win detection + round reset | ✅ Done |

---

## Phase 4 — Polish

| Task | Status |
|------|--------|
| Proper UNO card design (oval, corners, center symbol) | ✅ Done |
| Two-column game table layout | ✅ Done |
| Opponent face-down card backs (stacked) | ✅ Done |
| Card play + hand fan-in animations | ✅ Done |
| Fixed error toast (works in any screen) | ✅ Done |
| Mobile responsive layout (single-column on small screens) | ✅ Done |
| Sound / emotes (optional) | ⬜ |
| Error handling + edge cases (disconnect mid-game) | ⬜ |

---

## Phase 5 — Deploy

| Task | Status |
|------|--------|
| Deploy server (Render / Railway / VPS) | ⬜ |
| Share link — anyone can join | ⬜ |

---

## What I built today (Day 2)

1. **Skip Card** — Playing a Skip card advances the turn by 2, bypassing the next player completely.
2. **Reverse Card** — Flips the play direction (Clockwise ↔ Counter-clockwise). In a 2-player game, acts as a Skip (same player goes again).
3. **Draw Two (+2)** — The next player draws 2 cards from the deck and their turn is skipped.
4. **Starting Card Effects** — If a special card (Skip, Reverse, Draw Two) is the top card at game start, its effect applies immediately before the first turn.
5. **drawFromDeck() helper** — Refactored card drawing logic into a shared function that auto-reshuffles the discard pile when the draw pile is empty.
6. **Direction Indicator** — A live ↻/↺ indicator with animated color-coded glow shows the current play direction (Clockwise = green, Counter-Clockwise = red).
7. **Activity Log** — A scrollable, color-coded log panel records every game event (plays, draws, skips, reverses, draw twos) with formatted human-readable messages.

---

## What I built today (Day 3)

1. **Proper UNO Card Design** — Cards now look like real UNO cards: rotated oval decoration, corner labels (top-left / bottom-right), large center symbol, gradient color backgrounds.
2. **Wild Card 4-Color Design** — Wild cards use a conic-gradient for the classic 4-quadrant red/yellow/green/blue look.
3. **Opponent Card Backs** — Other players' cards are shown as stacked face-down card backs (up to 10 visible, overlapping for depth).
4. **Two-Column Game Layout** — Game screen now uses a proper table layout: play area on the left (opponents + center + hand), sidebar on the right (action buttons + player list + log).
5. **Card Animations** — Hand cards fan in with staggered delays; the discard pile top card does a drop-in bounce animation every time a new card is played.
6. **Game-Mode Container** — Container expands from 480px to 1080px when the game starts, then collapses back on return to lobby.
7. **Fixed Error Toast** — Error messages now appear as a fixed toast at the top of the screen, visible in all screens including during gameplay.
8. **Mobile Responsive** — On screens under 820px, the sidebar collapses into a 2-column grid below the play area. On small phones, everything stacks vertically.

Next session: Deploy to Render/Railway so anyone can join with a link.

