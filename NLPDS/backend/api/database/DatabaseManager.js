/**
 * Database Manager for NLPDS Learning Platform
 * Handles SQLite operations for users, progress, and leaderboard
 */

import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseManager {
  constructor() {
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database/nlpds.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err);
      } else {
        console.log('Connected to SQLite database at:', dbPath);
      }
    });
    
    // Promisify database methods with proper handling of SQLite3 context
    this.get = promisify(this.db.get.bind(this.db));
    this.all = promisify(this.db.all.bind(this.db));
    
    // Custom promisify for run() to preserve 'this' context with lastID and changes
    this.run = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function(err) {
          if (err) {
            reject(err);
          } else {
            // 'this' here refers to the SQLite3 Statement object with lastID and changes
            resolve({
              lastID: this.lastID,
              changes: this.changes
            });
          }
        });
      });
    };
  }

  async initialize() {
    await this.initializeDatabase();
    return this;
  }

  async initializeDatabase() {
    try {
      // Enable foreign keys
      await this.run('PRAGMA foreign_keys = ON');
      
      // Create tables if they don't exist
      await this.createTables();
      
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async createTables() {
    // Users table
    await this.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        avatar_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        show_in_leaderboard BOOLEAN DEFAULT 1,
        settings TEXT DEFAULT '{}'
      )
    `);

    // User progress table
    await this.run(`
      CREATE TABLE IF NOT EXISTS user_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        question_id TEXT NOT NULL,
        user_answer TEXT,
        score REAL,
        correct BOOLEAN,
        hints_used INTEGER DEFAULT 0,
        time_spent INTEGER,
        session_mode TEXT CHECK(session_mode IN ('learn', 'exam')),
        answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        evaluation_data TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Learning sessions table
    await this.run(`
      CREATE TABLE IF NOT EXISTS learning_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_type TEXT CHECK(session_type IN ('learn', 'exam')),
        questions_total INTEGER,
        questions_completed INTEGER,
        average_score REAL,
        time_spent INTEGER,
        topics TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Leaderboard cache table
    await this.run(`
      CREATE TABLE IF NOT EXISTS leaderboard_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        category TEXT NOT NULL,
        score REAL,
        rank INTEGER,
        stats TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, category)
      )
    `);

    // Create indexes for better performance
    await this.run('CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_user_progress_question_id ON user_progress(question_id)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_user_progress_answered_at ON user_progress(answered_at)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_id ON learning_sessions(user_id)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_category ON leaderboard_cache(category, score DESC)');
  }

  // User management methods
  async createUser({ username, email, passwordHash, displayName }) {
    const result = await this.run(
      'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, displayName]
    );
    return result.lastID;
  }

  async getUserById(id) {
    return await this.get('SELECT * FROM users WHERE id = ?', [id]);
  }

  async getUserByUsername(username) {
    return await this.get('SELECT * FROM users WHERE username = ?', [username]);
  }

  async getUserByEmail(email) {
    if (!email) return null;
    return await this.get('SELECT * FROM users WHERE email = ?', [email]);
  }

  async updateUserLastActive(userId) {
    await this.run(
      'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );
  }

  async updateUserProfile(userId, { displayName, email, showInLeaderboard, settings }) {
    const updates = [];
    const values = [];

    if (displayName !== undefined) {
      updates.push('display_name = ?');
      values.push(displayName);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (showInLeaderboard !== undefined) {
      updates.push('show_in_leaderboard = ?');
      values.push(showInLeaderboard ? 1 : 0);
    }
    if (settings !== undefined) {
      updates.push('settings = ?');
      values.push(JSON.stringify(settings));
    }

    if (updates.length === 0) return;

    values.push(userId);
    await this.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  // Progress management methods
  async saveProgress(userId, progressData) {
    const {
      questionId,
      userAnswer,
      score,
      correct,
      hintsUsed = 0,
      timeSpent,
      sessionMode,
      evaluationData
    } = progressData;

    const result = await this.run(`
      INSERT INTO user_progress (
        user_id, question_id, user_answer, score, correct, hints_used,
        time_spent, session_mode, evaluation_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      questionId,
      userAnswer,
      score,
      correct ? 1 : 0,
      hintsUsed,
      timeSpent,
      sessionMode,
      JSON.stringify(evaluationData)
    ]);

    return result.lastID;
  }

  async getUserProgress(userId, options = {}) {
    const { questionId, sessionMode, limit, offset } = options;
    
    let query = 'SELECT * FROM user_progress WHERE user_id = ?';
    const params = [userId];

    if (questionId) {
      query += ' AND question_id = ?';
      params.push(questionId);
    }
    if (sessionMode) {
      query += ' AND session_mode = ?';
      params.push(sessionMode);
    }

    query += ' ORDER BY answered_at DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
      if (offset) {
        query += ' OFFSET ?';
        params.push(offset);
      }
    }

    const progress = await this.all(query, params);
    
    // Parse JSON data
    return progress.map(p => ({
      ...p,
      correct: Boolean(p.correct),
      evaluationData: p.evaluation_data ? JSON.parse(p.evaluation_data) : null
    }));
  }

  async getUserStats(userId) {
    const stats = await this.get(`
      SELECT 
        COUNT(*) as total_questions,
        COUNT(CASE WHEN correct = 1 THEN 1 END) as correct_answers,
        AVG(score) as average_score,
        SUM(time_spent) as total_time_spent,
        SUM(hints_used) as total_hints_used,
        MIN(answered_at) as first_answer,
        MAX(answered_at) as last_answer
      FROM user_progress 
      WHERE user_id = ?
    `, [userId]);

    // Get session breakdown
    const sessionStats = await this.all(`
      SELECT 
        session_mode,
        COUNT(*) as count,
        AVG(score) as avg_score,
        COUNT(CASE WHEN correct = 1 THEN 1 END) as correct_count
      FROM user_progress 
      WHERE user_id = ? 
      GROUP BY session_mode
    `, [userId]);

    return {
      ...stats,
      accuracy: stats.total_questions > 0 ? stats.correct_answers / stats.total_questions : 0,
      sessionBreakdown: sessionStats
    };
  }

  // Session management methods
  async createSession(userId, sessionData) {
    const {
      sessionType,
      questionsTotal,
      topics
    } = sessionData;

    const result = await this.run(`
      INSERT INTO learning_sessions (
        user_id, session_type, questions_total, topics
      ) VALUES (?, ?, ?, ?)
    `, [
      userId,
      sessionType,
      questionsTotal,
      JSON.stringify(topics)
    ]);

    return result.lastID;
  }

  async updateSession(sessionId, updateData) {
    const {
      questionsCompleted,
      averageScore,
      timeSpent,
      completedAt
    } = updateData;

    const updates = [];
    const values = [];

    if (questionsCompleted !== undefined) {
      updates.push('questions_completed = ?');
      values.push(questionsCompleted);
    }
    if (averageScore !== undefined) {
      updates.push('average_score = ?');
      values.push(averageScore);
    }
    if (timeSpent !== undefined) {
      updates.push('time_spent = ?');
      values.push(timeSpent);
    }
    if (completedAt !== undefined) {
      updates.push('completed_at = ?');
      values.push(completedAt);
    }

    if (updates.length === 0) return;

    values.push(sessionId);
    await this.run(
      `UPDATE learning_sessions SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  async getUserSessions(userId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    const sessions = await this.all(`
      SELECT * FROM learning_sessions 
      WHERE user_id = ? 
      ORDER BY started_at DESC 
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    return sessions.map(s => ({
      ...s,
      topics: s.topics ? JSON.parse(s.topics) : []
    }));
  }

  // Leaderboard methods
  async updateLeaderboardCache(userId, category, score, rank, stats) {
    await this.run(`
      INSERT OR REPLACE INTO leaderboard_cache 
      (user_id, category, score, rank, stats, updated_at) 
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [userId, category, score, rank, JSON.stringify(stats)]);
  }

  async getLeaderboard(category, limit = 50) {
    const leaderboard = await this.all(`
      SELECT 
        lc.*,
        u.username,
        u.display_name,
        u.show_in_leaderboard
      FROM leaderboard_cache lc
      JOIN users u ON lc.user_id = u.id
      WHERE lc.category = ? AND u.show_in_leaderboard = 1
      ORDER BY lc.score DESC, lc.updated_at ASC
      LIMIT ?
    `, [category, limit]);

    return leaderboard.map(entry => ({
      ...entry,
      stats: entry.stats ? JSON.parse(entry.stats) : {},
      show_in_leaderboard: Boolean(entry.show_in_leaderboard)
    }));
  }

  async getUserLeaderboardPosition(userId, category) {
    return await this.get(`
      SELECT rank, score FROM leaderboard_cache 
      WHERE user_id = ? AND category = ?
    `, [userId, category]);
  }

  // Cleanup methods
  async cleanupOldProgress(daysBefore = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBefore);
    
    const result = await this.run(`
      DELETE FROM user_progress 
      WHERE answered_at < ? AND user_id IN (
        SELECT user_id FROM user_progress 
        GROUP BY user_id 
        HAVING COUNT(*) > 100
      )
    `, [cutoffDate.toISOString()]);

    return result.changes;
  }

  // Close database connection
  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export { DatabaseManager };
