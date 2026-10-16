import { TASK_STEP_COUNTS, TASK_TYPES, applyNextStep, currentLine, generateTask, getNextStep, isTaskComplete } from './math-engine.js';
import { chooseNextType, createTypeProgress, normalizeTypeProgress, recordReview } from './progress.js';
import { formatCompactDuration, formatDuration } from './format.js';
import { fittedMathScale, sharedMathScale } from './math-layout.js';
import { createDailyStats, getDurationColorClass, getRollingDateKeys, normalizeDailyStats, pruneDailyStats, recordStepAnswer } from './stats-data.js';

const STORAGE_KEY = 'mathfeed-state-v1';
const TYPE_KEYS = Object.keys(TASK_TYPES);
const TYPE_SHORT_LABELS = Object.freeze({ linear: 'B', terms: 'T', powers: 'P', quadratic: 'Q' });
const HEADER_TYPE_LABELS = Object.freeze({
    linear: 'Bruchgleichung',
    terms: 'Terme',
    powers: 'Potenzen & Wurzeln',
    quadratic: 'Quadratik'
});

const berlinDateKey = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Berlin',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
};

const createState = () => ({
    version: 1,
    lastType: null,
    types: Object.fromEntries(TYPE_KEYS.map(type => [type, createTypeProgress()])),
    daily: {}
});

class MathFeedApp {
    constructor() {
        this.state = this.loadState();
        this.currentView = 'feed';
        this.currentTask = null;
        this.currentStep = null;
        this.taskHadError = false;
        this.answerLocked = false;
        this.lastActiveTick = Date.now();
        this.lastTimerSave = Date.now();
        this.bindEvents();
        this.observeMathContainers();
        this.renderActiveTime();
        this.saveState();
        this.startTimer();
        this.startNextTask();
    }

    loadState() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return createState();
        const state = JSON.parse(stored);
        if (state.version !== 1 || !state.types || !state.daily) {
            throw new Error('Der gespeicherte MathFeed-Fortschritt hat ein unbekanntes Format.');
        }
        state.types = normalizeTypeProgress(state.types, TYPE_KEYS);
        if (!TYPE_KEYS.includes(state.lastType)) state.lastType = null;
        delete state.totalAnswered;
        state.daily = normalizeDailyStats(state.daily, TYPE_KEYS);
        pruneDailyStats(state.daily, berlinDateKey());
        return state;
    }

    saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        } catch (error) {
            console.error('MathFeed-Fortschritt konnte nicht gespeichert werden:', error);
            const errorMessage = document.getElementById('app-error');
            errorMessage.textContent = `Fortschritt konnte nicht gespeichert werden: ${error.message}`;
            errorMessage.hidden = false;
        }
    }

    bindEvents() {
        document.getElementById('stats-open').addEventListener('click', () => this.showStats());
        document.getElementById('feed-open').addEventListener('click', () => this.showFeed());
        document.addEventListener('visibilitychange', () => {
            this.lastActiveTick = Date.now();
            if (document.visibilityState === 'hidden') this.saveState();
        });
        window.addEventListener('resize', () => this.fitRenderedMath());
        document.fonts?.addEventListener('loadingerror', () => {
            this.reportMathError(new Error('Eine benötigte Formelschrift konnte nicht geladen werden.'));
        });
        window.addEventListener('focus', () => {
            this.lastActiveTick = Date.now();
        });
        window.addEventListener('blur', () => {
            this.lastActiveTick = Date.now();
        });
        window.addEventListener('pagehide', () => this.saveState());
    }

    startTimer() {
        window.setInterval(() => {
            const now = Date.now();
            const elapsed = now - this.lastActiveTick;
            const isActive = document.visibilityState === 'visible' && document.hasFocus();
            this.lastActiveTick = now;
            if (!isActive) return;

            pruneDailyStats(this.state.daily, berlinDateKey());
            const daily = this.getDailyStats();
            daily.seconds += Math.max(0, Math.min(elapsed, 3000)) / 1000;
            this.renderActiveTime();
            if (now - this.lastTimerSave >= 10000) {
                this.lastTimerSave = now;
                this.saveState();
            }
            if (this.currentView === 'stats') this.renderStats();
        }, 1000);
    }

    getDailyStats(dateKey = berlinDateKey()) {
        return this.state.daily[dateKey] ||= createDailyStats(TYPE_KEYS);
    }

    chooseType() {
        return chooseNextType(this.state.types, this.state.lastType);
    }

    startNextTask({ showFeed = true } = {}) {
        const type = this.chooseType();
        this.currentTask = generateTask(type);
        this.currentStep = getNextStep(this.currentTask);
        this.taskHadError = false;
        this.answerLocked = false;
        if (showFeed) this.showFeed();
        this.renderTask();
    }

    renderTask() {
        const revision = this.mathRevision = (this.mathRevision ?? 0) + 1;
        this.mathFontsReady = false;
        const task = this.currentTask;
        document.getElementById('type-label').textContent = `${HEADER_TYPE_LABELS[task.type]}: ${task.stage + 1}/${TASK_STEP_COUNTS[task.type]}`;
        this.renderActiveTime();
        this.renderMath(currentLine(task), document.getElementById('task-expression'), 'task');
        this.renderChoices();
        // Trigger font discovery for all formulas before waiting for their fonts.
        document.getElementById('answer-tiles').getBoundingClientRect();
        const fitAfterFontsLoad = () => {
            if (revision !== this.mathRevision) return;
            this.mathFontsReady = true;
            this.fitRenderedMath();
        };
        if (document.fonts?.ready) {
            document.fonts.ready.then(fitAfterFontsLoad).catch(error => this.reportMathError(error));
        } else {
            fitAfterFontsLoad();
        }
    }

    renderActiveTime() {
        const seconds = this.getDailyStats().seconds;
        for (const time of [
            document.getElementById('active-day-time'),
            document.getElementById('active-day-time-stats')
        ]) {
            time.textContent = formatDuration(seconds);
            time.classList.remove('duration-high', 'duration-low');
            time.classList.add(getDurationColorClass(seconds));
            time.setAttribute('aria-label', `Aktive Tageszeit: ${time.textContent}`);
        }
    }

    renderMath(tex, container, kind) {
        container.replaceChildren();
        container.dataset.mathKind = kind;
        container.classList.add('math-fitting');
        const content = document.createElement('span');
        content.className = 'math-content';
        container.appendChild(content);
        window.katex.render(tex, content, {
            displayMode: true,
            throwOnError: true,
            trust: false
        });
    }

    measureMathElement(container) {
        const content = container.querySelector('.math-content');
        if (!content || !container.clientWidth || !container.clientHeight) return null;
        const styles = window.getComputedStyle(container);
        const availableWidth = Math.max(0, container.clientWidth
            - parseFloat(styles.paddingLeft)
            - parseFloat(styles.paddingRight));
        const availableHeight = Math.max(0, container.clientHeight
            - parseFloat(styles.paddingTop)
            - parseFloat(styles.paddingBottom));
        // Layout dimensions exclude transforms, including an active button's scale.
        const scale = fittedMathScale(availableWidth, availableHeight, content.offsetWidth, content.offsetHeight);
        return { container, content, scale };
    }

    observeMathContainers() {
        if (!('ResizeObserver' in window)) return;
        this.mathResizeObserver = new window.ResizeObserver(() => this.fitRenderedMath());
        this.mathResizeObserver.observe(document.getElementById('task-expression'));
        this.mathResizeObserver.observe(document.getElementById('answer-tiles'));
    }

    fitRenderedMath() {
        if (this.mathFitFrame) return;
        this.mathFitFrame = requestAnimationFrame(() => {
            this.mathFitFrame = null;
            if (!this.mathFontsReady || this.currentView !== 'feed') return;
            try {
                const measurements = [...document.querySelectorAll('[data-math-kind]')]
                    .map(container => this.measureMathElement(container));
                if (document.fonts?.status === 'loading') {
                    document.fonts.ready.then(() => this.fitRenderedMath())
                        .catch(error => this.reportMathError(error));
                    return;
                }
                if (measurements.some(measurement => !measurement || measurement.scale === null)) {
                    throw new Error('Der verfügbare Platz für die Formeln konnte nicht bestimmt werden.');
                }
                const answerScale = sharedMathScale(measurements
                    .filter(({ container }) => container.dataset.mathKind === 'choice')
                    .map(({ scale }) => scale));
                if (answerScale === null) {
                    throw new Error('Die gemeinsame Skalierung der Antworten konnte nicht bestimmt werden.');
                }
                for (const { container, content, scale } of measurements) {
                    const fittedScale = container.dataset.mathKind === 'choice' ? answerScale : scale;
                    content.style.setProperty('--math-scale', fittedScale);
                    container.classList.remove('math-fitting');
                }
            } catch (error) {
                this.reportMathError(error);
            }
        });
    }

    reportMathError(error) {
        console.error('MathFeed-Formeln konnten nicht angepasst werden:', error);
        const message = document.getElementById('app-error');
        message.textContent = `Formeln konnten nicht angepasst werden: ${error.message}`;
        message.hidden = false;
    }

    renderChoices() {
        const container = document.getElementById('answer-tiles');
        container.replaceChildren();
        for (const choice of this.currentStep.choices) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'answer-tile';
            button.dataset.choiceId = choice.id;
            this.renderMath(choice.tex, button, 'choice');
            button.disabled = this.answerLocked;
            button.addEventListener('click', () => this.chooseAnswer(choice.id));
            container.appendChild(button);
        }
    }

    chooseAnswer(choiceId) {
        if (this.answerLocked) return;
        this.answerLocked = true;
        const correct = choiceId === this.currentStep.answerId;
        recordStepAnswer(this.getDailyStats(), this.currentTask.type, correct);
        if (!correct) this.taskHadError = true;

        for (const button of document.getElementById('answer-tiles').children) {
            const selected = button.dataset.choiceId === choiceId;
            const isCorrect = button.dataset.choiceId === this.currentStep.answerId;
            button.disabled = true;
            button.classList.toggle('is-correct', isCorrect);
            button.classList.toggle('is-wrong', selected && !correct);
        }
        const app = document.getElementById('app');
        if (correct) {
            app.classList.remove('error-flash');
            app.classList.add('success-flash');
            window.setTimeout(() => app.classList.remove('success-flash'), 350);
        } else {
            app.classList.remove('success-flash');
            app.classList.add('error-flash');
            window.setTimeout(() => app.classList.remove('error-flash'), 400);
            if (navigator.vibrate) navigator.vibrate(80);
        }

        this.currentTask = applyNextStep(this.currentTask);
        const taskComplete = isTaskComplete(this.currentTask);
        if (taskComplete) {
            this.recordTaskResult();
        } else {
            this.currentStep = getNextStep(this.currentTask);
        }

        window.setTimeout(() => {
            if (taskComplete) {
                this.startNextTask({ showFeed: this.currentView !== 'stats' });
            } else {
                this.answerLocked = false;
                this.renderTask();
            }
        }, 450);
    }

    recordTaskResult() {
        this.state.lastType = this.currentTask.type;

        if (this.taskHadError) {
            recordReview(this.state.types, this.currentTask.type, false);
        } else {
            recordReview(this.state.types, this.currentTask.type, true);
        }
        this.saveState();
    }

    showStats() {
        this.currentView = 'stats';
        document.getElementById('feed-view').hidden = true;
        document.getElementById('stats-view').hidden = false;
        this.renderStats();
    }

    showFeed() {
        this.currentView = 'feed';
        document.getElementById('stats-view').hidden = true;
        document.getElementById('feed-view').hidden = false;
        this.fitRenderedMath();
    }

    renderStats() {
        const today = this.getDailyStats();
        const totalSteps = TYPE_KEYS.reduce((total, type) => {
            const counts = today.steps[type];
            return total + counts.correct + counts.errors;
        }, 0);
        document.getElementById('stats-total').textContent = `${totalSteps} Antworten`;
        this.renderWeekChart();
        this.renderDayChart(today);
    }

    renderWeekChart() {
        const chart = document.getElementById('week-chart');
        chart.replaceChildren();
        const todayKey = berlinDateKey();
        const days = getRollingDateKeys(todayKey).map(key => {
            const [year, month, day] = key.split('-').map(Number);
            const stats = this.getDailyStats(key);
            return { key, date: new Date(Date.UTC(year, month - 1, day)), ...stats };
        });
        const maximum = Math.max(1, ...days.flatMap(item =>
            TYPE_KEYS.map(type => item.steps[type].correct + item.steps[type].errors)
        ));
        const formatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short', timeZone: 'UTC' });
        for (const item of days) {
            const column = document.createElement('section');
            column.className = `chart-day${item.key === todayKey ? ' today' : ''}`;
            column.setAttribute('role', 'group');
            column.setAttribute('aria-label', formatter.format(item.date));
            const duration = document.createElement('span');
            duration.className = `day-duration ${getDurationColorClass(item.seconds)}`;
            duration.textContent = formatCompactDuration(item.seconds);

            const groups = document.createElement('div');
            groups.className = 'day-type-groups';
            this.renderStepGroups(groups, item.steps, maximum);

            const label = document.createElement('span');
            label.className = 'chart-day-label';
            label.textContent = formatter.format(item.date).replace('.', '');
            column.append(duration, groups, label);
            chart.appendChild(column);
        }
    }

    renderDayChart(stats) {
        const chart = document.getElementById('day-chart');
        chart.replaceChildren();
        const maximum = Math.max(1, ...TYPE_KEYS.map(type =>
            stats.steps[type].correct + stats.steps[type].errors
        ));
        this.renderStepGroups(chart, stats.steps, maximum, true);
    }

    renderStepGroups(container, steps, maximum, detailed = false) {
        for (const type of TYPE_KEYS) {
            const counts = steps[type];
            const total = counts.correct + counts.errors;
            const group = document.createElement('div');
            group.className = `type-bar-group${detailed ? ' detailed' : ''}`;
            const totalLabel = document.createElement('span');
            totalLabel.className = 'type-total';
            totalLabel.textContent = String(total);
            const bar = document.createElement('div');
            bar.className = 'step-bar';
            bar.title = `${TASK_TYPES[type]}: ${counts.correct} richtig · ${counts.errors} falsch`;
            bar.setAttribute('role', 'img');
            bar.setAttribute('aria-label', bar.title);
            const errors = document.createElement('span');
            errors.className = 'step-segment segment-errors';
            errors.style.height = `${counts.errors / maximum * 100}%`;
            const correct = document.createElement('span');
            correct.className = 'step-segment segment-correct';
            correct.style.height = `${counts.correct / maximum * 100}%`;
            bar.append(errors, correct);
            const typeLabel = document.createElement('span');
            typeLabel.className = detailed ? 'type-full-label' : 'type-short-label';
            typeLabel.textContent = detailed ? TASK_TYPES[type] : TYPE_SHORT_LABELS[type];
            typeLabel.title = TASK_TYPES[type];
            group.append(totalLabel, bar, typeLabel);
            container.appendChild(group);
        }
    }
}

try {
    new MathFeedApp();
} catch (error) {
    console.error('MathFeed konnte nicht gestartet werden:', error);
    const fatal = document.getElementById('fatal-error');
    fatal.hidden = false;
    fatal.textContent = `MathFeed konnte nicht gestartet werden. ${error.message}`;
}
