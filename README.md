# RecursiveMonk — UNO Multiplayer

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen?logo=node.js)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/Platform-Render-46E3B7?logo=render)](https://render.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-black?logo=socket.io)](https://socket.io/)

A real-time, browser-based **UNO** game where friends join the same room and play together online. Built with **Node.js**, **Express**, and **Socket.IO** — no installs, just open a link and play.

---

## 🚀 Play Now

> **Live game →** *(Deploy to Render and paste your URL here)*

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/learnwithharman/RecursiveMonk)

---

## What This Project Is

RecursiveMonk UNO is a **multiplayer webpage** that recreates the classic UNO card game in the browser. Each player connects from their own device; the server keeps everyone in sync — whose turn it is, what's on the table, and what's in each hand (privately).

Create or join a room with a 6-character code, wait in the lobby, then play full UNO rounds with standard rules until someone wins.

---

## Features

### Rooms & Lobby
- **Create or join a room** with a 6-character code
- **Share link** — one-click copy URL that auto-fills the room code for friends
- **Lobby screen** with live player list, host badge, and avatar picker
- **Host controls** — start game, change house rules before starting
- **Rejoin support** — reconnect after a disconnect via saved session (localStorage)

### Gameplay
- **Full 108-card UNO deck** — numbers (0–9), Skip, Reverse, Draw Two, Wild, Wild Draw Four
- **Turn order** with Reverse cards and 2-player skip rules
- **Valid move checks** — match color/number or play a Wild
- **Draw pile & discard pile** with automatic reshuffle
- **Turn timer** — auto-draw after 30 seconds of inactivity
- **UNO! call & challenge** — penalty draw if a player forgets to call UNO
- **Win detection** — first player to empty their hand wins

### Custom House Rules
- **Draw Two stacking** — chain Draw Twos to pass punishment further
- **Jump-in** — play a matching card out of turn

### Real-Time Multiplayer (Socket.IO)
- **Live card plays** synced across all clients
- **Private hands** — each player only sees their own cards; others see card counts
- **Turn indicators** and play direction (clockwise / counter-clockwise)
- **Activity log** — scrollable feed of game events
- **In-game chat** — send messages in the lobby and mid-game
- **Quick emotes** — floating reactions during play
- **Disconnect handling** — 30s grace period mid-game before removal

### UI / UX
- **Landing page** — animated owl logo, create/join flow, feature highlights, table mockup
- **Visual card table** — hand at bottom, discard pile center, opponents around the table
- **Wild color picker** modal for Wild / Wild Draw Four
- **Card sort** — sort your hand by color or value
- **Settings panel** — sound toggle, rule preferences
- **How to Play** modal — in-app rules reference
- **Web Audio** sound effects (play, draw, UNO!, error)
- **Mobile-friendly** responsive layout
- **Game over modal** with host-controlled restart

---

## Tech Stack

| Layer     | Technology             |
|-----------|------------------------|
| Frontend  | HTML, CSS, JavaScript  |
| Backend   | Node.js + Express 5    |
| Real-time | Socket.IO 4            |
| Hosting   | Render (cloud)         |

---

## Project Structure

```
recursivemonk/
├── server.js           # Express + Socket.IO entry point
├── render.yaml         # Render deployment blueprint
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
1. Enter your name and pick an avatar on the home screen
2. **Create Room** or **Join Room** with a friend's code
3. Host optionally enables house rules (stacking, jump-in) then clicks **Start Game**
4. Match the top discard by color or number, or play a Wild
5. Call **UNO!** when you have one card left — others can challenge if you forget
6. First to empty their hand wins!

---

## Deploying to Render

1. Push this repo to GitHub
2. Click the **Deploy to Render** button above (or go to [render.com](https://render.com) → New Web Service → connect your repo)
3. Render auto-detects `render.yaml` and sets up the service — click **Deploy**
4. Your live URL will be `https://recursivemonk.onrender.com` (or similar)

> **Note:** On Render's free tier the service spins down after 15 minutes of inactivity. The first visit after idle may take ~30 seconds to wake up.

---

## Smoke Test Checklist (v1.0)

After deploying, verify the following:

- [ ] Landing page loads at the live URL
- [ ] Create a room — 6-character code appears
- [ ] Copy share link — opens in a new tab and auto-fills the code
- [ ] Join with a second player — both appear in lobby
- [ ] Host starts game — cards are dealt privately
- [ ] Play a valid card — state updates for all players
- [ ] Wild card — color picker appears, choice propagates
- [ ] Draw card — hand updates correctly
- [ ] UNO! button — call and challenge work
- [ ] Turn timer — auto-draws after 30 seconds
- [ ] Chat message — appears for all players
- [ ] Emote — floats above sender's area
- [ ] Disconnect & rejoin — hand is restored
- [ ] Game over modal — host can restart to lobby
- [ ] Sound toggle in settings — audio on/off

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
| `send-chat` | Send a chat message |
| `update-profile` | Change name / avatar / color |
| `update-settings` | Host changes house rules |
| `reset-game` | Host returns lobby to waiting |

| Server → Client | Purpose |
|----------------|---------|
| `room-joined` / `room-updated` | Lobby state |
| `game-started` / `game-updated` | Public game state |
| `your-hand` | Private cards for this player |
| `turn-timer` | Countdown seconds for current turn |
| `emote-received` | Floating emote from another player |
| `chat-message` | Incoming chat message |

---

## Development Roadmap

See **[ROADMAP.md](./ROADMAP.md)** for the full checklist of completed work.

---

## Repository

https://github.com/learnwithharman/RecursiveMonk

---

## License

ISC
