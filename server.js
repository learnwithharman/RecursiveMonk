const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("Player joined");

  socket.on("play-card", (card) => {
    io.emit("card-played", card);
  });
});

server.listen(3000, () => {
  console.log("Server running on 3000");
});