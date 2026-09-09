// Song Database
const songs = [
    {
        name: "90's song",
        file: "song/90's song.mp3",
        icon: "fa-compact-disc"
    },
    {
        name: "Hawa Banke",
        file: "song/hawa banke.mp3",
        icon: "fa-music"
    }
];

// State Management
let currentSongIndex = 0;
let isPlaying = false;
let userPhone = null;
const audioPlayer = document.getElementById('audioPlayer');

// Set volume to 100% initially
if (audioPlayer) {
    audioPlayer.volume = 1.0;
    console.log('Audio player initialized with volume:', audioPlayer.volume);
}

// ============ LOGIN FUNCTIONALITY ============
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const countryCode = document.getElementById('countryCode').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    
    if (phoneNumber.length !== 10) {
        alert('Please enter a valid 10-digit phone number');
        return;
    }
    
    userPhone = `+${countryCode}${phoneNumber}`;
    
    // Simulate OTP sending
    alert(`OTP sent to ${userPhone}`);
    
    // In a real app, you would verify OTP here
    setTimeout(() => {
        loginSuccess();
    }, 500);
});

function loginAsGuest() {
    userPhone = 'Guest User';
    loginSuccess();
}

function loginSuccess() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    loadSongs();
    navigateTo('home');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        isPlaying = false;
        audioPlayer.pause();
        userPhone = null;
        
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('loginForm').reset();
        document.getElementById('countryCode').value = '91';
    }
}

// ============ NAVIGATION ============
function navigateTo(section) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(s => s.classList.remove('active'));
    
    // Remove active from all nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));
    
    // Show selected section
    document.getElementById(section).classList.add('active');
    
    // Add active to clicked nav link - find link that points to this section
    const targetLink = document.querySelector(`a[href="#${section}"]`);
    if (targetLink) {
        targetLink.classList.add('active');
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// ============ SONGS MANAGEMENT ============
function loadSongs() {
    const songsList = document.getElementById('songsList');
    songsList.innerHTML = '';
    
    songs.forEach((song, index) => {
        const songCard = document.createElement('div');
        songCard.className = 'song-card';
        songCard.innerHTML = `
            <div class="song-icon">
                <i class="fas ${song.icon}"></i>
            </div>
            <h4>${song.name}</h4>
            <p>Click to play</p>
        `;
        songCard.onclick = () => playSong(index);
        songsList.appendChild(songCard);
    });
}

function playSong(index) {
    currentSongIndex = index;
    const song = songs[index];
    
    console.log('Playing song:', song.name, 'from:', song.file);
    
    // Reset audio player
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    
    // Set volume to maximum
    audioPlayer.volume = 1.0;
    
    // Set the source
    audioPlayer.src = song.file;
    
    // Handle errors
    audioPlayer.onerror = function() {
        console.error('Error loading audio:', song.file);
        alert('Error loading song: ' + song.name + '\n\nMake sure the file exists in the song/ folder');
    };
    
    // Try to play
    const playPromise = audioPlayer.play();
    if (playPromise !== undefined) {
        playPromise.then(() => {
            console.log('Successfully playing:', song.name);
            isPlaying = true;
            updatePlayButton();
            updateCurrentSong();
        }).catch(error => {
            console.error('Playback error:', error);
            alert('Could not play song. Error: ' + error.message);
        });
    }
}

function togglePlay() {
    if (audioPlayer.src === '') {
        playSong(0);
    } else if (isPlaying) {
        audioPlayer.pause();
        isPlaying = false;
    } else {
        // Ensure volume is set when resuming
        audioPlayer.volume = 1.0;
        audioPlayer.play();
        isPlaying = true;
    }
    updatePlayButton();
}

function nextSong() {
    currentSongIndex = (currentSongIndex + 1) % songs.length;
    playSong(currentSongIndex);
}

function previousSong() {
    currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    playSong(currentSongIndex);
}

function updatePlayButton() {
    const playBtn = document.getElementById('playBtn');
    if (isPlaying) {
        playBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
    } else {
        playBtn.innerHTML = '<i class="fas fa-play"></i> Play';
    }
}

function updateCurrentSong() {
    document.getElementById('currentSongName').textContent = songs[currentSongIndex].name;
}

// Handle end of song - play next automatically
audioPlayer.addEventListener('ended', () => {
    nextSong();
});

// ============ SHARE FUNCTIONALITY ============
function shareApp(platform) {
    const url = window.location.href;
    const title = 'Spotify - Premium Music Streaming by Abhishek';
    const text = 'Enjoy unlimited music with Spotify! 🎵';
    
    let shareUrl = '';
    
    switch(platform) {
        case 'whatsapp':
            shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
            break;
    }
    
    if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }
}

function copyShareLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        alert('Link copied to clipboard! 🎉');
    }).catch(err => {
        alert('Failed to copy link');
    });
}

// ============ THEME & SETTINGS ============
// Dark mode is default - can add theme toggle in future

// ============ RESPONSIVE FIXES ============
// Handle mobile back button
window.addEventListener('popstate', () => {
    if (document.getElementById('mainApp').style.display === 'block') {
        navigateTo('home');
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Spotify App Loaded');
    console.log('Audio player found:', !!audioPlayer);
    console.log('Audio player volume:', audioPlayer?.volume);
    console.log('Songs available:', songs.length);
    songs.forEach((song, i) => {
        console.log(`  Song ${i + 1}: ${song.name} (${song.file})`);
    });
});
