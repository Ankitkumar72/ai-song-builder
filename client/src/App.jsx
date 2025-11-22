import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

// 1. SOCKET CONNECTION
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const URL = isLocal ? "http://localhost:4000" : undefined;
const socket = io(URL);

// --- SUB-COMPONENTS ---

const Lobby = ({ onJoin }) => {
  const [room, setRoom] = useState("");
  const [name, setName] = useState("");

  const handleJoin = (e) => {
    e.preventDefault();
    if (!room || !name) return;
    onJoin(room, name);
  };

  return (
    <div className="w-full max-w-md animate-fade-in-up px-4 text-center">
      <h2 className="text-4xl font-bold text-white mb-2">Welcome, Creator</h2>
      <p className="text-slate-400 mb-8">Join a room to start building music.</p>
      
      <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 shadow-2xl">
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-left text-slate-400 text-sm mb-1 ml-1">Nickname</label>
            <input 
              className="w-full bg-slate-900 border border-slate-700 text-white p-4 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g. DJ Khaled"
              value={name} onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-left text-slate-400 text-sm mb-1 ml-1">Room Code</label>
            <input 
              className="w-full bg-slate-900 border border-slate-700 text-white p-4 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none uppercase tracking-widest font-mono"
              placeholder="ROOM1"
              value={room} onChange={e => setRoom(e.target.value.toUpperCase())}
            />
          </div>
          <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-xl font-bold transition-colors mt-4">
            🚀 Enter Studio
          </button>
        </form>
      </div>
    </div>
  );
};

const LyricInput = ({ sessionId }) => {
  const [text, setText] = useState("");
  const [submittedCount, setSubmittedCount] = useState(0);
  
  const submit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    socket.emit("submit_lyric", { sessionId, lyric: trimmed });
    setText("");
    setSubmittedCount((prev) => prev + 1);
  };

  return (
    <div className="w-full max-w-xl animate-fade-in-up px-4">
      <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 p-6 md:p-8 rounded-2xl shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
          <h3 className="text-xl md:text-2xl font-bold text-white">Phase 1: Inspiration</h3>
          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-mono rounded-full">Room: {sessionId}</span>
        </div>
        <p className="text-slate-400 mb-6 text-sm md:text-base">Submit lyrics to train the AI.</p>
        <form onSubmit={submit} className="relative w-full mb-8">
          <input
            className="w-full bg-slate-900 border border-slate-700 text-white p-4 pr-24 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Neon lights..."
          />
          <button className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 md:px-6 rounded-lg font-bold text-sm md:text-base">
            Send
          </button>
        </form>
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${Math.min(100, (submittedCount / 3) * 100)}%` }}
            ></div>
          </div>
          <span className="text-xs text-slate-500 font-mono">{submittedCount}/3 sent</span>
        </div>
      </div>
    </div>
  );
};

const ThemeVote = ({ themes, sessionId }) => {
  const [votedId, setVotedId] = useState(null);
  const vote = (id) => {
    if (votedId) return;
    setVotedId(id);
    socket.emit("theme_vote", { sessionId, themeId: id });
  };

  return (
    <div className="w-full max-w-5xl animate-fade-in-up px-4 text-center">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">Vote for the Vibe</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {themes && themes.map((t) => (
          <div
            key={t.id}
            onClick={() => vote(t.id)}
            className={`p-6 rounded-xl border-2 cursor-pointer transition-all hover:scale-105 ${
              votedId === t.id
                ? "border-green-500 bg-green-900/20"
                : "border-slate-700 bg-slate-800 hover:border-indigo-500"
            }`}
          >
            <span className="text-xl md:text-2xl font-bold text-white capitalize">{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const LoadingScreen = ({ vibe }) => (
  <div className="flex flex-col items-center justify-center animate-fade-in-up text-center px-4">
    <div className="relative w-32 h-32 mb-8">
      <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
      <div className="absolute inset-4 border-t-4 border-purple-500 rounded-full animate-spin" style={{ animationDirection: "reverse" }}></div>
      <div className="absolute inset-0 flex items-center justify-center text-4xl">💿</div>
    </div>
    <h2 className="text-2xl md:text-4xl font-bold text-white mb-2">Cooking up "{vibe}"</h2>
    <p className="text-indigo-300 animate-pulse">AI is generating 3 variations...</p>
  </div>
);

const SongGrid = ({ songs, sessionId, endTime }) => {
  const [votedSongId, setVotedSongId] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    const interval = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimeLeft(seconds);
      if (seconds <= 0) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [endTime]);

  const voteForSong = (songId) => {
    if (votedSongId === songId) return;
    setVotedSongId(songId);
    socket.emit("vote_song_variation", { sessionId, songId });
  };

  return (
    <div className="w-full max-w-6xl animate-fade-in-up px-4 pb-10">
      <div className="text-center mb-10">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Vote the Banger 🔥</h2>
        <div className="inline-block bg-slate-800 border border-slate-600 px-6 py-2 rounded-full">
           <span className="text-slate-400 mr-2 text-sm md:text-base">Voting ends in:</span>
           <span className={`font-mono text-lg md:text-xl font-bold ${timeLeft < 5 ? "text-red-500 animate-pulse" : "text-white"}`}>
             00:{timeLeft.toString().padStart(2, '0')}
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {songs.map((song) => (
          <div key={song.id} className="bg-slate-800/60 backdrop-blur border border-slate-700 rounded-2xl p-6 flex flex-col items-center shadow-2xl">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-6 flex items-center justify-center text-3xl">🎵</div>
            <h3 className="text-xl font-bold text-white mb-2">{song.title}</h3>
            <audio controls src={song.url} className="w-full mb-6 h-10" />
            <button onClick={() => voteForSong(song.id)}
              className={`w-full py-4 rounded-xl font-bold text-lg flex justify-center gap-3 ${
                votedSongId === song.id ? "bg-green-600 text-white" : "bg-slate-700 hover:bg-indigo-600 text-white"
              }`}>
              <span>{votedSongId === song.id ? "✅ Voted" : "🔥 Vote"}</span>
              <span className="bg-black/30 px-2 rounded text-sm">{song.votes}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- FIX: RESPONSIVE WINNER SCREEN ---
const WinnerScreen = ({ song, sessionId }) => (
  <div className="w-full max-w-3xl text-center animate-fade-in-up px-4">
    <div className="text-6xl md:text-7xl mb-4 md:mb-6 animate-bounce">🏆</div>
    <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-6 md:mb-8">
      WINNER!
    </h1>
    <div className="bg-slate-800/80 backdrop-blur-xl p-6 md:p-12 rounded-3xl border-2 border-yellow-500/30 w-full">
      <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 break-words">{song.title}</h2>
      <div className="inline-block bg-yellow-500/10 text-yellow-400 px-4 py-1 rounded-full font-mono text-sm mb-6 md:mb-8">
        {song.votes} VOTES
      </div>
      
      {/* Bigger Audio Player for Mobile */}
      <div className="w-full mb-8 flex justify-center">
         <audio 
            controls 
            src={song.url} 
            className="w-full h-12 md:h-14 accent-indigo-500" 
            autoPlay 
         />
      </div>

      <button onClick={() => socket.emit("restart_game", { sessionId })}
        className="w-full py-4 md:py-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-lg md:text-xl text-white shadow-xl">
        🔄 Start New Round
      </button>
    </div>
  </div>
);

const LogoHeader = ({ connected }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <header className="p-4 md:p-6 flex items-center justify-between w-full border-b border-white/5 bg-[#0f172a]/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg shadow-lg shadow-indigo-500/20 overflow-hidden flex-shrink-0">
          {!imgError ? (
            <img src="/favicon.ico" alt="Logo" className="w-full h-full object-cover" onError={() => setImgError(true)} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600"></div>
          )}
        </div>
        <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">AI Song Builder</h1>
      </div>
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
        <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`}></div>
        <span className="text-xs font-medium text-slate-400 hidden md:inline">{connected ? "Live Connection" : "Offline"}</span>
      </div>
    </header>
  );
};

// --- 3. MAIN APP ---

export default function App() {
  const [phase, setPhase] = useState("lobby"); 
  const [data, setData] = useState(null);
  const [currentVibe, setCurrentVibe] = useState("");
  const [endTime, setEndTime] = useState(0);
  
  // New Lobby State
  const [sessionId, setSessionId] = useState("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("sync_state", () => {});

    socket.on("themes_ready", (res) => { setData(res.themes); setPhase("voting"); });
    socket.on("generation_started", ({ vibe }) => { setCurrentVibe(vibe); setPhase("generating"); });
    socket.on("songs_ready", ({ songs, endTime }) => { setData(songs); setEndTime(endTime); setPhase("song_voting"); });
    socket.on("update_song_votes", ({ songs }) => setData(songs));
    socket.on("game_winner", ({ winner }) => { setData(winner); setPhase("winner"); });
    socket.on("game_reset", () => { setPhase("input"); setData(null); });
    socket.on("voting_failed", ({ message, themes }) => {
      alert(message);
      setData(themes); 
      setPhase("voting"); 
    });

    return () => socket.off();
  }, []);

  const joinRoom = (roomCode, user) => {
    setSessionId(roomCode);
    socket.emit("join_room", { sessionId: roomCode, username: user });
    setPhase("input"); 
  };

  return (
    <div className="min-h-screen w-full bg-[#0f172a] text-slate-200 font-sans flex flex-col items-center">
      <LogoHeader connected={connected} />
      
      <main className="flex-1 flex flex-col items-center justify-center w-full p-6">
        {phase === "lobby" && <Lobby onJoin={joinRoom} />}
        {phase === "input" && <LyricInput sessionId={sessionId} />}
        {phase === "voting" && <ThemeVote sessionId={sessionId} themes={data} />}
        {phase === "generating" && <LoadingScreen vibe={currentVibe} />}
        {phase === "song_voting" && <SongGrid songs={data} sessionId={sessionId} endTime={endTime} />}
        {phase === "winner" && <WinnerScreen song={data} sessionId={sessionId} />}
      </main>

      <style>{`
        :root, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; min-height: 100vh; background-color: #0f172a; }
        #root { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; max-width: none !important; margin: 0 !important; padding: 0 !important; text-align: left !important; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.6s ease-out forwards; }
      `}</style>
    </div>
  );
}