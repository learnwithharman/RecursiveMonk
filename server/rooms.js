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
  const room = {
    code,
    hostId: hostSocketId,
    status: "waiting",
    players: [{ id: hostSocketId, name: playerName }],
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

  room.players.push({ id: socketId, name: playerName });
  return { room };
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
    players: room.players.map((p) => ({ id: p.id, name: p.name })),
  };
}

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomByPlayer,
  getPublicRoom,
};
