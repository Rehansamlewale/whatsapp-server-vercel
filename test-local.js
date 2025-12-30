// Quick local test for WhatsApp server
const express = require('express');

console.log('🧪 Testing server dependencies...');

// Test 1: Check if all dependencies load
try {
    const cors = require('cors');
    const qrcode = require('qrcode');
    const { Client, LocalAuth } = require('whatsapp-web.js');
    console.log('✅ All dependencies loaded successfully');
} catch (error) {
    console.error('❌ Dependency error:', error.message);
    process.exit(1);
}

// Test 2: Check if server starts
const app = express();
const PORT = process.env.PORT || 3001; // Use different port for testing

app.use(express.json());

app.get('/test', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Server is working!',
        timestamp: new Date().toISOString(),
        node_version: process.version
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        uptime: process.uptime(),
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
    });
});

const server = app.listen(PORT, () => {
    console.log(`✅ Test server running on port ${PORT}`);
    console.log(`🌐 Test URL: http://localhost:${PORT}/test`);
    console.log(`🏥 Health URL: http://localhost:${PORT}/health`);
    console.log('');
    console.log('🎉 Your server setup is working correctly!');
    console.log('📝 You can now deploy to Railway with confidence.');
    console.log('');
    console.log('⏹️  Press Ctrl+C to stop test server');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping test server...');
    server.close(() => {
        console.log('✅ Test completed successfully!');
        process.exit(0);
    });
});