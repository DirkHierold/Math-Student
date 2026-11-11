import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChart, levelChange, levelRange } from '../level-series.js';

const history = [
    { day: '2025-01-01', level: 20 },
    { day: '2025-01-10', level: 24 },
    { day: '2025-01-10', level: 25 },
    { day: '2025-01-11', level: 27 },
];

test('the window starts at the first run and curves span the full width', () => {
    const chart = buildChart(history, {}, '2025-01-11');
    assert.equal(chart.start, '2025-01-01');
    assert.equal(chart.days, 11);
    assert.equal(chart.total[0].x, 0);
    assert.equal(chart.total.at(-1).x, 10);
});

test('the window is capped and same-day runs are spread inside their day', () => {
    const chart = buildChart(history, {}, '2025-01-11', 5);
    assert.equal(chart.days, 5);
    assert.deepEqual(chart.total.map(point => point.level), [24, 25, 27]);
    const [first, second] = chart.total;
    assert.ok(first.x < second.x && first.x > 2 && second.x < 4);
});

test('topics are aligned to the runs: carried forward and shared backwards', () => {
    const chart = buildChart(history, {
        fractions: [{ day: '2025-01-10', level: 30 }, { day: '2025-01-10', level: 33 }],
        terms: [{ day: '2025-01-01', level: 21 }],
        powers: [],
    }, '2025-01-11');
    assert.deepEqual(chart.topics.fractions.map(point => point.level), [30, 30, 33, 33]);
    assert.deepEqual(chart.topics.terms.map(point => point.level), [21, 21, 21, 21]);
    assert.deepEqual(chart.topics.powers, []);
    assert.deepEqual(chart.topics.terms.map(point => point.x), chart.total.map(point => point.x));
});

test('levelChange is the gain across the window and null for a single point', () => {
    const chart = buildChart(history, {}, '2025-01-11');
    assert.deepEqual(levelChange(chart.total), { delta: 7, since: '2025-01-01' });
    assert.equal(levelChange(chart.total.slice(0, 1)), null);
});

test('levelRange covers all series', () => {
    const range = levelRange([[{ level: 20 }, { level: 27 }], [{ level: 60 }]]);
    assert.ok(range.floor <= 20 && range.floor + range.span >= 60);
});
