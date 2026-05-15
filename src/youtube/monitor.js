/**
 * Channel Monitor
 * Monitors YouTube channels for new videos (supports multiple channels)
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');
const { getLatestVideos, getVideoDetails, parseDuration } = require('./api');

/**
 * Get state file path for a channel
 * @param {string} channelId 
 */
function getStateFilePath(channelId) {
  const channelShortId = channelId.replace(/[^a-zA-Z0-9]/g, '_');
  return path.join(config.projectRoot, `.lastVideo_${channelShortId}.json`);
}

/**
 * Load last processed video from state file for a channel
 * @param {string} channelId 
 */
function loadLastVideo(channelId) {
  const stateFile = getStateFilePath(channelId);
  
  if (!fs.existsSync(stateFile)) {
    return null;
  }
  
  const data = fs.readFileSync(stateFile, 'utf8');
  return JSON.parse(data);
}

/**
 * Save last processed video to state file for a channel
 * @param {string} channelId 
 * @param {Object} video - Video info
 */
function saveLastVideo(channelId, video) {
  const stateFile = getStateFilePath(channelId);
  fs.writeFileSync(stateFile, JSON.stringify(video, null, 2));
}

/**
 * Check for new videos on a specific channel
 * @param {string} channelId - Channel ID to monitor
 */
async function checkForNewVideos(channelId) {
  console.log(`Checking for new videos on channel: ${channelId}...`);
  
  const latestVideos = await getLatestVideos(channelId, 1);
  
  if (!latestVideos || latestVideos.length === 0) {
    console.log('No videos found');
    return null;
  }
  
  const latestVideo = latestVideos[0];
  const lastVideo = loadLastVideo(channelId);
  
  // Check if this is a new video
  if (!lastVideo || latestVideo.id !== lastVideo.id) {
    console.log(`New video found: ${latestVideo.title}`);
    console.log(`Video ID: ${latestVideo.id}`);
    
    // Get full video details
    const details = await getVideoDetails(latestVideo.id);
    
    // Save as last processed
    saveLastVideo(channelId, {
      id: details.id,
      title: details.title,
      channelId: channelId,
      processedAt: new Date().toISOString(),
    });
    
    return details;
  }
  
  console.log('No new videos');
  return null;
}

/**
 * Check all channels for new videos
 * @param {Function} onNewVideo - Callback when new video found
 * @returns {Object|null} First new video found
 */
async function checkAllChannels(onNewVideo) {
  const channels = config.youtube.targetChannels;
  let foundVideo = null;
  
  console.log(`\n=== Checking ${channels.length} channel(s) ===`);
  
  for (const channelId of channels) {
    try {
      const newVideo = await checkForNewVideos(channelId);
      
      if (newVideo && !foundVideo) {
        console.log(`\n>>> New video from channel ${channelId}`);
        await onNewVideo(newVideo, channelId);
        foundVideo = newVideo;
      }
    } catch (error) {
      console.error(`Error checking channel ${channelId}:`, error.message);
    }
  }
  
  return foundVideo;
}

/**
 * Start monitoring loop for all channels
 * @param {Function} onNewVideo - Callback when new video found
 * @param {number} intervalMinutes - Check interval in minutes
 */
async function startMonitor(onNewVideo, intervalMinutes = null) {
  intervalMinutes = intervalMinutes || config.monitor.intervalMinutes;
  const channels = config.youtube.targetChannels;
  
  console.log(`Starting monitor for ${channels.length} channel(s):`);
  channels.forEach((ch, i) => console.log(`  ${i + 1}. ${ch}`));
  console.log(`Check interval: ${intervalMinutes} minutes`);
  
  // Initial check
  await checkAllChannels(onNewVideo);
  
  // Set up interval
  setInterval(async () => {
    try {
      await checkAllChannels(onNewVideo);
    } catch (error) {
      console.error('Monitor error:', error.message);
    }
  }, intervalMinutes * 60 * 1000);
}

/**
 * Manual check (one-time) for all channels
 * @returns {Object|null} First new video found or null
 */
async function manualCheck() {
  const channels = config.youtube.targetChannels;
  let foundVideo = null;
  
  for (const channelId of channels) {
    const newVideo = await checkForNewVideos(channelId);
    
    if (newVideo && !foundVideo) {
      console.log('\n--- New Video Details ---');
      console.log(`Title: ${newVideo.title}`);
      console.log(`ID: ${newVideo.id}`);
      console.log(`Duration: ${newVideo.duration}`);
      console.log(`Published: ${newVideo.publishedAt}`);
      console.log(`Channel: ${channelId}`);
      foundVideo = newVideo;
    }
  }
  
  if (!foundVideo) {
    console.log('No new videos on any channel');
  }
  
  return foundVideo;
}

/**
 * List all configured channels
 */
function listChannels() {
  const channels = config.youtube.targetChannels;
  console.log('\n=== Configured Channels ===');
  channels.forEach((ch, i) => {
    const lastVideo = loadLastVideo(ch);
    console.log(`${i + 1}. ${ch}`);
    if (lastVideo) {
      console.log(`   Last processed: ${lastVideo.title}`);
    }
  });
}

module.exports = {
  loadLastVideo,
  saveLastVideo,
  checkForNewVideos,
  checkAllChannels,
  startMonitor,
  manualCheck,
  listChannels,
};