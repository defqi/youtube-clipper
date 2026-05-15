/**
 * Auto-commit to GitHub
 * Runs after successful upload to commit changes
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_DIR = path.join(__dirname, '..');

/**
 * Auto-commit changes to GitHub
 * @param {string} message - Commit message
 * @param {Array} files - Files to commit (optional, commits all if not specified)
 */
function autoCommit(message, files = null) {
  return new Promise((resolve, reject) => {
    const gitDir = path.join(PROJECT_DIR, '.git');
    
    // Check if git exists
    if (!fs.existsSync(gitDir)) {
      console.log('No git repository found');
      resolve(false);
      return;
    }
    
    let cmd = 'git add .';
    
    if (files && files.length > 0) {
      cmd = 'git add ' + files.join(' ');
    }
    
    // Add all changes
    exec(cmd, { cwd: PROJECT_DIR }, (addErr, addStdout, addStderr) => {
      if (addErr) {
        console.log('Git add error:', addErr.message);
        resolve(false);
        return;
      }
      
      // Commit
      const commitMsg = message || `Update: ${new Date().toISOString()}`;
      exec(`git commit -m "${commitMsg}"`, { cwd: PROJECT_DIR }, (commitErr, commitStdout, commitStderr) => {
        if (commitErr) {
          // No changes to commit
          if (commitErr.message.includes('nothing to commit')) {
            console.log('No changes to commit');
            resolve(false);
            return;
          }
          console.log('Git commit error:', commitErr.message);
          resolve(false);
          return;
        }
        
        console.log('Committed:', commitStdout.trim());
        
        // Push
        exec('git push origin main', { cwd: PROJECT_DIR }, (pushErr, pushStdout, pushStderr) => {
          if (pushErr) {
            console.log('Git push error:', pushErr.message);
            resolve(false);
            return;
          }
          
          console.log('Pushed to GitHub!');
          resolve(true);
        });
      });
    });
  });
}

/**
 * Check for changes
 */
function hasChanges() {
  return new Promise((resolve) => {
    exec('git status --porcelain', { cwd: PROJECT_DIR }, (err, stdout) => {
      if (err) {
        resolve(false);
        return;
      }
      resolve(stdout.trim().length > 0);
    });
  });
}

// CLI mode
if (require.main === module) {
  const args = process.argv.slice(2);
  const message = args.join(' ') || 'Auto update';
  
  autoCommit(message).then(success => {
    console.log(success ? 'Done!' : 'No changes');
    process.exit(success ? 0 : 1);
  });
}

module.exports = { autoCommit, hasChanges };