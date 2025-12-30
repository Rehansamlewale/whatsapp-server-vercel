// Minimal server for Railway testing
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚂 Starting minimal Railway test server...');
console.log(`Port: ${PORT}`);
console.log(`Node version: ${process.version}`);

app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        message: '🎉 Railway deployment successful!',
        timestamp: new Date().toISOString(),
        port: PORT,
        nodeVersion: process.version,
        platform: 'Railway'
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
    });
});

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Railway URL: https://your-app.up.railway.app`);
});

module.exports = app;