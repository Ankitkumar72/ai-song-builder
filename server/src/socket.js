const { Server } = require('socket.io');

// Store data for each active session
const sessionData = {};

// 👇 SETTINGS: Controls game difficulty
const LYRIC_THRESHOLD = 3;  // Lyrics needed to start voting
const VOTE_THRESHOLD = 1;   // Votes needed to generate song

function startSocket(server) {
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // --- 1. HANDLE LYRICS ---
    socket.on('submit_lyric', ({ sessionId, lyric }) => {
      // Initialize session if needed
      if (!sessionData[sessionId]) {
        sessionData[sessionId] = { lyrics: [], votes: {}, themes: [] };
      }

      // Add lyric
      sessionData[sessionId].lyrics.push({ lyric, id: socket.id });
      io.emit('new_lyric', { sessionId, lyric });

      const count = sessionData[sessionId].lyrics.length;
      console.log(`📝 Lyric received for ${sessionId}. Total: ${count}/${LYRIC_THRESHOLD}`);

      // Trigger Voting Phase
      if (count >= LYRIC_THRESHOLD) {
        console.log(`🎨 Threshold reached (${count}). Generating themes...`);
        const themes = extractThemes(sessionData[sessionId].lyrics.map(l => l.lyric));
        sessionData[sessionId].themes = themes;
        io.emit('themes_ready', { sessionId, themes });
      }
    });

    // --- 2. HANDLE VOTES ---
    socket.on('theme_vote', ({ sessionId, themeId }) => {
      console.log(`🗳️ Vote incoming for session: ${sessionId}, theme: ${themeId}`);

      if (!sessionData[sessionId]) {
        console.log("⚠️ Error: Session not found. User might need to resubmit lyrics.");
        return;
      }

      // Count the vote
      const votes = sessionData[sessionId].votes;
      votes[themeId] = (votes[themeId] || 0) + 1;

      // Check totals
      const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
      console.log(`📊 Vote Count: ${totalVotes}/${VOTE_THRESHOLD}`);

      // Trigger Music Generation Phase
      if (totalVotes >= VOTE_THRESHOLD) {
        console.log("🏆 Vote Threshold reached! Generating song...");

        // Pick winner
        let winnerId = Object.keys(votes)[0];
        Object.keys(votes).forEach(id => {
          if (votes[id] > votes[winnerId]) winnerId = id;
        });

        const winningTheme = sessionData[sessionId].themes.find(t => t.id === winnerId);
        const songTitle = winningTheme ? winningTheme.text : "Unknown Vibe";

        console.log(`🎵 Winner selected: "${songTitle}". Emitting song_ready...`);

        // Emit result
        io.emit('song_ready', {
          sessionId,
          songTitle: songTitle,
          audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        });
      }
    });

    // --- 3. HANDLE LIVE REMIX ---
    socket.on('remix_event', ({ sessionId, type, value }) => {
      console.log(`🎛️ Remix Update [${type}]: ${value}`);
      // Broadcast to everyone else
      socket.broadcast.emit('remix_update', { type, value });
    });

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });

  return io;
}

// Helper: Simple Theme Extraction
function extractThemes(lyrics) {
  const allText = lyrics.join(' ').toLowerCase();
  const words = allText.split(/\s+/).filter(w => w.length > 3);
  // Create unique themes with IDs
  return words.slice(0, 4).map(w => ({
    id: Math.random().toString(36).slice(2),
    text: w
  }));
}

module.exports = { startSocket };