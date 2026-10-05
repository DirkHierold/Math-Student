import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('feed and statistics use aligned information/back buttons without swipe UI', async () => {
    const [html, app] = await Promise.all([read('index.html'), read('app.js')]);
    assert.equal((html.match(/class="topbar"/g) ?? []).length, 2);
    assert.match(html, /id="type-label" class="header-title"/);
    assert.doesNotMatch(html, /id="task-step"/);
    assert.match(html, /id="active-day-time" class="header-title active-day-time"/);
    assert.match(app, /`\$\{HEADER_TYPE_LABELS\[task\.type\]\}: \$\{task\.stage \+ 1\}\/\$\{TASK_STEP_COUNTS\[task\.type\]\}`/);
    assert.match(app, /Aktive Tageszeit: \$\{time\.textContent\}/);
    const styles = await read('styles.css');
    assert.match(styles, /\.task-header-info \.header-title \{[\s\S]*?white-space:\s*nowrap;/);
    assert.match(html, /aria-label="Statistik-Informationen öffnen"><span class="info-icon"/);
    assert.match(html, /aria-label="Zurück zum Aufgaben-Feed">×/);
    assert.doesNotMatch(html, /brand-mark|gesture-hint|Wische nach links/);
    assert.doesNotMatch(app, /touchstart|touchend|touchStartX|deltaX/);
});

test('formula and answer tiles share a one-column width and math is kept on one line', async () => {
    const [html, styles, app] = await Promise.all([
        read('index.html'),
        read('styles.css'),
        read('app.js')
    ]);
    assert.match(html, /id="task-expression" class="task-expression"/);
    assert.match(html, /id="answer-tiles" class="answer-tiles"/);
    assert.match(styles, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    assert.match(styles, /\.task-expression \.katex,[\s\S]*?\.answer-tile \.katex \{\s*white-space:\s*nowrap/s);
    assert.match(styles, /\.active-day-time \{\s*position:\s*absolute;[\s\S]*?left:\s*50%;/s);
    assert.match(styles, /\.task-expression \{[\s\S]*?flex:\s*1 1 0;[\s\S]*?overflow:\s*hidden;/s);
    assert.match(styles, /\.answer-tile \{\s*height:\s*58px;[\s\S]*?overflow:\s*hidden;/s);
    assert.match(styles, /\.math-fitting \{\s*visibility:\s*hidden;/);
    assert.match(app, /availableHeight[\s\S]*?availableWidth \/ bounds\.width, availableHeight \/ bounds\.height/s);
    assert.match(app, /Math\.max\(8, baseSize \* scale\)/);
    assert.match(app, /document\.fonts\.ready\.then\(fitAfterFontsLoad\)/);
    assert.match(app, /window\.addEventListener\('resize', \(\) => this\.fitRenderedMath\(\)\)/);
});

test('answer feedback updates existing tiles without rerendering their KaTeX formulas', async () => {
    const app = await read('app.js');
    const start = app.indexOf('    chooseAnswer(choiceId) {');
    const end = app.indexOf('\n    recordTaskResult()', start);
    const chooseAnswer = app.slice(start, end);
    assert.ok(start >= 0 && end > start);
    assert.doesNotMatch(chooseAnswer, /renderChoices|renderMath|katex\.render/);
    assert.match(chooseAnswer, /document\.getElementById\('answer-tiles'\)\.children/);
    assert.match(chooseAnswer, /classList\.toggle\('is-correct'/);
    assert.match(chooseAnswer, /classList\.toggle\('is-wrong'/);
});

test('weekly chart renders task count and duration labels for every day', async () => {
    const [app, styles, serviceWorker] = await Promise.all([
        read('app.js'),
        read('styles.css'),
        read('sw.js')
    ]);
    assert.match(app, /stats\.solved/);
    assert.match(app, /className = 'day-count'/);
    assert.match(app, /className = 'day-duration'/);
    assert.match(app, /formatCompactDuration\(item\.seconds\)/);
    assert.match(styles, /\.day-metrics \{\s*display:\s*flex;/);
    assert.match(serviceWorker, /'\/format\.js'/);
});
