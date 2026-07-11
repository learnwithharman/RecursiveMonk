# RecursiveMonk — Multiplayer UNO Roadmap

A simple, clean multiplayer UNO game in the browser. Real-time, no accounts — create a room and play.

---

## ✅ Done

### Server & Infrastructure
- [x] Node.js + Express + Socket.IO server setup
- [x] Room creation with 6-character codes (2–10 players)
- [x] Join, leave, and host transfer on disconnect
- [x] Reconnect / rejoin via localStorage session
- [x] Mid-game disconnect handling (30s grace period)

### Game Logic
- [x] Full 108-card UNO deck generation & shuffle
- [x] Deal 7 cards, valid starting top card
- [x] Core turn rotation (clockwise / counter-clockwise)
- [x] Card validation (match color, number, or wild)
- [x] Draw from deck with pile reshuffle
- [x] Skip, Reverse, Draw Two action effects
- [x] Wild card color selection
- [x] Wild Draw Four logic
- [x] UNO! call & penalty challenge system
- [x] Win detection & game-over state
- [x] Host-controlled game reset (return to lobby)

### Client & UI
- [x] Landing page — animated owl SVG logo, create/join UI, feature highlights
- [x] Premium dark theme — header, home grid, table mockup, bottom panels
- [x] Owl interactions — blinking, cursor-tracking pupils, hover wink
- [x] Lobby screen with player list & host badges
- [x] Full game board — opponents, draw/discard piles, hand, sidebar
- [x] Player hand display (private, server-authoritative)
- [x] Wild color picker modal
- [x] Game over modal with restart
- [x] Scrollable game activity log
- [x] Direction indicator (↻ / ↺)
- [x] Web Audio sound effects (play, draw, UNO!, error)
- [x] Quick emote reactions with floating animations
- [x] Player name persistence in localStorage
- [x] Responsive layout for mobile & desktop

---

## 🚧 Up Next

### Gameplay & UX
- [x] **Turn timer** — Auto-draw/pass after 30s inactivity
- [x] **Share link** — One-click copy URL with room code to auto-join
- [x] **Card sort** — Sort hand by color or value
- [x] **Avatar picker** — Choose icon/color in lobby
- [x] **How to Play / Tutorial modals** — Wire up header buttons (UI placeholders exist)
- [x] **Settings panel** — Sound toggle, rule preferences

### Social
- [x] **Chat** — In-lobby and in-game typed messages

### Custom Rules
- [x] **Draw Two stacking** — Optional house rule toggle
- [x] **Jump-in** — Play matching card out of turn (optional)

### Launch
- [ ] **Deploy** — Render / Railway / similar cloud hosting
- [ ] **v1.0 Launch** — Public URL, smoke tests, README badges

---

## 💡 Future Ideas

- Spectator mode
- Round / match scoring across multiple games
- Themed card skins
- Room password or private rooms
- Rate limiting & basic abuse protection
- Automated tests for game logic (`server/game.js`)
