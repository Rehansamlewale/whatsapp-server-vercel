# 🚂 Railway Deployment Guide

## Quick Deploy Steps

### 1. Create Railway Project
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose `whatsapp-server-vercel` repository

### 2. Railway Will Auto-Configure
- Detects Node.js project automatically
- Uses `railway.json` configuration
- Starts with `node server.js`

### 3. Access Your App
After deployment (2-3 minutes):
- Your app URL: `https://[random-name].up.railway.app`
- QR Code: `https://[random-name].up.railway.app/qr`

### 4. Test Endpoints
```bash
# Health check
curl https://your-app.up.railway.app/health

# Status
curl https://your-app.up.railway.app/status

# Send message (after QR scan)
curl -X POST https://your-app.up.railway.app/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "919876543210", "message": "Hello from Railway!"}'
```

## Troubleshooting

### If deployment fails:
1. Check Railway logs in dashboard
2. Verify Node.js version (should be 18+)
3. Ensure all dependencies are in package.json

### If QR code doesn't appear:
1. Wait 60 seconds for initialization
2. Check `/status` endpoint
3. Refresh `/qr` page

### Common Railway Issues:
- **Build fails**: Check package.json engines
- **App crashes**: Check Railway logs
- **No response**: Verify PORT environment variable

## Railway Advantages
- ✅ Persistent storage (sessions survive restarts)
- ✅ No cold starts
- ✅ Better memory allocation
- ✅ Automatic HTTPS
- ✅ Custom domains available