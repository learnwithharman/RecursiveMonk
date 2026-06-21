const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const {
  createRoom,
  joinRoom,
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

io.on("connection", (socket) => {
  socket.on("create-room", ({ name }) => {
    const playerName = (name || "Player").trim().slice(0, 20) || "Player";
    const room = createRoom(socket.id, playerName);
    socket.join(room.code);
    socket.emit("room-joined", getPublicRoom(room));
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
    socket.emit("room-joined", getPublicRoom(result.room));
    broadcastRoom(result.room);
  });

  socket.on("leave-room", () => {
    const room = leaveRoom(socket.id);
    if (!room) return;
    socket.leave(room.code);
    broadcastRoom(room);
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

    // Broadcast state so UNO badge updates for everyone
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

    // Broadcast updated room so everyone returns to lobby
    broadcastRoom(room);
  });

  socket.on("disconnect", () => {
    const room = leaveRoom(socket.id);
    if (!room) return;
    broadcastRoom(room);
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
