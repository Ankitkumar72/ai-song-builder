// client/src/components/ThemeVote.jsx
import React, { useEffect, useState } from "react";
import { socket } from "../socketClient";

export default function ThemeVote({ sessionId }) {
  const [themes, setThemes] = useState(null);
  const [counts, setCounts] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [finalTheme, setFinalTheme] = useState(null);

  useEffect(() => {
    function onThemesReady({ themes, voteEndsAt }) {
      setThemes(themes);
      setCounts({});
      const left = Math.max(0, Math.round((voteEndsAt - Date.now()) / 1000));
      setTimeLeft(left);
      // countdown
      const t = setInterval(()=> {
        setTimeLeft(prev => {
          if(prev <= 1) { clearInterval(t); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    function onThemeVoteUpdate({ themeId, votes }) {
      setCounts(prev => ({ ...prev, [themeId]: votes }));
    }
    function onThemeSelected({ theme }) {
      setFinalTheme(theme);
      setThemes(null);
    }

    socket.on("themes_ready", onThemesReady);
    socket.on("theme_vote_update", onThemeVoteUpdate);
    socket.on("theme_selected", onThemeSelected);

    return () => {
      socket.off("themes_ready", onThemesReady);
      socket.off("theme_vote_update", onThemeVoteUpdate);
      socket.off("theme_selected", onThemeSelected);
    };
  }, [sessionId]);

  function vote(tid){
    setSelectedId(tid);
    socket.emit("theme_vote", { sessionId, userId: localStorage.getItem("userId"), themeId: tid });
  }

  if(finalTheme) {
    return (
      <div style={{ marginTop: 12, padding: 10, background: "#063046", color: "#dff" }}>
        <strong>Theme selected:</strong> {finalTheme.text}
      </div>
    );
  }

  if(!themes) return null;

  return (
    <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: "#071a24", color: "#cfe" }}>
      <div style={{ marginBottom: 8 }}>
        <strong>Vote for the best lyric theme</strong> — {timeLeft}s left
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {themes.map(t => (
          <div key={t.id} style={{ padding: 10, borderRadius: 8, background: "#012", flex: 1 }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>{t.text}</div>
            <div style={{ fontSize: 12, color: "#9ab" }}>Votes: {counts[t.id] || 0}</div>
            <button
              onClick={() => vote(t.id)}
              disabled={selectedId === t.id}
              style={{ marginTop: 8, padding: "6px 8px", borderRadius: 5 }}
            >
              {selectedId === t.id ? "Voted" : "Vote"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
