export const REVIEW_INTERVALS = Object.freeze([2, 4, 7, 11, 17, 24, 32, 42]);

export const createTypeProgress = () => ({
    seen: false,
    waitingAfterError: false,
    dueAt: 0,
    otherCorrectCount: 0,
    intervalIndex: 0,
    correct: 0,
    errors: 0
});

export const chooseNextType = (types, lastType) => {
    const keys = Object.keys(types);
    const unseen = keys.filter(type => !types[type].seen);
    if (unseen.length) return randomChoice(unseen);

    const due = keys.filter(type => types[type].dueAt <= types[type].otherCorrectCount);
    let candidates;
    if (due.length) {
        const mostOverdue = Math.max(...due.map(type => types[type].otherCorrectCount - types[type].dueAt));
        candidates = due.filter(type => types[type].otherCorrectCount - types[type].dueAt === mostOverdue);
    } else {
        candidates = keys.filter(type => !types[type].waitingAfterError);
        if (!candidates.length) {
            const soonest = Math.min(...keys.map(type => types[type].dueAt - types[type].otherCorrectCount));
            candidates = keys.filter(type => types[type].dueAt - types[type].otherCorrectCount === soonest);
        }
    }
    const alternatives = candidates.filter(type => type !== lastType);
    return randomChoice(alternatives.length ? alternatives : candidates);
};

export const recordReview = (types, completedType, wasCorrect) => {
    const current = types[completedType];
    current.seen = true;
    for (const [type, progress] of Object.entries(types)) {
        if (type !== completedType && wasCorrect) progress.otherCorrectCount++;
    }

    if (wasCorrect) {
        current.waitingAfterError = false;
        current.correct++;
        const interval = REVIEW_INTERVALS[Math.min(current.intervalIndex, REVIEW_INTERVALS.length - 1)];
        current.intervalIndex = Math.min(current.intervalIndex + 1, REVIEW_INTERVALS.length - 1);
        current.dueAt = current.otherCorrectCount + interval;
    } else {
        current.waitingAfterError = true;
        current.errors++;
        current.intervalIndex = 0;
        current.dueAt = current.otherCorrectCount + 2;
    }
};

const randomChoice = items => items[Math.floor(Math.random() * items.length)];
