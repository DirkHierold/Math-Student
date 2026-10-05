import { TASK_TYPES, applyNextStep, currentLine, generateTask, getNextStep, isTaskComplete } from './math-engine.js';
import { chooseNextType, createTypeProgress, recordReview } from './progress.js';

const STORAGE_KEY = 'mathfeed-state-v1';
const TYPE_KEYS = Object.keys(TASK_TYPES);

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
        document.addEventListener('touchstart', event => {
            if (event.touches.length === 1) {
                this.touchStartX = event.touches[0].clientX;
                this.touchStartY = event.touches[0].clientY;
            }
        }, { passive: true });
        document.addEventListener('touchend', event => {
            if (this.touchStartX === undefined || event.changedTouches.length !== 1) return;
            const deltaX = event.changedTouches[0].clientX - this.touchStartX;
            const deltaY = event.changedTouches[0].clientY - this.touchStartY;
            this.touchStartX = undefined;
            this.touchStartY = undefined;
            if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY)) return;
            if (deltaX < 0) this.showStats();
            else this.showFeed();
        }, { passive: true });
        document.addEventListener('visibilitychange', () => {
            this.lastActiveTick = Date.now();
            if (document.visibilityState === 'hidden') this.saveState();
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

            const daily = this.getDailyStats();
            daily.seconds += Math.max(0, Math.min(elapsed, 3000)) / 1000;
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
        const day = this.getDailyStats();
        document.getElementById('today-count').textContent = `${day.solved} Aufgaben heute`;
        document.getElementById('type-label').textContent = TASK_TYPES[task.type];
        window.katex.render(currentLine(task), document.getElementById('task-expression'), {
            displayMode: true,
            throwOnError: true,
            trust: false
        });
        document.getElementById('task-expression').classList.toggle('multiline', task.type === 'lgs');
        this.renderChoices();
    }

    renderChoices(selectedId = null) {
        const container = document.getElementById('answer-tiles');
        container.replaceChildren();
        for (const choice of this.currentStep.choices) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'answer-tile';
            window.katex.render(choice.tex, button, {
                displayMode: true,
                throwOnError: true,
                trust: false
            });
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
            days.push({ key, date, seconds: this.getDailyStats(key).seconds });
        }
        const maximum = Math.max(1, ...days.map(item => item.seconds));
        const formatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short', timeZone: 'UTC' });
        for (const item of days) {
            const column = document.createElement('div');
            column.className = 'chart-column';
            const barTrack = document.createElement('div');
            barTrack.className = 'bar-track';
            const bar = document.createElement('div');
            bar.className = `bar${item.key === todayKey ? ' today' : ''}`;
            bar.style.height = `${Math.max(item.seconds > 0 ? 7 : 0, item.seconds / maximum * 100)}%`;
            bar.title = `${Math.floor(item.seconds / 60)} Min.`;
            const label = document.createElement('span');
            label.textContent = formatter.format(item.date).replace('.', '');
            barTrack.appendChild(bar);
            column.append(barTrack, label);
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
