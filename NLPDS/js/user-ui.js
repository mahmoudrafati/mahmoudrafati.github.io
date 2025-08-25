/**
 * User Interface Components for NLPDS Authentication and User Management
 * Integrates seamlessly with existing UI design
 */

import { isAuthenticated, getCurrentUser, login, register, logout, updateProfile, addAuthListener, isBackendAvailable } from './auth.js';
import { getSyncStatus, addSyncListener, manualSync } from './sync.js';
import { config } from './config.js';

console.log('🔧 DEBUGGING: user-ui.js wird geladen...');

/**
 * UI component state
 */
const uiState = {
  authModalOpen: false,
  authMode: 'login', // 'login' or 'register'
  userMenuOpen: false,
  syncStatusVisible: false
};

/**
 * Initialize user interface components
 */
export function initializeUserUI() {
  try {
    console.log('🎨 Initializing user UI components...');

    // The user section is now in HTML, just create additional components
    createAuthModal();
    createUserMenu();
    createSyncStatus();

    // Set up event listeners
    setupUIEventListeners();
    setupAuthEventListeners();
    setupSyncEventListeners();

    // Update UI based on current auth state
    updateUserInterface();

    console.log('✅ User UI components initialized');

    // Make openAuthModal globally available for onclick handler
    window.openAuthModal = openAuthModal;
    console.log('🌍 openAuthModal made globally available');
    
    // Test function for debugging
    window.testAuthModal = () => {
      console.log('🧪 Testing auth modal...');
      openAuthModal('login');
    };
    console.log('🧪 Test function added: window.testAuthModal()');

  } catch (error) {
    console.error('❌ User UI initialization failed:', error);
  }
}

/**
 * Create user section in header
 */
function createUserSection() {
  const header = document.querySelector('header .container .flex');
  if (!header) {
    console.warn('❌ Header element not found for user section');
    return;
  }

  // Find the existing right section with data-status and theme-toggle
  const rightSection = header.querySelector('.flex.items-center.space-x-4');
  if (!rightSection) {
    console.warn('❌ Right section not found in header');
    return;
  }

  // Create user section HTML
  const userSectionHTML = `
    <div id="user-section" class="text-sm">
      <!-- Logged out state -->
      <div id="auth-logged-out" class="hidden">
        <button id="login-btn" class="text-primary-600 hover:text-primary-700 transition-colors font-medium">
          👤 Anmelden
        </button>
      </div>
      
      <!-- Logged in state -->
      <div id="auth-logged-in" class="hidden">
        <div class="flex items-center space-x-3">
          <div id="sync-indicator" class="hidden">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✓ Sync
            </span>
          </div>
          <span class="text-gray-600">
            Hallo, <span id="username-display" class="font-medium text-gray-800">Max</span>
          </span>
          <button id="user-menu-btn" class="text-primary-600 hover:text-primary-700 transition-colors p-1 rounded-md hover:bg-primary-50">
            ⚙️
          </button>
        </div>
      </div>
    </div>
  `;

  // Insert before the theme toggle
  const themeToggle = rightSection.querySelector('#theme-toggle');
  if (themeToggle) {
    themeToggle.insertAdjacentHTML('beforebegin', userSectionHTML);
  } else {
    rightSection.insertAdjacentHTML('beforeend', userSectionHTML);
  }
}

/**
 * Create authentication modal
 */
function createAuthModal() {
  console.log('🔧 Creating auth modal...');
  const modalHTML = `
    <div id="auth-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <div class="flex justify-between items-center mb-6">
          <h2 id="auth-modal-title" class="text-xl font-bold text-gray-900">Anmelden</h2>
          <button id="auth-modal-close" class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Login Form -->
        <form id="login-form" class="space-y-4">
          <div>
            <label for="login-username" class="block text-sm font-medium text-gray-700 mb-1">
              Benutzername
            </label>
            <input 
              type="text" 
              id="login-username" 
              required 
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Dein Benutzername"
            >
          </div>
          <div>
            <label for="login-password" class="block text-sm font-medium text-gray-700 mb-1">
              Passwort
            </label>
            <input 
              type="password" 
              id="login-password" 
              required 
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Dein Passwort"
            >
          </div>
          <button 
            type="submit" 
            id="login-submit" 
            class="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
          >
            Anmelden
          </button>
        </form>

        <!-- Register Form -->
        <form id="register-form" class="space-y-4 hidden">
          <div>
            <label for="register-username" class="block text-sm font-medium text-gray-700 mb-1">
              Benutzername
            </label>
            <input 
              type="text" 
              id="register-username" 
              required 
              minlength="3"
              pattern="[a-zA-Z0-9_-]+"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Wähle einen Benutzernamen"
            >
            <p class="text-xs text-gray-500 mt-1">3-50 Zeichen, nur Buchstaben, Zahlen, _ und -</p>
          </div>
          <div>
            <label for="register-email" class="block text-sm font-medium text-gray-700 mb-1">
              E-Mail (optional)
            </label>
            <input 
              type="email" 
              id="register-email" 
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="deine@email.de"
            >
          </div>
          <div>
            <label for="register-display-name" class="block text-sm font-medium text-gray-700 mb-1">
              Anzeigename (optional)
            </label>
            <input 
              type="text" 
              id="register-display-name" 
              maxlength="100"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Wie soll dein Name angezeigt werden?"
            >
          </div>
          <div>
            <label for="register-password" class="block text-sm font-medium text-gray-700 mb-1">
              Passwort
            </label>
            <input 
              type="password" 
              id="register-password" 
              required 
              minlength="6"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Mindestens 6 Zeichen"
            >
          </div>
          <button 
            type="submit" 
            id="register-submit" 
            class="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
          >
            Registrieren
          </button>
        </form>

        <!-- Error Message -->
        <div id="auth-error" class="hidden mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
          <div id="auth-error-message"></div>
        </div>

        <!-- Loading State -->
        <div id="auth-loading" class="hidden mt-4 text-center">
          <div class="inline-flex items-center px-4 py-2 text-sm text-gray-600">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
            Wird verarbeitet...
          </div>
        </div>

        <!-- Mode Switch -->
        <div class="mt-6 text-center text-sm text-gray-600">
          <span id="auth-switch-text">Noch kein Account?</span>
          <button id="auth-mode-switch" class="text-primary-600 hover:text-primary-700 font-medium ml-1">
            Jetzt registrieren
          </button>
        </div>

        <!-- Benefits Info -->
        <div id="auth-benefits" class="mt-4 p-3 bg-blue-50 rounded-md">
          <h4 class="text-sm font-medium text-blue-900 mb-2">🎯 Vorteile eines Accounts:</h4>
          <ul class="text-xs text-blue-700 space-y-1">
            <li>• Fortschritt geräteübergreifend synchronisieren</li>
            <li>• Teilnahme an der Bestenliste</li>
            <li>• Detaillierte Lernstatistiken</li>
            <li>• Offline-Modus mit automatischer Synchronisation</li>
          </ul>
        </div>

        <!-- Offline Notice -->
        <div id="auth-offline-notice" class="hidden mt-4 p-3 bg-yellow-50 rounded-md border border-yellow-200">
          <h4 class="text-sm font-medium text-yellow-800 mb-2">🚀 App läuft vollständig offline!</h4>
          <ul class="text-xs text-yellow-700 space-y-1">
            <li>• Alle Lernfunktionen verfügbar</li>
            <li>• Fortschritt wird lokal gespeichert</li>
            <li>• Keine Anmeldung erforderlich</li>
            <li>• Backend für erweiterte Features optional</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Create user menu dropdown
 */
function createUserMenu() {
  const userMenuHTML = `
    <div id="user-menu" class="hidden absolute right-0 top-12 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
      <div class="py-1">
        <div class="px-4 py-2 text-sm text-gray-700 border-b">
          <div class="font-medium" id="menu-username">Benutzer</div>
          <div class="text-xs text-gray-500" id="menu-user-info">user@example.com</div>
        </div>
        
        <button id="menu-profile" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
          👤 Profil bearbeiten
        </button>
        
        <button id="menu-statistics" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
          📊 Meine Statistiken
        </button>
        
        <button id="menu-leaderboard" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
          🏆 Rangliste
        </button>
        
        <button id="menu-sync-status" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
          🔄 Sync-Status
        </button>
        
        <div class="border-t">
          <button id="menu-logout" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
            🚪 Abmelden
          </button>
        </div>
      </div>
    </div>
  `;

  // Add to user section
  const userSection = document.getElementById('user-section');
  if (userSection) {
    userSection.style.position = 'relative';
    userSection.insertAdjacentHTML('beforeend', userMenuHTML);
  }
}

/**
 * Create sync status indicator
 */
function createSyncStatus() {
  const syncStatusHTML = `
    <div id="sync-status-panel" class="hidden fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm z-40">
      <div class="flex justify-between items-start mb-3">
        <h3 class="font-medium text-gray-900">🔄 Synchronisation</h3>
        <button id="sync-status-close" class="text-gray-400 hover:text-gray-600">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span>Status:</span>
          <span id="sync-status-indicator" class="font-medium">Online</span>
        </div>
        <div class="flex justify-between">
          <span>Letzte Sync:</span>
          <span id="sync-last-time">Nie</span>
        </div>
        <div class="flex justify-between">
          <span>Warteschlange:</span>
          <span id="sync-pending-count">0</span>
        </div>
      </div>
      
      <button id="manual-sync-btn" class="w-full mt-3 bg-primary-600 text-white py-2 px-3 rounded-md text-sm hover:bg-primary-700 transition-colors">
        Jetzt synchronisieren
      </button>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', syncStatusHTML);
}

/**
 * Set up UI event listeners
 */
function setupUIEventListeners() {
  // Login button
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    console.log('✅ Login button found, adding event listener');
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('🔘 Login button clicked');
      openAuthModal('login');
    });
  } else {
    console.warn('❌ Login button not found');
  }

  // Auth modal close
  document.getElementById('auth-modal-close')?.addEventListener('click', closeAuthModal);
  document.getElementById('auth-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'auth-modal') {
      closeAuthModal();
    }
  });

  // Auth mode switch
  document.getElementById('auth-mode-switch')?.addEventListener('click', switchAuthMode);

  // Form submissions
  document.getElementById('login-form')?.addEventListener('submit', handleLoginSubmit);
  document.getElementById('register-form')?.addEventListener('submit', handleRegisterSubmit);

  // User menu
  document.getElementById('user-menu-btn')?.addEventListener('click', toggleUserMenu);
  document.getElementById('menu-logout')?.addEventListener('click', handleLogout);
  document.getElementById('menu-statistics')?.addEventListener('click', () => {
    window.location.hash = '#/statistics';
    toggleUserMenu(); // Close menu
  });
  document.getElementById('menu-leaderboard')?.addEventListener('click', () => {
    window.location.hash = '#/leaderboard';
    toggleUserMenu(); // Close menu
  });
  document.getElementById('menu-sync-status')?.addEventListener('click', toggleSyncStatus);

  // Sync status panel
  document.getElementById('sync-status-close')?.addEventListener('click', () => {
    document.getElementById('sync-status-panel')?.classList.add('hidden');
  });
  document.getElementById('manual-sync-btn')?.addEventListener('click', handleManualSync);

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#user-menu') && !e.target.closest('#user-menu-btn')) {
      document.getElementById('user-menu')?.classList.add('hidden');
      uiState.userMenuOpen = false;
    }
  });
}

/**
 * Set up authentication event listeners
 */
function setupAuthEventListeners() {
  addAuthListener('login', (user) => {
    updateUserInterface();
    closeAuthModal();
    showSuccessMessage(`Willkommen zurück, ${user.displayName}!`);
  });

  addAuthListener('logout', () => {
    updateUserInterface();
    closeAuthModal();
    showSuccessMessage('Du wurdest erfolgreich abgemeldet.');
  });

  addAuthListener('error', (error) => {
    showAuthError(error.message);
  });
}

/**
 * Set up sync event listeners
 */
function setupSyncEventListeners() {
  addSyncListener('syncStart', () => {
    updateSyncIndicator('syncing');
  });

  addSyncListener('syncComplete', (data) => {
    updateSyncIndicator('online');
    updateSyncStatus();
  });

  addSyncListener('syncError', (error) => {
    updateSyncIndicator('error');
  });
}

/**
 * Update user interface based on authentication state
 */
function updateUserInterface() {
  const isAuth = isAuthenticated();
  const user = getCurrentUser();

  // Toggle auth sections
  const loggedOut = document.getElementById('auth-logged-out');
  const loggedIn = document.getElementById('auth-logged-in');

  if (loggedOut && loggedIn) {
    if (isAuth && user) {
      loggedOut.classList.add('hidden');
      loggedIn.classList.remove('hidden');
      
      // Update user info
      const usernameDisplay = document.getElementById('username-display');
      const menuUsername = document.getElementById('menu-username');
      const menuUserInfo = document.getElementById('menu-user-info');
      
      if (usernameDisplay) usernameDisplay.textContent = user.displayName || user.username;
      if (menuUsername) menuUsername.textContent = user.displayName || user.username;
      if (menuUserInfo) menuUserInfo.textContent = user.email || user.username;

      // Update leaderboard status
      updateLeaderboardToggle(user.showInLeaderboard);
      
      // Show sync indicator if applicable
      updateSyncIndicator();
      
    } else {
      // Always show login button (even without backend)
      loggedOut.classList.remove('hidden');
      loggedIn.classList.add('hidden');
    }
  }
}

/**
 * Authentication modal functions
 */
function openAuthModal(mode = 'login') {
  console.log('🚪 Opening auth modal, mode:', mode);
  uiState.authMode = mode;
  uiState.authModalOpen = true;

  const modal = document.getElementById('auth-modal');
  const title = document.getElementById('auth-modal-title');
  
  if (!modal) {
    console.error('❌ Auth modal not found!');
    return;
  }
  
  console.log('✅ Auth modal found, showing...');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const switchText = document.getElementById('auth-switch-text');
  const switchBtn = document.getElementById('auth-mode-switch');

  if (mode === 'login') {
    title.textContent = 'Anmelden';
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    switchText.textContent = 'Noch kein Account?';
    switchBtn.textContent = 'Jetzt registrieren';
  } else {
    title.textContent = 'Registrieren';
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    switchText.textContent = 'Bereits einen Account?';
    switchBtn.textContent = 'Jetzt anmelden';
  }

  // Show appropriate benefits section based on backend availability
  const benefitsSection = document.getElementById('auth-benefits');
  const offlineNotice = document.getElementById('auth-offline-notice');
  
  if (isBackendAvailable()) {
    benefitsSection?.classList.remove('hidden');
    offlineNotice?.classList.add('hidden');
  } else {
    benefitsSection?.classList.add('hidden');
    offlineNotice?.classList.remove('hidden');
  }

  hideAuthError();
  hideAuthLoading();
  modal.classList.remove('hidden');
}

function closeAuthModal() {
  uiState.authModalOpen = false;
  document.getElementById('auth-modal')?.classList.add('hidden');
  
  // Clear forms
  document.getElementById('login-form')?.reset();
  document.getElementById('register-form')?.reset();
}

function switchAuthMode() {
  const newMode = uiState.authMode === 'login' ? 'register' : 'login';
  openAuthModal(newMode);
}

/**
 * Form handlers
 */
async function handleLoginSubmit(e) {
  e.preventDefault();
  
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  if (!username || !password) {
    showAuthError('Bitte alle Felder ausfüllen.');
    return;
  }

  // Check if backend is available
  if (!isBackendAvailable()) {
    showAuthError('🔧 Backend nicht verfügbar. Die App funktioniert vollständig ohne Anmeldung - alle Features sind im Gastmodus verfügbar!');
    return;
  }

  showAuthLoading();
  hideAuthError();

  const result = await login(username, password);
  
  hideAuthLoading();

  if (!result.success) {
    showAuthError(result.error || 'Anmeldung fehlgeschlagen.');
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();

  const username = document.getElementById('register-username').value.trim();
  const email = document.getElementById('register-email').value.trim() || null;
  const displayName = document.getElementById('register-display-name').value.trim() || null;
  const password = document.getElementById('register-password').value;

  if (!username || !password) {
    showAuthError('Benutzername und Passwort sind erforderlich.');
    return;
  }

  if (password.length < 6) {
    showAuthError('Passwort muss mindestens 6 Zeichen lang sein.');
    return;
  }

  // Check if backend is available
  if (!isBackendAvailable()) {
    showAuthError('🔧 Backend nicht verfügbar. Die App funktioniert vollständig ohne Anmeldung - alle Features sind im Gastmodus verfügbar!');
    return;
  }

  showAuthLoading();
  hideAuthError();

  const result = await register(username, password, email, displayName);
  
  hideAuthLoading();

  if (result.success) {
    // Registration successful - close modal and show welcome
    closeAuthModal();
    console.log('✅ Registration successful, user logged in:', result.user.username);
    
    // Show success notification
    setTimeout(() => {
      showNotification(`Willkommen, ${result.user.displayName || result.user.username}! Sie sind jetzt angemeldet.`, 'success');
    }, 100);
  } else {
    showAuthError(result.error || 'Registrierung fehlgeschlagen.');
  }
}

/**
 * User menu functions
 */
function toggleUserMenu() {
  const menu = document.getElementById('user-menu');
  uiState.userMenuOpen = !uiState.userMenuOpen;
  
  if (uiState.userMenuOpen) {
    menu?.classList.remove('hidden');
  } else {
    menu?.classList.add('hidden');
  }
}

async function handleLogout() {
  await logout();
  document.getElementById('user-menu')?.classList.add('hidden');
  uiState.userMenuOpen = false;
}

function toggleSyncStatus() {
  const panel = document.getElementById('sync-status-panel');
  uiState.syncStatusVisible = !uiState.syncStatusVisible;
  
  if (uiState.syncStatusVisible) {
    panel?.classList.remove('hidden');
    updateSyncStatus();
  } else {
    panel?.classList.add('hidden');
  }
  
  document.getElementById('user-menu')?.classList.add('hidden');
  uiState.userMenuOpen = false;
}

async function toggleLeaderboardParticipation() {
  const user = getCurrentUser();
  if (!user) return;

  try {
    const newStatus = !user.showInLeaderboard;
    const result = await updateProfile({ showInLeaderboard: newStatus });
    
    if (result.success) {
      updateLeaderboardToggle(newStatus);
      showSuccessMessage(
        newStatus 
          ? 'Du nimmst jetzt an der Bestenliste teil!' 
          : 'Du wurdest aus der Bestenliste entfernt.'
      );
    }
  } catch (error) {
    showErrorMessage('Fehler beim Aktualisieren der Bestenlisten-Einstellung.');
  }
}

/**
 * Sync functions
 */
async function handleManualSync() {
  const btn = document.getElementById('manual-sync-btn');
  if (!btn) return;

  const originalText = btn.textContent;
  btn.textContent = 'Synchronisiere...';
  btn.disabled = true;

  try {
    await manualSync();
    updateSyncStatus();
    showSuccessMessage('Synchronisation erfolgreich!');
  } catch (error) {
    showErrorMessage('Synchronisation fehlgeschlagen.');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

function updateSyncIndicator(status = null) {
  const indicator = document.getElementById('sync-indicator');
  if (!indicator || !isAuthenticated()) {
    indicator?.classList.add('hidden');
    return;
  }

  const syncStatus = getSyncStatus();
  const currentStatus = status || (syncStatus.isSyncing ? 'syncing' : 
                                   syncStatus.isOnline ? 'online' : 'offline');

  let html = '';
  switch (currentStatus) {
    case 'syncing':
      html = '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">🔄 Sync...</span>';
      break;
    case 'online':
      html = '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ Sync</span>';
      break;
    case 'offline':
      html = '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">⚠ Offline</span>';
      break;
    case 'error':
      html = '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">✗ Fehler</span>';
      break;
  }

  indicator.innerHTML = html;
  indicator.classList.remove('hidden');
}

function updateSyncStatus() {
  const syncStatus = getSyncStatus();
  
  // Update status indicator
  const statusIndicator = document.getElementById('sync-status-indicator');
  if (statusIndicator) {
    statusIndicator.textContent = syncStatus.isSyncing ? 'Synchronisiert...' :
                                  syncStatus.isOnline ? 'Online' : 'Offline';
  }

  // Update last sync time
  const lastTimeEl = document.getElementById('sync-last-time');
  if (lastTimeEl) {
    lastTimeEl.textContent = syncStatus.lastSyncTime 
      ? new Date(syncStatus.lastSyncTime).toLocaleString('de-DE')
      : 'Nie';
  }

  // Update pending count
  const pendingCountEl = document.getElementById('sync-pending-count');
  if (pendingCountEl) {
    pendingCountEl.textContent = syncStatus.pendingCount.toString();
  }
}

function updateLeaderboardToggle(showInLeaderboard) {
  const status = document.getElementById('leaderboard-status');
  if (status) {
    status.textContent = showInLeaderboard ? 'Ein' : 'Aus';
  }
}

/**
 * Message functions
 */
function showAuthError(message) {
  const errorEl = document.getElementById('auth-error');
  const messageEl = document.getElementById('auth-error-message');
  
  if (errorEl && messageEl) {
    messageEl.textContent = message;
    errorEl.classList.remove('hidden');
  }
}

function hideAuthError() {
  document.getElementById('auth-error')?.classList.add('hidden');
}

function showAuthLoading() {
  document.getElementById('auth-loading')?.classList.remove('hidden');
}

function hideAuthLoading() {
  document.getElementById('auth-loading')?.classList.add('hidden');
}

function showSuccessMessage(message) {
  // Create a temporary success toast
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md shadow-lg z-50';
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function showErrorMessage(message) {
  // Create a temporary error toast
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md shadow-lg z-50';
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

console.log('✅ DEBUGGING: user-ui.js geladen');
