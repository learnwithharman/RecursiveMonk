const socket = io();

// === DOM References ===
const homeScreen    = document.getElementById("home-screen");
const lobbyScreen   = document.getElementById("lobby-screen");
const gameScreen    = document.getElementById("game-screen");
const errorBox      = document.getElementById("error-box");
const playerNameInput = document.getElementById("player-name");
const roomCodeInput   = document.getElementById("room-code-input");
const roomCodeDisplay = document.getElementById("room-code-display");
const playerList      = document.getElementById("player-list");
const playerCount     = document.getElementById("player-count");
const btnStart        = document.getElementById("btn-start");
const appContainer    = document.querySelector(".container");

const wildModal          = document.getElementById("wild-modal");
const gameOverModal      = document.getElementById("game-over-modal");
const winnerAnnouncement = document.getElementById("winner-announcement");
const btnRestart         = document.getElementById("btn-restart");
const restartWaitingMsg  = document.getElementById("restart-waiting-msg");
const btnCallUno         = document.getElementById("btn-call-uno");
const btnChallengeUno    = document.getElementById("btn-challenge-uno");

let mySocketId = null;
let currentRoom = null;

socket.on("connect", () => {
  mySocketId = socket.id;
});

// =====================================================
// UTILITIES
// =====================================================

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
  setTimeout(() => errorBox.classList.add("hidden"), 4000);
}

function getName() {
  return playerNameInput.value.trim() || "Player";
}

// =====================================================
// CARD RENDERING
// =====================================================

/**
 * Returns the display symbol for a card value.
 * Used in card corners and center.
 */
function getCardSymbol(card) {
  const symbols = {
    skip:    "⊘",
    reverse: "⇆",
    draw2:   "+2",
    wild:    "★",
    wild4:   "+4",
  };
  return symbols[card.value] !== undefined ? symbols[card.value] : card.value;
}

/**
 * Returns a short text description for use in log messages.
 */
function getCardLabel(card) {
  const labels = { skip: "Skip", reverse: "Reverse", draw2: "+2", wild: "Wild", wild4: "Wild +4" };
  const displayColor = card.activeColor || card.color;
  const value = labels[card.value] || card.value;
  return card.color === "wild"
    ? value
    : `${displayColor.charAt(0).toUpperCase() + displayColor.slice(1)} ${value}`;
}

/**
 * Creates a full UNO card DOM element with proper design.
 * @param {object} card  - { color, value, activeColor? }
 * @param {object} opts  - { playable: bool }
 */
function renderCardEl(card, { playable = true } = {}) {
  const el = document.createElement("div");
  const cardColor = card.activeColor || card.color;
  el.className = `uno-card ${cardColor}`;
  if (!playable) el.classList.add("inactive");

  const symbol = getCardSymbol(card);

  const cornerTop = document.createElement("span");
  cornerTop.className = "card-corner card-corner-top";
  cornerTop.textContent = symbol;

  const center = document.createElement("span");
  center.className = "card-center";
  center.textContent = symbol;

  const cornerBot = document.createElement("span");
  cornerBot.className = "card-corner card-corner-bottom";
  cornerBot.textContent = symbol;

  el.appendChild(cornerTop);
  el.appendChild(center);
  el.appendChild(cornerBot);

  return el;
}

/**
 * Updates the top-card element's appearance and triggers animation.
 */
function updateTopCard(topCard) {
  const el = document.getElementById("top-card");
  const topCardColor = topCard.activeColor || topCard.color;
  const symbol = getCardSymbol(topCard);
  const newKey = `${topCardColor}-${topCard.value}-${topCard.activeColor || ""}`;
  const prevKey = el.dataset.cardKey;

  // Update color class
  el.className = `uno-card ${topCardColor}`;

  // Update text content in spans
  el.querySelector(".card-corner-top").textContent    = symbol;
  el.querySelector(".card-center").textContent        = symbol;
  el.querySelector(".card-corner-bottom").textContent = symbol;

  // Trigger drop-in animation when card changes
  if (prevKey && prevKey !== newKey) {
    void el.offsetWidth; // force reflow to restart animation
    el.classList.add("card-played");
  }
  el.dataset.cardKey = newKey;
}

// =====================================================
// OPPONENT CARD BACKS
// =====================================================

/**
 * Renders all opponent areas with face-down stacked card backs.
 */
function renderOpponents(gameState) {
  const opponents = gameState.players.filter((p) => p.id !== mySocketId);
  const area = document.getElementById("opponents-area");
  area.innerHTML = "";

  if (opponents.length === 0) return;

  opponents.forEach((player) => {
    const wrapper = document.createElement("div");
    wrapper.className = "opponent-wrapper";
    if (player.id === gameState.currentPlayerId) {
      wrapper.classList.add("opponent-active");
    }

    // Name row
    const nameRow = document.createElement("div");
    nameRow.className = "opponent-name-row";

    const nameEl = document.createElement("span");
    nameEl.className = "opponent-name";
    nameEl.textContent = player.name;
    nameRow.appendChild(nameEl);

    if (player.id === gameState.currentPlayerId) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "TURN";
      nameRow.appendChild(badge);
    }

    if (player.calledUno) {
      const unoBadge = document.createElement("span");
      unoBadge.className = "badge-uno";
      unoBadge.textContent = "UNO!";
      nameRow.appendChild(unoBadge);
    }

    const countEl = document.createElement("span");
    countEl.className = "opponent-card-count";
    countEl.textContent = `${player.cardCount} card${player.cardCount !== 1 ? "s" : ""}`;
    nameRow.appendChild(countEl);

    // Stacked face-down cards
    const cardsEl = document.createElement("div");
    cardsEl.className = "opponent-cards";
    const displayCount = Math.min(player.cardCount, 10);
    for (let i = 0; i < displayCount; i++) {
      const cardBack = document.createElement("div");
      cardBack.className = "uno-card card-back";
      cardsEl.appendChild(cardBack);
    }
    if (player.cardCount > 10) {
      const extra = document.createElement("span");
      extra.className = "opponent-card-extra";
      extra.textContent = `+${player.cardCount - 10}`;
      cardsEl.appendChild(extra);
    }

    wrapper.appendChild(nameRow);
    wrapper.appendChild(cardsEl);
    area.appendChild(wrapper);
  });
}

// =====================================================
// LOBBY SCREEN
// =====================================================

function renderLobby(room) {
  currentRoom = room;

  homeScreen.classList.add("hidden");
  gameScreen.classList.add("hidden");
  lobbyScreen.classList.remove("hidden");
  appContainer.classList.remove("game-mode");

  wildModal.classList.add("hidden");
  gameOverModal.classList.add("hidden");

  roomCodeDisplay.textContent = room.code;
  playerList.innerHTML = "";

  room.players.forEach((player) => {
    const li = document.createElement("li");
    li.textContent = player.name;
    if (player.id === room.hostId) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "HOST";
      li.appendChild(badge);
    }
    playerList.appendChild(li);
  });

  playerCount.textContent = `${room.players.length} / 10 players`;

  const isHost = room.hostId === mySocketId;
  btnStart.classList.toggle("hidden", !isHost);
  btnStart.disabled = room.players.length < 2;
}

// =====================================================
// ACTIVITY LOG
// =====================================================

function getLogClass(type) {
  if (type.startsWith("start"))                     return "log-item log-start";
  if (type === "skip" || type === "reverse-skip")   return "log-item log-skip";
  if (type === "reverse")                           return "log-item log-reverse";
  if (type === "draw2" || type === "wild4")         return "log-item log-draw2";
  if (type === "uno-call" || type === "uno-penalty") return "log-item log-uno";
  return "log-item log-normal";
}

function formatLogItem(log) {
  if (!log) return "";
  const cardStr = log.card ? `<strong>${getCardLabel(log.card)}</strong>` : "";

  switch (log.type) {
    case "start":
      return `Game started! Top card: ${cardStr}.`;
    case "start-skip":
      return `Started with ${cardStr}! <strong>${log.target}</strong> skipped.`;
    case "start-reverse":
      return `Started with ${cardStr}! Direction flipped.`;
    case "start-reverse-skip":
      return `Started with ${cardStr}! <strong>${log.target}</strong> skipped.`;
    case "start-draw2":
      return `Started with ${cardStr}! <strong>${log.target}</strong> drew 2, skipped.`;
    case "normal":
      return `<strong>${log.player}</strong> played ${cardStr}.`;
    case "skip":
      return `<strong>${log.player}</strong> played ${cardStr} — <strong>${log.target}</strong> skipped.`;
    case "reverse":
      return `<strong>${log.player}</strong> reversed! Now ${log.direction === 1 ? "Clockwise" : "Counter-CW"}.`;
    case "reverse-skip":
      return `<strong>${log.player}</strong> reversed — <strong>${log.target}</strong> skipped.`;
    case "draw2":
      return `<strong>${log.player}</strong> played +2! <strong>${log.target}</strong> drew ${log.count}.`;
    case "draw":
      return `<strong>${log.player}</strong> drew a card.`;
    case "wild":
      return `<strong>${log.player}</strong> played Wild — choosing color.`;
    case "wild-color":
      return `<strong>${log.player}</strong> chose <strong>${log.color}</strong>.`;
    case "wild4":
      return `<strong>${log.player}</strong> played Wild +4, chose <strong>${log.color}</strong>! <strong>${log.target}</strong> drew ${log.count}.`;
    case "uno-call":
      return `📣 <strong>${log.player}</strong> called <strong>UNO!</strong>`;
    case "uno-penalty":
      return `⚡ <strong>${log.challenger}</strong> challenged <strong>${log.target}</strong>! Drew ${log.count} penalty cards.`;
    default:
      return "Game event.";
  }
}

// =====================================================
// GAME SCREEN
// =====================================================

function renderGame(gameState, hand) {
  homeScreen.classList.add("hidden");
  lobbyScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  appContainer.classList.add("game-mode");

  // Room code
  document.getElementById("game-room-code").textContent = gameState.code;

  // Top card
  updateTopCard(gameState.topCard);

  // Direction indicator
  const dirEl   = document.getElementById("direction-indicator");
  const arrowEl = document.getElementById("direction-arrow");
  const textEl  = document.getElementById("direction-text");

  if (gameState.direction === 1) {
    dirEl.className   = "direction-container cw";
    arrowEl.textContent = "↻";
    textEl.textContent  = "Clockwise";
  } else {
    dirEl.className   = "direction-container ccw";
    arrowEl.textContent = "↺";
    textEl.textContent  = "Counter-CW";
  }

  // Turn pill
  const isMyTurn    = gameState.currentPlayerId === mySocketId;
  const turnInfoEl  = document.getElementById("turn-info");
  turnInfoEl.textContent = isMyTurn ? "⚡ Your turn!" : `${gameState.currentPlayerName}'s turn`;
  turnInfoEl.className   = isMyTurn ? "turn-info-pill my-turn" : "turn-info-pill";

  // Draw pile
  const drawPileEl = document.getElementById("draw-pile");
  drawPileEl.style.opacity       = isMyTurn ? "1"     : "0.5";
  drawPileEl.style.pointerEvents = isMyTurn ? "auto"  : "none";

  // Opponents
  renderOpponents(gameState);

  // Sidebar player list
  const gamePlayerList = document.getElementById("game-player-list");
  gamePlayerList.innerHTML = "";
  gameState.players.forEach((player) => {
    const li = document.createElement("li");
    li.textContent = player.name;
    if (player.id === gameState.currentPlayerId) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "TURN";
      li.appendChild(badge);
    }
    if (player.calledUno) {
      const unoBadge = document.createElement("span");
      unoBadge.className = "badge-uno";
      unoBadge.textContent = "UNO!";
      li.appendChild(unoBadge);
    }
    gamePlayerList.appendChild(li);
  });

  // My hand
  const myHandEl = document.getElementById("my-hand");
  myHandEl.innerHTML = "";
  hand.forEach((card, index) => {
    const cardEl = renderCardEl(card, { playable: isMyTurn });
    // Stagger animation delay so cards "fan in"
    cardEl.style.animationDelay = `${index * 0.04}s`;
    if (isMyTurn) {
      cardEl.addEventListener("click", () => {
        socket.emit("play-card", { cardIndex: index });
      });
    }
    myHandEl.appendChild(cardEl);
  });

  // Activity log
  const gameLogEl = document.getElementById("game-log");
  gameLogEl.innerHTML = "";
  (gameState.logs || []).forEach((log) => {
    const itemEl = document.createElement("div");
    itemEl.className = getLogClass(log.type);
    itemEl.innerHTML = formatLogItem(log);
    gameLogEl.appendChild(itemEl);
  });
  gameLogEl.scrollTop = gameLogEl.scrollHeight;

  // Wild color modal
  if (gameState.pendingWild && gameState.pendingWildPlayerId === mySocketId) {
    wildModal.classList.remove("hidden");
  } else {
    wildModal.classList.add("hidden");
  }

  // Game over modal
  if (gameState.status === "finished") {
    gameOverModal.classList.remove("hidden");
    winnerAnnouncement.textContent = `🎉 ${gameState.winner} won the game!`;
    const isHost = gameState.hostId === mySocketId;
    btnRestart.classList.toggle("hidden", !isHost);
    restartWaitingMsg.classList.toggle("hidden", isHost);
  } else {
    gameOverModal.classList.add("hidden");
  }

  // UNO action buttons
  const me = gameState.players.find((p) => p.id === mySocketId);
  const alreadyCalledUno = me ? me.calledUno : false;

  if (hand.length === 1 && !alreadyCalledUno) {
    btnCallUno.disabled = false;
    btnCallUno.classList.add("pulse-active");
  } else {
    btnCallUno.disabled = true;
    btnCallUno.classList.remove("pulse-active");
  }

  const canChallenge = (gameState.unoPlayers || []).some((id) => id !== mySocketId);
  if (canChallenge) {
    btnChallengeUno.disabled = false;
    btnChallengeUno.classList.add("challenge-pulse");
  } else {
    btnChallengeUno.disabled = true;
    btnChallengeUno.classList.remove("challenge-pulse");
  }
}

function backToHome() {
  currentRoom = null;
  lobbyScreen.classList.add("hidden");
  gameScreen.classList.add("hidden");
  homeScreen.classList.remove("hidden");
  appContainer.classList.remove("game-mode");
}

// =====================================================
// EVENT LISTENERS
// =====================================================

document.getElementById("btn-create").addEventListener("click", () => {
  socket.emit("create-room", { name: getName() });
});

document.getElementById("btn-join").addEventListener("click", () => {
  const code = roomCodeInput.value.trim();
  if (!code) { showError("Please enter a room code."); return; }
  socket.emit("join-room", { code, name: getName() });
});

document.getElementById("btn-leave").addEventListener("click", () => {
  socket.emit("leave-room");
  backToHome();
});

btnStart.addEventListener("click", () => {
  socket.emit("start-game");
});

document.querySelectorAll(".color-picker-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    socket.emit("choose-color", { color: btn.dataset.color });
    wildModal.classList.add("hidden");
  });
});

btnCallUno.addEventListener("click", () => {
  socket.emit("call-uno");
});

btnChallengeUno.addEventListener("click", () => {
  socket.emit("challenge-uno");
});

btnRestart.addEventListener("click", () => {
  socket.emit("reset-game");
  gameOverModal.classList.add("hidden");
});

document.getElementById("draw-pile").addEventListener("click", () => {
  if (latestGameState && latestGameState.currentPlayerId === mySocketId) {
    socket.emit("draw-card");
  }
});

// =====================================================
// SOCKET EVENTS
// =====================================================

socket.on("room-joined",  renderLobby);
socket.on("room-updated", renderLobby);
socket.on("room-error",   showError);

let myHand = [];
let latestGameState = null;

function render() {
  if (latestGameState) renderGame(latestGameState, myHand);
}

socket.on("your-hand", (hand) => {
  myHand = hand;
  render();
});

socket.on("game-started", (gameState) => {
  latestGameState = gameState;
  render();
});

socket.on("game-updated", (gameState) => {
  latestGameState = gameState;
  render();
});
