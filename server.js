// WhatsApp API Server - Vercel Optimized
const express = require('express');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// CRITICAL: Vercel timeout settings
const SERVER_TIMEOUT = 30000; // 30 seconds max for serverless
const QR_GENERATION_TIMEOUT = 15000; // 15 seconds for QR

// Middleware - simplified CORS for Vercel
app.use(cors());
app.use(express.json());

// State management
let client = null;
let qrCode = null;
let isReady = false;
let clientInitialized = false;
let qrGeneratedTime = null;

// ENHANCED QR Generator - Much Faster
const generateQR = async (qrString) => {
    try {
        console.log('⚡ Generating FAST QR code...');
        
        // Use minimal settings for speed
        const qrOptions = {
            width: 250,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'M', // Medium error correction
            type: 'image/png',
            rendererOpts: {
                quality: 0.92
            }
        };
        
        const qrDataUrl = await qrcode.toDataURL(qrString, qrOptions);
        console.log('✅ QR generated in', Date.now() - qrGeneratedTime, 'ms');
        return qrDataUrl;
    } catch (error) {
        console.error('QR generation error:', error);
        throw error;
    }
};

// ULTRA-OPTIMIZED WhatsApp Client Initialization
const initWhatsAppClient = () => {
    // Clean up any existing client
    if (client) {
        try {
            client.destroy();
        } catch (e) {
            console.log('Cleaning up previous client...');
        }
    }
    
    console.log('🚀 Starting ULTRA-FAST WhatsApp initialization...');
    qrGeneratedTime = Date.now();
    
    // AGGRESSIVE Vercel optimization settings
    client = new Client({
        authStrategy: new LocalAuth({
            clientId: "vercel-fast-client",
            dataPath: path.join(process.cwd(), '.wwebjs_auth')
        }),
        puppeteer: {
            // CRITICAL: Use Chrome-Web-Edition (lightweight) or fallback
            headless: 'new',
            args: [
                // Essential Vercel args
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                
                // Performance optimizations
                '--disable-extensions',
                '--disable-background-networking',
                '--disable-default-apps',
                '--disable-translate',
                '--disable-sync',
                '--metrics-recording-only',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-features=TranslateUI,BlinkGenPropertyTrees',
                
                // Memory optimizations
                '--single-process',
                '--no-first-run',
                '--no-zygote',
                '--max_old_space_size=256',
                '--disable-software-rasterizer',
                '--disable-background-mode',
                
                // Vercel specific
                '--disable-features=VizDisplayCompositor',
                '--disable-threaded-animation',
                '--disable-threaded-scrolling',
                '--disable-checker-imaging',
                '--disable-image-animation-resync',
                '--disable-partial-raster'
            ],
            // Timeout settings for Vercel
            timeout: 20000,
            // Use lightweight browser
            product: 'chrome',
            // Skip unnecessary features
            ignoreDefaultArgs: ['--enable-automation'],
            executablePath: process.env.CHROME_PATH || undefined
        },
        // Web version cache for speed
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
        },
        // Client options for speed
        takeoverOnConflict: true,
        takeoverTimeoutMs: 10000,
        qrMaxRetries: 2,
        authTimeoutMs: 20000,
        qrRefreshIntervalMs: 10000,
        restartOnAuthFail: false,
        puppeteerOptions: {}
    });

    // Event Handlers
    client.on('qr', async (qr) => {
        try {
            console.log('📱 QR received, generating image...');
            qrGeneratedTime = Date.now();
            qrCode = await generateQR(qr);
            console.log('✅ QR ready for scanning at /qr');
        } catch (error) {
            console.error('Failed to generate QR:', error);
        }
    });

    client.on('ready', () => {
        console.log('🎉 WhatsApp Client READY!');
        isReady = true;
        qrCode = null;
        clientInitialized = true;
    });

    client.on('authenticated', () => {
        console.log('🔐 WhatsApp authenticated!');
        isReady = true;
        qrCode = null;
    });

    client.on('auth_failure', (msg) => {
        console.error('❌ Auth failure:', msg);
        isReady = false;
        qrCode = null;
    });

    client.on('disconnected', (reason) => {
        console.log('🔌 Disconnected:', reason);
        isReady = false;
        qrCode = null;
        clientInitialized = false;
        
        // Auto-reconnect after delay
        setTimeout(() => {
            if (!clientInitialized) {
                console.log('🔄 Attempting to reconnect...');
                initWhatsAppClient();
            }
        }, 5000);
    });

    client.on('loading_screen', (percent, message) => {
        console.log(`⏳ Loading: ${percent}% - ${message}`);
    });

    // Initialize with timeout
    const initTimeout = setTimeout(() => {
        if (!clientInitialized && !isReady) {
            console.error('⚠️ WhatsApp initialization timeout - check network');
            // Try reinitializing with different settings
            clientInitialized = true;
        }
    }, 25000);

    client.initialize().then(() => {
        clearTimeout(initTimeout);
        console.log('✅ WhatsApp initialization started');
    }).catch(err => {
        clearTimeout(initTimeout);
        console.error('❌ Failed to initialize WhatsApp:', err);
    });
};

// API Routes
app.get('/qr', (req, res) => {
    if (isReady) {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>WhatsApp Connected</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #f5f5f5; }
                    .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .success { color: #25D366; font-size: 24px; }
                    .btn { background: #25D366; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; text-decoration: none; display: inline-block; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="success">✅ WhatsApp Connected!</div>
                    <p>You can now send messages via the API.</p>
                    <a href="/status" class="btn">Check Status</a>
                </div>
            </body>
            </html>
        `);
    }
    
    if (qrCode) {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Scan WhatsApp QR Code</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f5f5f5; }
                    .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .qr-container { margin: 20px 0; padding: 20px; border: 2px solid #25D366; border-radius: 10px; background: white; }
                    .btn { background: #25D366; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
                    .instructions { text-align: left; margin: 20px 0; }
                    .loading { display: none; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>📱 Scan WhatsApp QR Code</h2>
                    <div class="instructions">
                        <p><strong>Steps:</strong></p>
                        <ol>
                            <li>Open WhatsApp on your phone</li>
                            <li>Go to Settings → Linked Devices</li>
                            <li>Tap "Link a Device"</li>
                            <li>Scan the QR code below</li>
                        </ol>
                    </div>
                    
                    <div class="qr-container">
                        <img src="${qrCode}" alt="WhatsApp QR Code" width="300" height="300">
                    </div>
                    
                    <button onclick="location.reload()" class="btn">🔄 Refresh</button>
                    <button onclick="checkStatus()" class="btn">✅ Check Connection</button>
                    
                    <div id="loading" class="loading">
                        <p>Checking connection...</p>
                    </div>
                </div>
                
                <script>
                    async function checkStatus() {
                        document.getElementById('loading').style.display = 'block';
                        try {
                            const response = await fetch('/status');
                            const data = await response.json();
                            if (data.connected) {
                                alert('✅ Connected! Refreshing...');
                                location.reload();
                            } else {
                                alert('⚠️ Not connected yet. Please scan QR code.');
                            }
                        } catch (error) {
                            alert('❌ Error checking status');
                        }
                        document.getElementById('loading').style.display = 'none';
                    }
                    
                    // Auto-refresh QR every 20 seconds if not connected
                    setTimeout(() => {
                        if (!${isReady}) {
                            location.reload();
                        }
                    }, 20000);
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
                body { font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #f5f5f5; }
                .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #25D366; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>⏳ Initializing WhatsApp...</h2>
                <div class="spinner"></div>
                <p>QR code will appear here in a few seconds.</p>
                <button onclick="location.reload()" class="btn">🔄 Refresh</button>
                
                <script>
                    // Auto-refresh every 3 seconds while loading
                    setTimeout(() => {
                        location.reload();
                    }, 3000);
                </script>
            </div>
        </body>
        </html>
    `);
});

app.get('/status', (req, res) => {
    res.json({
        connected: isReady,
        hasQR: !!qrCode,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        whatsapp: isReady ? 'connected' : 'disconnected',
        memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
    });
});

// Send message endpoint
app.post('/send', async (req, res) => {
    try {
        if (!isReady) {
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
        
        const formattedPhone = phone.includes('@c.us') ? phone : `${phone}@c.us`;
        
        console.log(`📤 Sending to ${formattedPhone}`);
        const result = await client.sendMessage(formattedPhone, message);
        
        res.json({ 
            success: true, 
            messageId: result.id.id,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Send error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Server timeout settings
app.use((req, res, next) => {
    req.setTimeout(SERVER_TIMEOUT);
    res.setTimeout(SERVER_TIMEOUT);
    next();
});

// Initialize server
app.listen(PORT, () => {
    console.log(`🚀 WhatsApp API running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⚡ Vercel Optimized Version`);
    
    // Start WhatsApp client
    setTimeout(() => {
        initWhatsAppClient();
    }, 2000); // Small delay to ensure server is ready
});

// Handle serverless deployment (Vercel)
if (process.env.VERCEL) {
    console.log('⚡ Running on Vercel - Optimized for serverless');
    module.exports = app;
}