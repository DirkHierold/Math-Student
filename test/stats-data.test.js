import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createDailyStats,
    getDurationColorClass,
    getRollingDateKeys,
    normalizeDailyStats,
    pruneDailyStats,
    recordStepAnswer
} from '../stats-data.js';

const TYPES = ['linear', 'terms'];

test('daily statistics count correct and incorrect step answers by type', () => {
    const day = createDailyStats(TYPES);

    recordStepAnswer(day, 'linear', true);
    recordStepAnswer(day, 'linear', false);
    recordStepAnswer(day, 'terms', true);

    assert.deepEqual(day.steps, {
        linear: { correct: 1, errors: 1 },
        terms: { correct: 1, errors: 0 }
    });
});

test('legacy daily task counts are not migrated into step counts, but practice time remains', () => {
    const daily = normalizeDailyStats({
        '2026-10-16': {
            seconds: 620,
            solved: 12,
            correct: 10,
            errors: 2,
            byType: { linear: { correct: 10, errors: 2 } }
        }
    }, TYPES);

    assert.deepEqual(daily['2026-10-16'], {
        seconds: 620,
        steps: {
            linear: { correct: 0, errors: 0 },
            terms: { correct: 0, errors: 0 }
        }
    });
});

test('rolling week includes seven consecutive dates across month and year boundaries', () => {
    assert.deepEqual(getRollingDateKeys('2026-01-02'), [
        '2025-12-27',
        '2025-12-28',
        '2025-12-29',
        '2025-12-30',
        '2025-12-31',
        '2026-01-01',
        '2026-01-02'
    ]);
});

test('pruning removes dates outside the rolling seven-day window', () => {
    const daily = {
        '2026-01-01': { seconds: 1 },
        '2026-01-02': { seconds: 2 },
        '2026-01-08': { seconds: 8 },
        '2026-01-09': { seconds: 9 }
    };

    pruneDailyStats(daily, '2026-01-08');

    assert.deepEqual(Object.keys(daily), ['2026-01-02', '2026-01-08']);
});

test('daily timer color turns green at exactly ten minutes', () => {
    assert.equal(getDurationColorClass(599), 'duration-low');
    assert.equal(getDurationColorClass(600), 'duration-high');
    assert.equal(getDurationColorClass(601), 'duration-high');
});
