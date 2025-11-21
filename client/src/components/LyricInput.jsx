import React, { useState } from "react";
import { socket } from "../socketClient";

export default function LyricInput({ sessionId }) {
  const [text, setText] = useState("");

  // 1. Safe User ID generation
  const [userId] = useState(() => {
    const storedId = localStorage.getItem("userId");
    if (storedId) return storedId;
    const newId = "u_" + Math.random().toString(36).slice(2, 9);
    localStorage.setItem("userId", newId);
    return newId;
  });

  function submit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    
    // ✅ MATCH SERVER: Event 'submit_lyric', Key 'lyric'
    socket.emit("submit_lyric", { 
      sessionId, 
      userId, 
      lyric: trimmed 
    });
    setText("");
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <label className="font-bold text-gray-700">Suggest a Lyric</label>
        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">ID: {userId}</span>
      </div>
      
      <form onSubmit={submit} className="flex gap-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g., Neon lights on a rainy pavement..."
          maxLength={80}
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
        />
        <button 
          type="submit" 
          className="bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 transition shadow-sm"
        >
          Submit
        </button>
      </form>
    </div>
  );
}