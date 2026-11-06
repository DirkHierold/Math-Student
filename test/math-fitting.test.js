import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fittedMathScale, sharedMathScale } from '../math-layout.js';

const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [block, fit] = await Promise.all([
    read('src/components/math-block.tsx'),
    read('src/hooks/use-math-fit.ts')
]);

test('React formula renderer waits for fonts and applies a shared answer scale', () => {
    assert.match(block, /katex\.render\(tex, element, \{\s*displayMode: true,\s*throwOnError: true,\s*trust: false/);
    assert.match(fit, /document\.fonts\.ready\s*\.then\(\(\) => \{\s*fontsReady = true\s*fit\(\)/);
    assert.match(fit, /new ResizeObserver\(fit\)/);
    assert.match(fit, /sharedMathScale\(\s*items\s*\.filter/);
    assert.match(fit, /content\.style\.setProperty\(\s*"--math-scale"/);
});

test('formula fitting keeps formulas hidden when measurement cannot be completed', () => {
    assert.match(fit, /measurements\.some\(\(item\) => !item \|\| item\.scale === null\)/);
    assert.match(fit, /new Error\(t\("errFitSpace"\)\)/);
    assert.match(fit, /new Error\(t\("errFitShared"\)\)/);
    assert.match(fit, /if \(disposed \|\| !fontsReady\) return/);
});

test('formula scale math rejects invalid measurements and applies the tightest answer scale', () => {
    const scale = fittedMathScale(300, 32, 600, 100);
    assert.equal(scale, 0.3072);
    assert.equal(fittedMathScale(300, 32, 0, 100), null);
    assert.equal(fittedMathScale(300, 32, 200, 100), 0.3072);
    assert.equal(sharedMathScale([0.8, 0.4, 0.6]), 0.4);
    assert.equal(sharedMathScale([]), null);
});
