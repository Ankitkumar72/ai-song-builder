const { Server } = require('socket.io');

// --- STATE MANAGEMENT ---
let sessionData = {};

// --- SETTINGS ---
const LYRIC_THRESHOLD = 3;       
const THEME_VOTE_THRESHOLD = 1;  
const VOTING_DURATION_MS = 15000; // 15 Seconds

function startSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // 1. HANDLE LYRICS
    socket.on('submit_lyric', ({ sessionId, lyric }) => {
      if (!sessionData[sessionId]) initSession(sessionId);

      // Store the lyric
      sessionData[sessionId].lyrics.push({ lyric, id: socket.id });
      io.emit('new_lyric', { sessionId, lyric });

      // Check if we have enough lyrics to start
      if (sessionData[sessionId].lyrics.length >= LYRIC_THRESHOLD) {
        // Extract themes (Now keeps full lines!)
        const rawLyrics = sessionData[sessionId].lyrics.map(l => l.lyric);
        const themes = extractThemes(rawLyrics);
        
        sessionData[sessionId].themes = themes;
        io.emit('themes_ready', { sessionId, themes });
      }
    });

    // 2. HANDLE THEME VOTES
    socket.on('theme_vote', ({ sessionId, themeId }) => {
      if (!sessionData[sessionId]) return;
      const votes = sessionData[sessionId].votes;
      votes[themeId] = (votes[themeId] || 0) + 1;

      const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
      
      if (totalVotes >= THEME_VOTE_THRESHOLD) {
        let winnerId = Object.keys(votes).reduce((a, b) => votes[a] > votes[b] ? a : b);
        const vibeText = sessionData[sessionId].themes.find(t => t.id === winnerId)?.text || "Vibe";
        
        io.emit('generation_started', { sessionId, vibe: vibeText });

        // Simulate AI Delay -> Start Timer
        setTimeout(() => {
          // Mock 3 AI Variations
          const variations = [
            { id: 1, title: `${vibeText} - Chill`, url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", votes: 0 },
            { id: 2, title: `${vibeText} - Hype`, url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", votes: 0 },
            { id: 3, title: `${vibeText} - Bass`, url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", votes: 0 }
          ];
          sessionData[sessionId].songs = variations;

          const endTime = Date.now() + VOTING_DURATION_MS;
          io.emit('songs_ready', { sessionId, songs: variations, endTime });

          // 🕒 TIMER ENDS
          setTimeout(() => {
            const currentSongs = sessionData[sessionId].songs;
            
            // CHECK VOTES
            const totalSongVotes = currentSongs.reduce((acc, s) => acc + s.votes, 0);

            if (totalSongVotes === 0) {
              // ❌ NO VOTES: Revert to Theme Phase
              sessionData[sessionId].votes = {}; // Clear theme votes
              sessionData[sessionId].songs = [];
              
              // SEND THEMES BACK so buttons aren't empty!
              io.emit('voting_failed', { 
                sessionId, 
                themes: sessionData[sessionId].themes,
                message: "No votes received! Choosing a vibe again..." 
              });
            } else {
              // ✅ WINNER
              let winner = currentSongs.reduce((prev, current) => (prev.votes > current.votes) ? prev : current);
              io.emit('game_winner', { sessionId, winner });
            }

          }, VOTING_DURATION_MS);

        }, 3000);
      }
    });

    // 3. HANDLE SONG VOTES
    socket.on('vote_song_variation', ({ sessionId, songId }) => {
      const session = sessionData[sessionId];
      if (!session || !session.songs) return;

      const song = session.songs.find(s => s.id === songId);
      if (song) {
        song.votes += 1;
        io.emit('update_song_votes', { sessionId, songs: session.songs });
      }
    });

    // 4. RESTART
    socket.on('restart_game', ({ sessionId }) => {
      initSession(sessionId);
      io.emit('game_reset', { sessionId });
    });

    socket.on('disconnect', () => console.log('❌ Client disconnected'));
  });
}

function initSession(id) {
  sessionData[id] = { lyrics: [], votes: {}, themes: [], songs: [] };
}

// FIX: Returns full lines instead of splitting into words
function extractThemes(lyrics) {
  // Take the last 3 unique submissions as the "Themes"
  // This preserves full phrases like "midnight drive and broken maps"
  const uniqueLines = [...new Set(lyrics)];
  const selectedLines = uniqueLines.slice(-3); // Take the most recent 3

  return selectedLines.map(line => ({
    id: Math.random().toString(36).slice(2),
    text: line
  }));
}

module.exports = { startSocket };