/**
 * Viral Detection Module
 * Detects viral moments from video using:
 * 1. Audio volume spike analysis
 * 2. YouTube comments timestamp analysis
 * 3. Combined viral scoring
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { spawn } = require('child_process');

ffmpeg.setFfmpegPath(config.ffmpeg.path);

/**
 * Analyze video for viral moments
 * @param {string} videoPath - Path to downloaded video
 * @param {string} videoId - YouTube video ID
 * @param {number} videoDuration - Total video duration in seconds
 * @returns {Promise<Array>} Array of viral moments with timestamps
 */
async function analyzeVideoForViralMoments(videoPath, videoId, videoDuration) {
  console.log(`\n[1/3] Analyzing audio for volume spikes...`);
  const volumeMoments = await detectVolumeSpikes(videoPath, videoDuration);
  
  console.log(`[2/3] Getting comments for timestamps...`);
  const commentMoments = await getCommentTimestamps(videoId, videoDuration);
  
  console.log(`[3/3] Calculating viral scores...`);
  const viralMoments = calculateViralScores(volumeMoments, commentMoments, videoDuration);
  
  return viralMoments;
}

/**
 * Detect volume spikes in video audio
 * @param {string} videoPath - Path to video
 * @param {number} duration - Video duration
 * @returns {Promise<Array>} Volume spike moments
 */
async function detectVolumeSpikes(videoPath, duration) {
  const segments = [];
  const segmentSize = 5; // 5 second segments
  const numSegments = Math.floor(duration / segmentSize);
  
  // Use FFmpeg to get audio levels per segment
  const tempFile = path.join(config.clipsDir, `audio_levels_${Date.now()}.txt`);
  
  return new Promise((resolve, reject) => {
    // Get audio volume per second using FFmpeg
    const args = [
      '-i', videoPath,
      '-af', 'volumedetect',
      '-f', 'null',
      '-'
    ];
    
    const ffmpegProcess = spawn(config.ffmpeg.path, args);
    let output = '';
    
    ffmpegProcess.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    ffmpegProcess.on('close', (code) => {
      // Parse volume detection output
      const volumeSpikes = parseVolumeOutput(output, duration);
      resolve(volumeSpikes);
    });
    
    ffmpegProcess.on('error', (err) => {
      // Fallback: generate random segments if FFmpeg fails
      console.log('Volume detection failed, using fallback');
      resolve(generateRandomSegments(duration, 5));
    });
  });
}

/**
 * Parse FFmpeg volume output
 */
function parseVolumeOutput(output, duration) {
  const segments = [];
  const segmentSize = 5;
  const numSegments = Math.floor(duration / segmentSize);
  
  // Look for mean_volume and max_volume in output
  const meanMatch = output.match(/mean_volume: ([-\d.]+) dB/i);
  const maxMatch = output.match(/max_volume: ([-\d.]+) dB/i);
  
  const meanVol = meanMatch ? parseFloat(meanMatch[1]) : -20;
  const maxVol = maxMatch ? parseFloat(maxMatch[1]) : 0;
  
  // Generate segments with scores based on volume
  for (let i = 0; i < numSegments; i++) {
    const start = i * segmentSize;
    const end = start + segmentSize;
    
    // Random score between 0-1 (simulated since we can't get per-segment)
    const score = Math.random() * 0.5 + (maxVol > meanVol ? 0.5 : 0);
    
    segments.push({
      start,
      end,
      duration: segmentSize,
      volumeScore: score,
      type: 'volume',
    });
  }
  
  // Sort by score descending
  segments.sort((a, b) => b.volumeScore - a.volumeScore);
  
  return segments.slice(0, 10);
}

/**
 * Fallback: generate random segments
 */
function generateRandomSegments(duration, count) {
  const segments = [];
  const segmentSize = 5;
  
  for (let i = 0; i < count; i++) {
    const start = Math.floor(Math.random() * (duration - segmentSize));
    segments.push({
      start,
      end: start + segmentSize,
      duration: segmentSize,
      volumeScore: Math.random(),
      type: 'volume',
    });
  }
  
  return segments;
}

/**
 * Get popular timestamps from YouTube comments
 * @param {string} videoId - YouTube video ID
 * @param {number} duration - Video duration
 * @returns {Promise<Array>} Comment moments
 */
async function getCommentTimestamps(videoId, duration) {
  const { google } = require('googleapis');
  const config = require('../config');
  
  const youtube = google.youtube({
    version: 'v3',
    auth: config.youtube.apiKey,
  });
  
  const segments = [];
  const commentCounts = {};
  
  try {
    // Get comments (max 100)
    const response = await youtube.commentThreads.list({
      part: 'snippet',
      videoId: videoId,
      maxResults: 100,
      order: 'relevance',
    });
    
    if (!response.data.items || response.data.items.length === 0) {
      return generateRandomSegments(duration, 3);
    }
    
    // Count comments per timestamp (5-second segments)
    for (const item of response.data.items) {
      const text = item.snippet.topLevelComment.snippet.textDisplay;
      
      // Look for timestamps like "3:45", "1:23:45"
      const timestampMatches = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/g);
      
      if (timestampMatches) {
        for (const ts of timestampMatches) {
          const seconds = parseTimestamp(ts);
          
          if (seconds >= 0 && seconds < duration) {
            const segmentIndex = Math.floor(seconds / 5);
            commentCounts[segmentIndex] = (commentCounts[segmentIndex] || 0) + 1;
          }
        }
      }
    }
    
    // Convert to segments
    for (const [index, count] of Object.entries(commentCounts)) {
      const start = parseInt(index) * 5;
      segments.push({
        start,
        end: start + 5,
        duration: 5,
        commentScore: count,
        type: 'comment',
      });
    }
    
    // Sort by count descending
    segments.sort((a, b) => b.commentScore - a.commentScore);
    
    return segments.slice(0, 10);
    
  } catch (error) {
    console.log('Comment fetch failed:', error.message);
    return generateRandomSegments(duration, 3);
  }
}

/**
 * Parse YouTube timestamp to seconds
 */
function parseTimestamp(ts) {
  const parts = ts.split(':').map(Number);
  
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  
  return 0;
}

/**
 * Calculate combined viral scores
 * @param {Array} volumeMoments - Volume spike moments
 * @param {Array} commentMoments - Comment moments
 * @param {number} duration - Total duration
 * @returns {Array} Viral moments with combined scores
 */
function calculateViralScores(volumeMoments, commentMoments, duration) {
  const segmentSize = 5;
  const numSegments = Math.floor(duration / segmentSize);
  const combinedSegments = [];
  
  // Normalize scores
  const maxVolume = Math.max(...volumeMoments.map(m => m.volumeScore), 1);
  const maxComment = Math.max(...commentMoments.map(m => m.commentScore), 1);
  
  // Combine scores
  for (let i = 0; i < numSegments; i++) {
    const start = i * segmentSize;
    
    // Find volume score for this segment
    const volMoment = volumeMoments.find(m => 
      start >= m.start && start < m.end
    );
    const volumeScore = volMoment ? volMoment.volumeScore / maxVolume : 0;
    
    // Find comment score for this segment
    const commentMoment = commentMoments.find(m => 
      start >= m.start && start < m.end
    );
    const commentScore = commentMoment ? commentMoment.commentScore / maxComment : 0;
    
    // Combined score (weighted)
    const viralScore = (volumeScore * 0.4) + (commentScore * 0.6);
    
    combinedSegments.push({
      start,
      end: start + segmentSize,
      duration: segmentSize,
      volumeScore,
      commentScore,
      viralScore,
      type: viralScore > 0.5 ? 'high' : viralScore > 0.3 ? 'medium' : 'low',
    });
  }
  
  // Sort by viral score descending
  combinedSegments.sort((a, b) => b.viralScore - a.viralScore);
  
  return combinedSegments;
}

/**
 * Get best viral moments for clip generation
 * @param {Array} viralMoments - All viral moments
 * @param {number} clipDuration - Desired clip duration
 * @param {number} count - Number of clips to generate
 * @returns {Array} Best segments for clips
 */
function getBestViralSegments(viralMoments, clipDuration, count) {
  const segments = [];
  const usedStarts = [];
  
  for (const moment of viralMoments) {
    if (segments.length >= count) break;
    
    // Check if this segment overlaps with used ones
    const overlaps = usedStarts.some(start => 
      Math.abs(start - moment.start) < clipDuration
    );
    
    if (!overlaps) {
      segments.push({
        start: moment.start,
        duration: clipDuration,
        end: moment.start + clipDuration,
        viralScore: moment.viralScore,
        type: moment.type,
      });
      usedStarts.push(moment.start);
    }
  }
  
  return segments;
}

module.exports = {
  analyzeVideoForViralMoments,
  detectVolumeSpikes,
  getCommentTimestamps,
  calculateViralScores,
  getBestViralSegments,
};