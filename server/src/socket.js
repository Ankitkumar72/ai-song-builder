const { Server } = require('socket.io');
const { generateSongs } = require('./aiService'); 

// --- STATE MANAGEMENT ---
let sessionData = {};

// --- SETTINGS ---
const LYRIC_THRESHOLD = 3;       
const THEME_VOTE_THRESHOLD = 1;  
const VOTING_DURATION_MS = 15000; 

function startSocket(server) {
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // 0. JOIN ROOM (UPDATED FOR TOGGLING)
    socket.on('join_room', ({ sessionId, username }) => {
      // 1. Leave all previous rooms first! (Critical for toggling)
      socket.rooms.forEach(room => {
        if (room !== socket.id) socket.leave(room);
      });

      // 2. Join new room
      socket.join(sessionId);
      console.log(`👤 ${username} switched to room: ${sessionId}`);
      
      // 3. Create session if missing
      if (!sessionData[sessionId]) initSession(sessionId);
      
      // 4. Send state
      socket.emit('sync_state', sessionData[sessionId]);
    });

    // 1. HANDLE LYRICS
    socket.on('submit_lyric', ({ sessionId, lyric }) => {
      if (!sessionData[sessionId]) initSession(sessionId);

      sessionData[sessionId].lyrics.push({ lyric, id: socket.id });
      io.to(sessionId).emit('new_lyric', { sessionId, lyric });

      if (sessionData[sessionId].lyrics.length >= LYRIC_THRESHOLD) {
        const rawLyrics = sessionData[sessionId].lyrics.map(l => l.lyric);
        const themes = extractThemes(rawLyrics);
        sessionData[sessionId].themes = themes;
        io.to(sessionId).emit('themes_ready', { sessionId, themes });
      }
    });

    // 2. HANDLE THEME VOTES
    socket.on('theme_vote', async ({ sessionId, themeId }) => { 
      if (!sessionData[sessionId]) return;
      if (sessionData[sessionId].isGenerating) return;

      const votes = sessionData[sessionId].votes;
      votes[themeId] = (votes[themeId] || 0) + 1;

      const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
      
      if (totalVotes >= THEME_VOTE_THRESHOLD) {
        sessionData[sessionId].isGenerating = true;

        let winnerId = Object.keys(votes).reduce((a, b) => votes[a] > votes[b] ? a : b);
        const vibeText = sessionData[sessionId].themes.find(t => t.id === winnerId)?.text || "Vibe";
        
        io.to(sessionId).emit('generation_started', { sessionId, vibe: vibeText });

        try {
          const variations = await generateSongs(vibeText); 
          sessionData[sessionId].isGenerating = false;
          sessionData[sessionId].songs = variations;

          const endTime = Date.now() + VOTING_DURATION_MS;
          io.to(sessionId).emit('songs_ready', { sessionId, songs: variations, endTime });

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

        } catch (error) {
          console.error("AI Gen Error", error);
          sessionData[sessionId].isGenerating = false;
        }
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
  sessionData[id] = { lyrics: [], votes: {}, themes: [], songs: [], isGenerating: false };
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