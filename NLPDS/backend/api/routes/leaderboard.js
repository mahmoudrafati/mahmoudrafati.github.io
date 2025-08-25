/**
 * Leaderboard routes for NLPDS Learning Platform
 * Implements scoring algorithm and privacy controls
 */

import express from 'express';
import { query, body, validationResult } from 'express-validator';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();
const db = new DatabaseManager();

// Scoring algorithm weights
const SCORING_WEIGHTS = {
  accuracy: 0.4,        // Average score across all attempts
  consistency: 0.3,     // Regular usage (streak bonus)
  completion: 0.2,      // Questions completed
  efficiency: 0.1       // Time spent vs. average
};

/**
 * Calculate user score for leaderboard
 */
async function calculateUserScore(userId) {
  const stats = await db.getUserStats(userId);
  
  if (stats.total_questions === 0) {
    return { score: 0, breakdown: null };
  }

  // Accuracy component (0-100)
  const accuracy = (stats.accuracy || 0) * 100;

  // Consistency component - based on activity over recent days
  const consistency = await calculateConsistencyScore(userId);

  // Completion component - normalized by total available questions
  const completion = Math.min(stats.total_questions / 100, 1) * 100; // Cap at 100 questions

  // Efficiency component - faster correct answers get bonus
  const efficiency = await calculateEfficiencyScore(userId);

  const breakdown = {
    accuracy: accuracy * SCORING_WEIGHTS.accuracy,
    consistency: consistency * SCORING_WEIGHTS.consistency,
    completion: completion * SCORING_WEIGHTS.completion,
    efficiency: efficiency * SCORING_WEIGHTS.efficiency
  };

  const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

  return {
    score: Math.round(totalScore * 100) / 100, // Round to 2 decimal places
    breakdown,
    stats: {
      totalQuestions: stats.total_questions,
      accuracy: stats.accuracy,
      averageScore: stats.average_score,
      totalTimeSpent: stats.total_time_spent
    }
  };
}

/**
 * Calculate consistency score based on activity patterns
 */
async function calculateConsistencyScore(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentActivity = await db.getUserProgress(userId, {
    limit: 1000
  });

  if (recentActivity.length === 0) return 0;

  // Group by day
  const dailyActivity = {};
  recentActivity.forEach(progress => {
    const day = progress.answered_at.split('T')[0];
    dailyActivity[day] = (dailyActivity[day] || 0) + 1;
  });

  const activeDays = Object.keys(dailyActivity).length;
  const maxPossibleDays = Math.min(30, recentActivity.length > 0 ? 30 : 0);

  // Bonus for consecutive days
  const consecutiveDays = calculateConsecutiveDays(Object.keys(dailyActivity).sort());
  const streakBonus = Math.min(consecutiveDays * 2, 20); // Max 20 bonus points

  const consistencyBase = maxPossibleDays > 0 ? (activeDays / maxPossibleDays) * 80 : 0;
  return Math.min(consistencyBase + streakBonus, 100);
}

/**
 * Calculate consecutive active days
 */
function calculateConsecutiveDays(sortedDays) {
  if (sortedDays.length === 0) return 0;

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedDays.length; i++) {
    const prevDate = new Date(sortedDays[i - 1]);
    const currentDate = new Date(sortedDays[i]);
    const dayDiff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);

    if (dayDiff === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

/**
 * Calculate efficiency score based on time spent vs performance
 */
async function calculateEfficiencyScore(userId) {
  const recentProgress = await db.getUserProgress(userId, { limit: 100 });
  
  if (recentProgress.length === 0) return 0;

  const validEntries = recentProgress.filter(p => p.time_spent && p.time_spent > 0);
  if (validEntries.length === 0) return 50; // Neutral score if no time data

  // Calculate average time per question for correct answers
  const correctEntries = validEntries.filter(p => p.correct);
  if (correctEntries.length === 0) return 0;

  const avgTimePerCorrect = correctEntries.reduce((sum, p) => sum + p.time_spent, 0) / correctEntries.length;
  
  // Efficiency score: faster correct answers get higher scores
  // Base assumption: 60 seconds is "average" time per question
  const baseTime = 60000; // milliseconds
  const efficiency = Math.max(0, 100 - ((avgTimePerCorrect - baseTime) / baseTime) * 50);
  
  return Math.min(Math.max(efficiency, 0), 100);
}

/**
 * Update leaderboard cache for all categories
 */
async function updateLeaderboardCache() {
  try {
    // Get all users who have opted into leaderboard
    const users = await db.all(`
      SELECT id FROM users 
      WHERE show_in_leaderboard = 1 
      AND id IN (SELECT DISTINCT user_id FROM user_progress)
    `);

    const categories = ['all_time', 'weekly', 'daily'];
    
    for (const category of categories) {
      const userScores = [];
      
      for (const user of users) {
        const scoreData = await calculateUserScore(user.id);
        if (scoreData.score > 0) {
          userScores.push({
            userId: user.id,
            score: scoreData.score,
            stats: scoreData.stats
          });
        }
      }

      // Sort by score descending
      userScores.sort((a, b) => b.score - a.score);

      // Update cache with ranks
      for (let i = 0; i < userScores.length; i++) {
        const userData = userScores[i];
        await db.updateLeaderboardCache(
          userData.userId,
          category,
          userData.score,
          i + 1, // rank (1-based)
          userData.stats
        );
      }
    }

    console.log(`✅ Leaderboard cache updated for ${users.length} users`);
  } catch (error) {
    console.error('❌ Leaderboard cache update failed:', error);
  }
}

/**
 * Get leaderboard for a specific category
 * GET /api/leaderboard/:category
 */
router.get('/:category', optionalAuth, [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
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

    const { category } = req.params;
    const validCategories = ['all_time', 'weekly', 'daily'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: 'Invalid category',
        message: `Category must be one of: ${validCategories.join(', ')}`
      });
    }

    const limit = parseInt(req.query.limit) || 50;
    
    // Get leaderboard data
    const leaderboard = await db.getLeaderboard(category, limit);
    
    // Get current user's position if authenticated
    let userPosition = null;
    if (req.user) {
      userPosition = await db.getUserLeaderboardPosition(req.user.userId, category);
    }

    // Format response with privacy considerations
    const formattedLeaderboard = leaderboard.map((entry, index) => ({
      rank: entry.rank,
      displayName: entry.display_name,
      score: entry.score,
      stats: {
        totalQuestions: entry.stats.totalQuestions || 0,
        accuracy: Math.round((entry.stats.accuracy || 0) * 100),
        // Don't expose sensitive timing data
      },
      isCurrentUser: req.user ? entry.user_id === req.user.userId : false
    }));

    res.json({
      category,
      leaderboard: formattedLeaderboard,
      userPosition,
      lastUpdated: leaderboard.length > 0 ? leaderboard[0].updated_at : null,
      total: leaderboard.length
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      error: 'Failed to get leaderboard',
      message: 'Internal server error'
    });
  }
});

/**
 * Opt into leaderboard
 * POST /api/leaderboard/opt-in
 */
router.post('/opt-in', authenticateToken, async (req, res) => {
  try {
    await db.updateUserProfile(req.user.userId, {
      showInLeaderboard: true
    });

    // Trigger cache update for this user
    const scoreData = await calculateUserScore(req.user.userId);
    await db.updateLeaderboardCache(
      req.user.userId,
      'all_time',
      scoreData.score,
      0, // Will be updated on next full cache refresh
      scoreData.stats
    );

    res.json({
      message: 'Successfully opted into leaderboard',
      score: scoreData.score
    });

  } catch (error) {
    console.error('Opt-in error:', error);
    res.status(500).json({
      error: 'Failed to opt into leaderboard',
      message: 'Internal server error'
    });
  }
});

/**
 * Opt out of leaderboard
 * POST /api/leaderboard/opt-out
 */
router.post('/opt-out', authenticateToken, async (req, res) => {
  try {
    await db.updateUserProfile(req.user.userId, {
      showInLeaderboard: false
    });

    // Remove from leaderboard cache
    await db.run('DELETE FROM leaderboard_cache WHERE user_id = ?', [req.user.userId]);

    res.json({
      message: 'Successfully opted out of leaderboard'
    });

  } catch (error) {
    console.error('Opt-out error:', error);
    res.status(500).json({
      error: 'Failed to opt out of leaderboard',
      message: 'Internal server error'
    });
  }
});

/**
 * Get current user's detailed score breakdown
 * GET /api/leaderboard/my-score
 */
router.get('/my-score', authenticateToken, async (req, res) => {
  try {
    const scoreData = await calculateUserScore(req.user.userId);

    res.json({
      score: scoreData.score,
      breakdown: scoreData.breakdown,
      stats: scoreData.stats,
      weights: SCORING_WEIGHTS,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get score error:', error);
    res.status(500).json({
      error: 'Failed to calculate score',
      message: 'Internal server error'
    });
  }
});

/**
 * Manual trigger for leaderboard cache update (admin endpoint)
 * POST /api/leaderboard/update-cache
 */
router.post('/update-cache', async (req, res) => {
  try {
    await updateLeaderboardCache();
    
    res.json({
      message: 'Leaderboard cache updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Manual cache update error:', error);
    res.status(500).json({
      error: 'Failed to update leaderboard cache',
      message: 'Internal server error'
    });
  }
});

// Schedule automatic leaderboard updates every hour
if (process.env.NODE_ENV === 'production') {
  setInterval(updateLeaderboardCache, 60 * 60 * 1000); // 1 hour
}

export default router;
