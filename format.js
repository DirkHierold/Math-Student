export const formatDuration = seconds => {
    const totalSeconds = Math.floor(Math.max(0, seconds));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(totalSeconds % 3600 / 60);
    const remainingSeconds = totalSeconds % 60;
    const twoDigits = value => String(value).padStart(2, '0');
    return hours
        ? `${hours}:${twoDigits(minutes)}:${twoDigits(remainingSeconds)}`
        : `${twoDigits(minutes)}:${twoDigits(remainingSeconds)}`;
};

export const formatCompactDuration = seconds => {
    const totalMinutes = Math.floor(Math.max(0, seconds) / 60);
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes ? `${hours}h${String(minutes).padStart(2, '0')}` : `${hours}h`;
};
