const LEVEL_HISTORY = 90;

export const createRewards = () => ({
    lastDay: null,
    runs: 0,
    level: 0,
    levelHistory: [],
    topicLevels: {},
    topicHistory: {}
});

const count = (value, fallback = 0) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;

const isPoint = entry => entry && typeof entry.day === 'string' && Number.isFinite(entry.level);
const toPoints = list => Array.isArray(list)
    ? list.filter(isPoint).map(entry => ({ day: entry.day, level: count(entry.level) })).slice(-LEVEL_HISTORY)
    : [];
const plainObject = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export const normalizeRewards = stored => {
    const base = createRewards();
    if (!stored || typeof stored !== 'object') return base;
    const topicHistory = Object.fromEntries(
        Object.entries(plainObject(stored.topicHistory)).map(([type, list]) => [type, toPoints(list)])
    );
    const topicLevels = Object.fromEntries(
        Object.entries(plainObject(stored.topicLevels))
            .filter(([, level]) => Number.isFinite(level))
            .map(([type, level]) => [type, count(level)])
    );
    return {
        lastDay: typeof stored.lastDay === 'string' ? stored.lastDay : null,
        runs: count(stored.runs),
        level: count(stored.level),
        levelHistory: toPoints(stored.levelHistory),
        topicLevels,
        topicHistory
    };
};

// The shown level is the real level, so progress (and setbacks) are visible right away.
export const recordLevel = (rewards, estimate, today) => {
    rewards.level = estimate;
    rewards.levelHistory = [...rewards.levelHistory, { day: today, level: rewards.level }].slice(-LEVEL_HISTORY);
    return rewards.level;
};

// The first run starts the curves at the levels before it, so that its change is visible right away.
export const recordBaseline = (rewards, levels, today) => {
    if (!rewards.levelHistory.length) {
        const total = Object.values(levels).reduce((sum, level) => sum + level, 0);
        rewards.levelHistory = [{ day: today, level: total }];
    }
    for (const [type, level] of Object.entries(levels)) {
        if (!(rewards.topicHistory[type] ?? []).length) rewards.topicHistory[type] = [{ day: today, level }];
    }
};

// Topic levels follow the same rule. Every topic gets one curve point per run, so all curves stay aligned with the total.
export const recordTopicLevels = (rewards, estimates, today) => {
    for (const [type, estimate] of Object.entries(estimates)) {
        rewards.topicLevels[type] = estimate;
        const points = rewards.topicHistory[type] ?? [];
        rewards.topicHistory[type] = [...points, { day: today, level: rewards.topicLevels[type] }].slice(-LEVEL_HISTORY);
    }
};

// A finished main run marks the day as done; there is no streak or goal, gaps cost nothing.
export const completeDay = (rewards, today) => {
    if (rewards.lastDay === today) return;
    rewards.lastDay = today;
    rewards.runs++;
};
