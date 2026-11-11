const gcd = (a, b) => {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) [a, b] = [b, a % b];
    return a || 1;
};

export const rational = (numerator, denominator = 1) => {
    if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
        throw new TypeError('Rational values must use safe integer numerators and denominators.');
    }
    if (denominator === 0) throw new RangeError('A fraction cannot have a zero denominator.');
    const sign = denominator < 0 ? -1 : 1;
    const divisor = gcd(numerator, denominator);
    return { n: sign * numerator / divisor, d: Math.abs(denominator) / divisor };
};

const add = (a, b) => rational(a.n * b.d + b.n * a.d, a.d * b.d);
const subtract = (a, b) => rational(a.n * b.d - b.n * a.d, a.d * b.d);
const multiply = (a, b) => rational(a.n * b.n, a.d * b.d);
const divide = (a, b) => {
    if (b.n === 0) throw new RangeError('Cannot divide by zero.');
    return rational(a.n * b.d, a.d * b.n);
};
const negate = value => rational(-value.n, value.d);
const absolute = value => rational(Math.abs(value.n), value.d);
const same = (a, b) => a.n === b.n && a.d === b.d;

export const formatRational = value => {
    if (value.d === 1) return String(value.n);
    const sign = value.n < 0 ? '-' : '';
    return `${sign}\\frac{${Math.abs(value.n)}}{${value.d}}`;
};

const randomInt = (minimum, maximum) => Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
const pick = items => items[randomInt(0, items.length - 1)];
export const MAX_LEVEL = 100;

// Levels 1..100: every ten levels unlock a new tier of task kinds, and within and across tiers the numbers keep growing.
const tierOf = level => Math.min(10, Math.max(1, Math.ceil(level / 10)));
const grow = (level, from, to) => Math.round(from + (to - from) * (Math.min(MAX_LEVEL, Math.max(1, level)) - 1) / (MAX_LEVEL - 1));

const profileFor = tier => ({
    max: tier <= 3 ? 4 : tier <= 6 ? 6 : 8,
    denominators: tier <= 2 ? [1] : tier <= 4 ? [1, 1, 2] : tier <= 6 ? [1, 1, 2, 3] : [1, 1, 2, 3, 4, 5]
});

const randomRational = ({ nonzero = false, profile = profileFor(tierOf(MAX_LEVEL)) } = {}) => {
    let numerator = randomInt(-profile.max, profile.max);
    if (nonzero && numerator === 0) numerator = randomInt(1, profile.max) * pick([-1, 1]);
    return rational(numerator, pick(profile.denominators));
};

const coefficientTerm = (coefficient, variable) => {
    const magnitude = absolute(coefficient);
    if (magnitude.n === 0) return '0';
    if (same(magnitude, rational(1))) return variable;
    return `${formatRational(magnitude)}${variable}`;
};

const termWithSign = (coefficient, body = 'x', first = false) => {
    if (coefficient.n === 0) return '';
    const negative = coefficient.n < 0;
    const magnitude = absolute(coefficient);
    let rendered;
    if (body === '') {
        rendered = formatRational(magnitude);
    } else if (same(magnitude, rational(1))) {
        rendered = body;
    } else {
        rendered = `${formatRational(magnitude)}${body}`;
    }
    return `${first ? (negative ? '-' : '') : (negative ? ' - ' : ' + ')}${rendered}`;
};

const joinTerms = terms => {
    const nonzero = terms.filter(term => term.coefficient.n !== 0);
    const rendered = nonzero.map((term, index) => termWithSign(term.coefficient, term.body, index === 0));
    return rendered.join('') || '0';
};

const formatAffine = (coefficient, constant) => joinTerms([
    { coefficient, body: 'x' },
    { coefficient: constant, body: '' }
]);

const shuffled = items => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = randomInt(0, i);
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
};

// Numbers a reader can handle without a calculator: integers first, halves later.
const generateLinearEquation = level => {
    const tier = tierOf(level);
    const profile = {
        max: grow(level, 5, 20),
        denominators: tier <= 6 ? [1] : tier <= 8 ? [1, 1, 2] : [1, 1, 2, 3]
    };
    let a = randomRational({ nonzero: true, profile: { ...profile, denominators: [1] } });
    if (same(absolute(a), rational(1))) a = rational(tier <= 3 ? 2 : -2);
    if (tier <= 3 && a.n < 0) a = negate(a);
    const b = randomRational({ nonzero: true, profile });
    const solution = randomRational({ profile });
    const c = add(multiply(a, solution), b);
    // One micro step per task: either move the constant or divide by the coefficient.
    const start = tier <= 2 || Math.random() < 0.5 ? 1 : 0;
    return {
        type: 'linear',
        stage: start,
        data: { a, b, c, solution, start }
    };
};

// Fixed-line tasks (terms, fractions, squares) carry their lines and distractors precomputed.
// Every task is exactly one micro step, so the whole task is a single choice.
const fixedTask = (type, kinds, lines, wrong) => ({
    type,
    stage: 0,
    data: { kinds, lines, wrong }
});

const uniqueTex = (answerTex, candidates) => {
    const result = [];
    for (const candidate of candidates) {
        if (candidate !== answerTex && !result.includes(candidate)) result.push(candidate);
    }
    return result;
};

const intTex = value => String(value);

const generateTermTask = level => {
    const tier = tierOf(level);
    const signed = tier >= 4;
    const small = () => randomInt(2, grow(level, 5, 15));
    const constant = () => randomInt(1, grow(level, 9, 30));
    const sign = () => signed ? pick([-1, 1]) : 1;
    const kinds = tier <= 2 ? ['collect'] : ['expand', 'collect'];
    const kind = pick(kinds);
    const affine = (x, c) => formatAffine(rational(x), rational(c));

    if (kind === 'collect') {
        const withConstants = tier >= 3;
        const p = small() * sign();
        const r = small() * sign();
        const q = withConstants ? constant() * sign() : 0;
        const s = withConstants ? constant() * sign() : 0;
        const question = joinTerms([
            { coefficient: rational(p), body: 'x' },
            { coefficient: rational(q), body: '' },
            { coefficient: rational(r), body: 'x' },
            { coefficient: rational(s), body: '' }
        ]);
        const answer = affine(p + r, q + s);
        return fixedTask('terms', ['collect'], [question, answer], [uniqueTex(answer, [
            affine(p - r, q + s),
            affine(p * r, q + s),
            affine(p + r, q - s),
            affine(p + r, p * r),
            withConstants ? affine(p + r + q + s, 0) : `${p + r}x^{2}`
        ])]);
    }

    const a = small() * sign();
    const b = tier <= 4 ? 1 : small() * sign();
    const c = constant() * sign();
    const bracket = `${intTex(a)}\\left(${affine(b, c)}\\right)`;
    const expanded = affine(a * b, a * c);
    const expandWrong = uniqueTex(expanded, [
        affine(a * b, c),
        affine(a * b, a + c),
        affine(a * b, -a * c),
        affine(a + b, a * c),
        affine(-a * b, a * c)
    ]);
    return fixedTask('terms', ['expand'], [bracket, expanded], [expandWrong]);
};

const gcdInt = (a, b) => (b === 0 ? Math.abs(a) : gcdInt(b, a % b));

const generateFractionTask = level => {
    const tier = tierOf(level);
    const fraction = (n, d) => formatRational(rational(n, d));
    const kinds = tier <= 2 ? ['simplify', 'add'] : tier <= 5 ? ['simplify', 'add', 'multiply', 'percent'] : ['add', 'multiply', 'divide', 'percent'];
    const kind = pick(kinds);
    const maxDenominator = grow(level, 6, 20);

    if (kind === 'simplify') {
        const base = rational(randomInt(1, 5), randomInt(2, 7));
        const factor = randomInt(2, grow(level, 4, 12));
        const question = `\\frac{${base.n * factor}}{${base.d * factor}}`;
        const answer = formatRational(base);
        if (base.d === 1) return generateFractionTask(level);
        const candidates = [
            `\\frac{${base.n * factor}}{${base.d}}`,
            `\\frac{${base.n}}{${base.d * factor}}`,
            `\\frac{${base.n + 1}}{${base.d}}`,
            `\\frac{${base.n}}{${base.d + 1}}`,
            `\\frac{${base.d}}{${base.n}}`
        ];
        return fixedTask('fractions', ['simplify'], [question, answer], [uniqueTex(answer, candidates)]);
    }

    if (kind === 'percent') {
        const percents = tier <= 3 ? [10, 50, 25, 20] : tier <= 6 ? [10, 20, 25, 5, 15, 75] : [12, 15, 35, 45, 60, 8];
        const percent = pick(percents);
        const unit = 100 / gcdInt(percent, 100);
        const amount = unit * randomInt(1, grow(level, 4, 12));
        const result = amount * percent / 100;
        const answer = intTex(result);
        return fixedTask('fractions', ['percent'], [`${percent}\\,\\%\\cdot ${amount}`, answer], [uniqueTex(answer, [
            intTex(amount - result),
            intTex(result * 10),
            intTex(Math.round(amount / percent)),
            intTex(result + percent),
            intTex(Math.max(1, result - 1)),
            intTex(result + 1)
        ])]);
    }

    let a = rational(randomInt(1, maxDenominator - 1), randomInt(2, maxDenominator));
    let b = rational(randomInt(1, maxDenominator - 1), randomInt(2, maxDenominator));
    if (kind === 'add' && tier <= 3) b = rational(randomInt(1, 9), a.d);
    if (a.d === 1 || b.d === 1) return generateFractionTask(level);

    if (kind === 'add') {
        const answer = add(a, b);
        return fixedTask('fractions', ['add'], [`\\frac{${a.n}}{${a.d}} + \\frac{${b.n}}{${b.d}}`, formatRational(answer)], [uniqueTex(formatRational(answer), [
            fraction(a.n + b.n, a.d + b.d),
            fraction(a.n + b.n, a.d * b.d),
            formatRational(multiply(a, b)),
            fraction(a.n * b.d + b.n, a.d * b.d),
            formatRational(subtract(answer, rational(1, a.d * b.d)))
        ])]);
    }
    if (kind === 'multiply') {
        const answer = multiply(a, b);
        return fixedTask('fractions', ['multiply'], [`\\frac{${a.n}}{${a.d}} \\cdot \\frac{${b.n}}{${b.d}}`, formatRational(answer)], [uniqueTex(formatRational(answer), [
            formatRational(add(a, b)),
            fraction(a.n * b.n, a.d + b.d),
            fraction(a.n + b.n, a.d * b.d),
            formatRational(divide(a, b)),
            formatRational(add(answer, rational(1, answer.d)))
        ])]);
    }
    const answer = divide(a, b);
    return fixedTask('fractions', ['divide'], [`\\frac{${a.n}}{${a.d}} \\div \\frac{${b.n}}{${b.d}}`, formatRational(answer)], [uniqueTex(formatRational(answer), [
        formatRational(multiply(a, b)),
        formatRational(divide(b, a)),
        fraction(a.n * b.n, a.d * b.n),
        formatRational(subtract(a, b)),
        formatRational(add(answer, rational(1, answer.d)))
    ])]);
};

const generateSquareTask = level => {
    const tier = tierOf(level);
    const kinds = tier <= 3 ? ['square', 'root'] : tier <= 6 ? ['square', 'root', 'binomial'] : ['square', 'root', 'binomial', 'product'];
    const kind = pick(kinds);
    const maxRoot = grow(level, 9, 35);

    if (kind === 'square') {
        const n = randomInt(tier <= 3 ? 3 : 6, maxRoot);
        const answer = intTex(n * n);
        return fixedTask('squares', ['square'], [`${n}^{2}`, answer], [uniqueTex(answer, [
            intTex(2 * n),
            intTex(n * n + n),
            intTex(n * n - n),
            intTex((n + 1) * (n + 1)),
            intTex((n - 1) * (n - 1))
        ])]);
    }
    if (kind === 'root') {
        const n = randomInt(tier <= 3 ? 3 : 6, maxRoot);
        const answer = intTex(n);
        return fixedTask('squares', ['root'], [`\\sqrt{${n * n}}`, answer], [uniqueTex(answer, [
            intTex(n + 1),
            intTex(n - 1),
            intTex(Math.floor(n * n / 2)),
            intTex(n + 2),
            intTex(n * 2)
        ])]);
    }
    const a = randomInt(2, grow(level, 7, 20));
    const affine = (x, c) => formatAffine(rational(x), rational(c));
    const quad = (middle, constant) => joinTerms([
        { coefficient: rational(1), body: 'x^{2}' },
        { coefficient: rational(middle), body: 'x' },
        { coefficient: rational(constant), body: '' }
    ]);
    if (kind === 'binomial') {
        const s = pick([-1, 1]);
        const answer = quad(2 * s * a, a * a);
        return fixedTask('squares', ['binomial'], [`\\left(${affine(1, s * a)}\\right)^{2}`, answer], [uniqueTex(answer, [
            quad(0, a * a),
            quad(s * a, a * a),
            quad(2 * s * a, -a * a),
            quad(2 * s * a, 0),
            quad(-2 * s * a, a * a)
        ])]);
    }
    const answer = quad(0, -a * a);
    return fixedTask('squares', ['product'], [`\\left(${affine(1, a)}\\right)\\left(${affine(1, -a)}\\right)`, answer], [uniqueTex(answer, [
        quad(0, a * a),
        quad(-2 * a, -a * a),
        quad(2 * a, a * a),
        quad(0, -2 * a),
        quad(a, -a * a)
    ])]);
};

const integerPower = (base, exponent) => base ** exponent;
const powerTex = (base, exponent) => `${base}^{${exponent}}`;
const rootTex = (radicand, degree) => degree === 2
    ? `\\sqrt{${radicand}}`
    : `\\sqrt[${degree}]{${radicand}}`;

const powerKindsFor = tier => tier <= 2
    ? ['product', 'root']
    : tier <= 4 ? ['product', 'quotient', 'power', 'negative', 'root']
        : tier <= 6 ? ['product', 'quotient', 'power', 'negative', 'fractional', 'root']
            : ['product', 'quotient', 'power', 'negative', 'fractional', 'negative-fractional', 'root'];

const generatePowerTask = level => {
    const tier = tierOf(level);
    const kind = pick(powerKindsFor(tier));
    const maxBase = grow(level, 5, 12);
    const maxExponent = grow(level, 3, 7);
    const minExponent = tier >= 4 ? -maxExponent : 0;
    const randomBase = () => randomInt(2, maxBase);
    const randomExponent = () => randomInt(minExponent, maxExponent);
    if (kind === 'product') {
        const base = randomBase();
        const firstExponent = randomExponent();
        const secondExponent = randomExponent();
        return {
            type: 'powers',
            stage: 0,
            data: {
                kind,
                question: `${powerTex(base, firstExponent)} \\cdot ${powerTex(base, secondExponent)}`,
                answer: powerTex(base, firstExponent + secondExponent),
                distractors: [
                    powerTex(base, firstExponent * secondExponent),
                    powerTex(base, firstExponent - secondExponent),
                    powerTex(base, firstExponent + secondExponent + 1)
                ],
                base,
                firstExponent,
                secondExponent
            }
        };
    }
    if (kind === 'quotient') {
        const base = randomBase();
        const firstExponent = randomExponent();
        let secondExponent = randomExponent();
        while (secondExponent === firstExponent) secondExponent = randomExponent();
        return {
            type: 'powers',
            stage: 0,
            data: {
                kind,
                question: `\\frac{${powerTex(base, firstExponent)}}{${powerTex(base, secondExponent)}}`,
                answer: powerTex(base, firstExponent - secondExponent),
                distractors: [
                    powerTex(base, firstExponent + secondExponent),
                    powerTex(base, secondExponent - firstExponent),
                    powerTex(base, firstExponent - secondExponent + 1)
                ],
                base,
                firstExponent,
                secondExponent
            }
        };
    }
    if (kind === 'power') {
        const base = randomBase();
        const innerExponent = randomInt(Math.max(minExponent, -4), Math.min(maxExponent, 4));
        const outerExponent = randomInt(Math.max(minExponent, -4), Math.min(maxExponent, 4));
        return {
            type: 'powers',
            stage: 0,
            data: {
                kind,
                question: `\\left(${powerTex(base, innerExponent)}\\right)^{${outerExponent}}`,
                answer: powerTex(base, innerExponent * outerExponent),
                distractors: [
                    powerTex(base, innerExponent + outerExponent),
                    powerTex(base, innerExponent * outerExponent + 1),
                    powerTex(base, innerExponent - outerExponent)
                ],
                base,
                innerExponent,
                outerExponent
            }
        };
    }
    if (kind === 'negative') {
        const base = randomBase();
        const exponent = randomInt(1, maxExponent);
        return {
            type: 'powers',
            stage: 0,
            data: {
                kind,
                question: powerTex(base, -exponent),
                answer: `\\frac{1}{${powerTex(base, exponent)}}`,
                distractors: [
                    powerTex(base, exponent),
                    `-\\frac{1}{${powerTex(base, exponent)}}`,
                    `\\frac{1}{${powerTex(base, exponent + 1)}}`
                ],
                base,
                exponent
            }
        };
    }
    if (kind === 'fractional' || kind === 'negative-fractional') {
        const degree = pick([2, 3]);
        const root = randomInt(2, 5);
        const numerator = randomInt(1, 3);
        const base = integerPower(root, degree);
        const result = integerPower(root, numerator);
        const isNegative = kind === 'negative-fractional';
        const answer = isNegative ? `\\frac{1}{${result}}` : String(result);
        return {
            type: 'powers',
            stage: 0,
            data: {
                kind,
                question: powerTex(base, `${isNegative ? '-' : ''}\\frac{${numerator}}{${degree}}`),
                answer,
                distractors: isNegative
                    ? [String(result), `-\\frac{1}{${result}}`, `\\frac{1}{${integerPower(root, numerator + 1)}}`]
                    : [String(integerPower(root, numerator + 1)), String(integerPower(root, numerator - 1)), String(result + 1)],
                base,
                root,
                numerator,
                degree,
                result
            }
        };
    }

    const degree = pick([2, 3]);
    const root = randomInt(2, grow(level, 5, 15));
    const radicand = integerPower(root, degree);
    return {
        type: 'powers',
        stage: 0,
        data: {
            kind: 'root',
            question: rootTex(radicand, degree),
            answer: String(root),
            distractors: [String(root + 1), String(root - 1), String(root + 2)],
            root,
            degree,
            radicand
        }
    };
};

const linearLine = (task, stage) => {
    const { a, b, c, solution } = task.data;
    if (stage === 0) return `${formatAffine(a, b)} = ${formatRational(c)}`;
    if (stage === 1) return `${termWithSign(a, 'x', true)} = ${formatRational(subtract(c, b))}`;
    return `x = ${formatRational(solution)}`;
};

const rules = [
    {
        type: 'linear',
        stage: 0,
        apply: task => ({ ...task, stage: 1 }),
        answer: task => linearLine(task, 1),
        distractors: task => {
            const { a, b, c } = task.data;
            return [
                `${coefficientTerm(a, 'x')} = ${formatRational(add(c, b))}`,
                `${coefficientTerm(a, 'x')} = ${formatRational(c)}`,
                `${linearLine(task, 0)} - ${formatRational(b)}`
            ];
        }
    },
    {
        type: 'linear',
        stage: 1,
        apply: task => ({ ...task, stage: 2 }),
        answer: task => linearLine(task, 2),
        distractors: task => {
            const { a, b, c, solution } = task.data;
            return [
                `x = ${formatRational(divide(subtract(c, b), multiply(a, a)))}`,
                `x = ${formatRational(divide(c, a))}`,
                `x = ${formatRational(subtract(c, b))}`,
                `x = ${formatRational(add(solution, rational(1)))}`,
                `x = ${formatRational(subtract(solution, rational(1)))}`,
                `x = ${formatRational(negate(solution))}`
            ];
        }
    },
    {
        type: 'powers',
        stage: 0,
        apply: task => ({ ...task, stage: 1 }),
        answer: task => task.data.answer,
        distractors: task => task.data.distractors
    }
];

export const TASK_TYPES = Object.freeze({
    fractions: 'Brüche & Prozent',
    terms: 'Klammern & Terme',
    powers: 'Potenzen & Wurzeln',
    linear: 'Gleichungen',
    squares: 'Quadrate & Binome'
});

export const generateTask = (type = pick(Object.keys(TASK_TYPES)), level = MAX_LEVEL) => {
    if (type === 'linear') return generateLinearEquation(level);
    if (type === 'terms') return generateTermTask(level);
    if (type === 'fractions') return generateFractionTask(level);
    if (type === 'powers') return generatePowerTask(level);
    if (type === 'squares') return generateSquareTask(level);
    throw new RangeError(`Unknown task type: ${type}`);
};

// Identifies the rule family of the current line, so the UI can explain a wrong answer.
export const explanationKey = task => {
    if (task.type === 'powers') return `powers-${task.data.kind}`;
    if (task.type === 'linear') return `linear-${task.stage}`;
    return `${task.type}-${task.data.kinds[task.stage]}`;
};

export const currentLine = task => {
    if (task.type === 'linear') return linearLine(task, task.stage);
    if (task.type === 'powers') return task.data.question;
    return task.data.lines[task.stage];
};

const ruleFor = task => {
    if (task.data.lines) {
        if (task.stage >= task.data.lines.length - 1) return null;
        return {
            apply: current => ({ ...current, stage: current.stage + 1 }),
            answer: current => current.data.lines[current.stage + 1],
            distractors: current => current.data.wrong[current.stage]
        };
    }
    if (task.type === 'linear' && task.stage > task.data.start) return null;
    return rules.find(candidate => candidate.type === task.type && candidate.stage === task.stage);
};

export const getNextStep = task => {
    const rule = ruleFor(task);
    if (!rule) return null;
    const answerTex = rule.answer(task);
    const distractorTex = rule.distractors(task);
    const values = [answerTex];
    for (const candidate of distractorTex) {
        if (candidate && !values.includes(candidate)) values.push(candidate);
        if (values.length === 4) break;
    }
    const fallbacks = [`${answerTex} + 1`, `${answerTex} - 1`, `${answerTex} + 2`];
    for (const candidate of fallbacks) {
        if (values.length >= 4) break;
        if (!values.includes(candidate)) values.push(candidate);
    }
    const choices = shuffled(values.map((tex, index) => ({
        id: index === 0 ? 'correct' : `choice-${index}`,
        tex
    })));
    return {
        answerId: 'correct',
        answerTex,
        choices
    };
};

export const applyNextStep = task => {
    const rule = ruleFor(task);
    return rule ? rule.apply(task) : task;
};

export const isTaskComplete = task => getNextStep(task) === null;
