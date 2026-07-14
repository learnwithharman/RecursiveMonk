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

// Chat references
const lobbyChatMessages = document.getElementById("lobby-chat-messages");
const lobbyChatInput    = document.getElementById("lobby-chat-input");
const lobbyChatSend     = document.getElementById("lobby-chat-send");
const gameChatMessages  = document.getElementById("game-chat-messages");
const gameChatInput     = document.getElementById("game-chat-input");
const gameChatSend      = document.getElementById("game-chat-send");

let mySocketId = null;
let currentRoom = null;
let lastLogCount = 0;
let sortBy = localStorage.getItem("recursivemonk_sortBy") || "none";

// Turn timer state
let turnTimerInterval = null;
let turnTimerSeconds  = 0;
const TURN_DURATION   = 30; // seconds, must match server

socket.on("connect", () => {
  mySocketId = socket.id;
});

// =====================================================
// URL PARAM: Auto-fill room code from ?room=CODE
// =====================================================
(function checkUrlRoomParam() {
  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get("room");
  if (roomParam && roomCodeInput) {
    roomCodeInput.value = roomParam.toUpperCase();
    // Scroll home-left into view so the join input is visible
    const joinWrapper = document.querySelector(".join-room-wrapper");
    if (joinWrapper) joinWrapper.scrollIntoView({ behavior: "smooth", block: "center" });
  }
})();


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

function updateMyProfileBadge() {
  const name = localStorage.getItem("recursivemonk_playerName") || "RecursiveMonk";
  const avatar = localStorage.getItem("recursivemonk_playerAvatar") || "👤";
  const color = localStorage.getItem("recursivemonk_playerColor") || "#e2e8f0";
  
  const headerNameInput = document.getElementById("player-name");
  if (headerNameInput) headerNameInput.value = name;
  
  const avatarIcon = document.querySelector(".avatar-circle .avatar-icon");
  if (avatarIcon) {
    avatarIcon.textContent = avatar === "owl" ? "🦉" : avatar;
  }
  
  const avatarCircle = document.querySelector(".avatar-circle");
  if (avatarCircle) {
    avatarCircle.style.background = `linear-gradient(135deg, ${color}, rgba(0, 0, 0, 0.4))`;
  }
}

// =====================================================
// AUDIO EFFECTS (Web Audio API Synthesizer)
// =====================================================

let audioCtx = null;

function playSound(type) {
  try {
    const soundEnabled = localStorage.getItem("recursivemonk_soundEnabled") !== "false";
    if (!soundEnabled) return;

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

// Initialize Profile Badge and Name input
updateMyProfileBadge();

// Initialize sound state
const initialSound = localStorage.getItem("recursivemonk_soundEnabled") !== "false";
updateSoundIconState(initialSound);

// Initialize sort button active states
document.getElementById("sort-none").classList.toggle("active", sortBy === "none");
document.getElementById("sort-color").classList.toggle("active", sortBy === "color");
document.getElementById("sort-value").classList.toggle("active", sortBy === "value");

playerNameInput.addEventListener("change", () => {
  const newName = playerNameInput.value.trim() || "Player";
  localStorage.setItem("recursivemonk_playerName", newName);
  socket.emit("update-profile", {
    name: newName,
    avatar: localStorage.getItem("recursivemonk_playerAvatar") || "👤",
    color: localStorage.getItem("recursivemonk_playerColor") || "#e2e8f0"
  });
  updateMyProfileBadge();
});

// =====================================================
// CARD RENDERING
// =====================================================

function getCardSymbol(card) {
  const symbols = {
    skip:    "⊘",
    reverse: "⇆",
    draw2:   "+2",
    wild:    "WILD",
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

// =====================================================
// UNO PENALTY TOAST
// =====================================================
function showUnoPenaltyToast(message, sub) {
  // Remove existing toast
  const existing = document.querySelector(".uno-penalty-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "uno-penalty-toast";
  toast.innerHTML = `
    <span class="penalty-icon">💳</span>
    ${message}
    <span class="penalty-sub">${sub}</span>
  `;
  document.body.appendChild(toast);

  // Auto-remove after 2.5s with fade-out
  setTimeout(() => {
    toast.style.animation = "penaltyToastOut 0.4s ease-in both";
    setTimeout(() => toast.remove(), 400);
  }, 2500);
}

// =====================================================
// CARD RENDERING — Premium Design
// =====================================================

function renderCardEl(card, { playable = true } = {}) {
  const el = document.createElement("div");
  const cardColor = card.activeColor || card.color;
  el.className = `uno-card ${cardColor}`;
  if (!playable) el.classList.add("inactive");

  const isWild   = card.color === "wild";
  const isWild4  = card.value === "wild4";
  const isRev    = card.value === "reverse";
  const isNum    = !isWild && !isRev && card.value !== "skip" && card.value !== "draw2";
  const isSkip   = card.value === "skip";
  const isDraw2  = card.value === "draw2";

  const cornerSymbol = isWild4 ? "+4" : isWild ? "★" : getCardSymbol(card);

  // Top-left corner
  const cornerTop = document.createElement("span");
  cornerTop.className = "card-corner card-corner-top";
  cornerTop.textContent = cornerSymbol;
  el.appendChild(cornerTop);

  // Bottom-right corner (mirrored)
  const cornerBot = document.createElement("span");
  cornerBot.className = "card-corner card-corner-bottom";
  cornerBot.textContent = cornerSymbol;
  el.appendChild(cornerBot);

  if (isWild) {
    // Wild: black circle center ring
    const ring = document.createElement("div");
    ring.className = "card-wild-ring";
    const label = document.createElement("span");
    label.className = "wild-label";
    label.textContent = isWild4 ? "+4" : "WILD";
    ring.appendChild(label);
    el.appendChild(ring);

    if (isWild4) {
      // Extra corner indicators for wild4
      const badge = document.createElement("div");
      badge.className = "card-wild4-badge";
      badge.textContent = "+4";
      el.appendChild(badge);
    }

  } else if (isRev) {
    // Reverse: stacked arrows
    const arrows = document.createElement("div");
    arrows.className = "card-reverse-arrows";
    const top = document.createElement("span");
    top.className = "arr-top";
    top.textContent = "➺";
    const bot = document.createElement("span");
    bot.className = "arr-bot";
    bot.textContent = "➺";
    arrows.appendChild(top);
    arrows.appendChild(bot);
    el.appendChild(arrows);

  } else {
    // Number / Skip / Draw2: large center text
    const center = document.createElement("span");
    center.className = "card-center";
    center.textContent = isDraw2 ? "+2" : isSkip ? "⊘" : card.value;
    el.appendChild(center);
  }

  return el;
}

function updateTopCard(topCard) {
  const el = document.getElementById("top-card");
  const topCardColor = topCard.activeColor || topCard.color;
  const isWild   = topCard.color === "wild";
  const isWild4  = topCard.value === "wild4";
  const isRev    = topCard.value === "reverse";
  const isDraw2  = topCard.value === "draw2";
  const isSkip   = topCard.value === "skip";
  const newKey   = `${topCardColor}-${topCard.value}-${topCard.activeColor || ""}`;
  const prevKey  = el.dataset.cardKey;

  el.className = `uno-card ${topCardColor}`;
  el.innerHTML = "";

  // Corner symbol
  const cornerSymbol = isWild4 ? "+4" : isWild ? "★" : isDraw2 ? "+2" : isSkip ? "⊘" : isRev ? "⇆" : topCard.value;

  const ct = document.createElement("span");
  ct.className = "card-corner card-corner-top";
  ct.textContent = cornerSymbol;
  el.appendChild(ct);

  const cb = document.createElement("span");
  cb.className = "card-corner card-corner-bottom";
  cb.textContent = cornerSymbol;
  el.appendChild(cb);

  if (isWild) {
    const ring = document.createElement("div");
    ring.className = "card-wild-ring";
    const lbl = document.createElement("span");
    lbl.className = "wild-label";
    lbl.textContent = isWild4 ? "+4" : "WILD";
    ring.appendChild(lbl);
    el.appendChild(ring);
    if (isWild4) {
      const badge = document.createElement("div");
      badge.className = "card-wild4-badge";
      badge.textContent = "+4";
      el.appendChild(badge);
    }
  } else if (isRev) {
    const arrows = document.createElement("div");
    arrows.className = "card-reverse-arrows";
    const top = document.createElement("span");
    top.className = "arr-top"; top.textContent = "➺";
    const bot = document.createElement("span");
    bot.className = "arr-bot"; bot.textContent = "➺";
    arrows.appendChild(top); arrows.appendChild(bot);
    el.appendChild(arrows);
  } else {
    const center = document.createElement("span");
    center.className = "card-center";
    center.textContent = isDraw2 ? "+2" : isSkip ? "⊘" : topCard.value;
    el.appendChild(center);
  }

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

    const avatarEl = document.createElement("span");
    avatarEl.className = "opponent-avatar";
    avatarEl.style.marginRight = "0.4rem";
    avatarEl.style.fontSize = "1rem";
    avatarEl.textContent = player.avatar === "owl" ? "🦉" : (player.avatar || "👤");
    nameRow.appendChild(avatarEl);

    const nameEl = document.createElement("span");
    nameEl.className = "opponent-name";
    nameEl.textContent = player.name;
    nameEl.style.color = player.color || "#e2e8f0";
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
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.gap = "0.5rem";

    const avatarEl = document.createElement("span");
    avatarEl.textContent = player.avatar === "owl" ? "🦉" : (player.avatar || "👤");
    avatarEl.style.fontSize = "1.1rem";
    li.appendChild(avatarEl);

    const nameEl = document.createElement("span");
    nameEl.textContent = player.name;
    nameEl.style.color = player.color || "#e2e8f0";
    nameEl.style.fontWeight = "600";
    li.appendChild(nameEl);

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
  if (type.startsWith("start"))                      return "log-item log-start";
  if (type === "skip" || type === "reverse-skip")    return "log-item log-skip";
  if (type === "reverse")                            return "log-item log-reverse";
  if (type === "draw2" || type === "wild4" || type === "draw2-stacked" || type === "draw2-penalty") return "log-item log-draw2";
  if (type === "uno-call" || type === "uno-penalty" || type === "uno-penalty-self") return "log-item log-uno";
  if (type === "player-disconnect" || type === "player-timeout") return "log-item log-uno";
  if (type === "player-timeout-draw")                             return "log-item log-skip";
  if (type === "player-reconnect")                               return "log-item log-reverse";
  return "log-item log-normal";
}

function formatLogItem(log) {
  if (!log) return "";
  const cardStr = log.card ? `<strong>${getCardLabel(log.card)}</strong>` : "";
  const prefix = log.jumpIn ? `⚡ <strong>[Jump-in]</strong> ` : "";

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
      return `${prefix}<strong>${log.player}</strong> played ${cardStr}.`;
    case "skip":
      return `${prefix}<strong>${log.player}</strong> played ${cardStr} — <strong>${log.target}</strong> skipped.`;
    case "reverse":
      return `${prefix}<strong>${log.player}</strong> reversed! Now ${log.direction === 1 ? "Clockwise" : "Counter-CW"}.`;
    case "reverse-skip":
      return `${prefix}<strong>${log.player}</strong> reversed — <strong>${log.target}</strong> skipped.`;
    case "draw2":
      return `${prefix}<strong>${log.player}</strong> played +2! <strong>${log.target}</strong> drew ${log.count}.`;
    case "draw2-stacked":
      return `${prefix}<strong>${log.player}</strong> played +2! Stacked to <strong>+${log.count}</strong>.`;
    case "draw2-penalty":
      return `<strong>${log.player}</strong> drew <strong>${log.count}</strong> cards from stack penalty.`;
    case "draw":
      return `<strong>${log.player}</strong> drew a card.`;
    case "wild":
      return `${prefix}<strong>${log.player}</strong> played Wild — choosing color.`;
    case "wild-color":
      return `<strong>${log.player}</strong> chose <strong>${log.color}</strong>.`;
    case "wild4":
      return `${prefix}<strong>${log.player}</strong> played Wild +4, chose <strong>${log.color}</strong>! <strong>${log.target}</strong> drew ${log.count}.`;
    case "uno-call":
      return `📣 <strong>${log.player}</strong> called <strong>UNO!</strong>`;
    case "uno-penalty":
      return `⚡ <strong>${log.challenger}</strong> challenged <strong>${log.target}</strong>! Drew ${log.count} penalty cards.`;
    case "uno-penalty-self":
      return `💳 <strong>${log.player}</strong> forgot UNO! Drew ${log.count} penalty cards.`;
    case "player-disconnect":
      return `⚠️ <strong>${log.player}</strong> disconnected! Waiting 30s to reconnect...`;
    case "player-timeout":
      return `❌ <strong>${log.player}</strong> timed out and left the game.`;
    case "player-timeout-draw":
      return `⏱️ <strong>${log.player}</strong> ran out of time — a card was drawn automatically.`;
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

  // Restart the local countdown timer on every state update while game is active
  if (gameState.status === "playing" && !gameState.pendingWild && !gameState.winner) {
    startTurnTimer(isMyTurn);
  } else {
    stopTurnTimer();
  }

  const drawPileEl = document.getElementById("draw-pile");
  drawPileEl.style.opacity       = isMyTurn ? "1"     : "0.5";
  drawPileEl.style.pointerEvents = isMyTurn ? "auto"  : "none";

  renderOpponents(gameState);

  // Sidebar player list
  const gamePlayerList = document.getElementById("game-player-list");
  gamePlayerList.innerHTML = "";
  gameState.players.forEach((player) => {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.gap = "0.4rem";

    const avatarEl = document.createElement("span");
    avatarEl.textContent = player.avatar === "owl" ? "🦉" : (player.avatar || "👤");
    avatarEl.style.fontSize = "1rem";
    li.appendChild(avatarEl);

    const nameEl = document.createElement("span");
    nameEl.textContent = player.name;
    nameEl.style.color = player.color || "#e2e8f0";
    nameEl.style.fontWeight = "600";
    li.appendChild(nameEl);

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

  // Sort hand cards locally while preserving original server indices
  let handWithIndices = hand.map((card, originalIndex) => ({ card, originalIndex }));
  if (sortBy === "color") {
    handWithIndices.sort((a, b) => {
      const colorOrder = { red: 0, yellow: 1, green: 2, blue: 3, wild: 4 };
      const colorA = a.card.color;
      const colorB = b.card.color;
      if (colorOrder[colorA] !== colorOrder[colorB]) {
        return colorOrder[colorA] - colorOrder[colorB];
      }
      return a.card.value.localeCompare(b.card.value);
    });
  } else if (sortBy === "value") {
    handWithIndices.sort((a, b) => {
      const valA = a.card.value;
      const valB = b.card.value;
      if (valA !== valB) {
        return valA.localeCompare(valB);
      }
      const colorOrder = { red: 0, yellow: 1, green: 2, blue: 3, wild: 4 };
      return colorOrder[a.card.color] - colorOrder[b.card.color];
    });
  }

  const me = gameState.players.find((p) => p.id === mySocketId);
  const alreadyCalledUno = me ? me.calledUno : false;

  handWithIndices.forEach(({ card, originalIndex }, displayIndex) => {
    const cardEl = renderCardEl(card, { playable: isMyTurn });
    cardEl.style.animationDelay = `${displayIndex * 0.04}s`;

    // Mark the last card with a pulsing glow
    if (hand.length === 1) {
      cardEl.classList.add("last-card");
    }

    if (isMyTurn) {
      cardEl.addEventListener("click", () => {
        // UNO auto-penalty: if this is their last card and UNO wasn't called
        if (hand.length === 1 && !alreadyCalledUno) {
          // Apply penalty first, then the card can still be played (player now has 3 cards)
          socket.emit("self-uno-penalty");
          // The server will broadcast the updated hand — no need to block the play
          // We still allow the play attempt; server will handle it
        }

        // Card throw animation
        cardEl.classList.add("card-throwing");
        playSound('play');

        setTimeout(() => {
          socket.emit("play-card", { cardIndex: originalIndex });
        }, 120); // tiny delay so throw animation is visible
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
      if (log.type === "uno-call" || log.type === "uno-penalty" || log.type === "uno-penalty-self") {
        playSound('uno');
      } else if (log.type === "draw" || log.type === "draw2" || log.type === "wild4") {
        playSound('draw');
      } else if (log.type === "reverse" || log.type === "reverse-skip") {
        // Trigger reverse flash on direction indicator
        setTimeout(() => {
          const dirEl = document.getElementById("direction-indicator");
          if (dirEl) {
            dirEl.classList.remove("reverse-flash");
            void dirEl.offsetWidth; // reflow to restart animation
            dirEl.classList.add("reverse-flash");
            setTimeout(() => dirEl.classList.remove("reverse-flash"), 750);
          }
        }, 80);
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

  // UNO action buttons (me and alreadyCalledUno already declared above)
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
  stopTurnTimer();
}

// =====================================================
// TURN TIMER
// =====================================================

function startTurnTimer(isMyTurn) {
  stopTurnTimer();

  const wrap      = document.getElementById("turn-timer-wrap");
  const fillEl    = document.getElementById("timer-ring-fill");
  const countEl   = document.getElementById("turn-timer-count");
  if (!wrap || !fillEl || !countEl) return;

  const circumference = 100; // matches stroke-dasharray
  turnTimerSeconds = TURN_DURATION;

  wrap.classList.remove("hidden");
  countEl.textContent = turnTimerSeconds;
  fillEl.className = "timer-ring-fill";
  fillEl.style.strokeDashoffset = "0";

  turnTimerInterval = setInterval(() => {
    turnTimerSeconds--;
    countEl.textContent = Math.max(0, turnTimerSeconds);

    // Shrink the ring proportionally
    const offset = circumference * (1 - turnTimerSeconds / TURN_DURATION);
    fillEl.style.strokeDashoffset = offset;

    // Color transitions
    fillEl.classList.remove("warning", "danger");
    if (turnTimerSeconds <= 10) fillEl.classList.add("danger");
    else if (turnTimerSeconds <= 20) fillEl.classList.add("warning");

    if (turnTimerSeconds <= 0) stopTurnTimer();
  }, 1000);
}

function stopTurnTimer() {
  if (turnTimerInterval) {
    clearInterval(turnTimerInterval);
    turnTimerInterval = null;
  }
  const wrap = document.getElementById("turn-timer-wrap");
  if (wrap) wrap.classList.add("hidden");
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
  socket.emit("create-room", {
    name: getName(),
    avatar: localStorage.getItem("recursivemonk_playerAvatar") || "👤",
    color: localStorage.getItem("recursivemonk_playerColor") || "#e2e8f0"
  });
});

document.getElementById("btn-join").addEventListener("click", () => {
  const code = roomCodeInput.value.trim();
  if (!code) { showError("Please enter a room code."); return; }
  socket.emit("join-room", {
    code,
    name: getName(),
    avatar: localStorage.getItem("recursivemonk_playerAvatar") || "👤",
    color: localStorage.getItem("recursivemonk_playerColor") || "#e2e8f0"
  });
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
    // Animate the draw pile card
    const drawPileEl = document.getElementById("draw-pile");
    drawPileEl.classList.add("card-throwing");
    setTimeout(() => drawPileEl.classList.remove("card-throwing"), 400);

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

// Focus Room Code input when Join Room card is clicked
const btnJoinCard = document.getElementById("btn-join-card");
if (btnJoinCard) {
  btnJoinCard.addEventListener("click", () => {
    roomCodeInput.focus();
  });
}

// =====================================================
// SHARE LINK BUTTON
// =====================================================

function setupShareButton(roomCode) {
  const btn = document.getElementById("btn-share-link");
  if (!btn) return;
  btn.onclick = () => {
    const url = `${location.origin}${location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(url).then(() => {
      btn.innerHTML = '<span class="icon">✅</span> Link Copied!';
      btn.classList.add("copied");
      setTimeout(() => {
        btn.innerHTML = '<span class="icon">🔗</span> Copy Invite Link';
        btn.classList.remove("copied");
      }, 2500);
    }).catch(() => {
      // Fallback for non-HTTPS contexts
      prompt("Copy this link:", `${location.origin}${location.pathname}?room=${roomCode}`);
    });
  };
}

// =====================================================
// HOW TO PLAY & TUTORIAL MODALS
// =====================================================

const howToPlayModal = document.getElementById("how-to-play-modal");
const tutorialModal  = document.getElementById("tutorial-modal");

function openModal(el) { el && el.classList.remove("hidden"); }
function closeModal(el) { el && el.classList.add("hidden"); }

document.getElementById("btn-how-to-play").addEventListener("click", () => openModal(howToPlayModal));
document.getElementById("btn-tutorial").addEventListener("click",    () => openModal(tutorialModal));

document.getElementById("close-how-to-play").addEventListener("click",     () => closeModal(howToPlayModal));
document.getElementById("close-how-to-play-btn").addEventListener("click", () => closeModal(howToPlayModal));
document.getElementById("close-tutorial").addEventListener("click",         () => closeModal(tutorialModal));
document.getElementById("close-tutorial-btn").addEventListener("click",      () => closeModal(tutorialModal));

// Close on backdrop click
[howToPlayModal, tutorialModal].forEach(modal => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal(modal);
  });
});


// Owl SVG Interactive Pupil Mouse Tracking & Wink Hover state
window.addEventListener("mousemove", (e) => {
  const owlSvg = document.querySelector(".owl-svg");
  if (!owlSvg) return;

  const rect = owlSvg.getBoundingClientRect();
  const center_x = rect.left + rect.width / 2;
  const center_y = rect.top + rect.height / 2;

  const dx = e.clientX - center_x;
  const dy = e.clientY - center_y;
  const angle = Math.atan2(dy, dx);
  
  const max_offset = 3.5;
  const pupil_x = Math.cos(angle) * max_offset;
  const pupil_y = Math.sin(angle) * max_offset;

  const leftPupil = document.getElementById("left-pupil");
  const rightPupil = document.getElementById("right-pupil");
  
  if (leftPupil) {
    leftPupil.style.transform = `translate(${pupil_x}px, ${pupil_y}px)`;
  }
  if (rightPupil) {
    rightPupil.style.transform = `translate(${pupil_x}px, ${pupil_y}px)`;
  }
});

// =====================================================
// CHAT
// =====================================================

function appendChatMessage(containerEl, senderName, text, isMe) {
  // Remove empty placeholder if present
  const placeholder = containerEl.querySelector(".chat-empty");
  if (placeholder) placeholder.remove();

  const msgEl = document.createElement("div");
  msgEl.className = "chat-message";
  const senderEl = document.createElement("span");
  senderEl.className = isMe ? "chat-sender me" : "chat-sender";
  senderEl.textContent = senderName + ": ";
  const textEl = document.createElement("span");
  textEl.className = "chat-text";
  textEl.textContent = text;
  msgEl.appendChild(senderEl);
  msgEl.appendChild(textEl);
  containerEl.appendChild(msgEl);
  containerEl.scrollTop = containerEl.scrollHeight;
}

function sendChat(inputEl, containers) {
  const text = inputEl.value.trim();
  if (!text) return;
  socket.emit("send-chat", { text });
  inputEl.value = "";
}

if (lobbyChatSend) {
  lobbyChatSend.addEventListener("click", () => sendChat(lobbyChatInput, [lobbyChatMessages, gameChatMessages]));
}
if (lobbyChatInput) {
  lobbyChatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChat(lobbyChatInput, [lobbyChatMessages, gameChatMessages]);
  });
}
if (gameChatSend) {
  gameChatSend.addEventListener("click", () => sendChat(gameChatInput, [lobbyChatMessages, gameChatMessages]));
}
if (gameChatInput) {
  gameChatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChat(gameChatInput, [lobbyChatMessages, gameChatMessages]);
  });
}


const logoContainer = document.querySelector(".hero-logo-container");
if (logoContainer) {
  const rightEyeGroup = document.getElementById("right-eye-group");
  const rightWink = document.getElementById("right-wink");

  logoContainer.addEventListener("mouseenter", () => {
    if (rightEyeGroup && rightWink) {
      rightEyeGroup.style.display = "block";
      rightWink.style.display = "none";
    }
  });

  logoContainer.addEventListener("mouseleave", () => {
    if (rightEyeGroup && rightWink) {
      rightEyeGroup.style.display = "none";
      rightWink.style.display = "block";
      
      // Reset pupil position
      const rightPupil = document.getElementById("right-pupil");
      if (rightPupil) rightPupil.style.transform = "";
    }
  });
}

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
  setupShareButton(room.code);
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
let prevHandSize = 0;
let latestGameState = null;

function render() {
  if (latestGameState) renderGame(latestGameState, myHand);
}

socket.on("your-hand", (hand) => {
  const oldSize = prevHandSize;
  prevHandSize = hand.length;
  myHand = hand;
  render();

  // Animate newly drawn cards (hand grew)
  if (hand.length > oldSize) {
    const addedCount = hand.length - oldSize;
    const handEl = document.getElementById("my-hand");
    if (handEl) {
      const cards = handEl.querySelectorAll(".uno-card");
      const startIdx = Math.max(0, cards.length - addedCount);
      for (let i = startIdx; i < cards.length; i++) {
        const c = cards[i];
        c.classList.remove("card-drawing");
        void c.offsetWidth;
        c.classList.add("card-drawing");
        c.addEventListener("animationend", () => c.classList.remove("card-drawing"), { once: true });
      }
    }
  }
});

socket.on("game-started", (gameState) => {
  latestGameState = gameState;
  render();
});

socket.on("game-updated", (gameState) => {
  latestGameState = gameState;
  render();
});

// UNO auto-penalty notification
socket.on("uno-penalty-applied", ({ count }) => {
  showUnoPenaltyToast(
    `UNO Penalty! +${count} Cards`,
    "You forgot to call UNO before playing your last card"
  );
});

// Chat received
socket.on("chat-message", ({ senderName, text, senderId }) => {
  const isMe = senderId === mySocketId;
  if (lobbyChatMessages) appendChatMessage(lobbyChatMessages, senderName, text, isMe);
  if (gameChatMessages)  appendChatMessage(gameChatMessages,  senderName, text, isMe);
});

// Timer received from server
socket.on("turn-timer", ({ seconds }) => {
  // re-sync client timer to server's reported seconds remaining
  const fillEl  = document.getElementById("timer-ring-fill");
  const countEl = document.getElementById("turn-timer-count");
  const wrap    = document.getElementById("turn-timer-wrap");
  if (!wrap || !fillEl || !countEl) return;

  wrap.classList.remove("hidden");
  turnTimerSeconds = seconds;
  countEl.textContent = seconds;
  const offset = 100 * (1 - seconds / TURN_DURATION);
  fillEl.style.strokeDashoffset = offset;
  fillEl.classList.remove("warning", "danger");
  if (seconds <= 10)      fillEl.classList.add("danger");
  else if (seconds <= 20) fillEl.classList.add("warning");
});


// =====================================================
// CARD SORT EVENT LISTENERS
// =====================================================

document.getElementById("sort-none").addEventListener("click", () => setSortMode("none"));
document.getElementById("sort-color").addEventListener("click", () => setSortMode("color"));
document.getElementById("sort-value").addEventListener("click", () => setSortMode("value"));

function setSortMode(mode) {
  sortBy = mode;
  localStorage.setItem("recursivemonk_sortBy", mode);
  
  document.getElementById("sort-none").classList.toggle("active", mode === "none");
  document.getElementById("sort-color").classList.toggle("active", mode === "color");
  document.getElementById("sort-value").classList.toggle("active", mode === "value");
  
  render();
}


// =====================================================
// SETTINGS MODAL EVENT LISTENERS & HELPERS
// =====================================================

const settingsModal = document.getElementById("settings-modal");

document.getElementById("btn-settings").addEventListener("click", () => {
  openSettingsModal();
});
document.getElementById("close-settings").addEventListener("click", () => closeModal(settingsModal));

settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) closeModal(settingsModal);
});

// Setup Avatar grid choices
document.querySelectorAll(".avatar-pick-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".avatar-pick-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// Setup Color grid choices
document.querySelectorAll(".color-pick-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".color-pick-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// Save settings button click
document.getElementById("save-settings-btn").addEventListener("click", () => {
  const nameInput = document.getElementById("settings-player-name");
  const newName = nameInput ? nameInput.value.trim() || "Player" : "Player";
  
  const activeAvatarBtn = document.querySelector(".avatar-pick-btn.active");
  const newAvatar = activeAvatarBtn ? activeAvatarBtn.dataset.avatar : "👤";
  
  const activeColorBtn = document.querySelector(".color-pick-btn.active");
  const newColor = activeColorBtn ? activeColorBtn.dataset.color : "#e2e8f0";
  
  // Save to local storage
  localStorage.setItem("recursivemonk_playerName", newName);
  localStorage.setItem("recursivemonk_playerAvatar", newAvatar);
  localStorage.setItem("recursivemonk_playerColor", newColor);
  
  const soundToggle = document.getElementById("settings-sound-toggle");
  if (soundToggle) {
    localStorage.setItem("recursivemonk_soundEnabled", soundToggle.checked ? "true" : "false");
    updateSoundIconState(soundToggle.checked);
  }
  
  // Emit updates
  socket.emit("update-profile", { name: newName, avatar: newAvatar, color: newColor });
  updateMyProfileBadge();
  
  // Emit settings if host
  const isHost = currentRoom && currentRoom.hostId === mySocketId;
  if (isHost && currentRoom.status === "waiting") {
    const stackingToggle = document.getElementById("settings-stacking-toggle");
    const jumpinToggle = document.getElementById("settings-jumpin-toggle");
    socket.emit("update-settings", {
      settings: {
        stacking: stackingToggle ? stackingToggle.checked : false,
        jumpIn: jumpinToggle ? jumpinToggle.checked : false
      }
    });
  }
  
  closeModal(settingsModal);
});

function openSettingsModal() {
  const isHost = currentRoom && currentRoom.hostId === mySocketId;
  const hostRulesSection = document.getElementById("host-rules-section");
  
  if (hostRulesSection) {
    if (isHost && (!currentRoom || currentRoom.status === "waiting")) {
      hostRulesSection.classList.remove("hidden");
    } else {
      hostRulesSection.classList.add("hidden");
    }
  }
  
  // Populate inputs from localStorage
  const nameInput = document.getElementById("settings-player-name");
  if (nameInput) {
    nameInput.value = localStorage.getItem("recursivemonk_playerName") || "RecursiveMonk";
  }
  
  const savedAvatar = localStorage.getItem("recursivemonk_playerAvatar") || "👤";
  document.querySelectorAll(".avatar-pick-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.avatar === savedAvatar);
  });
  
  const savedColor = localStorage.getItem("recursivemonk_playerColor") || "#e2e8f0";
  document.querySelectorAll(".color-pick-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.color === savedColor);
  });
  
  // Populate settings fields from current room state
  if (currentRoom && currentRoom.settings) {
    const stackingToggle = document.getElementById("settings-stacking-toggle");
    if (stackingToggle) stackingToggle.checked = !!currentRoom.settings.stacking;
    
    const jumpinToggle = document.getElementById("settings-jumpin-toggle");
    if (jumpinToggle) jumpinToggle.checked = !!currentRoom.settings.jumpIn;
  }
  
  // Audio state
  const soundToggle = document.getElementById("settings-sound-toggle");
  if (soundToggle) {
    soundToggle.checked = localStorage.getItem("recursivemonk_soundEnabled") !== "false";
  }
  
  openModal(settingsModal);
}

function updateSoundIconState(enabled) {
  const icon = document.getElementById("sound-icon");
  if (icon) {
    icon.textContent = enabled ? "🔊" : "🔇";
  }
}

document.getElementById("btn-toggle-sound").addEventListener("click", () => {
  const current = localStorage.getItem("recursivemonk_soundEnabled") !== "false";
  const newVal = !current;
  localStorage.setItem("recursivemonk_soundEnabled", newVal ? "true" : "false");
  updateSoundIconState(newVal);
});

