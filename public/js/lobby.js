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

function renderGame(gameState, hand) {
  homeScreen.classList.add("hidden");
  lobbyScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  document.getElementById("game-room-code").textContent = gameState.code;

  const topCardEl = document.getElementById("top-card");
  const topCardColor = gameState.topCard.activeColor || gameState.topCard.color;
  topCardEl.className = `uno-card ${topCardColor}`;
  topCardEl.textContent = formatCard(gameState.topCard);

  const isMyTurn = gameState.currentPlayerId === mySocketId;
  document.getElementById("turn-info").textContent = isMyTurn
    ? "Your turn!"
    : `${gameState.currentPlayerName}'s turn`;

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
