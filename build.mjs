import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const publicDirectory = resolve(projectRoot, '.web-public');
const sourcePhotos = resolve(projectRoot, 'pic');
const sourceSongs = resolve(projectRoot, 'song');
const catalog = JSON.parse(await readFile(resolve(projectRoot, 'src', 'catalog.json'), 'utf8'));

await rm(publicDirectory, { recursive: true, force: true });
await mkdir(resolve(publicDirectory, 'pic'), { recursive: true });
await mkdir(resolve(publicDirectory, 'song'), { recursive: true });
await cp(resolve(projectRoot, 'manifest.json'), resolve(publicDirectory, 'manifest.webmanifest'));
await cp(resolve(projectRoot, 'sw.js'), resolve(publicDirectory, 'sw.js'));

for (const file of await readdir(sourcePhotos)) {
    if (file !== 'spotify.jpg') {
        await cp(resolve(sourcePhotos, file), resolve(publicDirectory, 'pic', file));
    }
}

let songFiles = [];
try {
    songFiles = await readdir(sourceSongs);
} catch (error) {
    if (error.code !== 'ENOENT') {
        throw error;
    }
}

for (const file of songFiles) {
    if (/\.(mp3|mpeg)$/i.test(file)) {
        const outputName = file.replace(/\.mpeg$/i, '.mp3');
        await cp(resolve(sourceSongs, file), resolve(publicDirectory, 'song', outputName));
    }
}

const availableSongs = catalog.filter(song => songFiles.includes(song.sourceFile));
await writeFile(
    resolve(publicDirectory, 'library.json'),
    JSON.stringify({ playableIds: availableSongs.map(song => song.id) })
);

console.log(`Prepared ${availableSongs.length} bundled song(s) and ${(await readdir(resolve(publicDirectory, 'pic'))).length} photo(s).`);
