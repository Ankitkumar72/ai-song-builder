import React, { useState, useEffect } from "react";

// REMOVED: import { socket } from "../socketClient";
// NOW: We accept 'socket' as a prop from the parent App.

export default function ThemeVote({ sessionId, themes, socket }) {
  const [selectedId, setSelectedId] = useState(null);

  function vote(themeId) {
    if (selectedId) return; // Prevent double voting
    setSelectedId(themeId);
    console.log("Voting for:", themeId);
    
    // Use the socket passed in via props
    if (socket) {
        socket.emit("theme_vote", { 
            sessionId, 
            userId: localStorage.getItem("userId"), 
            themeId 
        });
    } else {
        console.error("Socket not connected");
    }
  }

useEffect(()=> {
  console.log("ThemeVote mounted for session:", sessionId);
}, [sessionId]);

  if (!themes || themes.length === 0) {
    return <div className="text-white animate-pulse">Waiting for themes...</div>;
  }

  return (
    <div className="mt-6 p-6 rounded-xl bg-slate-800 text-cyan-50 shadow-xl">
      <div className="mb-4 text-center">
        <h2 className="text-xl font-bold text-cyan-400">Vote for the Best Theme</h2>
        <p className="text-sm text-slate-400">Click a card to cast your vote</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {themes.map((t) => (
          <div 
            key={t.id} 
            className={`p-4 rounded-lg transition-all duration-200 border-2 cursor-pointer ${
                selectedId === t.id 
                ? "bg-cyan-900 border-cyan-400 transform scale-105" 
                : "bg-slate-700 border-transparent hover:bg-slate-600 hover:border-slate-500"
            }`}
            onClick={() => vote(t.id)}
          >
            <div className="font-medium text-lg mb-2">{t.text}</div>
            
            <button
              disabled={selectedId !== null}
              className={`w-full py-2 px-4 rounded-md font-bold text-sm transition-colors ${
                selectedId === t.id
                  ? "bg-cyan-500 text-white shadow-cyan-500/50 shadow-lg"
                  : "bg-slate-900 text-slate-300"
              }`}
            >
              {selectedId === t.id ? "✓ Voted" : "Vote This"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}