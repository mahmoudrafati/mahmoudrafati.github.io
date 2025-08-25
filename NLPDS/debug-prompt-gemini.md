# Gemini API Debug Prompt für NLPDS Probleme

## Kontext
Du hilfst bei der Fehlerbehebung einer NLP-Lernplattform mit JavaScript Frontend und Node.js Backend.

## Problem 1: Frontend Server startet nicht korrekt

### Terminal Output:
```
~/Developer/mahmoudrafati.github.io/NLPDS ❯ cd .. && python3 -m http.server 8000
OSError: [Errno 48] Address already in use

~/Developer/mahmoudrafati.github.io ❯ python3 -m http.server 8000  
Serving HTTP on :: port 8000...
::1 - - [25/Aug/2025 01:33:42] code 404, message File not found
::1 - - [25/Aug/2025 01:33:42] "GET /js/app.js HTTP/1.1" 404 -
```

### Was funktioniert:
- Server startet von `/NLPDS` Verzeichnis: ✅ Files werden gefunden
- Server startet von Parent-Verzeichnis: ❌ 404 Fehler für JS Files

### Frage:
Warum funktioniert `localhost:8000` manchmal nicht und zeigt 404 für `/js/app.js`? Wie kann ich sicherstellen, dass der Server immer vom richtigen Verzeichnis startet?

## Problem 2: Text-Rendering Bug - Wörter werden durchgestrichen

### Beobachtung:
- Screenshots zeigen durchgestrichene Wörter in der Benutzeroberfläche
- Passiert wahrscheinlich bei der Markdown/KaTeX Verarbeitung
- Könnte CSS-Styling oder JavaScript-Rendering Problem sein

### Relevante Technologien:
- KaTeX für mathematische Formeln
- Marked.js für Markdown
- Tailwind CSS für Styling
- Custom CSS in `/css/custom.css`

### Code-Struktur:
```javascript
// render.js - Hauptrendering
function renderQuestion(question) {
    // KaTeX und Markdown Verarbeitung
}

// app.js - Application Bootstrap  
// Kürzlich KaTeX Debug-Logs entfernt
```

### Frage:
Was könnte dazu führen, dass Text durchgestrichen dargestellt wird? Überprüfe:
1. CSS-Regeln die `text-decoration: line-through` verwenden
2. Markdown-Parsing Probleme mit `~~strikethrough~~` Syntax
3. KaTeX-Rendering Konflikte
4. JavaScript-Fehler die DOM-Manipulation beeinträchtigen

## Zu analysierende Dateien:
- `/css/custom.css` - CSS-Styling
- `/js/render.js` - Text-Rendering Logik  
- `/js/app.js` - Application Setup
- Browser DevTools Console für JavaScript-Fehler

## Gewünschte Lösung:
1. **Schritt-für-Schritt Debugging-Plan** für beide Probleme
2. **Konkrete Terminal-Befehle** zum Testen
3. **Code-Änderungen** falls nötig
4. **Präventive Maßnahmen** um Probleme zu vermeiden

## Priorität:
1. Frontend Server Problem (kritisch - blockiert Entwicklung)
2. Text-Rendering Bug (hoch - beeinträchtigt Benutzererfahrung)

Bitte analysiere beide Probleme systematisch und gib konkrete, umsetzbare Lösungsschritte.
