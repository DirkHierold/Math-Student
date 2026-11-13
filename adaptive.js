import { MAX_LEVEL } from './math-engine.js';

export const START_LEVEL = 0;

// Every fifth flawless task in a row within one category earns a level bonus; the streak keeps counting.
export const STREAK_LENGTH = 5;
export const STREAK_BONUS = 5;

export const clampLevel = level => Math.min(MAX_LEVEL, Math.max(0, Math.round(level)));

// A task counts as correct only without any wrong answer.
export const outcomeScore = errors => errors === 0 ? 1 : 0;

// The task level is the skill level; level 0 still draws the easiest tasks.
export const chooseLevel = skill => Math.max(1, clampLevel(skill.level));

// Immediate staircase: +1 for a flawless task, -1 otherwise.
export const nextLevel = (level, errors) => clampLevel(level + (errors === 0 ? 1 : -1));
