/**
 * DOM rendering and UI components
 * Handles page rendering, KaTeX integration, and component composition
 */

console.log('🔧 DEBUGGING: render.js wird geladen...');

import { state, getFilteredQuestions, getCurrentQuestion, getSessionStats, getUserStatistics } from './store.js';
import { formatScore, getScoreColor, getScoreLabel } from './utils.js';
import { renderDiagramStub } from './diagrams.js';
import { isAuthenticated, getCurrentUser } from './auth.js';

console.log('✅ DEBUGGING: render.js Module importiert');

/**
 * Rendert LaTeX-Mathematik mit KaTeX
 * @param {HTMLElement} element - Element zum Rendern
 */
export function renderMath(element = document.body) {
    // console.log('🔬 Versuche KaTeX-Rendering...', element.tagName || 'document.body');
    
    // Warte kurz falls KaTeX noch lädt
    if (typeof renderMathInElement === 'undefined' || typeof katex === 'undefined') {
        // console.warn('⏳ KaTeX noch nicht verfügbar, warte 500ms...');
        setTimeout(() => renderMath(element), 500);
        return false;
    }
    
    try {
        // console.log('📐 Starte KaTeX-Rendering für Element:', element.className || element.tagName);
        
        // Finde alle Math-Container
        const mathContainers = element.querySelectorAll('.math-block, .katex-container');
        // console.log(`📊 Gefunden: ${mathContainers.length} Math-Container`);
        
        renderMathInElement(element, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\[', right: '\\]', display: true },
                { left: '\\(', right: '\\)', display: false }
            ],
            throwOnError: false,
            errorColor: '#cc0000',
            ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
            ignoredClasses: ['no-katex']
        });
        
        // Update Status-Indikatoren
        const statusElements = element.querySelectorAll('[id^="math-status-"]');
        statusElements.forEach(el => {
            el.textContent = '✅ Mathematik gerendert';
            el.className = 'text-xs text-green-600';
        });
        
        // console.log('✅ KaTeX-Rendering erfolgreich abgeschlossen');
        return true;
        
    } catch (error) {
        console.error('❌ KaTeX-Rendering-Fehler:', error);
        
        // Fallback: Zeige Fehlermeldung in Status-Indikatoren  
        const statusElements = element.querySelectorAll('[id^="math-status-"]');
        statusElements.forEach(el => {
            el.textContent = '❌ Mathematik-Rendering fehlgeschlagen';
            el.className = 'text-xs text-red-600';
        });
        
        return false;
    }
}

/**
 * Rendert Markdown mit marked.js (falls verfügbar)
 * @param {string} text - Markdown-Text
 * @returns {string} HTML
 */
export function renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
        try {
            // Einfache Sanitization
            const sanitized = text
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
            
            return marked.parse(sanitized, {
                breaks: true,
                gfm: true,
                extensions: [{
                    name: 'strikethrough',
                    enabled: false,
                }]
            });
        } catch (error) {
            console.error('Markdown-Rendering-Fehler:', error);
            return escapeHtml(text);
        }
    }
    
    // Fallback: Einfache Formatierung
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

/**
 * Escape HTML-Zeichen
 * @param {string} text - Text zum Escapen
 * @returns {string} Escaped Text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Hauptrenderer für App-Pages
 * @param {string} page - Page-Name
 */
export async function renderPage(page) {
    console.log('🎨 renderPage called with page:', page);
    const appElement = document.getElementById('app');
    
    if (!appElement) {
        console.error('❌ App element not found!');
        return;
    }
    
    switch (page) {
        case 'dashboard':
            appElement.innerHTML = renderDashboard();
            break;
        case 'learn':
        case 'exam':
            appElement.innerHTML = renderQuestionView();
            break;
        case 'results':
            appElement.innerHTML = renderResults();
            break;
        case 'catalog':
            appElement.innerHTML = renderCatalog();
            break;
        case 'statistics':
            console.log('📊 Rendering statistics page...');
            try {
                const statsHTML = await renderStatistics();
                console.log('📊 Statistics HTML generated, length:', statsHTML?.length);
                appElement.innerHTML = statsHTML;
                console.log('📊 Statistics page rendered successfully');
            } catch (error) {
                console.error('❌ Error rendering statistics:', error);
                appElement.innerHTML = `
                    <div class="max-w-2xl mx-auto text-center py-12">
                        <h2 class="text-2xl font-bold text-red-600 mb-4">❌ Fehler beim Laden der Statistiken</h2>
                        <p class="text-gray-600 mb-4">Es ist ein Fehler aufgetreten:</p>
                        <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                            <pre class="text-sm text-red-800">${error.message}</pre>
                        </div>
                        <button onclick="window.location.hash = '#/dashboard'" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg">
                            ← Zurück zum Dashboard
                        </button>
                    </div>
                `;
            }
            break;
        case 'leaderboard':
            console.log('🏆 Rendering leaderboard page...');
            try {
                const leaderboardHTML = renderLeaderboard();
                console.log('🏆 Leaderboard HTML generated, length:', leaderboardHTML?.length);
                appElement.innerHTML = leaderboardHTML;
                console.log('🏆 Leaderboard page rendered successfully');
            } catch (error) {
                console.error('❌ Error rendering leaderboard:', error);
                appElement.innerHTML = `
                    <div class="max-w-2xl mx-auto text-center py-12">
                        <h2 class="text-2xl font-bold text-red-600 mb-4">❌ Fehler beim Laden der Rangliste</h2>
                        <p class="text-gray-600 mb-4">Es ist ein Fehler aufgetreten:</p>
                        <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                            <pre class="text-sm text-red-800">${error.message}</pre>
                        </div>
                        <button onclick="window.location.hash = '#/dashboard'" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg">
                            ← Zurück zum Dashboard
                        </button>
                    </div>
                `;
            }
            break;
        default:
            appElement.innerHTML = renderDashboard();
    }
    
    // KaTeX nach dem Rendern ausführen
    setTimeout(() => {
        renderMath(appElement);
        
        // SVG-Stubs für aktuelle Frage rendern
        const currentQuestion = getCurrentQuestion();
        if (currentQuestion) {
            postRenderImageSection(currentQuestion);
        }
    }, 10);
}

/**
 * Rendert Dashboard-Seite
 * @returns {string} HTML
 */
function renderDashboard() {
    const filteredQuestions = getFilteredQuestions();
    const topicCounts = getTopicCounts(state.questions);
    const typeCounts = getTypeCounts(state.questions);
    
    return `
        <div class="max-w-6xl mx-auto space-y-8">
            <!-- Header -->
            <div class="text-center">
                <h1 class="text-4xl font-bold text-gray-900 mb-4">NLP Learning Dashboard</h1>
                <p class="text-lg text-gray-600">Interaktive Fragentool für Natural Language Processing</p>
            </div>
            
            <!-- Statistik-Kacheln -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                ${renderStatCard('Fragen gesamt', state.questions.length, 'text-blue-600')}
                ${renderStatCard('Verfügbar', filteredQuestions.length, 'text-green-600')}
                ${renderStatCard('Mit Formeln', countQuestionsWithMath(), 'text-purple-600')}
                ${renderStatCard('Bildbasierte', countImageQuestions(), 'text-orange-600', !state.filters.showImageQuestions ? '(ausgeblendet)' : '')}
            </div>
            
            <!-- Hauptaktionen -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- Lernmodus -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-2xl font-bold text-gray-900 mb-4">🎓 Lernmodus</h2>
                    <p class="text-gray-600 mb-6">Üben Sie mit Hinweisen und Lösungseinblendung. Perfekt zum Lernen neuer Konzepte.</p>
                    
                    <div class="space-y-4">
                        <button id="start-learn" class="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition-colors">
                            Lernen starten
                        </button>
                        
                        <details class="text-sm">
                            <summary class="cursor-pointer text-primary-600 hover:text-primary-700">Erweiterte Optionen</summary>
                            <div class="mt-3 space-y-3 p-3 bg-gray-50 rounded">
                                <label class="flex items-center space-x-2">
                                    <input type="checkbox" id="learn-random" checked class="rounded">
                                    <span>Zufällige Reihenfolge</span>
                                </label>
                                <label class="flex items-center space-x-2">
                                    <input type="number" id="learn-count" placeholder="Anzahl Fragen (alle)" min="1" max="${filteredQuestions.length}" class="border rounded px-2 py-1 w-24">
                                    <span>Anzahl begrenzen</span>
                                </label>
                            </div>
                        </details>
                    </div>
                </div>
                
                <!-- Prüfungsmodus -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-2xl font-bold text-gray-900 mb-4">📝 Prüfungsmodus</h2>
                    <p class="text-gray-600 mb-6">Testen Sie Ihr Wissen unter realistischen Bedingungen. Begrenzte Hinweise und Timer.</p>
                    
                    <div class="space-y-4">
                        <button id="start-exam" class="w-full bg-orange-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-700 transition-colors">
                            Prüfung starten
                        </button>
                        
                        <details class="text-sm">
                            <summary class="cursor-pointer text-orange-600 hover:text-orange-700">Prüfungseinstellungen</summary>
                            <div class="mt-3 space-y-3 p-3 bg-gray-50 rounded">
                                <label class="flex items-center justify-between">
                                    <span>Anzahl Fragen:</span>
                                    <select id="exam-count" class="border rounded px-2 py-1">
                                        <option value="10">10 Fragen</option>
                                        <option value="20">20 Fragen</option>
                                        <option value="30">30 Fragen</option>
                                        <option value="">Alle (${filteredQuestions.length})</option>
                                    </select>
                                </label>
                                <label class="flex items-center justify-between">
                                    <span>Zeitlimit:</span>
                                    <select id="exam-time" class="border rounded px-2 py-1">
                                        <option value="">Kein Limit</option>
                                        <option value="30">30 Minuten</option>
                                        <option value="60">60 Minuten</option>
                                        <option value="90">90 Minuten</option>
                                    </select>
                                </label>
                            </div>
                        </details>
                    </div>
                </div>
            </div>

            <!-- Statistics and Leaderboard Section -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h2 class="text-2xl font-bold text-gray-900 mb-4">📊 Fortschritt & Rangliste</h2>
                <p class="text-gray-600 mb-6">Verfolge deinen Lernfortschritt und vergleiche dich mit anderen Lernenden.</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Statistics Card -->
                    <div class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div class="flex items-center space-x-3 mb-4">
                            <div class="bg-blue-100 rounded-full p-3">
                                <span class="text-2xl">📊</span>
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900">Meine Statistiken</h3>
                                <p class="text-sm text-gray-600">${isAuthenticated() ? 'Detaillierte Lernanalyse' : 'Anmeldung erforderlich'}</p>
                            </div>
                        </div>
                        <p class="text-gray-600 text-sm mb-4">
                            ${isAuthenticated() ? 
                                'Analysiere deinen Fortschritt mit detaillierten Statistiken zu Genauigkeit, Lernzeit und Themenperformance.' :
                                'Melde dich an, um deine persönlichen Lernstatistiken und Fortschritte zu verfolgen.'
                            }
                        </p>
                        <button id="nav-to-statistics" class="w-full ${isAuthenticated() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 hover:bg-gray-500'} text-white py-2 px-4 rounded-lg font-medium transition-colors">
                            ${isAuthenticated() ? '📊 Statistiken anzeigen' : '🔑 Anmelden für Statistiken'}
                        </button>
                    </div>

                    <!-- Leaderboard Card -->
                    <div class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div class="flex items-center space-x-3 mb-4">
                            <div class="bg-yellow-100 rounded-full p-3">
                                <span class="text-2xl">🏆</span>
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900">Rangliste</h3>
                                <p class="text-sm text-gray-600">Vergleich mit anderen</p>
                            </div>
                        </div>
                        <p class="text-gray-600 text-sm mb-4">
                            Sieh dir die Bestenliste an und vergleiche deine Leistung mit anderen Lernenden 
                            in verschiedenen Kategorien.
                        </p>
                        <button id="nav-to-leaderboard" class="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-yellow-700 transition-colors">
                            🏆 Rangliste anzeigen
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Info über bildbasierte Fragen -->
            ${countImageQuestions() > 0 && !state.filters.showImageQuestions ? `
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <div class="flex items-center space-x-2 mb-2">
                        <span class="text-yellow-600">💡</span>
                        <span class="font-medium text-yellow-800">Hinweis zu bildbasierten Fragen</span>
                    </div>
                    <p class="text-yellow-700 text-sm">
                        ${countImageQuestions()} von ${state.questions.length} Fragen sind bildbasiert und werden standardmäßig ausgeblendet, 
                        da die Original-Bilder/Diagramme nicht verfügbar sind. Sie können diese Fragen über die Checkbox unten einblenden.
                    </p>
                </div>
            ` : ''}
            
            <!-- Filter und Suche -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h2 class="text-xl font-bold text-gray-900 mb-4">🔍 Filter und Suche</h2>
                
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Suchfeld -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Volltextsuche</label>
                        <input type="text" id="search-input" placeholder="Suchbegriff..." 
                               value="${state.filters.search}"
                               class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <p class="text-xs text-gray-500 mt-1">${filteredQuestions.length} Fragen gefunden</p>
                    </div>
                    
                    <!-- Topic-Filter -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Topics</label>
                        <div class="space-y-1 max-h-32 overflow-y-auto">
                            ${state.filters.topics.map(topic => `
                                <label class="flex items-center space-x-2 text-sm">
                                    <input type="checkbox" class="topic-filter rounded" value="${topic}" 
                                           ${state.filters.activeTopics.has(topic) ? 'checked' : ''}>
                                    <span>${topic}</span>
                                    <span class="text-gray-400">(${topicCounts[topic] || 0})</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Type-Filter -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Fragetypen</label>
                        <div class="space-y-1">
                            ${state.filters.types.map(type => `
                                <label class="flex items-center space-x-2 text-sm">
                                    <input type="checkbox" class="type-filter rounded" value="${type}" 
                                           ${state.filters.activeTypes.has(type) ? 'checked' : ''}>
                                    <span>${formatType(type)}</span>
                                    <span class="text-gray-400">(${typeCounts[type] || 0})</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="mt-4 space-y-3">
                    <div class="flex items-center space-x-3">
                        <label class="flex items-center space-x-2 text-sm">
                            <input type="checkbox" id="show-image-questions" class="rounded" 
                                   ${state.filters.showImageQuestions ? 'checked' : ''}>
                            <span>Bildbasierte Fragen anzeigen</span>
                            <span class="text-orange-600 text-xs">(⚠️ Bilder fehlen)</span>
                        </label>
                    </div>
                    
                    <div class="flex space-x-3">
                        <button id="clear-filters" class="text-sm text-primary-600 hover:text-primary-700">
                            Filter zurücksetzen
                        </button>
                        <button id="view-catalog" class="text-sm text-primary-600 hover:text-primary-700">
                            Fragenkatalog anzeigen
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Datenquelle -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h2 class="text-xl font-bold text-gray-900 mb-4">📁 Datenquelle</h2>
                
                ${renderDataSources()}
                
                <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p class="text-sm text-blue-800">
                        <strong>Hinweis:</strong> Die App verwendet eine feste JSON-Datei mit allen verfügbaren NLP-Fragen. 
                        File-Upload wird in einer zukünftigen Version implementiert.
                    </p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Rendert Fragenansicht (Lernen/Prüfung)
 * @returns {string} HTML
 */
function renderQuestionView() {
    const currentQuestion = getCurrentQuestion();
    const stats = getSessionStats();
    const questionNumber = state.session.currentIndex + 1;
    const totalQuestions = state.session.queue.length;
    
    if (!currentQuestion) {
        return `
            <div class="max-w-4xl mx-auto text-center py-12">
                <h2 class="text-2xl font-bold text-gray-900 mb-4">Keine Frage verfügbar</h2>
                <p class="text-gray-600 mb-6">Die Session wurde möglicherweise beendet oder es sind keine Fragen vorhanden.</p>
                <button id="back-to-dashboard" class="bg-primary-600 text-white py-2 px-6 rounded-lg hover:bg-primary-700">
                    Zurück zum Dashboard
                </button>
            </div>
        `;
    }
    
    return `
        <div class="max-w-4xl mx-auto space-y-6">
            <!-- Header -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center space-x-3">
                        <h1 class="text-2xl font-bold text-gray-900">
                            ${state.session.mode === 'exam' ? '📝 Prüfung' : '🎓 Lernen'}
                        </h1>
                        <span class="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                            Frage ${questionNumber} von ${totalQuestions}
                        </span>
                    </div>
                    
                    <div class="flex items-center space-x-4">
                        ${renderTimer()}
                        <button id="end-session" class="text-red-600 hover:text-red-700 text-sm font-medium">
                            Session beenden
                        </button>
                    </div>
                </div>
                
                <!-- Progress Bar -->
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                         style="width: ${(questionNumber / totalQuestions) * 100}%"></div>
                </div>
            </div>
            
            <!-- Frage -->
            <div class="bg-white rounded-lg shadow-md">
                ${renderQuestionCard(currentQuestion)}
            </div>
            
            <!-- Navigation -->
            <div class="flex justify-between items-center">
                <button id="prev-question" 
                        ${state.session.currentIndex === 0 ? 'disabled' : ''}
                        class="flex items-center space-x-2 text-primary-600 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed">
                    <span>← Vorherige</span>
                </button>
                
                <span class="text-sm text-gray-500">
                    ${stats.answeredQuestions} von ${stats.totalQuestions} beantwortet
                </span>
                
                <button id="next-question" 
                        class="flex items-center space-x-2 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:bg-gray-400">
                    <span>Nächste →</span>
                </button>
            </div>
        </div>
    `;
}

/**
 * Rendert Fragedetail-Karte
 * @param {object} question - Frage-Objekt
 * @returns {string} HTML
 */
function renderQuestionCard(question) {
    return `
        <div class="p-6">
            <!-- Metadaten -->
            <div class="flex flex-wrap items-center gap-2 mb-4">
                <span class="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium">
                    ${question.topic}
                </span>
                <span class="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                    ${formatType(question.type)}
                </span>
                ${!question.verified ? `
                    <span class="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                        ⚠️ Inoffiziell
                    </span>
                ` : ''}
                ${question.difficulty !== 'mittel' ? `
                    <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                        ${question.difficulty}
                    </span>
                ` : ''}
            </div>
            
            <!-- Fragetext -->
            <div class="mb-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-4">Aufgabe</h2>
                <div class="prose max-w-none question-text">
                    ${renderMarkdown(question.question_text)}
                </div>
            </div>
            
            <!-- Mathematische Blöcke -->
            ${question.math_blocks && question.math_blocks.length > 0 ? `
                <div class="mb-6">
                    <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Formeln</h3>
                    <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-3">
                        ${question.math_blocks.map(block => `
                            <div class="text-center math-block katex-container" data-latex="${escapeHtml(block)}">${block}</div>
                        `).join('')}
                    </div>
                    <div class="mt-2 text-xs text-gray-500">
                        <span id="math-status-${question.id}">🔄 Lade Mathematik...</span>
                    </div>
                </div>
            ` : ''}
            
            <!-- Bildbereich mit Fallback-Kette -->
            <div class="mb-6">
                <h3 class="text-lg font-medium text-gray-900 mb-3">Materialien</h3>
                <div id="image-container-${question.id}">
                    ${renderImageSection(question)}
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                    <button id="upload-image-${question.id}" class="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                        📎 Bild hinzufügen/ersetzen
                    </button>
                    ${question._image?.stubKind ? `
                        <button id="toggle-stub-${question.id}" class="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700">
                            🔄 Stub ↔ Text
                        </button>
                    ` : ''}
                </div>
                <input type="file" id="file-input-${question.id}" accept="image/*" style="display: none;">
            </div>
            
            <!-- Antwortbereich -->
            <div class="border-t pt-6">
                <h3 class="text-lg font-medium text-gray-900 mb-3">Ihre Antwort</h3>
                
                <div class="space-y-4">
                    ${(question.type && (question.type.startsWith('mc_') || question.type === 'multiple_choice')) || (Array.isArray(question.options) && question.options.length > 0) ? renderMCOptions(question) : `
                    <textarea id=\"user-answer\" 
                              placeholder=\"Geben Sie hier Ihre Antwort ein...\"
                              rows=\"8\"
                              class=\"w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y\"></textarea>
                    `}
                    
                    <div class="flex flex-wrap gap-2">
                        <button id="check-answer" class="bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 font-medium">
                            Antwort prüfen
                        </button>
                        
                        <button id="reset-answer" class="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600">
                            Zurücksetzen
                        </button>
                        
                        <button id="skip-question" class="bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600">
                            Überspringen
                        </button>
                        
                        ${state.session.settings.showHints ? `
                            <button id="hint-1" class="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 hint-btn" data-level="1">
                                Hinweis 1
                            </button>
                            
                            <button id="hint-2" class="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 hint-btn" data-level="2" disabled>
                                Hinweis 2
                            </button>
                            
                            <button id="hint-3" class="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 hint-btn" data-level="3" disabled>
                                Hinweis 3
                            </button>
                        ` : ''}
                        
                        ${state.session.settings.showSolution ? `
                            <button id="show-solution" class="bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600">
                                Lösung zeigen
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Bewertung -->
                <div id="evaluation-result" class="hidden mt-6 p-4 bg-gray-50 rounded-lg">
                    <!-- Wird via JavaScript gefüllt -->
                </div>
                
                <!-- Hinweise -->
                <div id="hints-container" class="hidden mt-6 space-y-3">
                    <!-- Wird via JavaScript gefüllt -->
                </div>
                
                <!-- Lösung -->
                <div id="solution-container" class="hidden mt-6">
                    <h4 class="text-lg font-medium text-gray-900 mb-3">📖 Musterlösung</h4>
                    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div class="prose max-w-none solution-text">
                            ${renderMarkdown(question.given_answer)}
                        </div>
                        ${question.notes ? `
                            <div class="mt-4 pt-4 border-t border-green-300">
                                <p class="text-sm text-green-700">
                                    <strong>Hinweise:</strong> ${question.notes}
                                </p>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="mt-4 flex space-x-3">
                        <button id="mark-correct" class="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700">
                            ✓ Als korrekt markieren
                        </button>
                        <button id="mark-incorrect" class="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700">
                            ✗ Als falsch markieren
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Rendert Multiple-Choice Optionen (Radio/Checkbox)
 * Erwartet question.options als Array von Strings. Optional: question.correct_options als Array von korrekten Labels/Indices.
 * @param {object} question
 * @returns {string}
 */
function renderMCOptions(question) {
    const isMulti = question.type === 'mc_check';
    const inputType = isMulti ? 'checkbox' : 'radio';
    const name = `mc-${question.id}`;
    const options = Array.isArray(question.options) && question.options.length > 0
        ? question.options
        : [];
    const labels = options.length === 0 ? [] : options.map((opt, idx) => {
        const letter = String.fromCharCode(65 + idx); // A,B,C,...
        return { value: letter, text: opt.text || opt.label || opt };
    });
    return `
        <div id="mc-container" class="space-y-2">
            ${labels.map(({ value, text }) => `
                <label class="flex items-start space-x-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                    <input type="${inputType}" name="${name}" value="${value}" class="mt-1 mc-input rounded">
                    <span><strong>${value})</strong> ${escapeHtml(String(text))}</span>
                </label>
            `).join('')}
            <textarea id="user-answer" style="display:none"></textarea>
        </div>
    `;
}

/**
 * Rendert Timer-Display
 * @returns {string} HTML
 */
function renderTimer() {
    if (!state.session.timeLimit) return '';
    
    return `
        <div id="timer-display" class="text-sm font-mono bg-gray-100 px-3 py-1 rounded">
            ⏱️ <span id="timer-text">--:--</span>
        </div>
    `;
}

/**
 * Rendert Bildsektion mit Fallback-Kette
 * @param {object} question - Frage-Objekt
 * @returns {string} HTML
 */
export function renderImageSection(question) {
    const imageInfo = question._image || { kind: null };
    
    // 1) User-Upload anzeigen
    if (imageInfo.kind === 'user') {
        return `
            <div class="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center space-x-2">
                        <span class="text-green-600">👤</span>
                        <span class="text-green-800 font-medium">Ihr hochgeladenes Bild</span>
                    </div>
                    <span class="text-xs text-green-600">Quelle: Nutzer-Upload</span>
                </div>
                <div class="text-center">
                    <img src="${imageInfo.src}" alt="Nutzer-Upload" class="max-w-full max-h-96 mx-auto rounded shadow-md">
                </div>
                ${imageInfo.metadata ? `
                    <div class="mt-2 text-xs text-green-600">
                        Datei: ${imageInfo.metadata.filename || 'Unbenannt'} • 
                        Hochgeladen: ${imageInfo.metadata.uploadDate ? new Date(imageInfo.metadata.uploadDate).toLocaleDateString() : 'Unbekannt'}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // 2) Asset-Bild anzeigen
    if (imageInfo.kind === 'asset') {
        const filename = imageInfo.src?.split('/').pop() || 'unbekannt';
        return `
            <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center space-x-2">
                        <span class="text-blue-600">🗂️</span>
                        <span class="text-blue-800 font-medium">Asset-Bild</span>
                    </div>
                    <span class="text-xs text-blue-600">Quelle: Assets (${filename})</span>
                </div>
                <div class="text-center">
                    <img src="${imageInfo.src}" alt="Asset-Bild" class="max-w-full max-h-96 mx-auto rounded shadow-md" 
                         onerror="this.parentElement.innerHTML='<div class=\\'text-red-600\\'>❌ Bild nicht gefunden: ${filename}</div>'">
                </div>
                ${imageInfo.metadata ? `
                    <div class="mt-2 text-xs text-blue-600">
                        Mapping: ${imageInfo.metadata.mappingType} ${imageInfo.metadata.hintKey ? `(${imageInfo.metadata.hintKey})` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // 3) SVG-Stub anzeigen
    if (imageInfo.kind === 'stub' && imageInfo.stubKind) {
        return `
            <div class="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center space-x-2">
                        <span class="text-purple-600">📊</span>
                        <span class="text-purple-800 font-medium">SVG-Diagramm-Stub</span>
                    </div>
                    <span class="text-xs text-purple-600">Quelle: Stub (${imageInfo.stubKind.replace('_', ' ')})</span>
                </div>
                <div id="svg-stub-container-${question.id}">
                    <!-- SVG wird hier via JavaScript eingefügt -->
                </div>
                ${imageInfo.metadata ? `
                    <div class="mt-2 text-xs text-purple-600">
                        Erkannt aus: ${imageInfo.metadata.inferredFrom}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // 4) Text-Fallback mit Checkliste
    return renderTextFallback(question);
}

/**
 * Rendert Text-Fallback mit Checkliste
 * @param {object} question - Frage-Objekt
 * @returns {string} HTML
 */
function renderTextFallback(question) {
    const keywords = extractKeywords(question);
    const description = generateQuestionDescription(question);
    
    return `
        <div class="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-2">
                    <span class="text-yellow-600">📝</span>
                    <span class="text-yellow-800 font-medium">Text-Fallback</span>
                </div>
                <span class="text-xs text-yellow-600">Quelle: Generiert</span>
            </div>
            
            <!-- Aufgabenbeschreibung -->
            <div class="mb-4">
                <h4 class="font-medium text-yellow-900 mb-2">Aufgabenbeschreibung:</h4>
                <div class="bg-yellow-100 p-3 rounded text-sm text-yellow-800">
                    ${description}
                </div>
            </div>
            
            <!-- Original-Bildhinweise -->
            ${question.images && question.images.length > 0 ? `
                <div class="mb-4">
                    <h4 class="font-medium text-yellow-900 mb-2">Original-Bildhinweise:</h4>
                    <div class="space-y-1">
                        ${question.images.map(img => `
                            <div class="text-sm text-yellow-700 bg-yellow-100 p-2 rounded">
                                🖼️ ${escapeHtml(img)}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Schlüsselbegriffe-Checkliste -->
            ${keywords.length > 0 ? `
                <div>
                    <h4 class="font-medium text-yellow-900 mb-2">Erwartete Schlüsselbegriffe:</h4>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                        ${keywords.map(keyword => `
                            <div class="flex items-center space-x-2 text-sm">
                                <input type="checkbox" class="keyword-check rounded" data-keyword="${escapeHtml(keyword)}">
                                <span class="text-yellow-700">${escapeHtml(keyword)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Extrahiert Schlüsselbegriffe aus Frage und Antwort
 * @param {object} question - Frage-Objekt
 * @returns {array} Array von Keywords
 */
function extractKeywords(question) {
    const text = [
        question.given_answer || '',
        question.math_blocks?.join(' ') || '',
        question.notes || ''
    ].join(' ');
    
    // Einfache Keyword-Extraktion
    const words = text.toLowerCase()
        .replace(/[^\w\säöüß-]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !isStopWord(word));
    
    // Häufigste Wörter finden
    const frequency = {};
    words.forEach(word => {
        frequency[word] = (frequency[word] || 0) + 1;
    });
    
    return Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([word]) => word);
}

/**
 * Generiert Aufgabenbeschreibung basierend auf verfügbaren Daten
 * @param {object} question - Frage-Objekt
 * @returns {string} Beschreibungstext
 */
function generateQuestionDescription(question) {
    const parts = [];
    
    if (question.topic) {
        parts.push(`Diese Aufgabe behandelt das Thema <strong>${question.topic}</strong>.`);
    }
    
    if (question.type === 'bildbasierte_frage') {
        parts.push('Die ursprüngliche Aufgabe basierte auf einem Bild oder Diagramm, das hier nicht verfügbar ist.');
    }
    
    if (question.math_blocks && question.math_blocks.length > 0) {
        parts.push('Die Aufgabe enthält mathematische Formeln und Berechnungen.');
    }
    
    if (question._image?.metadata?.inferredFrom) {
        const fields = question._image.metadata.inferredFrom.split(', ');
        const topics = fields.map(field => {
            switch (field) {
                case 'topic': return 'Themenbereich';
                case 'images': return 'Bildhinweise';
                case 'notes': return 'Anmerkungen';
                case 'question_text': return 'Fragetext';
                default: return field;
            }
        }).join(', ');
        parts.push(`Basierend auf ${topics} wird ein Diagramm zu diesem Bereich erwartet.`);
    }
    
    if (parts.length === 0) {
        parts.push('Beantworten Sie die Frage basierend auf den verfügbaren Informationen.');
    }
    
    return parts.join(' ');
}

/**
 * Prüft ob ein Wort ein Stoppwort ist
 * @param {string} word - Zu prüfendes Wort
 * @returns {boolean} Ist Stoppwort
 */
function isStopWord(word) {
    const stopWords = [
        'der', 'die', 'das', 'und', 'oder', 'aber', 'mit', 'von', 'für', 'auf', 'aus', 'bei', 'nach', 'über',
        'durch', 'gegen', 'ohne', 'unter', 'wird', 'werden', 'ist', 'sind', 'war', 'waren', 'hat', 'haben',
        'kann', 'soll', 'muss', 'wenn', 'dann', 'also', 'dass', 'sich', 'nicht', 'nur', 'auch', 'noch',
        'sehr', 'hier', 'dort', 'eine', 'eines', 'einem', 'einen', 'einer', 'this', 'that', 'with', 'from',
        'they', 'have', 'been', 'will', 'would', 'could', 'should'
    ];
    
    return stopWords.includes(word.toLowerCase());
}

/**
 * Rendert Ergebnisseite
 * @returns {string} HTML
 */
function renderResults() {
    console.log('🎨 renderResults() aufgerufen');
    const stats = getSessionStats();
    console.log('📊 Erhaltene Stats:', stats);
    
    // Verwende aktive Session oder letzte abgeschlossene Session
    let results, sessionMode, sessionQueue;
    
    if (state.session.mode && state.session.results.length > 0) {
        // Aktive Session
        console.log('📋 Verwende aktive Session für Results');
        results = state.session.results;
        sessionMode = state.session.mode;
        sessionQueue = state.session.queue;
    } else if (state.lastCompletedSession) {
        // Letzte abgeschlossene Session
        console.log('📋 Verwende lastCompletedSession für Results');
        results = state.lastCompletedSession.results;
        sessionMode = state.lastCompletedSession.mode;
        // Rekonstruiere Queue aus Results für renderResultItem
        sessionQueue = results.map(result => {
            const question = state.questions.find(q => q.id === result.questionId);
            return question || { id: result.questionId, topic: 'Unknown', type: 'Unknown' };
        });
    } else {
        // Fallback
        console.log('⚠️ Fallback: Keine Session-Daten für Results gefunden');
        results = [];
        sessionMode = 'learn';
        sessionQueue = [];
    }
    
    return `
        <div class="max-w-6xl mx-auto space-y-8">
            <!-- Header -->
            <div class="text-center">
                <h1 class="text-4xl font-bold text-gray-900 mb-4">📊 Session-Ergebnisse</h1>
                <p class="text-lg text-gray-600">Auswertung Ihrer ${sessionMode === 'exam' ? 'Prüfung' : 'Lernsession'}</p>
            </div>
            
            <!-- Statistiken -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                ${renderStatCard('Beantwortet', `${stats.answeredQuestions}/${stats.totalQuestions}`, 'text-blue-600')}
                ${renderStatCard('Durchschnitt', formatScore(stats.averageScore), getScoreColor(stats.averageScore))}
                ${renderStatCard('Korrekt', `${stats.correctAnswers}`, 'text-green-600')}
                ${renderStatCard('Zeit', formatTime(stats.timeSpent), 'text-purple-600')}
            </div>
            
            <!-- Detailierte Ergebnisse -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">Detailauswertung</h2>
                
                ${results.length === 0 ? `
                    <p class="text-gray-600 text-center py-8">Keine Antworten vorhanden.</p>
                ` : `
                    <div class="space-y-4">
                        ${results.map((result, index) => renderResultItem(result, index, sessionQueue)).join('')}
                    </div>
                `}
            </div>
            
            <!-- Aktionen -->
            <div class="flex justify-center space-x-4">
                <button id="export-results" class="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700">
                    📄 Ergebnisse exportieren
                </button>
                
                <button id="restart-session" class="bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700">
                    🔄 Nochmal versuchen
                </button>
                
                <button id="back-to-dashboard" class="bg-primary-600 text-white py-2 px-6 rounded-lg hover:bg-primary-700">
                    🏠 Zurück zum Dashboard
                </button>
            </div>
        </div>
    `;
}

/**
 * Rendert Fragenkatalog
 * @returns {string} HTML
 */
function renderCatalog() {
    const filteredQuestions = getFilteredQuestions();
    
    return `
        <div class="max-w-6xl mx-auto space-y-6">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <h1 class="text-3xl font-bold text-gray-900">📚 Fragenkatalog</h1>
                <button id="back-to-dashboard" class="bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700">
                    Zurück zum Dashboard
                </button>
            </div>
            
            <!-- Filter-Info -->
            <div class="bg-white rounded-lg shadow-md p-4">
                <p class="text-sm text-gray-600">
                    Zeige ${filteredQuestions.length} von ${state.questions.length} Fragen
                    ${state.filters.search ? ` • Suche: "${state.filters.search}"` : ''}
                    ${state.filters.activeTopics.size > 0 ? ` • Topics: ${Array.from(state.filters.activeTopics).join(', ')}` : ''}
                    ${state.filters.activeTypes.size > 0 ? ` • Typen: ${Array.from(state.filters.activeTypes).join(', ')}` : ''}
                </p>
            </div>
            
            <!-- Fragenliste -->
            <div class="space-y-4">
                ${filteredQuestions.map(question => renderCatalogItem(question)).join('')}
            </div>
            
            ${filteredQuestions.length === 0 ? `
                <div class="text-center py-12 bg-white rounded-lg shadow-md">
                    <p class="text-gray-600 text-lg">Keine Fragen gefunden für die aktuellen Filter.</p>
                    <button id="clear-filters" class="mt-4 text-primary-600 hover:text-primary-700">
                        Filter zurücksetzen
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Rendert einzelnes Katalog-Item
 * @param {object} question - Frage
 * @returns {string} HTML
 */
function renderCatalogItem(question) {
    const preview = question.question_text.substring(0, 200) + (question.question_text.length > 200 ? '...' : '');
    
    return `
        <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center space-x-2">
                    <span class="bg-primary-100 text-primary-800 px-2 py-1 rounded text-sm font-medium">
                        ${question.topic}
                    </span>
                    <span class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                        ${formatType(question.type)}
                    </span>
                    ${!question.verified ? `
                        <span class="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm">⚠️</span>
                    ` : ''}
                </div>
                <span class="text-xs text-gray-500">${question.id}</span>
            </div>
            
            <p class="text-gray-800 mb-3">${escapeHtml(preview)}</p>
            
            <div class="flex items-center justify-between text-sm text-gray-500">
                <div class="flex items-center space-x-4">
                    ${question.math_blocks && question.math_blocks.length > 0 ? `
                        <span>📐 ${question.math_blocks.length} Formeln</span>
                    ` : ''}
                    ${question.images && question.images.length > 0 ? `
                        <span>🖼️ ${question.images.length} Bilder</span>
                    ` : ''}
                    <span>📄 ${question.source}</span>
                </div>
                
                ${question.userScore !== null ? `
                    <span class="${getScoreColor(question.userScore)}">
                        ${formatScore(question.userScore)}
                    </span>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Utility-Funktionen
 */

function renderStatCard(title, value, colorClass, subtitle = '') {
    return `
        <div class="bg-white rounded-lg shadow-md p-6">
            <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">${title}</h3>
            <p class="text-3xl font-bold ${colorClass} mt-2">${value}</p>
            ${subtitle ? `<p class="text-xs text-gray-400 mt-1">${subtitle}</p>` : ''}
        </div>
    `;
}

function renderDataSources() {
    if (state.originalSources.length === 0) {
        return `
            <div class="text-center py-6 text-gray-500">
                <p>Noch keine Daten geladen.</p>
                <p class="text-sm mt-1">Laden Sie JSON-Dateien hoch oder stellen Sie sicher, dass exam_questions_combined.json verfügbar ist.</p>
            </div>
        `;
    }
    
    return `
        <div class="space-y-3">
            ${state.originalSources.map(source => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                        <span class="font-medium text-gray-900">${source.name}</span>
                        <span class="text-sm text-gray-500 ml-2">${source.count} Fragen</span>
                        ${source.duplicates ? `<span class="text-xs text-orange-600 ml-2">(${source.duplicates} Duplikate übersprungen)</span>` : ''}
                    </div>
                    <span class="text-xs text-gray-400">
                        ${new Date(source.loadTime).toLocaleString()}
                    </span>
                </div>
            `).join('')}
        </div>
    `;
}

function renderResultItem(result, index, sessionQueue = []) {
    const question = sessionQueue.find(q => q.id === result.questionId);
    const questionTitle = question ? question.topic : `Frage ${index + 1}`;
    
    return `
        <div class="flex items-center justify-between p-4 border rounded-lg ${result.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}">
            <div class="flex-1">
                <h4 class="font-medium text-gray-900">${questionTitle}</h4>
                <p class="text-sm text-gray-600 mt-1">
                    ${result.userAnswer.substring(0, 100)}${result.userAnswer.length > 100 ? '...' : ''}
                </p>
            </div>
            
            <div class="text-right">
                <div class="font-bold ${getScoreColor(result.score)}">
                    ${formatScore(result.score)}
                </div>
                <div class="text-xs text-gray-500">
                    ${result.hintsUsed ? `${result.hintsUsed} Hinweise` : ''}
                    ${result.timeSpent ? ` • ${Math.round(result.timeSpent / 1000)}s` : ''}
                </div>
            </div>
        </div>
    `;
}

function getTopicCounts(questions) {
    const counts = {};
    questions.forEach(q => {
        counts[q.topic] = (counts[q.topic] || 0) + 1;
    });
    return counts;
}

function getTypeCounts(questions) {
    const counts = {};
    questions.forEach(q => {
        counts[q.type] = (counts[q.type] || 0) + 1;
    });
    return counts;
}

function countQuestionsWithMath() {
    return state.questions.filter(q => q.math_blocks && q.math_blocks.length > 0).length;
}

function countImageQuestions() {
    return state.questions.filter(q => q.type === 'bildbasierte_frage').length;
}

function countUnverifiedQuestions() {
    return state.questions.filter(q => !q.verified).length;
}

function formatType(type) {
    const typeMap = {
        'offene_frage': 'Offene Frage',
        'rechenaufgabe': 'Rechenaufgabe',
        'definition': 'Definition',
        'bildbasierte_frage': 'Bildbasierte Frage',
        'mc_radio': 'Multiple Choice (Single)',
        'mc_check': 'Multiple Choice (Mehrfach)'
    };
    return typeMap[type] || type;
}

function formatTime(milliseconds) {
    if (!milliseconds) return '0:00';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Post-Rendering für Bildsektion (SVG-Stubs einfügen)
 * @param {object} question - Frage-Objekt
 */
export function postRenderImageSection(question) {
    if (!question._image || question._image.kind !== 'stub' || !question._image.stubKind) {
        return;
    }
    
    const container = document.getElementById(`svg-stub-container-${question.id}`);
    if (container) {
        const success = renderDiagramStub(container, question._image.stubKind);
        if (success) {
            console.log(`✅ SVG-Stub '${question._image.stubKind}' für Frage ${question.id} gerendert`);
        }
    }
}

/**
 * Rendert Datenquelle-Status im Header
 */
export function updateDataStatus() {
    const statusElement = document.getElementById('data-status');
    if (!statusElement) return;
    
    if (state.ui.loading) {
        statusElement.innerHTML = '⏳ Lade...';
        return;
    }
    
    if (state.ui.error) {
        statusElement.innerHTML = `❌ ${state.ui.error}`;
        statusElement.className = 'text-sm text-red-300';
        return;
    }
    
    if (state.questions.length === 0) {
        statusElement.innerHTML = '📁 Keine Daten';
        statusElement.className = 'text-sm text-yellow-300';
        return;
    }
    
    statusElement.innerHTML = `✅ ${state.questions.length} Fragen`;
    statusElement.className = 'text-sm text-green-300';
}

/**
 * Rendert die Benutzerstatistik-Seite
 * @returns {string} HTML
 */
async function renderStatistics() {
    const isAuth = isAuthenticated();
    
    // If not authenticated, show login prompt
    if (!isAuth) {
        return `
            <div class="max-w-4xl mx-auto space-y-8">
                <!-- Header -->
                <div class="text-center">
                    <h1 class="text-3xl font-bold text-gray-900">📊 Meine Statistiken</h1>
                    <p class="text-gray-600 mt-2">Detaillierte Analyse deines Lernfortschritts</p>
                </div>

                <!-- Login Required Notice -->
                <div class="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
                    <div class="text-6xl mb-4">🔐</div>
                    <h3 class="text-xl font-semibold text-blue-900 mb-4">Melde dich an für erweiterte Funktionen</h3>
                    <p class="text-blue-700 mb-6">
                        Um deine persönlichen Lernstatistiken zu sehen, musst du dich anmelden. 
                        Mit einem Konto kannst du:
                    </p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-left">
                        <div class="bg-white rounded-lg p-4 border border-blue-200">
                            <div class="flex items-center space-x-3 mb-2">
                                <span class="text-blue-600 text-xl">📊</span>
                                <span class="font-medium text-blue-900">Detaillierte Statistiken</span>
                            </div>
                            <p class="text-sm text-blue-700">Verfolge deinen Fortschritt mit Genauigkeitsraten, Lernzeiten und Themenanalysen</p>
                        </div>
                        <div class="bg-white rounded-lg p-4 border border-blue-200">
                            <div class="flex items-center space-x-3 mb-2">
                                <span class="text-blue-600 text-xl">🏆</span>
                                <span class="font-medium text-blue-900">Errungenschaften</span>
                            </div>
                            <p class="text-sm text-blue-700">Sammle Achievements und verfolge deine Lernstreak-Erfolge</p>
                        </div>
                        <div class="bg-white rounded-lg p-4 border border-blue-200">
                            <div class="flex items-center space-x-3 mb-2">
                                <span class="text-blue-600 text-xl">🔄</span>
                                <span class="font-medium text-blue-900">Geräteübergreifend</span>
                            </div>
                            <p class="text-sm text-blue-700">Synchronisiere deinen Fortschritt zwischen verschiedenen Geräten</p>
                        </div>
                        <div class="bg-white rounded-lg p-4 border border-blue-200">
                            <div class="flex items-center space-x-3 mb-2">
                                <span class="text-blue-600 text-xl">📈</span>
                                <span class="font-medium text-blue-900">Ranglisten-Teilnahme</span>
                            </div>
                            <p class="text-sm text-blue-700">Vergleiche dich mit anderen Lernenden in der Bestenliste</p>
                        </div>
                    </div>
                    <div class="space-x-4">
                        <button onclick="openAuthModal('login')" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                            🔑 Jetzt anmelden
                        </button>
                        <button onclick="openAuthModal('register')" class="bg-white hover:bg-gray-50 text-blue-600 border border-blue-300 px-6 py-3 rounded-lg font-semibold transition-colors">
                            ✨ Kostenloses Konto erstellen
                        </button>
                    </div>
                    <p class="text-xs text-blue-600 mt-4">
                        💡 <strong>Demo-Modus:</strong> Einfach einen beliebigen Benutzernamen und ein 4+ Zeichen Passwort eingeben
                    </p>
                </div>

                <!-- Back to Dashboard -->
                <div class="text-center">
                    <button id="back-to-dashboard" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                        ← Zurück zum Dashboard
                    </button>
                </div>
            </div>
        `;
    }

    const userStats = await getUserStatistics();
    const currentUser = getCurrentUser();
    const username = currentUser ? currentUser.displayName || currentUser.username : 'Benutzer';

    return `
        <div class="max-w-6xl mx-auto space-y-8">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900">Meine Statistiken</h1>
                    <p class="text-gray-600 mt-2">Analysiere deinen Lernfortschritt, ${username}</p>
                </div>
                <button id="back-to-dashboard" class="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors">
                    ← Zurück zum Dashboard
                </button>
            </div>

            <!-- Main Statistics Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-blue-100 text-sm font-medium">Fragen beantwortet</p>
                            <p class="text-3xl font-bold" data-animate-counter="${userStats.totalQuestions}">0</p>
                        </div>
                        <div class="bg-blue-400 rounded-full p-3">
                            <span class="text-2xl">📝</span>
                        </div>
                    </div>
                </div>

                <div class="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-green-100 text-sm font-medium">Genauigkeit</p>
                            <p class="text-3xl font-bold" data-animate-counter="${Math.round(userStats.accuracyRate * 100)}">0<span class="text-xl">%</span></p>
                        </div>
                        <div class="bg-green-400 rounded-full p-3">
                            <span class="text-2xl">🎯</span>
                        </div>
                    </div>
                </div>

                <div class="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-purple-100 text-sm font-medium">Zeit investiert</p>
                            <p class="text-3xl font-bold" data-animate-counter="${Math.round(userStats.timeInvested / (1000 * 60))}">0<span class="text-xl">min</span></p>
                        </div>
                        <div class="bg-purple-400 rounded-full p-3">
                            <span class="text-2xl">⏱️</span>
                        </div>
                    </div>
                </div>

                <div class="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-6 shadow-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-orange-100 text-sm font-medium">Lernstreak</p>
                            <p class="text-3xl font-bold" data-animate-counter="${userStats.learningStreak}">0<span class="text-xl"> Tage</span></p>
                        </div>
                        <div class="bg-orange-400 rounded-full p-3">
                            <span class="text-2xl">🔥</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Session Breakdown Chart -->
            <div class="bg-white rounded-xl shadow-lg p-6">
                <h2 class="text-xl font-bold text-gray-900 mb-6">📈 Session-Übersicht</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="space-y-4">
                        <h3 class="font-semibold text-gray-700">Session-Arten</h3>
                        <div class="space-y-3">
                            <div class="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                <div class="flex items-center space-x-3">
                                    <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                                    <span class="font-medium">Lernmodus</span>
                                </div>
                                <div class="text-right">
                                    <div class="font-bold text-blue-600">${userStats.sessionBreakdown.learn.count} Sessions</div>
                                    <div class="text-sm text-gray-600">${userStats.sessionBreakdown.learn.questions} Fragen</div>
                                </div>
                            </div>
                            <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                <div class="flex items-center space-x-3">
                                    <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span class="font-medium">Prüfungsmodus</span>
                                </div>
                                <div class="text-right">
                                    <div class="font-bold text-green-600">${userStats.sessionBreakdown.exam.count} Sessions</div>
                                    <div class="text-sm text-gray-600">${userStats.sessionBreakdown.exam.questions} Fragen</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="space-y-4">
                        <h3 class="font-semibold text-gray-700">Genauigkeit nach Modus</h3>
                        <div class="space-y-3">
                            <div class="space-y-2">
                                <div class="flex justify-between text-sm">
                                    <span>Lernmodus</span>
                                    <span class="font-medium">${Math.round(userStats.sessionBreakdown.learn.accuracy * 100)}%</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div class="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-out" style="width: ${userStats.sessionBreakdown.learn.accuracy * 100}%"></div>
                                </div>
                            </div>
                            <div class="space-y-2">
                                <div class="flex justify-between text-sm">
                                    <span>Prüfungsmodus</span>
                                    <span class="font-medium">${Math.round(userStats.sessionBreakdown.exam.accuracy * 100)}%</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div class="bg-green-500 h-2 rounded-full transition-all duration-1000 ease-out" style="width: ${userStats.sessionBreakdown.exam.accuracy * 100}%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Topic Performance -->
            ${Object.keys(userStats.topicBreakdown).length > 0 ? `
            <div class="bg-white rounded-xl shadow-lg p-6">
                <h2 class="text-xl font-bold text-gray-900 mb-6">🎯 Performance nach Themen</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${Object.entries(userStats.topicBreakdown)
                        .sort(([,a], [,b]) => b.count - a.count)
                        .slice(0, 6)
                        .map(([topic, data]) => `
                        <div class="border border-gray-200 rounded-lg p-4">
                            <h3 class="font-medium text-gray-900 text-sm mb-2">${topic}</h3>
                            <div class="space-y-2">
                                <div class="flex justify-between text-xs text-gray-600">
                                    <span>${data.count} Fragen</span>
                                    <span>${Math.round(data.accuracy * 100)}% korrekt</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div class="bg-indigo-500 h-2 rounded-full transition-all duration-1000 ease-out" style="width: ${data.accuracy * 100}%"></div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Recent Activity -->
            ${userStats.recentActivity.length > 0 ? `
            <div class="bg-white rounded-xl shadow-lg p-6">
                <h2 class="text-xl font-bold text-gray-900 mb-6">📅 Letzte Aktivität (7 Tage)</h2>
                <div class="space-y-3">
                    ${userStats.recentActivity.slice(0, 5).map(activity => {
                        const date = new Date(activity.date);
                        const isToday = date.toDateString() === new Date().toDateString();
                        const displayDate = isToday ? 'Heute' : date.toLocaleDateString('de-DE', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                        });
                        
                        return `
                        <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                            <div class="flex items-center space-x-3">
                                <div class="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                <div>
                                    <div class="font-medium text-sm">${displayDate}</div>
                                    <div class="text-xs text-gray-600">${activity.mode === 'learn' ? 'Lernmodus' : 'Prüfungsmodus'}</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-sm font-medium">${activity.questions} Fragen</div>
                                <div class="text-xs text-gray-600">${Math.round(activity.accuracy * 100)}% korrekt</div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Achievements -->
            ${userStats.achievements.length > 0 ? `
            <div class="bg-white rounded-xl shadow-lg p-6">
                <h2 class="text-xl font-bold text-gray-900 mb-6">🏆 Errungenschaften</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${userStats.achievements.map(achievement => `
                        <div class="bg-gradient-to-br from-yellow-400 to-yellow-500 text-white rounded-lg p-4 shadow-md transform hover:scale-105 transition-transform">
                            <div class="flex items-center space-x-3">
                                <span class="text-2xl">${achievement.icon}</span>
                                <div>
                                    <h3 class="font-bold">${achievement.name}</h3>
                                    <p class="text-yellow-100 text-sm">${achievement.description}</p>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Actions -->
            <div class="flex justify-center space-x-4">
                <button id="view-leaderboard" class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                    🏆 Rangliste anzeigen
                </button>
                <button id="back-to-dashboard" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                    ← Zurück zum Dashboard
                </button>
            </div>
        </div>
    `;
}

/**
 * Rendert die Rangliste-Seite
 * @returns {string} HTML
 */
function renderLeaderboard() {
    const isAuth = isAuthenticated();
    const currentUser = getCurrentUser();

    return `
        <div class="max-w-6xl mx-auto space-y-8">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900">🏆 Rangliste</h1>
                    <p class="text-gray-600 mt-2">Vergleiche deine Leistung mit anderen Lernenden</p>
                </div>
                <div class="flex space-x-3">
                    ${isAuth ? `
                    <button id="view-my-stats" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors">
                        📊 Meine Statistiken
                    </button>
                    ` : ''}
                    <button id="back-to-dashboard" class="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors">
                        ← Zurück zum Dashboard
                    </button>
                </div>
            </div>

            <!-- Filters and Sort -->
            <div class="bg-white rounded-xl shadow-sm p-6">
                <div class="flex flex-wrap items-center justify-between gap-4">
                    <div class="flex items-center space-x-4">
                        <label class="text-sm font-medium text-gray-700">Sortieren nach:</label>
                        <select id="leaderboard-sort" class="border border-gray-300 rounded-md px-3 py-2 text-sm">
                            <option value="total_questions">Gesamtfragen</option>
                            <option value="accuracy">Genauigkeit</option>
                            <option value="time_invested">Zeit investiert</option>
                            <option value="learning_streak">Lernstreak</option>
                        </select>
                    </div>
                    <div class="flex items-center space-x-4">
                        <label class="text-sm font-medium text-gray-700">Filter:</label>
                        <select id="leaderboard-filter" class="border border-gray-300 rounded-md px-3 py-2 text-sm">
                            <option value="all">Alle Benutzer</option>
                            <option value="active">Aktive (letzte 7 Tage)</option>
                            <option value="streak">Mit Lernstreak</option>
                        </select>
                    </div>
                    <button id="refresh-leaderboard" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                        🔄 Aktualisieren
                    </button>
                </div>
            </div>

            <!-- Leaderboard Loading State -->
            <div id="leaderboard-loading" class="bg-white rounded-xl shadow-sm p-12 text-center">
                <div class="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full" role="status" aria-label="loading">
                    <span class="sr-only">Laden...</span>
                </div>
                <p class="text-gray-600 mt-4">Lade Rangliste...</p>
            </div>

            <!-- Leaderboard Table -->
            <div id="leaderboard-content" class="bg-white rounded-xl shadow-lg overflow-hidden hidden">
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rang</th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Benutzer</th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fragen</th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Genauigkeit</th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zeit</th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Streak</th>
                                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punkte</th>
                            </tr>
                        </thead>
                        <tbody id="leaderboard-rows" class="bg-white divide-y divide-gray-200">
                            <!-- Rows will be inserted here -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- No Data State -->
            <div id="leaderboard-empty" class="bg-white rounded-xl shadow-sm p-12 text-center hidden">
                <div class="text-6xl mb-4">🏆</div>
                <h3 class="text-xl font-semibold text-gray-900 mb-2">Noch keine Rangliste verfügbar</h3>
                <p class="text-gray-600 mb-6">Starte deine erste Lernsession, um in der Rangliste zu erscheinen!</p>
                <button id="start-learning-from-leaderboard" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                    🎓 Jetzt lernen starten
                </button>
            </div>

            <!-- Offline Notice -->
            ${!isAuth ? `
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div class="flex items-center space-x-3">
                    <span class="text-blue-600 text-xl">ℹ️</span>
                    <div>
                        <h3 class="font-semibold text-blue-900">Melde dich an für erweiterte Funktionen</h3>
                        <p class="text-blue-700 text-sm mt-1">
                            Mit einem Konto kannst du dich mit anderen vergleichen und deinen Fortschritt verfolgen.
                        </p>
                        <button onclick="openAuthModal('login')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm mt-3 transition-colors">
                            Jetzt anmelden
                        </button>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;
}
