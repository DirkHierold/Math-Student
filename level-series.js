import { addDays, daysBetween } from './dates.js';

export const CHART_DAYS = 30;

const SAME_DAY_SPREAD = 0.8;

// Every run of the total history becomes one point on a calendar axis (index 0 = first day shown, days - 1 = today).
// The window starts at the first run (at most `max` days back) so that the curves always span the full width.
// Topics are aligned to the same runs: a topic keeps its last level in runs where it was not practised and
// shares its first level backwards, so every topic runs from left to right like the total.
export const buildChart = (history, topicHistories, today, max = CHART_DAYS) => {
    const known = history.filter(entry => entry.day <= today);
    const earliest = known.length ? known[0].day : today;
    const limit = addDays(today, -(max - 1));
    const start = earliest > limit ? earliest : limit;
    const days = daysBetween(start, today) + 1;

    const perDay = new Map();
    const runs = known
        .filter(entry => entry.day >= start)
        .map(entry => {
            const index = perDay.get(entry.day) ?? 0;
            perDay.set(entry.day, index + 1);
            return { ...entry, sameDayIndex: index };
        });

    const place = run => {
        const count = perDay.get(run.day);
        const offset = count === 1 ? 0 : (run.sameDayIndex / (count - 1) - 0.5) * SAME_DAY_SPREAD;
        return daysBetween(start, run.day) + offset;
    };

    const total = runs.map(run => ({ x: place(run), level: run.level, day: run.day }));

    const topics = Object.fromEntries(Object.entries(topicHistories).map(([type, list]) => {
        if (!list.length) return [type, []];
        const points = runs.map(run => {
            const same = list.filter(entry => entry.day === run.day);
            const before = list.filter(entry => entry.day < run.day);
            const pick = same.length
                ? same[Math.min(run.sameDayIndex, same.length - 1)]
                : before.length ? before[before.length - 1] : list[0];
            return { x: place(run), level: pick.level, day: run.day };
        });
        return [type, points];
    }));

    return { days, start, total, topics };
};

// Gain of a curve over the chart window; null until the curve has two points.
export const levelChange = points => {
    if (points.length < 2) return null;
    return { delta: points[points.length - 1].level - points[0].level, since: points[0].day };
};

// All series share one level axis so that they can be compared directly.
export const levelRange = seriesList => {
    const levels = seriesList.flatMap(points => points.map(point => point.level));
    if (!levels.length) return { floor: 0, span: 100 };
    const low = Math.min(...levels);
    const high = Math.max(...levels);
    const pad = Math.max(2, Math.round((high - low) * 0.15));
    const floor = Math.max(0, low - pad);
    return { floor, span: Math.max(10, Math.min(100, high + pad) - floor) };
};
