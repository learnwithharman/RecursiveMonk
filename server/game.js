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

function initStats(room) {
  if (!room.game) return;
  room.game.stats = {
    cardsPlayed: {},
    cardsDrawn: {},
    unoCalls: {},
    unoChallenges: {},
    turnCounts: {},
    turnDurations: {}
  };
  room.players.forEach(p => {
    room.game.stats.cardsPlayed[p.id] = 0;
    room.game.stats.cardsDrawn[p.id] = 0;
    room.game.stats.unoCalls[p.id] = 0;
    room.game.stats.unoChallenges[p.id] = 0;
    room.game.stats.turnCounts[p.id] = 0;
    room.game.stats.turnDurations[p.id] = 0;
  });
}

function trackTurnStart(room) {
  if (!room.game) return;
  room.game.turnStartedAt = Date.now();
}

function trackTurnEnd(room, playerId) {
  if (!room.game || !room.game.turnStartedAt) return;
  const duration = Date.now() - room.game.turnStartedAt;
  if (!room.game.stats) initStats(room);

  room.game.stats.turnCounts[playerId] = (room.game.stats.turnCounts[playerId] || 0) + 1;
  room.game.stats.turnDurations[playerId] = (room.game.stats.turnDurations[playerId] || 0) + duration;
  room.game.turnStartedAt = Date.now();
}

function checkWin(room, playerId) {
  const hand = room.game.hands[playerId];
  if (hand && hand.length === 0) {
    const winner = room.players.find((p) => p.id === playerId);
    const winnerName = winner ? winner.name : "Unknown";
    const winnerPlayerId = winner ? winner.playerId : "";

    room.roundWinner = winnerName;
    room.roundsPlayed += 1;

    // Track round wins (using persistent playerIds)
    if (!room.scores) room.scores = {};
    room.players.forEach(p => {
      if (room.scores[p.playerId] === undefined) room.scores[p.playerId] = 0;
    });

    if (winnerPlayerId) {
      room.scores[winnerPlayerId] = (room.scores[winnerPlayerId] || 0) + 1;
    }

    const matchType = (room.settings && room.settings.matchType) || 1;
    const targetWins = Math.ceil(matchType / 2);

    const winnerScore = winnerPlayerId ? room.scores[winnerPlayerId] : 0;
    
    // Copy stats to a displayable map using names for display
    const finalStats = {
      cardsPlayed: {},
      cardsDrawn: {},
      unoCalls: {},
      unoChallenges: {},
      averageTurnTime: {}
    };
    
    room.players.forEach(p => {
      const pName = p.name;
      finalStats.cardsPlayed[pName] = (room.game.stats && room.game.stats.cardsPlayed[p.id]) || 0;
      finalStats.cardsDrawn[pName] = (room.game.stats && room.game.stats.cardsDrawn[p.id]) || 0;
      finalStats.unoCalls[pName] = (room.game.stats && room.game.stats.unoCalls[p.id]) || 0;
      finalStats.unoChallenges[pName] = (room.game.stats && room.game.stats.unoChallenges[p.id]) || 0;
      
      const dur = (room.game.stats && room.game.stats.turnDurations[p.id]) || 0;
      const cnt = (room.game.stats && room.game.stats.turnCounts[p.id]) || 1;
      finalStats.averageTurnTime[pName] = Math.round((dur / cnt) / 1000 * 10) / 10;
    });

    room.roundStats = finalStats;

    if (winnerScore >= targetWins) {
      room.game.winner = winnerName;
      room.matchWinner = winnerName;
      room.status = "finished";
      room.matchStats = finalStats;
    } else {
      room.status = "round-ended";
    }
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
  const startingCards = (room.settings && room.settings.startingCards) || 7;
  const startingDirection = (room.settings && room.settings.startingDirection) !== undefined ? room.settings.startingDirection : 1;

  const { hands, drawPile, discardPile } = dealCards(deck, room.players.length, startingCards);

  room.status = "playing";
  room.roundWinner = null;
  
  room.game = {
    drawPile,
    discardPile,
    currentTurn: 0,
    direction: startingDirection,
    hands: {},
    logs: [],
    pendingWild: null,   // { cardIndex, playerId } while awaiting color choice
    unoCalled: {},       // { [playerId]: true } for players who called UNO
    winner: null,
    stackCount: 0,
  };

  initStats(room);

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

  trackTurnStart(room);

  return room;
}

function resetGame(room, hostId) {
  if (room.hostId !== hostId) return { error: "Only the host can restart" };
  room.status = "waiting";
  room.game = null;
  room.roundsPlayed = 0;
  room.roundWinner = null;
  room.matchWinner = null;
  room.matchStats = null;
  room.roundStats = null;
  if (room.scores) {
    Object.keys(room.scores).forEach(k => {
      room.scores[k] = 0;
    });
  }
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
    currentPlayerId: currentPlayer ? currentPlayer.id : null,
    currentPlayerName: currentPlayer ? currentPlayer.name : "",
    direction: room.game.direction,
    players: room.players.map((p) => ({
      id: p.id,
      playerId: p.playerId,
      name: p.name,
      cardCount: room.game.hands[p.id] ? room.game.hands[p.id].length : 0,
      calledUno: !!room.game.unoCalled[p.id],
      disconnected: !!p.disconnected,
      avatar: p.avatar || "👤",
      color: p.color || "#e2e8f0",
    })),
    logs: room.game.logs || [],
    pendingWild: !!room.game.pendingWild,
    pendingWildPlayerId: room.game.pendingWild ? room.game.pendingWild.playerId : null,
    unoPlayers,
    winner: room.game.winner || null,
    settings: room.settings || { stacking: false, jumpIn: false },
    stackCount: room.game.stackCount || 0,
    drawPileCount: room.game.drawPile ? room.game.drawPile.length : 0,
    scores: room.scores || {},
    roundsPlayed: room.roundsPlayed || 0,
    roundWinner: room.roundWinner || null,
    matchWinner: room.matchWinner || null,
    matchStats: room.matchStats || null,
    roundStats: room.roundStats || null
  };
}

function getPlayerHand(room, socketId) {
  return room.game.hands[socketId] || [];
}

function playCard(room, playerId, cardIndex) {
  if (room.status !== "playing") return { error: "Game not active" };
  if (room.game.pendingWild) return { error: "Waiting for color choice" };

  const activePlayer = room.players[room.game.currentTurn];
  const isMyTurn = activePlayer.id === playerId;

  const hand = room.game.hands[playerId];
  if (!hand || cardIndex < 0 || cardIndex >= hand.length) return { error: "Invalid card selection" };

  const card = hand[cardIndex];
  const topCard = room.game.discardPile[room.game.discardPile.length - 1];

  const activeColor = topCard.activeColor || topCard.color;
  const isColorMatch = card.color === activeColor;
  const isValueMatch = card.value === topCard.value;
  const isWild = card.color === "wild";

  let isJumpIn = false;

  if (!isMyTurn) {
    if (room.settings && room.settings.jumpIn) {
      if (room.game.stackCount > 0 && card.value !== "draw2") {
        return { error: "Must stack Draw Two or draw cards when penalty is active" };
      }
      const isExactMatch = card.color !== "wild" && card.color === topCard.color && card.value === topCard.value;
      if (!isExactMatch) {
        return { error: "Jump-in requires an exact color and value match" };
      }
      isJumpIn = true;
      const playerIdx = room.players.findIndex(p => p.id === playerId);
      room.game.currentTurn = playerIdx;
    } else {
      return { error: "It is not your turn" };
    }
  }

  if (room.game.stackCount > 0 && card.value !== "draw2") {
    return { error: "You must play a Draw Two to stack, or draw cards" };
  }

  if (!isColorMatch && !isValueMatch && !isWild) {
    return { error: "Card does not match top card color or value" };
  }

  // Track stats
  if (!room.game.stats) initStats(room);
  room.game.stats.cardsPlayed[playerId] = (room.game.stats.cardsPlayed[playerId] || 0) + 1;

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
    actionLog = { type: "wild", player: room.players[room.game.currentTurn].name, card, jumpIn: isJumpIn };
    pushLog(room, actionLog);
    // Do NOT advance turn yet — chooseColor will do it
    return { success: true, card, log: actionLog, needsColor: true };
  }

  if (card.value === "skip") {
    const skippedIdx = safeMod(room.game.currentTurn + room.game.direction, playerCount);
    const skippedPlayer = room.players[skippedIdx];
    actionLog = { type: "skip", player: room.players[room.game.currentTurn].name, target: skippedPlayer.name, card, jumpIn: isJumpIn };
    advanceTurn(room, 2);

  } else if (card.value === "reverse") {
    room.game.direction = -room.game.direction;
    if (playerCount === 2) {
      const skippedIdx = safeMod(room.game.currentTurn + room.game.direction, playerCount);
      const skippedPlayer = room.players[skippedIdx];
      actionLog = { type: "reverse-skip", player: room.players[room.game.currentTurn].name, target: skippedPlayer.name, card, jumpIn: isJumpIn };
      advanceTurn(room, 2);
    } else {
      actionLog = { type: "reverse", player: room.players[room.game.currentTurn].name, direction: room.game.direction, card, jumpIn: isJumpIn };
      advanceTurn(room, 1);
    }

  } else if (card.value === "draw2") {
    if (room.settings && room.settings.stacking) {
      room.game.stackCount = (room.game.stackCount || 0) + 2;
      actionLog = { 
        type: "draw2-stacked", 
        player: room.players[room.game.currentTurn].name, 
        count: room.game.stackCount, 
        card, 
        jumpIn: isJumpIn 
      };
      advanceTurn(room, 1);
    } else {
      const targetIdx = safeMod(room.game.currentTurn + room.game.direction, playerCount);
      const targetPlayer = room.players[targetIdx];
      const drawnCards = drawFromDeck(room, 2);
      room.game.hands[targetPlayer.id].push(...drawnCards);
      actionLog = { type: "draw2", player: room.players[room.game.currentTurn].name, target: targetPlayer.name, count: drawnCards.length, card, jumpIn: isJumpIn };
      
      // Track cards drawn stat for target
      room.game.stats.cardsDrawn[targetPlayer.id] = (room.game.stats.cardsDrawn[targetPlayer.id] || 0) + drawnCards.length;

      advanceTurn(room, 2);
    }

  } else {
    actionLog = { type: "normal", player: room.players[room.game.currentTurn].name, card, jumpIn: isJumpIn };
    advanceTurn(room, 1);
  }

  pushLog(room, actionLog);

  // Track turn end for active player
  trackTurnEnd(room, playerId);

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

  // Track card play statistics
  if (!room.game.stats) initStats(room);
  room.game.stats.cardsPlayed[playerId] = (room.game.stats.cardsPlayed[playerId] || 0) + 1;

  if (cardValue === "wild4") {
    const targetIdx = safeMod(room.game.currentTurn + room.game.direction, playerCount);
    const targetPlayer = room.players[targetIdx];
    const drawnCards = drawFromDeck(room, 4);
    room.game.hands[targetPlayer.id].push(...drawnCards);
    
    // Track stats
    room.game.stats.cardsDrawn[targetPlayer.id] = (room.game.stats.cardsDrawn[targetPlayer.id] || 0) + drawnCards.length;

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

  // Track turn end
  trackTurnEnd(room, playerId);

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

  if (!room.game.stats) initStats(room);
  room.game.stats.unoCalls[playerId] = (room.game.stats.unoCalls[playerId] || 0) + 1;

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

  if (!room.game.stats) initStats(room);
  room.game.stats.cardsDrawn[target.id] = (room.game.stats.cardsDrawn[target.id] || 0) + drawn.length;
  room.game.stats.unoChallenges[challengerId] = (room.game.stats.unoChallenges[challengerId] || 0) + 1;

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

  const isStackActive = room.game.stackCount && room.game.stackCount > 0;
  
  if (!room.game.stats) initStats(room);

  if (isStackActive) {
    const drawCount = room.game.stackCount;
    const drawn = drawFromDeck(room, drawCount);
    if (drawn.length === 0) return { error: "No cards left in the deck to draw" };
    
    room.game.hands[playerId].push(...drawn);
    delete room.game.unoCalled[playerId];

    room.game.stats.cardsDrawn[playerId] = (room.game.stats.cardsDrawn[playerId] || 0) + drawn.length;

    const actionLog = { type: "draw2-penalty", player: activePlayer.name, count: drawn.length };
    pushLog(room, actionLog);
    room.game.stackCount = 0;
    
    advanceTurn(room, 1);
    trackTurnEnd(room, playerId);

    return { success: true, card: drawn[0], log: actionLog };
  }

  // Draw Until Playable Check
  const drawUntilPlayable = room.settings && room.settings.drawUntilPlayable;
  const topCard = room.game.discardPile[room.game.discardPile.length - 1];
  const activeColor = topCard.activeColor || topCard.color;

  function isPlayable(card) {
    return card.color === "wild" || card.color === activeColor || card.value === topCard.value;
  }

  const drawnCards = [];
  let foundPlayable = false;

  if (drawUntilPlayable) {
    while (true) {
      const drawn = drawFromDeck(room, 1);
      if (drawn.length === 0) break;
      const card = drawn[0];
      drawnCards.push(card);
      if (isPlayable(card)) {
        foundPlayable = true;
        break;
      }
    }
  } else {
    const drawn = drawFromDeck(room, 1);
    if (drawn.length > 0) {
      drawnCards.push(drawn[0]);
      if (isPlayable(drawn[0])) {
        foundPlayable = true;
      }
    }
  }

  if (drawnCards.length === 0) {
    return { error: "No cards left in the deck to draw" };
  }

  room.game.hands[playerId].push(...drawnCards);
  delete room.game.unoCalled[playerId];

  room.game.stats.cardsDrawn[playerId] = (room.game.stats.cardsDrawn[playerId] || 0) + drawnCards.length;

  const actionLog = {
    type: "draw",
    player: activePlayer.name,
    count: drawnCards.length,
    drawnPlayable: foundPlayable
  };
  pushLog(room, actionLog);

  if (drawUntilPlayable && foundPlayable) {
    // Let player decide to play or pass, don't advance turn automatically.
  } else {
    advanceTurn(room, 1);
    trackTurnEnd(room, playerId);
  }

  return { success: true, card: drawnCards[0], log: actionLog };
}

function passTurn(room, playerId) {
  if (room.status !== "playing") return { error: "Game not active" };
  if (room.game.pendingWild) return { error: "Waiting for color choice" };

  const activePlayer = room.players[room.game.currentTurn];
  if (activePlayer.id !== playerId) return { error: "It is not your turn" };

  const actionLog = { type: "pass", player: activePlayer.name };
  pushLog(room, actionLog);

  advanceTurn(room, 1);
  trackTurnEnd(room, playerId);

  return { success: true, log: actionLog };
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
  passTurn,
};
