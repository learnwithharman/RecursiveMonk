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

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

function broadcastRoom(room) {
  io.to(room.code).emit("room-updated", getPublicRoom(room));
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

  socket.on("disconnect", () => {
    const room = leaveRoom(socket.id);
    if (!room) return;
    broadcastRoom(room);
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
