// WhatsApp API Server - Railway Optimized with LID Fix
console.log('🚀 Starting WhatsApp API Server for Railway...');

const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Railway-specific environment info
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🚀 Port: ${PORT}`);
console.log(`🚂 Platform: Railway`);
console.log(`💾 Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

// Middleware - Railway optimized
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://yashasavibhava.com',
        // Railway domains will be added automatically
        /\.railway\.app$/,
        /\.up\.railway\.app$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// State management
let client = null;
let qrCode = null;
let isReady = false;
let isAuthenticated = false;
let clientInitialized = false;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

// Railway-optimized WhatsApp Client Initialization
const initWhatsAppClient = () => {
    if (initAttempts >= MAX_INIT_ATTEMPTS) {
        console.error('❌ Max initialization attempts reached.');
        return;
    }

    initAttempts++;
    console.log(`🔄 Initializing WhatsApp Client (Attempt ${initAttempts}/${MAX_INIT_ATTEMPTS})...`);
    
    client = new Client({
        authStrategy: new LocalAuth({
            clientId: "railway-client",
            dataPath: path.join(process.cwd(), '.wwebjs_auth')
        }),
        puppeteer: {
            headless: true,
            args: [
                // Railway-optimized Puppeteer args
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--disable-web-security',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-default-apps',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-hang-monitor',
                '--disable-ipc-flooding-protection',
                '--disable-logging',
                '--disable-notifications',
                '--mute-audio',
                '--no-default-browser-check',
                '--disable-software-rasterizer'
            ],
            timeout: 60000 // Railway has better resources than Vercel
        },
        // Use remote web version for Railway
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        },
        // Railway-specific settings
        restartOnAuthFail: true,
        qrMaxRetries: 3,
        takeoverOnConflict: true,
        takeoverTimeoutMs: 30000
    });

    // Event Handlers
    client.on('qr', async (qr) => {
        try {
            const qrStartTime = Date.now();
            console.log('📱 QR received, generating image...');
            
            qrCode = await qrcode.toDataURL(qr, {
                width: 300,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                errorCorrectionLevel: 'M'
            });
            
            const qrEndTime = Date.now();
            console.log(`✅ QR ready in ${qrEndTime - qrStartTime}ms!`);
            console.log('🌐 Railway URL: Check your Railway deployment URL + /qr');
            console.log('🌐 Local: http://localhost:3000/qr');
        } catch (error) {
            console.error('❌ Failed to generate QR:', error);
        }
    });

    client.on('ready', () => {
        console.log('🎉 WhatsApp Client READY on Railway!');
        isReady = true;
        isAuthenticated = true;
        qrCode = null;
        clientInitialized = true;
    });

    client.on('authenticated', () => {
        console.log('🔐 WhatsApp authenticated!');
        isAuthenticated = true;
        qrCode = null;
    });

    client.on('auth_failure', (msg) => {
        console.error('❌ Auth failure:', msg);
        isReady = false;
        isAuthenticated = false;
        qrCode = null;
    });

    client.on('disconnected', (reason) => {
        console.log('🔌 Disconnected:', reason);
        isReady = false;
        isAuthenticated = false;
        qrCode = null;
        clientInitialized = false;

        // Auto-reconnect for Railway
        if (reason !== 'LOGOUT') {
            setTimeout(() => {
                if (!clientInitialized && initAttempts < MAX_INIT_ATTEMPTS) {
                    console.log('🔄 Attempting to reconnect...');
                    initWhatsAppClient();
                }
            }, 5000);
        }
    });

    client.on('loading_screen', (percent, message) => {
        console.log(`⏳ Loading WhatsApp: ${percent}% - ${message}`);
    });

    // Initialize client
    client.initialize().catch(err => {
        console.error('❌ Failed to initialize WhatsApp:', err);
        isReady = false;
        isAuthenticated = false;
    });
};

// ✅ CRITICAL FIX: Function to handle "No LID" error
const ensureChatExists = async (phoneNumber) => {
    try {
        const formattedPhone = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
        console.log(`🔍 Checking chat for ${formattedPhone}...`);

        // First, check if user is registered on WhatsApp
        const isRegistered = await client.isRegisteredUser(formattedPhone);
        if (!isRegistered) {
            throw new Error('Phone number is not registered on WhatsApp');
        }

        // Try to get existing chat
        try {
            const chat = await client.getChatById(formattedPhone);
            if (chat) {
                console.log(`✅ Chat already exists for ${formattedPhone}`);
                return chat;
            }
        } catch (error) {
            console.log(`ℹ️ No existing chat for ${formattedPhone}, will create one...`);
        }

        // Send a minimal message (a dot) to force chat creation
        console.log(`🔄 Attempting to create chat for ${formattedPhone}...`);
        const dummyMessage = await client.sendMessage(formattedPhone, '.');
        
        // Wait a moment for chat to be created
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`✅ Chat created successfully for ${formattedPhone}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to ensure chat exists for ${phoneNumber}:`, error.message);
        
        // If method 1 fails, try alternative approach
        if (error.message.includes('No LID') || error.message.includes('LID')) {
            console.log(`🔄 Trying alternative method for ${phoneNumber}...`);
            return await createChatAlternative(phoneNumber);
        }
        throw error;
    }
};

// ✅ ALTERNATIVE METHOD for creating chat
const createChatAlternative = async (phoneNumber) => {
    try {
        const formattedPhone = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
        console.log(`🔧 Using alternative method for ${formattedPhone}...`);

        // Try to find contact first
        try {
            const contact = await client.getContactById(formattedPhone);
            console.log(`✅ Found contact: ${contact.pushname || contact.name}`);
        } catch (e) {
            console.log(`ℹ️ Contact not in address book: ${formattedPhone}`);
        }

        // Send a simple message
        const simpleMessage = `Hi, this is a test message from WhatsApp API.`;
        const result = await client.sendMessage(formattedPhone, simpleMessage, {
            linkPreview: false
        });

        console.log(`✅ Alternative method worked for ${formattedPhone}`);
        return true;
    } catch (error) {
        console.error(`❌ Alternative method also failed for ${phoneNumber}:`, error.message);
        throw new Error(`Cannot create chat with ${phoneNumber}. User might have blocked you or privacy settings prevent chat creation.`);
    }
};

// Routes

// QR Code page - Railway optimized
app.get('/qr', (req, res) => {
    if (isReady || isAuthenticated) {
        return res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>WhatsApp Connected - Railway</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #f5f5f5; }
                        .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        .success { color: #25D366; font-size: 24px; margin-bottom: 20px; }
                        .btn { background: #25D366; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; text-decoration: none; display: inline-block; }
                        .btn:hover { background: #1da851; }
                        .status-info { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
                        .railway-badge { background: #0f0f23; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="success">✅ WhatsApp Connected!</div>
                        <div class="railway-badge">🚂 Powered by Railway</div>
                        <div class="status-info">
                            <strong>Status:</strong> ${isReady ? 'Fully Ready' : 'Authenticated (Loading...)'}<br>
                            <strong>Ready to send messages:</strong> ${isReady ? 'Yes' : 'Almost ready...'}
                        </div>
                        <p>Your WhatsApp API is ${isReady ? 'ready to send messages' : 'connected and finishing setup'}.</p>
                        <a href="/status" class="btn">📊 Check Status</a>
                        <a href="/" class="btn">🏠 Home</a>
                        ${!isReady ? '<button onclick="location.reload()" class="btn">🔄 Refresh Status</button>' : ''}
                    </div>
                    
                    ${!isReady ? `
                    <script>
                        // Auto-refresh until fully ready
                        setTimeout(() => {
                            fetch('/status')
                                .then(response => response.json())
                                .then(data => {
                                    if (data.connected && data.ready) {
                                        location.reload();
                                    }
                                });
                        }, 3000);
                    </script>
                    ` : ''}
                </body>
            </html>
        `);
    }

    if (qrCode) {
        return res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Scan WhatsApp QR Code - Railway</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f5f5f5; }
                        .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        .qr-container { margin: 20px 0; padding: 20px; border: 2px solid #25D366; border-radius: 10px; background: white; }
                        .btn { background: #25D366; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
                        .btn:hover { background: #1da851; }
                        .railway-badge { background: #0f0f23; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; margin: 10px 0; }
                        .steps { text-align: left; margin: 20px 0; }
                        .steps ol { padding-left: 20px; }
                        .steps li { margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>📱 Scan WhatsApp QR Code</h2>
                        <div class="railway-badge">🚂 Powered by Railway</div>
                        
                        <div class="steps">
                            <h3>How to scan:</h3>
                            <ol>
                                <li>Open <strong>WhatsApp</strong> on your phone</li>
                                <li>Go to <strong>Settings</strong> → <strong>Linked Devices</strong></li>
                                <li>Tap <strong>"Link a Device"</strong></li>
                                <li>Scan the QR code below</li>
                            </ol>
                        </div>
                        
                        <div class="qr-container">
                            <img src="${qrCode}" alt="WhatsApp QR Code" style="max-width: 100%; height: auto;">
                        </div>
                        
                        <button onclick="location.reload()" class="btn">🔄 Refresh QR Code</button>
                        <button onclick="checkStatus()" class="btn">✅ Check Connection</button>
                        
                        <script>
                            function checkStatus() {
                                fetch('/status')
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
                            
                            // Auto-refresh every 10 seconds
                            setTimeout(() => location.reload(), 10000);
                        </script>
                    </div>
                </body>
            </html>
        `);
    }

    res.send(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Loading WhatsApp - Railway</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #f5f5f5; }
                    .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #25D366; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    .railway-badge { background: #0f0f23; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; margin: 10px 0; }
                    .progress { background: #e9ecef; border-radius: 10px; height: 20px; margin: 20px 0; overflow: hidden; }
                    .progress-bar { background: #25D366; height: 100%; width: 0%; transition: width 0.5s ease; }
                    .status-text { color: #666; margin: 10px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>⏳ Initializing WhatsApp...</h2>
                    <div class="railway-badge">🚂 Powered by Railway</div>
                    <div class="spinner"></div>
                    <div class="progress">
                        <div class="progress-bar" id="progressBar"></div>
                    </div>
                    <p class="status-text" id="statusText">Starting WhatsApp client...</p>
                    <p>QR code will appear here shortly.</p>
                    
                    <script>
                        let progress = 0;
                        let attempts = 0;
                        const maxAttempts = 60; // Railway has better performance
                        
                        function updateProgress() {
                            progress = Math.min((attempts / maxAttempts) * 100, 95);
                            document.getElementById('progressBar').style.width = progress + '%';
                            
                            if (attempts < 10) {
                                document.getElementById('statusText').textContent = '🚂 Starting Railway WhatsApp client...';
                            } else if (attempts < 20) {
                                document.getElementById('statusText').textContent = '🌐 Loading WhatsApp Web...';
                            } else if (attempts < 40) {
                                document.getElementById('statusText').textContent = '📱 Generating QR code...';
                            } else {
                                document.getElementById('statusText').textContent = '⏳ Almost ready...';
                            }
                        }
                        
                        function checkForQR() {
                            fetch('/status')
                                .then(response => response.json())
                                .then(data => {
                                    attempts++;
                                    updateProgress();
                                    
                                    console.log('Status check:', data);
                                    
                                    if (data.connected || data.hasQR) {
                                        console.log('Connected or QR available, reloading...');
                                        location.reload();
                                    } else if (attempts >= maxAttempts) {
                                        document.getElementById('statusText').textContent = 'Taking longer than expected. Please refresh.';
                                        document.getElementById('progressBar').style.backgroundColor = '#dc3545';
                                    } else {
                                        setTimeout(checkForQR, 1000);
                                    }
                                })
                                .catch(error => {
                                    console.error('Error:', error);
                                    attempts++;
                                    updateProgress();
                                    if (attempts < maxAttempts) {
                                        setTimeout(checkForQR, 2000);
                                    }
                                });
                        }
                        
                        // Start checking immediately
                        checkForQR();
                    </script>
                </div>
            </body>
        </html>
    `);
});

// Status endpoint
app.get('/status', (req, res) => {
    res.json({
        connected: isAuthenticated || isReady,
        ready: isReady,
        authenticated: isAuthenticated,
        hasQR: !!qrCode,
        timestamp: new Date().toISOString(),
        platform: 'Railway',
        uptime: process.uptime(),
        initAttempts: initAttempts
    });
});

// Health check for Railway
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        whatsapp: isReady ? 'connected' : 'disconnected',
        platform: 'Railway',
        timestamp: new Date().toISOString()
    });
});

// Home page
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>WhatsApp API Server - Railway</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
                    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .railway-badge { background: #0f0f23; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; margin: 10px 0; }
                    .status { padding: 10px; border-radius: 5px; margin: 10px 0; }
                    .success { background: #d4edda; color: #155724; }
                    .warning { background: #fff3cd; color: #856404; }
                    .btn { background: #25D366; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; margin: 5px; }
                    .btn:hover { background: #1da851; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>📱 WhatsApp API Server</h1>
                    <div class="railway-badge">🚂 Powered by Railway</div>
                    
                    <div class="status ${isReady ? 'success' : 'warning'}">
                        <strong>Status:</strong> ${isReady ? '✅ Connected and Ready' : '⏳ Waiting for authentication'}
                    </div>
                    
                    <h3>📋 Server Information:</h3>
                    <ul>
                        <li><strong>Platform:</strong> Railway</li>
                        <li><strong>Port:</strong> ${PORT}</li>
                        <li><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</li>
                        <li><strong>Uptime:</strong> ${Math.floor(process.uptime())} seconds</li>
                        <li><strong>Memory Usage:</strong> ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB</li>
                    </ul>
                    
                    <h3>🔗 Available Endpoints:</h3>
                    <a href="/qr" class="btn">📱 QR Code</a>
                    <a href="/status" class="btn">📊 Status</a>
                    <a href="/health" class="btn">🏥 Health</a>
                    
                    <hr>
                    <p><em>Server running since: ${new Date().toLocaleString()}</em></p>
                </div>
            </body>
        </html>
    `);
});

// ✅ ENHANCED Send message endpoint with LID fix
app.post('/send', async (req, res) => {
    try {
        if (!isReady || !client) {
            return res.status(400).json({ 
                success: false, 
                error: 'WhatsApp not connected. Scan QR code first.' 
            });
        }

        const { phone, message } = req.body;

        if (!phone || !message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone and message are required' 
            });
        }

        // Format phone number
        let formattedPhone = phone.trim();
        if (!formattedPhone.includes('@c.us')) {
            // Remove any non-digit characters
            formattedPhone = formattedPhone.replace(/\D/g, '');
            // Add country code if not present (assuming India +91)
            if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
                formattedPhone = '91' + formattedPhone;
            }
            formattedPhone = `${formattedPhone}@c.us`;
        }

        console.log(`📤 Attempting to send to ${formattedPhone}...`);

        // STEP 1: Ensure chat exists (Fixes "No LID" error)
        try {
            await ensureChatExists(formattedPhone);
            console.log(`✅ Chat verified/created for ${formattedPhone}`);
        } catch (chatError) {
            console.error(`❌ Chat preparation failed for ${formattedPhone}:`, chatError.message);
            // If chat creation fails, try direct send anyway
            console.log(`⚠️ Bypassing chat check, trying direct send...`);
        }

        // STEP 2: Send the actual message
        console.log(`📝 Sending message to ${formattedPhone}...`);
        
        // Add small delay to ensure chat is ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const result = await client.sendMessage(formattedPhone, message);

        console.log(`✅ Message sent successfully to ${formattedPhone}`);
        res.json({ 
            success: true, 
            messageId: result.id.id,
            phone: formattedPhone,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Send error:', error.message);
        
        let errorMessage = error.message;
        let errorCode = 'SEND_ERROR';

        // Handle specific error cases
        if (error.message.includes('No LID') || error.message.includes('LID')) {
            errorMessage = 'Cannot send message to this contact. The contact might have strict privacy settings or has blocked you.';
            errorCode = 'NO_LID_ERROR';
        } else if (error.message.includes('not registered')) {
            errorMessage = 'This phone number is not registered on WhatsApp.';
            errorCode = 'NOT_REGISTERED';
        } else if (error.message.includes('blocked')) {
            errorMessage = 'You have been blocked by this contact.';
            errorCode = 'BLOCKED';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Message sending timed out. Please try again.';
            errorCode = 'TIMEOUT';
        }

        res.status(500).json({ 
            success: false, 
            error: errorMessage,
            errorCode: errorCode,
            details: error.message
        });
    }
});

// ✅ BULK Send with improved error handling
app.post('/send-bulk', async (req, res) => {
    try {
        if (!isReady || !client) {
            return res.status(400).json({ 
                success: false, 
                error: 'WhatsApp not connected. Scan QR code first.' 
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
                // Format phone number
                let phoneNumber = contact.phone || contact;
                if (!phoneNumber.includes('@c.us')) {
                    phoneNumber = phoneNumber.replace(/\D/g, '');
                    if (!phoneNumber.startsWith('91') && phoneNumber.length === 10) {
                        phoneNumber = '91' + phoneNumber;
                    }
                    phoneNumber = `${phoneNumber}@c.us`;
                }

                console.log(`Processing ${i+1}/${contacts.length}: ${phoneNumber}`);

                // Try to ensure chat exists (with error suppression)
                try {
                    await ensureChatExists(phoneNumber);
                } catch (chatError) {
                    console.log(`⚠️ Chat prep warning for ${phoneNumber}: ${chatError.message}`);
                    // Continue anyway - some contacts might still work
                }

                // Add delay between messages
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
                    error: error.message,
                    errorCode: error.message.includes('No LID') ? 'NO_LID' : 'SEND_ERROR'
                });
            }
        }

        // Calculate statistics
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

// Get chat list
app.get('/chats', async (req, res) => {
    try {
        if (!isReady || !client) {
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

// Logout endpoint
app.post('/logout', async (req, res) => {
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
        qrCode = null;
        clientInitialized = false;

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

// Start server
app.listen(PORT, () => {
    console.log(`🚂 WhatsApp API Server running on Railway`);
    console.log(`🌐 Port: ${PORT}`);
    console.log(`🔗 Access your app at: https://your-app-name.up.railway.app`);
    console.log(`📱 QR Code: https://your-app-name.up.railway.app/qr`);
    
    // Initialize WhatsApp client
    initWhatsAppClient();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down WhatsApp client...');
    if (client) {
        await client.destroy();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    if (client) {
        await client.destroy();
    }
    process.exit(0);
});

// Export for Railway (if needed)
module.exports = app;