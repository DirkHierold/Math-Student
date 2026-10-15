export const fittedFontSize = (baseSize, availableWidth, availableHeight, mathWidth, mathHeight) => {
    if ([baseSize, availableWidth, availableHeight, mathWidth, mathHeight].some(value => !Number.isFinite(value) || value <= 0)) {
        return null;
    }
    const scale = Math.min(1, availableWidth / mathWidth, availableHeight / mathHeight);
    return baseSize * (scale < 1 ? scale * 0.96 : 1);
};
