import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fittedMathScale, sharedMathScale } from '../math-layout.js';

const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('UI is built from original shadcn/ui components and the existing math domain modules', async () => {
    const [config, feed, stats, state, hook, main, css] = await Promise.all([
        read('components.json'),
        read('src/components/feed-view.tsx'),
        read('src/components/stats-view.tsx'),
        read('src/lib/mathfeed-state.ts'),
        read('src/hooks/use-mathfeed.ts'),
        read('src/main.tsx'),
        read('src/index.css')
    ]);
    assert.match(config, /"\$schema": "https:\/\/ui\.shadcn\.com\/schema\.json"/);
    assert.match(config, /"baseColor": "neutral"/);
    assert.match(config, /"ui": "@\/components\/ui"/);
    for (const component of ['button', 'card']) {
        assert.match(feed, new RegExp(`from "@/components/ui/${component}"`));
        await read(`src/components/ui/${component}.tsx`);
    }
    assert.match(stats, /from "@\/components\/ui\/toggle-group"/);
    assert.match(stats, /from "\.\.\/\.\.\/stats-data\.js"/);
    assert.match(feed, /from "\.\.\/\.\.\/math-engine\.js"/);
    assert.match(state, /STORAGE_KEY = "mathfeed-state-v1"/);
    assert.match(hook, /recordStepAnswer/);
    assert.match(main, /<ThemeProvider storageKey=\{THEME_STORAGE_KEY\}>/);
    assert.match(css, /@import "tw-animate-css"/);
    assert.match(css, /\.dark \{/);
    assert.doesNotMatch(css, /\.(button|card|badge|alert|progress)\b/);
});

test('the app fills the viewport and cannot scroll or rubber-band', async () => {
    const [css, html, app, nav] = await Promise.all([
        read('src/index.css'),
        read('index.html'),
        read('src/App.tsx'),
        read('src/components/bottom-nav.tsx')
    ]);
    assert.match(css, /html,\s*body,\s*#root \{[^}]*height: 100dvh;[^}]*overflow: hidden;[^}]*overscroll-behavior: none;/);
    assert.match(css, /touch-action: manipulation/);
    assert.match(css, /@custom-variant short \(@media \(max-height: 500px\)\)/);
    assert.match(html, /viewport-fit=cover/);
    assert.match(html, /apple-mobile-web-app-capable/);
    assert.match(app, /h-dvh/);
    assert.match(app, /<BottomNav /);
    assert.match(nav, /aria-current/);
});

test('UI texts live only in i18n.ts and every message exists in German and English', async () => {
    const { dictionaries, detectLanguage, translate } = await import('../src/lib/i18n.ts');
    assert.deepEqual(Object.keys(dictionaries.de).sort(), Object.keys(dictionaries.en).sort());
    for (const lang of ['de', 'en']) {
        for (const [key, value] of Object.entries(dictionaries[lang])) assert.ok(value.trim(), `${lang}.${key}`);
    }
    assert.equal(detectLanguage(['de-AT', 'en']), 'de');
    assert.equal(detectLanguage(['de']), 'de');
    assert.equal(detectLanguage(['en-US', 'de']), 'en');
    assert.equal(detectLanguage(['fr']), 'en');
    assert.equal(detectLanguage([]), 'en');

    const files = ['App.tsx', 'components/feed-view.tsx', 'components/stats-view.tsx', 'components/bottom-nav.tsx',
        'components/task-types.tsx', 'hooks/use-mathfeed.ts', 'hooks/use-math-fit.ts', 'lib/mathfeed-state.ts'];
    for (const file of files) {
        const source = await read(`src/${file}`);
        assert.doesNotMatch(source, /["'`][^"'`\n]*[äöüÄÖÜß][^"'`\n]*["'`]/, `${file} contains hardcoded German text`);
        assert.doesNotMatch(source, />\s*[A-ZÄÖÜ][a-zäöü]{3,}[^<>{}]*</, `${file} contains hardcoded JSX text`);
    }
});

test('wrong answers keep the current step visible until the next tap', async () => {
    const hook = await read('src/hooks/use-mathfeed.ts');
    assert.match(hook, /pendingTask\.current = nextTask/);
    assert.match(hook, /window\.setTimeout\(advance, 450\)/);
    assert.doesNotMatch(hook, /pointerdown/);
    const feed = await read('src/components/feed-view.tsx');
    assert.match(feed, /onClickCapture/);
    assert.match(feed, /event\.stopPropagation\(\)/);
});

test('math fitting scales down, scales up, and respects both available dimensions', () => {
    const scale = fittedMathScale(300, 250, 2400, 180);
    assert.ok(scale * 40 < 8);
    assert.equal(scale * 2400, 288);
    assert.ok(scale * 180 < 250);
    assert.equal(fittedMathScale(300, 250, 200, 100), 1.44);
    assert.equal(fittedMathScale(300, 30, 200, 100), 0.288);
    assert.equal(fittedMathScale(200, 100, 200, 100), 0.96);
    for (const invalid of [0, -1, NaN, Infinity, undefined]) {
        for (let index = 0; index < 4; index++) {
            const sizes = [300, 250, 200, 100];
            sizes[index] = invalid;
            assert.equal(fittedMathScale(...sizes), null);
        }
    }
});

test('answer formulas share the most restrictive valid scale', () => {
    const sizes = [[200, 30], [600, 100], [300, 120], [100, 20]];
    const scale = sharedMathScale(sizes.map(([width, height]) => fittedMathScale(300, 32, width, height)));
    for (const [width, height] of sizes) {
        assert.ok(width * scale < 300);
        assert.ok(height * scale < 32);
    }
    assert.equal(sharedMathScale([2, 3, 4]), 2);
    for (const scales of [[], [1, null], [1, 0], [NaN], [Infinity], [-1]]) {
        assert.equal(sharedMathScale(scales), null);
    }
});

test('PWA build uses offline precaching and Vercel publishes the Vite dist directory', async () => {
    const [config, vercel, html] = await Promise.all([
        read('vite.config.ts'),
        read('vercel.json'),
        read('index.html')
    ]);
    assert.match(config, /VitePWA/);
    assert.match(config, /globPatterns/);
    assert.match(vercel, /"outputDirectory": "dist"/);
    assert.match(vercel, /"buildCommand": "npm run build"/);
    assert.match(html, /src="\/src\/main\.tsx"/);
});
