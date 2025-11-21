import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

// --- 1. SOCKET CONNECTION ---
const URL = import.meta.env.NODE_ENV === 'production' ? undefined : "http://localhost:4000";
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

      {votedId && (
        <div className="mt-8 text-center animate-pulse text-indigo-400 bg-indigo-500/10 py-2 rounded-lg">
          Waiting for other votes to generate the song...
        </div>
      )}
    </div>
  );
};

const MusicPlayer = ({ song, sessionId }) => {
  const audioRef = useRef(null);
  const [speed, setSpeed] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastDJ, setLastDJ] = useState("You"); // Initial DJ

  useEffect(() => {
    // Listen for changes from other users
    socket.on("remix_update", (data) => {
      if (data.type === "speed") {
        setSpeed(data.value);
        setLastDJ("Another DJ");
        if (audioRef.current) {
          audioRef.current.playbackRate = data.value;
        }
      }
    });

    return () => socket.off("remix_update");
  }, []);

  const togglePlay = () => {
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const changeSpeed = (newSpeed) => {
    // 1. Update Locally
    setSpeed(newSpeed);
    setLastDJ("You");
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }

    // 2. Broadcast to Everyone
    socket.emit("remix_event", {
      sessionId,
      type: "speed",
      value: newSpeed
    });
  };

  return (
    <div className="w-full max-w-md animate-fade-in-up px-4">
      <div className="bg-slate-900 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_-12px_rgba(99,102,241,0.25)] border border-slate-800 relative overflow-hidden">

        {/* Background Pulse Effect */}
        <div className={`absolute inset-0 bg-indigo-600/10 rounded-3xl transition-opacity duration-75 ${isPlaying ? "opacity-100 animate-pulse" : "opacity-0"}`}></div>

        {/* Album Art / Visualizer */}
        <div className="relative z-10 aspect-square bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl mb-8 flex items-center justify-center overflow-hidden shadow-lg">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          {/* Spinning Record Animation */}
          <div className={`w-40 h-40 rounded-full border-4 border-slate-900 bg-black flex items-center justify-center transition-all duration-[2000ms] ${isPlaying ? "animate-[spin_3s_linear_infinite]" : ""}`} style={{ animationDuration: `${3 / speed}s` }}>
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-400 to-purple-400 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-black rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{song.songTitle}</h1>
          <p className="text-slate-400 text-sm md:text-base">
            Controlled by: <span className="text-indigo-400 font-bold">{lastDJ}</span>
          </p>
        </div>

        {/* DJ Controls */}
        <div className="relative z-10 bg-slate-800/80 backdrop-blur p-4 rounded-xl border border-slate-700 mb-6">
          <div className="flex justify-between text-xs text-slate-400 mb-2 font-mono">
            <span>SLOW</span>
            <span>SPEED: {Math.round(speed * 100)}%</span>
            <span>FAST</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={speed}
            onChange={(e) => changeSpeed(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
          />
        </div>

        <div className="relative z-10 flex gap-4">
          <button
            onClick={togglePlay}
            className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${isPlaying ? "bg-slate-700 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"}`}
          >
            {isPlaying ? "⏸ Play" : "▶ Play"}
          </button>

          <button
            onClick={() => window.location.reload()}
            className="px-6 py-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
            title="New Song"
          >
            🔄
          </button>
        </div>

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={song.audioUrl}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      </div>
    </div>
  );
};

// --- 3. MAIN APP ---

export default function App() {
  const [phase, setPhase] = useState("input");
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);

  // ✅ FIX: Generate a random Session ID every time you refresh
  // This ensures you start clean and avoid the "stuck at phase 2" bug
  const [sessionId] = useState(() => `session_${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("themes_ready", (res) => {
      setData(res.themes);
      setPhase("voting");
    });

    socket.on("song_ready", (res) => {
      setData(res);
      setPhase("playing");
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("themes_ready");
      socket.off("song_ready");
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
          <span className="text-xs font-medium text-slate-400 md:hidden">{connected ? "Live" : "Off"}</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full p-4 md:p-6">
        {phase === "input" && <LyricInput sessionId={sessionId} />}
        {phase === "voting" && <ThemeVote sessionId={sessionId} themes={data} />}
        {phase === "playing" && <MusicPlayer song={data} sessionId={sessionId} />}
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