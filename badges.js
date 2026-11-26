import { addDays } from './dates.js';
import { TASK_TYPES } from './math-engine.js';
import { overallLevel } from './skills.js';

const TYPE_KEYS = Object.keys(TASK_TYPES);

const sum = (list, value) => list.reduce((total, item) => total + value(item), 0);
const skillList = state => Object.values(state.skills);
// Each metric reads one number from the saved state; a badge is earned once that number reaches its target.
const METRICS = {
    topic: (state, _today, type) => state.skills[type].level,
    total: state => overallLevel(state.skills),
    tasks: state => sum(skillList(state), skill => skill.tasks),
    days: state => state.rewards.runs,
    minutes: state => state.rewards.totalSeconds / 60,
    // The day streak only counts while it is still alive: practised today or yesterday.
    dayStreak: (state, today) => {
        const last = state.rewards.lastDay;
        return last && (last === today || addDays(last, 1) === today) ? state.rewards.dayStreak : 0;
    },
    correctStreak: state => Math.max(state.rewards.bestStreak, ...skillList(state).map(skill => skill.streak)),
    allLevel: state => Math.min(...skillList(state).map(skill => skill.level))
};

/**
 * @typedef {keyof typeof METRICS} BadgeMetric
 * @typedef {{ id: string, group: string, metric: BadgeMetric, target: number, label: string, n: number, type?: string }} Badge
 * @typedef {{ id: string, type?: string }} BadgeGroup
 */

/**
 * @param {string} group
 * @param {BadgeMetric} metric
 * @param {number} target
 * @param {string} label
 * @param {{ type?: string, n?: number }} [extra]
 * @returns {Badge}
 */
const badge = (group, metric, target, label, extra = {}) => ({
    id: `${group}-${metric}-${target}`,
    group,
    metric,
    target,
    label,
    n: target,
    ...extra
});

// Groups in display order; `label` is the i18n key of the short badge name, `n` its number.
/** @type {BadgeGroup[]} */
export const BADGE_GROUPS = [
    ...TYPE_KEYS.map(type => ({ id: `topic-${type}`, type })),
    { id: 'total' },
    { id: 'tasks' },
    { id: 'days' },
    { id: 'hours' },
    { id: 'dayStreak' },
    { id: 'taskStreak' },
    { id: 'all' }
];

// Every group has exactly six badges, so the grid rows line up.
/** @type {Badge[]} */
export const BADGES = [
    ...TYPE_KEYS.flatMap(type => [5, 10, 25, 50, 75, 100].map(target =>
        badge(`topic-${type}`, 'topic', target, 'badgeLevel', { type }))),
    ...[25, 50, 100, 250, 400, 500].map(target => badge('total', 'total', target, 'badgeLevel')),
    ...[10, 50, 100, 500, 1000, 5000].map(target => badge('tasks', 'tasks', target, 'badgeTasks')),
    badge('days', 'days', 1, 'badgeDay'),
    ...[3, 7, 14, 30, 100].map(target => badge('days', 'days', target, 'badgeDays')),
    ...[15, 30].map(target => badge('hours', 'minutes', target, 'badgeMinutes')),
    ...[60, 120, 300, 600].map(target => badge('hours', 'minutes', target, 'badgeHours', { n: target / 60 })),
    ...[3, 5, 7, 14, 30, 60].map(target => badge('dayStreak', 'dayStreak', target, 'badgeDays')),
    ...[5, 10, 15, 25, 50, 100].map(target => badge('taskStreak', 'correctStreak', target, 'badgeCorrect')),
    ...[5, 10, 25, 50, 75, 100].map(target => badge('all', 'allLevel', target, 'badgeAllLevel'))
];

export const badgeValue = (entry, state, today) => METRICS[entry.metric](state, today, entry.type);

// Progress towards the badge, 0–1; an earned badge is always complete.
export const badgeProgress = (entry, state, today) => state.rewards.badges[entry.id]
    ? 1
    : Math.min(1, Math.max(0, badgeValue(entry, state, today) / entry.target));

// Earned stays earned: a badge is stored with the day it was reached. New badges also queue up as unseen,
// so each gets its own celebration; `silent` skips that (badges derived from old saves on load).
export const awardBadges = (state, today, { silent = false } = {}) => {
    const rewards = state.rewards;
    rewards.bestStreak = METRICS.correctStreak(state);
    const earned = [];
    for (const entry of BADGES) {
        if (rewards.badges[entry.id] || badgeValue(entry, state, today) < entry.target) continue;
        rewards.badges[entry.id] = today;
        earned.push(entry.id);
    }
    if (!silent) rewards.unseenBadges.push(...earned);
    return earned;
};

/** @param {{ unseenBadges: string[] }} rewards @param {string} id */
export const markBadgeSeen = (rewards, id) => {
    rewards.unseenBadges = rewards.unseenBadges.filter(unseen => unseen !== id);
};

export const badgeById = id => BADGES.find(entry => entry.id === id) ?? null;
