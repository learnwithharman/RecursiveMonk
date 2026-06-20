const socket = io();

const homeScreen = document.getElementById("home-screen");
const lobbyScreen = document.getElementById("lobby-screen");
const gameScreen = document.getElementById("game-screen");
const errorBox = document.getElementById("error-box");
const playerNameInput = document.getElementById("player-name");
const roomCodeInput = document.getElementById("room-code-input");
const roomCodeDisplay = document.getElementById("room-code-display");
const playerList = document.getElementById("player-list");
const playerCount = document.getElementById("player-count");
const btnStart = document.getElementById("btn-start");

let mySocketId = null;
let currentRoom = null;

socket.on("connect", () => {
  mySocketId = socket.id;
});

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
  setTimeout(() => errorBox.classList.add("hidden"), 4000);
}

function getName() {
  return playerNameInput.value.trim() || "Player";
}

function formatCard(card) {
  const labels = {
    skip: "Skip",
    reverse: "Rev",
    draw2: "+2",
    wild: "Wild",
    wild4: "+4",
  };
  return labels[card.value] || card.value;
}

function renderCardEl(card) {
  const el = document.createElement("div");
  const cardColor = card.activeColor || card.color;
  el.className = `uno-card ${cardColor}`;
  el.textContent = card.color === "wild" ? formatCard(card) : `${card.color.slice(0, 1).toUpperCase()} ${formatCard(card)}`;
  return el;
}

function renderLobby(room) {
  currentRoom = room;
  homeScreen.classList.add("hidden");
  gameScreen.classList.add("hidden");
  lobbyScreen.classList.remove("hidden");

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

function getLogClass(type) {
  if (type.startsWith("start")) return "log-item log-start";
  if (type === "skip" || type === "reverse-skip") return "log-item log-skip";
  if (type === "reverse") return "log-item log-reverse";
  if (type === "draw2") return "log-item log-draw2";
  return "log-item log-normal";
}

function formatLogItem(log) {
  if (!log) return "";
  const cardStr = log.card ? `${log.card.color.toUpperCase()} ${formatCard(log.card)}` : "";
  
  switch (log.type) {
    case "start":
      return `Game started! Top card is <strong>${cardStr}</strong>.`;
    case "start-skip":
      return `Game started with <strong>${cardStr}</strong>! <strong>${log.target}</strong> was skipped.`;
    case "start-reverse":
      return `Game started with <strong>${cardStr}</strong>! Play direction is now Counter-clockwise.`;
    case "start-reverse-skip":
      return `Game started with <strong>${cardStr}</strong>! <strong>${log.target}</strong> was skipped.`;
    case "start-draw2":
      return `Game started with <strong>${cardStr}</strong>! <strong>${log.target}</strong> drew 2 cards and was skipped.`;
    case "normal":
      return `<strong>${log.player}</strong> played <strong>${cardStr}</strong>.`;
    case "skip":
      return `<strong>${log.player}</strong> played <strong>${cardStr}</strong>! <strong>${log.target}</strong> was skipped.`;
    case "reverse":
      return `<strong>${log.player}</strong> played <strong>${cardStr}</strong>! Play direction is now ${log.direction === 1 ? "Clockwise" : "Counter-clockwise"}.`;
    case "reverse-skip":
      return `<strong>${log.player}</strong> played <strong>${cardStr}</strong>! <strong>${log.target}</strong> was skipped.`;
    case "draw2":
      return `<strong>${log.player}</strong> played <strong>${cardStr}</strong>! <strong>${log.target}</strong> drew ${log.count} cards and was skipped.`;
    case "draw":
      return `<strong>${log.player}</strong> drew a card.`;
    default:
      return "Unknown game event.";
  }
}

function renderGame(gameState, hand) {
  homeScreen.classList.add("hidden");
  lobbyScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  document.getElementById("game-room-code").textContent = gameState.code;

  const topCardEl = document.getElementById("top-card");
  const topCardColor = gameState.topCard.activeColor || gameState.topCard.color;
  topCardEl.className = `uno-card ${topCardColor}`;
  topCardEl.textContent = formatCard(gameState.topCard);

  // Render Direction Indicator
  const directionIndicator = document.getElementById("direction-indicator");
  const directionArrow = document.getElementById("direction-arrow");
  const directionText = document.getElementById("direction-text");

  if (gameState.direction === 1) {
    directionIndicator.className = "direction-container cw";
    directionArrow.textContent = "↻";
    directionText.textContent = "Clockwise";
  } else {
    directionIndicator.className = "direction-container ccw";
    directionArrow.textContent = "↺";
    directionText.textContent = "Counter-Clockwise";
  }

  const isMyTurn = gameState.currentPlayerId === mySocketId;
  document.getElementById("turn-info").textContent = isMyTurn
    ? "Your turn!"
    : `${gameState.currentPlayerName}'s turn`;

  const drawPileEl = document.getElementById("draw-pile");
  if (isMyTurn) {
    drawPileEl.style.opacity = "1";
    drawPileEl.style.cursor = "pointer";
  } else {
    drawPileEl.style.opacity = "0.6";
    drawPileEl.style.cursor = "not-allowed";
  }

  const gamePlayerList = document.getElementById("game-player-list");
  gamePlayerList.innerHTML = "";
  gameState.players.forEach((player) => {
    const li = document.createElement("li");
    li.textContent = `${player.name} (${player.cardCount} cards)`;
    if (player.id === gameState.currentPlayerId) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "TURN";
      li.appendChild(badge);
    }
    gamePlayerList.appendChild(li);
  });

  const myHandEl = document.getElementById("my-hand");
  myHandEl.innerHTML = "";
  hand.forEach((card, index) => {
    const cardEl = renderCardEl(card);
    if (isMyTurn) {
      cardEl.addEventListener("click", () => {
        socket.emit("play-card", { cardIndex: index });
      });
    } else {
      cardEl.style.opacity = "0.6";
      cardEl.style.cursor = "not-allowed";
    }
    myHandEl.appendChild(cardEl);
  });

  // Render Activity Log
  const gameLogEl = document.getElementById("game-log");
  gameLogEl.innerHTML = "";
  (gameState.logs || []).forEach((log) => {
    const itemEl = document.createElement("div");
    itemEl.className = getLogClass(log.type);
    itemEl.innerHTML = formatLogItem(log);
    gameLogEl.appendChild(itemEl);
  });
  gameLogEl.scrollTop = gameLogEl.scrollHeight;
}

function backToHome() {
  currentRoom = null;
  lobbyScreen.classList.add("hidden");
  gameScreen.classList.add("hidden");
  homeScreen.classList.remove("hidden");
}

document.getElementById("btn-create").addEventListener("click", () => {
  socket.emit("create-room", { name: getName() });
});

document.getElementById("btn-join").addEventListener("click", () => {
  const code = roomCodeInput.value.trim();
  if (!code) {
    showError("Enter a room code");
    return;
  }
  socket.emit("join-room", { code, name: getName() });
});

document.getElementById("btn-leave").addEventListener("click", () => {
  socket.emit("leave-room");
  backToHome();
});

btnStart.addEventListener("click", () => {
  socket.emit("start-game");
});

socket.on("room-joined", renderLobby);
socket.on("room-updated", renderLobby);
socket.on("room-error", showError);

let myHand = [];
let latestGameState = null;

function render() {
  if (latestGameState) {
    renderGame(latestGameState, myHand);
  }
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

document.getElementById("draw-pile").addEventListener("click", () => {
  if (latestGameState && latestGameState.currentPlayerId === mySocketId) {
    socket.emit("draw-card");
  }
});
