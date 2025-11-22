import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

// --- 1. SOCKET CONNECTION ---
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const URL = isLocal ? "http://localhost:4000" : undefined;
const socket = io(URL);

// --- 2. SUB-COMPONENTS ---

const LyricInput = ({ sessionId }) => {
  const [text, setText] = useState("");
  const [submittedCount, setSubmittedCount] = useState(0);
  const [userId] = useState(() => "u_" + Math.random().toString(36).slice(2, 9));

  const submit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    socket.emit("submit_lyric", { sessionId, userId, lyric: trimmed });
    setText("");
    setSubmittedCount((prev) => prev + 1);
  };

  return (
    <div className="w-full max-w-xl animate-fade-in-up px-4">
      <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 p-6 md:p-8 rounded-2xl shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-white">Phase 1: Inspiration</h3>
          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-mono rounded-full">
            ID: {userId}
          </span>
        </div>
        <p className="text-slate-400 mb-6">Submit lyrics to train the AI.</p>
        <form onSubmit={submit} className="relative w-full mb-8">
          <input
            className="w-full bg-slate-900 border border-slate-700 text-white p-4 pr-24 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Neon lights..."
          />
          <button className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 rounded-lg font-bold">
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
      <h2 className="text-4xl font-bold text-white mb-8">Vote for the Vibe</h2>
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
            <span className="text-2xl font-bold text-white capitalize">{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const LoadingScreen = ({ vibe }) => {
  return (
    <div className="flex flex-col items-center justify-center animate-fade-in-up text-center px-4">
      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
        <div
          className="absolute inset-4 border-t-4 border-purple-500 rounded-full animate-spin"
          style={{ animationDirection: "reverse" }}
        ></div>
        <div className="absolute inset-0 flex items-center justify-center text-4xl">💿</div>
      </div>
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Cooking up "{vibe}"</h2>
      <p className="text-indigo-300 animate-pulse">AI is generating 3 variations...</p>
    </div>
  );
};

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
        <h2 className="text-5xl font-bold text-white mb-4">Vote the Banger 🔥</h2>
        <div className="inline-block bg-slate-800 border border-slate-600 px-6 py-2 rounded-full">
           <span className="text-slate-400 mr-2">Voting ends in:</span>
           <span className={`font-mono text-xl font-bold ${timeLeft < 5 ? "text-red-500 animate-pulse" : "text-white"}`}>
             00:{timeLeft.toString().padStart(2, '0')}
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {songs.map((song) => (
          <div
            key={song.id}
            className="bg-slate-800/60 backdrop-blur border border-slate-700 rounded-2xl p-6 flex flex-col items-center shadow-2xl"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-6 flex items-center justify-center text-3xl">
              🎵
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{song.title}</h3>
            <audio controls src={song.url} className="w-full mb-6 h-8" />
            <button
              onClick={() => voteForSong(song.id)}
              className={`w-full py-4 rounded-xl font-bold text-lg flex justify-center gap-3 ${
                votedSongId === song.id
                  ? "bg-green-600 text-white"
                  : "bg-slate-700 hover:bg-indigo-600 text-white"
              }`}
            >
              <span>{votedSongId === song.id ? "✅ Voted" : "🔥 Vote"}</span>
              <span className="bg-black/30 px-2 rounded text-sm">{song.votes}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const WinnerScreen = ({ song, sessionId }) => (
  <div className="w-full max-w-3xl text-center animate-fade-in-up px-4">
    <div className="text-7xl mb-6 animate-bounce">🏆</div>
    <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-8">
      WINNER!
    </h1>
    <div className="bg-slate-800/80 backdrop-blur-xl p-12 rounded-3xl border-2 border-yellow-500/30">
      <h2 className="text-4xl font-bold text-white mb-4">{song.title}</h2>
      <div className="inline-block bg-yellow-500/10 text-yellow-400 px-4 py-1 rounded-full font-mono text-sm mb-8">
        {song.votes} VOTES
      </div>
      <audio controls src={song.url} className="w-full mb-8" autoPlay />
      <button
        onClick={() => socket.emit("restart_game", { sessionId })}
        className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-xl text-white"
      >
        🔄 Start New Round
      </button>
    </div>
  </div>
);

const LogoHeader = ({ connected }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <header className="p-6 flex items-center justify-between w-full border-b border-white/5 bg-[#0f172a]/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg shadow-lg shadow-indigo-500/20 overflow-hidden flex-shrink-0">
          {!imgError ? (
            <img
              src="/favicon.ico"
              alt="Logo"
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600"></div>
          )}
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">AI Song Builder</h1>
      </div>
      
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
        <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`}></div>
        <span className="text-xs font-medium text-slate-400 hidden md:inline">
          {connected ? "Live Connection" : "Offline"}
        </span>
      </div>
    </header>
  );
};

// --- 3. MAIN APP ---

export default function App() {
  const [phase, setPhase] = useState("input");
  const [data, setData] = useState(null);
  const [currentVibe, setCurrentVibe] = useState("");
  const [endTime, setEndTime] = useState(0);
  const [sessionId] = useState("global_room_1");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("themes_ready", (res) => {
      setData(res.themes);
      setPhase("voting");
    });
    socket.on("generation_started", ({ vibe }) => {
      setCurrentVibe(vibe);
      setPhase("generating");
    });
    socket.on("songs_ready", ({ songs, endTime }) => {
      setData(songs);
      setEndTime(endTime);
      setPhase("song_voting");
    });
    socket.on("update_song_votes", ({ songs }) => setData(songs));
    socket.on("game_winner", ({ winner }) => {
      setData(winner);
      setPhase("winner");
    });
    socket.on("game_reset", () => {
      setPhase("input");
      setData(null);
    });
    
    // NEW: Handle Failed Voting - Now Updates Data correctly
    socket.on("voting_failed", ({ message, themes }) => {
      alert(message);
      setData(themes); // FIX: Restore themes so buttons aren't empty
      setPhase("voting"); 
    });

    return () => socket.off();
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#0f172a] text-slate-200 font-sans flex flex-col items-center">
      <LogoHeader connected={connected} />
      
      <main className="flex-1 flex flex-col items-center justify-center w-full p-6">
        {phase === "input" && <LyricInput sessionId={sessionId} />}
        
        {phase === "voting" && <ThemeVote sessionId={sessionId} themes={data} />}
        
        {phase === "generating" && <LoadingScreen vibe={currentVibe} />}
        
        {phase === "song_voting" && (
          <SongGrid songs={data} sessionId={sessionId} endTime={endTime} />
        )}
        
        {phase === "winner" && <WinnerScreen song={data} sessionId={sessionId} />}
      </main>

      <style>{`
        :root, body, #root { 
          margin: 0; 
          padding: 0; 
          width: 100%; 
          height: 100%; 
          min-height: 100vh; 
          background-color: #0f172a;
        }
        #root {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          text-align: left !important;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}