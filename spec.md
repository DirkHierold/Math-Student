Sie haben absolut recht. Mein Fehler. Eine Referenz wie "unverändert" gehört nicht in ein finales, eigenständiges Dokument. Die Spezifikation muss aus sich selbst heraus vollständig und verständlich sein.

Hier ist die überarbeitete, finale Version. Alle Referenzen wurden entfernt und durch die vollständigen Informationen ersetzt, sodass dieses Dokument als einzige Quelle für die Implementierung dienen kann.

---

# Software-Design-Dokument: Lernplattform "Math-Student" (Version 5.0 - Finale, Standalone-Spezifikation)

## 1. Einleitung

### 1.1 Projektziel
Entwicklung einer mobptimierten, interaktiven und rein client-seitigen Web-Anwendung (Minimum Viable Product - MVP) für Mathematikschüler der 8. Klasse. Diese Spezifikation ist als direkte, umsetzbare Anleitung für die Entwicklung konzipiert und schließt Interpretationsspielräume aus.

### 1.2 Kernprinzipien
*   **Kein Backend:** Speicherung im `LocalStorage`.
*   **Teilbarer Fortschritt:** Export/Import via Share-Hash.
*   **Statischer Inhalt:** Alle Aufgaben und Logiken sind vordefiniert.
*   **Eindeutigkeit:** Diese Spezifikation definiert alle Datenstrukturen, Logiken und Metriken, die für die Implementierung erforderlich sind.

## 2. Architektur & Technischer Ansatz

### 2.1 Client-seitige Speicherung
Der gesamte Anwendungszustand wird als ein einziges JSON-Objekt im **`LocalStorage`** des Webbrowsers gespeichert. Um die Größe des Speicherstandes und des Share-Hashes zu begrenzen, wird der Verlauf der gelösten Aufgaben (`recentAnswers`) pro Themenblock auf die **letzten 50 Einträge** beschränkt.

### 2.2 Fortschritt Teilen & Importieren
*   **Export:** `LocalStorage` State -> JSON String -> Komprimierung (z.B. mit pako.js) -> Base64-String (Share-Hash).
*   **Import:** Base64-String -> Dekomprimierung -> JSON-Validierung -> Kompatibilitäts-Check -> `LocalStorage` überschreiben.

### 2.3 Versionierung und Kompatibilität
Die Anwendung und der Speicherstand folgen der Semantischen Versionierung (MAJOR.MINOR.PATCH), die im Datenmodell gespeichert wird.
*   **Kompatibilitätsregel:** Ein Import ist erfolgreich, wenn die **MAJOR-Version** des Speicherstands mit der **MAJOR-Version** der App übereinstimmt (z.B. `app-version 3.1.0` kann `stand-version 3.0.0` importieren).
*   **Fehlerfall:** Bei Inkompatibilität wird eine Fehlermeldung angezeigt: **"Import fehlgeschlagen: Dieser Speicherstand stammt von einer inkompatiblen Programmversion und kann nicht geladen werden."**

## 3. UI/UX Wireframe-Beschreibungen

Dieser Abschnitt beschreibt den Aufbau der zentralen Ansichten als Vorlage für die UI-Entwicklung.

### 3.1 Hauptübersicht (Dashboard)
*   **Layout:** Vertikale, scrollbare Liste.
*   **Komponenten:**
    *   **Header:** Titel "Math-Student". Oben rechts ein Icon (z.B. Zahnrad) für die Einstellungsseite.
    *   **Profil-Bereich:** Zeigt gesammelte Abzeichen (Icons) und einen kurzen Statustext (z.B. "3 von 5 Abzeichen gesammelt").
    *   **Themenblock-Liste:** Untereinander angeordnete "Karten" für jeden Themenblock.
        *   **Jede Karte enthält:**
            *   Links: Ein großes Icon, umgeben von einem **Fortschrittsring** (SVG-basiert), der den prozentualen Abschluss anzeigt.
            *   Rechts: Block-Titel (z.B. "Binomische Formeln") und eine Sub-Info (z.B. "Level 3/5 erreicht").
            *   Ein Klick auf die Karte startet die Übungen für diesen Block.

### 3.2 Aufgabenansicht
*   **Layout:** Klar strukturiert, auf die Aufgabe fokussiert.
*   **Komponenten:**
    *   **Top-Bar:** Fortschrittsbalken für die aktuelle Session (z.B. "Aufgabe 4/10"). Links ein "Zurück"-Pfeil, um zum Dashboard zu gelangen.
    *   **Frage-Bereich:** Große, gut lesbare Anzeige der Aufgabe oder der Anweisung (z.B. "Vereinfache den folgenden Term:").
    *   **Interaktions-Bereich:** Dies ist der dynamische Bereich, der je nach `taskType` die entsprechenden UI-Elemente rendert (z.B. Eingabefeld, Drag&Drop-Zonen, Karten).
    *   **Bottom-Bar:**
        *   Links: Ein `?`-Icon für die Schritt-für-Schritt-Hilfe.
        *   Rechts: Ein "Prüfen"-Button (wird aktiv, sobald eine Eingabe erfolgt ist). Nach korrekter Lösung wird er zu einem "Weiter"-Button.

### 3.3 Einstellungsseite
*   **Layout:** Einfache Liste mit Optionen.
*   **Komponenten:**
    *   **Bereich "Fortschritt Sichern & Teilen":**
        *   Ein Textfeld (readonly) mit dem generierten Share-Hash.
        *   Daneben ein "Kopieren"-Button.
        *   Der Warnhinweis: **"Achtung: Dein Lernfortschritt wird nur in diesem Browser gespeichert. Wenn du die Browserdaten löschst, ist der Fortschritt verloren. Sichere deinen Code regelmäßig!"**
    *   **Bereich "Fortschritt Importieren":**
        *   Ein leeres Textfeld für die Eingabe eines Share-Hashes.
        *   Ein "Laden"-Button.

## 4. Design-Philosophie & Visueller Stil
*   **Layout:** Minimalistisch, aufgeräumt und auf den Inhalt fokussiert. Viel Weißraum. Keine ablenkenden Elemente.
*   **Farbpalette:**
    *   **Primärfarbe:** Ein freundliches, motivierendes Blau (`#4A90E2`).
    *   **Erfolg:** Ein klares Grün (`#7ED321`) für richtige Antworten und Fortschritt.
    *   **Fehler:** Ein sanftes Rot (`#D0021B`) für falsche Antworten.
    *   **Neutral:** Verschiedene Grautöne für Text und Hintergründe.
*   **Typografie:** Eine gut lesbare, serifenlose Schriftart (z.B. "Nunito" oder "Lato"). Klare Hierarchie durch Schriftgrößen und -stärken.
*   **Interaktion:** Bedienelemente sind groß und leicht auf Touchscreens zu bedienen. Animationen sind subtil und dienen dazu, Aktionen zu verdeutlichen (z.B. ein leichtes Wackeln bei einer falschen Antwort).

## 5. Lerninhalte & Aufgaben-Struktur

### 5.1 Statischer Aufgabenpool
Alle Aufgaben sind in einer JSON-Datei (`tasks.json`) vordefiniert. Es gibt **keine dynamische Generierung** von Aufgaben.

### 5.2 Detaillierte Datenstrukturen der Aufgabentypen
Die Struktur des `Task-Objekts` ist flexibel und wird durch den `taskType` bestimmt.

**Basis-Struktur (für alle Typen):**
```json
{
  "id": "B2L3T01", // Eindeutige, stabile ID
  "block": 2, // Zugehöriger Themenblock (1-4)
  "difficulty": 3, // Schwierigkeit (1-5)
  "taskType": "...", // Bestimmt die Struktur von 'data'
  "data": { ... },
  "hints": ["Hinweis 1", "Hinweis 2"]
}
```

**Spezifische `data`-Strukturen:**

1.  **`taskType: "solve_expression"`** (Standard-Eingabeaufgabe)
    ```json
    "data": {
      "question": "Vereinfache: 3a + 2(4a - b)",
      "solution": "11a - 2b"
    }
    ```

2.  **`taskType: "drag_and_drop"`**
    ```json
    "data": {
      "question": "Ordne und vereinfache:",
      "initialBlocks": ["4x²", "+", "8y", "-", "2x²", "+", "3y"],
      "solutionSteps": [
        { "inputs": ["4x²", "-2x²"], "output": "2x²" },
        { "inputs": ["8y", "+3y"], "output": "11y" }
      ],
      "finalSolution": "2x² + 11y"
    }
    ```

3.  **`taskType: "assignment_memory"`** (Zuordnungsspiel)
    ```json
    "data": {
      "question": "Finde die passenden Paare.",
      "pairs": [
        { "termA": "(a + 4)²", "termB": "a² + 8a + 16" },
        { "termA": "(2x - y)(2x + y)", "termB": "4x² - y²" }
      ]
    }
    ```

4.  **`taskType: "find_the_error"`**
    ```json
    "data": {
      "question": "Finde den Fehler in der folgenden Rechnung für (x - 5)²:",
      "calculationSteps": [
        { "line": "x² - 2*x*5 + 5²", "isCorrect": true },
        { "line": "x² - 10x - 25", "isCorrect": false }
      ],
      "errorExplanation": "Achtung! (-5)² ergibt +25, nicht -25."
    }
    ```

## 6. Lernlogik

### 6.1 Adaptive Logik (Präzisierte Regeln)
*   **Aufstieg:** Nach 3 aufeinanderfolgenden richtigen Antworten wird der `currentDifficulty` um 1 erhöht.
*   **Abstieg:** Nach 2 falschen Antworten innerhalb der letzten 4 Aufgaben wird die Logik wie folgt angewendet:
    1.  Das System versucht zuerst, eine andere, noch nicht kürzlich gelöste Aufgabe auf dem **gleichen `currentDifficulty`-Level** zu finden.
    2.  Nur wenn keine solche Aufgabe verfügbar ist, wird der `currentDifficulty` um 1 gesenkt.
*   **Randfälle:**
    *   Auf dem höchsten Level (`difficulty: 5`) führt ein Aufstieg dazu, dass man auf Level 5 bleibt.
    *   Auf dem niedrigsten Level (`difficulty: 1`) führt ein Abstieg dazu, dass man auf Level 1 bleibt.
*   **Aufgabenauswahl:** Die nächste Aufgabe wird **zufällig** aus dem Pool aller Aufgaben mit dem Ziel-Schwierigkeitsgrad ausgewählt, wobei Aufgaben, deren `id` in den `recentAnswers` des Nutzers für diesen Block enthalten ist, ausgeschlossen werden.

## 7. Metriken und Gamification-Logik

### 7.1 Fortschrittsberechnung
Der prozentuale Fortschritt für den Füllring eines Themenblocks wird wie folgt berechnet:
`Fortschritt (%) = (Anzahl der einzigartig und korrekt gelösten Aufgaben-IDs im Block / Gesamtanzahl aller Aufgaben im Block) * 100`

### 7.2 System für Auszeichnungen (Badges)
Die Freischaltbedingungen für Badges sind in der Anwendungslogik hartkodiert. Nach jeder korrekt gelösten Aufgabe wird geprüft, ob eine Bedingung erfüllt ist.

**Definition der verfügbaren Badges:**

| Badge ID              | Titel               | Beschreibung                                      | Freischaltbedingung (Logik)                                                                                             |
| --------------------- | ------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `streak_15`           | Serien-Rechner      | Löse 15 Aufgaben am Stück richtig.                | `type: "streak", length: 15`                                                                                            |
| `block2_master`       | Klammer-Meister     | Löse 25 Aufgaben aus dem Block "Multiplikation".  | `type: "solveCount", block: 2, count: 25`                                                                               |
| `block3_binom_pro`    | Binom-Bändiger      | Löse 20 Aufgaben zu Binomischen Formeln.          | `type: "solveCount", block: 3, count: 20`                                                                               |
| `find_error_expert`   | Adlerauge           | Finde 10 Fehler in "Fehlersuche"-Aufgaben.        | `type: "solveCountByType", taskType: "find_the_error", count: 10`                                                        |
| `all_blocks_started`  | Entdecker           | Löse mindestens eine Aufgabe in jedem Block.      | `type: "minTasksPerBlock", count: 1`                                                                                    |

## 8. Datenmodell (LocalStorage)

Die gesamte Anwendung wird durch ein einziges JSON-Objekt im `LocalStorage` abgebildet. Dieses Dokument definiert seine Struktur.

```json
{
  "version": "5.0.0",
  "userProfile": {
    "badgesEarned": ["streak_15", "block2_master"]
  },
  "progress": {
    "block_1": {
      "currentDifficulty": 2,
      "correctlySolvedTasks": ["B1L1T01", "B1L2T03"],
      "recentAnswers": [
        {"taskId": "B1L2T03", "correct": true},
        {"taskId": "B1L2T04", "correct": false}
      ]
    },
    "block_2": {
      "currentDifficulty": 1,
      "correctlySolvedTasks": [],
      "recentAnswers": []
    }
  },
  "streak": {
    "current": 15
  },
  "lastSession": "2025-09-12T10:00:00Z"
}
```