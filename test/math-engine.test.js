import test from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import {
    applyNextStep,
    currentLine,
    formatRational,
    generateTask,
    getNextStep,
    isTaskComplete,
    rational,
    TASK_TYPES
} from '../math-engine.js';
import { chooseNextType, createTypeProgress, recordReview } from '../progress.js';

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
            assert.ok(steps > 0);
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

test('linear equation generator creates an exact solution', () => {
    for (let iteration = 0; iteration < 100; iteration++) {
        const task = generateTask('linear');
        const { a, b, c, solution } = task.data;
        assert.ok(equal(add(multiply(a, solution), b), c));
    }
});

test('term simplification rule reaches the exact generated polynomial', () => {
    for (let iteration = 0; iteration < 100; iteration++) {
        let task = generateTask('terms');
        while (!isTaskComplete(task)) task = applyNextStep(task);
        const { a, b, c, d, e, f } = task.data;
        const expectedX = add(add(multiply(a, b), d), f);
        const expectedConstant = add(multiply(a, c), multiply(d, e));
        assert.equal(currentLine(task), formatAffine(expectedX, expectedConstant));
        assert.equal(task.stage, 4);
    }
});

test('quadratic generator creates exact roots and explicitly adds the square on both sides', () => {
    for (let iteration = 0; iteration < 100; iteration++) {
        let task = generateTask('quadratic');
        const { firstRoot, secondRoot, p, q, halfPSquare, discriminant, squareRoot } = task.data;
        assert.ok(equal(multiply(squareRoot, squareRoot), discriminant));
        for (const root of [firstRoot, secondRoot]) {
            const value = add(add(multiply(root, root), multiply(p, root)), q);
            assert.ok(equal(value, rational(0)));
        }
        task = applyNextStep(task);
        task = applyNextStep(task);
        const completionLine = currentLine(task);
        assert.ok(completionLine.includes(`x^2`));
        assert.ok(completionLine.includes(`+ ${formatRational(halfPSquare)}`));
        assert.ok(completionLine.endsWith(`= ${formatRational(discriminant)}`));
        const completion = getNextStep(task);
        assert.ok(completion.choices.some(choice => choice.id === completion.answerId));
        task = applyNextStep(task);
        assert.ok(currentLine(task).includes('\\left(') && currentLine(task).includes('\\right)^2'));
    }
});

test('LGS multiplier cancels the y coefficient exactly', () => {
    for (let iteration = 0; iteration < 100; iteration++) {
        const task = generateTask('lgs');
        const { y1, y2, factor } = task.data;
        assert.ok(equal(add(multiply(y1, factor), y2), rational(0)));
        assert.match(currentLine(task), /\\begin\{aligned\}/);
    }
});

test('an error schedules review after two correct tasks of other types', () => {
    const types = Object.fromEntries(Object.keys(TASK_TYPES).map(type => [type, { ...createTypeProgress(), seen: true, dueAt: 100 }]));
    recordReview(types, 'linear', false);
    assert.notEqual(chooseNextType(types, 'linear'), 'linear');
    recordReview(types, 'terms', true);
    assert.equal(types.linear.otherCorrectCount, 1);
    assert.notEqual(chooseNextType(types, 'terms'), 'linear');
    recordReview(types, 'lgs', true);
    assert.equal(types.linear.otherCorrectCount, 2);
    assert.equal(chooseNextType(types, 'lgs'), 'linear');
});

test('successful reviews grow intervals and avoid immediate repetition when possible', () => {
    const types = Object.fromEntries(Object.keys(TASK_TYPES).map(type => [type, { ...createTypeProgress(), seen: true, dueAt: 0 }]));
    recordReview(types, 'linear', true);
    assert.equal(types.linear.dueAt - types.linear.otherCorrectCount, 2);
    recordReview(types, 'terms', true);
    recordReview(types, 'linear', true);
    assert.equal(types.linear.dueAt - types.linear.otherCorrectCount, 4);
    assert.notEqual(chooseNextType(types, 'linear'), 'linear');
});
