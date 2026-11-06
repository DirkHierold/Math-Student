const de = {
  appTitle: "MathFeed – Mathe lernen",
  appDescription: "Mathe üben im schnellen Aufgaben-Feed.",
  navFeed: "Üben",
  navStats: "Statistik",
  navLabel: "Hauptnavigation",
  typeLinear: "Bruch",
  typeTerms: "Terme",
  typePowers: "Potenzen",
  typeQuadratic: "Quadratik",
  instruction: "Wähle die richtige Umformung",
  continueHint: "Tippen zum Fortfahren",
  timerLabel: "Aktive Tageszeit: {time}",
  stepLabel: "Schritt {step} von {total}",
  answerLabel: "Antwort {n}",
  statsWeek: "Woche",
  statsToday: "Heute",
  statsWeekLabel: "Aufgaben der letzten sieben Tage",
  statsTypeLabel: "Antworten heute nach Aufgabentyp",
  correct: "Richtig",
  errors: "Fehler",
  kpiAnswers: "Antworten",
  kpiTime: "Zeit",
  themeLabel: "Darstellung",
  themeLight: "Hell",
  themeDark: "Dunkel",
  themeSystem: "System",
  errStartTitle: "Start fehlgeschlagen",
  errNoticeTitle: "Hinweis",
  errStart: "MathFeed konnte nicht gestartet werden.",
  errStorageFormat:
    "Der gespeicherte MathFeed-Fortschritt hat ein unbekanntes Format.",
  errSave: "Fortschritt konnte nicht gespeichert werden:",
  errMath: "Formeln konnten nicht angepasst werden:",
  errFitSpace:
    "Der verfügbare Platz für die Formeln konnte nicht bestimmt werden.",
  errFitShared:
    "Die gemeinsame Skalierung der Antworten konnte nicht bestimmt werden.",
}

export type MessageKey = keyof typeof de

const en: Record<MessageKey, string> = {
  appTitle: "MathFeed – Learn math",
  appDescription: "Practice math in a fast task feed.",
  navFeed: "Practice",
  navStats: "Stats",
  navLabel: "Main navigation",
  typeLinear: "Fractions",
  typeTerms: "Terms",
  typePowers: "Powers",
  typeQuadratic: "Quadratic",
  instruction: "Pick the correct step",
  continueHint: "Tap to continue",
  timerLabel: "Active time today: {time}",
  stepLabel: "Step {step} of {total}",
  answerLabel: "Answer {n}",
  statsWeek: "Week",
  statsToday: "Today",
  statsWeekLabel: "Tasks of the last seven days",
  statsTypeLabel: "Today's answers by task type",
  correct: "Correct",
  errors: "Errors",
  kpiAnswers: "Answers",
  kpiTime: "Time",
  themeLabel: "Appearance",
  themeLight: "Light",
  themeDark: "Dark",
  themeSystem: "System",
  errStartTitle: "Start failed",
  errNoticeTitle: "Notice",
  errStart: "MathFeed could not be started.",
  errStorageFormat: "The saved MathFeed progress has an unknown format.",
  errSave: "Progress could not be saved:",
  errMath: "Formulas could not be fitted:",
  errFitSpace: "The space available for the formulas could not be determined.",
  errFitShared: "The shared scale of the answers could not be determined.",
}

export const dictionaries = { de, en }
export type Language = keyof typeof dictionaries

// Follows the device: German for a German browser, English for everything else.
export function detectLanguage(
  languages: readonly string[] | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator.languages
): Language {
  const first = languages?.[0]?.toLowerCase() ?? ""
  return first === "de" || first.startsWith("de-") ? "de" : "en"
}

export const language: Language = detectLanguage()
export const locale = language === "de" ? "de-DE" : "en-US"

export function translate(
  lang: Language,
  key: MessageKey,
  vars: Record<string, string | number> = {}
) {
  return dictionaries[lang][key].replace(/\{(\w+)\}/g, (_, name: string) =>
    String(vars[name] ?? "")
  )
}

export const t = (key: MessageKey, vars?: Record<string, string | number>) =>
  translate(language, key, vars)

export function applyLanguage(root: Document = document) {
  root.documentElement.lang = language
  root.title = t("appTitle")
  root
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", t("appDescription"))
}
