/**
 * SQLite Database for Clip Queue System
 * Tables: creators, clips_queue, uploaded_shorts
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

let db = null;

/**
 * Initialize database and create tables
 */
function initDatabase() {
  try {
    db = new Database(DB_PATH);
    console.log('Connected to SQLite database');
    
    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS creators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        subscriber_count INTEGER DEFAULT 0,
        total_views INTEGER DEFAULT 0,
        total_clips INTEGER DEFAULT 0,
        avg_views REAL DEFAULT 0,
        ranking_score REAL DEFAULT 0,
        last_analyzed DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS clips_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id TEXT NOT NULL,
        video_title TEXT,
        channel_id TEXT NOT NULL,
        creator_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        duration INTEGER,
        priority_score REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS uploaded_shorts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id_shorts TEXT UNIQUE NOT NULL,
        original_video_id TEXT NOT NULL,
        original_video_title TEXT,
        channel_id TEXT NOT NULL,
        creator_name TEXT NOT NULL,
        file_path TEXT,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        status TEXT DEFAULT 'uploaded',
        last_updated DATETIME
      )
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS upload_schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_time TEXT NOT NULL,
        max_uploads INTEGER DEFAULT 7,
        enabled INTEGER DEFAULT 1,
        last_run DATETIME
      )
    `);
    
    // Insert default schedule if not exists
    const existing = db.prepare('SELECT COUNT(*) as count FROM upload_schedule').get();
    if (existing.count === 0) {
      db.prepare('INSERT INTO upload_schedule (id, schedule_time, max_uploads, enabled) VALUES (?, ?, ?, ?)').run(1, '23:00', 7, 1);
    }
    
    console.log('Database tables created');
    return db;
  } catch (err) {
    console.error('Database error:', err.message);
    throw err;
  }
}

/**
 * Get database instance
 */
function getDb() {
  return db;
}

/**
 * Close database connection
 */
function closeDatabase() {
  if (db) {
    db.close();
    console.log('Database closed');
  }
}

// ==================== CREATORS ====================

/**
 * Add or update creator
 */
function upsertCreator(channelId, name, subscriberCount = 0) {
  try {
    const stmt = db.prepare(`
      INSERT INTO creators (channel_id, name, subscriber_count)
      VALUES (?, ?, ?)
      ON CONFLICT(channel_id) DO UPDATE SET
        name = excluded.name,
        subscriber_count = excluded.subscriber_count
    `);
    return stmt.run(channelId, name, subscriberCount);
  } catch (err) {
    console.error('upsertCreator error:', err.message);
    throw err;
  }
}

/**
 * Get all creators
 */
function getCreators() {
  try {
    return db.prepare('SELECT * FROM creators ORDER BY ranking_score DESC').all();
  } catch (err) {
    console.error('getCreators error:', err.message);
    return [];
  }
}

/**
 * Get creator by channel_id
 */
function getCreatorByChannelId(channelId) {
  try {
    return db.prepare('SELECT * FROM creators WHERE channel_id = ?').get(channelId);
  } catch (err) {
    console.error('getCreatorByChannelId error:', err.message);
    return null;
  }
}

/**
 * Update creator stats from analytics
 */
function updateCreatorStats(channelId, totalViews, totalClips) {
  try {
    const avgViews = totalClips > 0 ? totalViews / totalClips : 0;
    return db.prepare(`
      UPDATE creators SET
        total_views = ?,
        total_clips = ?,
        avg_views = ?,
        last_analyzed = CURRENT_TIMESTAMP
      WHERE channel_id = ?
    `).run(totalViews, totalClips, avgViews, channelId);
  } catch (err) {
    console.error('updateCreatorStats error:', err.message);
    throw err;
  }
}

/**
 * Update creator ranking score
 */
function updateCreatorRanking() {
  try {
    db.prepare(`
      UPDATE creators SET
        ranking_score = CASE
          WHEN avg_views > 10000 THEN 100
          WHEN avg_views > 5000 THEN 80
          WHEN avg_views > 1000 THEN 60
          WHEN avg_views > 500 THEN 40
          WHEN avg_views > 100 THEN 20
          ELSE 10
        END
    `).run();
    return true;
  } catch (err) {
    console.error('updateCreatorRanking error:', err.message);
    return false;
  }
}

// ==================== CLIPS QUEUE ====================

/**
 * Add clip to queue
 */
function addToQueue(videoId, videoTitle, channelId, creatorName, filePath, duration = 0) {
  try {
    return db.prepare(`
      INSERT INTO clips_queue (video_id, video_title, channel_id, creator_name, file_path, duration, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(videoId, videoTitle, channelId, creatorName, filePath, duration);
  } catch (err) {
    console.error('addToQueue error:', err.message);
    throw err;
  }
}

/**
 * Get pending clips from queue
 */
function getPendingClips(limit = 100) {
  try {
    return db.prepare(`
      SELECT * FROM clips_queue
      WHERE status = 'pending'
      ORDER BY priority_score DESC, created_at ASC
      LIMIT ?
    `).all(limit);
  } catch (err) {
    console.error('getPendingClips error:', err.message);
    return [];
  }
}

/**
 * Get clip by ID
 */
function getClipById(id) {
  try {
    return db.prepare('SELECT * FROM clips_queue WHERE id = ?').get(id);
  } catch (err) {
    console.error('getClipById error:', err.message);
    return null;
  }
}

/**
 * Update clip priority score
 */
function updateClipPriority(id, score) {
  try {
    return db.prepare('UPDATE clips_queue SET priority_score = ? WHERE id = ?').run(score, id);
  } catch (err) {
    console.error('updateClipPriority error:', err.message);
    return { changes: 0 };
  }
}

/**
 * Mark clip as uploaded
 */
function markClipUploaded(id, videoIdShorts) {
  try {
    return db.prepare(`
      UPDATE clips_queue SET status = 'uploaded' WHERE id = ?
    `).run(id);
  } catch (err) {
    console.error('markClipUploaded error:', err.message);
    return { changes: 0 };
  }
}

/**
 * Remove clip from queue
 */
function removeClip(id) {
  try {
    return db.prepare('DELETE FROM clips_queue WHERE id = ?').run(id);
  } catch (err) {
    console.error('removeClip error:', err.message);
    return { changes: 0 };
  }
}

/**
 * Get queue count
 */
function getQueueCount() {
  try {
    const row = db.prepare("SELECT COUNT(*) as count FROM clips_queue WHERE status = 'pending'").get();
    return row.count;
  } catch (err) {
    console.error('getQueueCount error:', err.message);
    return 0;
  }
}

// ==================== UPLOADED SHORTS ====================

/**
 * Add uploaded short
 */
function addUploadedShort(videoIdShorts, originalVideoId, originalTitle, channelId, creatorName, filePath) {
  try {
    return db.prepare(`
      INSERT INTO uploaded_shorts (video_id_shorts, original_video_id, original_video_title, channel_id, creator_name, file_path)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(videoIdShorts, originalVideoId, originalTitle, channelId, creatorName, filePath);
  } catch (err) {
    console.error('addUploadedShort error:', err.message);
    throw err;
  }
}

/**
 * Get all uploaded shorts
 */
function getUploadedShorts(limit = 100) {
  try {
    return db.prepare(`
      SELECT * FROM uploaded_shorts
      ORDER BY upload_date DESC
      LIMIT ?
    `).all(limit);
  } catch (err) {
    console.error('getUploadedShorts error:', err.message);
    return [];
  }
}

/**
 * Get short by YouTube ID
 */
function getShortByYouTubeId(videoIdShorts) {
  try {
    return db.prepare('SELECT * FROM uploaded_shorts WHERE video_id_shorts = ?').get(videoIdShorts);
  } catch (err) {
    console.error('getShortByYouTubeId error:', err.message);
    return null;
  }
}

/**
 * Update short stats (views, likes)
 */
function updateShortStats(videoIdShorts, views, likes, comments = 0) {
  try {
    return db.prepare(`
      UPDATE uploaded_shorts SET
        views = ?,
        likes = ?,
        comments = ?,
        last_updated = CURRENT_TIMESTAMP
      WHERE video_id_shorts = ?
    `).run(views, likes, comments, videoIdShorts);
  } catch (err) {
    console.error('updateShortStats error:', err.message);
    return { changes: 0 };
  }
}

/**
 * Get stats by creator
 */
function getStatsByCreator(creatorName) {
  try {
    return db.prepare(`
      SELECT
        COUNT(*) as total_shorts,
        SUM(views) as total_views,
        SUM(likes) as total_likes,
        AVG(views) as avg_views
      FROM uploaded_shorts
      WHERE creator_name = ?
    `).get(creatorName);
  } catch (err) {
    console.error('getStatsByCreator error:', err.message);
    return { total_shorts: 0, total_views: 0, total_likes: 0, avg_views: 0 };
  }
}

/**
 * Get all creators with stats
 */
function getCreatorStats() {
  try {
    return db.prepare(`
      SELECT
        creator_name,
        COUNT(*) as total_shorts,
        SUM(views) as total_views,
        SUM(likes) as total_likes,
        AVG(views) as avg_views
      FROM uploaded_shorts
      GROUP BY creator_name
      ORDER BY avg_views DESC
    `).all();
  } catch (err) {
    console.error('getCreatorStats error:', err.message);
    return [];
  }
}

// ==================== SCHEDULE ====================

/**
 * Get upload schedule
 */
function getSchedule() {
  try {
    return db.prepare('SELECT * FROM upload_schedule WHERE id = 1').get();
  } catch (err) {
    console.error('getSchedule error:', err.message);
    return { schedule_time: '23:00', max_uploads: 7, enabled: 1 };
  }
}

/**
 * Update schedule
 */
function updateSchedule(scheduleTime, maxUploads) {
  try {
    return db.prepare(`
      UPDATE upload_schedule SET schedule_time = ?, max_uploads = ? WHERE id = 1
    `).run(scheduleTime, maxUploads);
  } catch (err) {
    console.error('updateSchedule error:', err.message);
    return { changes: 0 };
  }
}

/**
 * Mark schedule as run
 */
function markScheduleRun() {
  try {
    return db.prepare(`
      UPDATE upload_schedule SET last_run = CURRENT_TIMESTAMP WHERE id = 1
    `).run();
  } catch (err) {
    console.error('markScheduleRun error:', err.message);
    return { changes: 0 };
  }
}

module.exports = {
  initDatabase,
  getDb,
  closeDatabase,
  // Creators
  upsertCreator,
  getCreators,
  getCreatorByChannelId,
  updateCreatorStats,
  updateCreatorRanking,
  // Queue
  addToQueue,
  getPendingClips,
  getClipById,
  updateClipPriority,
  markClipUploaded,
  removeClip,
  getQueueCount,
  // Uploaded
  addUploadedShort,
  getUploadedShorts,
  getShortByYouTubeId,
  updateShortStats,
  getStatsByCreator,
  getCreatorStats,
  // Schedule
  getSchedule,
  updateSchedule,
  markScheduleRun,
};