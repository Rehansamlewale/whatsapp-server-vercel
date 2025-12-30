# WhatsApp API Server - Railway Deployment

🚂 **Optimized for Railway** - Fast, reliable WhatsApp API server with LID error fixes.

## 🚀 Features

- ✅ **Fast QR Generation** - Optimized for Railway's infrastructure
- ✅ **LID Error Fix** - Handles "No LID for user" errors automatically
- ✅ **Bulk Messaging** - Send messages to multiple contacts
- ✅ **Session Persistence** - Maintains WhatsApp connection across restarts
- ✅ **Railway Optimized** - Configured for Railway's deployment environment

## 🛠️ Railway Deployment

### Method 1: Deploy from GitHub (Recommended)

1. **Fork this repository** to your GitHub account

2. **Connect to Railway:**
   - Go to [Railway.app](https://railway.app)
   - Click "Start a New Project"
   - Select "Deploy from GitHub repo"
   - Choose your forked repository

3. **Configure Environment:**
   - Railway will automatically detect the Node.js project
   - No additional environment variables needed for basic setup

4. **Deploy:**
   - Railway will automatically build and deploy
   - Your app will be available at `https://your-app-name.up.railway.app`

### Method 2: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up
```

## 📱 Usage

### 1. Connect WhatsApp

Visit your Railway app URL + `/qr` to scan the QR code:
```
https://your-app-name.up.railway.app/qr
```

### 2. Send Single Message

```bash
curl -X POST https://your-app-name.up.railway.app/send \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "919876543210",
    "message": "Hello from Railway!"
  }'
```

### 3. Send Bulk Messages

```bash
curl -X POST https://your-app-name.up.railway.app/send-bulk \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": [
      {"phone": "919876543210"},
      {"phone": "919876543211"}
    ],
    "message": "Bulk message from Railway!"
  }'
```

## 🔗 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server status and info |
| `/qr` | GET | QR code for WhatsApp authentication |
| `/status` | GET | Connection status (JSON) |
| `/health` | GET | Health check |
| `/send` | POST | Send single message |
| `/send-bulk` | POST | Send bulk messages |
| `/chats` | GET | Get recent chats |
| `/logout` | POST | Logout from WhatsApp |

## 🔧 Configuration

### Environment Variables (Optional)

```bash
PORT=3000                    # Server port (Railway sets this automatically)
NODE_ENV=production         # Environment mode
```

### Railway-Specific Features

- **Automatic HTTPS** - Railway provides SSL certificates
- **Custom Domains** - Connect your own domain
- **Persistent Storage** - Session data persists across deployments
- **Auto-scaling** - Handles traffic spikes automatically

## 🐛 Troubleshooting

### Common Issues

1. **QR Code not appearing:**
   - Wait 30-60 seconds for initialization
   - Check Railway logs for errors
   - Refresh the `/qr` page

2. **"No LID for user" error:**
   - This is automatically handled by the server
   - The system creates chat sessions before sending messages

3. **Session lost after deployment:**
   - Railway maintains persistent storage
   - Sessions should survive deployments

### Railway Logs

View logs in Railway dashboard or via CLI:
```bash
railway logs
```

## 🚂 Railway Advantages

- **Better Performance** - More resources than Vercel free tier
- **Persistent Storage** - WhatsApp sessions survive restarts
- **No Cold Starts** - Always-on containers
- **Better Memory** - More RAM for Puppeteer operations
- **Automatic SSL** - HTTPS out of the box

## 📊 Monitoring

- **Status Page:** `https://your-app-name.up.railway.app/status`
- **Health Check:** `https://your-app-name.up.railway.app/health`
- **Railway Dashboard:** Monitor CPU, memory, and network usage

## 🔒 Security

- CORS configured for security
- No sensitive data in logs
- Session data encrypted by WhatsApp Web.js

## 📝 License

MIT License - feel free to use and modify!

---

**Need help?** Check the Railway logs or create an issue in this repository.