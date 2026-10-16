import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { fittedMathScale, sharedMathScale } from '../math-layout.js';

const source = (await readFile(new URL('../app.js', import.meta.url), 'utf8'))
    .replace(/^import .*\n/gm, '');
const classSource = source.slice(0, source.lastIndexOf('\ntry {'));

const createHarness = () => {
    const frames = [];
    const events = [];
    const fonts = { status: 'loaded', ready: Promise.resolve() };
    const containers = ['task', 'choice', 'choice', 'choice', 'choice'].map((kind, index) => ({
        dataset: { mathKind: kind },
        classList: { remove: name => events.push(['show', index, name]) },
        content: { style: { setProperty: (name, value) => events.push(['scale', index, value]) } }
    }));
    const context = {
        TASK_TYPES: {},
        TASK_STEP_COUNTS: { linear: 2 },
        currentLine: () => 'x = 1',
        fittedMathScale,
        sharedMathScale,
        document: {
            fonts,
            querySelectorAll: () => containers,
            getElementById: () => ({
                getBoundingClientRect() {},
                textContent: ''
            })
        },
        requestAnimationFrame: callback => { frames.push(callback); return frames.length; }
    };
    const App = vm.runInNewContext(`${classSource}\nMathFeedApp`, context);
    const app = Object.create(App.prototype);
    app.currentView = 'feed';
    app.mathFontsReady = true;
    app.measureMathElement = container => {
        const index = containers.indexOf(container);
        events.push(['measure', index]);
        return { container, content: container.content, scale: index === 0 ? 2 : index / 2 };
    };
    app.reportMathError = error => events.push(['error', error.message]);
    const flush = () => {
        const frame = frames.shift();
        assert.ok(frame, 'an animation frame must be scheduled');
        frame();
    };
    return { app, frames, events, fonts, containers, flush };
};

test('fitting coalesces resize requests, reads before writing, and applies a shared answer scale', () => {
    const { app, frames, events, flush } = createHarness();
    for (let i = 0; i < 10; i++) app.fitRenderedMath();
    assert.equal(frames.length, 1);
    flush();
    assert.deepEqual(events.slice(0, 5), [0, 1, 2, 3, 4].map(index => ['measure', index]));
    assert.deepEqual(events.filter(([kind]) => kind === 'scale'), [
        ['scale', 0, 2], ['scale', 1, 0.5], ['scale', 2, 0.5],
        ['scale', 3, 0.5], ['scale', 4, 0.5]
    ]);
    assert.equal(events.filter(([kind]) => kind === 'show').length, 5);
    app.fitRenderedMath();
    assert.equal(frames.length, 1, 'a later resize can schedule another frame');
});

test('hidden views and pending initial fonts do not measure or expose formulas', () => {
    for (const state of [{ currentView: 'stats' }, { mathFontsReady: false }]) {
        const { app, events, flush } = createHarness();
        Object.assign(app, state);
        app.fitRenderedMath();
        flush();
        assert.deepEqual(events, []);
    }
});

test('unmeasurable visible formulas report an error without exposing an unscaled step', () => {
    for (const invalid of [null, { scale: null }]) {
        const { app, events, flush } = createHarness();
        app.measureMathElement = () => invalid;
        app.fitRenderedMath();
        flush();
        assert.equal(events.length, 1);
        assert.equal(events[0][0], 'error');
    }
});

test('fonts discovered during measurement defer all writes until loaded', async () => {
    const { app, events, fonts, flush, frames } = createHarness();
    let finishLoading;
    fonts.status = 'loading';
    fonts.ready = new Promise(resolve => { finishLoading = resolve; });
    app.fitRenderedMath();
    flush();
    assert.ok(events.every(([kind]) => kind === 'measure'));
    fonts.status = 'loaded';
    finishLoading();
    await Promise.resolve();
    assert.equal(frames.length, 1);
    flush();
    assert.equal(events.filter(([kind]) => kind === 'show').length, 5);
});

test('font callbacks from replaced steps cannot release the new step prematurely', async () => {
    const { app, fonts, frames, flush, events } = createHarness();
    let firstReady;
    let secondReady;
    app.currentTask = { type: 'linear', stage: 0 };
    app.renderActiveTime = () => {};
    app.renderMath = () => {};
    app.renderChoices = () => {};
    fonts.ready = new Promise(resolve => { firstReady = resolve; });
    app.renderTask();
    fonts.ready = new Promise(resolve => { secondReady = resolve; });
    app.renderTask();
    firstReady();
    await Promise.resolve();
    assert.equal(app.mathFontsReady, false);
    assert.equal(frames.length, 0);
    secondReady();
    await Promise.resolve();
    assert.equal(app.mathFontsReady, true);
    assert.equal(frames.length, 1);
    flush();
    assert.equal(events.filter(([kind]) => kind === 'show').length, 5);
});

test('natural layout measurements do not depend on the last transform or change the font', () => {
    const { app } = createHarness();
    const content = { offsetWidth: 1000, offsetHeight: 100 };
    const container = {
        clientWidth: 320,
        clientHeight: 60,
        querySelector: () => content
    };
    // Use the real method with explicit computed padding, rather than a DOM size tied to transforms.
    const App = vm.runInNewContext(`${classSource}\nMathFeedApp`, {
        TASK_TYPES: {},
        fittedMathScale,
        window: { getComputedStyle: () => ({
            paddingLeft: '10px', paddingRight: '10px', paddingTop: '12px', paddingBottom: '12px'
        }) }
    });
    const first = App.prototype.measureMathElement.call(app, container);
    content.transform = 'scale(0.001)';
    const second = App.prototype.measureMathElement.call(app, container);
    assert.equal(first.scale, 0.288);
    assert.equal(second.scale, first.scale);
});
