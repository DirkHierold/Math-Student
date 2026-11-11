import { daysBetween } from './dates.js';

export const RECALL_THRESHOLD = 0.8;
export const INITIAL_STABILITY = 2;
const MAX_STABILITY = 60;

// Probability that a skill is still remembered; stability is measured in days.
export const retention = (skill, today) => skill.lastDay === null
    ? 1
    : Math.exp(-Math.max(0, daysBetween(skill.lastDay, today)) / skill.stability);

export const isFaded = (skill, today) => skill.lastDay !== null && retention(skill, today) < RECALL_THRESHOLD;

// Success doubles the stability once per day; an error halves it.
export const nextStability = (stability, success, firstReviewToday) => {
    if (!success) return Math.max(1, stability / 2);
    return firstReviewToday ? Math.min(MAX_STABILITY, stability * 2) : stability;
};
