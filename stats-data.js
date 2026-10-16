export const createDailyStats = typeNames => ({
    seconds: 0,
    steps: Object.fromEntries(typeNames.map(type => [type, { correct: 0, errors: 0 }]))
});

export const normalizeDailyStats = (daily, typeNames) => Object.fromEntries(
    Object.entries(daily).flatMap(([dateKey, stored]) => {
        if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return [];
        const stats = createDailyStats(typeNames);
        stats.seconds = Number.isFinite(stored.seconds) ? Math.max(0, stored.seconds) : 0;
        for (const type of typeNames) {
            const counts = stored.steps?.[type];
            if (!counts || typeof counts !== 'object') continue;
            for (const outcome of ['correct', 'errors']) {
                const count = counts[outcome];
                stats.steps[type][outcome] = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
            }
        }
        return [[dateKey, stats]];
    })
);

export const getRollingDateKeys = todayKey => {
    const [year, month, day] = todayKey.split('-').map(Number);
    const today = new Date(Date.UTC(year, month - 1, day));
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(today);
        date.setUTCDate(today.getUTCDate() - (6 - index));
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    });
};

export const pruneDailyStats = (daily, todayKey) => {
    const retainedDates = new Set(getRollingDateKeys(todayKey));
    for (const dateKey of Object.keys(daily)) {
        if (!retainedDates.has(dateKey)) delete daily[dateKey];
    }
};

export const getDurationColorClass = seconds => seconds >= 600 ? 'duration-high' : 'duration-low';

export const recordStepAnswer = (dailyStats, type, wasCorrect) => {
    const count = dailyStats.steps[type];
    if (!count) throw new Error(`Unbekannter Aufgabentyp für Schrittstatistik: ${type}`);
    count[wasCorrect ? 'correct' : 'errors']++;
};
