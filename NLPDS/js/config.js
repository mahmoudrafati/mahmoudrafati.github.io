/**
 * Configuration for NLPDS Learning Platform
 * Backend API integration settings
 */

// Detect environment
const isLocalhost = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1';

const isDevelopment = isLocalhost || window.location.protocol === 'file:';

export const config = {
  // API Configuration
  API_BASE_URL: isDevelopment 
    ? 'http://localhost:3000/api'
    : 'https://nlpds-backend.vercel.app/api', // Replace with your actual backend URL
  
  // Authentication
  AUTH_TOKEN_KEY: 'nlpds-auth-token',
  AUTH_USER_KEY: 'nlpds-user-data',
  
  // Sync Configuration
  SYNC_INTERVAL: 30000, // 30 seconds
  OFFLINE_MODE: true,   // Allow offline usage
  AUTO_SYNC: true,      // Automatically sync when online
  
  // Leaderboard Configuration
  LEADERBOARD: {
    DEFAULT_CATEGORY: 'weekly',
    REFRESH_INTERVAL: 300000, // 5 minutes
    MAX_ENTRIES: 50,
    CACHE_DURATION: 300000 // 5 minutes
  },
  
  // UI Configuration
  UI: {
    SHOW_AUTH_BUTTON: true,
    SHOW_LEADERBOARD: true,
    SHOW_PROGRESS_SYNC: true,
    ANIMATION_DURATION: 300,
    SHOW_AUTH_EVEN_OFFLINE: true  // Show auth UI even when backend unavailable
  },
  
  // Progress Migration
  MIGRATION: {
    LEGACY_STORAGE_KEY: 'nlp-learning-app',
    MIGRATION_FLAG_KEY: 'nlpds-progress-migrated'
  },
  
  // Error Handling
  ERROR_RETRY_ATTEMPTS: 3,
  ERROR_RETRY_DELAY: 1000, // 1 second
  
  // Debug Mode
  DEBUG: isDevelopment,
  
  // Feature Flags
  FEATURES: {
    USER_AUTHENTICATION: true,
    PROGRESS_SYNC: true,
    LEADERBOARD: true,
    GUEST_MODE: true,
    ACHIEVEMENTS: false // Future feature
  }
};

// API endpoints for easy reference
export const API_ENDPOINTS = {
  // Authentication
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  PROFILE: '/auth/profile',
  REFRESH: '/auth/refresh',
  
  // Progress
  PROGRESS: '/progress',
  PROGRESS_SYNC: '/progress/sync',
  PROGRESS_ANSWER: '/progress/answer',
  PROGRESS_STATS: '/progress/stats',
  PROGRESS_USER_STATS: '/progress/user-stats',
  
  // Sessions
  SESSIONS: '/progress/sessions',
  SESSION_CREATE: '/progress/session',
  SESSION_UPDATE: '/progress/session',
  
  // Leaderboard
  LEADERBOARD: '/leaderboard',
  LEADERBOARD_OPT_IN: '/leaderboard/opt-in',
  LEADERBOARD_OPT_OUT: '/leaderboard/opt-out',
  LEADERBOARD_MY_SCORE: '/leaderboard/my-score'
};

// Utility function to get full API URL
export function getApiUrl(endpoint) {
  return config.API_BASE_URL + endpoint;
}

// Environment detection utilities
export const environment = {
  isDevelopment,
  isProduction: !isDevelopment,
  isLocalhost,
  
  // Check if backend is available
  async checkBackendHealth() {
    try {
      const response = await fetch(getApiUrl('/health'), {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      console.warn('Backend health check failed:', error.message);
      return false;
    }
  }
};

// Log configuration in development
if (config.DEBUG) {
  console.log('🔧 NLPDS Configuration:', {
    environment: isDevelopment ? 'development' : 'production',
    apiBaseUrl: config.API_BASE_URL,
    features: config.FEATURES
  });
}
