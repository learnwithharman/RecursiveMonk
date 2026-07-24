const rooms = new Map();

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function createRoom(hostSocketId, playerName, settings = {}) {
  const code = generateRoomCode();
  const playerId = "p_" + Math.random().toString(36).substr(2, 9);
  const room = {
    code,
    hostId: hostSocketId,
    status: "waiting",
    players: [{ id: hostSocketId, playerId, name: playerName, disconnected: false, avatar: "👤", color: "#e2e8f0" }],
    settings: {
      matchType: settings.matchType || 1, // Best of 1, 3, 5, 7
      startingDirection: settings.startingDirection !== undefined ? settings.startingDirection : 1, // 1: CW, -1: CCW
      startingCards: settings.startingCards || 7, // 5, 7, 9
      drawUntilPlayable: settings.drawUntilPlayable !== undefined ? !!settings.drawUntilPlayable : false,
      unoChallenge: settings.unoChallenge !== undefined ? !!settings.unoChallenge : true,
      spectators: settings.spectators !== undefined ? !!settings.spectators : false,
      roomVisibility: settings.roomVisibility || "private", // public, private
      stacking: settings.stacking !== undefined ? !!settings.stacking : false,
      jumpIn: settings.jumpIn !== undefined ? !!settings.jumpIn : false
    },
    scores: { [playerId]: 0 },
    roundsPlayed: 0,
    roundWinner: null,
    matchWinner: null
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
  const player = { id: socketId, playerId, name: playerName, disconnected: false, avatar: "👤", color: "#e2e8f0" };
  room.players.push(player);
  
  if (!room.scores) room.scores = {};
  room.scores[playerId] = 0;

  return { room, player };
}

function leaveRoom(socketId) {
  for (const [code, room] of rooms.entries()) {
    const index = room.players.findIndex((p) => p.id === socketId);
    if (index === -1) continue;

    const player = room.players[index];
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
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      disconnected: !!p.disconnected,
      avatar: p.avatar || "👤",
      color: p.color || "#e2e8f0"
    })),
    settings: room.settings || { stacking: false, jumpIn: false },
    scores: room.scores || {},
    roundsPlayed: room.roundsPlayed || 0,
    roundWinner: room.roundWinner || null,
    matchWinner: room.matchWinner || null
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
