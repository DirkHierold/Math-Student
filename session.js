import { chooseLevel } from './adaptive.js';
import { completeDay, recordBaseline, recordLevel, recordTopicLevels } from './rewards.js';
import { retention } from './retention.js';
import { overallLevel, recordTaskResult, topicLevel } from './skills.js';

export const RUN_LENGTH = 12;
export const BONUS_LENGTH = 6;

export const createSession = ({ date, kind, skills }) => ({
    date,
    kind,
    length: kind === 'main' ? RUN_LENGTH : BONUS_LENGTH,
    index: 0,
    rematches: [],
    recentTypes: [],
    results: [],
    levelBefore: Object.fromEntries(Object.entries(skills).map(([type, skill]) => [type, skill.level]))
});

export const isSessionDone = session => session.index >= session.length;

// Due skills first, then just-failed ones; unseen skills get a small bonus.
const typePriority = (skill, today, rng) => {
    const last = skill.recent.at(-1);
    return (1 - retention(skill, today))
        + (last !== undefined && last < 0.7 ? 0.3 : 0)
        + (skill.tasks === 0 ? 0.5 : 0)
        + rng() * 0.15;
};

export const nextSlot = (session, skills, today, rng = Math.random) => {
    const dueIndex = session.rematches.findIndex(entry => entry.dueAt <= session.index);
    if (dueIndex >= 0) {
        const [entry] = session.rematches.splice(dueIndex, 1);
        return { type: entry.type, level: chooseLevel(skills[entry.type]), rematch: true };
    }

    const types = Object.keys(skills);
    const tail = session.recentTypes.slice(-2);
    const repeated = tail.length === 2 && tail[0] === tail[1] ? tail[0] : null;
    const candidates = types.filter(type => type !== repeated);
    const [type] = candidates
        .map(candidate => [candidate, typePriority(skills[candidate], today, rng)])
        .sort((left, right) => right[1] - left[1])[0];
    return { type, level: chooseLevel(skills[type]), rematch: false };
};

// Applies a finished task to skills and the session; a wrong first attempt brings the skill back a few tasks later.
export const completeTask = (session, skills, slot, { errors }, today, rng = Math.random) => {
    recordTaskResult(skills[slot.type], { errors, day: today });
    const streak = skills[slot.type].streak;
    const bonus = errors === 0 && streak === 0;
    if (errors > 0 && !slot.rematch) {
        const dueAt = session.index + 2 + Math.floor(rng() * 3);
        if (dueAt < session.length) session.rematches.push({ type: slot.type, dueAt });
    }
    session.results.push({ type: slot.type, level: slot.level, errors, rematch: slot.rematch });
    session.recentTypes.push(slot.type);
    session.index++;
    return { streak, bonus };
};

const IMPROVEMENT = 1;

// Closes the run: day mark, shown level and the summary data for the end screen.
export const finishSession = ({ skills, rewards }, session, today) => {
    const levelBefore = Object.values(session.levelBefore).reduce((sum, level) => sum + level, 0);
    if (session.kind === 'main') completeDay(rewards, today);
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
        kind: session.kind,
        levelBefore,
        levelAfter,
        accuracy: session.results.length ? clean / session.results.length : 0,
        improved,
        repeatedCorrect: session.results.filter(result => result.rematch && result.errors === 0).length
    };
};
