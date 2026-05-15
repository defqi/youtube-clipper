/**
 * YouTube Data API v3 Functions
 */

const { google } = require('googleapis');
const config = require('../config');

/**
 * Create YouTube API client
 */
function getYoutubeClient() {
  const auth = new google.auth.OAuth2(
    config.youtube.clientId,
    config.youtube.clientSecret,
    'http://localhost:3000/oauth2callback'
  );
  
  return google.youtube({ version: 'v3', auth });
}

/**
 * Get latest videos from a channel
 * @param {string} channelId - YouTube channel ID
 * @param {number} maxResults - Number of videos to fetch
 */
async function getLatestVideos(channelId, maxResults = 5) {
  if (!config.youtube.apiKey) {
    throw new Error('YOUTUBE_API_KEY is required in config');
  }
  
  const youtube = google.youtube({
    version: 'v3',
    auth: config.youtube.apiKey,
  });
  
  const response = await youtube.search.list({
    part: 'snippet',
    channelId: channelId,
    order: 'date',
    type: 'video',
    maxResults: maxResults,
  });
  
  return response.data.items.map(item => ({
    id: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    publishedAt: item.snippet.publishedAt,
    thumbnail: item.snippet.thumbnails?.medium?.url,
  }));
}

/**
 * Get video details
 * @param {string} videoId - YouTube video ID
 */
async function getVideoDetails(videoId) {
  if (!config.youtube.apiKey) {
    throw new Error('YOUTUBE_API_KEY is required in config');
  }
  
  const youtube = google.youtube({
    version: 'v3',
    auth: config.youtube.apiKey,
  });
  
  const response = await youtube.videos.list({
    part: 'snippet,contentDetails,statistics',
    id: videoId,
  });
  
  if (!response.data.items || response.data.items.length === 0) {
    throw new Error(`Video not found: ${videoId}`);
  }
  
  const item = response.data.items[0];
  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    duration: item.contentDetails.duration, // ISO 8601 format
    publishedAt: item.snippet.publishedAt,
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    tags: item.snippet.tags,
    viewCount: item.statistics?.viewCount,
    likeCount: item.statistics?.likeCount,
  };
}

/**
 * Parse ISO 8601 duration to seconds
 * @param {string|number} duration - ISO 8601 duration (e.g., PT1H30M45S) or seconds as number
 */
function parseDuration(duration) {
  // If already a number, return it
  if (typeof duration === 'number') return duration;
  
  // If not a string, try to convert
  if (typeof duration !== 'string') return 0;
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  
  return hours * 3600 + minutes * 60 + seconds;
}

module.exports = {
  getYoutubeClient,
  getLatestVideos,
  getVideoDetails,
  parseDuration,
};