const socket = io();

const homeScreen = document.getElementById("home-screen");
const lobbyScreen = document.getElementById("lobby-screen");
const errorBox = document.getElementById("error-box");
const playerNameInput = document.getElementById("player-name");
const roomCodeInput = document.getElementById("room-code-input");
const roomCodeDisplay = document.getElementById("room-code-display");
const playerList = document.getElementById("player-list");
const playerCount = document.getElementById("player-count");

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

function renderLobby(room) {
  currentRoom = room;
  homeScreen.classList.add("hidden");
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
}

function backToHome() {
  currentRoom = null;
  lobbyScreen.classList.add("hidden");
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

socket.on("room-joined", renderLobby);
socket.on("room-updated", renderLobby);
socket.on("room-error", showError);
