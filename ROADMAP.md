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

## Phase 2 — Core Gameplay *(next up)*

| Task | Status |
|------|--------|
| Play a card (valid move check) | ⬜ |
| Draw card when no valid play | ⬜ |
| Turn rotation (Skip, Reverse) | ⬜ |
| Draw Two (+2 cards) | ⬜ |
| Reshuffle draw pile when empty | ⬜ |

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

1. **Room system** — server-side create/join/leave with 6-char codes  
2. **Lobby UI** — name input, room code, live player list  
3. **Game start** — host deals cards, everyone sees their hand + top card + whose turn  

Next session: actually **play** a card and rotate turns.
