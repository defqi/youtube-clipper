/**
 * OAuth Authentication Script
 * Run this to add YouTube accounts
 * 
 * Usage: node src/auth.js <account-name>
 * 
 * Steps:
 * 1. Run: node src/auth.js MyAccount
 * 2. Open the displayed URL in browser
 * 3. Grant permissions
 * 4. Copy the code from redirect URL
 * 5. Paste the code here
 */

require('dotenv').config();
const readline = require('readline');
const config = require('./config');
const { getOAuthUrl, getCredentialsFromCode, addAccount, listAccounts } = require('./accounts/manager');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Prompt for input
 */
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

/**
 * Main auth flow
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--list')) {
    listAccounts();
    process.exit(0);
  }
  
  if (args.length === 0) {
    console.log('YouTube Account Authentication');
    console.log('========================');
    console.log('Usage: node src/auth.js <account-name>');
    console.log('');
    console.log('Examples:');
    console.log('  node src/auth.js Channel1');
    console.log('  node src/auth.js BackupChannel');
    console.log('');
    console.log('Options:');
    console.log('  --list    List all registered accounts');
    process.exit(0);
  }
  
  const accountName = args[0];
  
  console.log('YouTube Account Authentication');
  console.log('========================');
  console.log(`Account: ${accountName}`);
  console.log('');
  
  // Check if credentials exist
  if (!config.youtube.clientId || !config.youtube.clientSecret) {
    console.error('ERROR: Missing OAuth credentials!');
    console.error('');
    console.error('Please set in .env file:');
    console.error('  YOUTUBE_CLIENT_ID=your-client-id');
    console.error('  YOUTUBE_CLIENT_SECRET=your-client-secret');
    console.error('');
    console.error('Get credentials from:');
    console.error('  https://console.cloud.google.com/apis/credentials');
    process.exit(1);
  }
  
  // Generate OAuth URL
  console.log('Generating authorization URL...');
  const url = getOAuthUrl(accountName);
  
  console.log('');
  console.log('Open this URL in your browser:');
  console.log('');
  console.log(url);
  console.log('');
  
  // Wait for code
  const code = await prompt('Paste the authorization code here: ');
  
  if (!code || code.trim() === '') {
    console.error('No code provided!');
    process.exit(1);
  }
  
  console.log('\nExchanging code for tokens...');
  
  try {
    const credentials = await getCredentialsFromCode(code.trim());
    
    console.log('✓ Authentication successful!');
    console.log('');
    
    // Save account
    addAccount(accountName, credentials);
    
    console.log(`Account "${accountName}" has been added!`);
    console.log('');
    
  } catch (error) {
    console.error('Authentication failed:', error.message);
    process.exit(1);
  }
  
  rl.close();
}

main();