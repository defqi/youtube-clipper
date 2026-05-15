/**
 * Video Downloader using yt-dlp
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const YT_DLP = process.env.YT_DLP || '/home/ubuntu/yt-dlp';
const FFMPEG = require('ffmpeg-static');

/**
 * Parse ISO 8601 duration to seconds
 * @param {string} isoDuration - ISO 8601 duration (e.g., PT1H30M45S)
 */
function parseDuration(isoDuration) {
  if (!isoDuration) return 0;
  if (typeof isoDuration === 'number') return isoDuration;
  
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Get video info without downloading
 * @param {string} videoId - YouTube video ID
 */
async function getVideoInfo(videoId) {
  return new Promise((resolve, reject) => {
    const args = [
      '--dump-json',
      `https://youtube.com/watch?v=${videoId}`
    ];
    
    let output = '';
    const proc = spawn(YT_DLP, args);
    
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp exited with code ${code}`));
        return;
      }
      
      try {
        const info = JSON.parse(output);
        resolve({
          id: videoId,
          title: info.title,
          duration: parseDuration(info.duration),
          description: info.description,
          author: info.uploader,
          uploadDate: info.upload_date,
        });
      } catch (e) {
        reject(e);
      }
    });
    
    proc.on('error', reject);
  });
}

/**
 * Get video details for processing
 * @param {string} videoId - YouTube video ID
 */
async function getVideoDetailsForProcessing(videoId) {
  return getVideoInfo(videoId);
}

/**
 * Download video from YouTube
 * @param {string} videoId - YouTube video ID
 * @param {string} outputPath - Output file path (optional)
 */
async function downloadVideo(videoId, outputPath) {
  if (!outputPath) {
    const filename = `${videoId}.mp4`;
    outputPath = path.join(config.clipsDir, filename);
  }
  
  console.log(`Downloading video: ${videoId}...`);
  
  return new Promise(async (resolve, reject) => {
    try {
      // Get info first
      const info = await getVideoInfo(videoId);
      console.log(`Video title: ${info.title}`);
      
      // Download with yt-dlp - use deno for JS runtime + cookies
      const args = [
        '--js-runtimes', `deno=${process.env.DENO_PATH || '/home/ubuntu/.deno/bin/deno'}`,
        '--cookies', path.join(__dirname, '../cookies.txt'),
        '-f', 'best',
        '-o', outputPath,
        `https://youtube.com/watch?v=${videoId}`
      ];
      
      const proc = spawn(YT_DLP, args, {
        env: { ...process.env, FFMPEG_PATH: FFMPEG }
      });
      
      proc.stdout.on('data', (data) => {
        process.stdout.write(data);
      });
      
      proc.stderr.on('data', (data) => {
        process.stderr.write(data);
      });
      
      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`yt-dlp exited with code ${code}`));
          return;
        }
        
        console.log(`Downloaded: ${outputPath}`);
        resolve({
          path: outputPath,
          title: info.title,
          duration: info.duration,
        });
      });
      
      proc.on('error', reject);
      
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  downloadVideo,
  getVideoInfo,
  getVideoDetailsForProcessing,
  parseDuration,
};