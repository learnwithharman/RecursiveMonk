const COLORS = ["red", "yellow", "green", "blue"];

function createDeck() {
  const deck = [];

  for (const color of COLORS) {
    deck.push({ color, value: "0" });
    for (let n = 1; n <= 9; n++) {
      deck.push({ color, value: String(n) });
      deck.push({ color, value: String(n) });
    }
    for (const special of ["skip", "reverse", "draw2"]) {
      deck.push({ color, value: special });
      deck.push({ color, value: special });
    }
  }

  for (let i = 0; i < 4; i++) {
    deck.push({ color: "wild", value: "wild" });
    deck.push({ color: "wild", value: "wild4" });
  }

  return deck;
}

function shuffle(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function dealCards(deck, playerCount, cardsEach = 7) {
  const hands = Array.from({ length: playerCount }, () => []);
  let drawPile = [...deck];

  for (let c = 0; c < cardsEach; c++) {
    for (let p = 0; p < playerCount; p++) {
      hands[p].push(drawPile.pop());
    }
  }

  let topCard = drawPile.pop();
  while (topCard.color === "wild") {
    drawPile.unshift(topCard);
    topCard = drawPile.pop();
  }

  return { hands, drawPile, discardPile: [topCard] };
}

// Safe modulo that handles negative numbers
function safeMod(n, m) {
  return ((n % m) + m) % m;
}

function advanceTurn(room, steps = 1) {
  const playerCount = room.players.length;
  room.game.currentTurn = safeMod(
    room.game.currentTurn + steps * room.game.direction,
    playerCount
  );
}

function pushLog(room, entry) {
  if (!room.game.logs) room.game.logs = [];
  room.game.logs.push(entry);
  if (room.game.logs.length > 15) room.game.logs.shift();
}

function checkWin(room, playerId) {
  const hand = room.game.hands[playerId];
  if (hand && hand.length === 0) {
    const winner = room.players.find((p) => p.id === playerId);
    room.game.winner = winner ? winner.name : "Unknown";
    room.status = "finished";
    return true;
  }
  return false;
}

function drawFromDeck(room, count) {
  const drawn = [];
  for (let i = 0; i < count; i++) {
    if (room.game.drawPile.length === 0) {
      const discardPile = room.game.discardPile;
      if (discardPile.length <= 1) break;

      const topCard = discardPile.pop();
      const rest = discardPile.splice(0, discardPile.length);
      rest.forEach((c) => { delete c.activeColor; });
      room.game.drawPile = shuffle(rest);
      room.game.discardPile = [topCard];
    }
    drawn.push(room.game.drawPile.pop());
  }
  return drawn;
}

function startGame(room) {
  const deck = shuffle(createDeck());
  const { hands, drawPile, discardPile } = dealCards(deck, room.players.length);

  room.status = "playing";
  room.game = {
    drawPile,
    discardPile,
    currentTurn: 0,
    direction: 1,
    hands: {},
    logs: [],
    pendingWild: null,   // { cardIndex, playerId } while awaiting color choice
    unoCalled: {},       // { [playerId]: true } for players who called UNO
    winner: null,
  };

  room.players.forEach((player, index) => {
    room.game.hands[player.id] = hands[index];
  });

  // Apply starting card effect
  const topCard = discardPile[discardPile.length - 1];
  const playerCount = room.players.length;

  if (topCard.value === "skip") {
    const skippedPlayer = room.players[room.game.currentTurn];
    advanceTurn(room, 1);
    pushLog(room, { type: "start-skip", card: topCard, target: skippedPlayer.name });

  } else if (topCard.value === "reverse") {
    room.game.direction = -room.game.direction;
    if (playerCount === 2) {
      const skippedPlayer = room.players[room.game.currentTurn];
      advanceTurn(room, 1);
      pushLog(room, { type: "start-reverse-skip", card: topCard, target: skippedPlayer.name });
    } else {
      advanceTurn(room, 1);
      pushLog(room, { type: "start-reverse", card: topCard });
    }

  } else if (topCard.value === "draw2") {
    const targetPlayer = room.players[0];
    const drawn = drawFromDeck(room, 2);
    room.game.hands[targetPlayer.id].push(...drawn);
    advanceTurn(room, 2);
    pushLog(room, { type: "start-draw2", card: topCard, target: targetPlayer.name, count: drawn.length });

  } else {
    pushLog(room, { type: "start", card: topCard });
  }

  return room;
}

function resetGame(room, hostId) {
  if (room.hostId !== hostId) return { error: "Only the host can restart" };
  room.status = "waiting";
  room.game = null;
  return { success: true };
}

function getPublicGameState(room) {
  const topCard = room.game.discardPile[room.game.discardPile.length - 1];
  const currentPlayer = room.players[room.game.currentTurn];

  // Players with 1 card who haven't called UNO yet
  const unoPlayers = room.players
    .filter((p) => room.game.hands[p.id] && room.game.hands[p.id].length === 1 && !room.game.unoCalled[p.id])
    .map((p) => p.id);

  return {
    status: room.status,
    code: room.code,
    hostId: room.hostId,
    topCard,
    currentTurn: room.game.currentTurn,
    currentPlayerId: currentPlayer.id,
    currentPlayerName: currentPlayer.name,
    direction: room.game.direction,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      cardCount: room.game.hands[p.id].length,
      calledUno: !!room.game.unoCalled[p.id],
    })),
    logs: room.game.logs || [],
    pendingWild: !!room.game.pendingWild,
    pendingWildPlayerId: room.game.pendingWild ? room.game.pendingWild.playerId : null,
    unoPlayers,
    winner: room.game.winner || null,
  };
}

function getPlayerHand(room, socketId) {
  return room.game.hands[socketId] || [];
}

function playCard(room, playerId, cardIndex) {
  if (room.status !== "playing") return { error: "Game not active" };
  if (room.game.pendingWild) return { error: "Waiting for color choice" };

  const activePlayer = room.players[room.game.currentTurn];
  if (activePlayer.id !== playerId) return { error: "It is not your turn" };

  const hand = room.game.hands[playerId];
  if (!hand || cardIndex < 0 || cardIndex >= hand.length) return { error: "Invalid card selection" };

  const card = hand[cardIndex];
  const topCard = room.game.discardPile[room.game.discardPile.length - 1];

  const activeColor = topCard.activeColor || topCard.color;
  const isColorMatch = card.color === activeColor;
  const isValueMatch = card.value === topCard.value;
  const isWild = card.color === "wild";

  if (!isColorMatch && !isValueMatch && !isWild) {
    return { error: "Card does not match top card color or value" };
  }

  // Remove card from hand
  hand.splice(cardIndex, 1);

  // Clear activeColor for non-wild cards
  if (!isWild) delete card.activeColor;

  room.game.discardPile.push(card);

  // Clear UNO call status for this player (they just played)
  delete room.game.unoCalled[playerId];

  let actionLog = null;
  const playerCount = room.players.length;

  if (isWild) {
    // Park turn — wait for color choice before advancing
    room.game.pendingWild = { playerId, cardValue: card.value };
    actionLog = { type: "wild", player: activePlayer.name, card };
    pushLog(room, actionLog);
    // Do NOT advance turn yet — chooseColor will do it
    return { success: true, card, log: actionLog, needsColor: true };
  }

  if (card.value === "skip") {
    const skippedIdx = safeMod(room.game.currentTurn + room.game.direction, playerCount);
    const skippedPlayer = room.players[skippedIdx];
    actionLog = { type: "skip", player: activePlayer.name, target: skippedPlayer.name, card };
    advanceTurn(room, 2);

  } else if (card.value === "reverse") {
    room.game.direction = -room.game.direction;
    if (playerCount === 2) {
      const skippedIdx = safeMod(room.game.currentTurn + room.game.direction, playerCount);
      const skippedPlayer = room.players[skippedIdx];
      actionLog = { type: "reverse-skip", player: activePlayer.name, target: skippedPlayer.name, card };
      advanceTurn(room, 2);
    } else {
      actionLog = { type: "reverse", player: activePlayer.name, direction: room.game.direction, card };
      advanceTurn(room, 1);
    }

  } else if (card.value === "draw2") {
    const targetIdx = safeMod(room.game.currentTurn + room.game.direction, playerCount);
    const targetPlayer = room.players[targetIdx];
    const drawnCards = drawFromDeck(room, 2);
    room.game.hands[targetPlayer.id].push(...drawnCards);
    actionLog = { type: "draw2", player: activePlayer.name, target: targetPlayer.name, count: drawnCards.length, card };
    advanceTurn(room, 2);

  } else {
    actionLog = { type: "normal", player: activePlayer.name, card };
    advanceTurn(room, 1);
  }

  pushLog(room, actionLog);

  // Check win
  if (checkWin(room, playerId)) {
    return { success: true, card, log: actionLog, winner: room.game.winner };
  }

  return { success: true, card, log: actionLog };
}

function chooseColor(room, playerId, color) {
  if (room.status !== "playing") return { error: "Game not active" };
  if (!room.game.pendingWild) return { error: "No wild card pending" };
  if (room.game.pendingWild.playerId !== playerId) return { error: "It is not your turn to choose a color" };
  if (!COLORS.includes(color)) return { error: "Invalid color" };

  const cardValue = room.game.pendingWild.cardValue;
  const topCard = room.game.discardPile[room.game.discardPile.length - 1];
  topCard.activeColor = color;

  const activePlayer = room.players.find((p) => p.id === playerId);
  const playerCount = room.players.length;
  room.game.pendingWild = null;

  let actionLog = null;

  if (cardValue === "wild4") {
    const targetIdx = safeMod(room.game.currentTurn + room.game.direction, playerCount);
    const targetPlayer = room.players[targetIdx];
    const drawnCards = drawFromDeck(room, 4);
    room.game.hands[targetPlayer.id].push(...drawnCards);
    actionLog = {
      type: "wild4",
      player: activePlayer.name,
      target: targetPlayer.name,
      count: drawnCards.length,
      color,
      card: topCard,
    };
    advanceTurn(room, 2);
  } else {
    actionLog = { type: "wild-color", player: activePlayer.name, color, card: topCard };
    advanceTurn(room, 1);
  }

  pushLog(room, actionLog);

  // Check win (player could have emptied hand with the wild)
  if (checkWin(room, playerId)) {
    return { success: true, log: actionLog, winner: room.game.winner };
  }

  return { success: true, log: actionLog };
}

function callUno(room, playerId) {
  if (room.status !== "playing") return { error: "Game not active" };
  const hand = room.game.hands[playerId];
  if (!hand || hand.length !== 1) return { error: "You can only call UNO with exactly 1 card" };

  room.game.unoCalled[playerId] = true;
  const player = room.players.find((p) => p.id === playerId);
  pushLog(room, { type: "uno-call", player: player ? player.name : "Someone" });

  return { success: true };
}

function challengeUno(room, challengerId) {
  if (room.status !== "playing") return { error: "Game not active" };

  // Find a player with 1 card who hasn't called UNO
  const target = room.players.find(
    (p) => p.id !== challengerId && room.game.hands[p.id] && room.game.hands[p.id].length === 1 && !room.game.unoCalled[p.id]
  );

  if (!target) return { error: "No one to challenge — everyone with 1 card has called UNO" };

  const drawn = drawFromDeck(room, 2);
  room.game.hands[target.id].push(...drawn);

  const challenger = room.players.find((p) => p.id === challengerId);
  pushLog(room, {
    type: "uno-penalty",
    challenger: challenger ? challenger.name : "Someone",
    target: target.name,
    count: drawn.length,
  });

  return { success: true, penalizedPlayer: target.name };
}

function drawCard(room, playerId) {
  if (room.status !== "playing") return { error: "Game not active" };
  if (room.game.pendingWild) return { error: "Waiting for color choice" };

  const activePlayer = room.players[room.game.currentTurn];
  if (activePlayer.id !== playerId) return { error: "It is not your turn" };

  const drawn = drawFromDeck(room, 1);
  if (drawn.length === 0) return { error: "No cards left in the deck to draw" };

  room.game.hands[playerId].push(...drawn);

  // Drawing cancels any un-called UNO status
  delete room.game.unoCalled[playerId];

  const actionLog = { type: "draw", player: activePlayer.name };
  pushLog(room, actionLog);

  advanceTurn(room, 1);

  return { success: true, card: drawn[0], log: actionLog };
}

module.exports = {
  startGame,
  resetGame,
  getPublicGameState,
  getPlayerHand,
  playCard,
  chooseColor,
  callUno,
  challengeUno,
  drawCard,
};
