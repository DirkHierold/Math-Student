# MathFeed

MathFeed replaces the previous topic dashboard and level-based exercise sessions with a client-side, mobile-first task feed. The UI uses Vite, React, TypeScript, Tailwind CSS v4, and the original shadcn/ui components (Radix base, `radix-vega` style, neutral base color) generated with the shadcn CLI. Progress remains local; there is no account, backend, keyboard input, XP, streak, or daily goal.

## Learning flow

- The app opens directly on a generated exercise and starts with a random mix of four exercise families: fractional linear equations, expanding/simplifying terms, powers and roots (including negative and fractional exponents), and quadratic equations.
- Students select the next valid line from mathematical answer tiles. A correct answer automatically advances to the next line after a short visual response. A wrong choice keeps the current line and answer tiles visible, with the correct tile green and selected tile red, until the student taps or clicks within the practice view; then the feed advances. That tap is consumed and never selects an answer of the following step. A wrong choice schedules that exercise type for review after two correct exercises of other types.
- Rational arithmetic is exact. Fractions are reduced and whole numbers are rendered without a denominator.
- Tasks, intermediate lines, and answer choices are rendered as TeX using KaTeX and its local fonts, including offline use.
- The app never scrolls (not even rubber-banding) on any view or viewport, including an iPhone SE (375×667, Safari ≈ 553 pt visible). The shell is a fluid `100dvh` layout; task card and answer grid share the remaining height in proportion instead of fixed pixel heights. Landscape (`max-height: 500px`) uses two columns. Pinch zoom stays available; double-tap zoom, text selection and tap highlights are disabled.
- Navigation is a bottom tab bar with two destinations (practice, statistics), each with icon and short label. Timer and current exercise persist across tabs.
- Feed header: exercise type chip (math glyph `a/b`, `( )`, `√`, `x²` + colour + short name), step dots, and the active-time icon with `mm:ss`. One instruction line sits above the answers. Answer tiles have no letters.
- Feedback uses several channels: ✓/✗ icon, colour, shake on a wrong tile (iOS Safari has no vibration API). After a wrong answer the correct tile stays visible and a pulsing hint reads "tap to continue"; the next tap advances.
- Statistics fit without scrolling: legend, theme toggle (Hell/Dunkel/System as icons), two KPI tiles, a seven-day chart with counts on the bars and today highlighted, and today's counts by exercise type as glyph rows.
- Icons carry meaning only where they are universal (✓ ✗, clock, sun/moon, step dots); everything else pairs an icon with a short label. Redundant explanatory text was removed.
- The UI language follows the browser: German when `navigator.languages[0]` is German, English otherwise; there is no language switcher. All visible text and ARIA labels live in `src/lib/i18n.ts` (identical keys in both languages, enforced by tests); `<html lang>` and `Intl` formats follow the chosen language. The PWA manifest is language-neutral.
- Light and dark themes follow the system setting by default and can be switched manually via the shadcn `ThemeProvider` and a toggle group in the statistics view; the choice is stored locally under `mathfeed-theme`.
- Formulas use fixed base font sizes (40 px for tasks, 21 px for answers) and an independent inner transform to shrink or enlarge them proportionally to the available width and height, without wrapping or changing the font size. All answers within a step share the same scale, limited by the answer that needs the most space; the task scales independently.
- New formulas become visible together after their fonts have loaded and their initial scale has been applied. Subsequent container resizes update the scale without hiding formulas or changing button dimensions.
- Answer feedback changes the selected tiles in place; it does not rerender the formula choices before moving to the next step.

## Step-rule engine

Generators create structured exercise state rather than arbitrary strings. A rule matches an exercise family and step, applies one algebraic transformation or exact calculation, and generates likely misconception distractors. Equation rules preserve the solution set; term rules preserve algebraic equivalence; power and root tasks use positive bases and exact real roots. For completing the square, the generated sequence explicitly adds `(p/2)^2` to both sides before rewriting the left side as a binomial square. Generated choices are rendered as tappable tiles; no text field or native keyboard is used.

`mathgenerator` is a Python problem/solution generator, not a browser-side JavaScript step solver. It may inform exercise templates, but the client-side rule catalog owns the pedagogical next-step logic.

## Progress and statistics

Progress is saved in `localStorage`. Each exercise family tracks its review due point; correct reviews grow intervals through 2, 4, 7, 11, 17, 24, 32, and 42 correct tasks of other families. An error schedules that family after two correct tasks of other families. Unseen families are introduced before scheduled reviews.

Practice time accrues only while the browser tab is visible and focused. Daily totals use the `Europe/Berlin` calendar date. Statistics retain a rolling seven-day window. The weekly chart shows correct intermediate steps and incorrect step attempts; today's chart groups counts by exercise type. Duration labels use muted or positive semantic color.

## Development

- `npm run dev` starts the Vite development server.
- `npm test` runs the domain and UI layout tests.
- `npm run build` type-checks and builds the offline-ready PWA into `dist/`.
- Add further UI components with `npx shadcn@latest add <component>`; they are written to `src/components/ui/` (configuration in `components.json`). Behind a TLS-intercepting proxy, run the CLI with `NODE_OPTIONS=--use-openssl-ca`.
- Layout: `src/App.tsx` (shell), `src/components/` (feed, statistics, bottom nav, task types, math block, theme), `src/hooks/` (task flow, active timer, formula fitting), `src/lib/` (state, i18n, `cn`). The domain modules (`math-engine.js`, `progress.js`, `stats-data.js`, `format.js`, `math-layout.js`) stay plain JavaScript in the repository root.
