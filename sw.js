const CACHE_NAME = 'mathfeed-v6.4.0';
const KATEX_FONTS = [
    'KaTeX_AMS-Regular',
    'KaTeX_Caligraphic-Bold',
    'KaTeX_Caligraphic-Regular',
    'KaTeX_Fraktur-Bold',
    'KaTeX_Fraktur-Regular',
    'KaTeX_Main-Bold',
    'KaTeX_Main-BoldItalic',
    'KaTeX_Main-Italic',
    'KaTeX_Main-Regular',
    'KaTeX_Math-BoldItalic',
    'KaTeX_Math-Italic',
    'KaTeX_SansSerif-Bold',
    'KaTeX_SansSerif-Italic',
    'KaTeX_SansSerif-Regular',
    'KaTeX_Script-Regular',
    'KaTeX_Size1-Regular',
    'KaTeX_Size2-Regular',
    'KaTeX_Size3-Regular',
    'KaTeX_Size4-Regular',
    'KaTeX_Typewriter-Regular'
].map(font => `/vendor/katex/fonts/${font}.woff2`);

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/app.js',
    '/math-engine.js',
    '/progress.js',
    '/format.js',
    '/styles.css',
    '/manifest.json',
    '/vendor/katex/katex.min.js',
    '/vendor/katex/katex.min.css',
    ...KATEX_FONTS
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)));
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(names => Promise.all(
            names.filter(name => name.startsWith('mathfeed-') && name !== CACHE_NAME)
                .map(name => caches.delete(name))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).catch(error => {
                if (event.request.mode === 'navigate') return caches.match('/index.html');
                throw error;
            });
        })
    );
});
