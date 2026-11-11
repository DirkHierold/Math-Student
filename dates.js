const toUtc = key => {
    const [year, month, day] = key.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
};

const pad = value => String(value).padStart(2, '0');

export const daysBetween = (from, to) => Math.round((toUtc(to) - toUtc(from)) / 86_400_000);

export const addDays = (key, days) => {
    const date = new Date(toUtc(key) + days * 86_400_000);
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};
