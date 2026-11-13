import { STREAK_LENGTH, chooseLevel } from './adaptive.js';
import { completeDay, recordBaseline, recordLevel, recordTopicLevels } from './rewards.js';
import { retention } from './retention.js';
import { overallLevel, recordTaskResult, topicLevel } from './skills.js';

// A soft milestone every few tasks; the run itself never ends on its own.
export const MILESTONE = 10;

// focus: one task type for targeted practice, or null for the mixed run.
/** @param {{ date: string, focus?: string | null, skills: Record<string, any> }} args */
export const createSession = ({ date, focus = null, skills }) => ({
    date,
    focus,
    index: 0,
    recentTypes: [],
    results: [],
    levelBefore: Object.fromEntries(Object.entries(skills).map(([type, skill]) => [type, skill.level]))
});

// Due skills first, then just-failed ones; unseen skills get a small bonus.
const typePriority = (skill, today, rng) => {
    const last = skill.recent.at(-1);
    return (1 - retention(skill, today))
        + (last !== undefined && last < 0.7 ? 0.3 : 0)
        + (skill.tasks === 0 ? 0.5 : 0)
        + rng() * 0.15;
};

// Suggests the practised topic with the lowest level (ties at random); null until something was practised.
export const recommendedTopic = (skills, rng = Math.random) => {
    const entries = Object.entries(skills);
    if (!entries.some(([, skill]) => skill.tasks > 0)) return null;
    const lowest = Math.min(...entries.map(([, skill]) => skill.level));
    const tied = entries.filter(([, skill]) => skill.level === lowest);
    return tied[Math.floor(rng() * tied.length)][0];
};

export const nextSlot = (session, skills, today, rng = Math.random) => {
    const types = session.focus ? [session.focus] : Object.keys(skills);
    const tail = session.recentTypes.slice(-2);
    const repeated = tail.length === 2 && tail[0] === tail[1] ? tail[0] : null;
    const candidates = types.length > 1 ? types.filter(type => type !== repeated) : types;
    const [type] = candidates
        .map(candidate => [candidate, typePriority(skills[candidate], today, rng)])
        .sort((left, right) => right[1] - left[1])[0];
    return { type, level: chooseLevel(skills[type]) };
};

// Applies a finished task to skills and the session.
export const completeTask = (session, skills, slot, { errors }, today) => {
    recordTaskResult(skills[slot.type], { errors, day: today });
    const streak = skills[slot.type].streak;
    const bonus = errors === 0 && streak > 0 && streak % STREAK_LENGTH === 0;
    session.results.push({ type: slot.type, level: slot.level, errors });
    session.recentTypes.push(slot.type);
    session.index++;
    return { streak, bonus };
};

const IMPROVEMENT = 1;

// Closes the run: day mark, shown level and the summary data for the end screen.
export const finishSession = ({ skills, rewards }, session, today) => {
    const levelBefore = Object.values(session.levelBefore).reduce((sum, level) => sum + level, 0);
    completeDay(rewards, today);
    recordBaseline(rewards, session.levelBefore, today);
    const levels = Object.fromEntries(Object.entries(skills).map(([type, skill]) => [type, topicLevel(skill)]));
    recordTopicLevels(rewards, levels, today);
    const levelAfter = recordLevel(rewards, overallLevel(skills), today);
    const clean = session.results.filter(result => result.errors === 0).length;
    const improved = Object.entries(skills)
        .map(([type, skill]) => ({ type, gain: skill.level - (session.levelBefore[type] ?? skill.level) }))
        .filter(entry => entry.gain >= IMPROVEMENT)
        .sort((left, right) => right.gain - left.gain)
        .map(entry => entry.type);
    return {
        focus: session.focus,
        tasks: session.results.length,
        levelBefore,
        levelAfter,
        accuracy: session.results.length ? clean / session.results.length : 0,
        improved
    };
};
