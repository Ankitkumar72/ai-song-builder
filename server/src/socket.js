const { Server } = require('socket.io');

// --- STATE MANAGEMENT ---
let sessionData = {};

// --- SETTINGS ---
const LYRIC_THRESHOLD = 3;       
const THEME_VOTE_THRESHOLD = 1;  
const VOTING_DURATION_MS = 5000; 

function startSocket(server) {
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // 0. JOIN ROOM (CRITICAL NEW STEP)
    socket.on('join_room', ({ sessionId, username }) => {
      socket.join(sessionId); // Socket.io native room joining
      console.log(`👤 ${username} joined room: ${sessionId}`);
      
      // If session doesn't exist, create it
      if (!sessionData[sessionId]) initSession(sessionId);
      
      // Send current state to ONLY this user (so they sync up if joining late)
      socket.emit('sync_state', sessionData[sessionId]);
    });

    // 1. HANDLE LYRICS
    socket.on('submit_lyric', ({ sessionId, lyric }) => {
      if (!sessionData[sessionId]) initSession(sessionId);

      sessionData[sessionId].lyrics.push({ lyric, id: socket.id });
      
      // Broadcast ONLY to this room
      io.to(sessionId).emit('new_lyric', { sessionId, lyric });

      if (sessionData[sessionId].lyrics.length >= LYRIC_THRESHOLD) {
        const rawLyrics = sessionData[sessionId].lyrics.map(l => l.lyric);
        const themes = extractThemes(rawLyrics);
        sessionData[sessionId].themes = themes;
        
        io.to(sessionId).emit('themes_ready', { sessionId, themes });
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
        
        io.to(sessionId).emit('generation_started', { sessionId, vibe: vibeText });

        setTimeout(() => {
          const variations = [
            { id: 1, title: `${vibeText} - Chill`, url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", votes: 0 },
            { id: 2, title: `${vibeText} - Hype`, url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", votes: 0 },
            { id: 3, title: `${vibeText} - Bass`, url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", votes: 0 }
          ];
          sessionData[sessionId].songs = variations;

          const endTime = Date.now() + VOTING_DURATION_MS;
          io.to(sessionId).emit('songs_ready', { sessionId, songs: variations, endTime });

          // 🕒 TIMER ENDS
          setTimeout(() => {
            const currentSongs = sessionData[sessionId].songs;
            const totalSongVotes = currentSongs.reduce((acc, s) => acc + s.votes, 0);

            if (totalSongVotes === 0) {
              sessionData[sessionId].votes = {}; 
              sessionData[sessionId].songs = [];
              
              io.to(sessionId).emit('voting_failed', { 
                sessionId, 
                themes: sessionData[sessionId].themes,
                message: "No votes received! Choosing a vibe again..." 
              });
            } else {
              let winner = currentSongs.reduce((prev, current) => (prev.votes > current.votes) ? prev : current);
              io.to(sessionId).emit('game_winner', { sessionId, winner });
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
        io.to(sessionId).emit('update_song_votes', { sessionId, songs: session.songs });
      }
    });

    // 4. RESTART
    socket.on('restart_game', ({ sessionId }) => {
      initSession(sessionId);
      io.to(sessionId).emit('game_reset', { sessionId });
    });

    socket.on('disconnect', () => console.log('❌ Client disconnected'));
  });
}

function initSession(id) {
  sessionData[id] = { lyrics: [], votes: {}, themes: [], songs: [] };
}

function extractThemes(lyrics) {
  const uniqueLines = [...new Set(lyrics)];
  const selectedLines = uniqueLines.slice(-3); 
  return selectedLines.map(line => ({
    id: Math.random().toString(36).slice(2),
    text: line
  }));
}

module.exports = { startSocket };