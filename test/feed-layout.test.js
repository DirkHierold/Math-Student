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
    assert.equal((html.match(/class="header-info"/g) ?? []).length, 2);
    assert.doesNotMatch(html, /header-subtitle-spacer|daily-summary|task-header-info/);
    assert.match(styles, /\.header-info \{[\s\S]*?align-items:\s*center;/);
    assert.match(styles, /\.header-info \.header-title \{[\s\S]*?white-space:\s*nowrap;/);
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
    assert.match(styles, /\.answer-tile \{[\s\S]*?height:\s*58px;[\s\S]*?overflow:\s*hidden;/s);
    assert.match(styles, /\.math-fitting \.math-content \{\s*visibility:\s*hidden;/);
    assert.match(styles, /transform:\s*translate\(-50%, -50%\) scale\(var\(--math-scale, 1\)\)/);
    assert.match(styles, /\.math-content \{[\s\S]*?width:\s*max-content;/);
    assert.match(styles, /\.task-expression \{[\s\S]*?font-size:\s*40px;/);
    assert.match(styles, /\.answer-tile \{[\s\S]*?font-size:\s*21px;/);
    assert.doesNotMatch(app, /style\.fontSize|fittedFontSize/);
    assert.match(app, /fittedMathScale\(availableWidth, availableHeight, content\.offsetWidth, content\.offsetHeight\)/);
    assert.match(app, /sharedMathScale\(measurements/);
    assert.match(app, /new window\.ResizeObserver\(\(\) => this\.fitRenderedMath\(\)\)/);
    assert.match(app, /document\.fonts\.ready\.then\(fitAfterFontsLoad\)/);
    assert.match(app, /window\.addEventListener\('resize', \(\) => this\.fitRenderedMath\(\)\)/);
    assert.match(app, /if \(this\.mathFitFrame\) return/);
    assert.match(app, /if \(revision !== this\.mathRevision\) return/);
});

test('math scales down without a minimum, scales up, and respects both dimensions with a margin', async () => {
    const { fittedMathScale } = await import('../math-layout.js');
    const scale = fittedMathScale(300, 250, 2400, 180);

    assert.ok(scale * 40 < 8);
    assert.equal(scale * 2400, 288);
    assert.ok(scale * 180 < 250);
    assert.equal(fittedMathScale(300, 250, 200, 100), 1.44);
    assert.equal(fittedMathScale(300, 30, 200, 100), 0.288);
    assert.equal(fittedMathScale(200, 100, 200, 100), 0.96);
    for (const invalid of [0, -1, NaN, Infinity, undefined]) {
        for (let index = 0; index < 4; index++) {
            const sizes = [300, 250, 200, 100];
            sizes[index] = invalid;
            assert.equal(fittedMathScale(...sizes), null);
        }
    }
});

test('all answers share the most restrictive valid scale', async () => {
    const { fittedMathScale, sharedMathScale } = await import('../math-layout.js');
    const sizes = [[200, 30], [600, 100], [300, 120], [100, 20]];
    const scale = sharedMathScale(sizes.map(([width, height]) => fittedMathScale(300, 32, width, height)));
    for (const [width, height] of sizes) {
        assert.ok(width * scale < 300);
        assert.ok(height * scale < 32);
    }
    assert.equal(sharedMathScale([2, 3, 4]), 2);
    for (const scales of [[], [1, null], [1, 0], [NaN], [Infinity], [-1]]) {
        assert.equal(sharedMathScale(scales), null);
    }
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
    assert.match(serviceWorker, /'\/math-layout\.js'/);
});
