// server/src/aiService.js

/**
 * Generates music based on a text prompt (vibe).
 * Currently sends mock data, but ready for API integration.
 */
async function generateSongs(vibe) {
  console.log(`🤖 AI Service: Generating songs for vibe "${vibe}"...`);

  // ---------------------------------------------------------
  // 🚧 TODO: REAL AI INTEGRATION AREA (Future Step)
  // ---------------------------------------------------------
  // 1. Get your API Key: const apiKey = process.env.AI_API_KEY;
  // 2. Call the API (e.g., Suno, Replicate, OpenAI Audio):
  //    const response = await fetch('https://api.provider.com/generate', {
  //      method: 'POST',
  //      headers: { 'Authorization': `Bearer ${apiKey}` },
  //      body: JSON.stringify({ prompt: vibe, count: 3 })
  //    });
  // 3. const data = await response.json();
  // 4. Format 'data' to match the structure below (id, title, url)
  // ---------------------------------------------------------

  // 👇 MOCK SIMULATION (Replace this block when you have an API Key) 👇
  return new Promise((resolve) => {
    // We pretend the AI takes 4 seconds to "think"
    setTimeout(() => {
      resolve([
        {
          id: 1,
          title: `${vibe} - Chill Ver`,
          url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
          votes: 0
        },
        {
          id: 2,
          title: `${vibe} - Hype Ver`,
          url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
          votes: 0
        },
        {
          id: 3,
          title: `${vibe} - Bass Ver`,
          url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
          votes: 0
        }
      ]);
    }, 3000); // 4 seconds delay for realism
  });
}

module.exports = { generateSongs };