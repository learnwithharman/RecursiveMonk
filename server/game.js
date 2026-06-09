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
  };

  room.players.forEach((player, index) => {
    room.game.hands[player.id] = hands[index];
  });

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
  };
}

function getPlayerHand(room, socketId) {
  return room.game.hands[socketId] || [];
}

module.exports = {
  startGame,
  getPublicGameState,
  getPlayerHand,
};
