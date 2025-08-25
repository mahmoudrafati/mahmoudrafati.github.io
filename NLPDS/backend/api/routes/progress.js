/**
 * Progress tracking routes for NLPDS Learning Platform
 * Integrates with existing localStorage-based frontend progress system
 */

import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();
const db = new DatabaseManager();

/**
 * Save answer result (replaces existing saveAnswerResult functionality)
 * POST /api/progress/answer
 */
router.post('/answer', authenticateToken, [
  body('questionId').notEmpty().withMessage('Question ID required'),
  body('userAnswer').optional().withMessage('User answer must be string'),
  body('score').isFloat({ min: 0, max: 1 }).withMessage('Score must be between 0 and 1'),
  body('correct').isBoolean().withMessage('Correct must be boolean'),
  body('hintsUsed').optional().isInt({ min: 0 }).withMessage('Hints used must be non-negative integer'),
  body('timeSpent').optional().isInt({ min: 0 }).withMessage('Time spent must be non-negative integer'),
  body('sessionMode').isIn(['learn', 'exam']).withMessage('Session mode must be learn or exam'),
  body('evaluationData').optional().isObject().withMessage('Evaluation data must be object')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const progressData = {
      questionId: req.body.questionId,
      userAnswer: req.body.userAnswer,
      score: req.body.score,
      correct: req.body.correct,
      hintsUsed: req.body.hintsUsed || 0,
      timeSpent: req.body.timeSpent || null,
      sessionMode: req.body.sessionMode,
      evaluationData: req.body.evaluationData || null
    };

    const progressId = await db.saveProgress(req.user.userId, progressData);

    res.status(201).json({
      message: 'Progress saved successfully',
      progressId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Save progress error:', error);
    res.status(500).json({
      error: 'Failed to save progress',
      message: 'Internal server error'
    });
  }
});

/**
 * Bulk sync progress from localStorage (for migration and offline sync)
 * POST /api/progress/sync
 */
router.post('/sync', authenticateToken, [
  body('progressData').isArray().withMessage('Progress data must be array'),
  body('progressData.*.questionId').notEmpty().withMessage('Question ID required for each entry'),
  body('progressData.*.score').isFloat({ min: 0, max: 1 }).withMessage('Score must be between 0 and 1'),
  body('progressData.*.correct').isBoolean().withMessage('Correct must be boolean'),
  body('progressData.*.sessionMode').isIn(['learn', 'exam']).withMessage('Session mode must be learn or exam')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { progressData } = req.body;
    const userId = req.user.userId;
    
    // Limit bulk sync to prevent abuse
    if (progressData.length > 1000) {
      return res.status(400).json({
        error: 'Too many entries',
        message: 'Maximum 1000 entries per sync operation'
      });
    }

    let syncedCount = 0;
    let skippedCount = 0;

    for (const entry of progressData) {
      try {
        // Check if this question was already answered (prevent duplicates)
        const existing = await db.getUserProgress(userId, { 
          questionId: entry.questionId,
          limit: 1 
        });

        if (existing.length > 0) {
          skippedCount++;
          continue;
        }

        await db.saveProgress(userId, {
          questionId: entry.questionId,
          userAnswer: entry.userAnswer || '',
          score: entry.score,
          correct: entry.correct,
          hintsUsed: entry.hintsUsed || 0,
          timeSpent: entry.timeSpent || null,
          sessionMode: entry.sessionMode,
          evaluationData: entry.evaluationData || null
        });

        syncedCount++;
      } catch (entryError) {
        console.error('Error syncing entry:', entryError);
        skippedCount++;
      }
    }

    res.json({
      message: 'Sync completed',
      synced: syncedCount,
      skipped: skippedCount,
      total: progressData.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      error: 'Sync failed',
      message: 'Internal server error'
    });
  }
});

/**
 * Get user's complete progress
 * GET /api/progress
 */
router.get('/', authenticateToken, [
  query('questionId').optional().notEmpty().withMessage('Question ID cannot be empty'),
  query('sessionMode').optional().isIn(['learn', 'exam']).withMessage('Session mode must be learn or exam'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const options = {
      questionId: req.query.questionId,
      sessionMode: req.query.sessionMode,
      limit: parseInt(req.query.limit) || 100,
      offset: parseInt(req.query.offset) || 0
    };

    const progress = await db.getUserProgress(req.user.userId, options);

    res.json({
      progress,
      total: progress.length,
      hasMore: progress.length === options.limit
    });

  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({
      error: 'Failed to get progress',
      message: 'Internal server error'
    });
  }
});

/**
 * Get user statistics (replaces existing getSessionStats functionality)
 * GET /api/progress/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await db.getUserStats(req.user.userId);

    // Calculate additional metrics that match frontend expectations
    const enhancedStats = {
      ...stats,
      questionsAnswered: stats.total_questions,
      correctAnswers: stats.correct_answers,
      averageScore: stats.average_score || 0,
      accuracyPercentage: Math.round((stats.accuracy || 0) * 100),
      totalTimeSpent: stats.total_time_spent || 0,
      totalHintsUsed: stats.total_hints_used || 0,
      sessionBreakdown: stats.sessionBreakdown.reduce((acc, session) => {
        acc[session.session_mode] = {
          count: session.count,
          averageScore: session.avg_score || 0,
          correctCount: session.correct_count,
          accuracy: session.count > 0 ? session.correct_count / session.count : 0
        };
        return acc;
      }, {}),
      firstActivity: stats.first_answer,
      lastActivity: stats.last_answer
    };

    res.json({
      stats: enhancedStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      message: 'Internal server error'
    });
  }
});

/**
 * Create learning session (replaces existing startSession functionality)
 * POST /api/progress/session
 */
router.post('/session', authenticateToken, [
  body('sessionType').isIn(['learn', 'exam']).withMessage('Session type must be learn or exam'),
  body('questionsTotal').isInt({ min: 1 }).withMessage('Questions total must be positive integer'),
  body('topics').optional().isArray().withMessage('Topics must be array')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const sessionData = {
      sessionType: req.body.sessionType,
      questionsTotal: req.body.questionsTotal,
      topics: req.body.topics || []
    };

    const sessionId = await db.createSession(req.user.userId, sessionData);

    res.status(201).json({
      message: 'Session created successfully',
      sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      error: 'Failed to create session',
      message: 'Internal server error'
    });
  }
});

/**
 * Update learning session (replaces existing endSession functionality)
 * PUT /api/progress/session/:id
 */
router.put('/session/:id', authenticateToken, [
  body('questionsCompleted').optional().isInt({ min: 0 }).withMessage('Questions completed must be non-negative'),
  body('averageScore').optional().isFloat({ min: 0, max: 1 }).withMessage('Average score must be between 0 and 1'),
  body('timeSpent').optional().isInt({ min: 0 }).withMessage('Time spent must be non-negative'),
  body('completed').optional().isBoolean().withMessage('Completed must be boolean')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const sessionId = parseInt(req.params.id);
    const updateData = {
      questionsCompleted: req.body.questionsCompleted,
      averageScore: req.body.averageScore,
      timeSpent: req.body.timeSpent,
      completedAt: req.body.completed ? new Date().toISOString() : null
    };

    await db.updateSession(sessionId, updateData);

    res.json({
      message: 'Session updated successfully',
      sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      error: 'Failed to update session',
      message: 'Internal server error'
    });
  }
});

/**
 * Get user's session history
 * GET /api/progress/sessions
 */
router.get('/sessions', authenticateToken, [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const options = {
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0
    };

    const sessions = await db.getUserSessions(req.user.userId, options);

    res.json({
      sessions,
      total: sessions.length,
      hasMore: sessions.length === options.limit
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      error: 'Failed to get sessions',
      message: 'Internal server error'
    });
  }
});

/**
 * Get comprehensive user statistics
 * GET /api/progress/user-stats
 */
router.get('/user-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get basic user stats
    const basicStats = await db.getUserStats(userId);
    
    // Get session breakdown
    const sessions = await db.getUserSessions(userId, { limit: 1000 });
    const sessionBreakdown = {
      learn: { count: 0, questions: 0, accuracy: 0 },
      exam: { count: 0, questions: 0, accuracy: 0 }
    };
    
    let totalSessionAccuracy = { learn: 0, exam: 0 };
    
    sessions.forEach(session => {
      const mode = session.session_type;
      if (sessionBreakdown[mode]) {
        sessionBreakdown[mode].count++;
        sessionBreakdown[mode].questions += session.questions_completed || 0;
        if (session.average_score !== null) {
          totalSessionAccuracy[mode] += session.average_score;
        }
      }
    });
    
    // Calculate average accuracy per session type
    Object.keys(sessionBreakdown).forEach(mode => {
      if (sessionBreakdown[mode].count > 0) {
        sessionBreakdown[mode].accuracy = totalSessionAccuracy[mode] / sessionBreakdown[mode].count;
      }
    });
    
    // Get topic breakdown
    const topicStats = await db.all(`
      SELECT 
        question_topic as topic,
        COUNT(*) as count,
        AVG(score) as avg_score,
        SUM(CASE WHEN correct = 1 THEN 1 ELSE 0 END) as correct_count
      FROM user_progress 
      WHERE user_id = ? AND question_topic IS NOT NULL
      GROUP BY question_topic
    `, [userId]);
    
    const topicBreakdown = {};
    topicStats.forEach(topic => {
      topicBreakdown[topic.topic] = {
        count: topic.count,
        correct: topic.correct_count,
        accuracy: topic.correct_count / topic.count
      };
    });
    
    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentActivity = await db.all(`
      SELECT 
        DATE(answered_at) as date,
        session_mode,
        COUNT(*) as questions,
        AVG(score) as avg_score,
        SUM(CASE WHEN correct = 1 THEN 1 ELSE 0 END) as correct_count
      FROM user_progress 
      WHERE user_id = ? AND answered_at >= ?
      GROUP BY DATE(answered_at), session_mode
      ORDER BY date DESC
    `, [userId, sevenDaysAgo.toISOString()]);
    
    const recentActivityFormatted = recentActivity.map(activity => ({
      date: activity.date,
      mode: activity.session_mode,
      questions: activity.questions,
      accuracy: activity.correct_count / activity.questions,
      avgScore: activity.avg_score
    }));
    
    // Calculate learning streak
    const learningStreak = await calculateLearningStreak(userId);
    
    // Calculate achievements
    const achievements = calculateAchievements({
      totalQuestions: basicStats.total_questions,
      accuracyRate: basicStats.accuracy,
      totalSessions: sessions.length,
      learningStreak,
      timeInvested: basicStats.total_time_spent || 0
    });
    
    const userStats = {
      totalQuestions: basicStats.total_questions,
      answeredQuestions: basicStats.total_questions,
      accuracyRate: basicStats.accuracy,
      averageScore: basicStats.average_score,
      timeInvested: basicStats.total_time_spent || 0,
      totalSessions: sessions.length,
      learningStreak,
      sessionBreakdown,
      topicBreakdown,
      recentActivity: recentActivityFormatted,
      achievements
    };
    
    res.json({
      userStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Failed to get user statistics',
      message: 'Internal server error'
    });
  }
});

/**
 * Calculate learning streak for a user
 */
async function calculateLearningStreak(userId) {
  try {
    const recentDays = await db.all(`
      SELECT DISTINCT DATE(answered_at) as date
      FROM user_progress 
      WHERE user_id = ?
      ORDER BY date DESC
      LIMIT 30
    `, [userId]);
    
    if (recentDays.length === 0) return 0;
    
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    
    for (let i = 0; i < recentDays.length; i++) {
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedDateStr = expectedDate.toISOString().split('T')[0];
      
      if (recentDays[i].date === expectedDateStr) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  } catch (error) {
    console.error('Error calculating learning streak:', error);
    return 0;
  }
}

/**
 * Calculate achievements based on user statistics
 */
function calculateAchievements(stats) {
  const achievements = [];
  
  // Question Count Achievements
  if (stats.totalQuestions >= 10) achievements.push({ id: 'questions_10', name: 'Anfänger', description: '10 Fragen beantwortet', icon: '🌱' });
  if (stats.totalQuestions >= 50) achievements.push({ id: 'questions_50', name: 'Fleißig', description: '50 Fragen beantwortet', icon: '📚' });
  if (stats.totalQuestions >= 100) achievements.push({ id: 'questions_100', name: 'Hundert!', description: '100 Fragen beantwortet', icon: '💯' });
  if (stats.totalQuestions >= 250) achievements.push({ id: 'questions_250', name: 'Experte', description: '250 Fragen beantwortet', icon: '🎓' });
  
  // Accuracy Achievements
  if (stats.accuracyRate >= 0.7) achievements.push({ id: 'accuracy_70', name: 'Gut', description: '70% Genauigkeit erreicht', icon: '👍' });
  if (stats.accuracyRate >= 0.8) achievements.push({ id: 'accuracy_80', name: 'Sehr gut', description: '80% Genauigkeit erreicht', icon: '⭐' });
  if (stats.accuracyRate >= 0.9) achievements.push({ id: 'accuracy_90', name: 'Ausgezeichnet', description: '90% Genauigkeit erreicht', icon: '🏆' });
  
  // Streak Achievements
  if (stats.learningStreak >= 3) achievements.push({ id: 'streak_3', name: 'Konstant', description: '3 Tage in Folge gelernt', icon: '🔥' });
  if (stats.learningStreak >= 7) achievements.push({ id: 'streak_7', name: 'Wöchentlich', description: '7 Tage in Folge gelernt', icon: '📅' });
  if (stats.learningStreak >= 14) achievements.push({ id: 'streak_14', name: 'Unbeugsam', description: '14 Tage in Folge gelernt', icon: '💪' });
  
  // Session Achievements
  if (stats.totalSessions >= 5) achievements.push({ id: 'sessions_5', name: 'Engagiert', description: '5 Sessions abgeschlossen', icon: '🎯' });
  if (stats.totalSessions >= 15) achievements.push({ id: 'sessions_15', name: 'Diszipliniert', description: '15 Sessions abgeschlossen', icon: '📊' });
  
  // Time Investment Achievements
  const hoursInvested = stats.timeInvested / (1000 * 60 * 60);
  if (hoursInvested >= 1) achievements.push({ id: 'time_1h', name: 'Erste Stunde', description: '1 Stunde Lernzeit investiert', icon: '⏰' });
  if (hoursInvested >= 5) achievements.push({ id: 'time_5h', name: 'Ausdauernd', description: '5 Stunden Lernzeit investiert', icon: '⏱️' });
  if (hoursInvested >= 10) achievements.push({ id: 'time_10h', name: 'Hingabe', description: '10 Stunden Lernzeit investiert', icon: '⏳' });
  
  return achievements;
}

export default router;
