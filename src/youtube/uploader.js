/**
 * YouTube Video Uploader
 * Handles uploading videos to YouTube using OAuth
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * Create authenticated YouTube client for upload
 * @param {Object} credentials - OAuth credentials
 */
function getAuthenticatedClient(credentials) {
  const auth = new google.auth.OAuth2(
    config.youtube.clientId,
    config.youtube.clientSecret,
    'http://localhost:3000/oauth2callback'
  );
  
  auth.setCredentials(credentials);
  
  return google.youtube({ version: 'v3', auth });
}

/**
 * Upload video to YouTube
 * @param {string} videoPath - Path to video file
 * @param {Object} credentials - OAuth credentials
 * @param {Object} metadata - Video metadata
 */
async function uploadVideo(videoPath, credentials, metadata) {
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }
  
  const youtube = getAuthenticatedClient(credentials);
  
  const requestBody = {
    snippet: {
      title: metadata.title || 'Untitled',
      description: metadata.description || '',
      tags: metadata.tags || config.upload.tags,
      categoryId: '22', // People & Blogs
    },
    status: {
      privacyStatus: metadata.privacy || config.upload.privacy,
      selfDeclaredMadeForKids: false,
    },
  };
  
  const media = {
    body: fs.createReadStream(videoPath),
  };
  
  console.log(`Uploading: ${metadata.title}...`);
  
  const response = await youtube.videos.insert({
    part: 'snippet,status',
    requestBody: requestBody,
    media: media,
  });
  
  const videoData = response.data;
  console.log(`Uploaded! Video ID: ${videoData.id}`);
  console.log(`URL: https://youtube.com/watch?v=${videoData.id}`);
  
  return {
    id: videoData.id,
    url: `https://youtube.com/watch?v=${videoData.id}`,
    title: videoData.snippet.title,
  };
}

/**
 * Upload video to multiple accounts
 * @param {string} videoPath - Path to video file
 * @param {Array} accountsCredentials - Array of OAuth credentials
 * @param {Object} metadata - Video metadata
 */
async function uploadToMultipleAccounts(videoPath, accountsCredentials, metadata) {
  const results = [];
  
  for (let i = 0; i < accountsCredentials.length; i++) {
    const accountCreds = accountsCredentials[i];
    const accountName = accountCreds.name || `Account ${i + 1}`;
    
    console.log(`\nUploading to ${accountName}...`);
    
    try {
      const result = await uploadVideo(videoPath, accountCreds.credentials, {
        ...metadata,
        title: `${metadata.title} (${accountName})`,
      });
      
      results.push({
        account: accountName,
        success: true,
        ...result,
      });
    } catch (error) {
      console.error(`Upload failed for ${accountName}:`, error.message);
      results.push({
        account: accountName,
        success: false,
        error: error.message,
      });
    }
  }
  
  return results;
}

module.exports = {
  uploadVideo,
  uploadToMultipleAccounts,
  getAuthenticatedClient,
};