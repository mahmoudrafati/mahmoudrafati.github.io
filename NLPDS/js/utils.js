/**
 * Utility functions for NLP Learning App
 * Tokenization, similarity measures, and text processing
 */

// Deutsche und englische Stopwörter (kleine Auswahl)
export const STOPWORDS_DE = new Set([
    'der', 'die', 'das', 'und', 'oder', 'aber', 'ist', 'sind', 'war', 'waren',
    'ein', 'eine', 'den', 'dem', 'des', 'in', 'von', 'zu', 'mit', 'auf',
    'für', 'als', 'bei', 'nach', 'über', 'unter', 'durch', 'vor', 'zwischen',
    'ohne', 'gegen', 'um', 'an', 'aus', 'nicht', 'nur', 'auch', 'noch',
    'so', 'sehr', 'wenn', 'wie', 'was', 'wo', 'wer', 'wann', 'warum',
    'kann', 'wird', 'werden', 'hat', 'haben', 'sein', 'seine', 'ihrer'
]);

export const STOPWORDS_EN = new Set([
    'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'a', 'an',
    'in', 'of', 'to', 'with', 'on', 'for', 'as', 'at', 'by', 'from',
    'up', 'about', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'between', 'among', 'since', 'without', 'under',
    'not', 'only', 'also', 'still', 'if', 'how', 'what', 'where',
    'when', 'why', 'who', 'which', 'can', 'will', 'would', 'has', 'have',
    'had', 'his', 'her', 'their', 'this', 'that', 'these', 'those'
]);

/**
 * Tokenisiert Text in einzelne Wörter
 * @param {string} text - Input text
 * @returns {string[]} Array von Tokens
 */
export function tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    
    return text
        .toLowerCase()
        // Entferne Satzzeichen, behalte deutsche Umlaute und mathematische Symbole
        .replace(/[^\w\säöüß\\^{}()[\]_=<>≤≥±∞∑∏∈∉⊆⊇∪∩]/g, ' ')
        // Splitte an Whitespace
        .split(/\s+/)
        // Entferne leere Strings
        .filter(token => token.length > 0);
}

/**
 * Entfernt Stopwörter aus Token-Array
 * @param {string[]} tokens - Array von Tokens
 * @param {Set} stopwords - Set von Stopwörtern
 * @returns {string[]} Gefilterte Tokens
 */
export function removeStopwords(tokens, stopwords = STOPWORDS_DE) {
    return tokens.filter(token => !stopwords.has(token));
}

/**
 * Einfaches Stemming für deutsche Wörter (rudimentär)
 * @param {string} word - Einzelnes Wort
 * @returns {string} Gestemmtes Wort
 */
export function stemGerman(word) {
    if (word.length <= 3) return word;
    
    // Entferne häufige deutsche Endungen
    const endings = ['ung', 'lich', 'keit', 'heit', 'isch', 'end', 'est', 'er', 'en', 'em', 'e', 's'];
    
    for (const ending of endings) {
        if (word.endsWith(ending) && word.length > ending.length + 2) {
            return word.slice(0, -ending.length);
        }
    }
    
    return word;
}

/**
 * Verarbeitet Text: Tokenisierung + Stopwort-Entfernung + optional Stemming
 * @param {string} text - Input text
 * @param {boolean} useStemming - Optional stemming anwenden
 * @returns {string[]} Verarbeitete Tokens
 */
export function processText(text, useStemming = false) {
    let tokens = tokenize(text);
    
    // Kombiniere deutsche und englische Stopwörter für gemischte Texte
    const combinedStopwords = new Set([...STOPWORDS_DE, ...STOPWORDS_EN]);
    tokens = removeStopwords(tokens, combinedStopwords);
    
    if (useStemming) {
        tokens = tokens.map(stemGerman);
    }
    
    return tokens;
}

/**
 * Berechnet Jaccard-Similarität zwischen zwei Token-Arrays
 * @param {string[]} setA - Erstes Token-Set
 * @param {string[]} setB - Zweites Token-Set
 * @returns {number} Jaccard-Koeffizient (0-1)
 */
export function jaccardSimilarity(setA, setB) {
    if (!setA.length && !setB.length) return 1.0;
    if (!setA.length || !setB.length) return 0.0;
    
    const sA = new Set(setA);
    const sB = new Set(setB);
    
    const intersection = new Set([...sA].filter(x => sB.has(x)));
    const union = new Set([...sA, ...sB]);
    
    return intersection.size / union.size;
}

/**
 * Berechnet Levenshtein-Distanz zwischen zwei Strings
 * @param {string} a - Erster String
 * @param {string} b - Zweiter String
 * @returns {number} Levenshtein-Distanz
 */
export function levenshteinDistance(a, b) {
    if (!a) return b.length;
    if (!b) return a.length;
    
    const matrix = [];
    
    // Initialisiere erste Zeile und Spalte
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    
    // Fülle Matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    
    return matrix[b.length][a.length];
}

/**
 * Berechnet normalisierte Levenshtein-Similarität (0-1)
 * @param {string} a - Erster String
 * @param {string} b - Zweiter String
 * @returns {number} Normalisierte Similarität (0-1)
 */
export function levenshteinSimilarity(a, b) {
    const maxLength = Math.max(a.length, b.length);
    if (maxLength === 0) return 1.0;
    
    const distance = levenshteinDistance(a, b);
    return 1 - (distance / maxLength);
}

/**
 * Extrahiert Keywords aus Text basierend auf Häufigkeit und Wichtigkeit
 * @param {string} text - Input text
 * @param {number} maxKeywords - Maximale Anzahl Keywords
 * @returns {string[]} Array von Keywords
 */
export function extractKeywords(text, maxKeywords = 10) {
    const tokens = processText(text, true); // Mit Stemming
    
    // Zähle Token-Häufigkeiten
    const frequency = {};
    tokens.forEach(token => {
        frequency[token] = (frequency[token] || 0) + 1;
    });
    
    // Sortiere nach Häufigkeit und nehme Top-N
    const sortedTokens = Object.entries(frequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, maxKeywords)
        .map(([token]) => token);
    
    return sortedTokens;
}

/**
 * Extrahiert mathematische Ausdrücke und LaTeX-Befehle aus Text
 * @param {string} text - Input text
 * @returns {string[]} Array von mathematischen Begriffen
 */
export function extractMathTerms(text) {
    const mathTerms = [];
    
    // LaTeX-Befehle
    const latexCommands = text.match(/\\[a-zA-Z]+/g) || [];
    mathTerms.push(...latexCommands);
    
    // Mathematische Symbole und Begriffe
    const mathPatterns = [
        /\b(softmax|attention|transformer|bert|gpt|lstm|rnn|cnn)\b/gi,
        /\b(embedding|token|vector|matrix|tensor)\b/gi,
        /\b(gradient|backprop|forward|loss|optimizer)\b/gi,
        /\b(accuracy|precision|recall|f1|auc|perplexity)\b/gi,
        /\$[^$]+\$/g, // Inline math
        /\\\([^)]+\\\)/g, // LaTeX inline
    ];
    
    mathPatterns.forEach(pattern => {
        const matches = text.match(pattern) || [];
        mathTerms.push(...matches);
    });
    
    return [...new Set(mathTerms.map(term => term.toLowerCase()))];
}

/**
 * Debugging: Gibt Token-Statistiken aus
 * @param {string} text - Input text
 * @returns {object} Statistik-Objekt
 */
export function analyzeText(text) {
    const rawTokens = tokenize(text);
    const processedTokens = processText(text);
    const keywords = extractKeywords(text);
    const mathTerms = extractMathTerms(text);
    
    return {
        rawTokens,
        processedTokens,
        keywords,
        mathTerms,
        stats: {
            rawCount: rawTokens.length,
            processedCount: processedTokens.length,
            keywordCount: keywords.length,
            mathTermCount: mathTerms.length
        }
    };
}

/**
 * Normalisiert Score-Werte in 0-1 Bereich
 * @param {number} score - Rohwert
 * @param {number} min - Minimum
 * @param {number} max - Maximum
 * @returns {number} Normalisierter Wert
 */
export function normalizeScore(score, min = 0, max = 1) {
    return Math.max(min, Math.min(max, score));
}

/**
 * Formatiert Score als Prozent-String
 * @param {number} score - Score zwischen 0 und 1
 * @returns {string} Formatierter Prozentsatz
 */
export function formatScore(score) {
    return `${Math.round(score * 100)}%`;
}

/**
 * Bestimmt Score-Farbe basierend auf Schwellenwerten
 * @param {number} score - Score zwischen 0 und 1
 * @returns {string} CSS-Klasse für Farbe
 */
export function getScoreColor(score) {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    if (score >= 0.4) return 'text-orange-600';
    return 'text-red-600';
}

/**
 * Bestimmt Score-Bewertung als Text
 * @param {number} score - Score zwischen 0 und 1
 * @returns {string} Textuelle Bewertung
 */
export function getScoreLabel(score) {
    if (score >= 0.9) return 'Ausgezeichnet';
    if (score >= 0.8) return 'Sehr gut';
    if (score >= 0.7) return 'Gut';
    if (score >= 0.6) return 'Befriedigend';
    if (score >= 0.5) return 'Ausreichend';
    if (score >= 0.3) return 'Mangelhaft';
    return 'Ungenügend';
}
