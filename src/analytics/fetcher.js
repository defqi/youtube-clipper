/**
 * YouTube Analytics Fetcher
 * Fetches stats from YouTube Data API and updates database
 */

const { google } = require('googleapis');
const config = require('../config');
const db = require('../database/db');

const youtube = google.youtube({
  version: 'v3',
  auth: config.youtube.apiKey,
});

/**
 * Fetch stats for a single short
 * @param {string} videoIdShorts - YouTube video ID
 * @returns {Promise<Object>} Stats object
 */
async function fetchShortStats(videoIdShorts) {
  try {
    const response = await youtube.videos.list({
      part: 'statistics,snippet',
      id: videoIdShorts,
    });
    
    if (!response.data.items || response.data.items.length === 0) {
      return null;
    }
    
    const item = response.data.items[0];
    return {
      videoId: item.id,
      views: parseInt(item.statistics.viewCount) || 0,
      likes: parseInt(item.statistics.likeCount) || 0,
      comments: parseInt(item.statistics.commentCount) || 0,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
    };
  } catch (error) {
    console.error('Error fetching stats for', videoIdShorts, ':', error.message);
    return null;
  }
}

/**
 * Fetch and update stats for all uploaded shorts
 * @returns {Promise<number>} Number of updated shorts
 */
async function updateAllShortsStats() {
  console.log('Fetching stats for all uploaded shorts...');
  
  const shorts = db.getUploadedShorts(100);
  let updatedCount = 0;
  
  for (const short of shorts) {
    const stats = await fetchShortStats(short.video_id_shorts);
    
    if (stats) {
      db.updateShortStats(
        short.video_id_shorts,
        stats.views,
        stats.likes,
        stats.comments
      );
      updatedCount++;
      console.log(`Updated: ${short.video_id_shorts} - Views: ${stats.views}, Likes: ${stats.likes}`);
    }
    
    // Rate limiting - wait between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`Updated stats for ${updatedCount} shorts`);
  return updatedCount;
}

/**
 * Fetch stats for specific shorts
 * @param {Array} videoIds - Array of YouTube video IDs
 * @returns {Promise<Array>} Array of stats
 */
async function fetchMultipleShortsStats(videoIds) {
  const stats = [];
  
  for (const videoId of videoIds) {
    const stat = await fetchShortStats(videoId);
    if (stat) {
      stats.push(stat);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return stats;
}

/**
 * Get top performing shorts
 * @param {number} limit - Number of shorts to return
 * @returns {Promise<Array>} Top shorts
 */
async function getTopShorts(limit = 10) {
  const shorts = db.getUploadedShorts(100);
  
  // Sort by views
  shorts.sort((a, b) => b.views - a.views);
  
  return shorts.slice(0, limit);
}

/**
 * Get creator performance summary
 * @returns {Array} Creator stats
 */
function getCreatorPerformance() {
  return db.getCreatorStats();
}

/**
 * Analyze and update creator rankings
 * Based on average views of their shorts
 */
async function analyzeCreatorPerformance() {
  console.log('Analyzing creator performance...');
  
  const creatorStats = db.getCreatorStats();
  
  for (const creator of creatorStats) {
    const channelId = getChannelIdByName(creator.creator_name);
    
    if (channelId) {
      db.updateCreatorStats(
        channelId,
        creator.total_views || 0,
        creator.total_shorts || 0
      );
    }
  }
  
  // Update ranking scores
  db.updateCreatorRanking();
  
  console.log('Creator rankings updated');
  return creatorStats;
}

/**
 * Get channel ID by creator name (helper)
 */
function getChannelIdByName(name) {
  const creators = db.getCreators();
  const creator = creators.find(c => c.name.toLowerCase() === name.toLowerCase());
  return creator ? creator.channel_id : null;
}

/**
 * Get recommended upload time based on past performance
 * Analyzes when shorts get most views
 */
async function getRecommendedUploadTime() {
  const shorts = db.getUploadedShorts(100);
  
  // Group by upload hour
  const hourStats = {};
  
  for (const short of shorts) {
    const hour = new Date(short.upload_date).getHours();
    
    if (!hourStats[hour]) {
      hourStats[hour] = { totalViews: 0, count: 0 };
    }
    
    hourStats[hour].totalViews += short.views;
    hourStats[hour].count++;
  }
  
  // Calculate average views per hour
  let bestHour = 23;
  let bestAvg = 0;
  
  for (const [hour, stats] of Object.entries(hourStats)) {
    const avg = stats.totalViews / stats.count;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestHour = parseInt(hour);
    }
  }
  
  return {
    recommendedHour: bestHour,
    averageViews: bestAvg,
    hourlyStats: hourStats,
  };
}

module.exports = {
  fetchShortStats,
  updateAllShortsStats,
  fetchMultipleShortsStats,
  getTopShorts,
  getCreatorPerformance,
  analyzeCreatorPerformance,
  getRecommendedUploadTime,
};