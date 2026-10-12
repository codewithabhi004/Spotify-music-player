import songs from './catalog.json';

export { songs };

export function artworkUrl(file) {
    return `${import.meta.env.BASE_URL}pic/${encodeURIComponent(file)}`;
}

export function audioUrl(file) {
    return `${import.meta.env.BASE_URL}song/${encodeURIComponent(file)}`;
}
