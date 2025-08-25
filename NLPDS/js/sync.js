/**
 * Progress Synchronization Manager for NLPDS Learning Platform
 * Handles hybrid localStorage + server sync with offline capability
 */

import { config, API_ENDPOINTS } from './config.js';
import { isAuthenticated, isBackendAvailable, apiRequest } from './auth.js';
import { state, addEventListener as addStoreListener, saveAnswerResult as localSaveAnswerResult, getCurrentQuestion } from './store.js';

console.log('🔧 DEBUGGING: sync.js wird geladen...');

/**
 * Sync manager state
 */
export const syncState = {
  isOnline: navigator.onLine,
  isSyncing: false,
  lastSyncTime: null,
  pendingSync: [],
  syncErrors: [],
  migrationCompleted: false,
  currentSessionId: null
};

/**
 * Event system for sync status changes
 */
const syncListeners = {
  syncStart: [],
  syncComplete: [],
  syncError: [],
  migrationComplete: []
};

export function addSyncListener(event, callback) {
  if (syncListeners[event]) {
    syncListeners[event].push(callback);
  }
}

function notifySyncListeners(event, data) {
  if (syncListeners[event]) {
    syncListeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Sync listener error:', error);
      }
    });
  }
}

/**
 * Initialize sync manager
 */
export async function initializeSync() {
  try {
    console.log('🔄 Initializing sync manager...');

    // Listen for online/offline events
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);

    // Listen for store changes to queue sync operations
    addStoreListener('answerSaved', handleAnswerSaved);
    addStoreListener('sessionStarted', handleSessionStarted);
    addStoreListener('sessionEnd', handleSessionEnded);

    // Load sync state from localStorage
    loadSyncState();

    // Check migration status
    const migrationFlag = localStorage.getItem(config.MIGRATION.MIGRATION_FLAG_KEY);
    syncState.migrationCompleted = migrationFlag === 'true';

    // Start periodic sync if online and authenticated
    if (syncState.isOnline && isAuthenticated() && isBackendAvailable()) {
      startPeriodicSync();
      
      // Migrate existing progress if needed
      if (!syncState.migrationCompleted) {
        await migrateExistingProgress();
      }
      
      // Sync any pending data
      await syncPendingData();
    }

    console.log('✅ Sync manager initialized');
    return true;

  } catch (error) {
    console.error('❌ Sync manager initialization failed:', error);
    return false;
  }
}

/**
 * Handle online/offline status changes
 */
function handleOnlineStatusChange() {
  const wasOnline = syncState.isOnline;
  syncState.isOnline = navigator.onLine;

  console.log(`🌐 Network status: ${syncState.isOnline ? 'online' : 'offline'}`);

  if (syncState.isOnline && !wasOnline) {
    // Just came online - sync pending data
    if (isAuthenticated() && isBackendAvailable()) {
      syncPendingData();
    }
  }
}

/**
 * Enhanced save answer result with sync capabilities
 * Maintains compatibility with existing store.js interface
 */
export function saveAnswerResult(result) {
  console.log('🔄 sync.js saveAnswerResult called with:', result);
  
  // Save locally first (existing functionality) 
  const localResult = localSaveAnswerResult(result);
  console.log('💾 Local save result:', localResult);

  // Queue for server sync if authenticated and we have a current question
  if (false && isAuthenticated() && isBackendAvailable()) { // TEMPORARY: Sync disabled for debugging
    const currentQuestion = getCurrentQuestion();
    if (currentQuestion) {
      const syncData = {
        questionId: currentQuestion.id,
        userAnswer: result.userAnswer || '',
        score: result.score || 0,
        correct: result.correct || false,
        hintsUsed: result.hintsUsed || 0,
        timeSpent: result.timeSpent || null,
        sessionMode: state.session.mode || 'learn',
        evaluationData: result.evaluation,
        timestamp: new Date().toISOString()
      };

      console.log('🔄 Queuing sync data:', syncData);
      queueForSync('answer', syncData);
      
      // Immediate sync if online
      if (syncState.isOnline) {
        debouncedSync();
      }
    } else {
      console.warn('⚠️ No current question found for sync');
    }
  } else {
    console.log('ℹ️ Skipping sync - not authenticated or backend unavailable');
  }

  return localResult;
}

/**
 * Queue data for synchronization
 */
function queueForSync(type, data) {
  syncState.pendingSync.push({
    id: generateSyncId(),
    type,
    data,
    timestamp: new Date().toISOString(),
    attempts: 0
  });

  saveSyncState();
}

/**
 * Sync pending data to server
 */
export async function syncPendingData() {
  if (!isAuthenticated() || !isBackendAvailable() || !syncState.isOnline) {
    console.log('⏸️ Sync skipped: not authenticated or offline');
    return false;
  }

  if (syncState.isSyncing || syncState.pendingSync.length === 0) {
    return true;
  }

  try {
    syncState.isSyncing = true;
    notifySyncListeners('syncStart', { count: syncState.pendingSync.length });

    console.log(`🔄 Syncing ${syncState.pendingSync.length} pending items...`);

    const syncPromises = [];
    const itemsToSync = [...syncState.pendingSync];

    for (const item of itemsToSync) {
      if (item.type === 'answer') {
        syncPromises.push(syncAnswerResult(item));
      } else if (item.type === 'session') {
        syncPromises.push(syncSessionData(item));
      }
    }

    const results = await Promise.allSettled(syncPromises);
    
    // Process results
    let successCount = 0;
    let errorCount = 0;

    results.forEach((result, index) => {
      const item = itemsToSync[index];
      
      if (result.status === 'fulfilled') {
        // Remove successfully synced item
        syncState.pendingSync = syncState.pendingSync.filter(p => p.id !== item.id);
        successCount++;
      } else {
        // Increment attempt count
        const pendingItem = syncState.pendingSync.find(p => p.id === item.id);
        if (pendingItem) {
          pendingItem.attempts++;
          
          // Remove items with too many failed attempts
          if (pendingItem.attempts >= config.ERROR_RETRY_ATTEMPTS) {
            syncState.pendingSync = syncState.pendingSync.filter(p => p.id !== item.id);
            syncState.syncErrors.push({
              item: pendingItem,
              error: result.reason.message,
              timestamp: new Date().toISOString()
            });
          }
        }
        errorCount++;
      }
    });

    syncState.lastSyncTime = new Date().toISOString();
    saveSyncState();

    console.log(`✅ Sync completed: ${successCount} success, ${errorCount} errors`);
    notifySyncListeners('syncComplete', { 
      success: successCount, 
      errors: errorCount,
      remaining: syncState.pendingSync.length 
    });

    return true;

  } catch (error) {
    console.error('❌ Sync failed:', error);
    notifySyncListeners('syncError', { error: error.message });
    return false;
  } finally {
    syncState.isSyncing = false;
  }
}

/**
 * Sync individual answer result
 */
async function syncAnswerResult(item) {
  try {
    await apiRequest(API_ENDPOINTS.PROGRESS_ANSWER, {
      method: 'POST',
      body: JSON.stringify(item.data)
    });
    return true;
  } catch (error) {
    console.error('Failed to sync answer:', error);
    throw error;
  }
}

/**
 * Sync session data
 */
async function syncSessionData(item) {
  try {
    if (item.data.action === 'create') {
      await apiRequest(API_ENDPOINTS.SESSION_CREATE, {
        method: 'POST',
        body: JSON.stringify(item.data.sessionData)
      });
    } else if (item.data.action === 'update') {
      await apiRequest(`${API_ENDPOINTS.SESSION_UPDATE}/${item.data.sessionId}`, {
        method: 'PUT',
        body: JSON.stringify(item.data.updateData)
      });
    }
    return true;
  } catch (error) {
    console.error('Failed to sync session:', error);
    throw error;
  }
}

/**
 * Migrate existing localStorage progress to server
 */
export async function migrateExistingProgress() {
  if (!isAuthenticated() || !isBackendAvailable()) {
    return false;
  }

  try {
    console.log('🔄 Migrating existing progress to server...');

    const existingData = localStorage.getItem(config.MIGRATION.LEGACY_STORAGE_KEY);
    if (!existingData) {
      console.log('ℹ️ No existing progress to migrate');
      markMigrationComplete();
      return true;
    }

    const progressData = JSON.parse(existingData);
    
    // Extract progress results for migration
    const resultsToMigrate = [];
    
    if (progressData.session && progressData.session.results) {
      progressData.session.results.forEach(result => {
        if (result.questionId && result.evaluation) {
          resultsToMigrate.push({
            questionId: result.questionId,
            userAnswer: result.userAnswer || '',
            score: result.evaluation.score || 0,
            correct: result.evaluation.correct || false,
            hintsUsed: result.hintsUsed || 0,
            timeSpent: result.timeSpent || null,
            sessionMode: progressData.session.mode || 'learn',
            evaluationData: result.evaluation
          });
        }
      });
    }

    if (resultsToMigrate.length === 0) {
      console.log('ℹ️ No valid progress data to migrate');
      markMigrationComplete();
      return true;
    }

    // Bulk sync existing progress
    const migrationResult = await apiRequest(API_ENDPOINTS.PROGRESS_SYNC, {
      method: 'POST',
      body: JSON.stringify({
        progressData: resultsToMigrate
      })
    });

    console.log(`✅ Migration completed: ${migrationResult.synced} items synced, ${migrationResult.skipped} skipped`);
    markMigrationComplete();
    notifySyncListeners('migrationComplete', migrationResult);

    return true;

  } catch (error) {
    console.error('❌ Progress migration failed:', error);
    // Don't mark as complete if migration failed
    return false;
  }
}

/**
 * Mark migration as completed
 */
function markMigrationComplete() {
  localStorage.setItem(config.MIGRATION.MIGRATION_FLAG_KEY, 'true');
  syncState.migrationCompleted = true;
}

/**
 * Event handlers for store events
 */
function handleAnswerSaved(data) {
  // This is called when the local store saves an answer
  // The actual sync queueing is handled in saveAnswerResult
}

async function handleSessionStarted(data) {
  if (isAuthenticated() && isBackendAvailable()) {
    try {
      // Create session immediately to get sessionId
      const sessionData = {
        sessionType: data.mode,
        questionsTotal: data.queue.length,
        topics: extractTopicsFromQueue(data.queue)
      };
      
      const response = await apiRequest(API_ENDPOINTS.SESSION_CREATE, {
        method: 'POST',
        body: JSON.stringify(sessionData)
      });
      
      syncState.currentSessionId = response.sessionId;
      console.log('✅ Session created with ID:', syncState.currentSessionId);
      
    } catch (error) {
      console.error('Failed to create session:', error);
      // Fall back to queueing for later
      queueForSync('session', {
        action: 'create',
        sessionData: {
          sessionType: data.mode,
          questionsTotal: data.queue.length,
          topics: extractTopicsFromQueue(data.queue)
        }
      });
    }
  }
}

async function handleSessionEnded(data) {
  if (isAuthenticated() && isBackendAvailable() && syncState.currentSessionId) {
    try {
      // Update session immediately
      await apiRequest(`${API_ENDPOINTS.SESSION_UPDATE}/${syncState.currentSessionId}`, {
        method: 'PUT',
        body: JSON.stringify({
          questionsCompleted: data.results.length,
          averageScore: calculateAverageScore(data.results),
          timeSpent: data.duration,
          completed: true
        })
      });
      
      console.log('✅ Session updated successfully');
      syncState.currentSessionId = null; // Reset session ID
      
    } catch (error) {
      console.error('Failed to update session:', error);
      // Fall back to queueing for later
      queueForSync('session', {
        action: 'update', 
        sessionId: syncState.currentSessionId,
        updateData: {
          questionsCompleted: data.results.length,
          averageScore: calculateAverageScore(data.results),
          timeSpent: data.duration,
          completed: true
        }
      });
    }
  }
}

/**
 * Utility functions
 */
function extractTopicsFromQueue(queue) {
  const topics = new Set();
  queue.forEach(question => {
    if (question.topic) {
      topics.add(question.topic);
    }
  });
  return Array.from(topics);
}

function calculateAverageScore(results) {
  if (results.length === 0) return 0;
  const total = results.reduce((sum, result) => sum + (result.evaluation?.score || 0), 0);
  return total / results.length;
}

function generateSyncId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Debounced sync function
 */
let syncTimeout = null;
function debouncedSync() {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  syncTimeout = setTimeout(() => {
    syncPendingData();
  }, 2000); // 2 second debounce
}

/**
 * Periodic sync
 */
let syncInterval = null;
function startPeriodicSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
  }
  
  syncInterval = setInterval(() => {
    if (syncState.isOnline && isAuthenticated() && isBackendAvailable()) {
      syncPendingData();
    }
  }, config.SYNC_INTERVAL);
}

function stopPeriodicSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

/**
 * Save/load sync state
 */
function saveSyncState() {
  const stateToSave = {
    lastSyncTime: syncState.lastSyncTime,
    pendingSync: syncState.pendingSync,
    syncErrors: syncState.syncErrors.slice(-10), // Keep only last 10 errors
    migrationCompleted: syncState.migrationCompleted,
    currentSessionId: syncState.currentSessionId
  };
  
  localStorage.setItem('nlpds-sync-state', JSON.stringify(stateToSave));
}

function loadSyncState() {
  try {
    const savedState = localStorage.getItem('nlpds-sync-state');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      syncState.lastSyncTime = parsed.lastSyncTime;
      syncState.pendingSync = parsed.pendingSync || [];
      syncState.syncErrors = parsed.syncErrors || [];
      syncState.migrationCompleted = parsed.migrationCompleted || false;
      syncState.currentSessionId = parsed.currentSessionId || null;
    }
  } catch (error) {
    console.warn('Failed to load sync state:', error);
  }
}

/**
 * Get sync status for UI
 */
export function getSyncStatus() {
  return {
    isOnline: syncState.isOnline,
    isSyncing: syncState.isSyncing,
    lastSyncTime: syncState.lastSyncTime,
    pendingCount: syncState.pendingSync.length,
    errorCount: syncState.syncErrors.length,
    migrationCompleted: syncState.migrationCompleted,
    backendAvailable: isBackendAvailable()
  };
}

/**
 * Manual sync trigger
 */
export async function manualSync() {
  console.log('🔄 Manual sync triggered');
  return await syncPendingData();
}

/**
 * Clear sync errors
 */
export function clearSyncErrors() {
  syncState.syncErrors = [];
  saveSyncState();
}

console.log('✅ DEBUGGING: sync.js geladen');
