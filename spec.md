# MathFeed

MathFeed is a client-side, mobile-first daily math habit for older teenagers and adults who want to get faster and more reliable at everyday school algebra. The UI uses Vite, React, TypeScript, Tailwind CSS v4, and the original shadcn/ui components (Radix base, `radix-vega` style, neutral base color) generated with the shadcn CLI. Progress remains local; there is no account, backend, or keyboard input. The design goal is voluntary daily practice with a friction budget of one tap per day ("Los"): the learner never chooses topic, level, duration or settings; the app decides. The tone is calm and factual (du-address, muted colours); there are no XP, levels, stars or boss tasks, because extrinsic rewards can crowd out interest (overjustification effect). Progress is the **Rechen-Level** and its curve. See `plan.md` for the full concept (section 1a documents this revision) and the ideas that are not built yet.

## Learning flow

- **Today screen**: one big button (Los / Weiter / Noch eine Runde) and a large ring whose incomplete arc shows the Rechen-Level (sum of all five category levels, 500 = full circle) with the number in the centre and the change of the last run ("+3" green or "−2" red) behind it. After a run a challenge replaces the old hint: reach level 100 in every category; "Fertig für heute ✓" or the run progress sits underneath. No streak, no week row.
- **Daily run** (12 tasks, ≈ 5 min): every task is drawn from the current level of a category (+1 / −1 per task). The header shows the pause button, the category name of the current task in the centre, a progress bar and `n/12` instead of a timer; the progress is stored per task. A run left over from a previous day is discarded.
- **Summary** ("Fertig für heute ✓"): the Rechen-Level (with the change since the previous run), accuracy, up to two topics that got more reliable. Buttons: done, or one more short extra run (6 tasks).
- **Five micro-task families** (every task is exactly one step, interleaved in the run; the family is never shown to the learner and only steers task selection internally): fractions (simplify, add, multiply, divide, percent), terms (collect, expand from level 3), powers and roots (including negative and fractional exponents), linear equations (one operation: move a constant or divide; integers first, fractions later), and squares/roots/binomial formulas. Quadratic equations were removed on purpose: the building blocks (binomials, roots, terms) are practised until they are automatic first. Learners select the right result from answer tiles. A correct answer advances automatically with no full-screen flash. A wrong choice keeps the line visible (correct tile green, chosen tile red) together with a one-sentence explanation of the rule behind the step; a tap advances and is consumed so it never answers the next step.
- A wrong first attempt schedules a neutral **"Nochmal"**: the same family and level returns 2–4 tasks later with new numbers.
- Rational arithmetic is exact. Fractions are reduced and whole numbers are rendered without a denominator.
- Tasks, intermediate lines, and answer choices are rendered as TeX using KaTeX and its local fonts, including offline use.
- The app never scrolls (not even rubber-banding) on any view or viewport, including an iPhone SE (375×667, Safari ≈ 553 pt visible). The shell is a fluid `100dvh` layout; task card and answer grid share the remaining height in proportion. Landscape (`max-height: 500px`) uses two columns. Pinch zoom stays available; double-tap zoom, text selection and tap highlights are disabled.
- Navigation is a bottom tab bar with two destinations (Heute, Fortschritt), hidden during a run and on the summary.
- Feedback uses several channels: ✓/✗ icon, colour, shake on a wrong tile, vibration where available.
- Statistics (Fortschritt) fit without scrolling: a header with the theme toggle (Hell/Dunkel/System) and ONE shared time chart of the five topics (the axis starts at the first run, at most 30 days back, and runs full width; thin coloured curves carried forward across the whole width; no total and no day strip; the legend below shows name, current level and the change of the last run per topic (green +n, red −n), tapping an entry highlights its curve), and a seven-day stacked bar chart of answers per day, coloured by topic, with accuracy and today's time. Landscape uses two columns.
- The UI language follows the browser (German or English; no switcher). All visible text and ARIA labels live in `src/lib/i18n.ts` (identical keys in both languages, enforced by tests). The PWA manifest is language-neutral.
- Light and dark themes follow the system setting and can be switched in the statistics view (`mathfeed-theme`).
- Formulas use fixed base font sizes (40 px for tasks, 21 px for answers) and an independent inner transform to fit the available space. All answers within a step share one scale; the task scales independently. Formulas become visible after fonts have loaded.

## Adaptive model

- Each family is a skill with ten difficulty levels (`profileFor` and the per-family generators in `math-engine.js` control number ranges, step count and which rules appear). `generateTask(type, level)`.
- Per skill, `adaptive.js` runs an immediate staircase: every skill has an integer level 1–100 (start 0; level 0 still draws the easiest tasks). A task without any wrong answer gives +1, a task with an error −1, applied at once; the next task of that skill is drawn from the new level (also the repeat of a failed task). No phases, streaks or placement tests.
- **Rechen-Level** (`overallLevel`/`topicLevel` in `skills.js`): each of the five categories has a level 1–100 (`rewards.topicLevels`, one curve point per run for every topic, so curves stay aligned, `rewards.topicHistory`, last 90); task generators in `math-engine.js` scale from level 1 to 100 (every ten levels unlock a new tier of task kinds, numbers keep growing in between). The headline level is the plain sum of all category levels (0–500), so every +1/−1 is directly verifiable. The first run also stores the start levels as a baseline point (`recordBaseline`), so curves and ±numbers appear after the first run. `recordLevel` stores it after each finished run (main or bonus, last 90 values) and follows the real level including setbacks. Home and Fortschritt show the change of the last run behind the total and each category (green +n, red −n); the per-topic curves are shown only on Fortschritt (`buildChart` in `level-series.js`).
- Spacing in days (`retention.js`): stability doubles per successful day and halves after an error; retention `R = e^(−days/S)`; a skill below 0.8 counts as faded and gets priority in the run planner (`session.js`) together with weakness, novelty and noise, without the same family three times in a row.
- No streaks, freezes or weekly goals: the app only records the last practised day and the run count (`completeDay` in `rewards.js`).

## Step-rule engine

Generators create structured exercise state. Fixed-line families (fractions, terms, squares) store the whole chain of equivalent lines and the wrong alternatives per step; linear equations and power/root tasks use rules that apply one transformation or exact calculation and generate misconception distractors. Equation rules preserve the solution set; term rules preserve equivalence; power and root tasks use positive bases and exact real roots. `explanationKey(task)` maps each step to a rule explanation in `i18n.ts`. Every task is a single step. Choices are tappable tiles; no text field or native keyboard is used.

`mathgenerator` is a Python problem/solution generator, not a browser-side step solver. It may inform exercise templates, but the client-side rule catalog owns the pedagogical next-step logic.

## Progress and storage

State v6 in `localStorage` (`mathfeed-state-v6`): `{ version, skills, rewards, session, daily }`; `rewards` holds the last practised day, the run count, the Rechen-Level and its history, plus per-topic levels and histories. Unknown or outdated fields (old XP, stars, streak data, quadratic skills) are dropped when loading. The v1–v5 keys are migrated by keeping only the daily statistics. Practice time accrues only while a run is open, the tab is visible and focused; it is not shown as a score. Daily totals use the `Europe/Berlin` calendar date. Statistics retain a rolling seven-day window.

## Not built yet (see plan.md)

Operation-choice format and scaffold fading, worked examples, per-step speed ("14 s statt 31 s"), numeric input, new topics, tutor setup/report/challenge links, backup, reminders, exam mode, first-run screen.

## Development

- `npm run dev` starts the Vite development server.
- `npm test` runs the domain, learning-model and UI layout tests.
- `npm run build` type-checks and builds the offline-ready PWA into `dist/`.
- Add further UI components with `npx shadcn@latest add <component>`; they are written to `src/components/ui/` (configuration in `components.json`). Behind a TLS-intercepting proxy, run the CLI with `NODE_OPTIONS=--use-openssl-ca`.
- Layout: `src/App.tsx` (shell and mode switch), `src/components/` (home, run, summary, statistics, bottom nav, task types, math block, theme), `src/hooks/` (run flow, active timer, formula fitting), `src/lib/` (state, i18n, `cn`). The domain modules (`math-engine.js`, `adaptive.js`, `skills.js`, `retention.js`, `session.js`, `rewards.js`, `dates.js`, `rng.js`, `stats-data.js`, `format.js`, `math-layout.js`) stay plain JavaScript in the repository root.

## Streak-Bonus und Motivation
- Pro Kategorie zählt eine Serie fehlerfreier Aufgaben (persistiert, Fehler setzt auf 0). Bei 5 in Folge gibt es +5 Level (Deckel 100), danach startet die Serie neu. Anzeige als Flamme mit n/5 im Aufgaben-Header, bei Bonus „+5 Level“.
- Vor der täglichen Hauptrunde zeigt der Home-Screen einen Motivationstext mit dem Rechen-Level.
- Der Los-/Weiter-/Zusatzrunde-Button pulsiert sanft (`animate-invite`, bei reduzierter Bewegung aus).
