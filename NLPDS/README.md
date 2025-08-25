# NLP Learning - Interaktive Fragentool

Eine vollständig statische, barrierefreie Web-Anwendung zum interaktiven Üben von Natural Language Processing (NLP) Fragen. Die App funktioniert komplett im Browser ohne Server-Abhängigkeiten und ist optimiert für GitHub Pages.

## 🎯 Features

### 📚 Lernfunktionen
- **Lernmodus**: Unbegrenztes Üben mit Hinweisen und Lösungseinblendung
- **Prüfungsmodus**: Zeitgesteuerte Tests mit begrenzten Hilfestellungen
- **Heuristische Bewertung**: Automatische Bewertung von Freitext-Antworten
- **Progressive Hinweise**: 3-stufiges Hinweissystem (Thema → Struktur → Keywords)
- **LaTeX-Unterstützung**: Vollständige Darstellung mathematischer Formeln

### 👥 Multi-User Features *(Neu!)*
- **Benutzerkonten**: Einfache Registrierung und Anmeldung
- **Geräteübergreifende Synchronisation**: Fortschritt folgt dem Benutzer
- **Bestenliste**: Vergleich mit anderen Lernenden (opt-in)
- **Detaillierte Statistiken**: Erweiterte Lernfortschritt-Analyse
- **Gastmodus**: Vollständige Nutzung ohne Anmeldung möglich

### 🔍 Verwaltung & Filter
- **Intelligente Filter**: Nach Topic, Fragetyp und Volltext-Suche
- **JSON-Import**: Einfacher Upload eigener Fragenkataloge
- **Fortschrittstracking**: Lokale Speicherung + optionale Cloud-Synchronisation
- **Session-Export**: Download der Ergebnisse als JSON
- **Automatische Migration**: Bestehende Fortschritte werden übernommen

### ⚡ Technische Highlights
- **Hybrid-Architektur**: Offline-first mit optionaler Cloud-Synchronisation
- **Responsive Design**: Mobile-first Design mit Accessibility-Features
- **Progressive Enhancement**: Neue Features stören bestehende Funktionalität nicht
- **Performance**: Optimiert für schnelle Ladezeiten

## 🚀 Quick Start

### 1. Repository klonen
```bash
git clone <your-repo-url>
cd NLPDS
```

### 2. Lokal testen
Öffnen Sie `index.html` direkt im Browser oder verwenden Sie einen lokalen Server:

```bash
# Python 3
python -m http.server 8000

# Node.js (falls installiert)
npx http-server

# PHP
php -S localhost:8000
```

Dann öffnen Sie http://localhost:8000

### 3. Eigene Fragen hinzufügen
Ersetzen Sie `/data/exam_questions_combined.json` mit Ihren Fragen oder nutzen Sie den File-Upload in der App.

## 📦 GitHub Pages Deployment

### Automatisches Deployment

1. **Repository erstellen** auf GitHub
2. **Code hochladen**:
   ```bash
   git add .
   git commit -m "Initial commit: NLP Learning App"
   git push origin main
   ```

3. **GitHub Pages aktivieren**:
   - Repository → Settings → Pages
   - Source: "Deploy from a branch"
   - Branch: `main` / `root`
   - Save

4. **Zugriff**: Ihre App ist verfügbar unter:
   ```
   https://USERNAME.github.io/REPOSITORY-NAME/
   ```

### Manuelles Deployment

Falls Sie die App in einem Unterordner deployen möchten:

1. **Upload**: Laden Sie alle Dateien in Ihren gewünschten Unterordner
2. **Base-URL**: Die App ist bereits für relative Pfade konfiguriert (`<base href="./">`)
3. **Assets**: Alle Ressourcen werden relativ geladen

## 👥 Multi-User Setup *(Optional)*

Die App funktioniert vollständig ohne Backend. Für erweiterte Features (Synchronisation, Bestenliste) können Sie optional ein Backend einrichten:

### 🔐 Benutzerkonten & Synchronisation

#### Frontend-Konfiguration

In `js/config.js` das Backend konfigurieren:

```javascript
export const config = {
  API_BASE_URL: 'https://your-backend.vercel.app/api',
  FEATURES: {
    USER_AUTHENTICATION: true,
    PROGRESS_SYNC: true,
    LEADERBOARD: true
  }
};
```

#### Backend-Deployment

1. **Vercel/Railway Backend** (empfohlen):
   ```bash
   cd backend
   npm install
   vercel --prod
   ```

2. **Umgebungsvariablen setzen**:
   ```env
   JWT_SECRET=your-secret-key
   FRONTEND_URL=https://username.github.io/NLPDS
   DATABASE_PATH=./database/nlpds.db
   ```

3. **Datenbank initialisieren**:
   ```bash
   npm run db:init
   ```

#### Funktionsweise

- **Gastmodus**: App funktioniert wie gewohnt ohne Anmeldung
- **Angemeldet**: Zusätzliche Features werden aktiviert
- **Migration**: Bestehende Fortschritte werden automatisch übernommen
- **Offline-First**: Funktioniert auch ohne Internetverbindung

### 🏆 Bestenliste

Die Bestenliste verwendet einen intelligenten Scoring-Algorithmus:

| Komponente | Gewichtung | Beschreibung |
|------------|------------|--------------|
| **Genauigkeit** | 40% | Durchschnittliche Punktzahl |
| **Konsistenz** | 30% | Regelmäßige Nutzung |
| **Vollständigkeit** | 20% | Anzahl bearbeiteter Fragen |
| **Effizienz** | 10% | Zeit pro korrekter Antwort |

**Datenschutz**: Teilnahme ist opt-in, Anzeigename frei wählbar.

### 📊 Erweiterte Statistiken

Angemeldete Benutzer erhalten:

- **Geräteübergreifende Synchronisation**
- **Detaillierte Lernkurven**
- **Topic-spezifische Auswertungen**
- **Streak-Tracking**
- **Historische Daten**

### 🔒 Datenschutz & Sicherheit

- **Minimale Datenerhebung**: Nur Benutzername und Lernfortschritt
- **Lokale Priorität**: localStorage hat Vorrang vor Server-Daten
- **Opt-out jederzeit**: Nutzer können Daten löschen lassen
- **Keine Passwort-Recovery**: Einfachheit vor Sicherheit
- **Anonyme Bestenliste**: Nur gewählte Anzeigenamen sichtbar

## 📋 Datenformat

### JSON-Schema für Fragen

```json
{
  "exam_questions": [
    {
      "id": "Q1",
      "source": "Quelle oder Dateiname",
      "type": "offene_frage | rechenaufgabe | definition | bildbasierte_frage",
      "topic": "Transformer/Attention",
      "question_text": "Fragetext mit $LaTeX$ Unterstützung",
      "math_blocks": ["\\text{Attention}(Q,K,V) = \\text{softmax}(QK^T/\\sqrt{d_k})V"],
      "images": ["Beschreibung oder Pfad zu Bild"],
      "options": [],
      "given_answer": "Detaillierte Musterlösung",
      "verified": false,
      "notes": "Zusätzliche Hinweise"
    }
  ]
}
```

### Feldspezifikationen

| Feld | Typ | Beschreibung | Erforderlich |
|------|-----|--------------|--------------|
| `id` | String | Eindeutige Frage-ID | ✅ |
| `source` | String | Quelle der Frage | ✅ |
| `type` | String | Fragetyp (siehe oben) | ✅ |
| `topic` | String | Themenbereich | ✅ |
| `question_text` | String | Fragetext (Markdown + LaTeX) | ✅ |
| `math_blocks` | Array | LaTeX-Formeln | ❌ |
| `images` | Array | Bilder/Diagramme | ❌ |
| `options` | Array | MC-Optionen (meist leer) | ❌ |
| `given_answer` | String | Musterlösung | ✅ |
| `verified` | Boolean | Offizielle Lösung? | ❌ |
| `notes` | String | Zusätzliche Hinweise | ❌ |

### LaTeX-Unterstützung

Die App unterstützt vollständiges LaTeX über KaTeX:

- **Inline**: `$\alpha + \beta$`
- **Block**: `$$\sum_{i=1}^n x_i$$`
- **Umgebungen**: `\begin{align}...\end{align}`

## 🎛️ Bewertungslogik

### Heuristische Bewertung

Die App bewertet Freitext-Antworten durch:

1. **Keyword-Matching** (40%): Wichtige Fachbegriffe aus der Musterlösung
2. **Inhaltliche Ähnlichkeit** (30%): Jaccard-Similarität der Tokens
3. **Mathematische Begriffe** (20%): LaTeX-Befehle und Math-Symbole
4. **Antwortlänge** (10%): Verhältnis zur Musterlösung

### Score-Interpretation

| Score | Bewertung | Farbe |
|-------|-----------|-------|
| 90-100% | Ausgezeichnet | 🟢 Grün |
| 80-89% | Sehr gut | 🟢 Grün |
| 70-79% | Gut | 🟡 Gelb |
| 60-69% | Befriedigend | 🟡 Gelb |
| 50-59% | Ausreichend | 🟠 Orange |
| 30-49% | Mangelhaft | 🔴 Rot |
| 0-29% | Ungenügend | 🔴 Rot |

### Manuelle Übersteuerung

Benutzer können die automatische Bewertung jederzeit manuell korrigieren:
- ✅ "Als korrekt markieren"
- ❌ "Als falsch markieren"

## 🎨 Anpassung & Konfiguration

### Bewertungsgewichte ändern

In `js/store.js`, Zeile ~45:

```javascript
evaluation: {
    keywordWeight: 0.4,    // Keyword-Matching
    jaccardWeight: 0.3,    // Inhaltliche Ähnlichkeit
    mathWeight: 0.2,       // Mathematische Begriffe
    lengthWeight: 0.1      // Antwortlänge
}
```

### Theme anpassen

In `index.html`, Tailwind-Konfiguration:

```javascript
tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: {
                    // Ihr Farbschema hier
                }
            }
        }
    }
}
```

### Stopwörter erweitern

In `js/utils.js`, `STOPWORDS_DE` und `STOPWORDS_EN` Arrays:

```javascript
export const STOPWORDS_DE = new Set([
    // Ihre zusätzlichen Stopwörter
]);
```

## 📱 Barrierefreiheit

### Implementierte Features

- ✅ **Keyboard-Navigation**: Vollständige Bedienung ohne Maus
- ✅ **Screen Reader**: ARIA-Labels und semantische HTML-Struktur
- ✅ **Kontraste**: WCAG AA konforme Farbkontraste
- ✅ **Focus-Indikatoren**: Deutliche Fokus-Kennzeichnung
- ✅ **Responsive Design**: Mobile-optimierte Bedienung

### Keyboard-Shortcuts

| Kombination | Aktion |
|-------------|--------|
| `Ctrl/Cmd + Enter` | Antwort prüfen |
| `Alt + ←` | Vorherige Frage |
| `Alt + →` | Nächste Frage |
| `Ctrl/Cmd + S` | Lösung zeigen |

## 🔧 Technische Details

### Architektur

```
NLPDS/
├── index.html              # Haupt-HTML mit CDN-Links
├── assets/
│   └── logo.svg           # App-Logo
├── css/
│   └── custom.css         # Zusätzliche Styles
├── data/
│   └── exam_questions_combined.json  # Fragen-Datenbank
└── js/
    ├── app.js             # Bootstrap & Router
    ├── store.js           # State Management
    ├── render.js          # DOM-Rendering
    ├── evaluate.js        # Bewertungslogik
    └── utils.js           # Hilfsfunktionen
```

### Abhängigkeiten (alle über CDN)

- **Tailwind CSS 3.x**: Utility-first CSS Framework
- **KaTeX 0.16.x**: LaTeX-Rendering
- **Marked.js 9.x**: Markdown-Parser (optional)

### Browser-Kompatibilität

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Performance

- **Erstladezeit**: < 2s (bei guter Verbindung)
- **Bundle-Größe**: ~50KB (ohne externe CDN-Ressourcen)
- **Memory Usage**: < 50MB (normale Session)

## 🐛 Troubleshooting

### Häufige Probleme

**Problem**: App lädt nicht auf GitHub Pages
- **Lösung**: Prüfen Sie die Pfade in der Konsole, alle Ressourcen müssen relativ referenziert sein

**Problem**: KaTeX rendert nicht
- **Lösung**: Prüfen Sie die Netzwerkverbindung, KaTeX wird über CDN geladen

**Problem**: JSON-Import funktioniert nicht
- **Lösung**: Validieren Sie Ihr JSON-Format online (z.B. jsonlint.com)

**Problem**: Bewertung ist ungenau
- **Lösung**: Passen Sie die Gewichte in der Konfiguration an oder nutzen Sie manuelle Übersteuerung

### Debug-Modus

Öffnen Sie die Browser-Konsole und nutzen Sie:

```javascript
// Aktuellen State anzeigen
debug.getState()

// Alle Daten löschen (Vorsicht!)
debug.clearData()
```

## 📄 Lizenz & Nutzung

### Datenschutz

- ✅ **Keine Server-Kommunikation**: Alle Daten bleiben lokal im Browser
- ✅ **Keine Cookies**: Kein Tracking oder externe Analytics
- ✅ **LocalStorage**: Nur für Fortschrittsspeicherung verwendet

### Lizenz

Dieses Projekt steht unter MIT-Lizenz. Sie können es frei verwenden, modifizieren und verteilen.

### Quellen

- Icons: Unicode Emoji
- Styling: Tailwind CSS
- Mathematik: KaTeX
- Fonts: System-Schriftarten

## 🤝 Beitragen

### Issues melden

Nutzen Sie GitHub Issues für:
- 🐛 Bug-Reports
- 💡 Feature-Requests  
- 📖 Dokumentations-Verbesserungen

### Pull Requests

1. Fork des Repositories
2. Feature-Branch erstellen
3. Tests durchführen
4. Pull Request öffnen

## 📞 Support

Für Fragen und Support:

- 📧 **GitHub Issues**: Technische Probleme
- 📚 **Documentation**: Diese README-Datei
- 💬 **Community**: GitHub Discussions

---

**Entwickelt für effektives NLP-Lernen** 🧠✨

*Letzte Aktualisierung: ${new Date().toLocaleDateString('de-DE')}*
