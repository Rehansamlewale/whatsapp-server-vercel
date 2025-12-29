// WhatsApp API Server
// Run this as a separate Node.js server: node server.js

console.log('Starting WhatsApp API Server...');

try {
    const express = require('express');
    const cors = require('cors');
    const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
    const qrcode = require('qrcode');

    console.log('✅ All dependencies loaded successfully');
} catch (error) {
    console.error('❌ Error loading dependencies:', error.message);
    console.log('\n📦 Please run: npm install');
    console.log('Then try: npm start');
    process.exit(1);
}

const express = require('express');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3001;  // WhatsApp server on 3001
const NODE_ENV = process.env.NODE_ENV || 'development';

// Log environment info
console.log(`🌍 Environment: ${NODE_ENV}`);
console.log(`🚀 Port: ${PORT}`);

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',      // React app (local)
        'http://localhost:3001',      // WhatsApp server itself (local)
        'https://yashasavibhava.com', // Production domain
        'https://loan-server-pfyk.onrender.com',  // Render deployment
        'https://loan-server-pfyk.onrender.com/qr'  // Render QR page
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add compression for production
if (NODE_ENV === 'production') {
    try {
        const compression = require('compression');
        app.use(compression());
        console.log('✅ Compression enabled for production');
    } catch (e) {
        console.log('💡 Install compression for better performance: npm install compression');
    }
}

app.use(express.json({ limit: '10mb' }));  // Limit payload size

// WhatsApp Client
let client;
let isReady = false;
let isAuthenticated = false;
let qrCodeData = null;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;  // Prevent infinite restart loops

// Initialize WhatsApp Client
const initializeWhatsApp = () => {
    if (initAttempts >= MAX_INIT_ATTEMPTS) {
        console.error('❌ Max initialization attempts reached. Server will not auto-restart.');
        console.log('💡 This usually means insufficient resources. Consider upgrading Render tier.');
        return;
    }

    initAttempts++;
    console.log(`🔄 Initializing WhatsApp Client (Attempt ${initAttempts}/${MAX_INIT_ATTEMPTS})...`);

    try {

        client = new Client({
            authStrategy: new LocalAuth({
                clientId: "vardhaman-finance",
                dataPath: "./whatsapp-session"
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-extensions',
                    '--disable-plugins',
                    '--disable-default-apps',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-ipc-flooding-protection',
                    // Production optimizations
                    '--disable-software-rasterizer',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                    '--js-flags=--max-old-space-size=256'  // Very low memory for free tier
                ],
                timeout: NODE_ENV === 'production' ? 90000 : 120000  // 90s timeout in production
            },
            webVersionCache: {
                type: 'remote',
                remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
            }
        });

        // Prevent crashes from unhandled errors
        client.on('error', (error) => {
            console.error('❌ WhatsApp Client error:', error.message);
            // Don't crash the server, just log the error
        });

        client.on('qr', async (qr) => {
            console.log('📱 QR Code received! Generating image...');

            try {
                // Generate QR code data URL
                qrCodeData = await qrcode.toDataURL(qr, {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });

                console.log('✅ QR Code ready!');
                console.log('🌐 Local: http://localhost:3001/qr');
                console.log('🌐 Production: https://loan-server-pfyk.onrender.com/qr');
                console.log('📱 Or scan the QR code below:');

                // Display QR in console
                try {
                    const qrTerminal = require('qrcode-terminal');
                    qrTerminal.generate(qr, { small: true });
                } catch (e) {
                    console.log('💡 Install qrcode-terminal for console QR: npm install qrcode-terminal');
                }

            } catch (error) {
                console.error('❌ Error generating QR code:', error);
            }
        });

        client.on('ready', () => {
            console.log('🎉 WhatsApp Client is ready!');
            console.log('✅ You can now send messages via API');
            isReady = true;
            qrCodeData = null;
        });

        client.on('authenticated', () => {
            console.log('🔐 WhatsApp Client authenticated successfully');
            console.log('⏳ Waiting for client to be fully ready...');
            // Track authentication but don't set isReady yet
            isAuthenticated = true;
            qrCodeData = null;
        });

        client.on('auth_failure', (msg) => {
            console.error('❌ Authentication failed:', msg);
            console.log('💡 Try deleting the whatsapp-session folder and restart');
            isReady = false;
            isAuthenticated = false;
            qrCodeData = null;
        });

        client.on('disconnected', (reason) => {
            console.log('🔌 WhatsApp Client disconnected:', reason);
            isReady = false;
            isAuthenticated = false;

            // Don't auto-reconnect if user logged out
            if (reason === 'LOGOUT') {
                console.log('⚠️ WhatsApp logged out. Session cleared.');
                console.log('💡 Please restart the server to generate a new QR code.');
                qrCodeData = null;
                return;
            }

            // Auto-reconnect for other disconnection reasons
            console.log('🔄 Attempting to reconnect...');
            setTimeout(() => {
                if (!isReady) {
                    console.log('🔄 Reinitializing WhatsApp Client...');
                    initializeWhatsApp();
                }
            }, 5000);
        });

        client.on('loading_screen', (percent, message) => {
            console.log('⏳ Loading WhatsApp:', percent + '%', message);
        });

        console.log('🚀 Starting WhatsApp Client initialization...');
        client.initialize();
    } catch (error) {
        console.error('❌ Error initializing WhatsApp client:', error.message);
        isReady = false;
        isAuthenticated = false;
    }
};

// Routes

// Serve QR code page
app.get('/qr', (req, res) => {
    if (isReady) {
        res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>WhatsApp API - Connected</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f0f0f0; }
                        .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                        .success { color: #28a745; }
                        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; margin: 10px; }
                        .btn:hover { background: #0056b3; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1 class="success">✅ WhatsApp Connected!</h1>
                        <p>Your WhatsApp API is ready to send messages.</p>
                        <a href="/api/whatsapp/status" class="btn">Check API Status</a>
                        <a href="/" class="btn">Back to Home</a>
                    </div>
                </body>
            </html>
        `);
    } else if (qrCodeData) {
        res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>WhatsApp QR Code</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f0f0f0; }
                        .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                        .qr-code { border: 2px solid #25D366; border-radius: 10px; padding: 20px; margin: 20px 0; background: white; }
                        .btn { background: #25D366; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
                        .btn:hover { background: #1da851; }
                        .steps { text-align: left; margin: 20px 0; }
                        .steps ol { padding-left: 20px; }
                        .steps li { margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>📱 Scan QR Code with WhatsApp</h1>
                        
                        <div class="steps">
                            <h3>How to scan:</h3>
                            <ol>
                                <li>Open <strong>WhatsApp</strong> on your phone</li>
                                <li>Go to <strong>Settings</strong> → <strong>Linked Devices</strong></li>
                                <li>Tap <strong>"Link a Device"</strong></li>
                                <li>Scan the QR code below</li>
                            </ol>
                        </div>
                        
                        <div class="qr-code">
                            <img src="${qrCodeData}" alt="WhatsApp QR Code" style="max-width: 100%; height: auto;">
                        </div>
                        
                        <button onclick="location.reload()" class="btn">🔄 Refresh QR Code</button>
                        <button onclick="checkStatus()" class="btn">✅ Check Connection</button>
                        

                    </div>
                    
                    <script>
                        function checkStatus() {
                            fetch('/api/whatsapp/status')
                                .then(response => response.json())
                                .then(data => {
                                    if (data.connected) {
                                        alert('✅ Connected! Refreshing page...');
                                        location.reload();
                                    } else {
                                        alert('⏳ Still connecting... Please scan the QR code.');
                                    }
                                })
                                .catch(error => {
                                    console.error('Error:', error);
                                    alert('❌ Error checking status');
                                });
                        }

                    </script>
                </body>
            </html>
        `);
    } else {
        res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>WhatsApp API - Loading</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f0f0f0; }
                        .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                        .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #25D366; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 20px auto; }
                        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>⏳ Loading WhatsApp...</h1>
                        <div class="spinner"></div>
                        <p>Please wait while the QR code is generated...</p>
                        <p>This usually takes 10-30 seconds.</p>
                        <button onclick="location.reload()" class="btn">🔄 Refresh</button>

                    </div>
                </body>
            </html>
        `);
    }
});

// Check connection status
app.get('/api/whatsapp/status', (req, res) => {
    res.json({
        connected: isAuthenticated || isReady,  // Show as connected if authenticated
        ready: isReady,  // Only true when fully ready to send messages
        authenticated: isAuthenticated,
        hasQR: !!qrCodeData,
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        whatsapp: isReady ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Simple status page
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head><title>WhatsApp API Server</title></head>
            <body style="font-family: Arial; padding: 20px;">
                <h1>📱 WhatsApp API Server</h1>
                <p><strong>Status:</strong> ${isReady ? '✅ Connected' : '⏳ Waiting for authentication'}</p>
                <p><strong>Port:</strong> ${PORT}</p>
                <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
                <hr>
                <h3>Available Endpoints:</h3>
                <ul>
                    <li><a href="/qr">📱 QR Code for Authentication</a></li>
                    <li><a href="/api/whatsapp/status">📊 API Status (JSON)</a></li>
                    <li><a href="/health">🏥 Health Check</a></li>
                </ul>
                <hr>
                <p><em>Server running since: ${new Date().toLocaleString()}</em></p>
            </body>
        </html>
    `);
});

// Get QR code for authentication
app.get('/api/whatsapp/qr-code', (req, res) => {
    if (isReady) {
        res.json({ success: true, message: 'Already connected' });
    } else if (qrCodeData) {
        res.json({ success: true, qrCode: qrCodeData });
    } else {
        res.json({ success: false, message: 'QR code not available yet' });
    }
});

// Logout endpoint
app.post('/api/whatsapp/logout', async (req, res) => {
    try {
        if (!client) {
            return res.status(400).json({
                success: false,
                message: 'WhatsApp client not initialized'
            });
        }

        console.log('🚪 Logout requested...');
        await client.logout();

        // Reset states
        isReady = false;
        isAuthenticated = false;
        qrCodeData = null;

        console.log('✅ Logged out successfully');
        res.json({
            success: true,
            message: 'Logged out successfully. Please restart the server to reconnect.'
        });
    } catch (error) {
        console.error('❌ Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed',
            error: error.message
        });
    }
});

// Send single message
app.post('/api/whatsapp/send-message', async (req, res) => {
    try {
        if (!isReady) {
            return res.status(400).json({
                success: false,
                error: 'WhatsApp client not ready'
            });
        }

        const { phone, message } = req.body;

        if (!phone || !message) {
            return res.status(400).json({
                success: false,
                error: 'Phone number and message are required'
            });
        }

        // Check if client is ready and connected
        if (!isReady) {
            return res.status(503).json({
                success: false,
                error: 'WhatsApp client is not ready. Please scan QR code first.'
            });
        }

        // Validate client state before sending
        try {
            const state = await client.getState();
            if (state !== 'CONNECTED') {
                console.log('⚠️ Client state:', state);
                return res.status(503).json({
                    success: false,
                    error: `WhatsApp is not connected. Current state: ${state}. Please reconnect.`
                });
            }
        } catch (stateError) {
            console.error('Error checking client state:', stateError);
            return res.status(503).json({
                success: false,
                error: 'WhatsApp session is not available. Please reconnect.'
            });
        }

        // Format phone number for WhatsApp
        const formattedPhone = phone.includes('@c.us') ? phone : `${phone}@c.us`;

        // Send message with timeout
        const sendTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Message send timeout after 30 seconds')), 30000)
        );

        const sentMessage = await Promise.race([
            client.sendMessage(formattedPhone, message),
            sendTimeout
        ]);

        res.json({
            success: true,
            messageId: sentMessage.id.id,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error sending message:', error);

        // Provide more specific error messages
        let errorMessage = error.message;
        if (error.message.includes('Session closed') || error.message.includes('Protocol error')) {
            errorMessage = 'WhatsApp session has been closed. Please reconnect by scanning the QR code again.';
            isReady = false; // Reset ready state
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Message sending timed out. Please try again.';
        }

        res.status(500).json({
            success: false,
            error: errorMessage
        });
    }
});

// Send bulk messages
app.post('/api/whatsapp/send-bulk', async (req, res) => {
    try {
        if (!isReady) {
            return res.status(400).json({
                success: false,
                error: 'WhatsApp client not ready'
            });
        }

        const { contacts, message } = req.body;

        if (!contacts || !Array.isArray(contacts) || !message) {
            return res.status(400).json({
                success: false,
                error: 'Contacts array and message are required'
            });
        }

        const results = [];

        for (const contact of contacts) {
            try {
                const formattedPhone = contact.phone.includes('@c.us') ? contact.phone : `${contact.phone}@c.us`;

                const sentMessage = await client.sendMessage(formattedPhone, message);

                results.push({
                    contact: contact,
                    success: true,
                    messageId: sentMessage.id.id
                });

                // Add delay between messages to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
                results.push({
                    contact: contact,
                    success: false,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            results: results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error sending bulk messages:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get chat list
app.get('/api/whatsapp/chats', async (req, res) => {
    try {
        if (!isReady) {
            return res.status(400).json({
                success: false,
                error: 'WhatsApp client not ready'
            });
        }

        const chats = await client.getChats();
        const chatList = chats.slice(0, 20).map(chat => ({
            id: chat.id._serialized,
            name: chat.name,
            isGroup: chat.isGroup,
            lastMessage: chat.lastMessage?.body || '',
            timestamp: chat.timestamp
        }));

        res.json({
            success: true,
            chats: chatList
        });

    } catch (error) {
        console.error('Error getting chats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`WhatsApp API Server running on port ${PORT}`);
    initializeWhatsApp();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down WhatsApp client...');
    if (client) {
        await client.destroy();
    }
    process.exit(0);
});