# RecursiveMonk — 30-Day Dev Roadmap

Personal day-by-day build plan. One small chunk at a time, shipping something playable and polished.

---

## 📅 Completed Work

### **Day 1: Server Setup & Basic Socket Wiring** (May 25)
- [x] Initialize Node.js Express server.
- [x] Integrate Socket.IO for real-time multiplayer connections.
- [x] Design room data structures to hold player metadata.

### **Day 2: Room Creation & Lobby UI** (June 9)
- [x] Create room with unique 6-character room codes.
- [x] Join room code validation on socket endpoints.
- [x] Lobby UI — list players in real time, display host badges, and enforce host start permissions.

### **Day 3: Shuffling, Dealing & Hand Display** (June 19)
- [x] Generate full 108-card UNO deck (number cards, actions, wilds).
- [x] Deal 7 starting cards to players and determine starting top card.
- [x] Render player's private hand dynamically on the client.

### **Day 4: Core Gameplay & Turn Rotation** (June 20)
- [x] Validate playable cards (matching color, number, or wild card).
- [x] Automate drawing from deck and passing turn if playable card is not drawn.
- [x] Basic clockwise/counter-clockwise turn rotation mechanics.

### **Day 5: Action Card Effects & Logger** (June 22)
- [x] Implement Skip, Reverse, and Draw Two (+2) card effects.
- [x] Add directional movement visual indicators (↻ / ↺) in the game header.
- [x] Implement scrollable game activity log for auditing play events.

### **Day 6: Special Rules & UI Polish** (June 23)
- [x] Implement Wild card color selector modal.
- [x] Implement Wild Draw Four (+4) drawing and skipping logic.
- [x] Add "UNO!" call logic, penalty draws, and call buttons.
- [x] Visual redesign: Premium oval card styles, conic gradients, stacked card backs, card deal/play animations, and responsive mobile layouts.

---

## 🚀 Active Development

### **Day 7: Reconnection, Sounds & Emotes** (June 25 - *In Progress*)
- [/] Reconnect/rejoin after browser refresh or disconnect (session restoration via `localStorage`).
- [/] Mid-game disconnect handling (marking player offline, 30s pause timer, game resolution).
- [/] Synthesized Web Audio sound effects for play, draw, UNO calls, and errors.
- [/] Interactive quick emote reactions in sidebar with floating emoji animations.

---

## 📋 Future Roadmap

### **Week 2: Advanced Gameplay (Days 8–14)**
- [ ] **Day 8:** Turn timer indicators (forcing inactive players to auto-draw/auto-pass).
- [ ] **Day 9:** Sound toggle options (mute/unmute buttons in sidebar).
- [ ] **Day 10:** Chat system extension (send typed messages in lobby/game).
- [ ] **Day 11:** Custom rule toggles in lobby (e.g. Draw Two stacking, Jump-in play).
- [ ] **Day 12:** Match statistics (win/loss ratios, cards played counter).
- [ ] **Day 13:** Keyboard shortcuts (1-9 keys to play cards, D to draw).
- [ ] **Day 14:** Interactive tutorial overlay for first-time players.

### **Week 3: Visual Polish & Performance (Days 15–21)**
- [ ] **Day 15:** Smooth CSS table background texture (radial wood/felt felt-like gradients).
- [ ] **Day 16:** Card sorting algorithms (sort by color or value in player's hand).
- [ ] **Day 17:** Turn transition card-deal visual effects.
- [ ] **Day 18:** Avatar customizations (selecting color/icon in lobby).
- [ ] **Day 19:** Custom deck themes (classic, dark mode, vibrant neon).
- [ ] **Day 20:** Performance profiling and socket frame optimizations.
- [ ] **Day 21:** Playtest Alpha: multi-device testing (iOS, Android, desktop browsers) in LAN.

### **Week 4: Deployment & Release (Days 22–30)**
- [ ] **Day 22:** Docker configuration for server packaging.
- [ ] **Day 23:** Deploy server to cloud (Render / Railway / VPS).
- [ ] **Day 24:** Share link generation (one-click copy URL to auto-join lobby).
- [ ] **Day 25:** SSL certificates setup and HTTPS verification.
- [ ] **Day 26:** Database integration (storing active rooms and basic analytics).
- [ ] **Day 27:** Health check endpoints and basic uptime monitoring.
- [ ] **Day 28:** WhatsApp/Messenger quick-share links integration.
- [ ] **Day 29:** Community feedback integration and minor layout adjustments.
- [ ] **Day 30:** Official v1.0 Launch & release documentation.
