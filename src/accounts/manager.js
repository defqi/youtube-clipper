/**
 * Account Manager
 * Manages multiple YouTube accounts for uploading
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const config = require('../config');

const ACCOUNTS_FILE = path.join(config.credentialsDir, 'accounts.json');

/**
 * Load accounts from file
 */
function loadAccounts() {
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    return [];
  }
  
  const data = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
  return JSON.parse(data);
}

/**
 * Save accounts to file
 * @param {Array} accounts - Array of accounts
 */
function saveAccounts(accounts) {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
  console.log(`Saved ${accounts.length} accounts`);
}

/**
 * Get all accounts
 */
function getAccounts() {
  return loadAccounts();
}

/**
 * Add new account
 * @param {string} name - Account name
 * @param {Object} credentials - OAuth credentials
 */
function addAccount(name, credentials) {
  const accounts = loadAccounts();
  
  accounts.push({
    name: name,
    credentials: credentials,
    addedAt: new Date().toISOString(),
  });
  
  saveAccounts(accounts);
  return accounts;
}

/**
 * Remove account by name
 * @param {string} name - Account name
 */
function removeAccount(name) {
  const accounts = loadAccounts();
  const filtered = accounts.filter(a => a.name !== name);
  saveAccounts(filtered);
  return filtered;
}

/**
 * Generate OAuth URL for account authorization
 * @param {string} accountName - Name for the account
 */
function getOAuthUrl(accountName) {
  const oauth2Client = new google.auth.OAuth2(
    config.youtube.clientId,
    config.youtube.clientSecret,
    'http://localhost:3000/oauth2callback'
  );
  
  const scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
  ];
  
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: accountName,
    prompt: 'consent',
  });
  
  return url;
}

/**
 * Get credentials from auth code
 * @param {string} code - Authorization code
 */
async function getCredentialsFromCode(code) {
  const oauth2Client = new google.auth.OAuth2(
    config.youtube.clientId,
    config.youtube.clientSecret,
    'http://localhost:3000/oauth2callback'
  );
  
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * List all accounts
 */
function listAccounts() {
  const accounts = loadAccounts();
  console.log(`\nRegistered accounts (${accounts.length}):`);
  
  accounts.forEach((account, index) => {
    console.log(`  ${index + 1}. ${account.name} (added: ${account.addedAt})`);
  });
  
  return accounts;
}

/**
 * Get account credentials for upload
 */
function getAccountCredentials() {
  const accounts = loadAccounts();
  return accounts.map(a => ({
    name: a.name,
    credentials: a.credentials,
  }));
}

module.exports = {
  getAccounts,
  addAccount,
  removeAccount,
  getOAuthUrl,
  getCredentialsFromCode,
  listAccounts,
  getAccountCredentials,
};