import test from 'node:test';
import assert from 'node:assert/strict';

import { BADGE_GROUPS, BADGES, awardBadges, badgeProgress } from '../badges.js';
import { TASK_TYPES } from '../math-engine.js';
import { completeDay, createRewards, normalizeRewards } from '../rewards.js';
import { normalizeSkills } from '../skills.js';
import { createDailyStats } from '../stats-data.js';

const TYPES = Object.keys(TASK_TYPES);
const TODAY = '2026-11-25';

const makeState = () => ({
    skills: normalizeSkills({}, TYPES),
    rewards: createRewards(),
    daily: {}
});
const byId = id => BADGES.find(badge => badge.id === id);

test('every badge has a unique id and belongs to a known group', () => {
    const ids = BADGES.map(badge => badge.id);
    assert.equal(new Set(ids).size, ids.length);
    const groups = new Set(BADGE_GROUPS.map(group => group.id));
    for (const badge of BADGES) assert.ok(groups.has(badge.group), badge.id);
    for (const group of BADGE_GROUPS) assert.ok(BADGES.some(badge => badge.group === group.id), group.id);
});

test('a fresh state earns nothing and shows zero progress', () => {
    const state = makeState();
    assert.deepEqual(awardBadges(state, TODAY), []);
    assert.equal(badgeProgress(byId('tasks-tasks-100'), state, TODAY), 0);
});

test('badges reachable from saved data are awarded at once and stay earned', () => {
    const state = makeState();
    state.skills[TYPES[0]].level = 30;
    state.skills[TYPES[0]].tasks = 120;
    state.rewards.runs = 1;
    const earned = awardBadges(state, TODAY);
    for (const id of [`topic-${TYPES[0]}-topic-10`, `topic-${TYPES[0]}-topic-25`, 'tasks-tasks-100', 'days-days-1']) {
        assert.ok(earned.includes(id), id);
        assert.equal(state.rewards.badges[id], TODAY);
    }
    assert.ok(!earned.includes(`topic-${TYPES[0]}-topic-50`));
    assert.equal(badgeProgress(byId(`topic-${TYPES[0]}-topic-50`), state, TODAY), 0.6);

    // Falling back below the target keeps the badge.
    state.skills[TYPES[0]].level = 5;
    assert.deepEqual(awardBadges(state, '2026-11-26'), []);
    assert.equal(state.rewards.badges[`topic-${TYPES[0]}-topic-25`], TODAY);
    assert.equal(badgeProgress(byId(`topic-${TYPES[0]}-topic-25`), state, TODAY), 1);
});

test('the best correct streak is remembered after the streak breaks', () => {
    const state = makeState();
    state.skills[TYPES[1]].streak = 12;
    assert.ok(awardBadges(state, TODAY).includes('streak-correctStreak-10'));
    state.skills[TYPES[1]].streak = 0;
    awardBadges(state, TODAY);
    assert.equal(state.rewards.bestStreak, 12);
    assert.equal(badgeProgress(byId('streak-correctStreak-25'), state, TODAY), 12 / 25);
});

test('the day streak grows on consecutive days, restarts after a gap and expires', () => {
    const rewards = createRewards();
    completeDay(rewards, '2026-11-20');
    completeDay(rewards, '2026-11-21');
    completeDay(rewards, '2026-11-21');
    completeDay(rewards, '2026-11-22');
    assert.equal(rewards.dayStreak, 3);
    completeDay(rewards, '2026-11-24');
    assert.equal(rewards.dayStreak, 1);

    const state = { ...makeState(), rewards };
    rewards.dayStreak = 3;
    rewards.lastDay = '2026-11-24';
    assert.ok(awardBadges(state, '2026-11-25').includes('streak-dayStreak-3'));
    assert.equal(badgeProgress(byId('streak-dayStreak-7'), state, '2026-11-25'), 3 / 7);
    assert.equal(badgeProgress(byId('streak-dayStreak-7'), state, '2026-11-27'), 0);
});

test('day records read only today and need a flawless day for the flawless badge', () => {
    const state = makeState();
    const today = createDailyStats(TYPES);
    today.seconds = 16 * 60;
    today.steps[TYPES[0]].correct = 25;
    state.daily[TODAY] = today;
    const earned = awardBadges(state, TODAY);
    assert.ok(earned.includes('today-dayMinutes-15'));
    assert.ok(earned.includes('today-dayFlawless-20'));
    assert.ok(!earned.includes('today-dayMinutes-30'));
    assert.equal(badgeProgress(byId('today-dayTasks-50'), state, TODAY), 0.5);

    const other = makeState();
    const day = createDailyStats(TYPES);
    day.steps[TYPES[0]].correct = 25;
    day.steps[TYPES[0]].errors = 1;
    other.daily[TODAY] = day;
    assert.ok(!awardBadges(other, TODAY).includes('today-dayFlawless-20'));
});

test('practice time and all-rounder badges', () => {
    const state = makeState();
    state.rewards.totalSeconds = 3700;
    for (const type of TYPES) state.skills[type].tasks = 1;
    const earned = awardBadges(state, TODAY);
    assert.ok(earned.includes('hours-hours-1'));
    assert.ok(earned.includes(`all-allPractised-${TYPES.length}`));
    assert.ok(!earned.includes('all-allLevel-25'));
});

test('badge data survives saving and loading; old saves get sensible defaults', () => {
    const rewards = createRewards();
    rewards.badges = { 'days-days-1': TODAY };
    rewards.totalSeconds = 90.5;
    rewards.bestStreak = 7;
    rewards.dayStreak = 4;
    assert.deepEqual(normalizeRewards(JSON.parse(JSON.stringify(rewards))), rewards);

    const old = normalizeRewards({ runs: 3, badges: { a: 'x', b: 5 } });
    assert.equal(old.dayStreak, 1);
    assert.equal(old.totalSeconds, 0);
    assert.deepEqual(old.badges, { a: 'x' });
});

test('new badges queue up as unseen until marked seen; silent awards skip the queue', async () => {
    const { markBadgeSeen, badgeById } = await import('../badges.js');
    const state = makeState();
    state.rewards.runs = 1;
    state.skills[TYPES[0]].tasks = 100;
    awardBadges(state, TODAY);
    assert.deepEqual(state.rewards.unseenBadges, ['tasks-tasks-100', 'days-days-1']);
    markBadgeSeen(state.rewards, 'tasks-tasks-100');
    assert.deepEqual(state.rewards.unseenBadges, ['days-days-1']);
    assert.deepEqual(normalizeRewards(JSON.parse(JSON.stringify(state.rewards))).unseenBadges, ['days-days-1']);
    assert.equal(badgeById('days-days-1').target, 1);
    assert.equal(badgeById('nope'), null);

    const old = makeState();
    old.rewards.runs = 9;
    assert.ok(awardBadges(old, TODAY, { silent: true }).length > 0);
    assert.deepEqual(old.rewards.unseenBadges, []);
});
