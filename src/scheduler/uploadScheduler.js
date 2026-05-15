/**
 * Batch Upload Scheduler
 * Manages scheduled uploads based on quota and priority
 */

const db = require('../database/db');
const ranking = require('../analytics/ranking');
const analytics = require('../analytics/fetcher');
const { uploadToMultipleAccounts } = require('../youtube/uploader');
const { getAccountCredentials } = require('../accounts/manager');
const { generateViralTitle, generateDescription } = require('../seo/title');
const { generateDescription: generateDesc } = require('../seo/description');
const config = require('../config');
const fs = require('fs');

/**
 * Initialize scheduler
 */
async function initScheduler() {
  db.initDatabase();
  
  // Update schedule based on analytics
  const recommended = await analytics.getRecommendedUploadTime();
  const scheduleTime = `${recommended.recommendedHour}:${String(recommended.recommendedMinute).padStart(2, '0')}`;
  
  db.updateSchedule(scheduleTime, 7);
  
  console.log('Scheduler initialized');
  console.log(`Recommended upload time: ${scheduleTime} WIB (${recommended.reason})`);
}

/**
 * Run scheduled upload
 * Called at scheduled time (e.g., 23:00)
 */
async function runScheduledUpload() {
  console.log('\n========== SCHEDULED UPLOAD STARTED ==========');
  
  // 1. Update stats from YouTube
  console.log('[1/5] Updating stats from YouTube...');
  await analytics.updateAllShortsStats();
  
  // 2. Analyze creator performance
  console.log('[2/5] Analyzing creator performance...');
  await analytics.analyzeCreatorPerformance();
  
  // 3. Get schedule info
  const schedule = db.getSchedule();
  const maxUploads = schedule?.max_uploads || 7;
  console.log(`[3/5] Max uploads today: ${maxUploads}`);
  
  // 4. Get top clips for upload
  console.log('[4/5] Selecting top clips...');
  const topClips = ranking.getTopClipsForUpload(maxUploads);
  
  if (topClips.length === 0) {
    console.log('No clips in queue to upload');
    return { uploaded: 0, message: 'No clips in queue' };
  }
  
  console.log(`Selected ${topClips.length} clips for upload`);
  
  // 5. Upload clips
  console.log('[5/5] Uploading clips...');
  const accounts = getAccountCredentials();
  let uploadedCount = 0;
  let failedCount = 0;
  
  for (const clip of topClips) {
    if (uploadedCount >= maxUploads) break;
    
    console.log(`\n--- Uploading clip ${uploadedCount + 1}: ${clip.video_title} ---`);
    
    // Check if file exists
    if (!fs.existsSync(clip.file_path)) {
      console.log(`File not found: ${clip.file_path}`);
      failedCount++;
      continue;
    }
    
    // Generate SEO title
    const seoTitle = generateViralTitle(clip.video_title, clip.id, { language: 'id' });
    const seoDescription = generateDesc(clip.video_title, clip.video_id, { language: 'id' });
    
    const metadata = {
      title: seoTitle,
      description: seoDescription,
      tags: config.upload.tags,
      privacy: config.upload.privacy,
    };
    
    try {
      const results = await uploadToMultipleAccounts(clip.file_path, accounts, metadata);
      
      for (const result of results) {
        if (result.success) {
          console.log(`✓ ${result.account}: ${result.url}`);
          
          // Update database
          db.addUploadedShort(
            result.videoId,
            clip.video_id,
            clip.video_title,
            clip.channel_id,
            clip.creator_name,
            clip.file_path
          );
          
          // Mark clip as uploaded
          db.markClipUploaded(clip.id, result.videoId);
          
          uploadedCount++;
        } else {
          console.log(`✗ ${result.account}: ${result.error}`);
          failedCount++;
        }
      }
    } catch (error) {
      console.error(`Upload error:`, error.message);
      failedCount++;
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Mark schedule run
  db.markScheduleRun();
  
  console.log('\n========== SCHEDULED UPLOAD COMPLETE ==========');
  console.log(`Uploaded: ${uploadedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Remaining in queue: ${db.getQueueCount()}`);
  
  return { uploaded: uploadedCount, failed: failedCount };
}

/**
 * Add clip to queue (called after clip generation)
 */
function addClipToQueue(videoId, videoTitle, channelId, creatorName, filePath, duration) {
  // Add to queue
  const result = db.addToQueue(videoId, videoTitle, channelId, creatorName, filePath, duration);
  const clipId = result.lastInsertRowid;
  
  // Calculate priority
  const clip = db.getClipById(clipId);
  const score = ranking.calculatePriorityScore(clip);
  db.updateClipPriority(clipId, score);
  
  console.log(`Clip added to queue: ${videoTitle} (priority: ${score.toFixed(1)})`);
  return clipId;
}

/**
 * Get queue status
 */
function getQueueStatus() {
  const queueCount = db.getQueueCount();
  const pendingClips = db.getPendingClips(10);
  const uploadedShorts = db.getUploadedShorts(10);
  const creatorStats = ranking.analyzeBestCreators();
  const quota = ranking.getUploadQuota();
  
  return {
    queueCount,
    pendingClips: pendingClips.length,
    uploadedShorts: uploadedShorts.length,
    creatorStats,
    quota,
  };
}

/**
 * Start scheduler daemon
 * Checks every minute if it's time to run
 * Uses recommended time from analytics (WIB)
 */
let schedulerInterval = null;
let lastUploadDate = null;

function startSchedulerDaemon() {
  if (schedulerInterval) {
    console.log('Scheduler daemon already running');
    return;
  }
  
  console.log('Starting scheduler daemon...');
  
  schedulerInterval = setInterval(async () => {
    // Get current time in WIB (UTC+7)
    const now = new Date();
    const wibHour = (now.getUTCHours() + 7) % 24;
    const wibMinute = now.getUTCMinutes();
    
    // Get recommended time from analytics
    const recommended = await analytics.getRecommendedUploadTime();
    const recHour = recommended.recommendedHour;
    const recMinute = recommended.recommendedMinute || 0;
    
    // Check if it's time (within 1 minute window)
    if (wibHour === recHour && wibMinute === recMinute) {
      // Prevent double upload on same day
      const today = now.toDateString();
      if (lastUploadDate === today) {
        console.log('Already uploaded today, skipping...');
        return;
      }
      
      console.log(`\nScheduled time reached: ${recHour}:${recMinute} WIB`);
      console.log(`Recommended by analytics: ${recommended.reason}`);
      lastUploadDate = today;
      
      await runScheduledUpload();
    }
  }, 60000); // Check every minute
}

/**
 * Stop scheduler daemon
 */
function stopSchedulerDaemon() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('Scheduler daemon stopped');
  }
}

/**
 * Manual trigger for testing
 */
async function manualUpload(limit = 7) {
  console.log(`Manual upload triggered (limit: ${limit})`);
  return await runScheduledUpload();
}

// CLI mode
if (require.main === module) {
  const args = process.argv.slice(2);
  
  initScheduler();
  
  if (args.includes('--status')) {
    const status = getQueueStatus();
    console.log('\n=== Queue Status ===');
    console.log(JSON.stringify(status, null, 2));
  } else if (args.includes('--upload')) {
    manualUpload(parseInt(args[1]) || 7);
  } else if (args.includes('--daemon')) {
    startSchedulerDaemon();
  } else {
    console.log('Usage:');
    console.log('  --status    Show queue status');
    console.log('  --upload   Run scheduled upload');
    console.log('  --daemon  Start scheduler daemon');
  }
  
  process.exit(0);
}

module.exports = {
  initScheduler,
  runScheduledUpload,
  addClipToQueue,
  getQueueStatus,
  startSchedulerDaemon,
  stopSchedulerDaemon,
  manualUpload,
};