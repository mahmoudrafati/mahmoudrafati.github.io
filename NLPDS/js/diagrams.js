/**
 * SVG diagram stubs for image-based questions
 * Provides fallback diagrams when original images are not available
 */

console.log('🔧 DEBUGGING: diagrams.js wird geladen...');

/**
 * Renders a diagram stub into the given container
 * @param {HTMLElement} container - Container element to render into
 * @param {string} kind - Type of diagram to render
 * @returns {boolean} Success status
 */
export function renderDiagramStub(container, kind) {
    if (!container || !kind) {
        console.warn('renderDiagramStub: Invalid container or kind');
        return false;
    }

    const svgContent = generateSVGStub(kind);
    if (!svgContent) {
        console.warn(`renderDiagramStub: Unknown diagram kind: ${kind}`);
        return false;
    }

    container.innerHTML = `
        <div class="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
                <span class="text-sm font-medium text-gray-600">📊 Diagram-Stub</span>
                <span class="text-xs text-gray-500 uppercase tracking-wide">${kind.replace('_', ' ')}</span>
            </div>
            <div class="svg-container text-center">
                ${svgContent}
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">
                Vereinfachte Darstellung zur Veranschaulichung der Fragestellung
            </p>
        </div>
    `;

    console.log(`✅ SVG-Stub '${kind}' gerendert`);
    return true;
}

/**
 * Generates SVG content for different diagram types
 * @param {string} kind - Type of diagram
 * @returns {string} SVG markup
 */
function generateSVGStub(kind) {
    switch (kind) {
        case 'transformer':
            return generateTransformerDiagram();
        case 'sentiment_pipeline':
            return generateSentimentPipelineDiagram();
        case 'confusion_matrix':
            return generateConfusionMatrixDiagram();
        case 'decision_tree':
            return generateDecisionTreeDiagram();
        case 'mlm_bias':
            return generateMLMBiasDiagram();
        default:
            return null;
    }
}

/**
 * Transformer architecture diagram
 */
function generateTransformerDiagram() {
    return `
        <svg viewBox="0 0 400 300" class="w-full max-w-md mx-auto" xmlns="http://www.w3.org/2000/svg">
            <style>
                .label { font-family: sans-serif; font-size: 11px; fill: #374151; }
                .box { fill: #f3f4f6; stroke: #6b7280; stroke-width: 1; }
                .encoder { fill: #dbeafe; stroke: #3b82f6; }
                .decoder { fill: #fef3c7; stroke: #f59e0b; }
                .attention { fill: #fce7f3; stroke: #ec4899; }
                .arrow { stroke: #6b7280; stroke-width: 2; fill: none; marker-end: url(#arrowhead); }
            </style>
            
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                </marker>
            </defs>
            
            <!-- Input -->
            <rect x="50" y="260" width="80" height="25" class="box" />
            <text x="90" y="275" text-anchor="middle" class="label">Input Tokens</text>
            
            <!-- Encoder Stack -->
            <rect x="30" y="180" width="120" height="60" class="encoder" />
            <text x="90" y="200" text-anchor="middle" class="label font-medium">Encoder</text>
            <text x="90" y="215" text-anchor="middle" class="label">Multi-Head</text>
            <text x="90" y="230" text-anchor="middle" class="label">Attention</text>
            
            <!-- Decoder Stack -->
            <rect x="250" y="180" width="120" height="60" class="decoder" />
            <text x="310" y="200" text-anchor="middle" class="label font-medium">Decoder</text>
            <text x="310" y="215" text-anchor="middle" class="label">Masked</text>
            <text x="310" y="230" text-anchor="middle" class="label">Attention</text>
            
            <!-- Cross Attention -->
            <rect x="150" y="130" width="100" height="35" class="attention" />
            <text x="200" y="150" text-anchor="middle" class="label">Cross-Attention</text>
            <text x="200" y="160" text-anchor="middle" class="label">(Q,K,V)</text>
            
            <!-- Output -->
            <rect x="270" y="50" width="80" height="25" class="box" />
            <text x="310" y="65" text-anchor="middle" class="label">Output Probs</text>
            
            <!-- Arrows -->
            <path d="M 90 260 L 90 240" class="arrow" />
            <path d="M 150 210 L 250 210" class="arrow" />
            <path d="M 90 180 L 160 155" class="arrow" />
            <path d="M 240 155 L 310 180" class="arrow" />
            <path d="M 310 180 L 310 75" class="arrow" />
            
            <!-- Labels -->
            <text x="200" y="20" text-anchor="middle" class="label font-medium text-lg">Transformer Architecture</text>
        </svg>
    `;
}

/**
 * Sentiment analysis pipeline diagram
 */
function generateSentimentPipelineDiagram() {
    return `
        <svg viewBox="0 0 500 200" class="w-full max-w-lg mx-auto" xmlns="http://www.w3.org/2000/svg">
            <style>
                .label { font-family: sans-serif; font-size: 10px; fill: #374151; }
                .step { fill: #f0f9ff; stroke: #0284c7; stroke-width: 1.5; }
                .arrow { stroke: #6b7280; stroke-width: 2; fill: none; marker-end: url(#arrowhead); }
            </style>
            
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                </marker>
            </defs>
            
            <!-- Title -->
            <text x="250" y="20" text-anchor="middle" class="label font-medium text-lg">Sentiment Analysis Pipeline</text>
            
            <!-- Steps -->
            <rect x="20" y="50" width="70" height="40" rx="5" class="step" />
            <text x="55" y="65" text-anchor="middle" class="label">Raw Text</text>
            <text x="55" y="78" text-anchor="middle" class="label">"I love this!"</text>
            
            <rect x="120" y="50" width="70" height="40" rx="5" class="step" />
            <text x="155" y="65" text-anchor="middle" class="label">Preprocessing</text>
            <text x="155" y="78" text-anchor="middle" class="label">Tokenization</text>
            
            <rect x="220" y="50" width="70" height="40" rx="5" class="step" />
            <text x="255" y="65" text-anchor="middle" class="label">Feature</text>
            <text x="255" y="78" text-anchor="middle" class="label">Extraction</text>
            
            <rect x="320" y="50" width="70" height="40" rx="5" class="step" />
            <text x="355" y="65" text-anchor="middle" class="label">Classifier</text>
            <text x="355" y="78" text-anchor="middle" class="label">FinBERT</text>
            
            <rect x="420" y="50" width="70" height="40" rx="5" class="step" />
            <text x="455" y="65" text-anchor="middle" class="label">Result</text>
            <text x="455" y="78" text-anchor="middle" class="label">Positive: 0.9</text>
            
            <!-- Arrows -->
            <path d="M 90 70 L 120 70" class="arrow" />
            <path d="M 190 70 L 220 70" class="arrow" />
            <path d="M 290 70 L 320 70" class="arrow" />
            <path d="M 390 70 L 420 70" class="arrow" />
            
            <!-- Details -->
            <text x="55" y="110" text-anchor="middle" class="label">Input</text>
            <text x="155" y="110" text-anchor="middle" class="label">Clean</text>
            <text x="255" y="110" text-anchor="middle" class="label">Embeddings</text>
            <text x="355" y="110" text-anchor="middle" class="label">Score</text>
            <text x="455" y="110" text-anchor="middle" class="label">Label</text>
            
            <!-- Metrics box -->
            <rect x="150" y="130" width="200" height="50" rx="5" fill="#fef3c7" stroke="#f59e0b" stroke-width="1" />
            <text x="250" y="145" text-anchor="middle" class="label font-medium">Evaluation Metrics</text>
            <text x="250" y="158" text-anchor="middle" class="label">Precision, Recall, F1-Score</text>
            <text x="250" y="171" text-anchor="middle" class="label">Confusion Matrix</text>
        </svg>
    `;
}

/**
 * Confusion matrix diagram
 */
function generateConfusionMatrixDiagram() {
    return `
        <svg viewBox="0 0 300 300" class="w-full max-w-sm mx-auto" xmlns="http://www.w3.org/2000/svg">
            <style>
                .label { font-family: sans-serif; font-size: 11px; fill: #374151; }
                .header { font-family: sans-serif; font-size: 12px; fill: #374151; font-weight: bold; }
                .matrix-cell { stroke: #6b7280; stroke-width: 1; }
                .tp { fill: #dcfce7; }
                .tn { fill: #dcfce7; }
                .fp { fill: #fef2f2; }
                .fn { fill: #fef2f2; }
            </style>
            
            <!-- Title -->
            <text x="150" y="25" text-anchor="middle" class="header">Confusion Matrix</text>
            
            <!-- Headers -->
            <text x="150" y="60" text-anchor="middle" class="header">Predicted</text>
            <text x="60" y="110" text-anchor="middle" class="header">Positive</text>
            <text x="200" y="110" text-anchor="middle" class="header">Negative</text>
            
            <!-- Y-axis label -->
            <text x="30" y="150" text-anchor="middle" class="header" transform="rotate(-90, 30, 150)">Actual</text>
            <text x="30" y="130" text-anchor="middle" class="label">Pos</text>
            <text x="30" y="190" text-anchor="middle" class="label">Neg</text>
            
            <!-- Matrix cells -->
            <rect x="80" y="120" width="60" height="40" class="matrix-cell tp" />
            <text x="110" y="135" text-anchor="middle" class="label">TP</text>
            <text x="110" y="150" text-anchor="middle" class="label font-bold">85</text>
            
            <rect x="160" y="120" width="60" height="40" class="matrix-cell fn" />
            <text x="190" y="135" text-anchor="middle" class="label">FN</text>
            <text x="190" y="150" text-anchor="middle" class="label font-bold">15</text>
            
            <rect x="80" y="180" width="60" height="40" class="matrix-cell fp" />
            <text x="110" y="195" text-anchor="middle" class="label">FP</text>
            <text x="110" y="210" text-anchor="middle" class="label font-bold">10</text>
            
            <rect x="160" y="180" width="60" height="40" class="matrix-cell tn" />
            <text x="190" y="195" text-anchor="middle" class="label">TN</text>
            <text x="190" y="210" text-anchor="middle" class="label font-bold">90</text>
            
            <!-- Metrics -->
            <text x="150" y="250" text-anchor="middle" class="label">Precision = TP/(TP+FP)</text>
            <text x="150" y="265" text-anchor="middle" class="label">Recall = TP/(TP+FN)</text>
            <text x="150" y="280" text-anchor="middle" class="label">F1 = 2×(Prec×Rec)/(Prec+Rec)</text>
        </svg>
    `;
}

/**
 * Decision tree diagram
 */
function generateDecisionTreeDiagram() {
    return `
        <svg viewBox="0 0 350 250" class="w-full max-w-md mx-auto" xmlns="http://www.w3.org/2000/svg">
            <style>
                .label { font-family: sans-serif; font-size: 9px; fill: #374151; }
                .node { fill: #f0f9ff; stroke: #0284c7; stroke-width: 1.5; }
                .leaf { fill: #f0fdf4; stroke: #16a34a; stroke-width: 1.5; }
                .line { stroke: #6b7280; stroke-width: 1.5; }
                .decision { font-size: 8px; fill: #dc2626; }
            </style>
            
            <!-- Title -->
            <text x="175" y="20" text-anchor="middle" class="label font-medium text-lg">Decision Tree</text>
            
            <!-- Root node -->
            <rect x="130" y="40" width="90" height="25" rx="3" class="node" />
            <text x="175" y="55" text-anchor="middle" class="label">Word Length > 5?</text>
            
            <!-- Level 1 nodes -->
            <rect x="60" y="100" width="70" height="25" rx="3" class="node" />
            <text x="95" y="115" text-anchor="middle" class="label">TF-IDF > 0.3?</text>
            
            <rect x="220" y="100" width="70" height="25" rx="3" class="node" />
            <text x="255" y="115" text-anchor="middle" class="label">POS = Noun?</text>
            
            <!-- Leaf nodes -->
            <rect x="30" y="160" width="50" height="25" rx="3" class="leaf" />
            <text x="55" y="175" text-anchor="middle" class="label">Positive</text>
            
            <rect x="100" y="160" width="50" height="25" rx="3" class="leaf" />
            <text x="125" y="175" text-anchor="middle" class="label">Negative</text>
            
            <rect x="190" y="160" width="50" height="25" rx="3" class="leaf" />
            <text x="215" y="175" text-anchor="middle" class="label">Neutral</text>
            
            <rect x="260" y="160" width="50" height="25" rx="3" class="leaf" />
            <text x="285" y="175" text-anchor="middle" class="label">Positive</text>
            
            <!-- Connections -->
            <line x1="150" y1="65" x2="115" y2="100" class="line" />
            <line x1="200" y1="65" x2="235" y2="100" class="line" />
            
            <line x1="80" y1="125" x2="65" y2="160" class="line" />
            <line x1="110" y1="125" x2="125" y2="160" class="line" />
            
            <line x1="240" y1="125" x2="225" y2="160" class="line" />
            <line x1="270" y1="125" x2="285" y2="160" class="line" />
            
            <!-- Decision labels -->
            <text x="125" y="85" text-anchor="middle" class="decision">yes</text>
            <text x="225" y="85" text-anchor="middle" class="decision">no</text>
            
            <text x="70" y="145" text-anchor="middle" class="decision">yes</text>
            <text x="120" y="145" text-anchor="middle" class="decision">no</text>
            
            <text x="210" y="145" text-anchor="middle" class="decision">yes</text>
            <text x="280" y="145" text-anchor="middle" class="decision">no</text>
            
            <!-- Info -->
            <text x="175" y="220" text-anchor="middle" class="label">Entropy-based splitting</text>
            <text x="175" y="235" text-anchor="middle" class="label">Gini impurity minimization</text>
        </svg>
    `;
}

/**
 * MLM bias demonstration diagram
 */
function generateMLMBiasDiagram() {
    return `
        <svg viewBox="0 0 450 250" class="w-full max-w-lg mx-auto" xmlns="http://www.w3.org/2000/svg">
            <style>
                .label { font-family: sans-serif; font-size: 10px; fill: #374151; }
                .header { font-family: sans-serif; font-size: 12px; fill: #374151; font-weight: bold; }
                .template { fill: #f0f9ff; stroke: #0284c7; stroke-width: 1; }
                .mask { fill: #fef3c7; stroke: #f59e0b; stroke-width: 1.5; }
                .prediction { fill: #f0fdf4; stroke: #16a34a; stroke-width: 1; }
                .bias { fill: #fef2f2; stroke: #dc2626; stroke-width: 1; }
            </style>
            
            <!-- Title -->
            <text x="225" y="25" text-anchor="middle" class="header">MLM Gender Bias Detection</text>
            
            <!-- Template 1 -->
            <rect x="20" y="50" width="180" height="30" rx="5" class="template" />
            <text x="30" y="65" class="label">Template: "</text>
            <rect x="80" y="57" width="40" height="16" rx="2" class="mask" />
            <text x="100" y="67" text-anchor="middle" class="label">[MASK]</text>
            <text x="125" y="65" class="label">arbeitet als Ingenieur."</text>
            
            <!-- Predictions 1 -->
            <rect x="220" y="50" width="200" height="30" rx="5" class="prediction" />
            <text x="230" y="65" class="label">Top Predictions:</text>
            <text x="230" y="75" class="label">1. Er (0.7)  2. Sie (0.2)  3. Man (0.1)</text>
            
            <!-- Template 2 -->
            <rect x="20" y="100" width="180" height="30" rx="5" class="template" />
            <text x="30" y="115" class="label">Template: "</text>
            <rect x="80" y="107" width="40" height="16" rx="2" class="mask" />
            <text x="100" y="117" text-anchor="middle" class="label">[MASK]</text>
            <text x="125" y="115" class="label">arbeitet als Krankenschwester."</text>
            
            <!-- Predictions 2 -->
            <rect x="220" y="100" width="200" height="30" rx="5" class="prediction" />
            <text x="230" y="115" class="label">Top Predictions:</text>
            <text x="230" y="125" class="label">1. Sie (0.8)  2. Er (0.15)  3. Man (0.05)</text>
            
            <!-- Bias measure -->
            <rect x="60" y="150" width="330" height="60" rx="5" class="bias" />
            <text x="225" y="170" text-anchor="middle" class="header">Bias-Maß</text>
            <text x="225" y="185" text-anchor="middle" class="label">Δ = P(männlich|Ingenieur) - P(weiblich|Ingenieur)</text>
            <text x="225" y="200" text-anchor="middle" class="label">Δ = 0.7 - 0.2 = 0.5 (starker Bias)</text>
            
            <!-- Method description -->
            <text x="225" y="235" text-anchor="middle" class="label">Methode: Template-basierte Bias-Analyse mit Wahrscheinlichkeitsvergleich</text>
        </svg>
    `;
}

console.log('✅ DEBUGGING: diagrams.js geladen');
