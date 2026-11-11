import { START_LEVEL, STREAK_BONUS, STREAK_LENGTH, clampLevel, nextLevel, outcomeScore } from './adaptive.js';
import { MAX_LEVEL } from './math-engine.js';
import { INITIAL_STABILITY, nextStability } from './retention.js';

const RECENT_LIMIT = 8;

export const createSkill = () => ({
    level: START_LEVEL,
    tasks: 0,
    days: 0,
    lastDay: null,
    streak: 0,
    stability: INITIAL_STABILITY,
    recent: []
});

const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;

export const normalizeSkills = (stored, typeNames) => Object.fromEntries(
    typeNames.map(type => {
        const base = createSkill();
        const skill = stored?.[type] && typeof stored[type] === 'object' ? stored[type] : {};
        return [type, {
            level: clampLevel(finite(skill.level, base.level)),
            tasks: Math.max(0, Math.floor(finite(skill.tasks, 0))),
            days: Math.max(0, Math.floor(finite(skill.days, 0))),
            lastDay: typeof skill.lastDay === 'string' ? skill.lastDay : null,
            streak: Math.min(STREAK_LENGTH - 1, Math.max(0, Math.floor(finite(skill.streak, 0)))),
            stability: Math.max(1, finite(skill.stability, base.stability)),
            recent: Array.isArray(skill.recent) ? skill.recent.filter(Number.isFinite).slice(-RECENT_LIMIT) : []
        }];
    })
);

// Level 100 (MAX_LEVEL) is the hardest task level.
export const topicLevel = skill => Math.min(MAX_LEVEL, skill.level);

// A topic counts as soon as it has been practised; the headline level is the mean of exactly these topics.
export const isPractised = skill => skill.tasks > 0;

// One number for the student: the sum of all skill levels, so every +1/-1 is directly visible.
export const overallLevel = skills => Object.values(skills).reduce((sum, skill) => sum + skill.level, 0);

export const recordTaskResult = (skill, { errors, day }) => {
    const score = outcomeScore(errors);
    const firstReviewToday = skill.lastDay !== day;
    skill.level = nextLevel(skill.level, errors);
    skill.streak = errors === 0 ? skill.streak + 1 : 0;
    if (skill.streak >= STREAK_LENGTH) {
        skill.level = clampLevel(skill.level + STREAK_BONUS);
        skill.streak = 0;
    }
    skill.stability = nextStability(skill.stability, score >= 0.7, firstReviewToday);
    if (firstReviewToday) skill.days++;
    skill.lastDay = day;
    skill.tasks++;
    skill.recent = [...skill.recent, score].slice(-RECENT_LIMIT);
    return score;
};
