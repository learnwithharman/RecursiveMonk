# RecursiveMonk — UNO Multiplayer

A real-time, browser-based **UNO** game where friends join the same room and play together online. Built with **Node.js**, **Express**, and **Socket.IO** for instant multiplayer sync — no installs, just open a link and play.

---

## What This Project Is

RecursiveMonk UNO is a **multiplayer webpage** that recreates the classic UNO card game in the browser. Each player connects from their own device; the server keeps everyone in sync — whose turn it is, what’s on the table, and what’s in each hand (privately).

The goal is a smooth, room-based experience: create or join a game, wait in a lobby, then play full UNO rounds with standard rules until someone wins.

---

## Planned Features

### Rooms & Lobby
- **Create or join a room** with a short room code or link
- **Lobby screen** showing connected players before the game starts
- **Host controls** — start game when enough players have joined (2–10 players)
- **Rejoin support** so disconnects don’t ruin a match (stretch goal)

### Gameplay
- **Full UNO deck** — number cards (0–9), Skip, Reverse, Draw Two, Wild, Wild Draw Four
- **Turn order** that updates correctly with Reverse cards and player count
- **Valid move checks** — color/number match, or play a Wild
- **Draw pile & discard pile** with reshuffle when the draw pile runs out
- **“UNO!” call** — penalty draw if a player forgets to call it with one card left
- **Win detection** — first player to empty their hand wins the round

### Real-Time Multiplayer (Socket.IO)
- **Live card plays** — when someone plays a card, every client updates instantly
- **Private hands** — each player only sees their own cards; others see card counts
- **Turn indicators** — clear UI for whose turn it is
- **Action broadcasts** — draw, skip, reverse, wild color choice synced for all players
- **Chat** (optional) — quick messages or emotes in the room

### UI / UX
- **Visual card table** — hand at the bottom, discard pile in the center, opponent info around the table
- **Color picker** when playing Wild / Wild Draw Four
- **Animations** for card play and draw (keep it readable, not flashy)
- **Mobile-friendly layout** so phones can join the same game

---

## Tech Stack

| Layer      | Technology        |
|-----------|-------------------|
| Frontend  | HTML, CSS, JavaScript |
| Backend   | Node.js + Express   |
| Real-time | Socket.IO           |
| Hosting   | TBD (local dev on port 3000 for now) |

---

## Current Status

Early prototype — basic Socket.IO wiring is in place (`play-card` / `card-played` events). Next steps: room model, game state on the server, deck logic, and the full game UI.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)

### Install & run

```bash
git clone https://github.com/learnwithharman/RecursiveMonk.git
cd RecursiveMonk
npm install
node server.js
```

Open **http://localhost:3000** in your browser. Open the same URL in another tab or on another device on your network to test multiplayer once rooms are implemented.

---

## Development Roadmap

1. **Phase 1 — Foundation** — Room create/join, player list, basic game state on server  
2. **Phase 2 — Core rules** — Deck, deal, turn flow, valid plays, draw/skip/reverse  
3. **Phase 3 — Special cards** — Wild, Wild Draw Four, UNO call, win condition  
4. **Phase 4 — Polish** — Card UI, animations, mobile layout, error handling  
5. **Phase 5 — Deploy** — Host online so anyone can join with a link  

---

## Repository

https://github.com/learnwithharman/RecursiveMonk

---

## License

ISC
