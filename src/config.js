/**
 * Configuration for YouTube Clipper Automation
 * Prototype V1 - Random segments, 2 accounts
 */

const path = require('path');
const fs = require('fs');

// Get absolute paths
const PROJECT_ROOT = path.join(__dirname, '..');
const CREDENTIALS_DIR = path.join(PROJECT_ROOT, 'credentials');
const CLIPS_DIR = path.join(PROJECT_ROOT, 'clips');

// Ensure directories exist
if (!fs.existsSync(CREDENTIALS_DIR)) fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
if (!fs.existsSync(CLIPS_DIR)) fs.mkdirSync(CLIPS_DIR, { recursive: true });

module.exports = {
  // Project paths
  projectRoot: PROJECT_ROOT,
  credentialsDir: CREDENTIALS_DIR,
  clipsDir: CLIPS_DIR,

  // YouTube API Configuration
  // Get from Google Cloud Console
  youtube: {
    // Channel IDs to monitor (multiple channels supported)
    // Can be array or comma-separated string from env
    targetChannels: (() => {
      const envChannels = process.env.TARGET_CHANNEL_IDS;
      if (envChannels) {
        return envChannels.split(',').map(c => c.trim()).filter(c => c);
      }
      // Default: Windah Basudar
      return ['UC_hK3f1xT5-7jP5F5Qj6O5g'];
    })(),
    
    // Google Cloud OAuth credentials
    // Get from https://console.cloud.google.com
    clientId: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    
    // API Key (for reading public data)
    apiKey: process.env.YOUTUBE_API_KEY,
  },

  // Clip Generation Settings
  clip: {
    // Number of clips to generate per video
    count: 3,
    
    // Duration range in seconds
    minDuration: 30,
    maxDuration: 50,
    
    // Output format
    format: 'mp4',
    quality: 'highest',
  },

  // Upload Settings
  upload: {
    // Default privacy: 'private', 'public', or 'unlisted'
    privacy: 'public',
    
    // Default tags
    tags: ['clip', 'highlights', 'entertainment'],
    
    // Title prefix
    titlePrefix: '[CLIP] ',
    
    // Description template
    description: `Clip highlights from {videoTitle}\n\nOriginal video: https://youtube.com/watch?v={videoId}\n\n#highlights #entertainment`,
  },

  // Monitor Settings
  monitor: {
    // Check interval in minutes
    intervalMinutes: 5,
    
    // State file to track last processed video (per channel)
    stateFile: path.join(PROJECT_ROOT, '.lastVideo.json'),
  },

  // FFmpeg path (using ffmpeg-static)
  ffmpeg: {
    path: require('ffmpeg-static'),
  },
};