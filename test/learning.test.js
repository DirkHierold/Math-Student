import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseLevel, nextLevel } from '../adaptive.js';
import { addDays, daysBetween } from '../dates.js';
import { MAX_LEVEL, TASK_TYPES } from '../math-engine.js';
import { createRng } from '../rng.js';
import { completeDay, createRewards, normalizeRewards, recordLevel, recordTopicLevels } from '../rewards.js';
import { isFaded, retention } from '../retention.js';
import { completeTask, createSession, finishSession, nextSlot, recommendedTopic } from '../session.js';
import { createSkill, isPractised, normalizeSkills, overallLevel, recordTaskResult, topicLevel } from '../skills.js';

const TYPES = Object.keys(TASK_TYPES);
const newSkills = () => normalizeSkills({}, TYPES);

test('a flawless task raises the level by one at once, any error lowers it by one', () => {
    const skill = createSkill();
    assert.equal(skill.level, 0);
    assert.equal(chooseLevel(skill), 1);
    const play = errors => recordTaskResult(skill, { errors, day: '2026-03-01' });
    play(0);
    assert.equal(skill.level, 1);
    play(0); play(0);
    assert.equal(skill.level, 3);
    assert.equal(chooseLevel(skill), 3);
    play(1);
    assert.equal(skill.level, 2);
    play(3);
    assert.equal(skill.level, 1);
});

test('every fifth flawless task in a row adds +5, the streak keeps running until an error', () => {
    const skill = createSkill();
    const play = errors => recordTaskResult(skill, { errors, day: '2026-03-01' });
    for (let i = 0; i < 4; i++) play(0);
    assert.equal(skill.level, 4);
    assert.equal(skill.streak, 4);
    play(0);
    assert.equal(skill.level, 10);
    assert.equal(skill.streak, 5);
    for (let i = 0; i < 5; i++) play(0);
    assert.equal(skill.streak, 10);
    assert.equal(skill.level, 20);
    play(1);
    assert.equal(skill.streak, 0);
    assert.equal(skill.level, 19);
    skill.level = MAX_LEVEL - 1;
    for (let i = 0; i < 5; i++) play(0);
    assert.equal(skill.level, MAX_LEVEL);
    assert.equal(normalizeSkills({ linear: { streak: 'x' } }, TYPES).linear.streak, 0);
    assert.equal(normalizeSkills({ linear: { streak: 12 } }, TYPES).linear.streak, 12);
});

test('levels stay within 1 and the maximum', () => {
    assert.equal(nextLevel(0, 2), 0);
    assert.equal(nextLevel(MAX_LEVEL, 0), MAX_LEVEL);
});

test('skills fade by days: practice doubles stability once per day, errors halve it', () => {
    const skill = createSkill();
    recordTaskResult(skill, { errors: 0, day: '2026-03-01' });
    recordTaskResult(skill, { errors: 0, day: '2026-03-01' });
    assert.equal(skill.stability, 4);
    assert.equal(isFaded(skill, '2026-03-01'), false);
    assert.equal(isFaded(skill, '2026-03-03'), true);
    assert.ok(retention(skill, '2026-03-02') > retention(skill, '2026-03-05'));
    recordTaskResult(skill, { errors: 2, day: '2026-03-03' });
    assert.equal(skill.stability, 2);
});

test('stored skills are normalised and unknown types are dropped', () => {
    const skills = normalizeSkills({ linear: { level: 'x', recent: [1, 'a'] }, quadratic: { level: 9 } }, TYPES);
    assert.deepEqual(Object.keys(skills), TYPES);
    assert.equal(skills.linear.level, createSkill().level);
    assert.deepEqual(skills.linear.recent, [1]);
});

test('the overall level is the plain sum of all skill levels and shows setbacks', () => {
    const skills = newSkills();
    assert.equal(overallLevel(skills), 0);
    skills.fractions.level = 100;
    assert.equal(overallLevel(skills), 100);
    skills.fractions.level = 45;
    assert.equal(overallLevel(skills), 45);

    const rewards = createRewards();
    assert.equal(recordLevel(rewards, 40, '2026-11-02'), 40);
    assert.equal(recordLevel(rewards, 35, '2026-11-02'), 35);
    assert.equal(recordLevel(rewards, 44, '2026-11-03'), 44);
    assert.deepEqual(rewards.levelHistory.map(entry => entry.level), [40, 35, 44]);
    assert.deepEqual(normalizeRewards({ levelHistory: [{ day: 'x', level: 'a' }, { day: '2026-11-03', level: 44 }] }).levelHistory, [{ day: '2026-11-03', level: 44 }]);
});

test('topic levels and curves follow the skill levels, one curve point per run', () => {
    const rewards = createRewards();
    recordTopicLevels(rewards, { fractions: 45, linear: 67 }, '2026-11-03');
    assert.deepEqual(rewards.topicLevels, { fractions: 45, linear: 67 });
    assert.deepEqual(rewards.topicHistory.linear, [{ day: '2026-11-03', level: 67 }]);
    recordTopicLevels(rewards, { fractions: 30, linear: 78 }, '2026-11-04');
    assert.deepEqual(rewards.topicLevels, { fractions: 30, linear: 78 });
    assert.deepEqual(rewards.topicHistory.fractions.map(entry => entry.level), [45, 30]);

    const stored = normalizeRewards(JSON.parse(JSON.stringify(rewards)));
    assert.deepEqual(stored.topicLevels, rewards.topicLevels);
    assert.deepEqual(normalizeRewards({ level: 30 }).topicHistory, {});
    assert.deepEqual(normalizeRewards({ topicLevels: { a: 'x', b: 40 }, topicHistory: { a: [{ day: 1 }] } }), { ...createRewards(), topicLevels: { b: 40 }, topicHistory: { a: [] } });
});

test('total and topic curves follow one rule: a point per run, and the total is the sum of the topics', () => {
    const skills = newSkills();
    const rewards = createRewards();
    const rng = createRng(5);
    const play = () => {
        const session = createSession({ date: '2026-11-09', skills });
        for (let task = 0; task < 12; task++) {
            completeTask(session, skills, nextSlot(session, skills, '2026-11-09', rng), { errors: 0 }, '2026-11-09', rng);
        }
        finishSession({ skills, rewards }, session, '2026-11-09');
    };
    play();
    assert.deepEqual(rewards.levelHistory.map(entry => entry.level), [0, overallLevel(skills)]);
    assert.ok(Object.keys(rewards.topicLevels).length > 0);
    play();
    assert.equal(rewards.levelHistory.length, 3);
    for (const type of Object.keys(rewards.topicLevels)) assert.ok(rewards.topicHistory[type].length >= 1);
    assert.equal(rewards.level, overallLevel(skills));
    assert.equal(rewards.level, Object.values(rewards.topicLevels).reduce((sum, level) => sum + level, 0));
    const longest = Math.max(...Object.values(rewards.topicHistory).map(points => points.length));
    assert.equal(longest, 3);
});

test('date helpers work across month borders', () => {
    assert.equal(addDays('2026-02-28', 1), '2026-03-01');
    assert.equal(daysBetween('2026-02-27', '2026-03-02'), 3);
});

test('completing a day marks it once and keeps no streak state', () => {
    const rewards = createRewards();
    completeDay(rewards, '2026-11-02');
    completeDay(rewards, '2026-11-02');
    completeDay(rewards, '2026-11-20');
    assert.deepEqual([rewards.lastDay, rewards.runs], ['2026-11-20', 2]);
    assert.ok(!('streak' in normalizeRewards({ streak: 5, freezes: 2, activeDays: ['2026-11-02'] })));
});

test('a run avoids three equal types', () => {
    const skills = newSkills();
    const rng = createRng(3);
    const session = createSession({ date: '2026-11-09', skills });
    for (let task = 0; task < 12; task++) {
        const slot = nextSlot(session, skills, '2026-11-09', rng);
        completeTask(session, skills, slot, { errors: session.index === 1 ? 1 : 0 }, '2026-11-09', rng);
    }
    const types = session.results.map(result => result.type);
    for (let index = 2; index < types.length; index++) {
        assert.ok(!(types[index] === types[index - 1] && types[index] === types[index - 2]));
    }
});

test('finishing a run reports level and improvement and marks the day once', () => {
    const skills = newSkills();
    const rewards = createRewards();
    const rng = createRng(11);
    const run = count => {
        const session = createSession({ date: '2026-11-09', skills });
        for (let task = 0; task < count; task++) {
            completeTask(session, skills, nextSlot(session, skills, '2026-11-09', rng), { errors: 0 }, '2026-11-09', rng);
        }
        return finishSession({ skills, rewards }, session, '2026-11-09');
    };
    const summary = run(7);
    assert.equal(summary.accuracy, 1);
    assert.equal(summary.tasks, 7);
    assert.equal(rewards.level, summary.levelAfter);
    assert.equal(summary.levelAfter - summary.levelBefore, 7);
    run(3);
    assert.equal(rewards.runs, 1);
});

test('a focused run only draws the chosen type and recommends the weakest practised one', () => {
    const skills = newSkills();
    const rng = createRng(2);
    assert.equal(recommendedTopic(skills), null);
    const session = createSession({ date: '2026-11-09', focus: 'fractions', skills });
    for (let task = 0; task < 8; task++) {
        const slot = nextSlot(session, skills, '2026-11-09', rng);
        assert.equal(slot.type, 'fractions');
        completeTask(session, skills, slot, { errors: task === 1 ? 1 : 0 }, '2026-11-09', rng);
    }
    assert.notEqual(recommendedTopic(skills, () => 0), 'fractions');
});

test('recommendation is the lowest level; ties are random', () => {
    const skills = newSkills();
    for (const [index, skill] of Object.values(skills).entries()) Object.assign(skill, { tasks: 1, lastDay: '2026-11-09', recent: [1], level: 10 + index });
    skills.squares.level = 3;
    assert.equal(recommendedTopic(skills), 'squares');
    skills.squares.level = 10;
    const tied = Object.keys(skills).filter(type => skills[type].level === 10);
    assert.equal(tied.length, 2);
    assert.deepEqual([0, 0.99].map(value => recommendedTopic(skills, () => value)), tied);
});
