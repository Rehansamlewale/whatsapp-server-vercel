// WhatsApp API Server - Fixed Version for Windows/Vercel
// WhatsApp API Server - Fixed Version for Windows/Vercel
console.log('Starting WhatsApp API Server...');

try {
    const express = require('express');
    const cors = require('cors');
    const { Client, LocalAuth } = require('whatsapp-web.js');
    const qrcode = require('qrcode');
    const fs = require('fs');
    const path = require('path');

    console.log('✅ All dependencies loaded successfully');
} catch (error) {
    console.error('❌ Error loading dependencies:', error.message);
    console.log('\n📦 Please run: npm install whatsapp-web.js qrcode express cors');
    console.log('Then try: npm start');
    process.exit(1);
}

const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Log environment info
console.log(`🌍 Environment: ${NODE_ENV}`);
console.log(`🚀 Port: ${PORT}`);

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://yashasavibhava.com',
        'https://loan-server-pfyk.onrender.com',
        'https://whatsapp-server-vercel.vercel.app',
        /\.vercel\.app$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// WhatsApp Client
let client = null;
let qrCodeData = null;
let isReady = false;
let isAuthenticated = false;
let clientInitialized = false;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

// ✅ FIX: Clean session folder to prevent EBUSY errors
const cleanSessionFolder = () => {
    try {
        const sessionPath = path.join(__dirname, 'whatsapp-session');
        if (fs.existsSync(sessionPath)) {
            console.log('🧹 Cleaning previous session...');
            
            // Try to remove the entire session folder
            try {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                console.log('✅ Session folder cleaned');
            } catch (error) {
                console.log('⚠️ Could not delete entire folder, will skip...');
            }
        }
    } catch (error) {
        console.log('⚠️ Session cleanup warning:', error.message);
    }
};

// ✅ FIX: Enhanced ensureChatExists function
const ensureChatExists = async (phoneNumber) => {
    try {
        const formattedPhone = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
        
        console.log(`🔍 Checking ${formattedPhone}...`);
        
        // Step 1: Check if registered
        const isRegistered = await client.isRegisteredUser(formattedPhone);
        if (!isRegistered) {
            throw new Error('❌ Number not registered on WhatsApp');
        }
        console.log('✅ Number is registered');
        
        // Step 2: Get contact
        const contact = await client.getContactById(formattedPhone);
        console.log(`📱 Contact: ${contact.name || contact.pushname || 'Unknown'}`);
        
        // Step 3: Check if contact is blocked or has restrictions
        if (contact.isBlocked) {
            throw new Error('❌ Contact has blocked you');
        }
        
        // Step 4: Try to get or create chat
        let chat;
        try {
            chat = await client.getChatById(formattedPhone);
            console.log('✅ Chat exists');
        } catch (e) {
            console.log('📝 Creating new chat...');
            // Send empty message to create chat
            await client.sendMessage(formattedPhone, '​'); // Zero-width space
            await new Promise(resolve => setTimeout(resolve, 2000));
            chat = await client.getChatById(formattedPhone);
        }
        
        return true;
        
    } catch (error) {
        console.error(`❌ Chat check failed: ${error.message}`);
        throw error; // Re-throw to handle in send-message endpoint
    }
};

// ✅ FIX: Initialize WhatsApp Client with proper error handling
const initializeWhatsApp = () => {
    if (initAttempts >= MAX_INIT_ATTEMPTS) {
        console.error('❌ Max initialization attempts reached.');
        console.log('💡 Try deleting the whatsapp-session folder manually');
        return;
    }

    initAttempts++;
    console.log(`🔄 WhatsApp Init (Attempt ${initAttempts}/${MAX_INIT_ATTEMPTS})...`);
    console.log(`💾 Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

    // Clean up any existing client
    if (client) {
        try {
            client.destroy();
        } catch (e) {
            // Ignore errors during cleanup
        }
    }

    // Reset states
    client = null;
    isReady = false;
    isAuthenticated = false;
    qrCodeData = null;
    clientInitialized = false;

    // Clean session folder before starting
    cleanSessionFolder();

    try {
        console.log('🔄 Creating new WhatsApp client...');
        
        client = new Client({
            authStrategy: new LocalAuth({
                clientId: "vardhaman-finance",
                dataPath: path.join(__dirname, 'whatsapp-session')
            }),
            puppeteer: {
                headless: true,
                args: [
                    // Windows compatible args
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    // Essential for Windows
                    '--disable-gpu',
                    '--disable-software-rasterizer',
                    '--disable-background-timer-throttling',
                    '--disable-renderer-backgrounding',
                    '--disable-backgrounding-occluded-windows',
                    // Performance
                    '--disable-extensions',
                    '--disable-default-apps',
                    '--disable-translate',
                    '--disable-sync',
                    '--metrics-recording-only',
                    '--mute-audio',
                    '--no-first-run',
                    '--no-default-browser-check'
                ],
                // Longer timeout for Windows
                timeout: 60000, // 60 seconds
                // Windows specific
                executablePath: process.platform === 'win32' ? undefined : undefined,
                ignoreDefaultArgs: ['--enable-automation']
            },
            // Use remote web version for stability
            webVersionCache: {
                type: 'remote',
                remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
            },
            // Conservative settings for stability
            restartOnAuthFail: false,
            qrMaxRetries: 3,
            takeoverOnConflict: false,
            takeoverTimeoutMs: 20000,
            authTimeoutMs: 45000,
            qrRefreshIntervalMs: 30000,
            // Additional settings for Windows
            ffmpegPath: null,
            bypassCSP: true
        });

        // Event: QR Code
        client.on('qr', async (qr) => {
            console.log('📱 QR Code received!');
            try {
                qrCodeData = await qrcode.toDataURL(qr, {
                    width: 300,
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });
                console.log('✅ QR Code generated successfully');
            } catch (error) {
                console.error('❌ QR generation error:', error.message);
            }
        });

        // Event: Ready
        client.on('ready', () => {
            console.log('🎉 WhatsApp Client is READY!');
            console.log('✅ You can now send messages via API');
            isReady = true;
            isAuthenticated = true;
            qrCodeData = null;
            clientInitialized = true;
        });

        // Event: Authenticated
        client.on('authenticated', () => {
            console.log('🔐 WhatsApp Client authenticated');
            isAuthenticated = true;
            qrCodeData = null;
        });

        // Event: Auth Failure
        client.on('auth_failure', (msg) => {
            console.error('❌ Authentication failed:', msg);
            isReady = false;
            isAuthenticated = false;
            qrCodeData = null;
            
            // Try to reinitialize after delay
            setTimeout(() => {
                if (!clientInitialized) {
                    console.log('🔄 Retrying initialization...');
                    initializeWhatsApp();
                }
            }, 10000);
        });

        // Event: Disconnected
        client.on('disconnected', (reason) => {
            console.log('🔌 WhatsApp Client disconnected:', reason);
            isReady = false;
            isAuthenticated = false;
            clientInitialized = false;
            
            if (reason === 'LOGOUT') {
                console.log('⚠️ Logged out. Cleaning session...');
                cleanSessionFolder();
                qrCodeData = null;
                return;
            }
            
            // Auto-reconnect after 10 seconds
            setTimeout(() => {
                if (!clientInitialized) {
                    console.log('🔄 Reconnecting...');
                    initializeWhatsApp();
                }
            }, 10000);
        });

        // Event: Loading Screen
        client.on('loading_screen', (percent, message) => {
            console.log(`⏳ Loading WhatsApp: ${percent}% - ${message}`);
        });

        // Event: Error
        client.on('error', (error) => {
            console.error('❌ WhatsApp Client error:', error.message);
            // Don't crash on error
        });

        console.log('🚀 Initializing WhatsApp Client...');
        
        // Initialize with error handling
        client.initialize().then(() => {
            console.log('✅ Client initialization started');
        }).catch(error => {
            console.error('❌ Client initialization error:', error.message);
            
            // Retry after delay
            setTimeout(() => {
                if (!clientInitialized) {
                    console.log('🔄 Retrying initialization...');
                    initializeWhatsApp();
                }
            }, 10000);
        });

    } catch (error) {
        console.error('❌ Error creating WhatsApp client:', error.message);
        
        // Retry after delay
        setTimeout(() => {
            if (!clientInitialized) {
                console.log('🔄 Retrying...');
                initializeWhatsApp();
            }
        }, 10000);
    }
};

// Routes

// Serve QR code page
app.get('/qr', (req, res) => {
    if (isReady) {
        return res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>WhatsApp Connected</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f0f0f0; }
                        .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                        .success { color: #28a745; font-size: 24px; }
                        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; margin: 10px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="success">✅ WhatsApp Connected!</div>
                        <p>Your WhatsApp API is ready to send messages.</p>
                        <a href="/api/whatsapp/status" class="btn">Check API Status</a>
                        <a href="/" class="btn">Back to Home</a>
                    </div>
                </body>
            </html>
        `);
    }
    
    if (qrCodeData) {
        return res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Scan WhatsApp QR Code</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f0f0f0; }
                        .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                        .qr-code { border: 2px solid #25D366; border-radius: 10px; padding: 20px; margin: 20px 0; background: white; }
                        .btn { background: #25D366; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>📱 Scan WhatsApp QR Code</h2>
                        <div style="text-align: left; margin: 20px 0;">
                            <ol>
                                <li>Open <strong>WhatsApp</strong> on your phone</li>
                                <li>Go to <strong>Settings</strong> → <strong>Linked Devices</strong></li>
                                <li>Tap <strong>"Link a Device"</strong></li>
                                <li>Scan the QR code below</li>
                            </ol>
                        </div>
                        
                        <div class="qr-code">
                            <img src="${qrCodeData}" alt="WhatsApp QR Code" width="300" height="300">
                        </div>
                        
                        <button onclick="location.reload()" class="btn">🔄 Refresh</button>
                        <button onclick="checkStatus()" class="btn">✅ Check Connection</button>
                    </div>
                    
                    <script>
                        async function checkStatus() {
                            try {
                                const response = await fetch('/api/whatsapp/status');
                                const data = await response.json();
                                if (data.connected) {
                                    alert('✅ Connected! Refreshing...');
                                    location.reload();
                                } else {
                                    alert('⏳ Still connecting...');
                                }
                            } catch (error) {
                                alert('❌ Error checking status');
                            }
                        }
                    </script>
                </body>
            </html>
        `);
    }
    
    res.send(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Loading WhatsApp</title>
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
                    <h2>⏳ Initializing WhatsApp...</h2>
                    <div class="spinner"></div>
                    <p>Please wait while WhatsApp loads.</p>
                    <button onclick="location.reload()" class="btn">🔄 Refresh</button>
                    
                    <script>
                        // Auto-refresh every 5 seconds
                        setTimeout(() => location.reload(), 5000);
                    </script>
                </div>
            </body>
        </html>
    `);
});

// Status endpoint
app.get('/api/whatsapp/status', (req, res) => {
    res.json({
        connected: isReady || isAuthenticated,
        ready: isReady,
        authenticated: isAuthenticated,
        hasQR: !!qrCodeData,
        timestamp: new Date().toISOString(),
        initAttempts: initAttempts,
        uptime: process.uptime()
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        whatsapp: isReady ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Home page
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head><title>WhatsApp API Server</title></head>
            <body style="font-family: Arial; padding: 20px;">
                <h1>📱 WhatsApp API Server</h1>
                <p><strong>Status:</strong> ${isReady ? '✅ Connected' : '⏳ Waiting for authentication'}</p>
                <p><strong>Port:</strong> ${PORT}</p>
                <p><strong>Environment:</strong> ${NODE_ENV}</p>
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

// ✅ FIX: Update the send-message endpoint to accept authenticated state
app.post('/api/whatsapp/send-message', async (req, res) => {
    try {
        // CHANGE: Check for authenticated OR ready
        if (!isReady && !isAuthenticated) {
            return res.status(400).json({
                success: false,
                error: 'WhatsApp client not connected. Please scan QR code first.'
            });
        }

        const { phone, message } = req.body;

        if (!phone || !message) {
            return res.status(400).json({
                success: false,
                error: 'Phone number and message are required'
            });
        }

        // Wait a bit if authenticated but not fully ready
        if (isAuthenticated && !isReady) {
            console.log('⏳ Client authenticated but not fully ready, waiting...');
            // Wait up to 10 seconds for client to be ready
            for (let i = 0; i < 10; i++) {
                if (isReady) break;
                await new Promise(resolve => setTimeout(resolve, 1000));
                console.log(`Waiting for client to be ready... ${i+1}/10`);
            }
        }

        // If still not ready, check if client exists and is connected
        if (!isReady) {
            try {
                const state = await client.getState();
                if (state === 'CONNECTED') {
                    console.log('✅ Client state is CONNECTED, setting isReady to true');
                    isReady = true;
                }
            } catch (stateError) {
                console.log('⚠️ Could not get client state:', stateError.message);
            }
        }

        // Format phone number
        let formattedPhone = phone.trim();
        if (!formattedPhone.includes('@c.us')) {
            formattedPhone = formattedPhone.replace(/\D/g, '');
            if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
                formattedPhone = '91' + formattedPhone;
            }
            formattedPhone = `${formattedPhone}@c.us`;
        }

        console.log(`📤 Attempting to send to ${formattedPhone}...`);

        // Try to ensure chat exists
        try {
            await ensureChatExists(formattedPhone);
        } catch (chatError) {
            console.log(`⚠️ Chat check: ${chatError.message}`);
        }

        // Send message
        const result = await client.sendMessage(formattedPhone, message);
        
        console.log(`✅ Message sent successfully to ${formattedPhone}`);
        
        res.json({
            success: true,
            messageId: result.id.id,
            phone: formattedPhone,
            timestamp: new Date().toISOString(),
            status: isReady ? 'fully_ready' : 'authenticated_only'
        });

    } catch (error) {
        console.error('❌ Send error:', error.message);
        
        let errorMessage = error.message;
        if (error.message.includes('No LID')) {
            errorMessage = 'Cannot send to this contact. They might have privacy settings enabled.';
        } else if (error.message.includes('not registered')) {
            errorMessage = 'This phone number is not registered on WhatsApp.';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Message sending timed out. Please try again.';
        }

        res.status(500).json({
            success: false,
            error: errorMessage,
            details: error.message
        });
    }
});

// ✅ FIX: Send bulk messages
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
        console.log(`📤 Starting bulk send to ${contacts.length} contacts...`);

        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            
            try {
                let phoneNumber = contact.phone || contact;
                
                // Format phone number
                if (!phoneNumber.includes('@c.us')) {
                    phoneNumber = phoneNumber.replace(/\D/g, '');
                    if (!phoneNumber.startsWith('91') && phoneNumber.length === 10) {
                        phoneNumber = '91' + phoneNumber;
                    }
                    phoneNumber = `${phoneNumber}@c.us`;
                }
                
                console.log(`Processing ${i+1}/${contacts.length}: ${phoneNumber}`);
                
                // Try to ensure chat exists
                try {
                    await ensureChatExists(phoneNumber);
                } catch (chatError) {
                    console.log(`⚠️ Chat prep: ${chatError.message}`);
                }
                
                // Add delay between messages (except first)
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
                // Send message
                const result = await client.sendMessage(phoneNumber, message);
                
                results.push({
                    phone: phoneNumber,
                    success: true,
                    messageId: result.id.id,
                    timestamp: new Date().toISOString()
                });
                
                console.log(`✅ Sent to ${phoneNumber}`);
                
            } catch (error) {
                console.error(`❌ Failed for ${contact.phone || contact}:`, error.message);
                
                results.push({
                    phone: contact.phone || contact,
                    success: false,
                    error: error.message
                });
            }
        }
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log(`📊 Bulk send complete: ${successful} successful, ${failed} failed`);
        
        res.json({
            success: true,
            summary: {
                total: contacts.length,
                successful: successful,
                failed: failed
            },
            results: results,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Bulk send error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
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
        
        // Clean session folder first
        cleanSessionFolder();
        
        // Then try to logout
        try {
            await client.logout();
        } catch (logoutError) {
            console.log('⚠️ Logout command failed, but session will be cleaned');
        }

        // Reset states
        isReady = false;
        isAuthenticated = false;
        qrCodeData = null;
        clientInitialized = false;

        console.log('✅ Logged out successfully');
        res.json({
            success: true,
            message: 'Logged out successfully. Refresh to start new session.'
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

// Start server
app.listen(PORT, () => {
    console.log(`WhatsApp API Server running on port ${PORT}`);
    
    // Wait 2 seconds before initializing WhatsApp
    setTimeout(() => {
        initializeWhatsApp();
    }, 2000);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down WhatsApp client...');
    if (client) {
        try {
            await client.destroy();
        } catch (error) {
            // Ignore errors during shutdown
        }
    }
    process.exit(0);
});

// Export for Vercel
if (process.env.VERCEL) {
    module.exports = app;
}