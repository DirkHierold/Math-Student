export const fittedMathScale = (availableWidth, availableHeight, mathWidth, mathHeight) => {
    if ([availableWidth, availableHeight, mathWidth, mathHeight].some(value => !Number.isFinite(value) || value <= 0)) {
        return null;
    }
    return Math.min(availableWidth / mathWidth, availableHeight / mathHeight) * 0.96;
};

export const sharedMathScale = scales => {
    if (!scales.length || scales.some(scale => !Number.isFinite(scale) || scale <= 0)) return null;
    return Math.min(...scales);
};
