# YouTube Clipper Automation

Prototype V1 - Auto generate clips dari channel YouTube dan upload ke multiple accounts.

## Features

- **Monitor Channel**: Deteksi video baru dari channel target
- **Generate Clips**: Buat 3 clip random (30-50 detik) per video
- **Multi-Account Upload**: Upload ke multiple YouTube accounts

## Setup

### 1. Install Dependencies

```bash
cd youtube-clipper
npm install
```

### 2. Setup Google Cloud Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project
3. Enable **YouTube Data API v3**
4. Create **OAuth 2.0 Client ID**:
   - Application type: Desktop app
   - Download credentials
5. Create **API Key** (for reading videos)

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` file:

```
YOUTUBE_CLIENT_ID=your-client-id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your-client-secret
YOUTUBE_API_KEY=your-api-key
TARGET_CHANNEL_ID=UC_hK3f1xT5-7jP5F5Qj6O5g
```

### 4. Add YouTube Accounts

```bash
# Add first account
node src/auth.js Account1

# Add second account
node src/auth.js Account2

# List accounts
node src/auth.js --list
```

Follow the prompts:
1. Open the URL in browser
2. Grant permissions
3. Copy the code from redirect URL
4. Paste it in terminal

## Usage

### Start Monitoring (Auto)

```bash
npm start
# or
node src/index.js
```

This will:
- Check for new videos every 5 minutes
- Download new videos
- Generate 3 random clips
- Upload to all configured accounts

### One-Time Check

```bash
node src/index.js --check
```

### List Accounts

```bash
node src/index.js --list
```

## Configuration

Edit `src/config.js`:

```javascript
clip: {
  count: 3,           // Number of clips per video
  minDuration: 30,   // Minimum clip duration (seconds)
  maxDuration: 50,   // Maximum clip duration (seconds)
},

upload: {
  privacy: 'private',  // 'private', 'public', or 'unlisted'
  tags: ['clip', 'highlights'],
  titlePrefix: '[CLIP] ',
},

monitor: {
  intervalMinutes: 5,  // Check interval
},
```

## Project Structure

```
youtube-clipper/
├── src/
│   ├── index.js          # Main entry point
│   ├── auth.js          # OAuth authentication
│   ├── config.js        # Configuration
│   ├── youtube/
│   │   ├── api.js      # YouTube API functions
│   │   ├── monitor.js  # Channel monitor
│   │   └── uploader.js # Video uploader
│   ├── clipper/
│   │   └── generator.js # Clip generator
│   ├── downloader/
│   │   └── video.js   # Video downloader
│   └── accounts/
│       └── manager.js  # Account manager
├── credentials/
│   └── accounts.json   # Stored OAuth tokens
├── clips/              # Generated clips
└── .env              # Environment variables
```

## Next Steps (V2)

- [ ] Audio analysis untuk deteksi "bagian menarik"
- [ ] Live chat analysis
- [ ] Custom clip selection
- [ ] Scheduling
- [ ] Statistics dashboard

## License

MIT