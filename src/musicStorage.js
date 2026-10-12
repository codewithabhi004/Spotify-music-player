const DATABASE_NAME = 'my-love-library';
const STORE_NAME = 'songs';

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME, 1);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Could not open music storage.'));
    });
}

export async function getSavedTracks() {
    const database = await openDatabase();
    try {
        return await new Promise((resolve, reject) => {
            const request = database.transaction(STORE_NAME, 'readonly')
                .objectStore(STORE_NAME)
                .getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('Could not load saved songs.'));
        });
    } finally {
        database.close();
    }
}

export async function saveTracks(tracks) {
    const database = await openDatabase();
    try {
        return await new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            for (const track of tracks) store.put(track);
            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error || new Error('Could not save songs.'));
            transaction.onabort = () => reject(transaction.error || new Error('Music storage is full or unavailable.'));
        });
    } finally {
        database.close();
    }
}
