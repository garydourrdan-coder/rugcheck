const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve the HTML file
app.use(express.static(__dirname));

app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/rugcheck', (req, res) => {
res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {});
