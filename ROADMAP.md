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
| Turn rotation (Skip, Reverse effects) | ⬜ Next Session |
| Draw Two (+2 card effect) | ⬜ Next Session |
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

## What I built today

1. **Card Playing Logic** — played cards are validated (color/value match) and placed on discard pile.
2. **Turn Rotation** — restricted plays to the active player and advanced turns.
3. **Drawing Cards** — allowed players to draw from the deck, automatically passing the turn, and reshuffling discard pile if empty.

Next session: Special action card effects (Skip, Reverse, Draw Two).
