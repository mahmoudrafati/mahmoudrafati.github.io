/**
 * Leaderboard Manager for NLPDS Learning Platform
 * Handles leaderboard data fetching, sorting, filtering, and rendering
 */

import { isAuthenticated, isBackendAvailable, apiRequest, getCurrentUser } from './auth.js';
import { getUserStatistics } from './store.js';
import { config, API_ENDPOINTS } from './config.js';
import { showLeaderboardLoading, showLeaderboardContent, showLeaderboardEmpty } from './animations.js';

console.log('🔧 DEBUGGING: leaderboard.js wird geladen...');

/**
 * Leaderboard state
 */
const leaderboardState = {
    data: [],
    sortBy: 'total_questions',
    filterBy: 'all',
    isLoading: false,
    lastUpdated: null
};

/**
 * Fetches leaderboard data from backend or creates mock data
 */
export async function fetchLeaderboardData() {
    leaderboardState.isLoading = true;
    showLeaderboardLoading();
    
    try {
        if (isBackendAvailable()) {
            console.log('📊 Fetching leaderboard from backend...');
            
            const params = new URLSearchParams({
                sortBy: leaderboardState.sortBy,
                filterBy: leaderboardState.filterBy,
                limit: '50'
            });
            
            const response = await apiRequest(`${API_ENDPOINTS.LEADERBOARD}?${params}`);
            leaderboardState.data = response.leaderboard || [];
            leaderboardState.lastUpdated = new Date().toISOString();
            
            console.log(`✅ Leaderboard loaded: ${leaderboardState.data.length} entries`);
            
        } else {
            // Fallback to mock/local data
            console.log('📊 Creating mock leaderboard data...');
            leaderboardState.data = await createMockLeaderboardData();
            leaderboardState.lastUpdated = new Date().toISOString();
        }
        
        renderLeaderboardTable();
        
    } catch (error) {
        console.error('❌ Failed to fetch leaderboard:', error);
        
        // Show fallback data or empty state
        if (leaderboardState.data.length === 0) {
            showLeaderboardEmpty();
        }
    } finally {
        leaderboardState.isLoading = false;
    }
}

/**
 * Creates mock leaderboard data when backend is unavailable
 */
async function createMockLeaderboardData() {
    const mockData = [];
    
    // Add current user if authenticated
    if (isAuthenticated()) {
        const currentUser = getCurrentUser();
        const userStats = getUserStatistics();
        
        mockData.push({
            rank: 1,
            username: currentUser.displayName || currentUser.username,
            displayName: currentUser.displayName || currentUser.username,
            totalQuestions: userStats.totalQuestions,
            accuracy: userStats.accuracyRate,
            timeInvested: userStats.timeInvested,
            learningStreak: userStats.learningStreak,
            totalSessions: userStats.totalSessions,
            score: calculateLeaderboardScore(userStats),
            isCurrentUser: true,
            lastActive: new Date().toISOString()
        });
    }
    
    // Add some mock competitors
    const mockUsers = [
        { username: 'NLP_Expert', displayName: 'NLP Expert', questions: 180, accuracy: 0.92, time: 7200000, streak: 12, sessions: 25 },
        { username: 'StudyBot', displayName: 'Study Bot', questions: 165, accuracy: 0.89, time: 6800000, streak: 8, sessions: 22 },
        { username: 'LinguaLearner', displayName: 'Lingua Learner', questions: 150, accuracy: 0.87, time: 6200000, streak: 5, sessions: 20 },
        { username: 'DataScientist', displayName: 'Data Scientist', questions: 142, accuracy: 0.85, time: 5900000, streak: 15, sessions: 18 },
        { username: 'AIEnthusiast', displayName: 'AI Enthusiast', questions: 128, accuracy: 0.83, time: 5400000, streak: 3, sessions: 16 },
        { username: 'MLStudent', displayName: 'ML Student', questions: 115, accuracy: 0.81, time: 4800000, streak: 7, sessions: 14 },
        { username: 'CodeCrafter', displayName: 'Code Crafter', questions: 98, accuracy: 0.79, time: 4200000, streak: 2, sessions: 12 },
        { username: 'TechNinja', displayName: 'Tech Ninja', questions: 87, accuracy: 0.76, time: 3800000, streak: 9, sessions: 11 }
    ];
    
    mockUsers.forEach((user, index) => {
        const userStats = {
            totalQuestions: user.questions,
            accuracyRate: user.accuracy,
            timeInvested: user.time,
            learningStreak: user.streak,
            totalSessions: user.sessions
        };
        
        mockData.push({
            rank: index + 2, // Start after current user
            username: user.username,
            displayName: user.displayName,
            totalQuestions: user.questions,
            accuracy: user.accuracy,
            timeInvested: user.time,
            learningStreak: user.streak,
            totalSessions: user.sessions,
            score: calculateLeaderboardScore(userStats),
            isCurrentUser: false,
            lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        });
    });
    
    return mockData.sort((a, b) => b.score - a.score).map((user, index) => ({
        ...user,
        rank: index + 1
    }));
}

/**
 * Calculates leaderboard score based on multiple factors
 */
function calculateLeaderboardScore(stats) {
    const weights = {
        accuracy: 0.4,
        completion: 0.3,
        consistency: 0.2,
        efficiency: 0.1
    };
    
    const accuracy = (stats.accuracyRate || 0) * 100;
    const completion = Math.min(stats.totalQuestions / 100, 1) * 100;
    const consistency = Math.min(stats.learningStreak / 30, 1) * 100;
    const efficiency = Math.min((stats.timeInvested / (1000 * 60 * 60)) / 10, 1) * 100;
    
    return (
        accuracy * weights.accuracy +
        completion * weights.completion +
        consistency * weights.consistency +
        efficiency * weights.efficiency
    );
}

/**
 * Renders the leaderboard table
 */
function renderLeaderboardTable() {
    const tbody = document.getElementById('leaderboard-rows');
    if (!tbody) return;
    
    if (leaderboardState.data.length === 0) {
        showLeaderboardEmpty();
        return;
    }
    
    const filteredData = filterLeaderboardData(leaderboardState.data);
    const sortedData = sortLeaderboardData(filteredData);
    
    tbody.innerHTML = sortedData.map(user => renderLeaderboardRow(user)).join('');
    showLeaderboardContent();
}

/**
 * Renders a single leaderboard row
 */
function renderLeaderboardRow(user) {
    const isCurrentUser = user.isCurrentUser;
    const hoursInvested = Math.round(user.timeInvested / (1000 * 60 * 60 * 10)) / 100; // Round to 2 decimal places
    
    return `
        <tr class="${isCurrentUser ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'} transition-colors">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <span class="text-lg font-bold ${getRankColor(user.rank)}">#${user.rank}</span>
                    ${user.rank <= 3 ? getRankIcon(user.rank) : ''}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center space-x-3">
                    <div class="flex-shrink-0 h-8 w-8">
                        <div class="h-8 w-8 rounded-full ${isCurrentUser ? 'bg-blue-500' : 'bg-gray-400'} flex items-center justify-center">
                            <span class="text-sm font-medium text-white">
                                ${user.displayName.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <div>
                        <div class="text-sm font-medium text-gray-900">
                            ${user.displayName}
                            ${isCurrentUser ? '<span class="ml-2 text-blue-600 font-bold">(Du)</span>' : ''}
                        </div>
                        <div class="text-sm text-gray-500">${formatLastActive(user.lastActive)}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${user.totalQuestions}</div>
                <div class="text-sm text-gray-500">${user.totalSessions} Sessions</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="text-sm font-medium text-gray-900">${Math.round(user.accuracy * 100)}%</div>
                    <div class="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div class="bg-green-500 h-2 rounded-full" style="width: ${user.accuracy * 100}%"></div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${hoursInvested}h</div>
                <div class="text-sm text-gray-500">${Math.round(user.timeInvested / (1000 * 60))} min</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <span class="text-sm font-medium text-gray-900">${user.learningStreak}</span>
                    ${user.learningStreak > 0 ? '<span class="ml-1 text-orange-500">🔥</span>' : ''}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreBadgeColor(user.score)}">
                    ${Math.round(user.score)} pts
                </span>
            </td>
        </tr>
    `;
}

/**
 * Helper functions for rendering
 */
function getRankColor(rank) {
    switch (rank) {
        case 1: return 'text-yellow-600';
        case 2: return 'text-gray-600';
        case 3: return 'text-yellow-700';
        default: return 'text-gray-900';
    }
}

function getRankIcon(rank) {
    switch (rank) {
        case 1: return '<span class="ml-1 text-yellow-500">🥇</span>';
        case 2: return '<span class="ml-1 text-gray-400">🥈</span>';
        case 3: return '<span class="ml-1 text-yellow-600">🥉</span>';
        default: return '';
    }
}

function getScoreBadgeColor(score) {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    if (score >= 40) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
}

function formatLastActive(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Heute aktiv';
    if (diffDays === 1) return 'Gestern aktiv';
    if (diffDays < 7) return `Vor ${diffDays} Tagen`;
    return date.toLocaleDateString('de-DE', { month: 'short', day: 'numeric' });
}

/**
 * Filters leaderboard data based on current filter
 */
function filterLeaderboardData(data) {
    switch (leaderboardState.filterBy) {
        case 'active':
            // Active in last 7 days
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return data.filter(user => new Date(user.lastActive) >= sevenDaysAgo);
            
        case 'streak':
            // Users with learning streak
            return data.filter(user => user.learningStreak > 0);
            
        default:
            return data;
    }
}

/**
 * Sorts leaderboard data based on current sort criteria
 */
function sortLeaderboardData(data) {
    return [...data].sort((a, b) => {
        switch (leaderboardState.sortBy) {
            case 'total_questions':
                return b.totalQuestions - a.totalQuestions;
            case 'accuracy':
                return b.accuracy - a.accuracy;
            case 'time_invested':
                return b.timeInvested - a.timeInvested;
            case 'learning_streak':
                return b.learningStreak - a.learningStreak;
            default:
                return b.score - a.score;
        }
    }).map((user, index) => ({ ...user, rank: index + 1 }));
}

/**
 * Updates sort criteria and refreshes leaderboard
 */
export function updateLeaderboardSort(sortBy) {
    leaderboardState.sortBy = sortBy;
    renderLeaderboardTable();
}

/**
 * Updates filter criteria and refreshes leaderboard
 */
export function updateLeaderboardFilter(filterBy) {
    leaderboardState.filterBy = filterBy;
    renderLeaderboardTable();
}

/**
 * Refreshes leaderboard data
 */
export function refreshLeaderboard() {
    return fetchLeaderboardData();
}

/**
 * Gets current leaderboard state
 */
export function getLeaderboardState() {
    return { ...leaderboardState };
}

console.log('✅ DEBUGGING: leaderboard.js geladen');
