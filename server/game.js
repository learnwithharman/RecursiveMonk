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
  };

  room.players.forEach((player, index) => {
    room.game.hands[player.id] = hands[index];
  });

  // Apply starting card effect
  const topCard = discardPile[discardPile.length - 1];
  const playerCount = room.players.length;

  if (topCard.value === "skip") {
    const skippedPlayer = room.players[room.game.currentTurn];
    let nextTurn = (room.game.currentTurn + room.game.direction) % playerCount;
    if (nextTurn < 0) {
      nextTurn += playerCount;
    }
    room.game.currentTurn = nextTurn;
    
    room.game.logs.push({
      type: "start-skip",
      card: topCard,
      target: skippedPlayer.name,
    });
  } else if (topCard.value === "reverse") {
    room.game.direction = -room.game.direction;
    
    if (playerCount === 2) {
      const skippedPlayer = room.players[room.game.currentTurn];
      let nextTurn = (room.game.currentTurn + room.game.direction) % playerCount;
      if (nextTurn < 0) {
        nextTurn += playerCount;
      }
      room.game.currentTurn = nextTurn;
      
      room.game.logs.push({
        type: "start-reverse-skip",
        card: topCard,
        target: skippedPlayer.name,
      });
    } else {
      let nextTurn = (0 + room.game.direction) % playerCount;
      if (nextTurn < 0) {
        nextTurn += playerCount;
      }
      room.game.currentTurn = nextTurn;
      
      room.game.logs.push({
        type: "start-reverse",
        card: topCard,
      });
    }
  } else if (topCard.value === "draw2") {
    const targetPlayer = room.players[0];
    const drawn = drawFromDeck(room, 2);
    room.game.hands[targetPlayer.id].push(...drawn);
    
    let nextTurn = (room.game.currentTurn + room.game.direction) % playerCount;
    if (nextTurn < 0) {
      nextTurn += playerCount;
    }
    room.game.currentTurn = nextTurn;
    
    room.game.logs.push({
      type: "start-draw2",
      card: topCard,
      target: targetPlayer.name,
      count: drawn.length,
    });
  } else {
    room.game.logs.push({
      type: "start",
      card: topCard,
    });
  }

  return room;
}

function getPublicGameState(room) {
  const topCard = room.game.discardPile[room.game.discardPile.length - 1];
  const currentPlayer = room.players[room.game.currentTurn];

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
    })),
    logs: room.game.logs || [],
  };
}

function getPlayerHand(room, socketId) {
  return room.game.hands[socketId] || [];
}

function playCard(room, playerId, cardIndex) {
  if (room.status !== "playing") return { error: "Game not active" };

  // Verify it is this player's turn
  const activePlayer = room.players[room.game.currentTurn];
  if (activePlayer.id !== playerId) {
    return { error: "It is not your turn" };
  }

  const hand = room.game.hands[playerId];
  if (!hand || cardIndex < 0 || cardIndex >= hand.length) {
    return { error: "Invalid card selection" };
  }

  const card = hand[cardIndex];
  const topCard = room.game.discardPile[room.game.discardPile.length - 1];

  const isColorMatch = (topCard.activeColor && card.color === topCard.activeColor) || 
                       (!topCard.activeColor && card.color === topCard.color);
  const isValueMatch = card.value === topCard.value;
  const isWild = card.color === "wild";

  if (!isColorMatch && !isValueMatch && !isWild) {
    return { error: "Card does not match top card color or value" };
  }

  // Remove card from hand
  hand.splice(cardIndex, 1);

  // For wild cards, set a default activeColor (e.g. red) until color picking is implemented
  if (isWild) {
    card.activeColor = "red";
  } else {
    // Clear any previous activeColor if it's a normal card
    delete card.activeColor;
  }

  room.game.discardPile.push(card);

  // Apply card effects and determine turn advancement steps
  const playerCount = room.players.length;
  let turnSteps = 1;
  let actionLog = null;

  if (card.value === "skip") {
    turnSteps = 2;
    const skippedPlayerIndex = (room.game.currentTurn + room.game.direction + playerCount) % playerCount;
    const skippedPlayer = room.players[skippedPlayerIndex];
    actionLog = {
      type: "skip",
      player: activePlayer.name,
      target: skippedPlayer.name,
      card,
    };
  } else if (card.value === "reverse") {
    room.game.direction = -room.game.direction;
    if (playerCount === 2) {
      turnSteps = 2;
      const skippedPlayerIndex = (room.game.currentTurn + room.game.direction + playerCount) % playerCount;
      const skippedPlayer = room.players[skippedPlayerIndex];
      actionLog = {
        type: "reverse-skip",
        player: activePlayer.name,
        target: skippedPlayer.name,
        card,
      };
    } else {
      turnSteps = 1;
      actionLog = {
        type: "reverse",
        player: activePlayer.name,
        direction: room.game.direction,
        card,
      };
    }
  } else if (card.value === "draw2") {
    const targetPlayerIndex = (room.game.currentTurn + room.game.direction + playerCount) % playerCount;
    const targetPlayer = room.players[targetPlayerIndex];

    const drawnCards = drawFromDeck(room, 2);
    room.game.hands[targetPlayer.id].push(...drawnCards);

    turnSteps = 2;
    actionLog = {
      type: "draw2",
      player: activePlayer.name,
      target: targetPlayer.name,
      count: drawnCards.length,
      card,
    };
  } else {
    actionLog = {
      type: "normal",
      player: activePlayer.name,
      card: card,
    };
  }

  // Advance turn safely
  let nextTurn = (room.game.currentTurn + turnSteps * room.game.direction) % playerCount;
  if (nextTurn < 0) {
    nextTurn += playerCount;
  }
  room.game.currentTurn = nextTurn;

  if (!room.game.logs) room.game.logs = [];
  room.game.logs.push(actionLog);
  if (room.game.logs.length > 15) {
    room.game.logs.shift();
  }

  return { success: true, card, log: actionLog };
}

function drawFromDeck(room, count) {
  const drawn = [];
  for (let i = 0; i < count; i++) {
    if (room.game.drawPile.length === 0) {
      const discardPile = room.game.discardPile;
      if (discardPile.length <= 1) {
        break;
      }

      const topCard = discardPile.pop();
      const rest = discardPile.splice(0, discardPile.length);

      rest.forEach((c) => {
        delete c.activeColor;
      });

      room.game.drawPile = shuffle(rest);
      room.game.discardPile = [topCard];
    }
    drawn.push(room.game.drawPile.pop());
  }
  return drawn;
}

function drawCard(room, playerId) {
  if (room.status !== "playing") return { error: "Game not active" };

  const activePlayer = room.players[room.game.currentTurn];
  if (activePlayer.id !== playerId) {
    return { error: "It is not your turn" };
  }

  const drawn = drawFromDeck(room, 1);
  if (drawn.length === 0) {
    return { error: "No cards left in the deck to draw" };
  }

  room.game.hands[playerId].push(...drawn);

  const actionLog = {
    type: "draw",
    player: activePlayer.name,
  };
  if (!room.game.logs) room.game.logs = [];
  room.game.logs.push(actionLog);
  if (room.game.logs.length > 15) {
    room.game.logs.shift();
  }

  // Auto-advance turn to the next player after drawing
  const playerCount = room.players.length;
  let nextTurn = (room.game.currentTurn + room.game.direction) % playerCount;
  if (nextTurn < 0) {
    nextTurn += playerCount;
  }
  room.game.currentTurn = nextTurn;

  return { success: true, card: drawn[0], log: actionLog };
}

module.exports = {
  startGame,
  getPublicGameState,
  getPlayerHand,
  playCard,
  drawCard,
};

