import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowLeft,
    AudioLines,
    Heart,
    ListMusic,
    Maximize2,
    Music2,
    Pause,
    Play,
    Repeat,
    Repeat1,
    Search,
    Shuffle,
    SkipBack,
    SkipForward,
    Smartphone,
    Upload,
    Volume2,
    VolumeX,
    X
} from 'lucide-react';
import { artworkUrl, audioUrl, songs } from './songs.js';
import { getSavedTracks, saveTracks } from './musicStorage.js';

function loadFavourites() {
    try {
        return new Set(JSON.parse(localStorage.getItem('my-love-favourites') || '[]'));
    } catch (error) {
        console.error('Could not load saved favourites:', error);
        return new Set();
    }
}

function formatTime(time) {
    if (!Number.isFinite(time) || time < 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
}

function IconButton({ label, active = false, className = '', children, onClick }) {
    return (
        <button
            className={`icon-button${active ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
            type="button"
            aria-label={label}
            title={label}
            onClick={onClick}
        >
            {children}
        </button>
    );
}

function Cover({ song, className = '', onClick, showPlay = false, playing = false }) {
    return (
        <button
            className={`cover-card ${className}`}
            type="button"
            aria-label={`${playing ? 'Pause' : 'Play'} ${song.title}`}
            onClick={onClick}
        >
            <img src={artworkUrl(song.artwork)} alt={`${song.title} cover`} loading="lazy" />
            {showPlay && (
                <span className="cover-play">
                    {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
                </span>
            )}
        </button>
    );
}

export default function App() {
    const audioRef = useRef(null);
    const fileInputRef = useRef(null);
    const localTrackUrlsRef = useRef([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.8);
    const [shuffle, setShuffle] = useState(false);
    const [repeat, setRepeat] = useState('all');
    const [favourites, setFavourites] = useState(loadFavourites);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [message, setMessage] = useState('');
    const [availableSongIds, setAvailableSongIds] = useState(() => new Set());
    const [view, setView] = useState(() => window.location.hash.startsWith('#/now-playing/') ? 'player' : 'library');
    const [localTracks, setLocalTracks] = useState([]);

    const library = useMemo(
        () => [...songs.filter(song => availableSongIds.has(song.id)), ...localTracks],
        [availableSongIds, localTracks]
    );
    const currentSong = currentIndex >= 0 ? library[currentIndex] : null;
    const visibleSongs = useMemo(() => {
        const query = search.trim().toLowerCase();
        return library
            .map((song, index) => ({ song, index }))
            .filter(({ song }) => filter !== 'favourites' || favourites.has(song.id))
            .filter(({ song }) => !query || `${song.title} ${song.artist}`.toLowerCase().includes(query));
    }, [favourites, filter, library, search]);

    const showLibrary = useCallback((updateHistory = true) => {
        setView('library');
        if (updateHistory && window.location.hash) {
            window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
        }
    }, []);

    const showPlayer = useCallback((index, updateHistory = true) => {
        if (index < 0 || index >= library.length) return;
        setCurrentIndex(index);
        setView('player');
        const route = `#/now-playing/${encodeURIComponent(library[index].id)}`;
        if (updateHistory) {
            window.history.pushState({}, '', route);
        } else if (window.location.hash !== route) {
            window.history.replaceState({}, '', route);
        }
    }, [library]);

    const startSong = useCallback(async (index, updateHistory = true) => {
        if (index < 0 || index >= library.length) return;
        showPlayer(index, updateHistory);
        setMessage('');
        const audio = audioRef.current;
        if (!audio) return;

        audio.src = library[index].src || audioUrl(library[index].file);
        audio.load();
        try {
            await audio.play();
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error(`Could not play ${library[index].title}:`, error);
                setMessage(`Couldn't play "${library[index].title}". Add a compatible audio file to the library and try again.`);
            }
        }
    }, [library, showPlayer]);

    const skipTo = useCallback((direction) => {
        if (!library.length) return;
        let nextIndex = currentIndex < 0 ? 0 : currentIndex;
        if (shuffle && library.length > 1) {
            do {
                nextIndex = Math.floor(Math.random() * library.length);
            } while (nextIndex === currentIndex);
        } else {
            nextIndex = (nextIndex + direction + library.length) % library.length;
        }
        startSong(nextIndex, view !== 'player');
    }, [currentIndex, library.length, shuffle, startSong, view]);

    const toggleFavourite = useCallback((song) => {
        const updated = new Set(favourites);
        if (updated.has(song.id)) updated.delete(song.id);
        else updated.add(song.id);
        setFavourites(updated);
        try {
            localStorage.setItem('my-love-favourites', JSON.stringify([...updated]));
        } catch (error) {
            console.error('Could not save favourites:', error);
            setMessage('Favourites could not be saved on this device.');
        }
    }, [favourites]);

    const handleFiles = async (event) => {
        const files = [...event.target.files];
        const audioFiles = files.filter(file =>
            file.type.startsWith('audio/') || /\.(mp3|mpeg|m4a|wav|ogg|aac|flac)$/i.test(file.name)
        );

        if (!audioFiles.length) {
            setMessage('Choose audio files such as MP3, M4A, WAV, OGG or FLAC.');
            event.target.value = '';
            return;
        }

        const records = audioFiles.map((file, index) => ({
            id: `local-${crypto.randomUUID()}`,
            title: file.name.replace(/\.[^.]+$/, ''),
            artist: 'On this device',
            file: '',
            artwork: songs[(localTracks.length + index) % songs.length].artwork,
            blob: file
        }));

        try {
            await saveTracks(records);
        } catch (error) {
            console.error('Could not save selected audio files:', error);
            setMessage('These songs could not be saved on this device. Check available storage and try again.');
            event.target.value = '';
            return;
        }

        const tracks = records.map(({ blob, ...track }) => ({
            ...track,
            src: URL.createObjectURL(blob)
        }));
        localTrackUrlsRef.current.push(...tracks.map(track => track.src));
        setLocalTracks(previous => [...previous, ...tracks]);
        setSearch('');
        setFilter('all');
        setMessage(`${tracks.length} song${tracks.length === 1 ? '' : 's'} saved on this device. Add another 10 or more any time.`);
        event.target.value = '';
    };

    useEffect(() => {
        let cancelled = false;
        getSavedTracks()
            .then(records => {
                if (cancelled) return;
                const tracks = records.map(({ blob, ...track }) => ({
                    ...track,
                    src: URL.createObjectURL(blob)
                }));
                localTrackUrlsRef.current.push(...tracks.map(track => track.src));
                setLocalTracks(tracks);
            })
            .catch(error => {
                console.error('Could not restore songs saved on this device:', error);
                if (!cancelled) setMessage('Saved songs could not be restored from this device.');
            });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        fetch(`${import.meta.env.BASE_URL}library.json`)
            .then(response => {
                if (!response.ok) throw new Error(`Library request failed (${response.status})`);
                return response.json();
            })
            .then(data => {
                if (!cancelled) setAvailableSongIds(new Set(data.playableIds));
            })
            .catch(error => {
                console.error('Could not load the bundled music catalogue:', error);
                if (!cancelled) setMessage('Your personal music files can be added from this device.');
            });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const syncRoute = () => {
            const match = window.location.hash.match(/^#\/now-playing\/(.+)$/);
            if (!match) {
                setView('library');
                return;
            }
            const target = library.findIndex(song => song.id === decodeURIComponent(match[1]));
            if (target >= 0) {
                setCurrentIndex(target);
                setView('player');
            } else {
                setView('library');
            }
        };
        syncRoute();
        window.addEventListener('popstate', syncRoute);
        window.addEventListener('hashchange', syncRoute);
        return () => {
            window.removeEventListener('popstate', syncRoute);
            window.removeEventListener('hashchange', syncRoute);
        };
    }, [library]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return undefined;
        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);
        const onError = () => {
            if (audio.src) setMessage('This track is not available in this version. Add your own audio files to play music.');
        };
        const onEnded = () => {
            if (repeat === 'one') {
                audio.currentTime = 0;
                audio.play().catch(error => {
                    console.error('Could not repeat the current song:', error);
                    setMessage('Playback could not be restarted.');
                });
            } else if (repeat === 'all' || shuffle || currentIndex < library.length - 1) {
                skipTo(1);
            } else {
                setPlaying(false);
            }
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('durationchange', updateDuration);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('error', onError);
        audio.addEventListener('ended', onEnded);
        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('durationchange', updateDuration);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('error', onError);
            audio.removeEventListener('ended', onEnded);
        };
    }, [currentIndex, library.length, repeat, shuffle, skipTo]);

    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume;
    }, [volume]);

    useEffect(() => {
        if (!currentSong || !('mediaSession' in navigator) || !('MediaMetadata' in window)) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentSong.title,
            artist: currentSong.artist,
            album: 'My Love',
            artwork: [{ src: artworkUrl(currentSong.artwork), sizes: '512x512', type: 'image/jpeg' }]
        });
    }, [currentSong]);

    useEffect(() => () => {
        audioRef.current?.pause();
        for (const url of localTrackUrlsRef.current) URL.revokeObjectURL(url);
    }, []);

    const onSeek = (event) => {
        const time = Number(event.target.value);
        if (audioRef.current) audioRef.current.currentTime = time;
        setCurrentTime(time);
    };

    const togglePlayback = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (currentIndex < 0) {
            startSong(0);
        } else if (audio.paused) {
            audio.play().catch(error => {
                console.error('Could not resume playback:', error);
                setMessage('Playback could not be resumed. Select a song to try again.');
            });
        } else {
            audio.pause();
        }
    };

    return (
        <div className="app-shell">
            <audio ref={audioRef} preload="metadata" />
            <header className="topbar">
                <a className="brand" href="#/" onClick={(event) => { event.preventDefault(); showLibrary(); }}>
                    <span className="brand-mark"><Heart fill="currentColor" size={18} /></span>
                    <span>my love<span className="brand-period">.</span></span>
                </a>
                <label className="search-box">
                    <Search size={19} />
                    <input
                        type="search"
                        placeholder="Find a song..."
                        value={search}
                        onChange={event => { setSearch(event.target.value); setFilter('all'); }}
                        aria-label="Search songs"
                    />
                    {search && <IconButton label="Clear search" onClick={() => setSearch('')}><X size={16} /></IconButton>}
                </label>
                <div className="topbar-actions">
                    <span className="library-count"><AudioLines size={17} /> {library.length} songs</span>
                    <button className="add-music-button" type="button" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={17} /><span>Add music</span>
                    </button>
                    <a className="android-link" href="https://github.com/codewithabhi004/Spotify-music-player/releases/latest/download/My-Love.apk">
                        <Smartphone size={17} /><span>Get app</span>
                    </a>
                    <input
                        ref={fileInputRef}
                        className="visually-hidden"
                        type="file"
                        accept="audio/*,.mp3,.mpeg,.m4a,.wav,.ogg,.aac,.flac"
                        multiple
                        onChange={handleFiles}
                    />
                </div>
            </header>

            <main className="main-content">
                {view === 'player' && currentSong ? (
                    <section className="now-playing-page" aria-label="Now playing">
                        <div className="player-toolbar">
                            <button className="back-button" type="button" onClick={() => showLibrary()}>
                                <ArrowLeft size={19} /> <span>Your library</span>
                            </button>
                            <span className="playing-indicator"><AudioLines size={16} /> NOW PLAYING</span>
                            <IconButton label="Close player" onClick={() => showLibrary()}><X size={20} /></IconButton>
                        </div>

                        <div className="player-layout">
                            <div className="now-art-wrap">
                                <Cover song={currentSong} className="now-art" playing={playing} onClick={togglePlayback} />
                            </div>
                            <div className="player-details">
                                <p className="section-eyebrow">YOUR PERSONAL SOUNDTRACK</p>
                                <h1>{currentSong.title}</h1>
                                <p className="player-artist">{currentSong.artist}</p>

                                <div className="timeline">
                                    <input
                                        type="range"
                                        min="0"
                                        max={duration || 0}
                                        step="0.1"
                                        value={Math.min(currentTime, duration || 0)}
                                        onChange={onSeek}
                                        aria-label="Seek through song"
                                        style={{ '--progress': `${duration ? (currentTime / duration) * 100 : 0}%` }}
                                    />
                                    <div className="time-labels"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
                                </div>

                                <div className="main-controls">
                                    <IconButton label="Shuffle" active={shuffle} onClick={() => setShuffle(value => !value)}><Shuffle size={21} /></IconButton>
                                    <IconButton label="Previous song" className="skip-button" onClick={() => skipTo(-1)}><SkipBack size={26} fill="currentColor" /></IconButton>
                                    <button className="big-play-button" type="button" aria-label={playing ? 'Pause song' : 'Play song'} onClick={togglePlayback}>
                                        {playing ? <Pause size={27} fill="currentColor" /> : <Play size={27} fill="currentColor" />}
                                    </button>
                                    <IconButton label="Next song" className="skip-button" onClick={() => skipTo(1)}><SkipForward size={26} fill="currentColor" /></IconButton>
                                    <IconButton label={`Repeat ${repeat}`} active={repeat !== 'off'} onClick={() => setRepeat(value => value === 'off' ? 'all' : value === 'all' ? 'one' : 'off')}>
                                        {repeat === 'one' ? <Repeat1 size={21} /> : <Repeat size={21} />}
                                    </IconButton>
                                </div>

                                <div className="player-extras">
                                    <IconButton label={favourites.has(currentSong.id) ? 'Remove from favourites' : 'Add to favourites'} active={favourites.has(currentSong.id)} onClick={() => toggleFavourite(currentSong)}>
                                        <Heart size={20} fill={favourites.has(currentSong.id) ? 'currentColor' : 'none'} />
                                    </IconButton>
                                    <label className="volume-control">
                                        <button className="plain-icon" type="button" aria-label={volume ? 'Mute' : 'Unmute'} onClick={() => setVolume(value => value ? 0 : 0.8)}>
                                            {volume ? <Volume2 size={19} /> : <VolumeX size={19} />}
                                        </button>
                                        <input type="range" min="0" max="1" step="0.01" value={volume} onChange={event => setVolume(Number(event.target.value))} aria-label="Volume" />
                                    </label>
                                </div>
                                {message && <p className="status-message" role="status">{message}</p>}
                            </div>
                        </div>

                        <div className="up-next">
                            <div className="up-next-heading">
                                <div><p className="section-eyebrow">KEEP THE MUSIC GOING</p><h2>Up next</h2></div>
                                <span>{library.length} tracks</span>
                            </div>
                            <div className="queue-list">
                                {library.map((song, index) => (
                                    <button className={`queue-row${index === currentIndex ? ' is-current' : ''}`} type="button" key={song.id} onClick={() => startSong(index, false)}>
                                        <span className="queue-index">{index === currentIndex && playing ? <AudioLines size={16} /> : String(index + 1).padStart(2, '0')}</span>
                                        <img src={artworkUrl(song.artwork)} alt="" loading="lazy" />
                                        <span className="queue-track-copy"><strong>{song.title}</strong><small>{song.artist}</small></span>
                                        {index === currentIndex ? <Pause size={17} /> : <Play size={17} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className="library-page" aria-label="Your music library">
                        <div className="welcome-row">
                            <div>
                                <p className="section-eyebrow">A LITTLE MUSIC, A LOT OF LOVE</p>
                                <h1>Your music.<br /><span>Your memories.</span></h1>
                                <p className="welcome-copy">Every song has a story. Pick one, settle in, and let it play.</p>
                            </div>
                            <div className="memory-photo">
                                <img src={artworkUrl('loginpage.jpeg')} alt="A personal memory" />
                                <span className="memory-caption"><Heart size={14} fill="currentColor" /> made for you</span>
                            </div>
                        </div>

                        <div className="library-toolbar">
                            <div><p className="section-eyebrow">YOUR COLLECTION</p><h2>{filter === 'favourites' ? 'Loved songs' : search ? 'Search results' : 'All songs'}</h2></div>
                            <div className="filter-pills">
                                <button type="button" className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}><ListMusic size={16} /> All songs</button>
                                <button type="button" className={filter === 'favourites' ? 'selected' : ''} onClick={() => setFilter('favourites')}><Heart size={16} /> Favourites</button>
                            </div>
                        </div>

                        <p className="upload-hint">Add 10 or more songs at once. Your music is saved privately on this device.</p>
                        {message && <p className="library-message" role="status">{message}</p>}
                        {visibleSongs.length ? (
                            <div className="song-grid">
                                {visibleSongs.map(({ song, index }, position) => (
                                    <article className="song-tile" key={song.id} style={{ '--tile-delay': `${Math.min(position * 35, 350)}ms` }}>
                                        <div className="tile-art-wrap">
                                            <Cover
                                                song={song}
                                                className="tile-art"
                                                showPlay
                                                playing={playing && index === currentIndex}
                                                onClick={() => startSong(index)}
                                            />
                                            <button
                                                className={`tile-favourite${favourites.has(song.id) ? ' is-favourite' : ''}`}
                                                type="button"
                                                aria-label={favourites.has(song.id) ? `Remove ${song.title} from favourites` : `Add ${song.title} to favourites`}
                                                onClick={() => toggleFavourite(song)}
                                            >
                                                <Heart size={17} fill={favourites.has(song.id) ? 'currentColor' : 'none'} />
                                            </button>
                                        </div>
                                        <button className="tile-title" type="button" onClick={() => startSong(index)}>{song.title}</button>
                                        <p>{song.artist}</p>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-library">
                                <Music2 size={32} />
                                <h3>{filter === 'favourites' ? 'No favourites yet' : 'No songs found'}</h3>
                                <p>{filter === 'favourites' ? 'Tap the heart on any song to keep it here.' : 'Choose audio files saved on this device. Your music stays on your device.'}</p>
                                {filter === 'favourites' && <button type="button" onClick={() => setFilter('all')}>Browse all songs</button>}
                                {filter === 'all' && !search && <button type="button" onClick={() => fileInputRef.current?.click()}>Add songs from this device</button>}
                            </div>
                        )}
                    </section>
                )}
            </main>

            {currentSong && view !== 'player' && (
                <aside className="mini-player" aria-label="Mini player">
                    <button className="mini-song" type="button" onClick={() => showPlayer(currentIndex)}>
                        <img src={artworkUrl(currentSong.artwork)} alt="" />
                        <span><strong>{currentSong.title}</strong><small>{playing ? 'Now playing' : 'Paused'}</small></span>
                        <Maximize2 size={16} />
                    </button>
                    <div className="mini-controls">
                        <IconButton label="Previous song" onClick={() => skipTo(-1)}><SkipBack size={19} fill="currentColor" /></IconButton>
                        <IconButton label={playing ? 'Pause song' : 'Play song'} onClick={togglePlayback}>
                            {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                        </IconButton>
                        <IconButton label="Next song" onClick={() => skipTo(1)}><SkipForward size={19} fill="currentColor" /></IconButton>
                    </div>
                    <div className="mini-progress"><span style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} /></div>
                </aside>
            )}

            <nav className="mobile-nav" aria-label="Main navigation">
                <button type="button" className={view === 'library' && filter === 'all' ? 'is-selected' : ''} onClick={() => { showLibrary(); setFilter('all'); }}><Music2 size={19} /><span>Library</span></button>
                <button type="button" className={filter === 'favourites' ? 'is-selected' : ''} onClick={() => { showLibrary(); setFilter('favourites'); }}><Heart size={19} /><span>Favourites</span></button>
                <button type="button" className={view === 'player' ? 'is-selected' : ''} onClick={() => currentIndex >= 0 ? showPlayer(currentIndex) : startSong(0)}><AudioLines size={19} /><span>Player</span></button>
            </nav>
        </div>
    );
}
