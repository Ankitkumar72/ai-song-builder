require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { startSocket } = require('./socket');

const app = express();

// --- MIDDLEWARE ---
app.use(cors()); // Allow cross-origin requests (crucial for dev: client on 5173, server on 4000)
app.use(express.json()); // Parse JSON bodies

// --- STATIC FILES ---
// Serve assets if you have a 'static' folder at the project root
app.use('/static', express.static(path.join(__dirname, '../../static')));

// --- DEPLOYMENT: SERVE REACT APP ---
// This tells Express to serve the built React files from the client/dist folder
app.use(express.static(path.join(__dirname, '../../client/dist')));

// --- ROUTES ---
app.get('/health', (req, res) => res.json({ ok: true }));

// Handle React routing, return all requests to React app
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

// --- SERVER START ---
const server = http.createServer(app);
startSocket(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));