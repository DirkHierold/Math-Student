import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCompactDuration, formatDuration } from '../format.js';

test('daily timer uses a readable live clock', () => {
    assert.equal(formatDuration(0), '00:00');
    assert.equal(formatDuration(83), '01:23');
    assert.equal(formatDuration(3661), '1:01:01');
});

test('weekly chart duration labels stay compact', () => {
    assert.equal(formatCompactDuration(0), '0m');
    assert.equal(formatCompactDuration(3540), '59m');
    assert.equal(formatCompactDuration(3600), '1h');
    assert.equal(formatCompactDuration(3900), '1h05');
});
