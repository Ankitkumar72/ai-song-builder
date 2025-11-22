import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

// --- 1. SOCKET CONNECTION ---
// FIX: Switched to window.location check to avoid 'import.meta' errors in ES2015 builds
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const URL = isLocal ? "http://localhost:4000" : undefined;

// Initialize socket outside component to prevent re-connections
const socket = io(URL);

// --- 2. COMPONENTS ---

const LyricInput = ({ sessionId }) => {
  const [text, setText] = useState("");
  const [submittedCount, setSubmittedCount] = useState(0);

  const [userId] = useState(() => {
    const stored = localStorage.getItem("userId");
    if (stored) return stored;
    const id = "u_" + Math.random().toString(36).slice(2, 9);
    localStorage.setItem("userId", id);
    return id;
  });

  const submit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    socket.emit("submit_lyric", {
      sessionId,
      userId,
      lyric: trimmed
    });
    setText("");
    setSubmittedCount(prev => prev + 1);
  };

  return (
    <div className="w-full max-w-xl animate-fade-in-up px-4">
      <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 p-6 md:p-8 rounded-2xl shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
          <h3 className="text-xl md:text-2xl font-bold text-white">Phase 1: Inspiration</h3>
          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-mono rounded-full">
            ID: {userId}
          </span>
        </div>

        <p className="text-slate-400 mb-6 text-sm md:text-base">
          Submit lyrics to train the AI. We need diverse ideas!
        </p>

        <form onSubmit={submit} className="relative w-full">
          <input
            className="w-full bg-slate-900 border border-slate-700 text-white p-4 pr-24 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Neon lights..."
          />
          <button
            type="submit"
            className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 md:px-6 rounded-lg font-semibold transition-colors text-sm md:text-base"
          >
            Send
          </button>
        </form>

        {/* Progress Indicator */}
        <div className="mt-8 flex items-center gap-3">
          <div className="h-2 flex-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${Math.min(100, (submittedCount / 3) * 100)}%` }}
            ></div>
          </div>
          <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
            {submittedCount}/3 sent
          </span>
        </div>
      </div>
    </div>
  );
};

const ThemeVote = ({ themes, sessionId }) => {
  const [votedId, setVotedId] = useState(null);

  const vote = (themeId) => {
    if (votedId) return;
    setVotedId(themeId);
    socket.emit("theme_vote", {
      sessionId,
      userId: localStorage.getItem("userId"),
      themeId
    });
  };

  return (
    <div className="w-full max-w-5xl animate-fade-in-up px-4">
      <div className="text-center mb-8 md:mb-10">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Vote for the Vibe</h2>
        <p className="text-slate-400 text-base md:text-lg">The AI extracted these themes. Pick the winner.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map((t) => (
          <div
            key={t.id}
            onClick={() => vote(t.id)}
            className={`relative group p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 flex flex-col md:flex-row justify-between items-center overflow-hidden ${votedId === t.id
              ? "border-green-500 bg-green-900/20"
              : "border-slate-700 bg-slate-800/50 hover:border-indigo-500 hover:bg-slate-800"
              }`}
          >
            {/* Hover Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

            <div className="text-center md:text-left mb-2 md:mb-0">
              <span className="block text-xl md:text-2xl font-bold text-white capitalize">
                {t.text || t.word}
              </span>
            </div>

            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all shrink-0 ${votedId === t.id
              ? "bg-green-500 border-green-500 text-slate-900"
              : "border-slate-600 text-transparent group-hover:border-indigo-500"
              }`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
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
        <div className="absolute inset-4 border-t-4 border-purple-500 rounded-full animate-spin" style={{ animationDirection: "reverse" }}></div>
        <div className="absolute inset-0 flex items-center justify-center text-4xl">💿</div>
      </div>
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Cooking up "{vibe}"</h2>
      <p className="text-indigo-300 animate-pulse">AI is generating 3 variations...</p>
    </div>
  );
};

const SongGrid = ({ songs, sessionId }) => {
  const [votedSongId, setVotedSongId] = useState(null);

  const voteForSong = (songId) => {
    if (votedSongId === songId) return; // Prevent double spam
    setVotedSongId(songId);
    socket.emit("vote_song_variation", { sessionId, songId });
  };

  return (
    <div className="w-full max-w-6xl animate-fade-in-up px-4 pb-10">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Which one is the Banger? 🔥</h2>
        <p className="text-slate-400">Listen to the variations and vote for the best one.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {songs.map((song) => (
          <div key={song.id} className="bg-slate-800/60 backdrop-blur border border-slate-700 rounded-2xl p-6 flex flex-col items-center relative overflow-hidden shadow-2xl hover:border-indigo-500/50 transition-colors">
            
            {/* Card Header */}
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-6 flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/30">
              🎵
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2 text-center">{song.title}</h3>
            
            {/* Audio Player */}
            <audio controls src={song.url} className="w-full mb-6 h-8 opacity-80 hover:opacity-100 transition-opacity" />

            {/* Vote Button */}
            <button
              onClick={() => voteForSong(song.id)}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 group ${
                votedSongId === song.id 
                  ? "bg-green-600 text-white shadow-lg shadow-green-500/20" 
                  : "bg-slate-700 hover:bg-indigo-600 text-white hover:shadow-lg hover:shadow-indigo-500/20"
              }`}
            >
              <span>{votedSongId === song.id ? "✅ Voted" : "🔥 This is Fire"}</span>
              <span className={`px-2 py-0.5 rounded-full text-sm font-mono ${
                votedSongId === song.id ? "bg-white/20" : "bg-black/30 group-hover:bg-white/20"
              }`}>
                {song.votes}
              </span>
            </button>

            {/* Rank Badge (Optional visual flair) */}
            <div className="absolute top-4 right-4 text-slate-500 font-mono text-xs">
               #{song.id}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- 3. MAIN APP ---

export default function App() {
  const [phase, setPhase] = useState("input"); // input, voting, generating, song_voting
  const [data, setData] = useState(null); // Generic data holder (themes or songs)
  const [currentVibe, setCurrentVibe] = useState("");
  const [connected, setConnected] = useState(false);

  // ✅ FIX: Generate a random Session ID every time you refresh
  const [sessionId] = useState(() => `session_${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    // Phase 2: Themes Ready
    socket.on("themes_ready", (res) => {
      setData(res.themes);
      setPhase("voting");
    });

    // Phase 3: Generation Started (Loading)
    socket.on("generation_started", ({ vibe }) => {
      setCurrentVibe(vibe);
      setPhase("generating");
    });

    // Phase 4: Songs Ready (Grid)
    socket.on("songs_ready", ({ songs }) => {
      setData(songs);
      setPhase("song_voting");
    });

    // Phase 4 Update: Real-time Vote Counts
    socket.on("update_song_votes", ({ songs }) => {
      setData(songs); // Update the songs array with new vote counts
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("themes_ready");
      socket.off("generation_started");
      socket.off("songs_ready");
      socket.off("update_song_votes");
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-indigo-500/30 flex flex-col">

      {/* GLOBAL STYLE RESET */}
      <style>{`
        :root, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }
        #root { display: flex; flex-direction: column; max-width: none; text-align: left; }
      `}</style>

      {/* Background Gradient Orbs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative z-20 p-4 md:p-6 flex justify-between items-center w-full border-b border-white/5 bg-[#0f172a]/80 backdrop-blur-sm sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-indigo-500/20"></div>
          <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">AI Song Builder</h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`}></div>
          <span className="text-xs font-medium text-slate-400 hidden md:inline">{connected ? "Live Connection" : "Offline"}</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full p-4 md:p-6">
        
        {phase === "input" && (
            <LyricInput sessionId={sessionId} />
        )}

        {phase === "voting" && (
            <ThemeVote sessionId={sessionId} themes={data} />
        )}

        {phase === "generating" && (
            <LoadingScreen vibe={currentVibe} />
        )}

        {phase === "song_voting" && (
            <SongGrid songs={data} sessionId={sessionId} />
        )}

      </main>

      {/* Animation Styles */}
      <style>{`
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