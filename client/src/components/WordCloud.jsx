// client/src/components/WordCloud.jsx
import React, { useEffect, useMemo, useState } from "react";
import { socket } from "../socketClient";

/**
 * Very simple word cloud:
 * - listens to "new_lyric" socket events
 * - tokenizes words, counts frequency, ignores small stopwords
 * - renders words with font size based on frequency
 */

const STOPWORDS = new Set([
  "the","and","a","in","of","to","is","it","on","for","with","that","this","i","you","we","be","are","my","your"
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter(w => !STOPWORDS.has(w) && w.length > 1);
}

export default function WordCloud({ sessionId }) {
  const [freq, setFreq] = useState({});
  const [recent, setRecent] = useState([]); // recent submission feed

  useEffect(() => {
    // optionally join room
    socket.emit("join_session", { sessionId, userId: localStorage.getItem("userId") });

    function handleNewLyric({ userId, text }) {
      setRecent(prev => [{ userId, text, ts: Date.now() }, ...prev].slice(0, 8));
      const tokens = tokenize(text);
      if (!tokens.length) return;
      setFreq(prev => {
        const copy = { ...prev };
        tokens.forEach(t => copy[t] = (copy[t] || 0) + 1);
        return copy;
      });
    }

    socket.on("new_lyric", handleNewLyric);
    return () => {
      socket.off("new_lyric", handleNewLyric);
    };
  }, [sessionId]);

  const words = useMemo(() => {
    const entries = Object.entries(freq);
    entries.sort((a,b) => b[1] - a[1]);
    // top 30 words
    return entries.slice(0, 30).map(([word, count]) => ({ word, count }));
  }, [freq]);

  // compute font sizes
  const max = words.length ? words[0].count : 1;
  function fontSize(count) {
    const min = 14, maxSize = 48;
    return `${Math.round(min + (count / max) * (maxSize - min))}px`;
  }

  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ flex: 1, padding: 12, borderRadius: 8, background: "#0f1724", color: "#fff" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          {words.map(w => (
            <span
              key={w.word}
              style={{
                fontSize: fontSize(w.count),
                opacity: 0.95,
                transition: "font-size 200ms ease",
                padding: "2px 6px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.03)"
              }}
            >
              {w.word}
            </span>
          ))}
        </div>
      </div>

      <div style={{ width: 260 }}>
        <div style={{ color: "#888", marginBottom: 8 }}>Recent activity</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recent.map(r => (
            <div key={r.ts} style={{ background: "#071124", padding: 8, borderRadius: 6, color: "#dfe" }}>
              <div style={{ fontSize: 12, color: "#8aa" }}>{r.userId}</div>
              <div style={{ marginTop: 4 }}>{r.text}</div>
            </div>
          ))}
          {recent.length === 0 && <div style={{ color: "#666" }}>No submissions yet — be the first!</div>}
        </div>
      </div>
    </div>
  );
}
