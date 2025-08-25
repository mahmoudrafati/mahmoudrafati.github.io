/**
 * Authentication Manager for NLPDS Learning Platform
 * Handles user login, registration, and session management
 */

import { config, getApiUrl, API_ENDPOINTS } from './config.js';

console.log('🔧 DEBUGGING: auth.js wird geladen...');

/**
 * Authentication state and utilities
 */
export const authState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  backendAvailable: false
};

/**
 * Event system for authentication state changes
 */
const authListeners = {
  login: [],
  logout: [],
  userUpdate: [],
  error: []
};

export function addAuthListener(event, callback) {
  if (authListeners[event]) {
    authListeners[event].push(callback);
  }
}

function notifyAuthListeners(event, data) {
  if (authListeners[event]) {
    authListeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Auth listener error:', error);
      }
    });
  }
}

/**
 * API utility with authentication
 */
async function apiRequest(endpoint, options = {}) {
  const url = getApiUrl(endpoint);
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add auth token if available
  if (authState.token) {
    headers.Authorization = `Bearer ${authState.token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle token expiration
    if (response.status === 401 && authState.isAuthenticated) {
      console.warn('Authentication expired, logging out...');
      await logout();
      throw new Error('Authentication expired');
    }

    const data = await response.json();

    if (!response.ok) {
      // Create a more detailed error object with status and response data
      const error = new Error(data.message || data.error || 'API request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Initialize authentication on app startup
 */
export async function initializeAuth() {
  try {
    console.log('🔐 Initializing authentication...');
    
    // Check if backend is available
    authState.backendAvailable = await checkBackendAvailability();
    
    if (!authState.backendAvailable) {
      console.warn('⚠️ Backend not available, running in offline mode');
      return false;
    }

    // Try to restore session from localStorage
    const storedToken = localStorage.getItem(config.AUTH_TOKEN_KEY);
    const storedUser = localStorage.getItem(config.AUTH_USER_KEY);

    if (storedToken && storedUser) {
      try {
        authState.token = storedToken;
        authState.user = JSON.parse(storedUser);
        authState.isAuthenticated = true;

        // Verify token with backend
        const userData = await apiRequest(API_ENDPOINTS.ME);
        updateAuthState(userData.user, storedToken);
        
        console.log('✅ Session restored for user:', authState.user.username);
        notifyAuthListeners('login', authState.user);
        return true;

      } catch (error) {
        console.warn('⚠️ Stored session invalid, clearing...');
        clearStoredAuth();
      }
    }

    console.log('ℹ️ No valid session found');
    return false;

  } catch (error) {
    console.error('❌ Auth initialization failed:', error);
    return false;
  }
}

/**
 * Check if backend API is available
 */
async function checkBackendAvailability() {
  try {
    const response = await fetch(getApiUrl('/health'), {
      method: 'GET',
      timeout: 3000
    });
    return response.ok;
  } catch (error) {
    console.log('ℹ️ Backend not available, enabling demo mode');
    return false;
  }
}

/**
 * User registration
 */
export async function register(username, password, email = null, displayName = null) {
  try {
    authState.isLoading = true;

    // Check if backend is available
    if (authState.backendAvailable) {
      // Try backend registration
      const data = await apiRequest(API_ENDPOINTS.REGISTER, {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
          email,
          displayName: displayName || username
        })
      });

      updateAuthState(data.user, data.token);
      notifyAuthListeners('login', authState.user);

      console.log('✅ User registered successfully via backend:', username);
      return { success: true, user: data.user };
    } else {
      // Demo mode registration
      console.log('🧪 Demo mode: Backend not available, creating demo user via registration');
      
      // Basic validation
      if (!username || username.length < 2) {
        throw new Error('Benutzername muss mindestens 2 Zeichen lang sein');
      }
      if (!password || password.length < 4) {
        throw new Error('Passwort muss mindestens 4 Zeichen lang sein');
      }

      // Create demo user
      const demoUser = {
        id: 'demo-' + Date.now(),
        username: username,
        displayName: displayName || username,
        email: email || `${username}@demo.local`,
        createdAt: new Date().toISOString(),
        showInLeaderboard: true
      };

      const demoToken = 'demo-token-' + Date.now();

      updateAuthState(demoUser, demoToken);
      notifyAuthListeners('login', authState.user);

      console.log('✅ Demo user registered successfully:', username);
      return { success: true, user: demoUser };
    }

  } catch (error) {
    console.error('❌ Registration failed:', error);
    
    // Handle specific error types with better messages
    let errorMessage = error.message;
    
    if (error.status === 409) {
      // User already exists - provide specific feedback
      if (error.data?.field === 'username') {
        errorMessage = `Benutzername "${username}" ist bereits vergeben. Bitte wählen Sie einen anderen.`;
      } else if (error.data?.field === 'email') {
        errorMessage = `E-Mail-Adresse ist bereits registriert. Möchten Sie sich stattdessen anmelden?`;
      } else {
        errorMessage = 'Benutzername oder E-Mail bereits vergeben.';
      }
    } else if (error.status === 400) {
      // Validation error - show specific field errors if available
      if (error.data?.details && Array.isArray(error.data.details)) {
        const fieldErrors = error.data.details.map(detail => detail.msg).join(' ');
        errorMessage = fieldErrors;
      } else {
        errorMessage = 'Eingabedaten sind nicht gültig. Bitte überprüfen Sie Ihre Angaben.';
      }
    }
    
    notifyAuthListeners('error', { type: 'registration', message: errorMessage });
    return { success: false, error: errorMessage };
  } finally {
    authState.isLoading = false;
  }
}

/**
 * User login
 */
export async function login(username, password) {
  try {
    authState.isLoading = true;

    // Check if backend is available
    if (authState.backendAvailable) {
      // Try backend login
      const data = await apiRequest(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        body: JSON.stringify({
          username,
          password
        })
      });

      updateAuthState(data.user, data.token);
      notifyAuthListeners('login', authState.user);

      console.log('✅ User logged in successfully via backend:', username);
      return { success: true, user: data.user };
    } else {
      // Demo mode - allow any login for testing
      console.log('🧪 Demo mode: Backend not available, creating demo user');
      
      // Basic validation
      if (!username || username.length < 2) {
        throw new Error('Benutzername muss mindestens 2 Zeichen lang sein');
      }
      if (!password || password.length < 4) {
        throw new Error('Passwort muss mindestens 4 Zeichen lang sein');
      }

      // Create demo user
      const demoUser = {
        id: 'demo-' + Date.now(),
        username: username,
        displayName: username,
        email: `${username}@demo.local`,
        createdAt: new Date().toISOString(),
        showInLeaderboard: true
      };

      const demoToken = 'demo-token-' + Date.now();

      updateAuthState(demoUser, demoToken);
      notifyAuthListeners('login', authState.user);

      console.log('✅ Demo user logged in successfully:', username);
      return { success: true, user: demoUser };
    }

  } catch (error) {
    console.error('❌ Login failed:', error);
    
    // Provide user-friendly error messages
    let errorMessage = error.message;
    if (error.status === 401) {
      errorMessage = 'Benutzername oder Passwort ist falsch.';
    } else if (error.status === 429) {
      errorMessage = 'Zu viele Login-Versuche. Bitte warten Sie einen Moment.';
    }
    
    notifyAuthListeners('error', { type: 'login', message: errorMessage });
    return { success: false, error: errorMessage };
  } finally {
    authState.isLoading = false;
  }
}

/**
 * User logout
 */
export async function logout() {
  try {
    if (authState.isAuthenticated && authState.backendAvailable) {
      // Notify backend of logout
      await apiRequest(API_ENDPOINTS.LOGOUT, {
        method: 'POST'
      });
    }
  } catch (error) {
    console.warn('Logout API call failed:', error);
  }

  // Clear local state regardless of API call success
  clearAuthState();
  notifyAuthListeners('logout');
  
  console.log('✅ User logged out');
}

/**
 * Update user profile
 */
export async function updateProfile(updates) {
  try {
    if (!authState.isAuthenticated) {
      throw new Error('Not authenticated');
    }

    const data = await apiRequest(API_ENDPOINTS.PROFILE, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });

    updateAuthState(data.user, authState.token);
    notifyAuthListeners('userUpdate', authState.user);

    console.log('✅ Profile updated successfully');
    return { success: true, user: data.user };

  } catch (error) {
    console.error('❌ Profile update failed:', error);
    notifyAuthListeners('error', { type: 'profile', message: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Refresh authentication token
 */
export async function refreshToken() {
  try {
    if (!authState.isAuthenticated) {
      return false;
    }

    const data = await apiRequest(API_ENDPOINTS.REFRESH, {
      method: 'POST'
    });

    authState.token = data.token;
    localStorage.setItem(config.AUTH_TOKEN_KEY, data.token);

    console.log('✅ Token refreshed successfully');
    return true;

  } catch (error) {
    console.error('❌ Token refresh failed:', error);
    await logout();
    return false;
  }
}

/**
 * Update authentication state
 */
function updateAuthState(user, token) {
  authState.user = user;
  authState.token = token;
  authState.isAuthenticated = true;

  // Store in localStorage
  localStorage.setItem(config.AUTH_TOKEN_KEY, token);
  localStorage.setItem(config.AUTH_USER_KEY, JSON.stringify(user));
}

/**
 * Clear authentication state
 */
function clearAuthState() {
  authState.user = null;
  authState.token = null;
  authState.isAuthenticated = false;
  clearStoredAuth();
}

/**
 * Clear stored authentication data
 */
function clearStoredAuth() {
  localStorage.removeItem(config.AUTH_TOKEN_KEY);
  localStorage.removeItem(config.AUTH_USER_KEY);
}

/**
 * Get current user
 */
export function getCurrentUser() {
  return authState.user;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return authState.isAuthenticated && authState.user && authState.token;
}

/**
 * Check if backend is available
 */
export function isBackendAvailable() {
  return authState.backendAvailable;
}

/**
 * Get authentication token
 */
export function getAuthToken() {
  return authState.token;
}

/**
 * Export API request utility for other modules
 */
export { apiRequest };

console.log('✅ DEBUGGING: auth.js geladen');
