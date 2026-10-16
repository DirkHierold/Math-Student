# MathFeed

MathFeed replaces the previous topic dashboard and level-based exercise sessions with a client-side, mobile-first task feed. It is built with vanilla JavaScript and stores progress locally; no account, backend, keyboard input, XP, streak, or daily goal is used.

## Learning flow

- The app opens directly on a generated exercise and starts with a random mix of four exercise families: fractional linear equations, expanding/simplifying terms, powers and roots (including negative and fractional exponents), and quadratic equations.
- Students select the next valid line from mathematical answer tiles. A short visual response automatically advances to the next line; no explanatory text or extra continue tap interrupts the flow. A wrong choice schedules that exercise type for review after two correct exercises of other types.
- Rational arithmetic is exact. Fractions are reduced and whole numbers are rendered without a denominator.
- Tasks, intermediate lines, and answer choices are rendered as TeX using locally served KaTeX and its local fonts, including offline use.
- Use the information button to open the fixed, non-scrollable statistics view; use the close control to return to the feed. The feed header shows the current exercise type and step, plus the active practice time for today.
- Feed and statistics headers share the same single-line title styling, vertical alignment, and button dimensions.
- The exercise type and step appear together on one line. Formulas use fixed base font sizes (40 px for tasks, 21 px for answers) and an independent inner transform to shrink or enlarge them proportionally to the available width and height, without wrapping or changing the font size. All answers within a step share the same scale, limited by the answer that needs the most space; the task scales independently.
- New formulas become visible together after their fonts have loaded and their initial scale has been applied. Subsequent container resizes update the scale without hiding formulas or changing button dimensions.
- Answer feedback changes the selected tiles in place; it does not rerender the formula choices before moving to the next step.

## Step-rule engine

Generators create structured exercise state rather than arbitrary strings. A rule matches an exercise family and step, applies one algebraic transformation or exact calculation, and generates likely misconception distractors. Equation rules preserve the solution set; term rules preserve algebraic equivalence; power and root tasks use positive bases and exact real roots. For completing the square, the generated sequence explicitly adds `(p/2)^2` to both sides before rewriting the left side as a binomial square. Generated choices are rendered as tappable tiles; no text field or native keyboard is used.

`mathgenerator` is a Python problem/solution generator, not a browser-side JavaScript step solver. It may inform exercise templates, but the client-side rule catalog owns the pedagogical next-step logic.

## Progress and statistics

Progress is saved in `localStorage`. Each exercise family tracks its review due point; correct reviews grow intervals through 2, 4, 7, 11, 17, 24, 32, and 42 correct tasks of other families. An error schedules that family after two correct tasks of other families. Unseen families are introduced before scheduled reviews.

Practice time accrues only while the browser tab is visible and focused. Daily totals use the `Europe/Berlin` calendar date. Statistics retain a rolling seven-day window. The grouped, stacked weekly chart shows correct intermediate steps and incorrect step attempts grouped by exercise type for each day, alongside that day's practice duration. A larger stacked chart below expands today's counts by exercise type; the shared legend sits between the two charts. The active timer appears in the same header position in the feed and statistics views. The active timer and daily duration labels are red below ten minutes and green at ten minutes or more.
