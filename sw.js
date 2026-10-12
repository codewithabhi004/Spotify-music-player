const CACHE_NAME = 'my-love-v4';
const APP_SHELL = [
    './',
    './index.html',
    './manifest.webmanifest',
    './library.json',
    './pic/loginpage.jpeg',
    './pic/use.jpeg',
    './pic/use1.jpeg',
    './pic/use2.jpeg',
    './pic/use3.jpeg',
    './pic/use4.jpeg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL.map(path => new URL(path, self.registration.scope))))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(names => Promise.all(
            names.filter(name => name.startsWith('my-love-') && name !== CACHE_NAME)
                .map(name => caches.delete(name))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.origin !== self.location.origin || request.headers.has('range')) return;

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        if (request.mode === 'navigate') {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.put(new URL('./index.html', self.registration.scope), response.clone());
                }
                return response;
            } catch (error) {
                const page = await cache.match(new URL('./index.html', self.registration.scope));
                if (page) return page;
                throw error;
            }
        }

        const cached = await cache.match(request);
        if (cached) return cached;

        try {
            const response = await fetch(request);
            if (response.ok && response.type === 'basic') {
                await cache.put(request, response.clone());
            }
            return response;
        } catch (error) {
            if (request.mode === 'navigate') {
                const page = await cache.match(new URL('./index.html', self.registration.scope));
                if (page) return page;
            }
            throw error;
        }
    })());
});
