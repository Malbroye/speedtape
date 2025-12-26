const socket = io();

console.log("⚡ [SpeedTape] Client starting...");

const defaultEmojis = ['🦊', '🐼', '🐯', '🦁', '🐸', '🦄', '🐲', '🦉', '🐱', '🐶'];
const allEmojis = [
    '🦊', '🐼', '🐯', '🦁', '🐸', '🦄', '🐲', '🦉', '🐱', '🐶', 
    '🐭', '🐹', '🐰', '🐨', '🐷', '🐮', '🐵', '🐔', '🐧', 
    '🐦', '🐤', '🦋', '🐢', '🐍', '🐙', '🐠', '🦀', '🍕', '🍔', 
    '🍟', '🍦', '🍩', '🍎', '🍓', '🏀', '⚽', '🎮', '🏎️', '🚀', 
    '⭐', '🔥', '💎', '🌈', '👾', '👻', '👑', '🎸', '🎹', '🎨'
];
const randomEmoji = defaultEmojis[Math.floor(Math.random() * defaultEmojis.length)];

const killPhrases = [
    "Aïe... tes doigts ont fourché ? 🤡",
    "ÉLIMINÉ. Retourne sur Adibou ! 👶",
    "C'était une erreur ou ton record ? 💀",
    "Même ma grand-mère tape plus vite sur Minitel. 🔥",
    "HARDCORE veut dire sans fautes, petit scarabée. 🦟",
    "GAME OVER. Tes mains tremblent ? 🥶",
    "Zéro pointé. La prochaine fois, essaie avec les yeux ouverts. 🙈"
];

// État de l'application
let state = {
    username: localStorage.getItem('speedtape_username') || '',
    avatar: localStorage.getItem('speedtape_avatar') || randomEmoji,
    roomCode: '',
    room: null,
    isHost: false,
    typedText: '',
    currentText: '',
    errors: 0,
    wordsCount: 0,
    errorIndices: new Set(),
    isRegistering: false,
    wordsArray: [],
    lastValidatedIndex: 0,
    lastMyLives: 3,
    isNearFinishStress: false,
    audioMuted: localStorage.getItem('speedtape_muted') === 'true',
    // Nouvelles stats
    currentCombo: 0,
    maxCombo: 0,
    totalMistakes: 0,
    totalKeystrokes: 0
};

// --- SYSTÈME AUDIO ---
const audioFiles = {
    // Switch Red / Thocky sounds - Local files for customization
    type1: '/assets/sounds/type1.mp3',
    type2: '/assets/sounds/type2.mp3',
    type3: '/assets/sounds/type3.mp3',
    type4: '/assets/sounds/type4.mp3',
    delete: '/assets/sounds/delete.mp3',
    error: '/assets/sounds/error.mp3',
    success: '/assets/sounds/success.mp3',
    finish: '/assets/sounds/finish.mp3'
};

const sounds = {};
Object.entries(audioFiles).forEach(([name, url]) => {
    sounds[name] = new Audio(url);
    sounds[name].volume = 0.6; // Légèrement plus fort
    sounds[name].preload = 'auto';
});

function playSound(name, variation = false) {
    if (state.audioMuted) return;
    
    let targetName = name;
    if (name === 'type') {
        const rand = Math.floor(Math.random() * 4) + 1;
        targetName = 'type' + rand;
    }

    const soundTemplate = sounds[targetName];
    if (!soundTemplate) return;

    try {
        const s = soundTemplate.cloneNode();
        s.volume = soundTemplate.volume;
        
        if (variation) {
            s.playbackRate = 0.9 + Math.random() * 0.2;
            s.volume *= (0.8 + Math.random() * 0.4);
        }
        
        s.play().catch(err => {
            // Souvent causé par l'absence d'interaction utilisateur préalable
            console.warn("🔇 [Audio] Lecture bloquée:", targetName);
        });
    } catch (e) {
        console.error("❌ [Audio] Erreur:", e);
    }
}

// Sécurisation de la sélection des éléments
const getEl = (id) => {
    const el = document.getElementById(id);
    if (!el && !['lobbyValidationSection', 'lobbyWordCountSection'].includes(id)) {
        console.warn(`⚠️ [SpeedTape] Élément manquant: ${id}`);
    }
    return el;
};

const elements = {
    authScreen: getEl('authScreen'),
    authTitle: getEl('authTitle'),
    authUsername: getEl('authUsername'),
    authPassword: getEl('authPassword'),
    authBtn: getEl('authBtn'),
    guestBtn: getEl('guestBtn'),
    authSwitch: getEl('authSwitch'),
    displayUsername: getEl('displayUsername'),
    logoutBtn: getEl('logoutBtn'),
    avatarInput: getEl('avatarInput'),
    avatarPreview: getEl('avatarPreview'),
    avatarOptions: () => document.querySelectorAll('#avatarSelector .avatar-option'),
    createRoomBtn: getEl('createRoomBtn'),
    joinRoomBtn: getEl('joinRoomBtn'),
    joinRandomRoomBtn: getEl('joinRandomRoomBtn'),
    roomCodeInput: getEl('roomCodeInput'),
    showLeaderboardBtn: getEl('showLeaderboardBtn'),
    moreEmojisBtn: getEl('moreEmojisBtn'),
    emojiModal: getEl('emojiModal'),
    fullEmojiGrid: getEl('fullEmojiGrid'),
    closeEmojiModal: getEl('closeEmojiModal'),
    lobbyModeToggle: getEl('lobbyModeToggle'),
    lobbyWordCountSection: getEl('lobbyWordCountSection'),
    lobbyWordCountToggle: getEl('lobbyWordCountToggle'),
    lobbyValidationSection: getEl('lobbyValidationSection'),
    lobbyAutoValidateToggle: getEl('lobbyAutoValidateToggle'),
    lobbyAccentsToggle: getEl('lobbyAccentsToggle'),
    lobbyDifficultyToggle: getEl('lobbyDifficultyToggle'),
    startGameBtn: getEl('startGameBtn'),
    hostMessage: getEl('hostMessage'),
    roomCodeDisplay: getEl('roomCodeDisplay'),
    playersGrid: getEl('playersGrid'),
    textDisplay: getEl('textDisplay'),
    typingInput: getEl('typingInput'),
    playersProgress: getEl('playersProgress'),
    toast: getEl('toast'),
    leaderboardList: getEl('leaderboardList'),
    backFromLeaderboardBtn: getEl('backFromLeaderboardBtn'),
    resultsTable: getEl('resultsTable'),
    playAgainBtn: getEl('playAgainBtn'),
    backToMenuBtn: getEl('backToMenuBtn'),
    leaveLobbyBtn: getEl('leaveLobbyBtn'),
    copyCodeBtn: getEl('copyCodeBtn'),
    leaveGameBtn: getEl('leaveGameBtn'),
    winnerBanner: getEl('winnerBanner'),
    winnerAvatar: getEl('winnerAvatar'),
    winnerName: getEl('winnerName'),
    podiumContainer: getEl('podiumContainer'),
    confettiSpace: getEl('confettiSpace')
};

// --- INITIALISATION ---
function init() {
    console.log("🎮 [SpeedTape] Initializing with username:", state.username);
    
    if (state.username) {
        showScreen('home');
        if (elements.displayUsername) elements.displayUsername.textContent = state.username;
    } else {
        showScreen('auth');
    }
    
    updateAvatarUI(state.avatar);
    populateEmojiGrid();
    setupAvatarClickers();
    updateAudioUI();
}

function updateAudioUI() {
    const btn = document.getElementById('audioToggle');
    const icon = document.getElementById('audioIcon');
    if (!btn || !icon) return;
    
    btn.classList.toggle('muted', state.audioMuted);
    icon.setAttribute('data-lucide', state.audioMuted ? 'volume-x' : 'volume-2');
    if (window.lucide) lucide.createIcons();
}

if (getEl('audioToggle')) {
    getEl('audioToggle').onclick = () => {
        state.audioMuted = !state.audioMuted;
        localStorage.setItem('speedtape_muted', state.audioMuted);
        updateAudioUI();
    };
}

// --- AUTHENTIFICATION ---

if (elements.authSwitch) {
    elements.authSwitch.onclick = () => {
        state.isRegistering = !state.isRegistering;
        elements.authTitle.textContent = state.isRegistering ? "INSCRIPTION" : "CONNEXION";
        elements.authBtn.textContent = state.isRegistering ? "CRÉER MON COMPTE" : "ENTRER";
        elements.authSwitch.innerHTML = state.isRegistering ? 
            'Déjà un compte ? <span style="color: var(--primary); font-weight: 800;">Se connecter</span>' : 
            'Pas de compte ? <span style="color: var(--primary); font-weight: 800;">S\'inscrire</span>';
    };
}

if (elements.authBtn) {
    elements.authBtn.onclick = async () => {
        const user = elements.authUsername.value.trim();
        const pin = elements.authPassword.value.trim();
        if (!user || pin.length !== 4) return showToast("Pseudo et PIN (4 chiffres) requis", "error");
        
        const endpoint = state.isRegistering ? '/api/register' : '/api/login';
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pin })
            });
            const data = await res.json();
            if (data.success) {
                state.username = user;
                if (data.avatar) {
                    state.avatar = data.avatar;
                    localStorage.setItem('speedtape_avatar', data.avatar);
                    updateAvatarUI(data.avatar);
                }
                localStorage.setItem('speedtape_username', user);
                if (elements.displayUsername) elements.displayUsername.textContent = user;
                showScreen('home');
                showToast(state.isRegistering ? "Bienvenue !" : "Heureux de vous revoir !", "success");
            } else {
                showToast(data.error || "Erreur d'authentification", "error");
            }
        } catch (e) {
            showToast("Erreur serveur", "error");
        }
    };
}

if (elements.guestBtn) {
    elements.guestBtn.onclick = () => {
        const user = elements.authUsername.value.trim();
        if (!user) return showToast("Veuillez entrer un pseudo", "error");
        
        state.username = user;
        localStorage.setItem('speedtape_username', user);
        if (elements.displayUsername) elements.displayUsername.textContent = user + " (Invité)";
        showScreen('home');
        showToast("Mode invité activé 🎮", "info");
    };
}

if (elements.logoutBtn) {
    elements.logoutBtn.onclick = () => {
        localStorage.removeItem('speedtape_username');
        state.username = '';
        if (elements.authUsername) elements.authUsername.value = '';
        if (elements.authPassword) elements.authPassword.value = '';
        showScreen('auth');
    };
}

// --- LOGIQUE DU JEU ---

function populateEmojiGrid() {
    if (!elements.fullEmojiGrid) return;
    elements.fullEmojiGrid.innerHTML = allEmojis.map(emoji => `
        <div class="avatar-option" data-avatar="${emoji}">${emoji}</div>
    `).join('');
    elements.fullEmojiGrid.querySelectorAll('.avatar-option').forEach(opt => {
        opt.onclick = () => {
            updateAvatar(opt.dataset.avatar);
            elements.emojiModal.classList.remove('active');
        };
    });
}

if (elements.moreEmojisBtn) {
    elements.moreEmojisBtn.onclick = () => {
        elements.emojiModal.classList.add('active');
        if (window.lucide) lucide.createIcons();
    };
}

if (elements.closeEmojiModal) elements.closeEmojiModal.onclick = () => elements.emojiModal.classList.remove('active');
if (elements.leaveLobbyBtn) elements.leaveLobbyBtn.onclick = () => showScreen('home');

if (elements.copyCodeBtn) {
    elements.copyCodeBtn.onclick = () => {
        if (!state.roomCode) return;
        navigator.clipboard.writeText(state.roomCode).then(() => showToast("Code copié ! 📋"));
    };
}

function setupAvatarClickers() {
    const options = elements.avatarOptions();
    if (!options) return;
    options.forEach(opt => {
        if (opt.id !== 'moreEmojisBtn') {
            opt.onclick = () => updateAvatar(opt.dataset.avatar);
        }
    });
}

if (elements.avatarInput) {
    elements.avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 120;
                let width = img.width, height = img.height;
                if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
                else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const base64 = canvas.toDataURL('image/jpeg', 0.6);
                updateAvatar(base64);
                
                const isGuest = elements.displayUsername && elements.displayUsername.textContent.includes("(Invité)");
                if (state.username && !isGuest) {
                    fetch('/api/update-avatar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: state.username, avatar: base64 })
                    });
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function updateAvatar(newAvatar) {
    state.avatar = newAvatar;
    localStorage.setItem('speedtape_avatar', newAvatar);
    updateAvatarUI(newAvatar);
    
    const options = elements.avatarOptions();
    if (options) {
        options.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.avatar === newAvatar);
        });
    }

    const isGuest = elements.displayUsername && elements.displayUsername.textContent.includes("(Invité)");
    if (state.username && !isGuest && !newAvatar.startsWith('data:image')) {
        fetch('/api/update-avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: state.username, avatar: newAvatar })
        });
    }
}

function updateAvatarUI(val) {
    const content = val.startsWith('data:image') ? `<img src="${val}" />` : `<span>${val}</span>`;
    const preview = document.getElementById('avatarPreview');
    if (preview) {
        preview.innerHTML = content + `<div class="edit-badge"><i data-lucide="pencil" style="width: 14px; height: 14px;"></i></div>`;
        if (window.lucide) lucide.createIcons();
    }
}

function renderAvatar(val) {
    if (!val) return '🦊';
    return val.startsWith('data:image') ? `<img src="${val}" />` : val;
}

function setupLobbyToggles() {
    console.log("⚙️ [SpeedTape] Setting up Lobby Toggles...");
    const toggles = [
        { id: 'lobbyModeToggle', key: 'mode' },
        { id: 'lobbyWordCountToggle', key: 'wordCount', isNum: true },
        { id: 'lobbyAutoValidateToggle', key: 'autoValidate', isBool: true },
        { id: 'lobbyAccentsToggle', key: 'withAccents', isBool: true },
        { id: 'lobbyDifficultyToggle', key: 'suddenDeath', isDiff: true }
    ];

    toggles.forEach(({ id, key, isNum, isBool, isDiff }) => {
        const container = document.getElementById(id);
        if (!container) return;
        
        container.querySelectorAll('button').forEach(btn => {
            btn.onclick = () => {
                if (!state.isHost) return;
                console.log(`🔘 Toggle ${key} clicked:`, btn.dataset.val);
                let val = btn.dataset.val;
                if (isNum) val = parseInt(val);
                if (isBool) val = (val === 'true');
                
                let settings = {};
                if (isDiff) { 
                    settings.isZen = (val === 'zen');
                    settings.suddenDeath = (val === 'sudden'); 
                    settings.livesCount = (val === 'sudden' ? 1 : 3); 
                } else { 
                    settings[key] = val; 
                }
                socket.emit('updateSettings', { roomCode: state.roomCode, settings });
            };
        });
    });
}

function updateLobbyUI(room) {
    state.room = room;
    console.log("🔄 [SpeedTape] Updating Lobby UI with settings:", room);
    
    if (elements.roomCodeDisplay) elements.roomCodeDisplay.textContent = room.code;
    
    // Mise à jour de TOUS les boutons de réglages
    document.querySelectorAll('.toggle-group').forEach(group => {
        const parentId = group.id;
        const buttons = group.querySelectorAll('button');
        
        buttons.forEach(btn => {
            // Désactiver si pas hôte
            btn.disabled = !state.isHost;
            
            let val = btn.dataset.val;
            let isActive = false;

            if (parentId === 'lobbyModeToggle') isActive = (room.mode === val);
            if (parentId === 'lobbyWordCountToggle') isActive = (room.wordCount == val);
            if (parentId === 'lobbyAutoValidateToggle') {
                const currentVal = (room.autoValidate ?? true).toString();
                isActive = (currentVal === val);
            }
            if (parentId === 'lobbyAccentsToggle') {
                const currentVal = (room.withAccents ?? true).toString();
                isActive = (currentVal === val);
            }
            if (parentId === 'lobbyDifficultyToggle') {
                if (room.isZen) isActive = (val === 'zen');
                else isActive = (room.suddenDeath ? val === 'sudden' : val === 'normal');
            }
            
            btn.classList.toggle('active', isActive);
        });
    });

    if (elements.lobbyWordCountSection) elements.lobbyWordCountSection.style.display = (room.mode === 'words' ? 'block' : 'none');
    if (elements.lobbyValidationSection) elements.lobbyValidationSection.style.display = (room.mode === 'words' ? 'block' : 'none');
    
    if (elements.startGameBtn) elements.startGameBtn.style.display = state.isHost ? 'flex' : 'none';
    if (elements.hostMessage) elements.hostMessage.style.display = state.isHost ? 'none' : 'block';
    displayPlayers(room);
}

if (elements.typingInput) {
    elements.typingInput.addEventListener('input', (e) => {
        const currentInput = e.target.value;
        const oldErrorsCount = state.errorIndices.size;
        const oldValidatedIndex = state.lastValidatedIndex;

        // --- 1. TRACKING DES STATS (AVANT VALIDATION) ---
        // On ne track que si ce n'est pas une suppression et qu'il y a du nouveau texte
        if (e.inputType !== 'deleteContentBackward' && currentInput.length > 0) {
            state.totalKeystrokes++;
            
            const typedChar = currentInput[currentInput.length - 1]; // Le dernier caractère du champ actuel
            let absoluteIndex = 0;
            
            if (state.room && state.room.mode === 'words') {
                const completedStr = state.wordsArray.slice(0, state.lastValidatedIndex).join(' ');
                absoluteIndex = (completedStr.length > 0 ? completedStr.length + 1 : 0) + currentInput.length - 1;
            } else {
                absoluteIndex = currentInput.length - 1;
            }

            const targetChar = state.currentText[absoluteIndex];

            if (typedChar === targetChar) {
                state.currentCombo++;
                if (state.currentCombo > state.maxCombo) state.maxCombo = state.currentCombo;
            } else {
                state.currentCombo = 0;
                state.totalMistakes++;
            }
            
            console.log(`[Stats] Char: ${typedChar} | Target: ${targetChar} | Combo: ${state.currentCombo} | Err: ${state.totalMistakes}`);
        }

        // --- 2. LOGIQUE DE JEU (VALIDATION DES MOTS) ---
        if (state.room && state.room.mode === 'words') {
            const targetWord = state.wordsArray[state.lastValidatedIndex];
            const completedParts = state.wordsArray.slice(0, state.lastValidatedIndex);
            state.typedText = completedParts.length > 0 ? completedParts.join(' ') + ' ' + currentInput : currentInput;

            if (currentInput === targetWord && state.lastValidatedIndex < state.wordsArray.length - 1 && state.room.autoValidate) {
                state.lastValidatedIndex++;
                e.target.value = '';
                const newCompleted = state.wordsArray.slice(0, state.lastValidatedIndex);
                state.typedText = newCompleted.join(' ') + ' ';
            } else if (currentInput === targetWord && state.lastValidatedIndex === state.wordsArray.length - 1) {
                state.typedText = state.wordsArray.join(' ');
            }
        } else {
            state.typedText = currentInput;
        }

        if (e.inputType === 'deleteContentBackward') playSound('delete', true);
        else playSound('type', true);
        
        // --- 3. MISE À JOUR DES ERREURS ---
        state.errorIndices = new Set();
        for (let i = 0; i < state.typedText.length; i++) {
            if (state.typedText[i] !== state.currentText[i]) state.errorIndices.add(i);
        }
        state.errors = state.errorIndices.size;
        state.wordsCount = state.typedText.trim().split(/\s+/).filter(w => w.length > 0).length;

        // Bruitages de validation ou erreur
        if (state.errors > oldErrorsCount) playSound('error');
        if (state.lastValidatedIndex > oldValidatedIndex) playSound('success');

        updateTextDisplay();
        updateProgress();
    });

    elements.typingInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && state.room && state.room.mode === 'words' && !state.room.autoValidate) {
            const currentInput = e.target.value;
            const targetWord = state.wordsArray[state.lastValidatedIndex];
            if (currentInput === targetWord && state.lastValidatedIndex < state.wordsArray.length - 1) {
                state.lastValidatedIndex++;
                e.target.value = '';
                const newCompleted = state.wordsArray.slice(0, state.lastValidatedIndex);
                state.typedText = newCompleted.join(' ') + ' ';
                updateTextDisplay();
                updateProgress();
            }
        }
    });
}

function updateTextDisplay() {
    if (!elements.textDisplay) return;
    if (state.room && state.room.mode === 'words') {
        const currentInput = elements.typingInput.value;
        elements.textDisplay.innerHTML = `
            <div class="word-list-container">
                <div class="word active">${renderFocusedWord(state.wordsArray[state.lastValidatedIndex], currentInput)}</div>
                <div class="word next">${state.wordsArray[state.lastValidatedIndex + 1] || ''}</div>
                <div class="word upcoming">${state.wordsArray[state.lastValidatedIndex + 2] || ''}</div>
            </div>
        `;
        return;
    }

    elements.textDisplay.innerHTML = state.currentText.split('').map((char, index) => {
        let className = '';
        if (index < state.typedText.length) className = (state.typedText[index] === char) ? 'correct' : 'incorrect';
        else if (index === state.typedText.length) className = 'current';
        return `<span class="char ${className}">${char}</span>`;
    }).join('');
}

function renderFocusedWord(target, typed) {
    if (!target) return '';
    return target.split('').map((char, i) => {
        let className = '';
        if (i < typed.length) className = (typed[i] === char) ? 'correct' : 'incorrect';
        else if (i === typed.length) className = 'current';
        return `<span class="char ${className}">${char}</span>`;
    }).join('');
}

function updateProgress() {
    const accuracy = state.totalKeystrokes > 0 
        ? Math.max(0, Math.round(((state.totalKeystrokes - state.totalMistakes) / state.totalKeystrokes) * 100)) 
        : 100;

    // Calcul du nombre de caractères corrects consécutifs depuis le début
    let correctCount = 0;
    for (let i = 0; i < state.typedText.length; i++) {
        if (state.typedText[i] === state.currentText[i]) {
            correctCount++;
        } else {
            break; // On bloque la progression à la première erreur
        }
    }

    socket.emit('updateProgress', {
        roomCode: state.roomCode,
        progress: Math.round((correctCount / (state.currentText.length || 1)) * 100),
        finished: (state.typedText === state.currentText),
        errors: state.errors,
        wordsCount: state.wordsCount,
        maxCombo: state.maxCombo,
        totalMistakes: state.totalMistakes,
        accuracy: accuracy
    });
}

function spawnDamageParticles() {
    for (let i = 0; i < 8; i++) {
        const p = document.createElement('div');
        p.className = 'particle-heart';
        p.textContent = '💔';
        p.style.left = '50%';
        p.style.top = '50%';
        
        // Directions aléatoires
        const tx = (Math.random() - 0.5) * 400 + 'px';
        const ty = (Math.random() - 0.5) * 400 + 'px';
        const tr = (Math.random() * 720 - 360) + 'deg';
        
        p.style.setProperty('--tx', tx);
        p.style.setProperty('--ty', ty);
        p.style.setProperty('--tr', tr);
        
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1000);
    }
}

function showScreen(name) {
    console.log("➡️ [SpeedTape] Showing screen:", name);
    state.isNearFinishStress = false; // Reset stress
    document.body.classList.remove('stress-mode'); 
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(name + 'Screen');
    if (screen) screen.classList.add('active');
    else console.error(`❌ [SpeedTape] Screen not found: ${name}Screen`);
}

function showToast(msg, type = 'info') {
    if (!elements.toast) return console.log("Toast:", msg);
    elements.toast.textContent = msg;
    elements.toast.className = `toast ${type} show`;
    setTimeout(() => elements.toast.classList.remove('show'), 3000);
}

function displayPlayers(room) {
    if (!elements.playersGrid) return;
    elements.playersGrid.innerHTML = room.players.map(p => `
        <div class="player-card" style="background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 20px; border: 1px solid var(--border-light); text-align: center;">
            <div class="avatar-preview" style="width:100px;height:100px;margin: 0 auto 1rem; font-size: 4rem;">${renderAvatar(p.avatar)}</div>
            <div class="player-username" style="font-weight: 700;">${p.username}</div>
            ${p.id === room.host ? '<span class="player-badge" style="background: var(--primary); font-size: 0.7rem; padding: 2px 8px; border-radius: 5px;">HÔTE</span>' : ''}
        </div>
    `).join('');
    if (window.lucide) lucide.createIcons();
}

let prevWordsCount = {};

function displayInGameProgress(room) {
    if (!elements.playersProgress) return;
    elements.playersProgress.innerHTML = room.players.map(p => {
        let status = p.isEliminated ? '<i data-lucide="skull" style="width:14px; color:var(--error)"></i>' : (p.finished ? `<i data-lucide="flag" style="width:14px; color:var(--success)"></i> ${p.wpm} CPM` : `${p.progress}%`);
        let lives = !p.isEliminated && !room.suddenDeath && !room.isZen ? `<div style="display:flex; gap:2px;">${Array(p.lives).fill('<i data-lucide="heart" fill="var(--error)" style="width:12px; height:12px; color:var(--error)"></i>').join('')}</div>` : '';
        
        let showPlusOne = false;
        if (p.wordsCount > (prevWordsCount[p.id] || 0)) {
            showPlusOne = true;
            prevWordsCount[p.id] = p.wordsCount;
        }

        return `
            <div class="player-progress ${p.finished ? 'finished' : ''}" style="opacity: ${p.isEliminated ? '0.4' : '1'}">
                <div class="progress-header" style="display: flex; align-items: center; gap: 1.5rem;">
                    <div class="avatar-preview" style="width:65px;height:65px;font-size:2.5rem">${renderAvatar(p.avatar)}</div>
                    <div class="progress-info" style="flex:1; position: relative;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div><span style="font-weight: 700;">${p.username}</span>${lives}</div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span class="word-count-badge">${p.wordsCount || 0} pts</span>
                                <span style="font-size: 0.8rem; color: var(--accent); display: flex; align-items: center; gap: 4px;">${status}</span>
                            </div>
                        </div>
                        ${showPlusOne ? '<span class="plus-one-anim">+1</span>' : ''}
                    </div>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width: ${p.progress}%"></div></div>
            </div>
        `;
    }).join('');
    if (window.lucide) lucide.createIcons();
}

if (elements.createRoomBtn) {
    elements.createRoomBtn.onclick = () => {
        console.log("🖱️ [SpeedTape] Create Room Clicked!");
        if (!state.username) return showToast("Pseudo manquant", "error");
        socket.emit('createRoom', { username: state.username, avatar: state.avatar });
    };
}

if (elements.joinRoomBtn) {
    elements.joinRoomBtn.onclick = () => {
        const code = elements.roomCodeInput ? elements.roomCodeInput.value.trim().toUpperCase() : '';
        if (!code) return showToast("Code requis", "error");
        socket.emit('joinRoom', { roomCode: code, username: state.username, avatar: state.avatar });
    };
}

if (elements.startGameBtn) elements.startGameBtn.onclick = () => socket.emit('startGame', { roomCode: state.roomCode });

if (elements.joinRandomRoomBtn) {
    elements.joinRandomRoomBtn.onclick = () => {
        if (!state.username) return showToast("Pseudo manquant", "error");
        socket.emit('joinRandom', { username: state.username, avatar: state.avatar });
    };
}

if (elements.showLeaderboardBtn) {
    elements.showLeaderboardBtn.onclick = async () => {
        showScreen('leaderboard');
        try {
            const res = await fetch('/api/leaderboard'), data = await res.json();
            
            const totalPlayersEl = document.getElementById('lbTotalPlayers');
            if (totalPlayersEl) totalPlayersEl.textContent = data.length;

            if (elements.leaderboardList) {
                elements.leaderboardList.innerHTML = data.map((e, i) => `
                    <div class="leaderboard-item" style="animation: fadeIn 0.3s ease-out both; animation-delay: ${i * 0.05}s">
                        <div class="col-rank lb-rank-${i+1}">#${i+1}</div>
                        
                        <div class="col-player">
                            <div class="lb-avatar">${renderAvatar(e.avatar)}</div>
                            <div class="lb-username">${e.username}</div>
                        </div>

                        <div class="col-mode">
                             <span style="display: flex; align-items: center; gap: 8px;">
                                <i data-lucide="${e.mode === 'words' ? 'hash' : 'quote'}" style="width: 16px;"></i>
                                ${e.mode}
                             </span>
                        </div>

                        <div class="col-cpm">
                            <div class="lb-cpm-val">${e.wpm} <small style="font-size: 0.6rem; opacity: 0.6;">CPM</small></div>
                        </div>
                    </div>
                `).join('');
            }
            if (window.lucide) lucide.createIcons();
        } catch(e) {
            console.error("Erreur leaderboard:", e);
        }
    };
}

if (elements.backFromLeaderboardBtn) elements.backFromLeaderboardBtn.onclick = () => showScreen('home');

socket.on('roomCreated', ({ roomCode, room }) => {
    console.log("🏠 [SpeedTape] Room Created:", roomCode);
    state.roomCode = roomCode; state.isHost = true;
    setupLobbyToggles(); updateLobbyUI(room); showScreen('lobby');
});

socket.on('roomJoined', ({ roomCode, room }) => {
    state.roomCode = roomCode; state.isHost = false;
    setupLobbyToggles(); updateLobbyUI(room); showScreen('lobby');
});

socket.on('suggestRoom', ({ roomCode }) => {
    showToast("Recherche d'une salle...", "info");
    socket.emit('joinRoom', { roomCode, username: state.username, avatar: state.avatar });
});

socket.on('playerJoined', ({ room }) => updateLobbyUI(room));
socket.on('playerLeft', ({ room }) => updateLobbyUI(room));
socket.on('settingsUpdated', ({ room }) => updateLobbyUI(room));

socket.on('gameStarted', ({ text, room }) => {
    state.room = room; state.currentText = text; 
    state.wordsArray = text.split(' ');
    state.lastValidatedIndex = 0;
    state.lastMyLives = room.livesCount || 3;
    state.typedText = ''; state.errors = 0; state.wordsCount = 0;
    state.errorIndices = new Set();
    // Reset stats
    state.currentCombo = 0;
    state.maxCombo = 0;
    state.totalMistakes = 0;
    state.totalKeystrokes = 0;
    if (elements.typingInput) {
        elements.typingInput.value = '';
        elements.typingInput.disabled = false;
        setTimeout(() => elements.typingInput.focus(), 100);
    }
    updateTextDisplay(); displayInGameProgress(room); showScreen('game');
    if (elements.leaveGameBtn) elements.leaveGameBtn.style.display = 'inline-block';
});

socket.on('progressUpdated', ({ room }) => {
    state.room = room;
    displayInGameProgress(room);
    const me = room.players.find(p => p.id === socket.id);
    if (!me) return;



    // Détection perte de vie
    if (me.lives < state.lastMyLives) {
        state.lastMyLives = me.lives;
        spawnDamageParticles();
        playSound('error');
    }

    if (me.isEliminated && elements.typingInput && !elements.typingInput.disabled) {
        elements.typingInput.disabled = true;
        showToast(killPhrases[Math.floor(Math.random() * killPhrases.length)], "error");

        // Afficher le bouton pour quitter
        if (elements.leaveGameBtn) elements.leaveGameBtn.style.display = 'inline-block';
    }
});

socket.on('gameFinished', ({ room }) => {
    state.room = room; 
    if (elements.typingInput) elements.typingInput.disabled = true;
    
    const sortedPlayers = [...room.players].sort((a, b) => b.wpm - a.wpm);
    const winner = sortedPlayers[0];
    const isMeWinner = winner.id === socket.id;

    // Mise à jour de la bannière du vainqueur
    if (elements.winnerAvatar) elements.winnerAvatar.innerHTML = renderAvatar(winner.avatar);
    if (elements.winnerName) elements.winnerName.textContent = winner.username;
    
    const label = document.querySelector('.winner-label');
    if (label) {
        label.innerHTML = isMeWinner ? '<i data-lucide="crown" style="width:18px; color:#ffd700"></i> VICTOIRE MAGNIFIQUE' : '<i data-lucide="trophy" style="width:18px"></i> RÉSULTATS DE LA PARTIE';
        label.style.color = isMeWinner ? "#ffd700" : "var(--primary)";
        label.style.letterSpacing = "4px";
        label.style.textTransform = "uppercase";
    }

    // Ajout des stats détaillées du vainqueur dans la bannière
    const winnerStats = document.createElement('div');
    winnerStats.className = 'winner-stats-grid';
    winnerStats.innerHTML = `
        <div class="stat-box">
            <span class="stat-val">${winner.wpm || 0}</span>
            <span class="stat-lbl"><i data-lucide="zap"></i> CPM</span>
        </div>
        <div class="stat-box">
            <span class="stat-val">${winner.accuracy ?? 100}%</span>
            <span class="stat-lbl"><i data-lucide="target"></i> PRÉCISION</span>
        </div>
        <div class="stat-box">
            <span class="stat-val">${winner.maxCombo || 0}</span>
            <span class="stat-lbl"><i data-lucide="activity"></i> MAX COMBO</span>
        </div>
        <div class="stat-box">
            <span class="stat-val">${winner.totalMistakes || 0}</span>
            <span class="stat-lbl"><i data-lucide="circle-alert"></i> ERREURS</span>
        </div>
    `;
    const winnerContent = document.querySelector('.winner-content');
    const existingStats = document.querySelector('.winner-stats-grid');
    if (existingStats) existingStats.remove();
    if (winnerContent) winnerContent.appendChild(winnerStats);
    
    // Podium (Top 3)
    if (elements.podiumContainer) {
        const top3 = sortedPlayers.slice(0, 3);
        const podiumOrder = [];
        if (top3[1]) podiumOrder.push({ p: top3[1], rank: 2 });
        if (top3[0]) podiumOrder.push({ p: top3[0], rank: 1 });
        if (top3[2]) podiumOrder.push({ p: top3[2], rank: 3 });

        elements.podiumContainer.innerHTML = podiumOrder.map(item => `
            <div class="podium-slot rank-${item.rank}" style="animation-delay: ${item.rank * 0.2}s">
                <div class="podium-rank">${item.rank}</div>
                <div class="podium-avatar">${renderAvatar(item.p.avatar)}</div>
                <div class="podium-username">${item.p.username}</div>
                <div class="podium-main-stat">${item.p.wpm || 0} <small>CPM</small></div>
                <div class="podium-sub-stats">
                    <span><i data-lucide="target" style="width:10px; height:10px"></i> ${item.p.accuracy ?? 100}%</span>
                    <span><i data-lucide="activity" style="width:10px; height:10px"></i> ${item.p.maxCombo || 0} max</span>
                </div>
            </div>
        `).join('');
    }

    // Reste des joueurs
    if (elements.resultsTable) {
        const others = sortedPlayers.slice(3);
        if (others.length > 0) {
            elements.resultsTable.innerHTML = others.map((p, i) => `
                <div class="result-item" style="animation: slideInUp 0.5s ease-out both; animation-delay: ${(i + 4) * 0.1}s">
                    <div class="result-rank">#${i + 4}</div>
                    <div class="result-avatar" style="width: 45px; height: 45px; font-size: 1.8rem;">${renderAvatar(p.avatar)}</div>
                    <div class="result-info">
                        <div class="result-user-box">
                            <span class="result-username" style="font-size: 1.1rem;">${p.username} ${p.isEliminated ? '<i data-lucide="skull" style="width: 14px; color: var(--error)"></i>' : ''}</span>
                            <div class="result-small-stats">
                                <span>${p.accuracy ?? 100}% Acc.</span> • <span>Combo: ${p.maxCombo || 0}</span> • <span>Err: ${p.totalMistakes || 0}</span>
                            </div>
                        </div>
                        <div class="result-wpm" style="font-size: 1.5rem;">${p.wpm || 0} <small style="font-size: 0.7rem; opacity: 0.6;">CPM</small></div>
                    </div>
                </div>
            `).join('');
        } else {
            elements.resultsTable.innerHTML = '';
        }
    }

    if (window.lucide) lucide.createIcons();

    // Seul l'hôte peut cliquer sur "Rejouer" pour tout le monde
    if (elements.playAgainBtn) {
        elements.playAgainBtn.style.display = state.isHost ? 'flex' : 'none';
        elements.playAgainBtn.onclick = () => {
            socket.emit('backToLobby', { roomCode: state.roomCode });
        };
    }
    
    const me = room.players.find(p => p.id === socket.id);
    const isGuest = elements.displayUsername && elements.displayUsername.textContent.includes("(Invité)");
    if (me && me.finished && me.wpm > 0 && !isGuest) {
        fetch('/api/leaderboard', { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ username: me.username, wpm: me.wpm, mode: room.mode, avatar: me.avatar })
        });
    }

    showScreen('results');
    triggerConfetti();
    playSound('finish');
});

function triggerConfetti() {
    if (!elements.confettiSpace) return;
    elements.confettiSpace.innerHTML = '';
    const colors = ['#8b5cf6', '#ec4899', '#06b6d4', '#ffd700', '#ffffff'];
    
    for (let i = 0; i < 80; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + '%';
        c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        c.style.animationDelay = Math.random() * 2 + 's';
        c.style.width = Math.random() * 4 + 2 + 'px'; // Plus petit et élégant
        c.style.height = c.style.width;
        c.style.borderRadius = '50%'; // Rond pour faire "particules"
        c.style.boxShadow = `0 0 10px ${c.style.backgroundColor}`;
        elements.confettiSpace.appendChild(c);
    }
}

socket.on('error', ({ message }) => showToast(message, 'error'));

socket.on('backToLobby', ({ room }) => {
    state.room = room;
    updateLobbyUI(room);
    showScreen('lobby');
});

socket.on('lastPlayerStanding', ({ message }) => {
    // Proposition d'arrêt si seul en piste
    if (confirm(message)) {
        socket.emit('stopGame', { roomCode: state.roomCode });
    }
});

if (elements.backToMenuBtn) {
    elements.backToMenuBtn.onclick = () => {
        socket.emit('leaveRoom', { roomCode: state.roomCode });
        showScreen('home');
    };
}

if (elements.leaveGameBtn) {
    elements.leaveGameBtn.onclick = () => {
        socket.emit('leaveRoom', { roomCode: state.roomCode });
        showScreen('home');
    };
}

window.onload = init;
