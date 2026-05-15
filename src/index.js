/**
 * YouTube Clipper Automation - Main Entry Point
 * With Queue System: Monitor → Download → Clip → Queue → Scheduled Upload
 */

require('dotenv').config();
const config = require('./config');
const { getLatestVideos, parseDuration } = require('./youtube/api');
const { downloadVideo, getVideoInfo } = require('./downloader/video');
const { generateRandomClips, cleanupFile } = require('./clipper/generator');
const { uploadToMultipleAccounts } = require('./youtube/uploader');
const { getAccountCredentials, listAccounts } = require('./accounts/manager');
const { startMonitor, manualCheck } = require('./youtube/monitor');
const { generateViralTitle, generateABTitles } = require('./seo/title');
const { generateDescription, generateABDescriptions } = require('./seo/description');
const { autoCommit } = require('./autoCommit');
const { initScheduler, addClipToQueue, startSchedulerDaemon, getQueueStatus } = require('./scheduler/uploadScheduler');
const db = require('./database/db');

// Channel name mapping (for database)
const CHANNEL_NAMES = {
  'UCoIiiHof6BJ85PLuLkuxuhw': 'Windah Basudara',
  'UCrEj4d2ynysNsYttTYROXEg': 'Luthfi Halimawan',
  'UC0KlWYEQIlR2KHS_dHfKJhA': 'DEANKT',
  'UCzjGSL8HMCRUi1sWH5VYGjQ': 'Brando Chill & Games',
  'UCwRHhTBcrBYhWoWQiuNDAOA': 'Top Global Miya',
};

/**
 * Clean up old clips (older than X hours)
 * @param {number} maxAgeHours - Max age in hours
 */
function cleanupOldClips(maxAgeHours = 24) {
  const fs = require('fs');
  const path = require('path');
  const clipsDir = config.clipsDir;
  
  if (!fs.existsSync(clipsDir)) return;
  
  const now = Date.now();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  let deletedCount = 0;

  const files = fs.readdirSync(clipsDir);
  for (const file of files) {
    const filePath = path.join(clipsDir, file);
    const stats = fs.statSync(filePath);
    const age = now - stats.mtimeMs;
    
    if (age > maxAgeMs) {
      fs.unlinkSync(filePath);
      console.log(`Deleted old clip: ${file}`);
      deletedCount++;
    }
  }
  
  if (deletedCount > 0) {
    console.log(`Cleaned up ${deletedCount} old clip(s)`);
  }
}

/**
 * Process a new video: download → clip → queue (not immediate upload)
 * @param {Object} video - Video details
 * @param {string} channelId - Channel ID
 */
async function processVideo(video, channelId) {
  console.log(`\n========================================`);
  console.log(`Processing: ${video.title}`);
  console.log(`========================================`);
  
  const videoId = video.id;
  const videoTitle = video.title;
  const videoDuration = parseDuration(video.duration);
  const channelName = CHANNEL_NAMES[channelId] || channelId;
  
  console.log(`Video duration: ${videoDuration}s`);
  console.log(`Creator: ${channelName}`);
  
  // Step 1: Download video
  console.log(`\n[1/4] Downloading video...`);
  let downloadedPath;
  
  try {
    const downloadResult = await downloadVideo(videoId);
    downloadedPath = downloadResult.path;
  } catch (error) {
    console.error('Download failed:', error.message);
    return;
  }
  
  // Step 2: Generate clips
  console.log(`\n[2/4] Generating clips...`);
  let clips = [];
  
  try {
    clips = await generateRandomClips(
      downloadedPath,
      videoId,
      videoTitle,
      videoDuration
    );
    console.log(`Generated ${clips.length} clips`);
  } catch (error) {
    console.error('Clip generation failed:', error.message);
    cleanupFile(downloadedPath);
    return;
  }
  
  // Step 3: Add clips to queue (instead of immediate upload)
  console.log(`\n[3/4] Adding clips to queue...`);
  
  for (const clip of clips) {
    console.log(`\n--- Adding clip ${clip.index} to queue ---`);
    
    // Add to database queue
    addClipToQueue(
      videoId,
      videoTitle,
      channelId,
      channelName,
      clip.path,
      clip.duration
    );
    
    console.log(`✓ Added to queue: ${videoTitle}`);
  }
  
  // Cleanup video file (keep clips for scheduled upload)
  console.log(`\nCleaning up...`);
  cleanupFile(downloadedPath);
  
  // Keep clips - they will be uploaded later
  console.log(`Clips saved for scheduled upload at 23:00`);
  
  console.log(`\n========================================`);
  console.log(`Processing complete! Clips in queue.`);
  console.log(`========================================`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Initialize database and scheduler
  db.initDatabase();
  await initScheduler();
  
  if (args.includes('--check')) {
    console.log('Running one-time check for new videos...');
    const newVideo = await manualCheck();
    
    if (newVideo) {
      // Get channel ID from video
      const channelId = newVideo.channelId || 'UCoIiiHof6BJ85PLuLkuxuhw';
      await processVideo(newVideo, channelId);
    }
    process.exit(0);
  }
  
  if (args.includes('--list-channels')) {
    const { listChannels } = require('./youtube/monitor');
    listChannels();
    process.exit(0);
  }
  
  if (args.includes('--test') && args[1]) {
    const videoId = args[1];
    console.log(`Testing with video ID: ${videoId}`);
    
    const { getVideoDetailsForProcessing } = require('./downloader/video');
    const video = await getVideoDetailsForProcessing(videoId);
    const channelId = 'UCoIiiHof6BJ85PLuLkuxuhw';
    await processVideo(video, channelId);
    process.exit(0);
  }
  
  if (args.includes('--list')) {
    listAccounts();
    process.exit(0);
  }
  
  if (args.includes('--cleanup')) {
    const hours = parseInt(args[1]) || 24;
    console.log(`Cleaning up clips older than ${hours} hours...`);
    cleanupOldClips(hours);
    process.exit(0);
  }
  
  if (args.includes('--status')) {
    const status = getQueueStatus();
    console.log('\n=== Queue Status ===');
    console.log(JSON.stringify(status, null, 2));
    process.exit(0);
  }
  
  if (args.includes('--upload')) {
    const { runScheduledUpload } = require('./scheduler/uploadScheduler');
    await runScheduledUpload();
    process.exit(0);
  }
  
  // Start monitoring
  console.log('YouTube Clipper Automation - Starting...\n');
  console.log('Mode: Queue System (clips will be uploaded at 23:00)');
  
  // Cleanup old clips on startup
  cleanupOldClips(24);
  
  // Check accounts first
  const accounts = getAccountCredentials();
  
  if (accounts.length === 0) {
    console.log('⚠ No accounts configured!');
    console.log('Run: node src/auth.js <account-name>');
    console.log('');
  } else {
    console.log(`✓ ${accounts.length} account(s) configured`);
  }
  
  // Start scheduler daemon
  startSchedulerDaemon();
  
  // Start monitor
  await startMonitor(async (video, channelId) => {
    console.log(`Processing video from channel: ${channelId}`);
    await processVideo(video, channelId);
  });
  
  console.log('\nMonitoring started. Press Ctrl+C to stop.');
}

// Run
main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});