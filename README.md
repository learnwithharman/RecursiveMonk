# RecursiveMonk — UNO Multiplayer

A real-time, browser-based **UNO** game where friends join the same room and play together online. Built with **Node.js**, **Express**, and **Socket.IO** — no installs, just open a link and play.

---

## What This Project Is

RecursiveMonk UNO is a **multiplayer webpage** that recreates the classic UNO card game in the browser. Each player connects from their own device; the server keeps everyone in sync — whose turn it is, what's on the table, and what's in each hand (privately).

Create or join a room with a 6-character code, wait in the lobby, then play full UNO rounds with standard rules until someone wins.

---

## Features

### Rooms & Lobby
- **Create or join a room** with a 6-character code
- **Lobby screen** with live player list and host badge
- **Host controls** — start game when 2–10 players have joined
- **Rejoin support** — reconnect after a disconnect via saved session (localStorage)

### Gameplay
- **Full 108-card UNO deck** — numbers (0–9), Skip, Reverse, Draw Two, Wild, Wild Draw Four
- **Turn order** with Reverse cards and 2-player skip rules
- **Valid move checks** — match color/number or play a Wild
- **Draw pile & discard pile** with automatic reshuffle
- **UNO! call & challenge** — penalty draw if a player forgets to call UNO
- **Win detection** — first player to empty their hand wins

### Real-Time Multiplayer (Socket.IO)
- **Live card plays** synced across all clients
- **Private hands** — each player only sees their own cards; others see card counts
- **Turn indicators** and play direction (clockwise / counter-clockwise)
- **Activity log** — scrollable feed of game events
- **Quick emotes** — floating reactions during play
- **Disconnect handling** — 30s grace period mid-game before removal

### UI / UX
- **Landing page** — animated owl logo, create/join flow, feature highlights, table mockup
- **Visual card table** — hand at bottom, discard pile center, opponents around the table
- **Wild color picker** modal for Wild / Wild Draw Four
- **Web Audio** sound effects (play, draw, UNO!, error)
- **Mobile-friendly** responsive layout
- **Game over modal** with host-controlled restart

---

## Tech Stack

| Layer      | Technology              |
|-----------|-------------------------|
| Frontend  | HTML, CSS, JavaScript   |
| Backend   | Node.js + Express 5     |
| Real-time | Socket.IO 4             |
| Hosting   | Local dev (port 3000)   |

---

## Project Structure

```
recursivemonk/
├── server.js           # Express + Socket.IO entry point
├── server/
│   ├── rooms.js        # Room create, join, leave, rejoin
│   └── game.js         # Deck, deal, turn logic, UNO rules
├── public/
│   ├── index.html      # Landing, lobby, and game screens
│   ├── css/style.css   # Dark theme + card/table UI
│   └── js/lobby.js     # Client logic, rendering, socket handlers
├── package.json
├── README.md
└── ROADMAP.md
```

---

## Current Status

**MVP complete** — full multiplayer UNO is playable locally with rooms, lobby, core rules, special cards, UNO penalties, rejoin, emotes, and a polished landing page. See [ROADMAP.md](./ROADMAP.md) for what's next (turn timer, chat, deploy, etc.).

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)

### Install & run

```bash
git clone https://github.com/learnwithharman/RecursiveMonk.git
cd RecursiveMonk
npm install
npm start
```

Open **http://localhost:3000** in your browser. Open the same URL in another tab or on another device on your network to test multiplayer.

### How to play
1. Enter your name on the home screen
2. **Create Room** or **Join Room** with a friend's code
3. Host clicks **Start Game** when at least 2 players are in the lobby
4. Match the top discard by color or number, or play a Wild
5. Call **UNO!** when you have one card left — others can challenge if you forget

---

## Socket Events (Overview)

| Client → Server | Purpose |
|----------------|---------|
| `create-room` / `join-room` | Enter a lobby |
| `rejoin-room` | Restore session after refresh |
| `start-game` | Host starts the match |
| `play-card` / `draw-card` | Take a turn |
| `choose-color` | Pick color after Wild |
| `call-uno` / `challenge-uno` | UNO call and penalty |
| `send-emote` | Send a reaction |
| `reset-game` | Host returns lobby to waiting |

| Server → Client | Purpose |
|----------------|---------|
| `room-joined` / `room-updated` | Lobby state |
| `game-started` / `game-updated` | Public game state |
| `your-hand` | Private cards for this player |
| `emote-received` | Floating emote from another player |

---

## Development Roadmap

See **[ROADMAP.md](./ROADMAP.md)** for the full checklist of completed work and upcoming features.

**Next up:** turn timer, in-game chat, share link, custom rules, and cloud deployment.

---

## Repository

https://github.com/learnwithharman/RecursiveMonk

---

## License

ISC
