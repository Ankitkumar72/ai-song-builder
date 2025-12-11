"use strict";

require('dotenv').config();

var express = require('express');

var http = require('http');

var path = require('path');

var cors = require('cors');

var _require = require('./socket'),
    startSocket = _require.startSocket;

var app = express(); // --- MIDDLEWARE ---

app.use(cors()); // Allow cross-origin requests (crucial for dev: client on 5173, server on 4000)

app.use(express.json()); // Parse JSON bodies
// --- STATIC FILES ---
// Serve assets if you have a 'static' folder at the project root

app.use('/static', express["static"](path.join(__dirname, '../../static'))); // --- DEPLOYMENT: SERVE REACT APP ---
// This tells Express to serve the built React files from the client/dist folder

app.use(express["static"](path.join(__dirname, '../../client/dist'))); // --- ROUTES ---

app.get('/health', function (req, res) {
  return res.json({
    ok: true
  });
}); // Handle React routing, return all requests to React app

app.get(/.*/, function (req, res) {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
}); // --- SERVER START ---

var server = http.createServer(app);
startSocket(server);
var PORT = process.env.PORT || 4000;
server.listen(PORT, function () {
  return console.log("Server listening on port ".concat(PORT));
});