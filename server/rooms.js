const rooms = new Map();

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function createRoom(hostSocketId, playerName) {
  const code = generateRoomCode();
  const playerId = "p_" + Math.random().toString(36).substr(2, 9);
  const room = {
    code,
    hostId: hostSocketId,
    status: "waiting",
    players: [{ id: hostSocketId, playerId, name: playerName, disconnected: false }],
  };
  rooms.set(code, room);
  return room;
}

function joinRoom(code, socketId, playerName) {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { error: "Room not found" };
  if (room.status !== "waiting") return { error: "Game already started" };
  if (room.players.length >= 10) return { error: "Room is full" };
  if (room.players.some((p) => p.id === socketId)) return { error: "Already in room" };

  const playerId = "p_" + Math.random().toString(36).substr(2, 9);
  const player = { id: socketId, playerId, name: playerName, disconnected: false };
  room.players.push(player);
  return { room, player };
}

function leaveRoom(socketId) {
  for (const [code, room] of rooms.entries()) {
    const index = room.players.findIndex((p) => p.id === socketId);
    if (index === -1) continue;

    room.players.splice(index, 1);

    if (room.players.length === 0) {
      rooms.delete(code);
      return null;
    }

    if (room.hostId === socketId) {
      room.hostId = room.players[0].id;
    }

    return room;
  }
  return null;
}

function rejoinRoom(code, playerId, socketId) {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { error: "Room not found" };

  const player = room.players.find((p) => p.playerId === playerId);
  if (!player) return { error: "Player not found in room" };

  const oldSocketId = player.id;

  if (player.disconnectTimeout) {
    clearTimeout(player.disconnectTimeout);
    delete player.disconnectTimeout;
  }

  player.id = socketId;
  player.disconnected = false;

  return { room, player, oldSocketId };
}

function getRoomByPlayer(socketId) {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.id === socketId)) return room;
  }
  return null;
}

function getPublicRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    players: room.players.map((p) => ({ id: p.id, name: p.name, disconnected: !!p.disconnected })),
  };
}

module.exports = {
  createRoom,
  joinRoom,
  rejoinRoom,
  leaveRoom,
  getRoomByPlayer,
  getPublicRoom,
};
