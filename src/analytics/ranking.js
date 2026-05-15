/**
 * Ranking Algorithm
 * Calculates priority scores for clips based on creator performance
 */

const db = require('../database/db');

/**
 * Calculate priority score for a clip
 * Based on creator's historical performance
 * 
 * Score factors:
 * - Creator avg_views (40%)
 * - Recency of video (20%)
 * - Video duration (10%)
 * - Random factor for variety (30%)
 * 
 * @param {Object} clip - Clip from queue
 * @returns {number} Priority score (0-100)
 */
function calculatePriorityScore(clip) {
  // Get creator stats
  const creatorStats = db.getStatsByCreator(clip.creator_name);
  
  let score = 0;
  
  // Factor 1: Creator average views (40%)
  const avgViews = creatorStats?.avg_views || 0;
  const viewScore = Math.min(avgViews / 100, 40); // Max 40 points
  score += viewScore;
  
  // Factor 2: Recency (20%)
  // Newer videos get higher score
  const clipAge = Date.now() - new Date(clip.created_at).getTime();
  const hoursOld = clipAge / (1000 * 60 * 60);
  const recencyScore = Math.max(0, 20 - (hoursOld / 24)); // Max 20 points, decreases over days
  score += recencyScore;
  
  // Factor 3: Duration (10%)
  // Shorts between 30-50s get bonus
  const duration = clip.duration || 30;
  const durationScore = (duration >= 30 && duration <= 50) ? 10 : 5;
  score += durationScore;
  
  // Factor 4: Random for variety (30%)
  const randomScore = Math.random() * 30;
  score += randomScore;
  
  return Math.min(100, score);
}

/**
 * Update priority scores for all pending clips
 */
function updateAllPriorityScores() {
  console.log('Updating priority scores for all clips...');
  
  const clips = db.getPendingClips(100);
  
  for (const clip of clips) {
    const score = calculatePriorityScore(clip);
    db.updateClipPriority(clip.id, score);
  }
  
  console.log(`Updated ${clips.length} clips`);
  return clips.length;
}

/**
 * Get top clips for upload
 * @param {number} limit - Number of clips to get
 * @returns {Array} Top clips
 */
function getTopClipsForUpload(limit = 7) {
  // Update all scores first
  updateAllPriorityScores();
  
  // Get top clips
  const clips = db.getPendingClips(limit);
  
  return clips;
}

/**
 * Get creator ranking table
 * @returns {Array} Creator rankings
 */
function getCreatorRankings() {
  const creators = db.getCreators();
  
  return creators.sort((a, b) => b.ranking_score - a.ranking_score);
}

/**
 * Get recommended creators (top 3)
 * @returns {Array} Top 3 creators
 */
function getTopCreators(limit = 3) {
  const rankings = getCreatorRankings();
  return rankings.slice(0, limit);
}

/**
 * Analyze which creator types perform best
 * @returns {Object} Analysis results
 */
function analyzeBestCreators() {
  const stats = db.getCreatorStats();
  
  // Sort by avg_views
  stats.sort((a, b) => b.avg_views - a.avg_views);
  
  const best = stats[0];
  const worst = stats[stats.length - 1];
  
  return {
    bestCreator: best?.creator_name || 'N/A',
    bestAvgViews: best?.avg_views || 0,
    worstCreator: worst?.creator_name || 'N/A',
    worstAvgViews: worst?.avg_views || 0,
    totalCreators: stats.length,
    allStats: stats,
  };
}

/**
 * Get upload quota info
 * @returns {Object} Quota info
 */
function getUploadQuota() {
  const schedule = db.getSchedule();
  const queueCount = db.getQueueCount();
  const pendingClips = db.getPendingClips(100);
  
  return {
    maxUploads: schedule?.max_uploads || 7,
    usedToday: 0, // Would track from schedule
    remaining: schedule?.max_uploads || 7,
    queueCount,
    pendingClips: pendingClips.length,
  };
}

module.exports = {
  calculatePriorityScore,
  updateAllPriorityScores,
  getTopClipsForUpload,
  getCreatorRankings,
  getTopCreators,
  analyzeBestCreators,
  getUploadQuota,
};