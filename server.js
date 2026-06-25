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
} = require("./server/game");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

function broadcastRoom(room) {
  io.to(room.code).emit("room-updated", getPublicRoom(room));
}

function broadcastGame(room) {
  room.players.forEach((player) => {
    io.to(player.id).emit("your-hand", getPlayerHand(room, player.id));
  });
  io.to(room.code).emit("game-updated", getPublicGameState(room));
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
  socket.on("create-room", ({ name }) => {
    const playerName = (name || "Player").trim().slice(0, 20) || "Player";
    const room = createRoom(socket.id, playerName);
    socket.join(room.code);
    const hostPlayer = room.players[0];
    socket.emit("room-joined", { room: getPublicRoom(room), playerId: hostPlayer.playerId });
    broadcastRoom(room);
  });

  socket.on("join-room", ({ code, name }) => {
    const playerName = (name || "Player").trim().slice(0, 20) || "Player";
    const result = joinRoom(code, socket.id, playerName);
    if (result.error) {
      socket.emit("room-error", result.error);
      return;
    }
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

  socket.on("send-emote", ({ emote }) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;
    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;
    io.to(room.code).emit("emote-received", { playerId: socket.id, playerName: player.name, emote });
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

    const timeoutDuration = room.status === "playing" ? 30000 : 5000;
    player.disconnectTimeout = setTimeout(() => {
      const index = room.players.findIndex((p) => p.playerId === player.playerId);
      if (index === -1) return;
      if (!room.players[index].disconnected) return;

      const timedOutPlayer = room.players[index];
      const updatedRoom = leaveRoom(timedOutPlayer.id);

      if (updatedRoom) {
        handlePlayerLeft(updatedRoom, timedOutPlayer.id, timedOutPlayer.name);
      }
    }, timeoutDuration);
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
