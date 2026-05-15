/**
 * Clip Generator using FFmpeg
 * Generates random clips from video (with viral detection)
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { analyzeVideoForViralMoments, getBestViralSegments } = require('./viralDetector');

// Set ffmpeg path
ffmpeg.setFfmpegPath(config.ffmpeg.path);

/**
 * Generate clips from video (with viral detection)
 * @param {string} inputPath - Input video path
 * @param {string} videoId - YouTube video ID
 * @param {string} videoTitle - Original video title
 * @param {number} videoDuration - Total video duration in seconds
 * @param {number} clipCount - Number of clips to generate
 * @param {boolean} useViralDetection - Use viral detection (default: true)
 * @returns {Promise<Array>} Array of clip paths
 */
async function generateRandomClips(inputPath, videoId, videoTitle, videoDuration, clipCount = null, useViralDetection = true) {
  clipCount = clipCount || config.clip.count;

  const minDuration = config.clip.minDuration;
  const maxDuration = config.clip.maxDuration;

  console.log(`Generating ${clipCount} clips from video (duration: ${videoDuration}s)...`);
  
  const clips = [];
  let segments = [];

  if (useViralDetection) {
    // Use viral detection to find best moments
    console.log(`Using viral detection to find best moments...`);
    
    try {
      const viralMoments = await analyzeVideoForViralMoments(inputPath, videoId, videoDuration);
      segments = getBestViralSegments(viralMoments, minDuration, clipCount);
      
      console.log(`Found ${segments.length} viral moments`);
      for (const seg of segments.slice(0, 3)) {
        console.log(`  - ${seg.start}s-${seg.end}s (score: ${seg.viralScore?.toFixed(2) || 'N/A'})`);
      }
    } catch (error) {
      console.log('Viral detection failed, using random:', error.message);
      segments = generateUniqueSegments(videoDuration, clipCount, minDuration, maxDuration);
    }
  } else {
    // Fallback: random segments
    segments = generateUniqueSegments(videoDuration, clipCount, minDuration, maxDuration);
  }

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const outputFilename = `${videoId}_clip_${i + 1}.mp4`;
    const outputPath = path.join(config.clipsDir, outputFilename);
    
    const duration = segment.duration || Math.floor(Math.random() * (maxDuration - minDuration + 1)) + minDuration;
    const start = segment.start;
    
    console.log(`Creating clip ${i + 1}: ${start}s - ${start + duration}s (${duration}s)` + 
      (segment.viralScore ? ` [viral score: ${segment.viralScore.toFixed(2)}]` : ''));
    
    try {
      await createClip(inputPath, outputPath, start, duration);
      clips.push({
        path: outputPath,
        startTime: start,
        duration: duration,
        index: i + 1,
        viralScore: segment.viralScore || 0,
      });
    } catch (error) {
      console.error(`Error creating clip ${i + 1}:`, error.message);
    }
  }

  return clips;
}

/**
 * Generate unique random segments
 * @param {number} totalDuration - Total video duration
 * @param {number} count - Number of segments
 * @param {number} minDuration - Minimum clip duration
 * @param {number} maxDuration - Maximum clip duration
 */
function generateUniqueSegments(totalDuration, count, minDuration, maxDuration) {
  const segments = [];
  const maxAttempts = 100;

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let segment;

    do {
      // Random duration between min and max
      const duration = Math.floor(Math.random() * (maxDuration - minDuration + 1)) + minDuration;
      
      // Random start time (ensure it doesn't go past video end)
      const maxStart = totalDuration - duration;
      const start = maxStart > 0 ? Math.floor(Math.random() * maxStart) : 0;
      
      segment = {
        start: start,
        duration: duration,
        end: start + duration,
      };
      
      attempts++;
    } while (isOverlapping(segment, segments) && attempts < maxAttempts);
    
    if (!isOverlapping(segment, segments)) {
      segments.push(segment);
    }
  }

  return segments;
}

/**
 * Check if segment overlaps with existing segments
 */
function isOverlapping(newSegment, existingSegments) {
  for (const segment of existingSegments) {
    // Check for overlap (with 5 second buffer)
    if (newSegment.start < segment.end + 5 && newSegment.end > segment.start - 5) {
      return true;
    }
  }
  return false;
}

/**
 * Create a single clip in 9:16 format for YouTube Shorts
 * @param {string} inputPath - Input video path
 * @param {string} outputPath - Output clip path
 * @param {number} startTime - Start time in seconds
 * @param {number} duration - Duration in seconds
 */
function createClip(inputPath, outputPath, startTime, duration) {
  return new Promise((resolve, reject) => {
    // For 9:16 Shorts: 1080x1920
    // Scale and pad to maintain aspect ratio
    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .videoFilters([
        'scale=1080:1920:force_original_aspect_ratio=decrease',
        'pad=1080:1920:(ow-iw)/2:(oh-ih)/2'
      ])
      .output(outputPath)
      .on('end', () => {
        console.log(`Clip created: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error(`FFmpeg error:`, err.message);
        reject(err);
      })
      .run();
  });
}

/**
 * Clean up downloaded video file
 * @param {string} filePath - File path to delete
 */
function cleanupFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`Deleted: ${filePath}`);
  }
}

module.exports = {
  generateRandomClips,
  createClip,
  cleanupFile,
};