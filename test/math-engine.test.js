import test from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import {
    applyNextStep,
    currentLine,
    explanationKey,
    formatRational,
    generateTask,
    getNextStep,
    isTaskComplete,
    MAX_LEVEL,
    rational,
    TASK_TYPES
} from '../math-engine.js';

const add = (a, b) => rational(a.n * b.d + b.n * a.d, a.d * b.d);
const multiply = (a, b) => rational(a.n * b.n, a.d * b.d);
const equal = (a, b) => a.n === b.n && a.d === b.d;
const format = value => {
    if (value.d === 1) return String(value.n);
    return `${value.n < 0 ? '-' : ''}\\frac{${Math.abs(value.n)}}{${value.d}}`;
};
const formatAffine = (x, constant) => {
    let result = '';
    if (x.n !== 0) {
        const abs = rational(Math.abs(x.n), x.d);
        const term = equal(abs, rational(1)) ? 'x' : `${format(abs)}x`;
        result = `${x.n < 0 ? '-' : ''}${term}`;
    }
    if (constant.n !== 0) {
        const term = format(rational(Math.abs(constant.n), constant.d));
        result += result ? ` ${constant.n < 0 ? '-' : '+'} ${term}` : `${constant.n < 0 ? '-' : ''}${term}`;
    }
    return result || '0';
};

test('fractions are reduced and whole numbers omit /1', () => {
    assert.equal(formatRational(rational(6, 8)), '\\frac{3}{4}');
    assert.equal(formatRational(rational(-6, 8)), '-\\frac{3}{4}');
    assert.equal(formatRational(rational(-6, -3)), '2');
    assert.equal(formatRational(rational(0, 9)), '0');
    assert.throws(() => rational(1, 0), RangeError);
    assert.throws(() => rational(0.5), TypeError);
});

test('every generated family has four distinct tile choices and terminates', () => {
    for (const type of Object.keys(TASK_TYPES)) {
        for (let iteration = 0; iteration < 80; iteration++) {
            let task = generateTask(type);
            let steps = 0;
            while (!isTaskComplete(task)) {
                const step = getNextStep(task);
                assert.ok(step.choices.some(choice => choice.id === step.answerId), `${type} answer missing from tiles`);
                assert.equal(new Set(step.choices.map(choice => choice.id)).size, step.choices.length);
                assert.equal(step.choices.length, 4, `${type} should provide four unique choices`);
                assert.equal(new Set(step.choices.map(choice => choice.tex)).size, step.choices.length);
                assert.ok(!step.choices.some(choice => /\d+\.\d+/.test(choice.tex)), 'decimal output is forbidden');
                assert.notEqual(step.answerTex, currentLine(task), `${type} produced a no-op step`);
                assert.doesNotThrow(() => katex.renderToString(currentLine(task), { displayMode: true, throwOnError: true, trust: false }));
                for (const choice of step.choices) {
                    assert.doesNotThrow(() => katex.renderToString(choice.tex, { displayMode: true, throwOnError: true, trust: false }));
                }
                task = applyNextStep(task);
                steps++;
                assert.ok(steps <= 6, `${type} did not terminate`);
            }
            assert.equal(steps, 1, `${type} tasks are a single step`);
        }
    }
});

test('choice identity is stable and independent of randomized visual order', () => {
    for (const type of Object.keys(TASK_TYPES)) {
        const task = generateTask(type);
        const first = getNextStep(task);
        const second = getNextStep(task);
        const asMap = step => Object.fromEntries(step.choices.map(choice => [choice.id, choice.tex]));
        assert.deepEqual(asMap(first), asMap(second));
        const correctPositions = new Set(
            Array.from({ length: 24 }, () => getNextStep(task).choices.findIndex(choice => choice.id === 'correct'))
        );
        assert.ok(correctPositions.size > 1, `${type} correct choice should not remain fixed in the first tile`);
    }
});

test('linear equation generator creates an exact solution and asks one step only', () => {
    const starts = new Set();
    for (let iteration = 0; iteration < 200; iteration++) {
        const task = generateTask('linear', 1 + (iteration % MAX_LEVEL));
        const { a, b, c, solution, start } = task.data;
        starts.add(start);
        assert.ok(equal(add(multiply(a, solution), b), c));
        const answer = getNextStep(task).answerTex;
        assert.equal(answer, start === 0
            ? currentLine(applyNextStep(task))
            : `x = ${format(solution)}`);
        assert.equal(isTaskComplete(applyNextStep(task)), true);
    }
    assert.deepEqual([...starts].sort(), [0, 1]);
});

// Evaluates the generated TeX numerically, so lines and distractors can be checked without a CAS.
const evaluate = (tex, x) => {
    const js = tex
        .replace(/\\left\(/g, '(').replace(/\\right\)/g, ')')
        .replace(/\\,\\%/g, '/100').replace(/\\cdot/g, '*').replace(/\\div/g, '/')
        .replace(/\\frac\{(-?\d+)\}\{(\d+)\}/g, '(($1)/($2))')
        .replace(/\\sqrt\{(\d+)\}/g, 'Math.sqrt($1)')
        .replace(/\^\{(-?\d+)\}/g, '**($1)')
        .replace(/(\d|\))\s*(x|\()/g, '$1*$2')
        .replace(/\)\s*(\d)/g, ')*$1');
    return Function('x', `return (${js})`)(x);
};
const sameValue = (left, right) => [3, 7].every(x => Math.abs(evaluate(left, x) - evaluate(right, x)) < 1e-9);

test('fixed-line families keep every line equivalent and every distractor wrong', () => {
    for (const type of ['terms', 'fractions', 'squares']) {
        for (let level = 1; level <= MAX_LEVEL; level++) {
            for (let run = 0; run < 40; run++) {
                let task = generateTask(type, level);
                while (!isTaskComplete(task)) {
                    const step = getNextStep(task);
                    assert.ok(sameValue(currentLine(task), step.answerTex), `${type}: ${currentLine(task)} != ${step.answerTex}`);
                    for (const choice of step.choices.filter(entry => entry.id !== step.answerId)) {
                        assert.ok(!sameValue(choice.tex, step.answerTex), `${type}: distractor ${choice.tex} equals ${step.answerTex}`);
                    }
                    task = applyNextStep(task);
                }
            }
        }
    }
});

test('terms stay short: a single step with at most one bracket, no bracket at easy levels', () => {
    for (let run = 0; run < 200; run++) {
        assert.ok(!currentLine(generateTask('terms', 2)).includes('\\left('));
        const hard = generateTask('terms', MAX_LEVEL);
        assert.ok((currentLine(hard).match(/\\left\(/g) ?? []).length <= 1);
        assert.equal(hard.data.lines.length, 2);
    }
    assert.equal(Object.hasOwn(TASK_TYPES, 'quadratic'), false);
});

test('power and root exercises apply their laws with exact results', () => {
    const seenKinds = new Set();
    assert.ok(Object.hasOwn(TASK_TYPES, 'powers'));
    assert.equal(Object.hasOwn(TASK_TYPES, 'lgs'), false);

    for (let iteration = 0; iteration < 500; iteration++) {
        const task = generateTask('powers');
        const { kind } = task.data;
        seenKinds.add(kind);
        let expected;

        if (kind === 'product') {
            const { base, firstExponent, secondExponent } = task.data;
            expected = `${base}^{${firstExponent + secondExponent}}`;
        } else if (kind === 'quotient') {
            const { base, firstExponent, secondExponent } = task.data;
            expected = `${base}^{${firstExponent - secondExponent}}`;
        } else if (kind === 'power') {
            const { base, innerExponent, outerExponent } = task.data;
            expected = `${base}^{${innerExponent * outerExponent}}`;
        } else if (kind === 'negative') {
            const { base, exponent } = task.data;
            expected = `\\frac{1}{${base}^{${exponent}}}`;
        } else if (kind === 'fractional') {
            expected = String(task.data.root ** task.data.numerator);
        } else if (kind === 'negative-fractional') {
            expected = `\\frac{1}{${task.data.root ** task.data.numerator}}`;
        } else {
            assert.equal(kind, 'root');
            expected = String(task.data.root);
            assert.equal(task.data.root ** task.data.degree, task.data.radicand);
        }

        assert.equal(currentLine(task), task.data.question);
        assert.equal(getNextStep(task).answerTex, expected, `${kind} should have the exact expected answer`);
        assert.equal(isTaskComplete(applyNextStep(task)), true);
    }

    assert.deepEqual(
        [...seenKinds].sort(),
        ['fractional', 'negative', 'negative-fractional', 'power', 'product', 'quotient', 'root'].sort()
    );
    assert.throws(() => generateTask('lgs'), RangeError);
});

test('every difficulty level yields complete, rendering tasks and low levels stay simple', () => {
    for (const type of Object.keys(TASK_TYPES)) {
        for (let level = 1; level <= MAX_LEVEL; level++) {
            for (let run = 0; run < 25; run++) {
                let task = generateTask(type, level);
                let steps = 0;
                while (!isTaskComplete(task)) {
                    const step = getNextStep(task);
                    assert.equal(step.choices.length, 4);
                    assert.ok(step.choices.some(choice => choice.id === step.answerId));
                    for (const choice of step.choices) katex.renderToString(choice.tex, { throwOnError: true });
                    task = applyNextStep(task);
                    steps++;
                }
                assert.equal(steps, 1);
            }
        }
    }

    for (let run = 0; run < 100; run++) {
        const easyLinear = generateTask('linear', 1).data;
        for (const value of [easyLinear.a, easyLinear.b, easyLinear.solution]) assert.equal(value.d, 1);
        const easyPower = generateTask('powers', 1).data;
        assert.ok(['product', 'root'].includes(easyPower.kind));
        assert.ok(['simplify', 'add'].includes(generateTask('fractions', 1).data.kinds[0]));
        assert.ok(['square', 'root'].includes(generateTask('squares', 1).data.kinds[0]));
    }
});

test('every task offers a matching explanation key for wrong answers', () => {
    const keys = new Set();
    for (const type of Object.keys(TASK_TYPES)) {
        for (let level = 1; level <= MAX_LEVEL; level++) {
            for (let run = 0; run < 40; run++) {
                let task = generateTask(type, level);
                while (!isTaskComplete(task)) {
                    keys.add(explanationKey(task));
                    task = applyNextStep(task);
                }
            }
        }
    }
    assert.deepEqual([...keys].sort(), [
        'fractions-add', 'fractions-divide', 'fractions-multiply', 'fractions-percent', 'fractions-simplify',
        'linear-0', 'linear-1',
        'powers-fractional', 'powers-negative', 'powers-negative-fractional', 'powers-power', 'powers-product', 'powers-quotient', 'powers-root',
        'squares-binomial', 'squares-product', 'squares-root', 'squares-square',
        'terms-collect', 'terms-expand'
    ]);
});
