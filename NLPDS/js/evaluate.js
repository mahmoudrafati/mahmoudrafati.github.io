/**
 * Evaluation engine for free-text answers
 * Heuristic scoring based on keywords, similarity, and mathematical content
 */

import {
    processText,
    extractKeywords,
    extractMathTerms,
    jaccardSimilarity,
    levenshteinSimilarity,
    normalizeScore,
    formatScore,
    getScoreColor,
    getScoreLabel
} from './utils.js';

/**
 * Hauptbewertungsfunktion für Freitext-Antworten
 * @param {string} userAnswer - Benutzerantwort
 * @param {object} question - Frage-Objekt mit given_answer, math_blocks, etc.
 * @param {object} options - Bewertungsoptionen
 * @returns {object} Evaluation result
 */
export function evaluateAnswer(userAnswer, question, options = {}) {
    // Multiple-choice shortcut mode
    if (options.mode === 'multiple_choice' || (question.type && question.type.startsWith('mc_'))) {
        const isMulti = question.type === 'mc_check';
        // Accept either explicit correct_options field (array of letters or indices) or parse from given_answer like "Correct: B" or "Correct: B,C"
        let correct = [];
        if (Array.isArray(question.correct_options) && question.correct_options.length > 0) {
            correct = question.correct_options.map(String).map(v => v.toUpperCase());
        } else if (typeof question.given_answer === 'string') {
            const match = question.given_answer.match(/Correct\s*:\s*([A-Z](?:\s*,\s*[A-Z])*)/i);
            if (match) {
                correct = match[1].split(/\s*,\s*/).map(s => s.toUpperCase());
            }
        }
        // Parse user selection like "A,B"
        const selection = (userAnswer || '').split(/[\s,;]+/).filter(Boolean).map(s => s.toUpperCase());
        const correctSet = new Set(correct);
        const selSet = new Set(selection);
        // Exact set match for multi; single match for radio
        let isCorrect;
        if (isMulti) {
            if (correctSet.size === selSet.size) {
                isCorrect = [...correctSet].every(v => selSet.has(v));
            } else {
                isCorrect = false;
            }
        } else {
            isCorrect = selection.length === 1 && correctSet.has(selection[0]);
        }
        return {
            score: isCorrect ? 1 : 0,
            breakdown: { keywords: 0, jaccard: 0, math: 0, length: 0 },
            matchedKeywords: [],
            missingKeywords: [],
            suggestions: isCorrect ? [] : ['Falsche Auswahl. Versuchen Sie es erneut.'],
            color: isCorrect ? 'text-green-600' : 'text-red-600',
            label: isCorrect ? 'Korrekt' : 'Falsch',
            feedback: isCorrect ? 'Richtige Auswahl.' : `Richtig: ${correct.join(', ')}`,
            diagnostics: { selection, correct }
        };
    }
    const {
        keywordWeight = 0.4,
        jaccardWeight = 0.3,
        mathWeight = 0.2,
        lengthWeight = 0.1,
        minAnswerLength = 10
    } = options;

    if (!userAnswer || userAnswer.trim().length < minAnswerLength) {
        return {
            score: 0,
            breakdown: {
                keywords: 0,
                jaccard: 0,
                math: 0,
                length: 0
            },
            matchedKeywords: [],
            missingKeywords: [],
            suggestions: ['Antwort zu kurz. Bitte ausführlicher antworten.'],
            color: 'text-red-600',
            label: 'Ungenügend',
            feedback: 'Die Antwort ist zu kurz oder leer.',
            diagnostics: {
                userTokens: [],
                answerTokens: [],
                userKeywords: [],
                answerKeywords: []
            }
        };
    }

    // Text-Verarbeitung
    const userTokens = processText(userAnswer, true);
    const answerTokens = processText(question.given_answer, true);
    
    // Keyword-Extraktion
    const answerKeywords = extractKeywords(question.given_answer, 12);
    const userKeywords = extractKeywords(userAnswer, 15);
    
    // Mathematische Begriffe
    const answerMathTerms = extractMathTerms(question.given_answer);
    const userMathTerms = extractMathTerms(userAnswer);
    
    // Bei math_blocks: zusätzliche mathematische Keywords
    if (question.math_blocks && question.math_blocks.length > 0) {
        const mathBlockTerms = question.math_blocks.flatMap(block => extractMathTerms(block));
        answerMathTerms.push(...mathBlockTerms);
    }

    // Score-Komponenten berechnen
    const scores = {
        keywords: calculateKeywordScore(userKeywords, answerKeywords),
        jaccard: jaccardSimilarity(userTokens, answerTokens),
        math: calculateMathScore(userMathTerms, answerMathTerms),
        length: calculateLengthScore(userAnswer, question.given_answer)
    };

    // Gewichteter Gesamtscore
    const totalScore = normalizeScore(
        scores.keywords * keywordWeight +
        scores.jaccard * jaccardWeight +
        scores.math * mathWeight +
        scores.length * lengthWeight
    );

    // Keyword-Analyse
    const matchedKeywords = answerKeywords.filter(keyword => 
        userKeywords.some(uk => 
            uk === keyword || levenshteinSimilarity(uk, keyword) > 0.8
        )
    );
    
    const missingKeywords = answerKeywords.filter(keyword => 
        !matchedKeywords.includes(keyword)
    );

    // Feedback generieren
    const feedback = generateFeedback(totalScore, scores, matchedKeywords, missingKeywords);
    const suggestions = generateSuggestions(scores, missingKeywords, question);

    return {
        score: totalScore,
        breakdown: scores,
        matchedKeywords,
        missingKeywords,
        suggestions,
        color: getScoreColor(totalScore),
        label: getScoreLabel(totalScore),
        feedback,
        diagnostics: {
            userTokens,
            answerTokens,
            userKeywords,
            answerKeywords,
            userMathTerms,
            answerMathTerms
        }
    };
}

/**
 * Berechnet Keyword-Übereinstimmungscore
 * @param {string[]} userKeywords - Benutzer-Keywords
 * @param {string[]} answerKeywords - Referenz-Keywords
 * @returns {number} Score 0-1
 */
function calculateKeywordScore(userKeywords, answerKeywords) {
    if (answerKeywords.length === 0) return 1.0;
    
    let matches = 0;
    const userSet = new Set(userKeywords);
    
    for (const keyword of answerKeywords) {
        // Exakte Übereinstimmung
        if (userSet.has(keyword)) {
            matches += 1;
            continue;
        }
        
        // Fuzzy Match mit Levenshtein
        const bestMatch = userKeywords.find(uk => 
            levenshteinSimilarity(uk, keyword) > 0.8
        );
        
        if (bestMatch) {
            matches += 0.8; // Teilpunkt für fuzzy match
        }
    }
    
    return normalizeScore(matches / answerKeywords.length);
}

/**
 * Berechnet Score für mathematische Begriffe
 * @param {string[]} userMathTerms - Benutzer-Math-Terms
 * @param {string[]} answerMathTerms - Referenz-Math-Terms
 * @returns {number} Score 0-1
 */
function calculateMathScore(userMathTerms, answerMathTerms) {
    if (answerMathTerms.length === 0) return 1.0; // Keine Math-Terms erwartet
    
    const userSet = new Set(userMathTerms.map(term => term.toLowerCase()));
    const answerSet = new Set(answerMathTerms.map(term => term.toLowerCase()));
    
    const intersection = new Set([...userSet].filter(x => answerSet.has(x)));
    return normalizeScore(intersection.size / answerSet.size);
}

/**
 * Berechnet Score basierend auf Antwortlänge
 * @param {string} userAnswer - Benutzerantwort
 * @param {string} referenceAnswer - Referenzantwort
 * @returns {number} Score 0-1
 */
function calculateLengthScore(userAnswer, referenceAnswer) {
    const userLength = userAnswer.trim().length;
    const refLength = referenceAnswer.trim().length;
    
    if (refLength === 0) return 1.0;
    
    const ratio = userLength / refLength;
    
    // Optimale Länge: 50-150% der Referenz
    if (ratio >= 0.5 && ratio <= 1.5) return 1.0;
    if (ratio >= 0.3 && ratio <= 2.0) return 0.8;
    if (ratio >= 0.2 && ratio <= 3.0) return 0.6;
    return 0.3;
}

/**
 * Generiert Feedback-Text basierend auf Scores
 * @param {number} totalScore - Gesamtscore
 * @param {object} breakdown - Score-Aufschlüsselung
 * @param {string[]} matched - Gefundene Keywords
 * @param {string[]} missing - Fehlende Keywords
 * @returns {string} Feedback-Text
 */
function generateFeedback(totalScore, breakdown, matched, missing) {
    let feedback = `Gesamtbewertung: ${formatScore(totalScore)} (${getScoreLabel(totalScore)})\n\n`;
    
    feedback += `**Score-Aufschlüsselung:**\n`;
    feedback += `• Keywords: ${formatScore(breakdown.keywords)} (${matched.length} gefunden)\n`;
    feedback += `• Inhaltliche Ähnlichkeit: ${formatScore(breakdown.jaccard)}\n`;
    feedback += `• Mathematische Begriffe: ${formatScore(breakdown.math)}\n`;
    feedback += `• Antwortlänge: ${formatScore(breakdown.length)}\n\n`;
    
    if (matched.length > 0) {
        feedback += `**Erkannte Schlüsselbegriffe:** ${matched.join(', ')}\n\n`;
    }
    
    if (missing.length > 0) {
        feedback += `**Fehlende wichtige Begriffe:** ${missing.slice(0, 5).join(', ')}`;
        if (missing.length > 5) feedback += ` (und ${missing.length - 5} weitere)`;
        feedback += '\n\n';
    }
    
    return feedback;
}

/**
 * Generiert Verbesserungsvorschläge
 * @param {object} breakdown - Score-Aufschlüsselung
 * @param {string[]} missingKeywords - Fehlende Keywords
 * @param {object} question - Frage-Objekt
 * @returns {string[]} Array von Vorschlägen
 */
function generateSuggestions(breakdown, missingKeywords, question) {
    const suggestions = [];
    
    if (breakdown.keywords < 0.6) {
        suggestions.push(`Verwenden Sie mehr Fachbegriffe aus dem Themenbereich "${question.topic}".`);
        
        if (missingKeywords.length > 0) {
            const topMissing = missingKeywords.slice(0, 3);
            suggestions.push(`Wichtige Begriffe, die fehlen: ${topMissing.join(', ')}`);
        }
    }
    
    if (breakdown.jaccard < 0.5) {
        suggestions.push('Gehen Sie ausführlicher auf die zentralen Konzepte ein.');
    }
    
    if (breakdown.math < 0.6 && question.math_blocks && question.math_blocks.length > 0) {
        suggestions.push('Beziehen Sie sich explizit auf die mathematischen Formeln.');
    }
    
    if (breakdown.length < 0.5) {
        suggestions.push('Entwickeln Sie Ihre Antwort ausführlicher.');
    }
    
    // Themenspezifische Tipps
    const topicSuggestions = getTopicSpecificSuggestions(question.topic, breakdown);
    suggestions.push(...topicSuggestions);
    
    return suggestions;
}

/**
 * Gibt themenspezifische Verbesserungsvorschläge
 * @param {string} topic - Thema der Frage
 * @param {object} breakdown - Score-Aufschlüsselung
 * @returns {string[]} Themenspezifische Vorschläge
 */
function getTopicSpecificSuggestions(topic, breakdown) {
    const suggestions = [];
    
    if (topic.includes('Transformer') || topic.includes('Attention')) {
        if (breakdown.math < 0.7) {
            suggestions.push('Erklären Sie die mathematischen Schritte: Q, K, V, Attention-Score, Softmax.');
        }
        suggestions.push('Erwähnen Sie die Rolle von Skalierung (√d_k) und Self-Attention.');
    }
    
    if (topic.includes('Embeddings')) {
        suggestions.push('Beschreiben Sie den Unterschied zwischen verschiedenen Embedding-Arten.');
        suggestions.push('Erläutern Sie Dimensionalität und Trainingsverfahren.');
    }
    
    if (topic.includes('Sentiment')) {
        suggestions.push('Unterscheiden Sie zwischen Aspekt-basiertem und dokumentweitem Sentiment.');
        suggestions.push('Erwähnen Sie Evaluation-Metriken und typische Herausforderungen.');
    }
    
    if (topic.includes('Bias') || topic.includes('Evaluation')) {
        suggestions.push('Beschreiben Sie konkrete Mess- und Testverfahren.');
        suggestions.push('Erwähnen Sie statistische Signifikanz und Robustheit.');
    }
    
    return suggestions;
}

/**
 * Erstellt Hints basierend auf Frage und Antwort
 * @param {object} question - Frage-Objekt
 * @param {number} hintLevel - Hint-Stufe (1-3)
 * @returns {string} Hint-Text
 */
export function generateHint(question, hintLevel) {
    switch (hintLevel) {
        case 1:
            return generateTopicHint(question);
        case 2:
            return generateStructureHint(question);
        case 3:
            return generateKeywordHint(question);
        default:
            return 'Keine weiteren Hinweise verfügbar.';
    }
}

/**
 * Generiert Themen-Hint (Level 1)
 * @param {object} question - Frage-Objekt
 * @returns {string} Themen-Hint
 */
function generateTopicHint(question) {
    const hints = {
        'Transformer/Attention': 'Denken Sie an die drei Matrizen Q, K, V und den Softmax-Mechanismus.',
        'Embeddings': 'Berücksichtigen Sie Wort-Vektoren, Dimensionalität und Ähnlichkeitsmaße.',
        'Sentiment Analysis': 'Überlegen Sie: Klassifikation vs. Regression, Aspekte vs. Dokumente.',
        'BERT': 'Masked Language Modeling und bidirektionaler Kontext sind zentral.',
        'Bias': 'Template-basierte Tests und statistische Signifikanz sind wichtig.',
        'Evaluation': 'Metriken, Baselines und Robustheit sollten erwähnt werden.'
    };
    
    for (const [key, hint] of Object.entries(hints)) {
        if (question.topic.includes(key)) {
            return `💡 **Themen-Hinweis:** ${hint}`;
        }
    }
    
    return `💡 **Themen-Hinweis:** Dies ist eine Frage zum Thema "${question.topic}". ${question.notes || 'Denken Sie an die grundlegenden Konzepte dieses Bereichs.'}`;
}

/**
 * Generiert Struktur-Hint (Level 2)
 * @param {object} question - Frage-Objekt
 * @returns {string} Struktur-Hint
 */
function generateStructureHint(question) {
    const answer = question.given_answer;
    
    // Extrahiere erste Sätze oder Aufzählungspunkte
    const sentences = answer.split(/[.!?]\s+/).slice(0, 2);
    const firstSentence = sentences[0];
    
    // Suche nach Aufzählungen
    const listItems = answer.match(/^\d+\.\s+[^.]+/gm) || 
                     answer.match(/^[-•*]\s+[^.]+/gm) ||
                     answer.match(/\*\*[^*]+\*\*:/g);
    
    if (listItems && listItems.length > 1) {
        const steps = listItems.slice(0, 3).map(item => 
            item.replace(/^\d+\.\s*|^[-•*]\s*|\*\*/g, '').split(':')[0]
        );
        return `🔄 **Struktur-Hinweis:** Gehen Sie schrittweise vor: ${steps.join(' → ')}`;
    }
    
    if (firstSentence && firstSentence.length > 20) {
        const hint = firstSentence.replace(/\*\*/g, '').substring(0, 100) + '...';
        return `🔄 **Struktur-Hinweis:** Beginnen Sie mit: "${hint}"`;
    }
    
    return `🔄 **Struktur-Hinweis:** Strukturieren Sie Ihre Antwort in logische Abschnitte und erläutern Sie jeden Schritt.`;
}

/**
 * Generiert Keyword-Hint (Level 3)
 * @param {object} question - Frage-Objekt
 * @returns {string} Keyword-Hint
 */
function generateKeywordHint(question) {
    const keywords = extractKeywords(question.given_answer, 6);
    const mathTerms = extractMathTerms(question.given_answer);
    
    let hint = '🔑 **Keyword-Hinweis:** Wichtige Begriffe: ';
    
    const allTerms = [...keywords, ...mathTerms].slice(0, 6);
    hint += allTerms.join(', ');
    
    if (question.math_blocks && question.math_blocks.length > 0) {
        hint += '\n\n📐 **Mathe-Hinweis:** Berücksichtigen Sie die gegebenen Formeln.';
    }
    
    return hint;
}

/**
 * Bewertet eine numerische Antwort (für Rechenaufgaben)
 * @param {string} userAnswer - Benutzerantwort
 * @param {string} expectedAnswer - Erwartete Antwort
 * @param {number} tolerance - Relative Toleranz
 * @returns {object} Bewertungsergebnis
 */
export function evaluateNumericalAnswer(userAnswer, expectedAnswer, tolerance = 0.05) {
    // Extrahiere Zahlen aus beiden Antworten
    const userNumbers = extractNumbers(userAnswer);
    const expectedNumbers = extractNumbers(expectedAnswer);
    
    if (userNumbers.length === 0) {
        return {
            score: 0,
            feedback: 'Keine numerischen Werte in der Antwort gefunden.',
            matchedNumbers: [],
            missingNumbers: expectedNumbers
        };
    }
    
    const matchedNumbers = [];
    const missingNumbers = [...expectedNumbers];
    
    for (const expected of expectedNumbers) {
        const match = userNumbers.find(user => 
            Math.abs(user - expected) <= Math.abs(expected * tolerance)
        );
        
        if (match) {
            matchedNumbers.push({ expected, found: match });
            const index = missingNumbers.indexOf(expected);
            if (index > -1) missingNumbers.splice(index, 1);
        }
    }
    
    const score = expectedNumbers.length > 0 ? 
        matchedNumbers.length / expectedNumbers.length : 0;
    
    return {
        score,
        feedback: `${matchedNumbers.length} von ${expectedNumbers.length} Zahlen korrekt.`,
        matchedNumbers,
        missingNumbers
    };
}

/**
 * Extrahiert Zahlen aus Text
 * @param {string} text - Input text
 * @returns {number[]} Array von Zahlen
 */
function extractNumbers(text) {
    const numberPattern = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
    const matches = text.match(numberPattern) || [];
    return matches.map(match => parseFloat(match)).filter(num => !isNaN(num));
}
