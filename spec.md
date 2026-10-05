# MathFeed

MathFeed replaces the previous topic dashboard and level-based exercise sessions with a client-side, mobile-first task feed. It is built with vanilla JavaScript and stores progress locally; no account, backend, keyboard input, XP, streak, or daily goal is used.

## Learning flow

- The app opens directly on a generated exercise and starts with a random mix of four exercise families: fractional linear equations, expanding/simplifying terms, one-step linear-system elimination, and quadratic equations.
- Students select the next valid line from mathematical answer tiles. A short visual response automatically advances to the next line; no explanatory text or extra continue tap interrupts the flow. A wrong choice schedules that exercise type for review after two correct exercises of other types.
- Rational arithmetic is exact. Fractions are reduced and whole numbers are rendered without a denominator.
- Tasks, intermediate lines, and answer choices are rendered as TeX using locally served KaTeX and its local fonts, including offline use.
- Use the information button to open the fixed, non-scrollable statistics view; use the close control to return to the feed. The feed header shows the current exercise type and step, plus the active practice time for today.

## Step-rule engine

Generators create structured exercise state rather than arbitrary strings. A rule matches an exercise family and step, applies one algebraic transformation, and generates likely misconception distractors. Equation rules preserve the solution set; term rules preserve algebraic equivalence. For completing the square, the generated sequence explicitly adds `(p/2)^2` to both sides before rewriting the left side as a binomial square. Generated choices are rendered as tappable tiles; no text field or native keyboard is used.

`mathgenerator` is a Python problem/solution generator, not a browser-side JavaScript step solver. It may inform exercise templates, but the client-side rule catalog owns the pedagogical next-step logic.

## Progress and statistics

Progress is saved in `localStorage`. Each exercise family tracks its review due point; correct reviews grow intervals through 2, 4, 7, 11, 17, 24, 32, and 42 correct tasks of other families. An error schedules that family after two correct tasks of other families. Unseen families are introduced before scheduled reviews.

Practice time accrues only while the browser tab is visible and focused. Daily totals use the `Europe/Berlin` calendar date. The weekly chart annotates each day with its solved-task count and practice duration; today's correct/error counts are shown by exercise type.
