import { TASK_STEP_COUNTS, TASK_TYPES, applyNextStep, currentLine, generateTask, getNextStep, isTaskComplete } from './math-engine.js';
import { chooseNextType, createTypeProgress, recordReview } from './progress.js';
import { formatCompactDuration, formatDuration } from './format.js';

const STORAGE_KEY = 'mathfeed-state-v1';
const TYPE_KEYS = Object.keys(TASK_TYPES);
const HEADER_TYPE_LABELS = Object.freeze({
    linear: 'Bruchgleichung',
    terms: 'Terme',
    lgs: 'LGS',
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

const createDailyStats = () => ({
    seconds: 0,
    solved: 0,
    correct: 0,
    errors: 0,
    byType: Object.fromEntries(TYPE_KEYS.map(type => [type, { correct: 0, errors: 0 }]))
});

const createState = () => ({
    version: 1,
    totalAnswered: 0,
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
        for (const type of TYPE_KEYS) {
            state.types[type] = { ...createTypeProgress(), ...state.types[type] };
        }
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
        window.addEventListener('resize', () => this.fitMathToWidth());
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
        if (!this.state.daily[dateKey]) this.state.daily[dateKey] = createDailyStats();
        const day = this.state.daily[dateKey];
        day.byType ||= Object.fromEntries(TYPE_KEYS.map(type => [type, { correct: 0, errors: 0 }]));
        for (const type of TYPE_KEYS) day.byType[type] ||= { correct: 0, errors: 0 };
        return day;
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
        const task = this.currentTask;
        document.getElementById('type-label').textContent = HEADER_TYPE_LABELS[task.type];
        document.getElementById('task-step').textContent = `Schritt ${task.stage + 1}/${TASK_STEP_COUNTS[task.type]}`;
        this.renderActiveTime();
        this.renderMath(currentLine(task), document.getElementById('task-expression'), 'task');
        document.getElementById('task-expression').classList.toggle('multiline', task.type === 'lgs');
        this.renderChoices();
    }

    renderActiveTime() {
        const time = document.getElementById('active-day-time');
        time.textContent = formatDuration(this.getDailyStats().seconds);
        time.setAttribute('aria-label', `Aktive Tageszeit: ${time.textContent}`);
    }

    renderMath(tex, container, kind) {
        container.replaceChildren();
        container.dataset.mathKind = kind;
        window.katex.render(tex, container, {
            displayMode: true,
            throwOnError: true,
            trust: false
        });
        requestAnimationFrame(() => this.fitMathElement(container));
        document.fonts?.ready.then(() => this.fitMathElement(container));
    }

    fitMathElement(container) {
        const math = container.querySelector('.katex');
        if (!math || !container.clientWidth) return;

        const initialSize = container.dataset.mathKind === 'task' ? 40 : 21;
        const minimumSize = container.dataset.mathKind === 'task' ? 17 : 13;
        const styles = window.getComputedStyle(container);
        const availableWidth = container.clientWidth
            - parseFloat(styles.paddingLeft)
            - parseFloat(styles.paddingRight);
        container.style.fontSize = `${initialSize}px`;
        let size = initialSize;
        while (size > minimumSize && math.getBoundingClientRect().width > availableWidth) {
            size = Math.max(minimumSize, size * 0.9);
            container.style.fontSize = `${size}px`;
        }
    }

    fitMathToWidth() {
        document.querySelectorAll('[data-math-kind]').forEach(container => this.fitMathElement(container));
    }

    renderChoices(selectedId = null) {
        const container = document.getElementById('answer-tiles');
        container.replaceChildren();
        for (const choice of this.currentStep.choices) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'answer-tile';
            this.renderMath(choice.tex, button, 'choice');
            button.disabled = this.answerLocked;
            button.addEventListener('click', () => this.chooseAnswer(choice.id));
            if (selectedId !== null && choice.id === selectedId) {
                button.classList.add(choice.id === this.currentStep.answerId ? 'is-correct' : 'is-wrong');
            }
            if (selectedId !== null && choice.id === this.currentStep.answerId) button.classList.add('is-correct');
            container.appendChild(button);
        }
    }

    chooseAnswer(choiceId) {
        if (this.answerLocked) return;
        this.answerLocked = true;
        const correct = choiceId === this.currentStep.answerId;
        if (!correct) this.taskHadError = true;

        this.renderChoices(choiceId);
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
        const today = this.getDailyStats();
        const typeStats = today.byType[this.currentTask.type];
        this.state.totalAnswered++;
        this.state.lastType = this.currentTask.type;
        today.solved++;

        if (this.taskHadError) {
            recordReview(this.state.types, this.currentTask.type, false);
            today.errors++;
            typeStats.errors++;
        } else {
            recordReview(this.state.types, this.currentTask.type, true);
            today.correct++;
            typeStats.correct++;
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
    }

    renderStats() {
        const today = this.getDailyStats();
        document.getElementById('stats-total').textContent = `${today.solved} gelöst`;
        this.renderWeekChart();

        const matrix = document.getElementById('type-matrix');
        matrix.replaceChildren();
        for (const type of TYPE_KEYS) {
            const counts = today.byType[type];
            const total = counts.correct + counts.errors;
            const card = document.createElement('article');
            card.className = 'type-card';
            const label = document.createElement('div');
            label.className = 'type-card-title';
            label.textContent = TASK_TYPES[type];
            const ratio = document.createElement('div');
            ratio.className = 'type-ratio';
            const correct = document.createElement('span');
            correct.className = 'ratio-correct';
            correct.style.width = `${total ? counts.correct / total * 100 : 0}%`;
            const errors = document.createElement('span');
            errors.className = 'ratio-errors';
            errors.style.width = `${total ? counts.errors / total * 100 : 0}%`;
            ratio.append(correct, errors);
            const detail = document.createElement('p');
            detail.textContent = `${counts.correct} richtig · ${counts.errors} falsch`;
            card.append(label, ratio, detail);
            matrix.appendChild(card);
        }
    }

    renderWeekChart() {
        const chart = document.getElementById('week-chart');
        chart.replaceChildren();
        const todayKey = berlinDateKey();
        const [year, month, day] = todayKey.split('-').map(Number);
        const today = new Date(Date.UTC(year, month - 1, day));
        const days = [];
        for (let offset = 6; offset >= 0; offset--) {
            const date = new Date(today);
            date.setUTCDate(today.getUTCDate() - offset);
            const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
            const stats = this.getDailyStats(key);
            days.push({ key, date, seconds: stats.seconds, solved: stats.solved });
        }
        const maximum = Math.max(1, ...days.map(item => item.seconds));
        const formatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short', timeZone: 'UTC' });
        for (const item of days) {
            const column = document.createElement('div');
            column.className = 'chart-column';
            const metrics = document.createElement('div');
            metrics.className = 'day-metrics';
            metrics.title = `${item.solved} Aufgaben · ${formatDuration(item.seconds)}`;
            const count = document.createElement('span');
            count.className = 'day-count';
            count.textContent = String(item.solved);
            const duration = document.createElement('span');
            duration.className = 'day-duration';
            duration.textContent = formatCompactDuration(item.seconds);
            metrics.append(count, duration);
            const barTrack = document.createElement('div');
            barTrack.className = 'bar-track';
            const bar = document.createElement('div');
            bar.className = `bar${item.key === todayKey ? ' today' : ''}`;
            bar.style.height = `${Math.max(item.seconds > 0 ? 7 : 0, item.seconds / maximum * 100)}%`;
            bar.title = formatDuration(item.seconds);
            const label = document.createElement('span');
            label.textContent = formatter.format(item.date).replace('.', '');
            barTrack.appendChild(bar);
            column.append(metrics, barTrack, label);
            chart.appendChild(column);
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
