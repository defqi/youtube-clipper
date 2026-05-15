/**
 * YouTube Clipper Automation - Main Entry Point
 * Prototype V1: Monitor channel → Generate random clips → Upload to multiple accounts
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
 * Process a new video: download → clip → upload
 * @param {Object} video - Video details
 */
async function processVideo(video) {
  console.log(`\n========================================`);
  console.log(`Processing: ${video.title}`);
  console.log(`========================================`);
  
  const videoId = video.id;
  const videoTitle = video.title;
  const videoDuration = parseDuration(video.duration);
  
  console.log(`Video duration: ${videoDuration}s`);
  
  // Step 1: Download video
  console.log(`\n[1/4] Downloading video...`);
  let downloadedPath;
  
  try {
    const downloadResult = await downloadVideo(videoId);
    downloadedPath = downloadResult.path;
  } catch (error) {
    console.error('Download failed:', error.message);
    // Cleanup on error
    if (clips.length > 0) {
      for (const clip of clips) {
        cleanupFile(clip.path);
      }
    }
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
    // Cleanup partial clips if any
    if (clips.length > 0) {
      for (const clip of clips) {
        cleanupFile(clip.path);
      }
    }
    return;
  }
  
  // Step 3: Get accounts
  console.log(`\n[3/4] Preparing accounts...`);
  const accounts = getAccountCredentials();
  
  if (accounts.length === 0) {
    console.error('No accounts configured! Run auth.js first.');
    cleanupFile(downloadedPath);
    return;
  }
  
  console.log(`Found ${accounts.length} account(s) for upload`);
  
  // Step 4: Upload clips
  console.log(`\n[4/4] Uploading clips...`);
  
  for (const clip of clips) {
    console.log(`\n--- Uploading clip ${clip.index} ---`);
    
    // SEO-optimized title and description (Indonesian - target market)
    const seoTitle = generateViralTitle(videoTitle, clip.index, { language: 'id' });
    const seoDescription = generateDescription(videoTitle, videoId, { language: 'id' });
    
    const metadata = {
      title: seoTitle,
      description: seoDescription,
      tags: config.upload.tags,
      privacy: config.upload.privacy,
    };
    
    try {
      const results = await uploadToMultipleAccounts(
        clip.path,
        accounts,
        metadata
      );
      
      // Print results
      results.forEach(result => {
        if (result.success) {
          console.log(`✓ ${result.account}: ${result.url}`);
        } else {
          console.log(`✗ ${result.account}: ${result.error}`);
        }
      });
    } catch (error) {
      console.error(`Upload failed for clip ${clip.index}:`, error.message);
    }
  }
  
  // Cleanup
  console.log(`\nCleaning up...`);
  cleanupFile(downloadedPath);
  
  // Cleanup clips after upload
  console.log(`\nCleaning up clips...`);
  for (const clip of clips) {
    cleanupFile(clip.path);
  }
  
  console.log(`\n========================================`);
  console.log(`Processing complete!`);
  // Auto-commit to GitHub
  console.log(`\nAuto-committing to GitHub...`);
  await autoCommit(`New clip uploaded: ${videoTitle}`);
  console.log(`========================================`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--check')) {
    // One-time check
    console.log('Running one-time check for new videos...');
    const newVideo = await manualCheck();
    
    if (newVideo) {
      await processVideo(newVideo);
    }
    process.exit(0);
  }
  
  if (args.includes('--list-channels')) {
    // List channels
    const { listChannels } = require('./youtube/monitor');
    listChannels();
    process.exit(0);
  }
  
  // Test with specific video ID: node src/index.js --test VIDEO_ID
  if (args.includes('--test') && args[1]) {
    const videoId = args[1];
    console.log(`Testing with video ID: ${videoId}`);
    
    const { getVideoDetailsForProcessing } = require('./downloader/video');
    const video = await getVideoDetailsForProcessing(videoId);
    await processVideo(video);
    process.exit(0);
  }
  
  if (args.includes('--list')) {
    // List accounts
    listAccounts();
    process.exit(0);
  }
  
  if (args.includes('--cleanup')) {
    // Manual cleanup
    const hours = parseInt(args[1]) || 24;
    console.log(`Cleaning up clips older than ${hours} hours...`);
    cleanupOldClips(hours);
    process.exit(0);
  }
  
  // Start monitoring
  console.log('YouTube Clipper Automation - Starting...\n');
  
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
  
  // Start monitor
  await startMonitor(async (video, channelId) => {
    console.log(`Processing video from channel: ${channelId}`);
    await processVideo(video);
  });
  
  console.log('\nMonitoring started. Press Ctrl+C to stop.');
}

// Run
main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
