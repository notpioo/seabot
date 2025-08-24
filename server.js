const express = require('express');
const path = require('path');

const app = express();
const PORT = 5000;

// Serve static files from public directory
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Image hosting server is running',
        time: new Date().toISOString()
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Image server running on http://0.0.0.0:${PORT}`);
});