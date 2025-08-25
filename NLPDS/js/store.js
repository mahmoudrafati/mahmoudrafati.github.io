/**
 * Global state management and data persistence
 * Handles questions, filters, session state, and localStorage
 */

console.log('🔧 DEBUGGING: store.js wird geladen...');

/**
 * Global application state
 */
export const state = {
    // Fragen-Daten
    questions: [],
    originalSources: [], // Tracking der geladenen Dateien
    
    // Filter und Suche
    filters: {
        topics: [],
        types: [],
        search: '',
        activeTopics: new Set(),
        activeTypes: new Set(),
        showImageQuestions: false // Bildbasierte Fragen standardmäßig ausblenden
    },
    
    // Aktuelle Session
    session: {
        mode: null, // 'learn' | 'exam' | null
        queue: [],
        currentIndex: 0,
        results: [],
        startTime: null,
        timeLimit: null, // in Minuten
        settings: {
            showHints: true,
            showSolution: true,
            randomOrder: true,
            questionCount: null
        }
    },
    
    // Letzte abgeschlossene Session (für Export nach endSession)
    lastCompletedSession: null,
    
    // App-Einstellungen
    settings: {
        theme: 'light',
        basePath: './',
        debugMode: false,
        evaluation: {
            keywordWeight: 0.4,
            jaccardWeight: 0.3,
            mathWeight: 0.2,
            lengthWeight: 0.1
        }
    },
    
    // UI-State
    ui: {
        currentPage: 'dashboard',
        loading: false,
        error: null
    }
};

/**
 * Event-System für State-Änderungen
 */
const listeners = {
    stateChange: [],
    questionsLoaded: [],
    sessionStart: [],
    sessionEnd: []
};

/**
 * Registriert Event-Listener
 * @param {string} event - Event-Name
 * @param {function} callback - Callback-Funktion
 */
export function addEventListener(event, callback) {
    if (listeners[event]) {
        listeners[event].push(callback);
    }
}

/**
 * Feuert Event ab
 * @param {string} event - Event-Name
 * @param {*} data - Event-Daten
 */
function emitEvent(event, data) {
    if (listeners[event]) {
        listeners[event].forEach(callback => callback(data));
    }
}

/**
 * Lädt die Standard-JSON-Datei mit allen NLP-Fragen
 * @returns {Promise<boolean>} Erfolgreich geladen
 */
export async function loadDefaultQuestions() {
    try {
        state.ui.loading = true;
        state.ui.error = null;
        
        console.log('🔄 Lade NLP-Fragen...');
        const response = await fetch('./data/exam_questions_combined.json');
        
        if (!response.ok) {
            throw new Error(`Laden fehlgeschlagen: HTTP ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.exam_questions || !Array.isArray(data.exam_questions)) {
            throw new Error('Ungültiges JSON-Format: exam_questions Array fehlt');
        }
        
        // Daten normalisieren und laden
        const normalizedQuestions = data.exam_questions.map(normalizeQuestion);
        state.questions = normalizedQuestions;
        state.originalSources = [{ 
            name: 'exam_questions_combined.json', 
            count: normalizedQuestions.length,
            loadTime: new Date().toISOString()
        }];
        
        updateFilters();
        persist();
        
        console.log(`✅ ${normalizedQuestions.length} NLP-Fragen geladen`);
        emitEvent('questionsLoaded', state.questions);
        return true;
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Fragen:', error);
        state.ui.error = `Fehler: ${error.message}`;
        return false;
    } finally {
        state.ui.loading = false;
        emitEvent('stateChange', state);
    }
}

/**
 * Importiert Fragen aus File-Upload
 * @param {FileList} files - Datei-Liste
 * @returns {Promise<number>} Anzahl importierter Fragen
 */
export async function importQuestions(files) {
    let totalImported = 0;
    const newSources = [];
    
    try {
        state.ui.loading = true;
        
        for (const file of files) {
            if (!file.name.toLowerCase().endsWith('.json')) {
                console.warn(`Überspringe Nicht-JSON-Datei: ${file.name}`);
                continue;
            }
            
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!data.exam_questions || !Array.isArray(data.exam_questions)) {
                console.warn(`Ungültiges Format in ${file.name}: exam_questions Array fehlt`);
                continue;
            }
            
            const normalizedQuestions = data.exam_questions.map(normalizeQuestion);
            
            // Merge mit existierenden Fragen (Duplikate vermeiden)
            const existingIds = new Set(state.questions.map(q => q.id));
            const newQuestions = normalizedQuestions.filter(q => !existingIds.has(q.id));
            
            state.questions.push(...newQuestions);
            totalImported += newQuestions.length;
            
            newSources.push({
                name: file.name,
                count: newQuestions.length,
                totalInFile: normalizedQuestions.length,
                duplicates: normalizedQuestions.length - newQuestions.length,
                loadTime: new Date().toISOString()
            });
        }
        
        state.originalSources.push(...newSources);
        updateFilters();
        persist();
        
        emitEvent('questionsLoaded', state.questions);
        
    } catch (error) {
        console.error('Fehler beim Importieren:', error);
        state.ui.error = `Import fehlgeschlagen: ${error.message}`;
    } finally {
        state.ui.loading = false;
        emitEvent('stateChange', state);
    }
    
    return totalImported;
}

/**
 * Normalisiert Frage-Objekt mit Standard-Werten
 * @param {object} question - Roh-Frage
 * @returns {object} Normalisierte Frage
 */
function normalizeQuestion(question) {
    const normalized = {
        id: question.id || `Q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        source: question.source || 'Unbekannt',
        type: question.type || 'offene_frage',
        topic: question.topic || 'Allgemein',
        question_text: question.question_text || '',
        math_blocks: Array.isArray(question.math_blocks) ? question.math_blocks : [],
        images: Array.isArray(question.images) ? question.images : [],
        options: Array.isArray(question.options) ? question.options : [],
        correct_options: Array.isArray(question.correct_options) ? question.correct_options : [],
        given_answer: question.given_answer || '',
        verified: Boolean(question.verified),
        notes: question.notes || '',
        
        // Zusätzliche Metadaten
        difficulty: question.difficulty || 'mittel',
        estimatedTime: question.estimatedTime || 5, // Minuten
        lastAnswered: null,
        userScore: null,
        
        // Bildbasierte Frage-Marker
        _isImageQuestion: question.type === 'bildbasierte_frage' || !question.question_text?.trim(),
        
        // Bild-Metadaten (wird von attachImages gesetzt)
        _image: {
            kind: null, // 'user' | 'asset' | 'stub' | null
            src: null,  // DataURL für user, Pfad für asset
            stubKind: null // Für stub: 'transformer', 'sentiment_pipeline', etc.
        }
    };
    
    return normalized;
}

/**
 * Aktualisiert verfügbare Filter basierend auf geladenen Fragen
 */
function updateFilters() {
    const topics = new Set();
    const types = new Set();
    
    state.questions.forEach(question => {
        topics.add(question.topic);
        types.add(question.type);
    });
    
    state.filters.topics = Array.from(topics).sort();
    state.filters.types = Array.from(types).sort();
}

/**
 * Filtert Fragen basierend auf aktuellen Filtern
 * @returns {array} Gefilterte Fragen
 */
export function getFilteredQuestions() {
    let filtered = state.questions;
    
    // Bildbasierte Fragen standardmäßig ausblenden (außer explizit aktiviert)
    if (!state.filters.showImageQuestions) {
        filtered = filtered.filter(q => q.type !== 'bildbasierte_frage');
    }
    
    // Topic-Filter
    if (state.filters.activeTopics.size > 0) {
        filtered = filtered.filter(q => state.filters.activeTopics.has(q.topic));
    }
    
    // Type-Filter
    if (state.filters.activeTypes.size > 0) {
        filtered = filtered.filter(q => state.filters.activeTypes.has(q.type));
    }
    
    // Text-Suche
    if (state.filters.search.trim()) {
        const searchLower = state.filters.search.toLowerCase();
        filtered = filtered.filter(q =>
            q.question_text.toLowerCase().includes(searchLower) ||
            q.given_answer.toLowerCase().includes(searchLower) ||
            q.topic.toLowerCase().includes(searchLower) ||
            q.notes.toLowerCase().includes(searchLower)
        );
    }
    
    return filtered;
}

/**
 * Startet neue Lernsession
 * @param {object} options - Session-Optionen
 */
export function startSession(options = {}) {
    const {
        mode = 'learn',
        questionCount = null,
        timeLimit = null,
        randomOrder = true,
        selectedTopics = [],
        selectedTypes = []
    } = options;
    
    // Filter temporär setzen
    const originalActiveTopics = new Set(state.filters.activeTopics);
    const originalActiveTypes = new Set(state.filters.activeTypes);
    
    if (selectedTopics.length > 0) {
        state.filters.activeTopics = new Set(selectedTopics);
    }
    if (selectedTypes.length > 0) {
        state.filters.activeTypes = new Set(selectedTypes);
    }
    
    // Gefilterte Fragen holen
    let questions = getFilteredQuestions();
    
    // Filter zurücksetzen
    state.filters.activeTopics = originalActiveTopics;
    state.filters.activeTypes = originalActiveTypes;
    
    if (questions.length === 0) {
        state.ui.error = 'Keine Fragen gefunden für die gewählten Filter.';
        return false;
    }
    
    // Reihenfolge
    if (randomOrder) {
        questions = shuffleArray([...questions]);
    }
    
    // Anzahl begrenzen
    if (questionCount && questionCount < questions.length) {
        questions = questions.slice(0, questionCount);
    }
    
    // Session initialisieren
    state.session = {
        mode,
        queue: questions,
        currentIndex: 0,
        results: [],
        startTime: new Date().toISOString(),
        timeLimit,
        settings: {
            showHints: mode === 'learn',
            showSolution: mode === 'learn',
            randomOrder,
            questionCount: questions.length
        }
    };
    
    state.ui.currentPage = mode === 'learn' ? 'learn' : 'exam';
    
    persist();
    emitEvent('sessionStart', state.session);
    emitEvent('stateChange', state);
    
    return true;
}

/**
 * Beendet aktuelle Session
 */
export function endSession() {
    console.log('🔚 endSession() aufgerufen');
    console.log('📊 Aktuelle Session:', {
        mode: state.session.mode,
        resultsCount: state.session.results.length,
        results: state.session.results
    });
    
    if (state.session.mode) {
        // Sichere Session-Daten für Export BEVOR sie gelöscht werden
        state.lastCompletedSession = {
            mode: state.session.mode,
            results: [...state.session.results], // Deep copy
            startTime: state.session.startTime,
            timeLimit: state.session.timeLimit,
            settings: { ...state.session.settings }, // Deep copy
            endTime: new Date().toISOString(),
            duration: Date.now() - new Date(state.session.startTime).getTime()
        };
        
        console.log('💾 lastCompletedSession gespeichert:', state.lastCompletedSession);
        
        // Speichere Session in historische Daten
        saveSessionToHistory(state.lastCompletedSession);
        
        // Sofortiges Speichern für Debugging
        persist();
        console.log('💾 State nach endSession persist() gespeichert');
        
        // WICHTIG: Seite auf results setzen BEVOR session gelöscht wird
        state.ui.currentPage = 'results';
        
        emitEvent('sessionEnd', {
            results: state.session.results,
            mode: state.session.mode,
            duration: state.lastCompletedSession.duration
        });
    } else {
        console.log('⚠️ Keine aktive Session zum Beenden gefunden');
    }
    
    // Lösche aktuelle Session NACH dem Event
    state.session = {
        mode: null,
        queue: [],
        currentIndex: 0,
        results: [],
        startTime: null,
        timeLimit: null,
        settings: {}
    };
    
    persist();
    emitEvent('stateChange', state);
}

/**
 * Speichert Antwort-Ergebnis
 * @param {object} result - Antwort-Ergebnis
 */
export function saveAnswerResult(result) {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) {
        console.log('❌ saveAnswerResult: Keine aktuelle Frage gefunden');
        return;
    }
    
    const resultEntry = {
        questionId: currentQuestion.id,
        userAnswer: result.userAnswer,
        score: result.score,
        correct: result.correct,
        timestamp: new Date().toISOString(),
        evaluation: result.evaluation,
        hintsUsed: result.hintsUsed || 0,
        timeSpent: result.timeSpent || 0
    };
    
    console.log('💾 saveAnswerResult:', resultEntry);
    state.session.results.push(resultEntry);
    console.log('📊 Session results count:', state.session.results.length);
    
    // Update Frage mit letztem Ergebnis
    const questionIndex = state.questions.findIndex(q => q.id === currentQuestion.id);
    if (questionIndex >= 0) {
        state.questions[questionIndex].lastAnswered = new Date().toISOString();
        state.questions[questionIndex].userScore = result.score;
    }
    
    persist();
    emitEvent('stateChange', state);
}

/**
 * Geht zur nächsten Frage
 * @returns {boolean} Erfolgreich zur nächsten Frage
 */
export function nextQuestion() {
    if (state.session.currentIndex < state.session.queue.length - 1) {
        state.session.currentIndex++;
        persist();
        emitEvent('stateChange', state);
        return true;
    }
    return false;
}

/**
 * Geht zur vorherigen Frage
 * @returns {boolean} Erfolgreich zur vorherigen Frage
 */
export function previousQuestion() {
    if (state.session.currentIndex > 0) {
        state.session.currentIndex--;
        persist();
        emitEvent('stateChange', state);
        return true;
    }
    return false;
}

/**
 * Gibt aktuelle Frage zurück
 * @returns {object|null} Aktuelle Frage
 */
export function getCurrentQuestion() {
    if (state.session.queue.length === 0) return null;
    return state.session.queue[state.session.currentIndex] || null;
}

/**
 * Gibt Session-Statistiken zurück
 * @returns {object} Session-Statistiken
 */
export function getSessionStats() {
    console.log('📈 getSessionStats() aufgerufen');
    console.log('🔍 State check:', {
        'session.mode': state.session.mode,
        'session.results.length': state.session.results.length,
        'lastCompletedSession exists': !!state.lastCompletedSession,
        'lastCompletedSession': state.lastCompletedSession
    });
    
    // Verwende aktive Session oder letzte abgeschlossene Session
    let results, totalQuestions;
    
    if (state.session.mode && state.session.results.length > 0) {
        // Aktive Session
        console.log('✅ Verwende aktive Session');
        results = state.session.results;
        totalQuestions = state.session.queue.length;
    } else if (state.lastCompletedSession) {
        // Letzte abgeschlossene Session
        console.log('✅ Verwende lastCompletedSession');
        results = state.lastCompletedSession.results;
        totalQuestions = state.lastCompletedSession.settings.questionCount || results.length;
    } else {
        // Fallback: keine Daten
        console.log('⚠️ Fallback: keine Session-Daten gefunden');
        results = [];
        totalQuestions = 0;
    }
    
    const answeredQuestions = results.length;
    console.log('📊 Stats berechnet:', { results: results.length, totalQuestions, answeredQuestions });
    
    if (answeredQuestions === 0) {
        return {
            totalQuestions,
            answeredQuestions: 0,
            averageScore: 0,
            correctAnswers: 0,
            timeSpent: 0
        };
    }
    
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const correctAnswers = results.filter(r => r.correct).length;
    const timeSpent = results.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
    
    return {
        totalQuestions,
        answeredQuestions,
        averageScore: totalScore / answeredQuestions,
        correctAnswers,
        timeSpent
    };
}

/**
 * Berechnet Statistiken aus gegebenen Results (für Export)
 * @param {Array} results - Array von Results-Objekten
 * @returns {Object} Statistiken
 */
function calculateStatsFromResults(results) {
    const answeredQuestions = results.length;
    
    if (answeredQuestions === 0) {
        return {
            totalQuestions: 0,
            answeredQuestions: 0,
            averageScore: 0,
            correctAnswers: 0,
            timeSpent: 0
        };
    }
    
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const correctAnswers = results.filter(r => r.correct).length;
    const timeSpent = results.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
    
    return {
        totalQuestions: answeredQuestions, // Bei Export = Anzahl beantworteter Fragen
        answeredQuestions,
        averageScore: totalScore / answeredQuestions,
        correctAnswers,
        timeSpent
    };
}

/**
 * Gibt comprehensive Benutzerstatistiken zurück
 * Analysiert alle gespeicherten Session-Ergebnisse
 * @returns {object} Comprehensive user statistics
 */
export async function getUserStatistics() {
    console.log('📊 getUserStatistics() aufgerufen');
    
    // Try to get stats from backend if authenticated
    try {
        const { isAuthenticated, isBackendAvailable, apiRequest } = await import('./auth.js');
        const { API_ENDPOINTS } = await import('./config.js');
        
        if (isAuthenticated() && isBackendAvailable()) {
            console.log('📊 Fetching user statistics from backend...');
            const response = await apiRequest(API_ENDPOINTS.PROGRESS_USER_STATS);
            if (response && response.userStats) {
                console.log('✅ Backend user statistics loaded');
                return response.userStats;
            }
        }
    } catch (error) {
        console.warn('⚠️ Failed to fetch backend user statistics, falling back to local:', error);
    }
    
    // Sammle alle verfügbaren Ergebnisse
    let allResults = [];
    let allSessions = [];
    
    // Aktuelle Session hinzufügen
    if (state.session.mode && state.session.results.length > 0) {
        allResults.push(...state.session.results);
        allSessions.push({
            mode: state.session.mode,
            results: state.session.results,
            startTime: state.session.startTime,
            incomplete: true
        });
    }
    
    // Letzte abgeschlossene Session hinzufügen
    if (state.lastCompletedSession) {
        allResults.push(...state.lastCompletedSession.results);
        allSessions.push({
            mode: state.lastCompletedSession.mode,
            results: state.lastCompletedSession.results,
            startTime: state.lastCompletedSession.startTime,
            endTime: state.lastCompletedSession.endTime,
            duration: state.lastCompletedSession.duration,
            incomplete: false
        });
    }
    
    // Lade historische Daten
    const historyData = getSessionHistory();
    historyData.forEach(session => {
        if (session.results && session.results.length > 0) {
            allResults.push(...session.results);
            allSessions.push(session);
        }
    });
    
    if (allResults.length === 0) {
        return {
            totalQuestions: 0,
            answeredQuestions: 0,
            accuracyRate: 0,
            averageScore: 0,
            timeInvested: 0,
            totalSessions: 0,
            learningStreak: 0,
            sessionBreakdown: {
                learn: { count: 0, questions: 0, accuracy: 0 },
                exam: { count: 0, questions: 0, accuracy: 0 }
            },
            topicBreakdown: {},
            recentActivity: [],
            achievements: []
        };
    }
    
    // Basis-Statistiken
    const totalQuestions = allResults.length;
    const correctAnswers = allResults.filter(r => r.correct).length;
    const accuracyRate = correctAnswers / totalQuestions;
    const totalScore = allResults.reduce((sum, r) => sum + r.score, 0);
    const averageScore = totalScore / totalQuestions;
    const timeInvested = allResults.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
    
    // Session-Breakdown
    const sessionBreakdown = {
        learn: { count: 0, questions: 0, accuracy: 0 },
        exam: { count: 0, questions: 0, accuracy: 0 }
    };
    
    allSessions.forEach(session => {
        if (session.mode && sessionBreakdown[session.mode]) {
            sessionBreakdown[session.mode].count++;
            sessionBreakdown[session.mode].questions += session.results.length;
            const sessionCorrect = session.results.filter(r => r.correct).length;
            sessionBreakdown[session.mode].accuracy += session.results.length > 0 ? sessionCorrect / session.results.length : 0;
        }
    });
    
    // Durchschnittliche Genauigkeit pro Session-Typ
    Object.keys(sessionBreakdown).forEach(mode => {
        if (sessionBreakdown[mode].count > 0) {
            sessionBreakdown[mode].accuracy /= sessionBreakdown[mode].count;
        }
    });
    
    // Topic-Breakdown
    const topicBreakdown = {};
    allResults.forEach(result => {
        const question = state.questions.find(q => q.id === result.questionId);
        if (question && question.topic) {
            if (!topicBreakdown[question.topic]) {
                topicBreakdown[question.topic] = { count: 0, correct: 0, accuracy: 0 };
            }
            topicBreakdown[question.topic].count++;
            if (result.correct) {
                topicBreakdown[question.topic].correct++;
            }
        }
    });
    
    // Genauigkeit pro Topic berechnen
    Object.keys(topicBreakdown).forEach(topic => {
        topicBreakdown[topic].accuracy = topicBreakdown[topic].correct / topicBreakdown[topic].count;
    });
    
    // Recent Activity (letzte 7 Tage)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentSessions = allSessions.filter(session => {
        const sessionDate = new Date(session.startTime || session.endTime);
        return sessionDate >= sevenDaysAgo;
    });
    
    const recentActivity = recentSessions.map(session => ({
        date: session.startTime || session.endTime,
        mode: session.mode,
        questions: session.results.length,
        accuracy: session.results.length > 0 ? session.results.filter(r => r.correct).length / session.results.length : 0,
        duration: session.duration || null
    })).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Learning Streak (aufeinanderfolgende Tage mit Aktivität)
    const learningStreak = calculateLearningStreak(allSessions);
    
    // Achievements
    const achievements = calculateAchievements({
        totalQuestions,
        accuracyRate,
        totalSessions: allSessions.length,
        learningStreak,
        timeInvested
    });
    
    return {
        totalQuestions,
        answeredQuestions: totalQuestions,
        accuracyRate,
        averageScore,
        timeInvested,
        totalSessions: allSessions.length,
        learningStreak,
        sessionBreakdown,
        topicBreakdown,
        recentActivity,
        achievements
    };
}

/**
 * Berechnet Learning Streak (aufeinanderfolgende Tage)
 * @param {Array} sessions - Array von Session-Objekten
 * @returns {number} Anzahl aufeinanderfolgender Tage
 */
function calculateLearningStreak(sessions) {
    if (sessions.length === 0) return 0;
    
    // Sortiere Sessions nach Datum (neueste zuerst)
    const sortedSessions = sessions
        .filter(s => s.startTime || s.endTime)
        .sort((a, b) => new Date(b.startTime || b.endTime) - new Date(a.startTime || a.endTime));
    
    if (sortedSessions.length === 0) return 0;
    
    // Finde eindeutige Tage
    const uniqueDays = new Set();
    sortedSessions.forEach(session => {
        const date = new Date(session.startTime || session.endTime);
        const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        uniqueDays.add(dayKey);
    });
    
    const daysArray = Array.from(uniqueDays).sort().reverse(); // Neueste zuerst
    
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    
    for (let i = 0; i < daysArray.length; i++) {
        const currentDay = daysArray[i];
        const expectedDay = new Date();
        expectedDay.setDate(expectedDay.getDate() - i);
        const expectedDayKey = expectedDay.toISOString().split('T')[0];
        
        if (currentDay === expectedDayKey) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}

/**
 * Berechnet Achievements basierend auf Benutzerstatistiken
 * @param {object} stats - Benutzerstatistiken
 * @returns {Array} Array von Achievement-Objekten
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

/**
 * Speichert abgeschlossene Session in historische Daten
 * @param {object} sessionData - Session-Daten
 */
function saveSessionToHistory(sessionData) {
    try {
        const historyKey = 'nlpds-session-history';
        let history = [];
        
        // Lade existierende Historien
        const existingHistory = localStorage.getItem(historyKey);
        if (existingHistory) {
            history = JSON.parse(existingHistory);
        }
        
        // Füge neue Session hinzu
        history.push({
            ...sessionData,
            id: generateSessionId(),
            savedAt: new Date().toISOString()
        });
        
        // Begrenze auf die letzten 50 Sessions
        if (history.length > 50) {
            history = history.slice(-50);
        }
        
        // Speichere zurück
        localStorage.setItem(historyKey, JSON.stringify(history));
        console.log('📚 Session in Historie gespeichert. Gesamt:', history.length);
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern der Session-Historie:', error);
    }
}

/**
 * Generiert eine eindeutige Session-ID
 * @returns {string} Session-ID
 */
function generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Lädt historische Session-Daten
 * @returns {Array} Array von Session-Objekten
 */
export function getSessionHistory() {
    try {
        const historyKey = 'nlpds-session-history';
        const savedHistory = localStorage.getItem(historyKey);
        return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
        console.error('❌ Fehler beim Laden der Session-Historie:', error);
        return [];
    }
}

/**
 * Setzt Filter
 * @param {object} newFilters - Neue Filter-Werte
 */
export function setFilters(newFilters) {
    Object.assign(state.filters, newFilters);
    persist();
    emitEvent('stateChange', state);
}

/**
 * Setzt UI-Page
 * @param {string} page - Page-Name
 */
export function setCurrentPage(page) {
    state.ui.currentPage = page;
    emitEvent('stateChange', state);
}

/**
 * Setzt App-Einstellungen
 * @param {object} newSettings - Neue Einstellungen
 */
export function setSettings(newSettings) {
    Object.assign(state.settings, newSettings);
    persist();
    emitEvent('stateChange', state);
}

/**
 * Speichert State in localStorage
 */
export function persist() {
    try {
        const persistData = {
            questions: state.questions,
            originalSources: state.originalSources,
            settings: state.settings,
            lastCompletedSession: state.lastCompletedSession,
            lastSaved: new Date().toISOString()
        };
        
        localStorage.setItem('nlp-learning-app', JSON.stringify(persistData));
    } catch (error) {
        console.error('Fehler beim Speichern in localStorage:', error);
    }
}

/**
 * Lädt State aus localStorage
 */
export function restore() {
    try {
        const saved = localStorage.getItem('nlp-learning-app');
        if (!saved) return false;
        
        const data = JSON.parse(saved);
        
        if (data.questions && Array.isArray(data.questions)) {
            state.questions = data.questions.map(normalizeQuestion);
        }
        
        if (data.originalSources) {
            state.originalSources = data.originalSources;
        }
        
        if (data.settings) {
            Object.assign(state.settings, data.settings);
        }
        
        if (data.lastCompletedSession) {
            state.lastCompletedSession = data.lastCompletedSession;
            console.log('🔄 lastCompletedSession aus localStorage geladen:', state.lastCompletedSession);
        }
        
        updateFilters();
        emitEvent('stateChange', state);
        
        return true;
    } catch (error) {
        console.error('Fehler beim Laden aus localStorage:', error);
        return false;
    }
}

/**
 * Löscht alle gespeicherten Daten
 */
export function clearData() {
    localStorage.removeItem('nlp-learning-app');
    
    // State zurücksetzen
    state.questions = [];
    state.originalSources = [];
    state.filters.topics = [];
    state.filters.types = [];
    state.filters.activeTopics.clear();
    state.filters.activeTypes.clear();
    state.filters.search = '';
    
    endSession();
    
    emitEvent('stateChange', state);
}

/**
 * Exportiert Session-Ergebnisse als JSON
 * @returns {string} JSON-String der Ergebnisse
 */
export function exportResults() {
    // Bestimme welche Session-Daten exportiert werden sollen
    let sessionData, resultsData, questionsData;
    
    if (state.session.mode && state.session.results.length > 0) {
        // Aktive Session mit Daten vorhanden
        sessionData = {
            mode: state.session.mode,
            startTime: state.session.startTime,
            endTime: new Date().toISOString(),
            settings: state.session.settings
        };
        resultsData = state.session.results;
        questionsData = state.session.queue;
    } else if (state.lastCompletedSession) {
        // Keine aktive Session, aber letzte abgeschlossene Session vorhanden
        sessionData = {
            mode: state.lastCompletedSession.mode,
            startTime: state.lastCompletedSession.startTime,
            endTime: state.lastCompletedSession.endTime,
            settings: state.lastCompletedSession.settings
        };
        resultsData = state.lastCompletedSession.results;
        // Versuche Fragen aus der letzten Session zu rekonstruieren
        questionsData = resultsData.map(result => {
            const question = state.questions.find(q => q.id === result.questionId);
            return question || { id: result.questionId, topic: 'Unknown', type: 'Unknown' };
        });
    } else {
        // Fallback: Leere Session
        sessionData = {
            mode: null,
            startTime: null,
            endTime: new Date().toISOString(),
            settings: {}
        };
        resultsData = [];
        questionsData = [];
    }

    const exportData = {
        session: sessionData,
        results: resultsData,
        statistics: calculateStatsFromResults(resultsData),
        questions: questionsData.map(q => ({
            id: q.id,
            topic: q.topic || 'Unknown',
            type: q.type || 'Unknown',
            question_text: q.question_text ? q.question_text.substring(0, 100) + '...' : 'N/A'
        }))
    };
    
    return JSON.stringify(exportData, null, 2);
}

/**
 * Utility: Array mischen (Fisher-Yates)
 * @param {array} array - Zu mischendes Array
 * @returns {array} Gemischtes Array
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Debug: Gibt aktuellen State aus
 * @returns {object} Aktueller State
 */
export function getState() {
    return state;
}

/**
 * Fügt Bild-Metadaten zu Fragen hinzu basierend auf Fallback-Kette
 * @param {array} questions - Array von Frage-Objekten
 * @param {object} imageMap - Image-Mapping von image_map.json
 */
export function attachImages(questions, imageMap = { bySource: {}, byHint: {} }) {
    console.log(`🖼️ Attachiere Bilder für ${questions.length} Fragen...`);
    
    let userImages = 0, assetImages = 0, stubImages = 0;
    
    questions.forEach(q => {
        // 1) User-Upload prüfen (localStorage)
        const userImageKey = `img:${q.id}`;
        const userImageData = localStorage.getItem(userImageKey);
        
        if (userImageData) {
            try {
                const parsedData = JSON.parse(userImageData);
                q._image.kind = 'user';
                q._image.src = parsedData.dataURL;
                q._image.metadata = {
                    filename: parsedData.filename,
                    uploadDate: parsedData.uploadDate
                };
                userImages++;
                return;
            } catch (error) {
                console.warn(`Fehler beim Parsen von User-Image für ${q.id}:`, error);
                localStorage.removeItem(userImageKey);
            }
        }
        
        // 2) Asset-Mapping bySource prüfen
        if (imageMap.bySource && imageMap.bySource[q.source]) {
            q._image.kind = 'asset';
            q._image.src = `./assets/questions/${imageMap.bySource[q.source]}`;
            q._image.metadata = { mappingType: 'bySource' };
            assetImages++;
            return;
        }
        
        // 3) Asset-Mapping byHint prüfen
        const hintKey = findHintMapping(q, imageMap.byHint || {});
        if (hintKey) {
            q._image.kind = 'asset';
            q._image.src = `./assets/questions/${imageMap.byHint[hintKey]}`;
            q._image.metadata = { mappingType: 'byHint', hintKey };
            assetImages++;
            return;
        }
        
        // 4) SVG-Stub generieren
        const stubKind = inferStubKind(q);
        if (stubKind) {
            q._image.kind = 'stub';
            q._image.stubKind = stubKind;
            q._image.metadata = { inferredFrom: getInferenceSource(q, stubKind) };
            stubImages++;
            return;
        }
        
        // 5) Kein Bild verfügbar - bleibt null
        q._image.kind = null;
    });
    
    console.log(`✅ Bild-Zuweisung abgeschlossen: ${userImages} User, ${assetImages} Assets, ${stubImages} Stubs`);
}

/**
 * Sucht nach Hint-Mapping in byHint basierend auf Heuristiken
 * @param {object} question - Frage-Objekt
 * @param {object} byHintMap - Mapping-Objekt für Hints
 * @returns {string|null} Gefundener Hint-Key
 */
function findHintMapping(question, byHintMap) {
    const searchText = [
        question.topic || '',
        question.images?.join(' ') || '',
        question.notes || '',
        question.question_text || ''
    ].join(' ').toLowerCase();
    
    // Durchsuche alle verfügbaren Hint-Keys
    for (const hintKey of Object.keys(byHintMap)) {
        const hintLower = hintKey.toLowerCase();
        if (searchText.includes(hintLower)) {
            return hintKey;
        }
    }
    
    return null;
}

/**
 * Bestimmt SVG-Stub-Typ basierend auf Frage-Inhalten
 * @param {object} question - Frage-Objekt
 * @returns {string|null} Stub-Typ oder null
 */
export function inferStubKind(question) {
    const searchText = [
        question.topic || '',
        question.images?.join(' ') || '',
        question.notes || '',
        question.question_text || ''
    ].join(' ').toLowerCase();
    
    // Reihenfolge ist wichtig - spezifischere Begriffe zuerst
    const patterns = [
        { keywords: ['transformer', 'attention', 'encoder', 'decoder', 'bert', 'gpt'], stub: 'transformer' },
        { keywords: ['sentiment', 'pipeline', 'finbert', 'classification'], stub: 'sentiment_pipeline' },
        { keywords: ['confusion matrix', 'confusion', 'tp', 'tn', 'fp', 'fn', 'precision', 'recall'], stub: 'confusion_matrix' },
        { keywords: ['decision tree', 'entscheidungsbaum', 'tree', 'split', 'entropy', 'gini'], stub: 'decision_tree' },
        { keywords: ['mlm', 'mask', 'bias', 'gender', 'masked language model'], stub: 'mlm_bias' }
    ];
    
    for (const pattern of patterns) {
        if (pattern.keywords.some(keyword => searchText.includes(keyword))) {
            return pattern.stub;
        }
    }
    
    return null;
}

/**
 * Gibt Quelle der Stub-Inferenz zurück (für Debugging)
 * @param {object} question - Frage-Objekt
 * @param {string} stubKind - Inferierter Stub-Typ
 * @returns {string} Inferenz-Quelle
 */
function getInferenceSource(question, stubKind) {
    const sources = [];
    
    const searchTexts = {
        topic: question.topic || '',
        images: question.images?.join(' ') || '',
        notes: question.notes || '',
        question_text: question.question_text || ''
    };
    
    const patterns = {
        transformer: ['transformer', 'attention', 'encoder', 'decoder', 'bert', 'gpt'],
        sentiment_pipeline: ['sentiment', 'pipeline', 'finbert', 'classification'],
        confusion_matrix: ['confusion matrix', 'confusion', 'tp', 'tn', 'fp', 'fn'],
        decision_tree: ['decision tree', 'entscheidungsbaum', 'tree', 'split'],
        mlm_bias: ['mlm', 'mask', 'bias', 'gender', 'masked language model']
    };
    
    const keywords = patterns[stubKind] || [];
    
    for (const [field, text] of Object.entries(searchTexts)) {
        if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
            sources.push(field);
        }
    }
    
    return sources.join(', ') || 'unknown';
}

// Globale Funktion für app.js Export
window.storeAttachImages = attachImages;
