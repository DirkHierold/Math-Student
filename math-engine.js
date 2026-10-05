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
const randomRational = ({ nonzero = false } = {}) => {
    let numerator = randomInt(-8, 8);
    if (nonzero && numerator === 0) numerator = pick([-8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8]);
    return rational(numerator, pick([1, 1, 2, 3, 4, 5]));
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

const formatShift = value => {
    if (value.n === 0) return 'x';
    return `x ${value.n < 0 ? '- ' : '+ '}${formatRational(absolute(value))}`;
};

const shuffled = items => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = randomInt(0, i);
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
};

const generateLinearEquation = () => {
    let a = randomRational({ nonzero: true });
    if (same(absolute(a), rational(1))) a = rational(2);
    const b = randomRational({ nonzero: true });
    const solution = randomRational();
    const c = add(multiply(a, solution), b);
    return {
        type: 'linear',
        stage: 0,
        data: { a, b, c, solution }
    };
};

const positiveRational = () => absolute(randomRational({ nonzero: true }));

const termParameters = () => {
    const rawD = randomRational({ nonzero: true });
    const d = same(absolute(rawD), rational(1)) ? rational(rawD.n < 0 ? -2 : 2) : rawD;
    return {
        a: positiveRational(),
        b: positiveRational(),
        c: positiveRational(),
        d,
        e: positiveRational(),
        f: randomRational({ nonzero: true })
    };
};

const termLine = (task, stage) => {
    const { a, b, c, d, e, f } = task.data;
    const ab = multiply(a, b);
    const ac = multiply(a, c);
    const de = multiply(d, e);
    const xCoefficient = add(add(ab, d), f);
    const constant = add(ac, de);
    const firstBracket = formatAffine(b, c);
    const secondBracket = formatAffine(rational(1), e);

    if (stage === 0) {
        return `${formatRational(a)}\\left(${firstBracket}\\right)${termWithSign(d, `\\left(${secondBracket}\\right)`)}${termWithSign(f, 'x')}`;
    }
    if (stage === 1) {
        return joinTerms([
            { coefficient: ab, body: 'x' },
            { coefficient: ac, body: '' },
            { coefficient: d, body: `\\left(${secondBracket}\\right)` },
            { coefficient: f, body: 'x' }
        ]);
    }
    if (stage === 2) {
        return joinTerms([
            { coefficient: ab, body: 'x' },
            { coefficient: ac, body: '' },
            { coefficient: d, body: 'x' },
            { coefficient: de, body: '' },
            { coefficient: f, body: 'x' }
        ]);
    }
    if (stage === 3) {
        return joinTerms([
            { coefficient: xCoefficient, body: 'x' },
            { coefficient: ac, body: '' },
            { coefficient: de, body: '' }
        ]);
    }
    return formatAffine(xCoefficient, constant);
};

const generateTerm = () => ({ type: 'terms', stage: 0, data: termParameters() });

const generateQuadratic = () => {
    const firstRoot = randomRational({ nonzero: true });
    let offset = pick([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    let secondRoot = add(firstRoot, rational(offset));
    while (secondRoot.n === 0 || add(firstRoot, secondRoot).n === 0) {
        offset++;
        secondRoot = add(firstRoot, rational(offset));
    }
    const p = negate(add(firstRoot, secondRoot));
    const q = multiply(firstRoot, secondRoot);
    const halfP = divide(p, rational(2));
    const halfPSquare = multiply(halfP, halfP);
    const discriminant = subtract(halfPSquare, q);
    const squareRoot = absolute(divide(subtract(firstRoot, secondRoot), rational(2)));
    return {
        type: 'quadratic',
        stage: 0,
        data: { firstRoot, secondRoot, p, q, halfP, halfPSquare, discriminant, squareRoot }
    };
};

const quadraticExpression = (p, q) => joinTerms([
    { coefficient: rational(1), body: 'x^2' },
    { coefficient: p, body: 'x' },
    { coefficient: q, body: '' }
]);

const quadraticLine = (task, stage) => {
    const { p, q, halfP, halfPSquare, discriminant, squareRoot, firstRoot, secondRoot } = task.data;
    if (stage === 0) return `${quadraticExpression(p, q)} = 0`;
    if (stage === 1) return `${quadraticExpression(p, rational(0))} = ${formatRational(negate(q))}`;
    if (stage === 2) return `${quadraticExpression(p, halfPSquare)} = ${formatRational(add(negate(q), halfPSquare))}`;
    if (stage === 3) return `\\left(${formatShift(halfP)}\\right)^2 = ${formatRational(discriminant)}`;
    if (stage === 4) return `${formatShift(halfP)} = \\pm\\sqrt{${formatRational(discriminant)}}`;
    if (stage === 5) return `x = ${formatRational(negate(halfP))} \\pm ${formatRational(squareRoot)}`;
    return `x = ${formatRational(firstRoot)}\\quad\\text{oder}\\quad x = ${formatRational(secondRoot)}`;
};

const lgsEquation = (x, y, result) =>
    `${formatAffine(x, rational(0))} ${y.n < 0 ? '- ' : '+ '}${coefficientTerm(absolute(y), 'y')} = ${formatRational(result)}`;

const generateLgs = () => {
    const x1 = rational(randomInt(1, 5));
    const y1 = rational(pick([-5, -4, -3, -2, 2, 3, 4, 5]));
    const x2 = rational(randomInt(1, 5));
    const y2 = rational(pick([-5, -4, -3, -2, 2, 3, 4, 5]));
    const solutionX = rational(randomInt(-5, 5));
    const solutionY = rational(randomInt(-5, 5));
    const result1 = add(multiply(x1, solutionX), multiply(y1, solutionY));
    const result2 = add(multiply(x2, solutionX), multiply(y2, solutionY));
    const factor = divide(negate(y2), y1);
    return { type: 'lgs', stage: 0, data: { x1, y1, result1, x2, y2, result2, factor } };
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
        type: 'terms',
        stage: 0,
        apply: task => ({ ...task, stage: 1 }),
        answer: task => termLine(task, 1),
        distractors: task => {
            const { a, b, c, d, e, f } = task.data;
            return [
                joinTerms([
                    { coefficient: multiply(a, b), body: 'x' },
                    { coefficient: add(a, c), body: '' },
                    { coefficient: d, body: `\\left(${formatAffine(rational(1), e)}\\right)` },
                    { coefficient: f, body: 'x' }
                ]),
                joinTerms([
                    { coefficient: multiply(a, b), body: 'x' },
                    { coefficient: multiply(a, c), body: '' },
                    { coefficient: d, body: 'x' },
                    { coefficient: e, body: '' },
                    { coefficient: f, body: 'x' }
                ])
            ];
        }
    },
    {
        type: 'terms',
        stage: 1,
        apply: task => ({ ...task, stage: 2 }),
        answer: task => termLine(task, 2),
        distractors: task => {
            const { a, b, c, d, e, f } = task.data;
            return [
                joinTerms([
                    { coefficient: multiply(a, b), body: 'x' },
                    { coefficient: multiply(a, c), body: '' },
                    { coefficient: d, body: 'x' },
                    { coefficient: e, body: '' },
                    { coefficient: f, body: 'x' }
                ]),
                joinTerms([
                    { coefficient: multiply(a, b), body: 'x' },
                    { coefficient: multiply(a, c), body: '' },
                    { coefficient: d, body: 'x' },
                    { coefficient: multiply(d, e), body: '' }
                ])
            ];
        }
    },
    {
        type: 'terms',
        stage: 2,
        apply: task => ({ ...task, stage: 3 }),
        answer: task => termLine(task, 3),
        distractors: task => {
            const { a, b, c, d, e, f } = task.data;
            const wrongX = subtract(add(multiply(a, b), f), d);
            return [
                joinTerms([
                    { coefficient: wrongX, body: 'x' },
                    { coefficient: multiply(a, c), body: '' },
                    { coefficient: multiply(d, e), body: '' }
                ]),
                joinTerms([
                    { coefficient: add(add(multiply(a, b), d), f), body: 'x' },
                    { coefficient: multiply(a, c), body: '' },
                    { coefficient: multiply(d, e), body: '' },
                    { coefficient: rational(1), body: '' }
                ])
            ];
        }
    },
    {
        type: 'terms',
        stage: 3,
        apply: task => ({ ...task, stage: 4 }),
        answer: task => termLine(task, 4),
        distractors: task => {
            const { a, b, c, d, e, f } = task.data;
            const xCoefficient = add(add(multiply(a, b), d), f);
            const constant = subtract(multiply(a, c), multiply(d, e));
            return [
                formatAffine(xCoefficient, constant),
                formatAffine(negate(xCoefficient), add(multiply(a, c), multiply(d, e)))
            ];
        }
    },
    {
        type: 'quadratic',
        stage: 0,
        apply: task => ({ ...task, stage: 1 }),
        answer: task => quadraticLine(task, 1),
        distractors: task => [
            `${quadraticExpression(task.data.p, task.data.q)} = ${formatRational(task.data.q)}`,
            `${quadraticExpression(task.data.p, task.data.q)} = 1`
        ]
    },
    {
        type: 'quadratic',
        stage: 1,
        apply: task => ({ ...task, stage: 2 }),
        answer: task => quadraticLine(task, 2),
        distractors: task => {
            const { p, halfPSquare, q } = task.data;
            return [
                `${quadraticExpression(p, rational(0))} + ${formatRational(halfPSquare)} = ${formatRational(negate(q))}`,
                `${quadraticExpression(p, halfPSquare)} = ${formatRational(add(negate(q), negate(halfPSquare)))}`,
                `${quadraticExpression(p, multiply(halfPSquare, rational(2)))} = ${formatRational(add(negate(q), halfPSquare))}`
            ];
        }
    },
    {
        type: 'quadratic',
        stage: 2,
        apply: task => ({ ...task, stage: 3 }),
        answer: task => quadraticLine(task, 3),
        distractors: task => [
            `\\left(${formatShift(task.data.halfP)}\\right)^2 = ${formatRational(add(task.data.discriminant, task.data.q))}`,
            `\\left(${formatShift(negate(task.data.halfP))}\\right)^2 = ${formatRational(task.data.discriminant)}`,
            `\\left(${formatShift(task.data.halfP)}\\right)^2 = ${formatRational(task.data.halfPSquare)}`
        ]
    },
    {
        type: 'quadratic',
        stage: 3,
        apply: task => ({ ...task, stage: 4 }),
        answer: task => quadraticLine(task, 4),
        distractors: task => [
            `${formatShift(task.data.halfP)} = \\sqrt{${formatRational(task.data.discriminant)}}`,
            `${formatShift(task.data.halfP)} = \\pm ${formatRational(task.data.discriminant)}`
        ]
    },
    {
        type: 'quadratic',
        stage: 4,
        apply: task => ({ ...task, stage: 5 }),
        answer: task => quadraticLine(task, 5),
        distractors: task => [
            `x = ${formatRational(task.data.halfP)} \\pm ${formatRational(task.data.squareRoot)}`,
            `x = ${formatRational(negate(task.data.halfP))} + ${formatRational(task.data.squareRoot)}`
        ]
    },
    {
        type: 'quadratic',
        stage: 5,
        apply: task => ({ ...task, stage: 6 }),
        answer: task => quadraticLine(task, 6),
        distractors: task => [
            `x = ${formatRational(task.data.firstRoot)}\\quad\\text{und}\\quad x = ${formatRational(task.data.firstRoot)}`,
            `x = ${formatRational(negate(task.data.firstRoot))}\\quad\\text{oder}\\quad x = ${formatRational(negate(task.data.secondRoot))}`
        ]
    },
    {
        type: 'lgs',
        stage: 0,
        apply: task => ({ ...task, stage: 1 }),
        answer: task => formatRational(task.data.factor),
        distractors: task => [
            formatRational(negate(task.data.factor)),
            formatRational(divide(rational(1), task.data.factor)),
            '1',
            formatRational(add(task.data.factor, rational(1))),
            formatRational(subtract(task.data.factor, rational(1))),
            formatRational(multiply(task.data.factor, rational(2))),
            formatRational(divide(task.data.factor, rational(2)))
        ]
    }
];

export const TASK_TYPES = Object.freeze({
    linear: 'Bruchgleichung',
    terms: 'Klammern & Terme',
    lgs: 'Gleichungssystem',
    quadratic: 'Quadratische Gleichung'
});

export const generateTask = (type = pick(Object.keys(TASK_TYPES))) => {
    if (type === 'linear') return generateLinearEquation();
    if (type === 'terms') return generateTerm();
    if (type === 'lgs') return generateLgs();
    if (type === 'quadratic') return generateQuadratic();
    throw new RangeError(`Unknown task type: ${type}`);
};

export const currentLine = task => {
    if (task.type === 'linear') return linearLine(task, task.stage);
    if (task.type === 'terms') return termLine(task, task.stage);
    if (task.type === 'quadratic') return quadraticLine(task, task.stage);
    const { x1, y1, result1, x2, y2, result2 } = task.data;
    return `\\begin{aligned}${lgsEquation(x1, y1, result1)}\\\\${lgsEquation(x2, y2, result2)}\\end{aligned}`;
};

export const getNextStep = task => {
    const rule = rules.find(candidate => candidate.type === task.type && candidate.stage === task.stage);
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
    const rule = rules.find(candidate => candidate.type === task.type && candidate.stage === task.stage);
    return rule ? rule.apply(task) : task;
};

export const isTaskComplete = task => getNextStep(task) === null;
