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

// Rejoin References
const rejoinContainer = document.getElementById("rejoin-container");
const rejoinMsg       = document.getElementById("rejoin-msg");
const btnRejoin      = document.getElementById("btn-rejoin");
const btnClearSession = document.getElementById("btn-clear-session");

let mySocketId = null;
let currentRoom = null;
let lastLogCount = 0;

socket.on("connect", () => {
  mySocketId = socket.id;
});

// =====================================================
// UTILITIES
// =====================================================

function showError(msg) {
  playSound('error');
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
  setTimeout(() => errorBox.classList.add("hidden"), 4000);
}

function getName() {
  return playerNameInput.value.trim() || "Player";
}

// =====================================================
// AUDIO EFFECTS (Web Audio API Synthesizer)
// =====================================================

let audioCtx = null;

function playSound(type) {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'play') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'draw') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.18);
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'uno') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.setValueAtTime(0.1, now + 0.24);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.linearRampToValueAtTime(90, now + 0.25);
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (e) {
    console.warn("Audio Context not supported or allowed", e);
  }
}

// =====================================================
// REJOIN SESSION INFRASTRUCTURE
// =====================================================

function checkRejoinSession() {
  const savedCode = localStorage.getItem("recursivemonk_roomCode");
  const savedName = localStorage.getItem("recursivemonk_playerName");
  const savedPlayerId = localStorage.getItem("recursivemonk_playerId");

  if (savedCode && savedName && savedPlayerId) {
    rejoinMsg.textContent = `Room: ${savedCode} | Name: ${savedName}`;
    rejoinContainer.classList.remove("hidden");
  } else {
    rejoinContainer.classList.add("hidden");
  }
}

// Initialize session check
checkRejoinSession();

// =====================================================
// CARD RENDERING
// =====================================================

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

function getCardLabel(card) {
  const labels = { skip: "Skip", reverse: "Reverse", draw2: "+2", wild: "Wild", wild4: "Wild +4" };
  const displayColor = card.activeColor || card.color;
  const value = labels[card.value] || card.value;
  return card.color === "wild"
    ? value
    : `${displayColor.charAt(0).toUpperCase() + displayColor.slice(1)} ${value}`;
}

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

function updateTopCard(topCard) {
  const el = document.getElementById("top-card");
  const topCardColor = topCard.activeColor || topCard.color;
  const symbol = getCardSymbol(topCard);
  const newKey = `${topCardColor}-${topCard.value}-${topCard.activeColor || ""}`;
  const prevKey = el.dataset.cardKey;

  el.className = `uno-card ${topCardColor}`;

  el.querySelector(".card-corner-top").textContent    = symbol;
  el.querySelector(".card-center").textContent        = symbol;
  el.querySelector(".card-corner-bottom").textContent = symbol;

  if (prevKey && prevKey !== newKey) {
    void el.offsetWidth;
    el.classList.add("card-played");
    playSound('play');
  }
  el.dataset.cardKey = newKey;
}

// =====================================================
// OPPONENT CARD BACKS
// =====================================================

function renderOpponents(gameState) {
  const opponents = gameState.players.filter((p) => p.id !== mySocketId);
  const area = document.getElementById("opponents-area");
  area.innerHTML = "";

  if (opponents.length === 0) return;

  opponents.forEach((player) => {
    const wrapper = document.createElement("div");
    wrapper.className = "opponent-wrapper";
    wrapper.dataset.playerId = player.id;
    if (player.id === gameState.currentPlayerId) {
      wrapper.classList.add("opponent-active");
    }
    if (player.disconnected) {
      wrapper.classList.add("disconnected");
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

    if (player.disconnected) {
      const offBadge = document.createElement("span");
      offBadge.className = "badge-disconnected";
      offBadge.textContent = "OFFLINE";
      nameRow.appendChild(offBadge);
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
    if (player.disconnected) {
      li.classList.add("disconnected-player");
      const offBadge = document.createElement("span");
      offBadge.className = "badge-disconnected";
      offBadge.textContent = "OFFLINE";
      li.appendChild(offBadge);
    }
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
  if (type === "player-disconnect" || type === "player-timeout") return "log-item log-uno";
  if (type === "player-reconnect")                  return "log-item log-reverse";
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
    case "player-disconnect":
      return `⚠️ <strong>${log.player}</strong> disconnected! Waiting 30s to reconnect...`;
    case "player-timeout":
      return `❌ <strong>${log.player}</strong> timed out and left the game.`;
    case "player-reconnect":
      return `✅ <strong>${log.player}</strong> reconnected!`;
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

  document.getElementById("game-room-code").textContent = gameState.code;

  updateTopCard(gameState.topCard);

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

  const isMyTurn    = gameState.currentPlayerId === mySocketId;
  const turnInfoEl  = document.getElementById("turn-info");
  turnInfoEl.textContent = isMyTurn ? "⚡ Your turn!" : `${gameState.currentPlayerName}'s turn`;
  turnInfoEl.className   = isMyTurn ? "turn-info-pill my-turn" : "turn-info-pill";

  const drawPileEl = document.getElementById("draw-pile");
  drawPileEl.style.opacity       = isMyTurn ? "1"     : "0.5";
  drawPileEl.style.pointerEvents = isMyTurn ? "auto"  : "none";

  renderOpponents(gameState);

  // Sidebar player list
  const gamePlayerList = document.getElementById("game-player-list");
  gamePlayerList.innerHTML = "";
  gameState.players.forEach((player) => {
    const li = document.createElement("li");
    li.textContent = player.name;
    if (player.disconnected) {
      li.classList.add("disconnected-player");
      const offBadge = document.createElement("span");
      offBadge.className = "badge-disconnected";
      offBadge.textContent = "OFFLINE";
      li.appendChild(offBadge);
    }
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
    cardEl.style.animationDelay = `${index * 0.04}s`;
    if (isMyTurn) {
      cardEl.addEventListener("click", () => {
        socket.emit("play-card", { cardIndex: index });
      });
    }
    myHandEl.appendChild(cardEl);
  });

  // Activity log sound trigger and render
  const newLogs = gameState.logs || [];
  if (newLogs.length > lastLogCount) {
    const startIdx = Math.max(0, newLogs.length - (newLogs.length - lastLogCount));
    for (let i = startIdx; i < newLogs.length; i++) {
      const log = newLogs[i];
      if (log.type === "uno-call" || log.type === "uno-penalty") {
        playSound('uno');
      } else if (log.type === "draw" || log.type === "draw2" || log.type === "wild4") {
        playSound('draw');
      }
    }
  }
  lastLogCount = newLogs.length;

  const gameLogEl = document.getElementById("game-log");
  gameLogEl.innerHTML = "";
  newLogs.forEach((log) => {
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
// EMOTE REACTIONS UI VISUAL EFFECTS
// =====================================================

function showFloatingEmote(playerId, emote) {
  let targetEl = null;

  if (playerId === mySocketId) {
    targetEl = document.querySelector(".my-hand-area");
  } else {
    targetEl = document.querySelector(`[data-player-id="${playerId}"]`);
  }

  if (!targetEl) return;

  const floatEl = document.createElement("span");
  floatEl.className = "floating-emote";
  floatEl.textContent = emote;

  targetEl.appendChild(floatEl);

  setTimeout(() => {
    floatEl.remove();
  }, 1500);
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
  localStorage.removeItem("recursivemonk_roomCode");
  localStorage.removeItem("recursivemonk_playerName");
  localStorage.removeItem("recursivemonk_playerId");
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
    playSound('draw');
  }
});

// Rejoin button bindings
btnRejoin.addEventListener("click", () => {
  const savedCode = localStorage.getItem("recursivemonk_roomCode");
  const savedPlayerId = localStorage.getItem("recursivemonk_playerId");
  if (savedCode && savedPlayerId) {
    socket.emit("rejoin-room", { code: savedCode, playerId: savedPlayerId });
  }
});

btnClearSession.addEventListener("click", () => {
  localStorage.removeItem("recursivemonk_roomCode");
  localStorage.removeItem("recursivemonk_playerName");
  localStorage.removeItem("recursivemonk_playerId");
  rejoinContainer.classList.add("hidden");
});

// Bind Quick Emotes clicks
document.querySelectorAll(".emote-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    socket.emit("send-emote", { emote: btn.dataset.emote });
  });
});

// =====================================================
// SOCKET EVENTS
// =====================================================

socket.on("room-joined", (data) => {
  const room = data.room || data;
  if (data.playerId) {
    localStorage.setItem("recursivemonk_playerId", data.playerId);
    localStorage.setItem("recursivemonk_roomCode", room.code);
    const myPlayer = room.players.find(p => p.id === socket.id || p.playerId === data.playerId);
    if (myPlayer) {
      localStorage.setItem("recursivemonk_playerName", myPlayer.name);
    }
  }
  renderLobby(room);
  rejoinContainer.classList.add("hidden");
});

socket.on("room-updated", renderLobby);
socket.on("room-error",   showError);

socket.on("rejoin-failed", (errorMsg) => {
  showError(errorMsg);
  localStorage.removeItem("recursivemonk_roomCode");
  localStorage.removeItem("recursivemonk_playerName");
  localStorage.removeItem("recursivemonk_playerId");
  rejoinContainer.classList.add("hidden");
});

socket.on("emote-received", ({ playerId, playerName, emote }) => {
  showFloatingEmote(playerId, emote);
});

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
