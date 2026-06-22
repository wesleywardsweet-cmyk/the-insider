const fs = require("fs");
const path = require("path");

const bugReportsFile = path.join(__dirname, "bugReports.json");

function loadBugReports() {
  if (!fs.existsSync(bugReportsFile)) return [];

  try {
    return JSON.parse(fs.readFileSync(bugReportsFile, "utf8"));
  } catch {
    return [];
  }
}

function saveBugReports(reports) {
  fs.writeFileSync(
    bugReportsFile,
    JSON.stringify(reports, null, 2)
  );
}

const bugReports = loadBugReports();

const { Server } = require("socket.io");

const PORT = process.env.PORT || 3001;

const io = new Server(PORT, {
  cors: {
  origin: "*",
  methods: ["GET", "POST"],
},
});

const rooms = {};

function createRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function emitToActivePlayers(room, eventName, payload) {
  if (!room || !room.players) return;

  room.players.forEach((player) => {
    io.to(player.id).emit(eventName, payload);
  });
}

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("submit-bug-report", ({ playerName, text }) => {
  if (!text || !text.trim()) return;

  const report = {
    playerName: playerName || "Anonymous",
    text: text.trim(),
    time: new Date().toISOString(),
  };

  bugReports.push(report);
  saveBugReports(bugReports);

  console.log("BUG REPORT SUBMITTED:", report);

  socket.emit("bug-report-submitted");
});
socket.on("get-bug-reports", () => {
  socket.emit("bug-reports-updated", {
    reports: bugReports,
  });
});

  socket.on("create-room", (playerName) => {
    const roomCode = createRoomCode();

    rooms[roomCode] = {
      players: [
        {
          id: socket.id,
          name: playerName || "Player",
          host: true,
        },
      ],
      lobbyReadyPlayers: [],
      readyPlayers: [],
      messages: [],
      returnedLobbyPlayers: [],
      finalVotes: {},
      finalVoters: [],
      finalVoteDetails: [],
      skipVotingVotes: [],
      extendDeliberationVotes: [],
      endDeliberationVotes: [],
      deliberationExtended: false,
      currentPlayerIndex: 0,
gameInProgress: false,
waitingPlayers: [],
    };

    socket.join(roomCode);

    socket.emit("room-created", {
      roomCode,
      players: rooms[roomCode].players,
    });
  });

  socket.on("join-room", ({ roomCode, playerName }) => {
    const room = rooms[roomCode];

    if (!room) {
      socket.emit("room-error", "Room not found");
      return;
    }

    if (room.gameInProgress) {
  room.waitingPlayers.push({
    id: socket.id,
    name: playerName || "Player",
  });

  socket.join(roomCode);

  socket.emit("spectator-joined", {
    roomCode,
  });

  return;
}

if (room.players.length >= 10) {
  socket.emit("room-error", "Room is full");
  return;
}

room.players.push({
  id: socket.id,
  name: playerName || "Player",
  host: false,
});

socket.join(roomCode);

io.to(roomCode).emit("room-updated", {
  roomCode,
  players: room.players,
});

socket.emit("chat-updated", {
  messages: room.messages || [],
});
  });

  socket.on("start-game", ({ roomCode, wordPair }) => {
  const room = rooms[roomCode];
  if (!room) return;

  room.gameInProgress = true;

    room.lobbyReadyPlayers = [];
    room.readyPlayers = [];
    room.finalVotes = {};
    room.finalVoters = [];
    room.finalVoteDetails = [];
    room.skipVotingVotes = [];
    room.extendDeliberationVotes = [];
    room.endDeliberationVotes = [];
    room.deliberationExtended = false;
    room.currentPlayerIndex = 0;

    if (room.returnedLobbyPlayers && room.returnedLobbyPlayers.length > 0) {
      const returnedPlayers = room.players.filter((player) =>
        room.returnedLobbyPlayers.includes(player.name)
      );

      const notReturnedPlayers = room.players.filter(
        (player) => !room.returnedLobbyPlayers.includes(player.name)
      );

      notReturnedPlayers.forEach((player) => {
        io.to(player.id).emit("sent-to-menu");

        const playerSocket = io.sockets.sockets.get(player.id);
        if (playerSocket) {
          playerSocket.leave(roomCode);
        }
      });

      room.players = returnedPlayers;
    }

    room.returnedLobbyPlayers = [];

    if (room.players.length === 0) {
      delete rooms[roomCode];
      return;
    }

    room.players.sort(() => Math.random() - 0.5);

const insiderIndex = Math.floor(Math.random() * room.players.length);

    room.players = room.players.map((player, index) => ({
      ...player,
      role: index === insiderIndex ? "The Insider" : "Juror",
    }));

    room.wordPair = wordPair;

    room.players.forEach((player) => {
      io.to(player.id).emit("game-started", {
        wordPair,
        role: player.role,
        players: room.players.map((p) => ({
          name: p.name,
          role: p.role,
        })),
      });
    });
  });

  socket.on("lobby-ready", ({ roomCode, playerName }) => {
    const room = rooms[roomCode];
    if (!room) return;

    if (!room.lobbyReadyPlayers) room.lobbyReadyPlayers = [];

    if (!room.lobbyReadyPlayers.includes(playerName)) {
      room.lobbyReadyPlayers.push(playerName);
    }

    io.to(roomCode).emit("lobby-ready-updated", {
      readyPlayers: room.lobbyReadyPlayers,
    });

    const activeLobbyPlayers =
  room.returnedLobbyPlayers && room.returnedLobbyPlayers.length > 0
    ? room.returnedLobbyPlayers
    : room.players.map((player) => player.name);

if (room.lobbyReadyPlayers.length === activeLobbyPlayers.length) {
  activeLobbyPlayers.forEach((name) => {
    const player = room.players.find((p) => p.name === name);

    if (player) {
      io.to(player.id).emit("all-lobby-ready");
    }
  });
}
  });

  socket.on("player-ready", ({ roomCode, playerName }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const playerIsActive = room.players.some((player) => player.id === socket.id);
    if (!playerIsActive) return;

    if (!room.readyPlayers) room.readyPlayers = [];

    if (!room.readyPlayers.includes(playerName)) {
      room.readyPlayers.push(playerName);
    }

    emitToActivePlayers(room, "ready-updated", {
      readyPlayers: room.readyPlayers,
    });

    if (room.readyPlayers.length >= room.players.length) {
      room.readyPlayers = [];
      room.deliberationExtended = false;
      room.extendDeliberationVotes = [];
      room.endDeliberationVotes = [];
      room.skipVotingVotes = [];
      room.currentPlayerIndex = 0;

      emitToActivePlayers(room, "turns-started");
    }
  });

  socket.on("reset-round-turns", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const playerIsActive = room.players.some((player) => player.id === socket.id);
    if (!playerIsActive) return;

    room.currentPlayerIndex = 0;
    room.deliberationExtended = false;
    room.extendDeliberationVotes = [];
    room.endDeliberationVotes = [];
    room.skipVotingVotes = [];
  });

socket.on("next-turn", ({ roomCode }) => {
  const room = rooms[roomCode];
  if (!room) return;

  if (room.turnAdvanceLocked) return;

  if (room.currentPlayerIndex === undefined) {
    room.currentPlayerIndex = 0;
  }

  const currentPlayer = room.players[room.currentPlayerIndex];

  if (!currentPlayer || currentPlayer.id !== socket.id) {
    return;
  }

  room.turnAdvanceLocked = true;

  room.currentPlayerIndex += 1;

  if (room.currentPlayerIndex >= room.players.length) {
    room.deliberationExtended = false;
    room.extendDeliberationVotes = [];
    room.endDeliberationVotes = [];
    room.skipVotingVotes = [];
  }

  emitToActivePlayers(room, "turn-changed", {
    nextIndex: room.currentPlayerIndex,
  });

  setTimeout(() => {
    if (rooms[roomCode]) {
      rooms[roomCode].turnAdvanceLocked = false;
    }
  }, 500);
});

  socket.on("vote-extend-deliberation", ({ roomCode, timer }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const currentPlayer = room.players[room.currentPlayerIndex];

if (!currentPlayer || currentPlayer.id !== socket.id) {
  return;
}

    if (room.deliberationExtended) return;

    if (!room.extendDeliberationVotes) {
      room.extendDeliberationVotes = [];
    }

    if (!room.extendDeliberationVotes.includes(socket.id)) {
      room.extendDeliberationVotes.push(socket.id);
    }

    emitToActivePlayers(room, "extend-deliberation-updated", {
      votes: room.extendDeliberationVotes.length,
    });

    if (room.extendDeliberationVotes.length > room.players.length / 2) {
      room.extendDeliberationVotes = [];
      room.deliberationExtended = true;

      emitToActivePlayers(room, "extend-deliberation-updated", {
        votes: 0,
      });

      emitToActivePlayers(room, "deliberation-extended", {
        timer: timer + 30,
      });
    }
  });

  socket.on("vote-end-deliberation", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const playerIsActive = room.players.some((player) => player.id === socket.id);
    if (!playerIsActive) return;

    if (!room.endDeliberationVotes) {
      room.endDeliberationVotes = [];
    }

    if (!room.endDeliberationVotes.includes(socket.id)) {
      room.endDeliberationVotes.push(socket.id);
    }

    emitToActivePlayers(room, "end-deliberation-updated", {
      votes: room.endDeliberationVotes.length,
    });

    if (room.endDeliberationVotes.length > room.players.length / 2) {
      room.endDeliberationVotes = [];
      room.extendDeliberationVotes = [];
      room.skipVotingVotes = [];
      room.deliberationExtended = false;
      room.currentPlayerIndex = 0;

      emitToActivePlayers(room, "deliberation-ended");
    }
  });

  socket.on("vote-skip-voting", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const playerIsActive = room.players.some((player) => player.id === socket.id);
    if (!playerIsActive) return;

    if (!room.skipVotingVotes) {
      room.skipVotingVotes = [];
    }

    if (!room.skipVotingVotes.includes(socket.id)) {
      room.skipVotingVotes.push(socket.id);
    }

    emitToActivePlayers(room, "skip-voting-updated", {
      votes: room.skipVotingVotes.length,
    });

    if (room.skipVotingVotes.length > room.players.length / 2) {
      room.skipVotingVotes = [];
      room.extendDeliberationVotes = [];
      room.endDeliberationVotes = [];
      room.deliberationExtended = false;

      emitToActivePlayers(room, "voting-started");
    }
  });

  socket.on("submit-final-vote", ({ roomCode, votedFor }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const playerIsActive = room.players.some((player) => player.id === socket.id);
    if (!playerIsActive) return;

    if (!room.finalVotes) room.finalVotes = {};
    if (!room.finalVoters) room.finalVoters = [];
    if (!room.finalVoteDetails) room.finalVoteDetails = [];

    if (room.finalVoters.includes(socket.id)) return;

    room.finalVoters.push(socket.id);

    const voter = room.players.find((player) => player.id === socket.id);

    room.finalVoteDetails.push({
      voter: voter ? voter.name : "Unknown",
      votedFor,
    });

    room.finalVotes[votedFor] = (room.finalVotes[votedFor] || 0) + 1;

    emitToActivePlayers(room, "final-votes-updated", {
      votes: room.finalVotes,
      votesSubmitted: room.finalVoters.length,
    });

    if (room.finalVoters.length >= room.players.length) {
      emitToActivePlayers(room, "final-vote-reveal-started");
    }
  });

  socket.on("final-vote-time-ended", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const playerIsActive = room.players.some((player) => player.id === socket.id);
    if (!playerIsActive) return;

    room.gameInProgress = false;

if (room.waitingPlayers && room.waitingPlayers.length > 0) {
  room.players.push(...room.waitingPlayers);

  room.waitingPlayers.forEach((player) => {
    io.to(player.id).emit("room-updated", {
      roomCode,
      players: room.players,
    });
  });

  room.waitingPlayers = [];

  io.to(roomCode).emit("room-updated", {
    roomCode,
    players: room.players,
  });
}

emitToActivePlayers(room, "final-voting-complete", {
  votes: room.finalVotes || {},
  voteDetails: room.finalVoteDetails || [],
});
  });

  socket.on("send-chat-message", ({ roomCode, playerName, text }) => {
  const room = rooms[roomCode];

  if (!room) return;
  if (!text || !text.trim()) return;
  const activePlayers = room.players;

const playerIsActive = activePlayers.some(
  (player) => player.id === socket.id
);

if (!playerIsActive) return;

  if (!room.messages) {
    room.messages = [];
  }

  const message = {
    playerName: playerName || "Player",
    text: text.trim(),
  };

  room.messages.push(message);


io.to(roomCode).emit("chat-updated", {
  messages: room.messages,
});
});

  socket.on("return-to-lobby", ({ roomCode, playerName }) => {
    const room = rooms[roomCode];
    if (!room) return;

    if (!room.returnedLobbyPlayers) {
      room.returnedLobbyPlayers = [];
    }

    if (!room.returnedLobbyPlayers.includes(playerName)) {
      room.returnedLobbyPlayers.push(playerName);
    }
    
    io.to(socket.id).emit("chat-updated", {
  messages: room.messages || [],
});

    io.to(roomCode).emit("returned-lobby-updated", {
      returnedLobbyPlayers: room.returnedLobbyPlayers,
    });
  });

  socket.on("leave-room", ({ roomCode }) => {
  const room = rooms[roomCode];
  if (!room) return;

  const leavingPlayer = room.players.find(
    (player) => player.id === socket.id
  );

  const leavingPlayerName = leavingPlayer
    ? leavingPlayer.name
    : "A player";

  room.players = room.players.filter((player) => player.id !== socket.id);
  if (room.players.length > 0) {
  room.players = room.players.map((player, index) => ({
    ...player,
    host: index === 0,
  }));
}

  room.lobbyReadyPlayers = room.lobbyReadyPlayers.filter(
    (name) => room.players.some((player) => player.name === name)
  );

  socket.leave(roomCode);

  if (room.players.length === 0) {
    delete rooms[roomCode];
    return;
  }

  if (room.gameInProgress) {
    room.gameInProgress = false;
    room.readyPlayers = [];
    room.finalVotes = {};
    room.finalVoters = [];
    room.finalVoteDetails = [];
    room.skipVotingVotes = [];
    room.extendDeliberationVotes = [];
    room.endDeliberationVotes = [];
    room.deliberationExtended = false;
    room.currentPlayerIndex = 0;

    io.to(roomCode).emit("match-ended-player-left", {
      playerName: leavingPlayerName,
    });

    io.to(roomCode).emit("room-updated", {
      roomCode,
      players: room.players,
    });

    return;
  }

  io.to(roomCode).emit("room-updated", {
    roomCode,
    players: room.players,
  });
});

  socket.on("disconnect", () => {
    for (const roomCode in rooms) {
      const room = rooms[roomCode];

      const disconnectedPlayer = room.players.find(
  (player) => player.id === socket.id
);

const disconnectedPlayerName = disconnectedPlayer
  ? disconnectedPlayer.name
  : "A player";

const wasGameInProgress = room.gameInProgress;

room.players = room.players.filter((player) => player.id !== socket.id);
if (room.players.length > 0) {
  room.players = room.players.map((player, index) => ({
    ...player,
    host: index === 0,
  }));
}

if (wasGameInProgress && disconnectedPlayer) {
  room.gameInProgress = false;
  room.readyPlayers = [];
  room.finalVotes = {};
  room.finalVoters = [];
  room.finalVoteDetails = [];
  room.skipVotingVotes = [];
  room.extendDeliberationVotes = [];
  room.endDeliberationVotes = [];
  room.deliberationExtended = false;
  room.currentPlayerIndex = 0;

  io.to(roomCode).emit("match-ended-player-left", {
  playerName: disconnectedPlayerName,
  roomCode,
  players: room.players,
});

continue;
}

      if (room.returnedLobbyPlayers) {
        const disconnectedPlayerName = room.players.find(
          (player) => player.id === socket.id
        )?.name;

        if (disconnectedPlayerName) {
          room.returnedLobbyPlayers = room.returnedLobbyPlayers.filter(
            (name) => name !== disconnectedPlayerName
          );
        }
      }

      if (room.players.length === 0) {
        delete rooms[roomCode];
      } else {
        io.to(roomCode).emit("room-updated", {
          roomCode,
          players: room.players,
        });
      }
    }
  });
});

console.log(`Multiplayer server running on port ${PORT}`);
