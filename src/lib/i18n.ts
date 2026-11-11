const de = {
  appTitle: "MathFeed – Mathe lernen",
  appDescription: "Mathe üben im schnellen Aufgaben-Feed.",
  navHome: "Heute",
  navStats: "Fortschritt",
  navLabel: "Hauptnavigation",
  instruction: "Wähle das richtige Ergebnis",
  continueHint: "Tippen zum Fortfahren",
  timerLabel: "Aktive Tageszeit: {time}",
  answerLabel: "Antwort {n}",
  statsLevel: "Level",
  statsWeek: "Letzte 7 Tage",
  statsWeekLabel: "Beantwortete Aufgaben der letzten sieben Tage",
  statsCurveLabel: "Verlauf der Themen der letzten 30 Tage",
  statsCurveEmpty: "Der Verlauf erscheint nach der ersten Runde.",
  statsTopicsLabel: "Themen, zum Hervorheben antippen",
  statsAxisEnd: "heute",
  typeFractions: "Brüche",
  typeTerms: "Terme",
  typePowers: "Potenzen",
  typeLinear: "Gleichungen",
  typeSquares: "Quadrate",
  themeLabel: "Darstellung",
  themeLight: "Hell",
  themeDark: "Dunkel",
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
  homeStart: "Los",
  homeMotivation: "Bereit für deine tägliche Runde?",
  levelShort: "Lv {n}",
  streakLabel: "Serie: {n} von {total} richtig",
  streakBonus: "+{n}",
  streakBonusTitle: "Streak-Bonus",
  homeContinue: "Weiter",
  homeBonus: "Noch eine Runde",
  homeRingLabel: "Rechen-Level {level} von 500",
  homeRechenLevel: "Rechen-Level",
  rematchBadge: "Nochmal",
  runExit: "Runde pausieren",
  runCount: "{n}/{total}",
  runProgressLabel: "Aufgabe {n} von {total}",
  sumTitle: "Fertig für heute",
  sumBonusTitle: "Zusatzrunde fertig",
  sumChallenge: "Schaffst du es, in jeder Kategorie Level 100 zu erreichen?",
  explainLinear0:
    "Rechne auf beiden Seiten das Gleiche: Bring die Zahl ohne x mit der Gegenoperation auf die andere Seite.",
  explainLinear1: "Teile beide Seiten durch die Zahl vor dem x.",
  explainTermsExpand:
    "Multipliziere die Zahl vor der Klammer mit jedem Summanden darin. Ein Minus davor dreht alle Vorzeichen um.",
  explainTermsCollect:
    "Fasse gleiche Terme zusammen: x mit x, Zahlen mit Zahlen. Achte auf die Vorzeichen.",
  explainFractionsSimplify:
    "Kürze mit dem größten gemeinsamen Teiler von Zähler und Nenner.",
  explainFractionsAdd:
    "Erweitere auf den gemeinsamen Nenner, dann addierst du nur die Zähler.",
  explainFractionsMultiply: "Zähler mal Zähler, Nenner mal Nenner. Dann kürzen.",
  explainFractionsDivide:
    "Durch einen Bruch teilen heißt mit dem Kehrwert multiplizieren.",
  explainFractionsPercent: "Prozent heißt Hundertstel: p % von a = a · p/100.",
  explainSquaresSquare:
    "Quadrieren heißt mit sich selbst multiplizieren. Das Ergebnis ist nie negativ.",
  explainSquaresRoot:
    "Suche die nicht negative Zahl, die mit sich selbst den Wert unter der Wurzel ergibt.",
  explainSquaresBinomial:
    "Binomische Formel: (a ± b)² = a² ± 2ab + b². Vergiss das mittlere Glied nicht.",
  explainSquaresProduct: "Dritte binomische Formel: (a + b)(a − b) = a² − b².",
  explainPowersProduct:
    "Gleiche Basis: Beim Multiplizieren addierst du die Exponenten.",
  explainPowersQuotient:
    "Gleiche Basis: Beim Dividieren subtrahierst du die Exponenten.",
  explainPowersPower: "Potenz einer Potenz: Multipliziere die Exponenten.",
  explainPowersNegative:
    "Ein negativer Exponent bedeutet den Kehrwert: a⁻ⁿ = 1/aⁿ.",
  explainPowersFractional:
    "Der Nenner im Exponenten ist die Wurzel: a^(m/n) = (ⁿ√a)ᵐ.",
  explainPowersNegativeFractional:
    "Erst der Kehrwert (wegen des Minus), dann Wurzel und Potenz.",
  explainPowersRoot:
    "Suche die Zahl, die mit sich selbst (bei der dritten Wurzel dreimal) das Ergebnis ergibt.",
}

export type MessageKey = keyof typeof de

const en: Record<MessageKey, string> = {
  appTitle: "MathFeed – Learn math",
  appDescription: "Practice math in a fast task feed.",
  navHome: "Today",
  navStats: "Progress",
  navLabel: "Main navigation",
  instruction: "Pick the correct result",
  continueHint: "Tap to continue",
  timerLabel: "Active time today: {time}",
  answerLabel: "Answer {n}",
  statsLevel: "Level",
  statsWeek: "Last 7 days",
  statsWeekLabel: "Answered tasks of the last seven days",
  statsCurveLabel: "Topic levels over the last 30 days",
  statsCurveEmpty: "The curve appears after your first run.",
  statsTopicsLabel: "Topics, tap to highlight",
  statsAxisEnd: "today",
  typeFractions: "Fractions",
  typeTerms: "Terms",
  typePowers: "Powers",
  typeLinear: "Equations",
  typeSquares: "Squares",
  themeLabel: "Appearance",
  themeLight: "Light",
  themeDark: "Dark",
  errStartTitle: "Start failed",
  errNoticeTitle: "Notice",
  errStart: "MathFeed could not be started.",
  errStorageFormat: "The saved MathFeed progress has an unknown format.",
  errSave: "Progress could not be saved:",
  errMath: "Formulas could not be fitted:",
  errFitSpace: "The space available for the formulas could not be determined.",
  errFitShared: "The shared scale of the answers could not be determined.",
  homeStart: "Go",
  homeMotivation: "Ready for your daily round?",
  levelShort: "Lv {n}",
  streakLabel: "Streak: {n} of {total} correct",
  streakBonus: "+{n}",
  streakBonusTitle: "Streak bonus",
  homeContinue: "Continue",
  homeBonus: "One more round",
  homeRingLabel: "Math level {level} of 500",
  homeRechenLevel: "Math level",
  rematchBadge: "Again",
  runExit: "Pause run",
  runCount: "{n}/{total}",
  runProgressLabel: "Task {n} of {total}",
  sumTitle: "Done for today",
  sumBonusTitle: "Extra round done",
  sumChallenge: "Can you reach level 100 in every category?",
  explainLinear0:
    "Do the same on both sides: move the plain number across with its opposite operation.",
  explainLinear1: "Divide both sides by the number in front of x.",
  explainTermsExpand:
    "Multiply the number in front of the bracket with every term inside. A minus in front flips every sign.",
  explainTermsCollect:
    "Combine like terms: x with x, numbers with numbers. Watch the signs.",
  explainFractionsSimplify:
    "Cancel with the greatest common divisor of numerator and denominator.",
  explainFractionsAdd:
    "Convert to a common denominator, then add only the numerators.",
  explainFractionsMultiply:
    "Numerator times numerator, denominator times denominator. Then cancel.",
  explainFractionsDivide: "Dividing by a fraction means multiplying by its reciprocal.",
  explainFractionsPercent: "Percent means hundredths: p% of a = a · p/100.",
  explainSquaresSquare:
    "Squaring means multiplying by itself. The result is never negative.",
  explainSquaresRoot:
    "Find the non-negative number that gives the radicand when multiplied by itself.",
  explainSquaresBinomial:
    "Binomial formula: (a ± b)² = a² ± 2ab + b². Don't forget the middle term.",
  explainSquaresProduct: "Third binomial formula: (a + b)(a − b) = a² − b².",
  explainPowersProduct: "Same base: when multiplying, add the exponents.",
  explainPowersQuotient: "Same base: when dividing, subtract the exponents.",
  explainPowersPower: "Power of a power: multiply the exponents.",
  explainPowersNegative:
    "A negative exponent means the reciprocal: a⁻ⁿ = 1/aⁿ.",
  explainPowersFractional:
    "The denominator of the exponent is the root: a^(m/n) = (ⁿ√a)ᵐ.",
  explainPowersNegativeFractional:
    "First the reciprocal (because of the minus), then root and power.",
  explainPowersRoot:
    "Find the number that gives the radicand when multiplied by itself (three times for a cube root).",
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

export const signed = (n: number) => `${n < 0 ? "−" : "+"}${Math.abs(n)}`

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
