const { Server } = require('socket.io');

// --- STATE MANAGEMENT ---
// Stores data for each active session
const sessionData = {};

// --- SETTINGS ---
// Low numbers for easy testing. Increase these for production.
const LYRIC_THRESHOLD = 3;  // Lyrics needed to start theme voting
const VOTE_THRESHOLD = 1;   // Votes needed to trigger song generation

function startSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*', // Allow connections from your React Frontend
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // --- 1. HANDLE LYRIC SUBMISSION ---
    socket.on('submit_lyric', ({ sessionId, lyric }) => {
      // Initialize session if it doesn't exist
      if (!sessionData[sessionId]) {
        sessionData[sessionId] = { 
          lyrics: [], 
          votes: {}, 
          themes: [], 
          songs: [] // New: Store generated song variations here
        };
      }

      // Store Lyric
      sessionData[sessionId].lyrics.push({ lyric, id: socket.id });
      io.emit('new_lyric', { sessionId, lyric });

      const count = sessionData[sessionId].lyrics.length;
      console.log(`📝 Lyric received for ${sessionId}. Total: ${count}/${LYRIC_THRESHOLD}`);

      // CHECK: Start Theme Voting Phase?
      if (count >= LYRIC_THRESHOLD) {
        console.log(`🎨 Threshold reached. generating themes...`);
        const themes = extractThemes(sessionData[sessionId].lyrics.map(l => l.lyric));
        sessionData[sessionId].themes = themes;
        io.emit('themes_ready', { sessionId, themes });
      }
    });

    // --- 2. HANDLE THEME VOTING ---
    socket.on('theme_vote', ({ sessionId, themeId }) => {
      if (!sessionData[sessionId]) return;

      const votes = sessionData[sessionId].votes;
      votes[themeId] = (votes[themeId] || 0) + 1;

      // Calculate total votes
      const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
      console.log(`🗳️ Theme Vote: ${totalVotes}/${VOTE_THRESHOLD}`);

      // CHECK: Start Song Generation Phase?
      if (totalVotes >= VOTE_THRESHOLD) {
        console.log("🏆 Vibe selected! Starting generation...");

        // Determine Winning Vibe
        let winnerId = Object.keys(votes)[0];
        Object.keys(votes).forEach(id => {
          if (votes[id] > votes[winnerId]) winnerId = id;
        });
        const winningTheme = sessionData[sessionId].themes.find(t => t.id === winnerId);
        const vibeText = winningTheme ? winningTheme.text : "Unknown Vibe";

        // A. Tell Frontend to show "Loading/AI Working" screen
        io.emit('generation_started', { sessionId, vibe: vibeText });

        // B. Simulate AI Generation (3 Second Delay)
        setTimeout(() => {
          // Generate 3 Variations
          const variations = [
            { 
              id: 1, 
              title: `${vibeText} - Chill Ver`, 
              url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", 
              votes: 0 
            },
            { 
              id: 2, 
              title: `${vibeText} - Hype Ver`, 
              url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", 
              votes: 0 
            },
            { 
              id: 3, 
              title: `${vibeText} - Bass Ver`, 
              url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", 
              votes: 0 
            }
          ];

          // Save to session
          sessionData[sessionId].songs = variations;

          // C. Send Songs to Frontend
          console.log(`🎵 Sending ${variations.length} variations.`);
          io.emit('songs_ready', { sessionId, songs: variations });
        }, 3000);
      }
    });

    // --- 3. HANDLE SONG VARIATION VOTING (NEW) ---
    socket.on('vote_song_variation', ({ sessionId, songId }) => {
      const session = sessionData[sessionId];
      if (!session || !session.songs) return;

      // Find the song and increment votes
      const song = session.songs.find(s => s.id === songId);
      if (song) {
        song.votes += 1;
        console.log(`🔥 Vote for Song #${songId}. Total: ${song.votes}`);
        
        // Broadcast updated list to EVERYONE immediately
        io.emit('update_song_votes', { sessionId, songs: session.songs });
      }
    });

    // --- 4. HANDLE LIVE REMIX (Optional Future Feature) ---
    socket.on('remix_event', ({ sessionId, type, value }) => {
      socket.broadcast.emit('remix_update', { type, value });
    });

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });

  return io;
}

// --- HELPER FUNCTIONS ---
function extractThemes(lyrics) {
  const allText = lyrics.join(' ').toLowerCase();
  const words = allText.split(/\s+/).filter(w => w.length > 3);
  // Return unique words as themes
  const uniqueWords = [...new Set(words)].slice(0, 4);
  
  return uniqueWords.map(w => ({
    id: Math.random().toString(36).slice(2),
    text: w.charAt(0).toUpperCase() + w.slice(1) // Capitalize
  }));
}

module.exports = { startSocket };