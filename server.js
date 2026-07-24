const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const {
  createRoom,
  joinRoom,
  rejoinRoom,
  leaveRoom,
  getRoomByPlayer,
  getPublicRoom,
} = require("./server/rooms");
const {
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
} = require("./server/game");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const TURN_DURATION_MS = 30000; // 30 seconds
const roomTimers = new Map(); // roomCode -> { timeout, startedAt }

function clearRoomTimer(roomCode) {
  const t = roomTimers.get(roomCode);
  if (t) {
    clearTimeout(t.timeout);
    roomTimers.delete(roomCode);
  }
}

function startRoomTimer(room) {
  clearRoomTimer(room.code);
  if (room.status !== "playing" || !room.game || room.game.pendingWild || room.game.winner) return;

  const startedAt = Date.now();
  const activePlayer = room.players[room.game.currentTurn];
  if (!activePlayer) return;

  // Broadcast the timer start to all clients
  io.to(room.code).emit("turn-timer", { seconds: TURN_DURATION_MS / 1000 });

  const timeout = setTimeout(() => {
    roomTimers.delete(room.code);
    // Make sure the same player is still active
    const currentActive = room.players[room.game.currentTurn];
    if (!currentActive || currentActive.id !== activePlayer.id) return;
    if (room.status !== "playing" || !room.game || room.game.winner) return;

    // Auto-draw a card for the timed-out player
    const result = drawCard(room, activePlayer.id);
    if (!result.error) {
      if (!room.game.logs) room.game.logs = [];
      room.game.logs.push({ type: "player-timeout-draw", player: activePlayer.name });
      if (room.game.logs.length > 15) room.game.logs.shift();

      // Failsafe for Draw Until Playable: force a pass if player did not play
      const currentActiveNow = room.players[room.game.currentTurn];
      if (currentActiveNow && currentActiveNow.id === activePlayer.id) {
        passTurn(room, activePlayer.id);
      }
    }
    broadcastGame(room);
  }, TURN_DURATION_MS);

  roomTimers.set(room.code, { timeout, startedAt });
}


function broadcastRoom(room) {
  io.to(room.code).emit("room-updated", getPublicRoom(room));
}

function broadcastGame(room) {
  room.players.forEach((player) => {
    io.to(player.id).emit("your-hand", getPlayerHand(room, player.id));
  });
  io.to(room.code).emit("game-updated", getPublicGameState(room));
  
  if (room.status === "round-ended") {
    clearRoomTimer(room.code);
    const roundNumber = room.roundsPlayed;
    
    // Automatically start the next round after 6 seconds
    setTimeout(() => {
      if (room.status === "round-ended" && room.roundsPlayed === roundNumber) {
        startGame(room);
        room.players.forEach((p) => {
          io.to(p.id).emit("your-hand", getPlayerHand(room, p.id));
        });
        io.to(room.code).emit("game-started", getPublicGameState(room));
      }
    }, 6000);
  } else {
    // Restart turn timer after every game state broadcast
    startRoomTimer(room);
  }
}


function handlePlayerLeft(room, playerId, playerName) {
  if (room.status === "playing" && room.game) {
    // Clean up game hand & UNO status
    if (room.game.hands) {
      delete room.game.hands[playerId];
      delete room.game.unoCalled[playerId];
    }

    if (!room.game.logs) room.game.logs = [];
    room.game.logs.push({ type: "player-timeout", player: playerName });
    if (room.game.logs.length > 15) room.game.logs.shift();

    if (room.players.length < 2) {
      room.status = "finished";
      room.game.winner = room.players[0].name;
      broadcastGame(room);
    } else {
      if (room.game.currentTurn >= room.players.length) {
        room.game.currentTurn = 0;
      }
      broadcastGame(room);
    }
  } else {
    broadcastRoom(room);
  }
}

io.on("connection", (socket) => {
  socket.on("create-room", ({ name, avatar, color, settings }) => {
    const playerName = (name || "Player").trim().slice(0, 20) || "Player";
    const room = createRoom(socket.id, playerName, settings);
    const hostPlayer = room.players[0];
    hostPlayer.avatar = avatar || "👤";
    hostPlayer.color = color || "#e2e8f0";
    socket.join(room.code);
    socket.emit("room-joined", { room: getPublicRoom(room), playerId: hostPlayer.playerId });
    broadcastRoom(room);
  });

  socket.on("join-room", ({ code, name, avatar, color }) => {
    const playerName = (name || "Player").trim().slice(0, 20) || "Player";
    const result = joinRoom(code, socket.id, playerName);
    if (result.error) {
      socket.emit("room-error", result.error);
      return;
    }
    result.player.avatar = avatar || "👤";
    result.player.color = color || "#e2e8f0";
    socket.join(result.room.code);
    socket.emit("room-joined", { room: getPublicRoom(result.room), playerId: result.player.playerId });
    broadcastRoom(result.room);
  });

  socket.on("rejoin-room", ({ code, playerId }) => {
    const result = rejoinRoom(code, playerId, socket.id);
    if (result.error) {
      socket.emit("rejoin-failed", result.error);
      return;
    }

    const { room, player, oldSocketId } = result;

    // Join new socket to the room channel
    socket.join(room.code);

    // Map old game state references to the new socket ID
    if (room.status === "playing" && room.game) {
      if (room.game.hands && room.game.hands[oldSocketId]) {
        room.game.hands[socket.id] = room.game.hands[oldSocketId];
        delete room.game.hands[oldSocketId];
      }
      if (room.game.unoCalled && room.game.unoCalled[oldSocketId]) {
        room.game.unoCalled[socket.id] = true;
        delete room.game.unoCalled[oldSocketId];
      }
      if (room.game.pendingWild && room.game.pendingWild.playerId === oldSocketId) {
        room.game.pendingWild.playerId = socket.id;
      }
    }

    // Retain host status under the new socket ID
    if (room.hostId === oldSocketId) {
      room.hostId = socket.id;
    }

    // Confirm rejoin with room metadata and playerId
    socket.emit("room-joined", { room: getPublicRoom(room), playerId: player.playerId });

    if (room.status === "playing") {
      // Re-send the player's private hand
      socket.emit("your-hand", getPlayerHand(room, socket.id));

      if (!room.game.logs) room.game.logs = [];
      room.game.logs.push({ type: "player-reconnect", player: player.name });
      if (room.game.logs.length > 15) room.game.logs.shift();

      broadcastGame(room);
    } else {
      broadcastRoom(room);
    }
  });

  socket.on("leave-room", () => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    const playerName = player ? player.name : "Player";

    const updatedRoom = leaveRoom(socket.id);
    socket.leave(room.code);

    if (updatedRoom) {
      handlePlayerLeft(updatedRoom, socket.id, playerName);
    }
  });

  socket.on("start-game", () => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;
    if (room.hostId !== socket.id) {
      socket.emit("room-error", "Only the host can start the game");
      return;
    }
    if (room.players.length < 2) {
      socket.emit("room-error", "Need at least 2 players to start");
      return;
    }
    if (room.status !== "waiting") return;

    startGame(room);

    room.players.forEach((player) => {
      io.to(player.id).emit("your-hand", getPlayerHand(room, player.id));
    });
    io.to(room.code).emit("game-started", getPublicGameState(room));
  });

  socket.on("play-card", ({ cardIndex }) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;

    const result = playCard(room, socket.id, cardIndex);
    if (result.error) {
      socket.emit("room-error", result.error);
      return;
    }

    broadcastGame(room);
  });

  socket.on("choose-color", ({ color }) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;

    const result = chooseColor(room, socket.id, color);
    if (result.error) {
      socket.emit("room-error", result.error);
      return;
    }

    broadcastGame(room);
  });

  socket.on("draw-card", () => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;

    const result = drawCard(room, socket.id);
    if (result.error) {
      socket.emit("room-error", result.error);
      return;
    }

    broadcastGame(room);
  });

  socket.on("pass-turn", () => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;

    const result = passTurn(room, socket.id);
    if (result.error) {
      socket.emit("room-error", result.error);
      return;
    }

    broadcastGame(room);
  });

  socket.on("call-uno", () => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;

    const result = callUno(room, socket.id);
    if (result.error) {
      socket.emit("room-error", result.error);
      return;
    }

    io.to(room.code).emit("game-updated", getPublicGameState(room));
  });

  socket.on("challenge-uno", () => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;

    const result = challengeUno(room, socket.id);
    if (result.error) {
      socket.emit("room-error", result.error);
      return;
    }

    broadcastGame(room);
  });

  socket.on("reset-game", () => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;

    const result = resetGame(room, socket.id);
    if (result.error) {
      socket.emit("room-error", result.error);
      return;
    }

    broadcastRoom(room);
  });

  socket.on("update-profile", ({ name, avatar, color }) => {
    const room = getRoomByPlayer(socket.id);
    const sanitizedName = (name || "Player").trim().slice(0, 20) || "Player";
    
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.name = sanitizedName;
        if (avatar) player.avatar = avatar;
        if (color) player.color = color;
      }
      if (room.status === "playing") {
        broadcastGame(room);
      } else {
        broadcastRoom(room);
      }
    }
  });

  socket.on("update-settings", ({ settings }) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;
    if (room.hostId !== socket.id) {
      socket.emit("room-error", "Only the host can change settings");
      return;
    }
    if (room.status !== "waiting") {
      socket.emit("room-error", "Cannot change settings mid-game");
      return;
    }
    room.settings = {
      matchType: settings.matchType || 1,
      startingDirection: settings.startingDirection !== undefined ? settings.startingDirection : 1,
      startingCards: settings.startingCards || 7,
      drawUntilPlayable: !!settings.drawUntilPlayable,
      unoChallenge: settings.unoChallenge !== false,
      spectators: !!settings.spectators,
      roomVisibility: settings.roomVisibility || "private",
      stacking: !!settings.stacking,
      jumpIn: !!settings.jumpIn,
    };
    broadcastRoom(room);
  });

  socket.on("send-emote", ({ emote }) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;
    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;
    io.to(room.code).emit("emote-received", { playerId: socket.id, playerName: player.name, emote });
  });

  socket.on("send-chat", ({ text }) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;
    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;
    const safeText = (text || "").toString().trim().slice(0, 200);
    if (!safeText) return;
    io.to(room.code).emit("chat-message", {
      senderName: player.name,
      text: safeText,
      senderId: socket.id,
    });
  });


  // Auto-UNO penalty: player forgot to call UNO before playing their last card
  socket.on("self-uno-penalty", () => {
    const room = getRoomByPlayer(socket.id);
    if (!room || room.status !== "playing" || !room.game) return;

    const hand = room.game.hands[socket.id];
    // Only apply if player still has cards and hasn't called UNO
    if (!hand || hand.length === 0 || room.game.unoCalled[socket.id]) return;

    const { drawCard: drawFromGame } = require("./server/game");
    // Draw 2 penalty cards
    const drawn1 = room.game.drawPile.length > 0 ? room.game.drawPile.pop() : null;
    const drawn2 = room.game.drawPile.length > 0 ? room.game.drawPile.pop() : null;
    if (drawn1) hand.push(drawn1);
    if (drawn2) hand.push(drawn2);

    const player = room.players.find(p => p.id === socket.id);
    if (!room.game.logs) room.game.logs = [];
    room.game.logs.push({ type: "uno-penalty-self", player: player ? player.name : "Someone", count: [drawn1, drawn2].filter(Boolean).length });
    if (room.game.logs.length > 15) room.game.logs.shift();

    // Send updated hand only to this player, broadcast state
    io.to(socket.id).emit("your-hand", room.game.hands[socket.id]);
    io.to(socket.id).emit("uno-penalty-applied", { count: [drawn1, drawn2].filter(Boolean).length });
    io.to(room.code).emit("game-updated", getPublicGameState(room));
  });

  socket.on("disconnect", () => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    player.disconnected = true;

    if (room.status === "playing" && room.game) {
      if (!room.game.logs) room.game.logs = [];
      room.game.logs.push({ type: "player-disconnect", player: player.name });
      if (room.game.logs.length > 15) room.game.logs.shift();
      broadcastGame(room);
    } else {
      broadcastRoom(room);
    }

    const timeoutDuration = room.status === "playing" ? 300000 : 300000; // 5 minutes grace period
    player.disconnectTimeout = setTimeout(() => {
      const index = room.players.findIndex((p) => p.playerId === player.playerId);
      if (index === -1) return;
      if (!room.players[index].disconnected) return;

      const timedOutPlayer = room.players[index];
      const updatedRoom = leaveRoom(timedOutPlayer.id);

      if (updatedRoom) {
        clearRoomTimer(updatedRoom.code);
        handlePlayerLeft(updatedRoom, timedOutPlayer.id, timedOutPlayer.name);
      }
    }, timeoutDuration);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

