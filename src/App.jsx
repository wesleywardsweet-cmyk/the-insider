import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import wordPairs from "./wordPairs";

const fakePlayers = ["Wesley", "Sarah", "Mike", "Alex"];
const playerColors = [
  "#4da6ff", // Blue
  "#3cff78", // Green
  "#ffd84d", // Yellow
  "#c77dff", // Purple
  "#ff914d", // Orange
  "#ff66b3", // Pink
  "#66fff2", // Cyan
  "#ff4d4d", // Red
  "#b6ff4d", // Lime
  "#ffffff", // White
];
const socket = io("http://10.0.0.50:3001");
function App() {
  const [screen, setScreen] = useState("menu");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [players, setPlayers] = useState(fakePlayers);
  const [role, setRole] = useState("");
  const [timer, setTimer] = useState(10);
  const [wordPair, setWordPair] = useState(wordPairs[0]);
  const [playerVotes, setPlayerVotes] = useState({});
const [hasVoted, setHasVoted] = useState(false);
const [selectedFinalVote, setSelectedFinalVote] = useState("");
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [round, setRound] = useState(1);
const [skipIntermissionVotes, setSkipIntermissionVotes] = useState(0);
const [extendDeliberationVotes, setExtendDeliberationVotes] = useState(0);
const [skipVotingVotes, setSkipVotingVotes] = useState(0);
const [endDeliberationVotes, setEndDeliberationVotes] = useState(0);
const [votedEndDeliberation, setVotedEndDeliberation] = useState(false);
const [votedSkipVoting, setVotedSkipVoting] = useState(false);
const [votedExtendDeliberation, setVotedExtendDeliberation] = useState(false);
const [voteTimer, setVoteTimer] = useState(30);
const [lobbyReadyPlayers, setLobbyReadyPlayers] = useState([]);
const [returnedLobbyPlayers, setReturnedLobbyPlayers] = useState([]);
const [isHost, setIsHost] = useState(false);
const [readyPlayers, setReadyPlayers] = useState([]);
const [finalVoteDetails, setFinalVoteDetails] = useState([]);
const [playerRoles, setPlayerRoles] = useState([]);
const [disconnectMessage, setDisconnectMessage] = useState("");
const [bugText, setBugText] = useState("");
const [bugReports, setBugReports] = useState([]);

const [chatMessages, setChatMessages] = useState([]);
const [chatText, setChatText] = useState("");
const chatEndRef = useRef(null);
function getPlayerColor(name) {
  const index = players.findIndex(
    (player) => player === name
  );

  return playerColors[index % playerColors.length];
}

  socket.on("room-created", (data) => {
    setIsHost(true);
  console.log("ROOM CREATED:", data);
  setRoomCode(data.roomCode);
setPlayers(data.players.map((player) => player.name));

const currentPlayerData = data.players.find(
  (player) =>
    player.name.trim().toLowerCase() ===
    (playerName || "Player").trim().toLowerCase()
);

setIsHost(currentPlayerData?.host === true);

setScreen("lobby");
});
socket.on("room-updated", (data) => {
  console.log("ROOM UPDATED:", data);
  if (screen === "match-ended") {
  return;
}

  const playerStillInRoom = data.players.some(
    (player) =>
      player.name.trim().toLowerCase() ===
      (playerName || "Player").trim().toLowerCase()
  );

  if (!playerStillInRoom) {
    return;
  }

  setRoomCode(data.roomCode);
setPlayers(data.players.map((player) => player.name));

const currentPlayerData = data.players.find(
  (player) =>
    player.name.trim().toLowerCase() ===
    (playerName || "Player").trim().toLowerCase()
);

setIsHost(currentPlayerData?.host === true);

setScreen("lobby");
});
socket.on("room-error", (message) => {
  alert(message);
});

socket.on("spectator-joined", ({ roomCode }) => {
  setRoomCode(roomCode);
  setScreen("spectator");
});

socket.on("chat-updated", ({ messages }) => {
  setChatMessages(messages || []);
});
socket.on("bug-reports-updated", ({ reports }) => {
  setBugReports(reports || []);
  setScreen("view-bugs");
});

socket.on("game-started", (data) => {
  setHasVoted(false);
  setSelectedFinalVote("");
  setPlayerVotes({});
  setFinalVoteDetails([]);

  setVotedSkipVoting(false);
  setVotedEndDeliberation(false);
  setVotedExtendDeliberation(false);

  setSkipVotingVotes(0);
  setEndDeliberationVotes(0);
  setExtendDeliberationVotes(0);

  setReadyPlayers([]);
  setLobbyReadyPlayers([]);
  setReturnedLobbyPlayers([]);
  setPlayers(data.players.map((player) => player.name));
  setPlayerRoles(data.players);
  startGame(data.wordPair, data.role);
});
socket.on("ready-updated", ({ readyPlayers }) => {
  setReadyPlayers(readyPlayers);
});
socket.on("deliberation-extended", ({ timer }) => {
  setTimer(timer);
});
socket.on("extend-deliberation-updated", ({ votes }) => {
  setExtendDeliberationVotes(votes);
});
socket.on("lobby-ready-updated", ({ readyPlayers }) => {
  setLobbyReadyPlayers(readyPlayers);
});
socket.on("all-lobby-ready", () => {
  setTimer(5);
  setScreen("match-starting");
});
socket.on("turns-started", () => {
  const isInCurrentGame = players.some(
    (player) =>
      player.trim().toLowerCase() ===
      (playerName || "Player").trim().toLowerCase()
  );

  if (!isInCurrentGame) return;

  setTimer(3);
  setCurrentPlayerIndex(0);
  setScreen("testimony-starting");
});
socket.on("turn-changed", ({ nextIndex }) => {
  if (nextIndex >= players.length) {
    setTimer(60);
    setScreen("DELIBERATION");
  } else {
    setCurrentPlayerIndex(nextIndex);
    setTimer(10);
    setScreen("turn");
  }
});
socket.on("skip-voting-updated", ({ votes }) => {
  setSkipVotingVotes(votes);
});
socket.on("final-votes-updated", ({ votes }) => {
  setPlayerVotes(votes);
});

socket.on("final-vote-reveal-started", () => {
  setTimer(5);
});

socket.on("final-voting-complete", ({ voteDetails }) => {
  setFinalVoteDetails(voteDetails || []);
  setScreen("results");
});
socket.on("end-deliberation-updated", ({ votes }) => {
  setEndDeliberationVotes(votes);
});

socket.on("deliberation-ended", () => {
  setSkipVotingVotes(0);
  setVotedSkipVoting(false);

  setEndDeliberationVotes(0);
  setVotedEndDeliberation(false);

  setExtendDeliberationVotes(0);
  setVotedExtendDeliberation(false);

  if (round < 3) {
    setRound(round + 1);
    setCurrentPlayerIndex(0);
    setTimer(3);
    setScreen("testimony-starting");
  } else {
    setTimer(30);
    setScreen("voting");
  }
});
socket.on("returned-lobby-updated", ({ returnedLobbyPlayers }) => {
  setReturnedLobbyPlayers(returnedLobbyPlayers);
});

socket.on("match-ended-player-left", ({ playerName, players }) => {
  setDisconnectMessage(`${playerName} disconnected.`);

  setScreen("match-ended");

  setTimeout(() => {
    setScreen("lobby");
    setPlayers(players.map((player) => player.name));
    setDisconnectMessage("");
    setLobbyReadyPlayers([]);
    setReadyPlayers([]);
    setPlayerVotes({});
    setHasVoted(false);
    setFinalVoteDetails([]);
    setPlayerRoles([]);
    setRole("");
    setRound(1);
    setCurrentPlayerIndex(0);
  }, 3000);
});
socket.on("sent-to-menu", () => {
  setScreen("menu");
  setRoomCode("");
  setPlayers([]);
  setReturnedLobbyPlayers([]);
  setLobbyReadyPlayers([]);
  setReadyPlayers([]);
  setPlayerVotes({});
  setHasVoted(false);
  setFinalVoteDetails([]);
  setPlayerRoles([]);
  setRole("");
  setRound(1);
  setCurrentPlayerIndex(0);
});



socket.on("voting-started", () => {
  setHasVoted(false);
  setPlayerVotes({});
  setFinalVoteDetails([]);
  setSkipVotingVotes(0);
  setExtendDeliberationVotes(0);
  setEndDeliberationVotes(0);
  setTimer(30);
  setScreen("voting");
});

function sendChatMessage() {
  const trimmedText = chatText.trim();

  if (!trimmedText) return;

  if (screen === "turn") {
    if (!isYourTurn) return;

    if (trimmedText.includes(" ")) {
      alert("During testimony, you can only type one word.");
      return;
    }

    
  }

  socket.emit("send-chat-message", {
  roomCode,
  playerName: playerName || "Player",
  text: trimmedText,
});

setChatText("");

if (screen === "turn") {
  if (isYourTurn) {
    nextTurnOrIntermission();
  }
}
}

useEffect(() => {
  if (chatEndRef.current) {
    chatEndRef.current.parentElement.scrollTop =
      chatEndRef.current.parentElement.scrollHeight;
  }
}, [chatMessages]);

function voteToSkipVoting() {
  if (votedSkipVoting) return;

  setVotedSkipVoting(true);

  socket.emit("vote-skip-voting", {
    roomCode,
    playerName: playerName || "Player",
  });
}

function voteToEndDeliberation() {
  if (votedEndDeliberation) return;

  setVotedEndDeliberation(true);

  socket.emit("vote-end-deliberation", {
    roomCode,
    playerName: playerName || "Player",
  });
}
function createGame() {
    socket.emit("create-room", playerName || "Player");
  }
function hostStartGame() {
  const chosenWord = wordPairs[Math.floor(Math.random() * wordPairs.length)];

  socket.emit("start-game", {
    roomCode,
    wordPair: chosenWord,
  });
}

function startGame(chosenWord, assignedRole) {
  setWordPair(chosenWord);
  setRole(assignedRole);

    setCurrentPlayerIndex(0);
    setTimer(20);
    setScreen("role");
  }

function startTurns() {
  socket.emit("player-ready", {
    roomCode,
    playerName: playerName || "Player",
  });
}
function lobbyReadyUp() {
  socket.emit("lobby-ready", {
    roomCode,
    playerName: playerName || "Player",
  });
}

 function nextTurnOrIntermission() {
  socket.emit("next-turn", {
    roomCode,
    nextIndex: currentPlayerIndex + 1,
  });
}


  function startIntermission() {
    setSkipIntermissionVotes(0);
    setTimer(60);
    setScreen("DELIBERATION");
  }

  useEffect(() => {
if (
  screen !== "match-starting" &&
  screen !== "role" &&
  screen !== "testimony-starting" &&
  screen !== "turn" &&
  screen !== "DELIBERATION" &&
  screen !== "voting"
) return;

    const interval = setInterval(() => {
      setTimer((current) => {
        if (current <= 1) {
          clearInterval(interval);
          if (screen === "match-starting") {
  hostStartGame();
}

if (screen === "role") {
  startTurns();
}
          if (screen === "testimony-starting") {
            setTimer(10);
            setScreen("turn");
          }
          if (screen === "turn") {
  if (isYourTurn) {
    nextTurnOrIntermission();
  }
}

if (screen === "DELIBERATION") {
  setSkipVotingVotes(0);
  setExtendDeliberationVotes(0);
  setEndDeliberationVotes(0);

  if (round < 3) {
    socket.emit("reset-round-turns", { roomCode });
    setRound(round + 1);
    setCurrentPlayerIndex(0);
    setTimer(3);
    setScreen("testimony-starting");
  } else {
    setTimer(30);
    setScreen("voting");
  }
}
if (screen === "voting") {
  socket.emit("final-vote-time-ended", {
    roomCode,
  });
}

          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [screen, currentPlayerIndex]);

const currentPlayer = players[currentPlayerIndex];

const normalizedCurrentPlayer = (currentPlayer || "").trim().toLowerCase();
const normalizedPlayerName = (playerName || "Wesley").trim().toLowerCase();

const isYourTurn = normalizedCurrentPlayer === normalizedPlayerName;
  const insiderPlayer = playerRoles.find(
  (player) => player.role === "The Insider"
);

const voteCounts = finalVoteDetails.reduce((counts, vote) => {
  counts[vote.votedFor] = (counts[vote.votedFor] || 0) + 1;
  return counts;
}, {});

const highestVoteCount = Math.max(...Object.values(voteCounts), 0);

const playersWithHighestVotes = Object.keys(voteCounts).filter(
  (player) => voteCounts[player] === highestVoteCount
);

const isTie = playersWithHighestVotes.length > 1;

const votedOutPlayer = isTie ? null : playersWithHighestVotes[0];

const juryWins =
  !isTie &&
  insiderPlayer &&
  votedOutPlayer === insiderPlayer.name;

  return (
    <div style={styles.page}>
      <div style={styles.watermark}>👁</div>
{screen !== "menu" &&
 screen !== "lobby" &&
 screen !== "results" &&
 screen !== "bug-report" && (
  <div style={styles.bombTimer}>
    {timer}
  </div>
)}

{screen !== "menu" &&
 screen !== "lobby" &&
 screen !== "role" &&
 screen !== "results" &&
 screen !== "bug-report" && (
  <div
  style={{
    ...styles.insiderHintBadge,
    backgroundColor:
      role === "The Insider"
        ? "rgba(120,0,0,0.85)"
        : "rgba(0,120,40,0.85)",
    color:
      role === "The Insider"
        ? "#ff4d4d"
        : "#3cff78",
    border:
      role === "The Insider"
        ? "1px solid #ff4d4d"
        : "1px solid #3cff78",
    boxShadow:
      role === "The Insider"
        ? "0 0 12px rgba(255,77,77,0.45)"
        : "0 0 12px rgba(60,255,120,0.45)",
  }}
>
  {role === "The Insider"
    ? `Hint: ${wordPair.hint}`
    : `Word: ${wordPair.word}`}
</div>
)}
      <div style={styles.card}>
        {screen === "menu" && (
          <>
            <div style={styles.logo}>🕵️ The Insider</div>
<p style={styles.signature}>Created by Wesley Marshall</p>
            <p>A voice-based social deduction game.</p>

            <input
              style={styles.input}
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <input
  style={styles.input}
  placeholder="Enter room code"
  value={joinCode}
  maxLength={4}
  onChange={(e) =>
    setJoinCode(
      e.target.value.toUpperCase().slice(0, 4)
    )
  }
/>

<button
  style={styles.button}
  onClick={() => {
    if (!playerName.trim()) {
      alert("Enter your name first.");
      return;
    }

    createGame();
  }}
>
  Create Game
</button>

<button
  style={styles.secondaryButton}
  onClick={() => {
    if (!playerName.trim()) {
      alert("Enter your name first.");
      return;
    }

    setIsHost(false);

    socket.emit("join-room", {
      roomCode: joinCode,
      playerName: playerName,
    });
  }}
>
  Join Game
</button>

<button
  style={styles.secondaryButton}
  onClick={() => {
    if (!playerName.trim()) {
      alert("Enter your name first.");
      return;
    }

    setScreen("bug-report");
  }}
>
  Report a Bug
</button>
{playerName.trim().toLowerCase() === "wesley" && (
  <button
    style={styles.secondaryButton}
    onClick={() => {
      socket.emit("get-bug-reports");
    }}
  >
    View Bug Reports
  </button>
)}


          </>
        )}

        {screen === "bug-report" && (
  <>
    <h1>REPORT BUG</h1>

    <textarea
      style={styles.bugTextArea}
      placeholder="Describe what happened..."
      value={bugText}
      onChange={(e) => setBugText(e.target.value)}
    />

    <button
      style={styles.button}
      onClick={() => {
        if (!bugText.trim()) {
          alert("Please describe the bug first.");
          return;
        }

        socket.emit("submit-bug-report", {
          playerName: playerName || "Anonymous",
          text: bugText.trim(),
        });

        setBugText("");
        alert("Bug report submitted. Thank you!");
        setScreen("menu");
      }}
    >
      Submit Bug
    </button>

    <button
      style={styles.secondaryButton}
      onClick={() => setScreen("menu")}
    >
      Back
    </button>
  </>
)}


{screen === "view-bugs" && (
  <>
    <h1>BUG REPORTS</h1>

    {bugReports.length === 0 ? (
      <p>No bug reports yet.</p>
    ) : (
      <div style={styles.bugReportsBox}>
        {bugReports.map((report, index) => (
          <div key={index} style={styles.bugReportCard}>
            <div style={styles.bugReportHeader}>
              {report.playerName || "Anonymous"}
            </div>

            <div style={styles.bugReportTime}>
              {report.time}
            </div>

            <p style={styles.bugReportText}>
              {report.text}
            </p>
          </div>
        ))}
      </div>
    )}

    <button
      style={styles.secondaryButton}
      onClick={() => setScreen("menu")}
    >
      Back
    </button>
  </>
)}

{screen === "lobby" && (
          <>
            <h1>Lobby</h1>
            <div style={styles.roomCode}>{roomCode}</div>

<button
  style={styles.secondaryButton}
  onClick={() => navigator.clipboard.writeText(roomCode)}
>
  Copy Room Code
</button>

            <h3>Lobby Players {(returnedLobbyPlayers.length > 0 ? returnedLobbyPlayers : players).length}/10</h3>

<div style={styles.lobbyGrid}>
  {Array.from({ length: 10 }).map((_, index) => {
    const lobbyPlayers =
  returnedLobbyPlayers.length > 0 ? returnedLobbyPlayers : players;

const player = lobbyPlayers[index];

    return (
      <div
        key={index}
        style={player ? styles.lobbyPlayerSlot : styles.emptyLobbySlot}
      >
        {player ? (
          <>
            <span style={styles.lobbyStatusDot}>
              {lobbyReadyPlayers.includes(player) ? "🟢" : "🔴"}
            </span>

            <span
  style={{
    ...styles.lobbyPlayerName,
    color: getPlayerColor(player),
  }}
>
  {player}
</span>

            {index === 0 && (
              <span style={styles.hostBadge}>
                HOST
              </span>
            )}
          </>
        ) : (
          <span style={styles.emptySlotText}>
            EMPTY SLOT
          </span>
        )}
      </div>
    );
  })}
</div>

            <div style={styles.settingsBox}>
              <p>Turn Length: 10 seconds</p>
              <p>Intermission: 60 seconds</p>
              <p>Players Allowed: 4–10</p>
              <p>Insiders: 1</p>
            </div>
<button
  style={{
    ...styles.button,
    backgroundColor: lobbyReadyPlayers.some(
  (name) =>
    name.trim().toLowerCase() ===
    (playerName || "Player").trim().toLowerCase()
)
  ? "#0b6b3a"
  : undefined,
  }}
  onClick={lobbyReadyUp}
>
  Ready Up
</button>
{isHost ? (
  <button style={styles.button} onClick={hostStartGame}>
    Start Game
  </button>
) : (
  <p>Waiting for host to start the game...</p>
)}

            <button
  style={styles.secondaryButton}
  onClick={() => {
    const leavingRoomCode = roomCode;

    setScreen("menu");
    setRoomCode("");
    setJoinCode("");
    setPlayers(fakePlayers);
    setLobbyReadyPlayers([]);
    setReturnedLobbyPlayers([]);
    setReadyPlayers([]);
    setIsHost(false);

    socket.emit("leave-room", {
      roomCode: leavingRoomCode,
    });
  }}
>
  Back
</button>
          </>
        )}

        {screen === "role" && (
          <>
<h1
  style={
    role === "The Insider"
      ? styles.insiderTitle
      : styles.jurorTitle
  }
>
  {role === "The Insider"
    ? "YOU ARE THE INSIDER"
    : "YOU ARE PART OF THE JURY"}
</h1>


            <p>Round {round}</p>

<div
  style={
    role === "The Insider"
      ? styles.insiderRoleBox
      : styles.jurorRoleBox
  }
>
  {role}
</div>

            {role === "The Insider" ? (
              <>
                <div style={styles.wordBox}>Hint: {wordPair.hint}</div>
                <p>You are The Insider. Use the hint to blend in.</p>
              </>
            ) : (
              <>
                <div style={styles.wordBox}>Word: {wordPair.word}</div>
                <p>You are innocent. Find The Insider.</p>
              </>
            )}

<div style={styles.turnList}>
  {players.map((player, index) => (
    <div key={index} style={styles.playerRow}>
      <>
  {readyPlayers.includes(player) ? "🟢 Ready" : "🔴 Not Ready"} —{" "}
  <span style={{ color: getPlayerColor(player) }}>
    {player}
  </span>
</>
    </div>
  ))}
</div>

<div style={styles.deliberationStatusBox}>
  Ready: {readyPlayers.length}/{players.length}
</div>

<button
  style={{
    ...styles.button,
    backgroundColor: readyPlayers.some(
      (name) =>
        name.trim().toLowerCase() ===
        (playerName || "Player").trim().toLowerCase()
    )
      ? "#0b6b3a"
      : undefined,
  }}
  onClick={startTurns}
>
  Ready Up
</button>
          </>
        )}
        {screen === "match-starting" && (
  <>
    <h1 style={styles.phaseSubtitle}>MATCH STARTING</h1>

    <div style={styles.currentPlayerBox}>
      Starting in {timer}
    </div>

    <p style={styles.phaseHint}>
      All players are ready. Preparing roles...
    </p>
  </>
)}
{screen === "testimony-starting" && (
  <>
    <h1>Round {round}</h1>
    <h2 style={styles.phaseSubtitle}>TESTIMONIES BEGIN IN</h2>
<p style={styles.phaseHint}>Prepare your one-word clue.</p>


    <div style={styles.currentPlayerBox}>
      First Speaker: <span style={{ color: getPlayerColor(players[0]) }}>
  {players[0]}
</span>
    </div>

    <p>
      Get ready. Only{" "}
<span style={{ color: getPlayerColor(players[0]) }}>
  {players[0]}
</span>{" "}
will be live first.
    </p>
  </>
)}
        {screen === "turn" && (
          <>
            <h1>TESTIMONY</h1>

            <div style={styles.currentPlayerBox}>
  Current Player:{" "}
  <span style={{ color: getPlayerColor(currentPlayer) }}>
    {currentPlayer}
  </span>
  <br />
  Next:{" "}
  {players[currentPlayerIndex + 1] ? (
    <span style={{ color: getPlayerColor(players[currentPlayerIndex + 1]) }}>
      {players[currentPlayerIndex + 1]}
    </span>
  ) : (
    <span style={{ color: "#dfff51" }}>Deliberation</span>
  )}
</div>

            {isYourTurn ? (
              <>
                <div style={styles.liveBox}>🟢 YOU ARE LIVE</div>
                <p>Everyone can hear you. Say your one-word clue.</p>
              </>
            ) : (
              <>
                <div style={styles.mutedBox}>🔴 YOU ARE MUTED</div>
                <p>
  Only{" "}
  <span style={{ color: getPlayerColor(currentPlayer) }}>
    {currentPlayer}
  </span>{" "}
  can be heard right now.
</p>
              </>
            )}

            <div style={styles.turnList}>
              {players.map((player, index) => (
                <div
                  key={index}
                  style={{
                    ...styles.playerRow,
                    border:
  index === currentPlayerIndex
    ? "2px solid #dfff51"
    : "2px solid transparent",
boxShadow:
  index === currentPlayerIndex
    ? "0 0 18px rgba(223,255,81,0.75)"
    : "none",
backgroundColor:
  index === currentPlayerIndex
    ? "rgba(223,255,81,0.12)"
    : styles.playerRow.backgroundColor,
                  }}
                >
                  {index === currentPlayerIndex
  ? "🟢 CURRENT — "
  : index === currentPlayerIndex + 1
  ? "🟡 NEXT — "
  : "⚪ WAITING — "}

<span style={{ color: getPlayerColor(player) }}>
  {player}
</span>
                </div>
              ))}
            </div>


{isYourTurn && (
  <button style={styles.button} onClick={nextTurnOrIntermission}>
    Done Speaking
  </button>
)}

          </>
        )}

        {screen === "DELIBERATION" && (
          <>
            <h1>DELIBERATION</h1>


            <div style={styles.talkBox}>🟢 DELIBERATION ACTIVE</div>

<div style={styles.deliberationStatusBox}>
  <div>Players Remaining: {players.length}</div>
  <div>Majority Needed: {Math.floor(players.length / 2) + 1}</div>
</div>

<p>Discuss testimony, suspicions, and who may be The Insider.</p>
<div style={styles.turnList}>
  {players.map((player, index) => (
    <div key={index} style={styles.playerRow}>
      <>
  🟢{" "}
  <span style={{ color: getPlayerColor(player) }}>
    {player}
  </span>{" "}
  — Can Talk
</>
    </div>
  ))}
</div>

<button
  style={{
    ...styles.button,
    backgroundColor: votedEndDeliberation ? "#0b6b3a" : undefined,
  }}
  onClick={voteToEndDeliberation}
>
  End Deliberation: {endDeliberationVotes}/{Math.floor(players.length / 2) + 1} Needed
</button>

<button
  style={{
    ...styles.button,
    backgroundColor: votedSkipVoting ? "#0b6b3a" : undefined,
  }}
  onClick={voteToSkipVoting}
>
  Call for Vote: {skipVotingVotes}/{Math.floor(players.length / 2) + 1} Needed
</button>
<button
  style={{
    ...styles.button,
    backgroundColor: votedExtendDeliberation ? "#0b6b3a" : undefined,
  }}
  onClick={() => {
    if (votedExtendDeliberation) return;

    setVotedExtendDeliberation(true);

    socket.emit("vote-extend-deliberation", {
      roomCode,
      playerName: playerName || "Player",
      timer,
    });
  }}
>
  Extend Deliberation +30s: {extendDeliberationVotes}/{Math.floor(players.length / 2) + 1} Needed
</button>


          </>
        )}

        {screen === "voting" && (
          <>
<h1 style={styles.voteTitle}>VOTE OUT THE INSIDER</h1>
<p style={styles.phaseHint}>
  Choose the player you believe is The Insider.
</p>

            {players.map((player, index) => (
<button
  key={index}
  style={{
  ...styles.voteButton,
  backgroundColor:
  selectedFinalVote === player
    ? "#0b6b3a"
    : undefined,
}}
  onClick={() => {
    if (hasVoted) return;

    socket.emit("submit-final-vote", {
      roomCode,
      votedFor: player,
    });

    setHasVoted(true);
    setSelectedFinalVote(player);
  }}
>
<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  }}
>
  <span
  style={{
    color: getPlayerColor(player),
    fontWeight: "bold",
  }}
>
  {player}
</span>

  <span style={styles.voteTally}>
    {(() => {
      const votes = playerVotes[player] || 0;

      if (votes === 0) return "—";

      const groups = Math.floor(votes / 5);
      const remainder = votes % 5;

      return "🟩".repeat(votes);
    })()}
  </span>
</div>
</button>
            ))}
          </>
        )}

{screen === "results" && (
  <>
<h1>FINAL RESULTS</h1>

<div style={juryWins ? styles.juryWinBox : styles.insiderWinBox}>
  <div>{juryWins ? "🏛️ JURY WINS" : "🕵️ THE INSIDER WINS"}</div>
  <div style={styles.winnerSubtitle}>
    {juryWins
      ? "The Insider has been exposed."
      : "The Insider escaped suspicion."}
  </div>
</div>

<p>
  {juryWins
    ? `${votedOutPlayer} was voted out correctly.`
    : `${votedOutPlayer || "No one"} was voted out, but the Insider was ${insiderPlayer?.name}.`}
</p>

    <p>The word was:</p>
    <div style={styles.wordBox}>{wordPair.word}</div>

    <h2>Roles</h2>
    <div style={styles.turnList}>
      {playerRoles.map((player, index) => (
        <div
          key={index}
          style={
            player.role === "The Insider"
              ? styles.insiderResultRow
              : styles.jurorResultRow
          }
        >
          <>
  {player.role === "The Insider" ? "🔴" : "🟢"}{" "}
  <span style={{ color: getPlayerColor(player.name) }}>
    {player.name}
  </span>{" "}
  — {player.role}
</>
        </div>
      ))}
    </div>

<h2 style={styles.resultsSectionTitle}>Final Vote Tally</h2>

<div style={styles.voteBreakdownBox}>
  {playerRoles.map((player, index) => {
    const votes = voteCounts[player.name] || 0;

    return (
      <div key={index} style={styles.voteBreakdownRow}>
        <div
  style={{
    color: getPlayerColor(player.name),
    fontWeight: "bold",
    textAlign: "left",
    marginBottom: "4px",
  }}
>
  {player.name}
</div>

<div style={styles.voteProgressOuter}>
  <div
    style={{
      ...styles.voteProgressInner,
      width: `${players.length > 0 ? (votes / players.length) * 100 : 0}%`,
    }}
  >
    {votes}
  </div>
</div>
      </div>
    );
  })}
</div>

<button
  style={styles.button}
  onClick={() => {
    setLobbyReadyPlayers([]);
    setReadyPlayers([]);
    setPlayerVotes({});
    setHasVoted(false);
    setFinalVoteDetails([]);
    setPlayerRoles([]);
    setRole("");
    setRound(1);
    setCurrentPlayerIndex(0);
    setSkipVotingVotes(0);
    setExtendDeliberationVotes(0);
    setEndDeliberationVotes(0);
    setTimer(10);
    setScreen("lobby");

    socket.emit("return-to-lobby", {
      roomCode,
      playerName: playerName || "Player",
    });
  }}
>
  Return To Lobby
</button>
  </>
)}

{screen === "match-ended" && (
  <>
    <h1 style={styles.voteTitle}>MATCH ENDED</h1>

    <div style={styles.insiderWinBox}>
      {disconnectMessage}
    </div>

    <p style={styles.phaseHint}>
      Returning everyone to the lobby...
    </p>
  </>
)}
{screen === "spectator" && (
  <>
    <h1>GAME IN PROGRESS</h1>

    <p>You joined while a match is already running.</p>

    <p>You are waiting for the next game.</p>

    <p>
      You will automatically join the lobby when the current game ends.
    </p>
  </>
)}

{screen !== "menu" &&
 screen !== "bug-report" && (
  <div
    style={{
      ...styles.chatBox,
      opacity: screen === "turn" && !isYourTurn ? 0.45 : 1,
    }}
  >
    <div style={styles.chatMessages}>
      {chatMessages.map((message, index) => (
        <div
  key={index}
  style={{
    ...styles.chatMessage,
    color: getPlayerColor(message.playerName),
  }}
>
  <strong>
    {message.playerName}:
  </strong>{" "}
  {message.text}
</div>
      ))}
      <div ref={chatEndRef} />
    </div>

    <div style={styles.chatInputRow}>
      <input
  style={styles.chatInput}
  value={chatText}
  placeholder={
  screen === "role"
    ? "Chat disabled during role reveal..."
    : screen === "voting"
    ? "Chat disabled during final voting..."
    : screen === "turn" && !isYourTurn
    ? "Muted during testimony..."
    : "Type a message..."
}
  disabled={
  screen === "role" ||
  screen === "voting" ||
  (screen === "turn" && !isYourTurn)
}
        onChange={(e) => {
  let value = e.target.value;

  if (screen === "turn") {
    value = value.replace(/\s/g, "");
    value = value.slice(0, 14);
  }

  setChatText(value);
}}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            sendChatMessage();
          }
        }}
      />

      <button
  style={styles.chatSendButton}
  onClick={sendChatMessage}
  disabled={
  screen === "role" ||
  screen === "voting" ||
  (screen === "turn" && !isYourTurn)
}
>
        Send
      </button>
    </div>
  </div>
)}
    </div>


    </div>
  );
}

const styles = {

  bugReportsBox: {
  maxHeight: "420px",
  overflowY: "auto",
  display: "grid",
  gap: "12px",
  marginTop: "16px",
},

bugReportCard: {
  backgroundColor: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(223,255,81,0.3)",
  borderRadius: "10px",
  padding: "12px",
  textAlign: "left",
},

bugReportHeader: {
  color: "#dfff51",
  fontWeight: "bold",
  marginBottom: "4px",
},

bugReportTime: {
  color: "#888",
  fontSize: "12px",
  marginBottom: "8px",
},

bugReportText: {
  color: "#fff",
  whiteSpace: "pre-wrap",
},


  bugTextArea: {
  width: "100%",
  minHeight: "180px",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid rgba(223,255,81,0.35)",
  backgroundColor: "#111",
  color: "white",
  fontSize: "16px",
  boxSizing: "border-box",
  resize: "vertical",
},

  deliberationStatusBox: {
  backgroundColor: "rgba(223,255,81,0.08)",
  border: "1px solid rgba(223,255,81,0.35)",
  borderRadius: "10px",
  padding: "10px",
  margin: "12px 0",
  color: "#dfff51",
  fontWeight: "bold",
  display: "grid",
  gap: "4px",
},

  winnerSubtitle: {
  fontSize: "14px",
  marginTop: "6px",
  opacity: 0.85,
  letterSpacing: "1px",
},

  phaseSubtitle: {
  color: "#dfff51",
  fontSize: "28px",
  letterSpacing: "3px",
  textShadow: "0 0 12px rgba(223,255,81,0.7)",
},

phaseHint: {
  color: "#aaa",
  fontSize: "16px",
  marginTop: "-6px",
},

insiderHintBadge: {
  position: "fixed",
  top: "12px",
  left: "12px",
  zIndex: 20,
  backgroundColor: "rgba(120,0,0,0.85)",
  color: "#ff4d4d",
  border: "1px solid #ff4d4d",
  borderRadius: "999px",
  padding: "10px 14px",
  fontWeight: "bold",
  boxShadow: "0 0 12px rgba(255,77,77,0.45)",
},
  
bombTimer: {
  position: "fixed",
  top: "38px",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 10,

  backgroundColor: "#050505",
  color: "#dfff51",
  fontSize: "90px",
  fontWeight: "bold",
  fontFamily: "monospace",
  letterSpacing: "8px",

  padding: "20px 60px",
  borderRadius: "18px",
  border: "2px solid rgba(223,255,81,0.75)",
  boxShadow: "0 0 25px rgba(223,255,81,0.55)",
  textShadow: "0 0 12px #dfff51",
},

    logo: {
    fontSize: "48px",
    fontWeight: "bold",
    color: "#dfff51",
    textShadow: "0 0 15px #dfff51",
    marginBottom: "8px",
  },
  signature: {
    fontSize: "11px",
    color: "#777",
    marginBottom: "20px",
  },
  watermark: {
    position: "fixed",
fontSize: "1000px",
  opacity: 0.02,
  color: "#dfff51",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  pointerEvents: "none",
  },
resultsSectionTitle: {
  color: "#dfff51",
  fontSize: "24px",
  letterSpacing: "2px",
  textTransform: "uppercase",
  marginTop: "24px",
},
voteInsider: {
  color: "#ff4d4d",
  fontWeight: "bold",
  textShadow: "0 0 8px rgba(255,77,77,0.8)",
},

voteJuror: {
  color: "#3cff78",
  fontWeight: "bold",
  textShadow: "0 0 8px rgba(60,255,120,0.8)",
},
voteBreakdownBox: {
  marginTop: "12px",
  display: "grid",
  gap: "10px",
},

voteBreakdownRow: {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  backgroundColor: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(223,255,81,0.25)",
  borderRadius: "10px",
  padding: "12px",
  fontWeight: "bold",
},

voteBar: {
  color: "#3cff78",
  letterSpacing: "2px",
  textShadow: "0 0 8px rgba(60,255,120,0.7)",
},

voteProgressOuter: {
  width: "100%",
  height: "26px",
  backgroundColor: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(223,255,81,0.25)",
  borderRadius: "999px",
  overflow: "hidden",
},

voteProgressInner: {
  height: "100%",
  backgroundColor: "#3cff78",
  color: "#050505",
  fontWeight: "bold",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "width 0.3s ease",
},

voteTarget: {
  color: "#ff4d4d",
  textShadow: "0 0 8px rgba(255,77,77,0.7)",
},

chatBox: {
  marginTop: "20px",
  backgroundColor: "rgba(0,0,0,0.75)",
  border: "1px solid rgba(223,255,81,0.3)",
  borderRadius: "12px",
  padding: "12px",
  width: "100%",
  maxWidth: "900px",
  boxSizing: "border-box",
},

chatMessages: {
  height: "180px",
  overflowY: "auto",
  textAlign: "left",
  marginBottom: "10px",
  padding: "8px",
  backgroundColor: "rgba(255,255,255,0.04)",
  borderRadius: "8px",
},

chatMessage: {
  marginBottom: "6px",
  color: "#fff",
  wordBreak: "break-word",
},

chatInputRow: {
  display: "flex",
  gap: "8px",
},

chatInput: {
  flex: 1,
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid rgba(223,255,81,0.3)",
  backgroundColor: "#111",
  color: "#fff",
  fontSize: "16px",
},

chatSendButton: {
  padding: "10px 16px",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
},
page: {
  width: "100vw",
  minHeight: "100dvh",
  boxSizing: "border-box",
  overflowX: "hidden",
  background:
    "radial-gradient(circle at center, rgba(223,255,81,0.08), transparent 35%), #080808",
  color: "white",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontFamily: "Arial",
  padding: "40px 20px",
},

  card: {
    backgroundColor: "rgba(20, 20, 20, 0.92)",
    padding: "30px",
    borderRadius: "16px",
    width: "min(92vw, 700px)",
    textAlign: "center",
    border: "1px solid rgba(223,255,81,0.35)",
    boxShadow: "0 0 35px rgba(223,255,81,0.25)",
  },
  input: {
    width: "100%",
    padding: "12px",
    fontSize: "16px",
    marginBottom: "12px",
    borderRadius: "8px",
    border: "none",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "12px",
    fontSize: "18px",
    marginTop: "10px",
    cursor: "pointer",
    borderRadius: "8px",
    border: "none",
    fontWeight: "bold",
  },
  secondaryButton: {
    width: "100%",
    padding: "12px",
    fontSize: "16px",
    marginTop: "10px",
    cursor: "pointer",
    borderRadius: "8px",
    border: "1px solid #777",
    backgroundColor: "transparent",
    color: "white",
  },
  roomCode: {
    fontSize: "24px",
    fontWeight: "bold",
    backgroundColor: "#333",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  playerRow: {
    backgroundColor: "#2b2b2b",
    padding: "10px",
    borderRadius: "8px",
    marginBottom: "8px",
    textAlign: "left",
  },
lobbyGrid: {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "16px",
  marginBottom: "18px",
},

lobbyPlayerSlot: {
  backgroundColor: "rgba(45, 45, 45, 0.95)",
  padding: "14px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  border: "1px solid rgba(223,255,81,0.3)",
  boxShadow: "0 0 12px rgba(223,255,81,0.08)",
},

emptyLobbySlot: {
  backgroundColor: "rgba(20, 20, 20, 0.55)",
  padding: "14px",
  borderRadius: "12px",
  border: "1px dashed rgba(223,255,81,0.25)",
  color: "rgba(255,255,255,0.35)",
  fontSize: "12px",
  fontWeight: "bold",
  letterSpacing: "1px",
  textAlign: "center",
},

emptySlotText: {
  opacity: 0.55,
},

lobbyStatusDot: {
  fontSize: "18px",
},

lobbyPlayerName: {
  fontSize: "22px",
  fontWeight: "bold",
},

hostBadge: {
  marginLeft: "auto",
  fontSize: "12px",
  fontWeight: "bold",
  color: "#dfff51",
  border: "1px solid rgba(223,255,81,0.6)",
  borderRadius: "999px",
  padding: "4px 8px",
},
  settingsBox: {
    backgroundColor: "#333",
    padding: "12px",
    borderRadius: "10px",
    marginTop: "20px",
    marginBottom: "10px",
  },
roleBox: {
  fontSize: "26px",
  fontWeight: "bold",
  backgroundColor: "#333",
  padding: "16px",
  borderRadius: "10px",
  margin: "20px 0",
},

insiderTitle: {
  color: "#ff4d4d",
  fontSize: "42px",
  fontWeight: "bold",
  textShadow: "0 0 15px rgba(255,77,77,0.8)",
},

jurorTitle: {
  color: "#3cff78",
  fontSize: "42px",
  fontWeight: "bold",
  textShadow: "0 0 15px rgba(60,255,120,0.8)",
},

insiderRoleBox: {
  fontSize: "34px",
  fontWeight: "bold",
  backgroundColor: "rgba(120,0,0,0.7)",
  border: "2px solid #ff4d4d",
  color: "#ff4d4d",
  padding: "16px",
  borderRadius: "12px",
  margin: "20px 0",
  boxShadow: "0 0 20px rgba(255,77,77,0.5)",
},

jurorRoleBox: {
  fontSize: "34px",
  fontWeight: "bold",
  backgroundColor: "rgba(60,255,120,0.08)",
  border: "2px solid #3cff78",
  color: "#3cff78",
  padding: "16px",
  borderRadius: "12px",
  margin: "20px 0",
  boxShadow: "0 0 20px rgba(60,255,120,0.35)",
},
  wordBox: {
    fontSize: "24px",
    fontWeight: "bold",
    backgroundColor: "#444",
    padding: "16px",
    borderRadius: "10px",
    margin: "20px 0",
  },
  currentPlayerBox: {
    fontSize: "20px",
    fontWeight: "bold",
    backgroundColor: "#333",
    padding: "12px",
    borderRadius: "10px",
    marginBottom: "16px",
  },
  liveBox: {
    backgroundColor: "#0b6b3a",
    padding: "14px",
    borderRadius: "10px",
    fontWeight: "bold",
    margin: "20px 0",
  },
  mutedBox: {
    backgroundColor: "#8b0000",
    padding: "14px",
    borderRadius: "10px",
    fontWeight: "bold",
    margin: "20px 0",
  },
  talkBox: {
    backgroundColor: "#0b6b3a",
    padding: "14px",
    borderRadius: "10px",
    fontWeight: "bold",
    margin: "20px 0",
  },
turnList: {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "20px",
},
voteTitle: {
  fontSize: "52px",
  fontWeight: "900",
  color: "#ff4d4d",
  textTransform: "uppercase",
  letterSpacing: "3px",
  marginBottom: "25px",
  textShadow:
    "0 0 10px rgba(255,77,77,0.8), 0 0 25px rgba(255,77,77,0.5)",
},

voteTally: {
  color: "#dfff51",
  fontWeight: "bold",
  letterSpacing: "3px",
  textShadow: "0 0 8px #dfff51",
},

  voteButton: {
    width: "100%",
    padding: "12px",
    fontSize: "16px",
    marginTop: "8px",
    cursor: "pointer",
    borderRadius: "8px",
    border: "none",
  },
insiderResultRow: {
  backgroundColor: "rgba(120,0,0,0.7)",
  border: "1px solid #ff4d4d",
  color: "#ff4d4d",
  padding: "10px",
  borderRadius: "8px",
  textAlign: "left",
  fontWeight: "bold",
},

jurorResultRow: {
  backgroundColor: "rgba(60,255,120,0.08)",
  border: "1px solid #3cff78",
  color: "#3cff78",
  padding: "10px",
  borderRadius: "8px",
  textAlign: "left",
  fontWeight: "bold",
},
juryWinBox: {
  fontSize: "32px",
  fontWeight: "bold",
  color: "#3cff78",
  border: "2px solid #3cff78",
  backgroundColor: "rgba(60,255,120,0.12)",
  padding: "16px",
  borderRadius: "12px",
  marginBottom: "20px",
  boxShadow: "0 0 20px rgba(60,255,120,0.35)",
},

insiderWinBox: {
  fontSize: "32px",
  fontWeight: "bold",
  color: "#ff4d4d",
  border: "2px solid #ff4d4d",
  backgroundColor: "rgba(120,0,0,0.35)",
  padding: "16px",
  borderRadius: "12px",
  marginBottom: "20px",
  boxShadow: "0 0 20px rgba(255,77,77,0.45)",
},
};

export default App;