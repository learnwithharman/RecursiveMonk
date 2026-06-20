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
| Wild — pick a color | ⬜ |
| Wild Draw Four (+4) | ⬜ |
| "UNO!" call + penalty | ⬜ |
| Win detection + round reset | ⬜ |

---

## Phase 4 — Polish

| Task | Status |
|------|--------|
| Better card UI + animations | ⬜ |
| Mobile layout | ⬜ |
| Sound / emotes (optional) | ⬜ |
| Error handling + edge cases | ⬜ |

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

Next session: Wild card color picking + Wild Draw Four + Win detection.

