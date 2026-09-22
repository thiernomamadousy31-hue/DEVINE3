/* =========================================================
   DEVINE 3
   JAVASCRIPT PRINCIPAL
   Nouvelle architecture
   ========================================================= */


/* =========================================================
   ÉTAT DU JEU
   ========================================================= */
/* =========================================================
   CONNEXION SUPABASE
   ========================================================= */



const SUPABASE_URL =
    "https://pzclojqpkachdrxlgidk.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_vC04qguAgxteIhU9sAjV9A_OpgVj3Jb";


const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
        }
    }
);
let currentUser = null;
function generateRoomCode() {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";

    for (let i = 0; i < 4; i++) {
        code += characters.charAt(
            Math.floor(Math.random() * characters.length)
        );
    }

    return code;
}

async function createOnlineGame() {

    await cleanupOldOnlineRealtimeChannels();

    if (!currentUser) {        console.error("❌ Aucun joueur connecté.");
        return;
    }

    const roomCode = generateRoomCode();

    const { data, error } =
        await supabaseClient
            .from("online_games")
            .insert({
                room_code: roomCode,
                player1_id: currentUser.id,
                status: "waiting"
            })
            .select()
            .single();

    if (error) {

        console.error(
            "❌ ERREUR CRÉATION SALLE :",
            error
        );

        return;
    }

    console.log(
        "✅ SALLE CRÉÉE :",
        data
    );

    console.log(
        "🎮 CODE DE LA SALLE :",
        roomCode
    );
    document.getElementById("onlineRoomCode").textContent = roomCode;
    currentOnlineGame = data;

return data;
}
document
    .getElementById("shareOnlineGameBtn")
    .addEventListener("click", async () => {

        const roomCode =
            document.getElementById("onlineRoomCode").textContent.trim();

        if (!roomCode || roomCode === "------") {
            console.error(
                "❌ CODE DE SALLE INTROUVABLE"
            );
            return;
        }

        console.log(
            "🔗 CODE À PARTAGER :",
            roomCode
        );

       const shareUrl =
    "https://thiernomamadousy31-hue.github.io/DEVINE3/?room=" +
    roomCode;

console.log(
    "🔗 LIEN À PARTAGER :",
    shareUrl
);

if (navigator.share) {

    await navigator.share({
        title: "DEVINE 3",
        text:
            "🎮 Rejoins ma partie DEVINE 3 !",
        url: shareUrl
    });

} else {

    await navigator.clipboard.writeText(
        shareUrl
    );

    alert(
        "✅ Lien de la partie copié !\n\n" +
        shareUrl
    );
}
    });
async function testSetOnlineSecret() {

    const gameId =
        "043bee2a-e9db-4c82-a249-0ab8038d64d5";

    const secret = "027";

    console.log("🟡 TEST SECRET :", gameId, secret);

    const { data, error } =
        await supabaseClient.rpc(
            "set_online_secret",
            {
                p_game_id: gameId,
                p_secret: secret
            }
        );

    if (error) {

        console.error(
            "❌ ERREUR SET SECRET :",
            error
        );

        return;
    }

    console.log(
        "✅ SECRET ENREGISTRÉ :",
        data
    );
}
async function joinOnlineGame(roomCode) {

    if (!currentUser) {
        console.error("❌ Aucun joueur connecté.");
        return;
    }

    const { data, error } =
        await supabaseClient
            .rpc("join_online_game", {
                p_room_code: roomCode
            });

    if (error) {

        console.error(
            "❌ ERREUR POUR REJOINDRE LA SALLE :",
            error
        );

        return;
    }

    console.log(
        "✅ SALLE REJOINTE :",
        data
    );

    currentOnlineGame = data;

    listenToOnlineGame(data.id);
    listenToOnlineChat(data.id);

    showScreen("onlineSecretScreen");

    return data;
}
document
    .getElementById("onlineSecretForm")
    .addEventListener("submit", async (event) => {

        event.preventDefault();

        const input =
            document.getElementById("onlineSecretInput");

        const status =
            document.getElementById("onlineSecretStatus");

        const secret =
            input.value.trim();

        if (!/^[0-9]{3}$/.test(secret)) {

            status.textContent =
                "❌ Entre exactement 3 chiffres.";

            return;
        }

        if (
            secret[0] === secret[1] ||
            secret[0] === secret[2] ||
            secret[1] === secret[2]
        ) {

            status.textContent =
                "❌ Les 3 chiffres doivent être différents.";

            return;
        }

        if (!currentUser) {

            status.textContent =
                "❌ Joueur non connecté.";

            return;
        }

        if (!currentOnlineGame) {

            status.textContent =
                "❌ Aucune partie en ligne active.";

            return;
        }

        console.log(
            "🟡 ENREGISTREMENT SECRET :",
            currentOnlineGame.id,
            secret
        );

        const { data, error } =
            await supabaseClient.rpc(
                "set_online_secret",
                {
                    p_game_id: currentOnlineGame.id,
                    p_secret: secret
                }
            );

        if (error) {

            console.error(
                "❌ ERREUR ENREGISTREMENT SECRET :",
                error
            );

            status.textContent =
                "❌ Impossible d'enregistrer le secret.";

            return;
        }

        console.log(
            "✅ SECRET ENREGISTRÉ :",
            data
        );

        status.textContent =
            "✅ Ton secret est enregistré. En attente de l'autre joueur...";
        input.value = "";    
        input.disabled = true;

        document
            .getElementById("onlineSecretBtn")
            .disabled = true;
    });
 
async function testAnonymousLogin() {

    let {
        data: { session },
        error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError) {
        console.error(
            "❌ ERREUR SESSION :",
            sessionError
        );
        return;
    }

    if (session) {

        const {
            data: refreshedSession,
            error: refreshError
        } = await supabaseClient.auth.refreshSession();

        if (refreshError) {

            console.error(
                "❌ ERREUR RAFRAÎCHISSEMENT SESSION :",
                refreshError
            );

            return;
        }

        session = refreshedSession.session;
    }

    let user;

    if (session && session.user) {

        user = session.user;
        currentUser = user;

        console.log(
            "✅ SESSION EXISTANTE :",
            user.id
        );

    } else {

        const { data, error } =
            await supabaseClient.auth.signInAnonymously();

        if (error) {
            console.error(
                "❌ ERREUR AUTH ANONYME :",
                error
            );
            return;
        }

        user = data.user;
        currentUser = user;

        console.log(
            "✅ NOUVEAU JOUEUR ANONYME :",
            user.id
        );

        const { error: playerError } =
            await supabaseClient
                .from("players")
                .insert({
                    id: user.id
                });

        if (playerError) {

            console.error(
                "❌ ERREUR CRÉATION PLAYER :",
                playerError
            );

            return;
        }

        console.log(
            "✅ JOUEUR ENREGISTRÉ :",
            user.id
        );
    }
}

testAnonymousLogin();

const levels = {
    beginner: {
        name: "Débutant",
        time: 300,
        multiplier: 1
    },

    intermediate: {
        name: "Intermédiaire",
        time: 240,
        multiplier: 1.5
    },

    pro: {
        name: "Pro",
        time: 180,
        multiplier: 2
    },

    expert: {
        name: "Expert",
        time: 120,
        multiplier: 3
    }
};


let currentLevel = "beginner";

let secretNumber = "";

let timeLeft = 0;

let timerInterval = null;

let gameOver = false;

let attempts = 0;

let history = [];
let currentOnlineGame = null;
let onlinePlayer1Secret = null;
let onlinePlayer2Secret = null;
// =========================================================
// 🧹 NETTOYAGE DES ANCIENS CANAUX REALTIME DES PARTIES
// =========================================================

async function cleanupOldOnlineRealtimeChannels() {

    console.log("🧹 NETTOYAGE DES ANCIENS CANAUX REALTIME");

    const channels = supabaseClient.getChannels();

    for (const channel of channels) {

        const topic = channel.topic || "";

        if (
            topic.startsWith("realtime:online-game-") ||
            topic.startsWith("realtime:online-secrets-") ||
            topic.startsWith("realtime:online-chat-") ||
            topic === "realtime:online-guesses-history" 
        ) {

            console.log(
                "🗑️ SUPPRESSION ANCIEN CANAL :",
                topic
            );

            await supabaseClient.removeChannel(channel);
        }
    }

    console.log("✅ ANCIENS CANAUX REALTIME NETTOYÉS");
}
function resetOnlineGameState() {

    console.log("🧹 NETTOYAGE DE L'ANCIENNE PARTIE EN LIGNE");
        // 🧹 Nettoyer l'affichage de l'ancienne partie
    const onlineGameMessage =
        document.getElementById("onlineGameMessage");

    if (onlineGameMessage) {
        onlineGameMessage.textContent = "";
        onlineGameMessage.className = "message";
    }

    const onlineMyHistory =
        document.getElementById("onlineMyHistory");

    const onlineOpponentHistory =
        document.getElementById("onlineOpponentHistory");

    if (onlineMyHistory) {
        onlineMyHistory.innerHTML = "";
    }

    if (onlineOpponentHistory) {
        onlineOpponentHistory.innerHTML = "";
    }

    // Ancienne partie
    currentOnlineGame = null;
    const joinRoomInput =
    document.getElementById("joinRoomCode");

if (joinRoomInput) {
    joinRoomInput.value = "";
}
    // =========================================================

    // Anciens secrets
    onlinePlayer1Secret = null;
    onlinePlayer2Secret = null;

    // Arrêter le chrono
    if (onlineTurnTimer) {
        clearInterval(onlineTurnTimer);
        onlineTurnTimer = null;
    }

    onlineTurnSeconds = 15;

    // Réinitialiser l'écran de saisie du secret
    const secretInput =
        document.getElementById("onlineSecretInput");

    const secretStatus =
        document.getElementById("onlineSecretStatus");

    const secretButton =
        document.getElementById("onlineSecretBtn");

    if (secretInput) {
        secretInput.value = "";
        secretInput.disabled = false;
    }

    if (secretStatus) {
        secretStatus.textContent = "";
    }

    if (secretButton) {
        secretButton.disabled = false;
    }

    console.log("✅ ÉTAT EN LIGNE RÉINITIALISÉ");
}


/* =========================================================
   MODE 2 JOUEURS
   ========================================================= */

let player1Secret = "";

let player2Secret = "";

let twoCurrentPlayer = 1;

let twoTimeLeft = 180;

let twoTimerInterval = null;

let twoGameOver = false;

let twoAttempts = 0;

let twoHistory = [];

let player1Result = null;

let player2Result = null;


/* =========================================================
   STATISTIQUES
   ========================================================= */

const defaultStats = {
    games: 0,
    wins: 0,
    losses: 0,
    attempts: 0,
    bestScore: 0
};


let stats = loadStats();


/* =========================================================
   DÉFIS
   ========================================================= */

const defaultChallenges = {
    firstWin: false,
    fiveWins: false,
    tenWins: false,
    expertWin: false,
    fastWin: false,
    noMoreTen: false
};


let challenges = loadChallenges();


/* =========================================================
   AUDIO
   ========================================================= */

let soundEnabled =
    localStorage.getItem("devine3_sound") !== "off";

let audioContext = null;
/* =========================================================
   MUSIQUE D'AMBIANCE PREMIUM
   ========================================================= */

let musicPlaying = false;
let musicTimer = null;
let musicStep = 0;
document.addEventListener("click", function startMusicOnce() {

    if (soundEnabled && !musicPlaying) {
        startBackgroundMusic();
    }

    document.removeEventListener("click", startMusicOnce);

}, { once: true });


/* =========================================================
   DÉMARRER LA MUSIQUE
   ========================================================= */

function startBackgroundMusic() {

    if (!soundEnabled || musicPlaying) {
        return;
    }

    initAudio();

    if (!audioContext) {
        return;
    }
    console.log(
    "🎧 AUDIO CONTEXT :",
    audioContext.state,
    "sampleRate =",
    audioContext.sampleRate
);

    musicPlaying = true;
    musicStep = 0;
    console.log("🎵 MUSIQUE DEVINE 3 DÉMARRÉE");

    playMusicStep();
}


/* =========================================================
   ARRÊTER LA MUSIQUE
   ========================================================= */

function stopBackgroundMusic() {

    musicPlaying = false;

    if (musicTimer) {
        clearTimeout(musicTimer);
        musicTimer = null;
    }
}


/* =========================================================
   UNE MESURE MUSICALE
   ========================================================= */

function playMusicStep() {
    if (!musicPlaying || !soundEnabled || !audioContext) {
        return;
    }

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = "triangle";

    // Mélodie plus musicale
    const notes = [
    440, 523, 659, 784,
    659, 523, 440, 392,
    440, 523, 659, 880,
    784, 659, 523, 440
];

    const note = notes[musicStep % notes.length];
    osc.frequency.value = note;

    // Accent sur certaines notes
    const volume =
    musicStep % 4 === 0 ? 0.36 :
    musicStep % 2 === 0 ? 0.28 :
    0.24;

const now = audioContext.currentTime;

gain.gain.setValueAtTime(0.001, now);
gain.gain.linearRampToValueAtTime(volume, now + 0.08);
gain.gain.linearRampToValueAtTime(0.001, now + 1.35);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    // Basse
    const bass = audioContext.createOscillator();
    const bassGain = audioContext.createGain();

    bass.type = "sine";

    const bassNotes = [220, 262, 330, 196];
    bass.frequency.value =
        bassNotes[Math.floor(musicStep / 2) % bassNotes.length];

    bassGain.gain.value = 0.08;

    bass.connect(bassGain);
    bassGain.connect(audioContext.destination);

    // Harmonie
    const harmony = audioContext.createOscillator();
    const harmonyGain = audioContext.createGain();

    harmony.type = "triangle";
    harmony.frequency.value = note * 2;

    harmonyGain.gain.value = 0.035;

    harmony.connect(harmonyGain);
    harmonyGain.connect(audioContext.destination);

    // Démarrage
    osc.start();
    bass.start();
    harmony.start();

    // Arrêt
    const duration =
        musicStep % 4 === 0 ? 1.8 :
        musicStep % 2 === 0 ? 1.5 :
        1.2;

    osc.stop(audioContext.currentTime + duration);
    bass.stop(audioContext.currentTime + 1.5);
    harmony.stop(audioContext.currentTime + 1.5);

    musicStep++;

    musicTimer = setTimeout(
        playMusicStep,
        1500
    );
}
/* =========================================================
   INITIALISATION AUDIO
   ========================================================= */

function initAudio() {

    if (!audioContext) {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;

        if (AudioContext) {
            audioContext = new AudioContext();
        }
    }

    if (
        audioContext &&
        audioContext.state === "suspended"
    ) {
        audioContext.resume();
    }
}
/* =========================================================
   REPRISE AUDIO APRÈS RETOUR SUR LA PAGE
   ========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState === "visible" &&
            audioContext &&
            audioContext.state === "suspended"
        ) {

            console.log(
                "🔊 REPRISE AUDIO APRÈS RETOUR SUR LA PAGE"
            );

            audioContext.resume();
        }
    }
);

/* =========================================================
   SONS
   ========================================================= */

function playSound(type) {

    if (!soundEnabled) {
        return;
    }

    initAudio();

    if (!audioContext) {
        return;
    }


    const oscillator =
        audioContext.createOscillator();

    const gain =
        audioContext.createGain();


    oscillator.connect(gain);

    gain.connect(audioContext.destination);


    let frequency = 500;

    let duration = 0.08;


    switch (type) {

        case "click":
            frequency = 420;
            duration = 0.05;
            break;


        case "success":
            frequency = 700;
            duration = 0.12;
            break;


        case "error":
            frequency = 180;
            duration = 0.14;
            break;


        case "win":
            frequency = 880;
            duration = 0.40;
             break;


        case "loss":
            frequency = 150;
            duration = 0.30;
            break;
    }


    oscillator.type = "sine";

    oscillator.frequency.setValueAtTime(
        frequency,
        audioContext.currentTime
    );


    gain.gain.setValueAtTime(
        0.0001,
        audioContext.currentTime
    );


    gain.gain.exponentialRampToValueAtTime(
        1,
        audioContext.currentTime + 0.01
    );


    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + duration
    );


    oscillator.start();

    oscillator.stop(
        audioContext.currentTime + duration
    );
}
function playCountdownSound() {

    if (!soundEnabled) {
        return;
    }

    initAudio();

    if (!audioContext) {
        return;
    }

    const oscillator =
        audioContext.createOscillator();

    const gain =
        audioContext.createGain();

    oscillator.type = "sine";

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    const startTime =
        audioContext.currentTime;

    oscillator.frequency.setValueAtTime(
        880,
        startTime
    );

    gain.gain.setValueAtTime(
        0.0001,
        startTime
    );

    gain.gain.exponentialRampToValueAtTime(
        0.45,
        startTime + 0.01
    );

    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        startTime + 0.16
    );

    oscillator.start(startTime);

    oscillator.stop(
        startTime + 0.16
    );
}
function playWinSound() {

    if (!soundEnabled) {
        return;
    }

    initAudio();

    if (!audioContext) {
        return;
    }

    const now = audioContext.currentTime;

    // 🏆 FANFARE DE VICTOIRE
    const notes = [
        { frequency: 523.25, time: 0.00 },
        { frequency: 659.25, time: 0.12 },
        { frequency: 783.99, time: 0.24 },
        { frequency: 1046.50, time: 0.38 }
    ];

    notes.forEach(note => {

        const oscillator =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();

        oscillator.type = "triangle";

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        const startTime =
            now + note.time;

        oscillator.frequency.setValueAtTime(
            note.frequency,
            startTime
        );

        gain.gain.setValueAtTime(
            0.0001,
            startTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.30,
            startTime + 0.01
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            startTime + 0.32
        );

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.32);
    });

    // ✨ NOTE FINALE BRILLANTE
    const finalOscillator =
        audioContext.createOscillator();

    const finalGain =
        audioContext.createGain();

    finalOscillator.type = "sine";

    finalOscillator.connect(finalGain);
    finalGain.connect(audioContext.destination);

    finalOscillator.frequency.setValueAtTime(
        1567.98,
        now + 0.38
    );

    finalGain.gain.setValueAtTime(
        0.0001,
        now + 0.38
    );

    finalGain.gain.exponentialRampToValueAtTime(
        0.18,
        now + 0.40
    );

    finalGain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + 0.75
    );

    finalOscillator.start(now + 0.38);
    finalOscillator.stop(now + 0.75);
}
function playLossSound() {
    console.log("🔴 SON DE DÉFAITE DÉCLENCHÉ");

    if (!soundEnabled) {
        return;
    }

    initAudio();

    if (!audioContext) {
        return;
    }

    const now = audioContext.currentTime;

    // ❌ SON DE DÉFAITE
    const notes = [
        { frequency: 392.00, time: 0.00 },
        { frequency: 329.63, time: 0.18 },
        { frequency: 261.63, time: 0.36 }
    ];

    notes.forEach(note => {

        const oscillator =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();

        oscillator.type = "triangle";

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        const startTime =
            now + note.time;

        oscillator.frequency.setValueAtTime(
            note.frequency,
            startTime
        );

        gain.gain.setValueAtTime(
            0.0001,
            startTime
        );

        gain.gain.exponentialRampToValueAtTime(
    1.20,
    startTime + 0.02
);
        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            startTime + 0.38
        );

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.38);
    });

    // 🔻 NOTE FINALE
    const finalOscillator =
        audioContext.createOscillator();

    const finalGain =
        audioContext.createGain();

    finalOscillator.type = "sine";

    finalOscillator.connect(finalGain);
    finalGain.connect(audioContext.destination);

    finalOscillator.frequency.setValueAtTime(
        196.00,
        now + 0.36
    );

    finalGain.gain.setValueAtTime(
        0.0001,
        now + 0.36
    );

    finalGain.gain.exponentialRampToValueAtTime(
    0.40,
    now + 0.39
);

    finalGain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + 0.85
    );

    finalOscillator.start(now + 0.36);
    finalOscillator.stop(now + 0.85);
}

/* =========================================================
   BOUTON SON
   ========================================================= */

function updateSoundButton() {

    const button =
        document.getElementById("soundBtn");

    if (!button) {
        return;
    }

    button.textContent =
        soundEnabled ? "🔊" : "🔇";

    button.setAttribute(
        "aria-label",
        soundEnabled
            ? "Désactiver le son"
            : "Activer le son"
    );
}


function toggleSound() {

    soundEnabled = !soundEnabled;

    localStorage.setItem(
        "devine3_sound",
        soundEnabled ? "on" : "off"
    );

    updateSoundButton();

    if (soundEnabled) {

        playSound("click");
        startBackgroundMusic();

    } else {

        stopBackgroundMusic();

    }
}

/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function loadStats() {

    try {

        const saved =
            localStorage.getItem("devine3_stats");

        if (!saved) {
            return { ...defaultStats };
        }

        return {
            ...defaultStats,
            ...JSON.parse(saved)
        };

    } catch (error) {

        return { ...defaultStats };
    }
}


function saveStats() {

    localStorage.setItem(
        "devine3_stats",
        JSON.stringify(stats)
    );
}


function loadChallenges() {

    try {

        const saved =
            localStorage.getItem("devine3_challenges");

        if (!saved) {
            return { ...defaultChallenges };
        }

        return {
            ...defaultChallenges,
            ...JSON.parse(saved)
        };

    } catch (error) {

        return { ...defaultChallenges };
    }
}


function saveChallenges() {

    localStorage.setItem(
        "devine3_challenges",
        JSON.stringify(challenges)
    );
}


/* =========================================================
   GÉNÉRATION DU CODE SE   ET
   ========================================================= */

function generateSecret() {

    let digits = [];


    while (digits.length < 3) {

        const digit =
            Math.floor(
                Math.random() * 10
            ).toString();


        if (!digits.includes(digit)) {

            digits.push(digit);
        }
    }


    return digits.join("");
}


/* =========================================================
   VALIDATION
   ========================================================= */

function isValidCode(code) {

    return (
        /^[0-9]{3}$/.test(code) &&
        new Set(code).size === 3
    );
}


/* =========================================================
   CALCUL V / X
   ========================================================= */

function calculateResult(secret, guess) {

    let v = 0;

    let x = 0;


    for (let i = 0; i < 3; i++) {

        if (guess[i] === secret[i]) {

            v++;

        } else if (
            secret.includes(guess[i])
        ) {

            x++;
        }
    }


    return {
        v,
        x
    };
}


/* =========================================================
   NAVIGATION
   ========================================================= */
let onlineTurnTimer = null;
let onlineTurnSeconds = 15;
async function startOnlineTurnTimer() {

    clearInterval(onlineTurnTimer);

    onlineTurnSeconds = 15;

    const timerElement =
        document.getElementById("onlineTimer");

    if (!timerElement) return;

    timerElement.textContent = "15";

    onlineTurnTimer = setInterval(async () => {

       onlineTurnSeconds--;

if (onlineTurnSeconds <= 5 && onlineTurnSeconds > 0) {
    playCountdownSound();
}

timerElement.textContent =
    onlineTurnSeconds;
            if (
    currentOnlineGame &&
    currentOnlineGame.status !== "playing"
) {
    clearInterval(onlineTurnTimer);
    return;
}

       if (onlineTurnSeconds <= 0) {

    clearInterval(onlineTurnTimer);

    console.log(
        "⏰ TEMPS DU TOUR ÉCOULÉ"
    );

    const { error } =
        await supabaseClient.rpc(
            "timeout_online_turn",
            {
                p_game_id: currentOnlineGame.id
            }
        );

    if (error) {

        console.error(
            "❌ ERREUR TIMEOUT :",
            error
        );

        return;
    }

    console.log(
        "✅ TOUR PASSÉ À L'ADVERSAIRE"
    );
}

    }, 1000);
}
function showOnlineVerdict(winnerNumber) {

    const playerNumber =
        currentOnlineGame.player1_id === currentUser.id
            ? 1
            : 2;

    const isWinner =
        winnerNumber === playerNumber;
        // 🎆 EFFET PREMIUM UNIQUEMENT POUR LE GAGNANT
const verdictPopup =
    document.getElementById("onlineVerdictPopup");
    // 🎆 CRÉATION DES PARTICULES DU FEU D'ARTIFICE
const effects =
    document.getElementById("onlineVerdictEffects");

if (effects && isWinner) {

    effects.innerHTML = "";

    for (let i = 0; i < 24; i++) {

        const spark =
            document.createElement("span");

        spark.className = "firework-spark";

        spark.style.setProperty(
            "--angle",
            (i * 15) + "deg"
        );

        spark.style.setProperty(
            "--delay",
            (i * 0.03) + "s"
        );

        effects.appendChild(spark);
    }
}

if (verdictPopup) {
    verdictPopup.classList.remove("winner-effect");

    if (isWinner) {
        verdictPopup.classList.add("winner-effect");
    }
}
        const mySecret =
    playerNumber === 1
        ? onlinePlayer1Secret
        : onlinePlayer2Secret;

const opponentSecret =
    playerNumber === 1
        ? onlinePlayer2Secret
        : onlinePlayer1Secret;

document.getElementById("onlineVerdictMyCode").textContent =
    mySecret || "---";

document.getElementById("onlineVerdictOpponentCode").textContent =
    opponentSecret || "---";
    /* =====================================================
       HISTORIQUE DANS LE VERDICT FINAL
       ===================================================== */

    const myHistory =
        document.getElementById("onlineMyHistory");

    const opponentHistory =
        document.getElementById("onlineOpponentHistory");

    const verdictMyHistory =
        document.getElementById("onlineVerdictMyHistory");

    const verdictOpponentHistory =
        document.getElementById("onlineVerdictOpponentHistory");

    if (verdictMyHistory) {
        verdictMyHistory.innerHTML =
            myHistory
                ? myHistory.innerHTML
                : "";
    }

    if (verdictOpponentHistory) {
        verdictOpponentHistory.innerHTML =
            opponentHistory
                ? opponentHistory.innerHTML
                : "";
    }
    const isEnglish =
    enLanguageBtn &&
    enLanguageBtn.classList.contains("active");
   // 🏆 TITRE
document.getElementById("onlineVerdictTitle").textContent =
    isEnglish
        ? (isWinner ? "🏆 VICTORY!" : "💥 DEFEAT!")
        : (isWinner ? "🏆 VICTOIRE !" : "💥 DÉFAITE !");

if (isWinner) {
    playWinSound();
} else {
    playLossSound();
}

// 📝 SOUS-TITRE
document.getElementById("onlineVerdictSubtitle").textContent =
    isEnglish
        ? (isWinner
            ? "YOU FOUND THE CODE!"
            : "YOUR OPPONENT FOUND THE CODE!")
        : (isWinner
            ? "TU AS TROUVÉ LE CODE !"
            : "TON ADVERSAIRE A TROUVÉ LE CODE !");

// 💬 MESSAGE
document.getElementById("onlineVerdictMessage").textContent =
    isEnglish
        ? (isWinner
            ? "Congratulations!"
            : "Better luck next game!")
        : (isWinner
            ? "Félicitations !"
            : "La prochaine partie sera la bonne !");

// 👑 / 💥 ICÔNE
document.getElementById("onlineVerdictIcon").textContent =
    isWinner ? "👑" : "💥";

// RÉSULTAT
document.getElementById("onlineVerdictMyResult").textContent =
    isEnglish
        ? (isWinner ? "WINNER" : "LOSER")
        : (isWinner ? "GAGNANT" : "PERDANT");

document.getElementById("onlineVerdictOpponentResult").textContent =
    isEnglish
        ? (isWinner ? "LOSER" : "WINNER")
        : (isWinner ? "PERDANT" : "GAGNANT");
// 📜 HISTORIQUE : fermé au début
const verdictHistory =
    document.getElementById("onlineVerdictHistory");

if (verdictHistory) {
    verdictHistory.style.display = "none";
}
    // 📜 OUVRIR / FERMER L'HISTORIQUE DU VERDICT
    const onlineVerdictHistoryBtn =
        document.getElementById("onlineVerdictHistoryBtn");

    if (onlineVerdictHistoryBtn) {

        onlineVerdictHistoryBtn.onclick = () => {

            const history =
                document.getElementById("onlineVerdictHistory");

            if (!history) return;

            if (history.style.display === "none") {

                history.style.display = "block";

                onlineVerdictHistoryBtn.textContent =
                    isEnglish
                        ? "📕 CLOSE HISTORY"
                        : "📕 FERMER L'HISTORIQUE";

            } else {

                history.style.display = "none";

                onlineVerdictHistoryBtn.textContent =
                    isEnglish
                        ? "📜 HISTORY"
                        : "📜 HISTORIQUE";
            }
        };
    }

    // AFFICHER LE VERDICT

    document.getElementById("onlineVerdictOverlay").style.display =
        "flex";
}
function listenToOnlineGame(gameId) {

    console.log(
        "🟠 ÉCOUTE REALTIME SALLE :",
        gameId
    );

    supabaseClient
        .channel("online-game-" + gameId)
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "online_games",
                filter: "id=eq." + gameId
            },
            (payload) => {

    console.log(
        "🔵 CHANGEMENT REALTIME :",
        payload
    );

    const wasPlaying =
        currentOnlineGame &&
        currentOnlineGame.status === "playing";

    currentOnlineGame = payload.new;
loadOnlineHistory();

if (
    payload.new.status === "finished"
) {

    console.log(
        "🏁 PARTIE TERMINÉE — GAGNANT :",
        payload.new.winner
    );

    const playerNumber =
        currentOnlineGame.player1_id === currentUser.id
            ? 1
            : 2;

    if (
        payload.new.winner === playerNumber
    ) {

        console.log(
            "🏆 JE SUIS LE GAGNANT !"
        );

        document
            .getElementById("onlineGameMessage")
            .textContent =
                "🏆 VICTOIRE !";

    } else {

        console.log(
            "💥 JE SUIS LE PERDANT !"
        );

        document
            .getElementById("onlineGameMessage")
            .textContent =
                "💥 DÉFAITE !";
    }
    showOnlineVerdict(payload.new.winner);

    clearInterval(onlineTurnTimer);
  // 🧹 NETTOYAGE DE L'AFFICHAGE DU TOUR
const currentPlayerElement =
    document.getElementById("onlineCurrentPlayer");

if (currentPlayerElement) {
    currentPlayerElement.textContent = "";
}

const timerElement =
    document.getElementById("onlineTurnTimer");

if (timerElement) {
    timerElement.textContent = "";
}

const onlineInstruction =
    document.getElementById("onlineInstruction");

if (onlineInstruction) {
    onlineInstruction.textContent = "";
}
    document
        .getElementById("onlineGuessInput")
        .disabled = true;

    document
        .getElementById("onlineGuessBtn")
        .disabled = true;

    return;
}

if (
    payload.new.status === "playing"
) {
        const timerElement =
    document.getElementById("onlineTurnTimer");

if (timerElement) {
    timerElement.textContent = "15";
}

        const playerNumber =
            currentOnlineGame.player1_id === currentUser.id
                ? 1
                : 2;

        document.getElementById("onlineCurrentPlayer").textContent =
            currentOnlineGame.current_turn === playerNumber
                ? "🎮 C'EST VOTRE TOUR"
                : "⏳ TOUR DE L'ADVERSAIRE";
   if (
    currentOnlineGame.current_turn === playerNumber &&
    onlinePlayer1Secret &&
    onlinePlayer2Secret
) {

    // 🎮 C'EST MON TOUR
    const onlineGuessInput =
        document.getElementById("onlineGuessInput");

    onlineGuessInput.value = "";
    onlineGuessInput.disabled = false;

    document.getElementById("onlineGuessBtn").disabled = false;

    document.getElementById("onlineCurrentPlayer").textContent =
        "🎮 C'EST VOTRE TOUR";

    startOnlineTurnTimer();

} else {
    // ⏳ TOUR DE L'ADVERSAIRE
    clearInterval(onlineTurnTimer);

    document.getElementById("onlineGuessInput").disabled = true;
    document.getElementById("onlineGuessBtn").disabled = true;

    document.getElementById("onlineCurrentPlayer").textContent =
        "⏳ EN ATTENTE DU TOUR DE L'ADVERSAIRE…";

}

        if (!wasPlaying) {
            console.log("🎮 LE JOUEUR 2 EST ARRIVÉ !");
            showScreen("onlineSecretScreen");
        }
    }

}
        )
        .subscribe((status) => {

    console.log(
        "🟢 STATUT REALTIME :",
        status
    );

});

}
function listenToOnlineSecrets(gameId) {

    console.log(
        "🟠 ÉCOUTE REALTIME SECRETS :",
        gameId
    );

    supabaseClient
        .channel("online-secrets-" + gameId)
        .on(
            "postgres_changes",
            {
                event: "UPDATE",
                schema: "public",
                table: "online_secrets",
                filter: "game_id=eq." + gameId
            },
            (payload) => {

                console.log(
                    "🔵 CHANGEMENT SECRET REALTIME :",
                    payload
                );

                const secretData = payload.new;
                onlinePlayer1Secret = secretData.player1_secret;
                onlinePlayer2Secret = secretData.player2_secret;

        if (
    secretData.player1_secret &&
    secretData.player2_secret
) {

    console.log(
        "🎯 LES DEUX SECRETS SONT PRÊTS !"
    );

    // 🧹 Nouvelle partie : vider l'ancien code testé
    const onlineGuessInput =
        document.getElementById("onlineGuessInput");

    if (onlineGuessInput) {
        onlineGuessInput.value = "";
    }

    showScreen("onlineGameScreen");
    const playerNumber =
        currentOnlineGame.player1_id === currentUser.id
            ? 1
            : 2;

    if (
        currentOnlineGame.status === "playing" &&
        currentOnlineGame.current_turn === playerNumber
    ) {

        document.getElementById("onlineGuessInput").disabled = false;
        document.getElementById("onlineGuessBtn").disabled = false;

        document.getElementById("onlineCurrentPlayer").textContent =
            "🎮 C'EST VOTRE TOUR";

        startOnlineTurnTimer();
    }
}
            }
        )
        .subscribe((status) => {

            console.log(
                "🟢 STATUT REALTIME SECRETS :",
                status
            );

        });
}
function listenToOnlineChat(gameId) {

    console.log(
        "💬 ÉCOUTE CHAT EN LIGNE :",
        gameId
    );

    supabaseClient
        .channel("online-chat-" + gameId)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "online_messages",
                filter: "game_id=eq." + gameId
            },
            (payload) => {

                console.log(
                    "💬 NOUVEAU MESSAGE :",
                    payload.new
                );

                displayOnlineChatMessage(
                    payload.new
                );
            }
        )
        .subscribe((status) => {

            console.log(
                "🟢 STATUT REALTIME CHAT :",
                status
            );

        });
}
function displayOnlineChatMessage(messageData) {

    const chatElement =
        document.getElementById("onlineChat");

    if (!chatElement) {
        return;
    }

    const messageElement =
        document.createElement("div");

    messageElement.className =
        "online-chat-message";

    const isMe =
        messageData.sender_id === currentUser.id;

    messageElement.classList.add(
        isMe ? "me" : "opponent"
    );

    messageElement.textContent =
        messageData.message;

    chatElement.appendChild(
        messageElement
    );

    chatElement.scrollTop =
        chatElement.scrollHeight;
}
document
    .getElementById("onlineChatSendBtn")
    .addEventListener("click", async () => {

        const input =
            document.getElementById("onlineChatInput");

        const message =
            input.value.trim();

        if (!message) {
            return;
        }

        if (
            !currentOnlineGame ||
            !currentUser
        ) {
            console.error(
                "❌ Partie ou utilisateur introuvable"
            );
            return;
        }

        const { error } =
            await supabaseClient
                .from("online_messages")
                .insert({
                    game_id: currentOnlineGame.id,
                    sender_id: currentUser.id,
                    message: message
                });

        if (error) {

            console.error(
                "❌ ERREUR ENVOI MESSAGE :",
                error
            );

            return;
        }

        input.value = "";
        input.focus();
    });
function showScreen(id) {

    document
        .querySelectorAll(".screen")
        .forEach(screen => {

            screen.classList.remove("active");
        });


    const screen =
        document.getElementById(id);


    if (screen) {

        screen.classList.add("active");

        window.scrollTo(0, 0);
    }
}


/* =========================================================
   POPUP
   ========================================================= */

let popupConfirmCallback = null;


function showPopup(
    title,
    message,
    confirmCallback = null
) {

    const overlay =
        document.getElementById(
            "popupOverlay"
        );


    document.getElementById(
        "popupTitle"
    ).textContent = title;


    document.getElementById(
        "popupMessage"
    ).textContent = message;


    popupConfirmCallback =
        confirmCallback;


    overlay.classList.add("active");

    overlay.setAttribute(
        "aria-hidden",
        "false"
    );
}


function closePopup() {

    const overlay =
        document.getElementById(
            "popupOverlay"
        );


    overlay.classList.remove("active");

    overlay.setAttribute(
        "aria-hidden",
        "true"
    );


    popupConfirmCallback = null;
}


/* =========================================================
   NIVEAUX
   ========================================================= */

function showLevels() {

    showScreen("levelsScreen");
}


function startSolo(level) {

    // 🎁 COMPTEUR DES PARTIES GRATUITES
    let freeGames =
        Number(localStorage.getItem("devine3_free_games")) || 0;

    // 🔒 LIMITE DE 10 PARTIES GRATUITES
   if (freeGames >= 10) {

    const limitOverlay =
        document.getElementById(
            "freeGamesLimitOverlay"
        );

    if (limitOverlay) {
        limitOverlay.style.display = "flex";
    }

    return;
}
    freeGames++;

    localStorage.setItem(
        "devine3_free_games",
        freeGames
    );
    console.log(
        "🎁 PARTIES GRATUITES UTILISÉES :",
        freeGames,
        "/ 10"
    );
    const freeGamesCounter =
    document.getElementById("freeGamesCounter");

if (freeGamesCounter) {
    freeGamesCounter.textContent =
        `🎁 Parties gratuites : ${freeGames} / 10`;
}

    const config =
        levels[currentLevel];


    secretNumber =
        generateSecret();


    timeLeft =
        config.time;


    attempts = 0;

    history = [];

    gameOver = false;


    document.getElementById(
        "currentLevelName"
    ).textContent =
        config.name;


    document.getElementById(
        "guessInput"
    ).value = "";


    document.getElementById(
        "message"
    ).textContent = "";


    document.getElementById(
        "message"
    ).className =
        "message";


    document.getElementById(
        "history"
    ).innerHTML = "";


    updateTimerUI();


    showScreen("gameScreen");


    startSoloTimer();


    setTimeout(() => {

        document
            .getElementById("guessInput")
            .focus();

    }, 150);


    playSound("click");
}


/* =========================================================
   CHRONOMÈTRE SOLO
   ========================================================= */

function startSoloTimer() {

    clearInterval(timerInterval);


    timerInterval =
        setInterval(() => {

            if (gameOver) {
                clearInterval(timerInterval);
                return;
            }


            timeLeft--;
            if (timeLeft <= 30 && timeLeft > 0) {
    playCountdownSound();
}


            updateTimerUI();


            if (timeLeft <= 0) {

                clearInterval(timerInterval);

                loseSoloGame();
            }

        }, 1000);
}


/* =========================================================
   AFFICHAGE CHRONO
   ========================================================= */

function formatTime(seconds) {

    const minutes =
        Math.floor(seconds / 60);

    const secs =
        seconds % 60;


    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(secs).padStart(2, "0")
    );
}


function updateTimerUI() {

    const timer =
        document.getElementById("timer");


    if (!timer) {
        return;
    }


    timer.textContent =
        formatTime(Math.max(0, timeLeft));


    const box =
        timer.closest(".timer-box");


    if (box) {

        box.classList.remove(
            "timer-warning",
            "timer-danger"
        );


        if (timeLeft <= 30) {

            box.classList.add(
                "timer-danger"
            );

        } else if (timeLeft <= 60) {

            box.classList.add(
                "timer-warning"
            );
        }
    }
}


/* =========================================================
   SOUMISSION D'UNE PROPOSITION SOLO
   ========================================================= */

function submitSoloGuess() {

    if (gameOver) {
        return;
    }


    const input =
        document.getElementById(
            "guessInput"
        );


    const message =
        document.getElementById(
            "message"
        );


    const guess =
        input.value.trim();


    if (!isValidCode(guess)) {

        message.textContent =
            "⚠️ Entre exactement 3 chiffres différents.";

        message.className =
            "message error";


        input.classList.remove("shake");

        void input.offsetWidth;

        input.classList.add("shake");


        playSound("error");

        return;
    }


    attempts++;


    const result =
        calculateResult(
            secretNumber,
            guess
        );


    addHistoryItem(
        "history",
        guess,
        result
    );


    history.push({
        guess,
        ...result
    });


    stats.attempts++;

    saveStats();


    input.value = "";


    input.classList.remove(
        "number-pop"
    );

    void input.offsetWidth;

    input.classList.add(
        "number-pop"
    );


    if (result.v === 3) {

        winSoloGame();

        return;
    }


    message.textContent =
        `${result.v}V — ${result.x}X`;


    message.className =
        "message info";


    playSound("success");


    setTimeout(() => {

        if (!gameOver) {
            input.focus();
        }

    }, 50);
}


/* =========================================================
   HISTORIQUE
   ========================================================= */

function addHistoryItem(
    containerId,
    guess,
    result
) {

    const container =
        document.getElementById(
            containerId
        );


    if (!container) {
        return;
    }


    const item =
        document.createElement("div");


    item.className =
        "history-item";


    item.innerHTML = `
        <span class="history-number">
            ${guess}
        </span>

        <span class="history-result">

            <span class="history-v">
                ${result.v}V
            </span>

            <span class="history-x">
                ${result.x}X
            </span>

        </span>
    `;


    container.prepend(item);
}


/* =========================================================
   VICTOIRE SOLO
   ========================================================= */

function winSoloGame() {

    if (gameOver) {
        return;
    }


    clearInterval(timerInterval);

    gameOver = true;


    const config =
        levels[currentLevel];


    let score =
        500 +
        timeLeft * 2 +
        Math.max(
            0,
            300 - attempts * 25
        );


    score =
        Math.round(
            score *
            config.multiplier
        );


    score =
        Math.max(
            50,
            score
        );


    stats.games++;

    stats.wins++;


    if (score > stats.bestScore) {

        stats.bestScore =
            score;
    }


    saveStats();


    updateChallengesAfterWin();


    document.getElementById(
        "finalIcon"
    ).textContent = "🎉";


    document.getElementById(
        "finalTitle"
    ).textContent =
        "BRAVO !";


    document.getElementById(
        "finalMessage"
    ).textContent =
        `Code trouvé en ${attempts} essai${attempts > 1 ? "s" : ""}.`;


    document.getElementById(
        "secret"
    ).textContent =
        secretNumber;


    document.getElementById(
        "finalScore"
    ).textContent =
        score;


    updateHome();

    updateStatisticsUI();

    updateChallengesUI();


    showScreen("finalScreen");


    playWinSound();
}


/* =========================================================
   DÉFAITE SOLO
   ========================================================= */

function loseSoloGame() {

    if (gameOver) {
        return;
    }


    clearInterval(timerInterval);

    gameOver = true;


    stats.games++;

    stats.losses++;


    saveStats();


    document.getElementById(
        "finalIcon"
    ).textContent = "😔";


    document.getElementById(
        "finalTitle"
    ).textContent =
        "Temps écoulé !";


    document.getElementById(
        "finalMessage"
    ).textContent =
        "Tu n'as pas trouvé le code à temps.";


    document.getElementById(
        "secret"
    ).textContent =
        secretNumber;


    document.getElementById(
        "finalScore"
    ).textContent =
        "0";


    updateHome();

    updateStatisticsUI();


    showScreen("finalScreen");


    playLossSound();
}


/* =========================================================
   DÉFIS
   ========================================================= */

function updateChallengesAfterWin() {

    challenges.firstWin = true;


    if (stats.wins >= 5) {
        challenges.fiveWins = true;
    }


    if (stats.wins >= 10) {
        challenges.tenWins = true;
    }


    if (currentLevel === "expert") {
        challenges.expertWin = true;
    }


    if (timeLeft >=
        levels[currentLevel].time - 60) {

        challenges.fastWin = true;
    }


    if (attempts < 10) {
        challenges.noMoreTen = true;
    }


    saveChallenges();
}


function updateChallengesUI() {

    const map = {

        challengeFirstWin:
            challenges.firstWin,

        challengeFiveWins:
            challenges.fiveWins,

        challengeTenWins:
            challenges.tenWins,

        challengeExpert:
            challenges.expertWin,

        challengeFast:
            challenges.fastWin,

        challengeNoMoreTen:
            challenges.noMoreTen
    };


    Object.entries(map)
        .forEach(([id, completed]) => {

            const element =
                document.getElementById(id);


            if (!element) {
                return;
            }


            element.classList.toggle(
                "completed",
                completed
            );


            const status =
                element.querySelector(
                    ".challenge-status"
                );


            if (status) {

                status.textContent =
                    completed ? "✅" : "🔒";
            }

        });
}


/* =========================================================
   STATISTIQUES
   ========================================================= */

function updateStatisticsUI() {

    const games =
        document.getElementById(
            "statGames"
        );


    const wins =
        document.getElementById(
            "statWins"
        );


    const losses =
        document.getElementById(
            "statLosses"
        );


    const attemptsElement =
        document.getElementById(
            "statAttempts"
        );


    const best =
        document.getElementById(
            "statBestScore"
        );


    if (games) {
        games.textContent =
            stats.games;
    }


    if (wins) {
        wins.textContent =
            stats.wins;
    }


    if (losses) {
        losses.textContent =
            stats.losses;
    }


    if (attemptsElement) {
        attemptsElement.textContent =
            stats.attempts;
    }


    if (best) {
        best.textContent =
            stats.bestScore;
    }
}


function resetStatistics() {

    showPopup(
        "Réinitialiser ?",
        "Toutes tes statistiques seront supprimées.",
        () => {

            stats = {
                ...defaultStats
            };


            challenges = {
                ...defaultChallenges
            };


            saveStats();

            saveChallenges();


            updateStatisticsUI();

            updateChallengesUI();

            updateHome();


            playSound("click");
        }
    );
}


/* =========================================================
   ACCUEIL
   ========================================================= */

function updateHome() {

    const best =
        document.getElementById(
            "homeBestScore"
        );


    if (best) {

        best.textContent =
            stats.bestScore;
    }
}


/* =========================================================
   QUITTER LE SOLO
   ========================================================= */

function quitSolo() {

    if (gameOver) {

        showScreen("homeScreen");

        return;
    }


    showPopup(
        "Quitter la partie ?",
        "Ta partie en cours sera abandonnée.",
        () => {

            clearInterval(timerInterval);

            gameOver = true;

            showScreen("homeScreen");

            playSound("click");
        }
    );
}


/* =========================================================
   MODE 2 JOUEURS
   ========================================================= */

function startTwoPlayers() {

    clearInterval(twoTimerInterval);
    document.getElementById("continueTwoBtn").onclick = null;


    player1Secret = "";

    player2Secret = "";

    player1Result = null;

    player2Result = null;


    twoCurrentPlayer = 1;

    twoGameOver = false;

    twoAttempts = 0;

    twoHistory = [];


    document.getElementById(
        "p1SecretInput"
    ).value = "";


    document.getElementById(
        "p1SecretMessage"
    ).textContent = "";


    showScreen(
        "twoP1SecretScreen"
    );


    setTimeout(() => {

        document
            .getElementById(
                "p1SecretInput"
            )
            .focus();

    }, 150);


    playSound("click");
}


/* =========================================================
   SECRET JOUEUR 1
   ========================================================= */

function saveP1Secret() {

    const input =
        document.getElementById(
            "p1SecretInput"
        );


    const message =
        document.getElementById(
            "p1SecretMessage"
        );


    const code =
        input.value.trim();


    if (!isValidCode(code)) {

        message.textContent =
            "⚠️ Le code doit contenir 3 chiffres différents.";

        message.className =
            "message error";


        playSound("error");

        return;
    }


    player1Secret = code;


    input.value = "";


    document.getElementById(
        "p2SecretMessage"
    ).textContent = "";


    showScreen(
        "twoP2SecretScreen"
    );


    setTimeout(() => {

        document
            .getElementById(
                "p2SecretInput"
            )
            .focus();

    }, 150);


    playSound("success");
}


/* =========================================================
   SECRET JOUEUR 2
   ========================================================= */

function saveP2Secret() {

    const input =
        document.getElementById(
            "p2SecretInput"
        );


    const message =
        document.getElementById(
            "p2SecretMessage"
        );


    const code =
        input.value.trim();


    if (!isValidCode(code)) {

        message.textContent =
            "⚠️ Le code doit contenir 3 chiffres différents.";

        message.className =
            "message error";


        playSound("error");

        return;
    }


    player2Secret = code;


    input.value = "";


    document.getElementById(
    "passTitle"
).textContent =
    enLanguageBtn.classList.contains("active")
        ? "Pass the phone"
        : "Passe le téléphone";

document.getElementById(
    "passMessage"
).textContent =
    enLanguageBtn.classList.contains("active")
        ? "Player 1 must now take the phone."
        : "Le Joueur 1 doit maintenant prendre le téléphone.";

    showScreen(
        "twoPassScreen"
    );


    playSound("success");
}


/* =========================================================
   CONTINUER LE DUEL
   ========================================================= */

function continueTwoPlayers() {

    startTwoTurn(1);
}


/* =========================================================
   DÉMARRER UN TOUR
   ========================================================= */

function startTwoTurn(player) {

    clearInterval(twoTimerInterval);


    twoCurrentPlayer = player;

    twoTimeLeft = 180;

    twoAttempts = 0;

    twoHistory = [];

    twoGameOver = false;


   document.getElementById(
    "twoCurrentPlayer"
).textContent =
    enLanguageBtn &&
    enLanguageBtn.classList.contains("active")
        ? `PLAYER ${player}`
        : `JOUEUR ${player}`;

    document.getElementById(
        "twoGuessInput"
    ).value = "";


    document.getElementById(
        "twoMessage"
    ).textContent = "";


    document.getElementById(
        "twoMessage"
    ).className =
        "message";


    document.getElementById(
        "twoHistory"
    ).innerHTML = "";


    updateTwoTimerUI();


    showScreen(
        "twoGameScreen"
    );


    startTwoTimer();


    setTimeout(() => {

        document
            .getElementById(
                "twoGuessInput"
            )
            .focus();

    }, 150);


    playSound("click");
}


/* =========================================================
   CHRONOMÈTRE 2 JOUEURS
   ========================================================= */

function startTwoTimer() {

    clearInterval(twoTimerInterval);


    twoTimerInterval =
        setInterval(() => {

            if (twoGameOver) {

                clearInterval(
                    twoTimerInterval
                );

                return;
            }


            twoTimeLeft--;


            updateTwoTimerUI();


            if (twoTimeLeft <= 0) {

                clearInterval(
                    twoTimerInterval
                );


                twoPlayerTimeout();
            }

        }, 1000);
}


/* =========================================================
   AFFICHAGE CHRONO DUEL
   ========================================================= */

function updateTwoTimerUI() {

    const timer =
        document.getElementById(
            "twoTimer"
        );


    if (!timer) {
        return;
    }


    timer.textContent =
        formatTime(
            Math.max(0, twoTimeLeft)
        );


    const box =
        timer.closest(".timer-box");


    if (box) {

        box.classList.remove(
            "timer-warning",
            "timer-danger"
        );


        if (twoTimeLeft <= 30) {

            box.classList.add(
                "timer-danger"
            );

        } else if (twoTimeLeft <= 60) {

            box.classList.add(
                "timer-warning"
            );
        }
    }
}


/* =========================================================
   PROPOSITION DU DUEL
   ========================================================= */

function submitTwoGuess() {

    if (twoGameOver) {
        return;
    }


    const input =
        document.getElementById(
            "twoGuessInput"
        );


    const message =
        document.getElementById(
            "twoMessage"
        );


    const guess =
        input.value.trim();


    if (!isValidCode(guess)) {

        message.textContent =
            "⚠️ Entre exactement 3 chiffres différents.";

        message.className =
            "message error";


        input.classList.remove(
            "shake"
        );

        void input.offsetWidth;

        input.classList.add(
            "shake"
        );


        playSound("error");

        return;
    }


    twoAttempts++;


    const secret =
        twoCurrentPlayer === 1
            ? player2Secret
            : player1Secret;


    const result =
        calculateResult(
            secret,
            guess
        );


    addHistoryItem(
        "twoHistory",
        guess,
        result
    );


    input.value = "";


    if (result.v === 3) {

        finishTwoPlayerTurn();

        return;
    }


    message.textContent =
        `${result.v}V — ${result.x}X`;


    message.className =
        "message info";


    playSound("success");


    input.focus();
}


/* =========================================================
   FIN D'UN TOUR
   ========================================================= */

function finishTwoPlayerTurn() {

    clearInterval(twoTimerInterval);

    twoGameOver = true;


    const resultData = {
        found: true,
        time: 180 - twoTimeLeft,
        attempts: twoAttempts
    };


    if (twoCurrentPlayer === 1) {

        player1Result =
            resultData;


       document.getElementById(
    "passTitle"
).textContent =
    enLanguageBtn.classList.contains("active")
        ? "Pass the phone"
        : "Passe le téléphone";

document.getElementById(
    "passMessage"
).textContent =
    enLanguageBtn.classList.contains("active")
        ? "Player 2 can now take the phone."
        : "Le Joueur 2 peut maintenant prendre le téléphone.";

        showScreen(
            "twoPassScreen"
        );


        document.getElementById(
            "continueTwoBtn"
        ).onclick = () => {

            startTwoTurn(2);
        };


    } else {

        player2Result =
            resultData;


        finishTwoPlayers();
    }


    playSound("win");
}


/* =========================================================
   TEMPS ÉCOULÉ POUR UN JOUEUR
   ========================================================= */

function twoPlayerTimeout() {

    if (twoGameOver) {
        return;
    }


    twoGameOver = true;


    const resultData = {
        found: false,
        time: 180,
        attempts: twoAttempts
    };


    if (twoCurrentPlayer === 1) {

        player1Result =
            resultData;


       document.getElementById(
    "passTitle"
).textContent =
    enLanguageBtn.classList.contains("active")
        ? "Pass the phone"
        : "Passe le téléphone";

document.getElementById(
    "passMessage"
).textContent =
    enLanguageBtn.classList.contains("active")
        ? "Player 1 must now take the phone."
        : "Le Joueur 1 doit maintenant prendre le téléphone.";

        showScreen(
            "twoPassScreen"
        );


        document.getElementById(
            "continueTwoBtn"
        ).onclick = () => {

            startTwoTurn(2);
        };


    } else {

        player2Result =
            resultData;


        finishTwoPlayers();
    }


    playLossSound();
}


/* =========================================================
   FIN DU DUEL
   ========================================================= */

function finishTwoPlayers() {

    clearInterval(twoTimerInterval);


    let title =
        "Résultat du duel";

    let message =
        "";


    const p1 =
        player1Result;

    const p2 =
        player2Result;


    const isEnglish =
        enLanguageBtn &&
        enLanguageBtn.classList.contains("active");


    if (p1.found && p2.found) {

        if (p1.time < p2.time) {

            title =
                isEnglish
                    ? "🏆 Player 1 wins!"
                    : "🏆 Joueur 1 gagne !";

        } else if (p2.time < p1.time) {

            title =
                isEnglish
                    ? "🏆 Player 2 wins!"
                    : "🏆 Joueur 2 gagne !";

        } else {

            title =
                isEnglish
                    ? "🤝 Draw!"
                    : "🤝 Égalité !";
        }


        message =
            isEnglish
                ? "Both players found the code."
                : "Les deux joueurs ont trouvé le code.";


    } else if (p1.found) {

        title =
            isEnglish
                ? "🏆 Player 1 wins!"
                : "🏆 Joueur 1 gagne !";


        message =
            isEnglish
                ? "Player 1 found the code."
                : "Le Joueur 1 a trouvé le code.";


    } else if (p2.found) {

        title =
            isEnglish
                ? "🏆 Player 2 wins!"
                : "🏆 Joueur 2 gagne !";


        message =
            isEnglish
                ? "Player 2 found the code."
                : "Le Joueur 2 a trouvé le code.";


    } else {

        title =
            isEnglish
                ? "🤝 No winner"
                : "🤝 Aucun gagnant";


        message =
            isEnglish
                ? "Neither player found the code."
                : "Aucun joueur n'a trouvé le code.";
    }


    document.getElementById(
        "twoFinalTitle"
    ).textContent =
        title;


    document.getElementById(
        "twoFinalMessage"
    ).textContent =
        message;


    document.getElementById(
        "player1Result"
    ).textContent =
        formatPlayerResult(p1);


    document.getElementById(
        "player2Result"
    ).textContent =
        formatPlayerResult(p2);


    showScreen(
        "twoFinalScreen"
    );


    playWinSound();
}


function formatPlayerResult(result) {

    if (!result) {
        return "—";
    }

    const isEnglish =
        enLanguageBtn &&
        enLanguageBtn.classList.contains("active");

    if (!result.found) {
        return isEnglish
            ? "Time expired"
            : "Temps écoulé";
    }

    return (
        `${result.time}s • ` +
        `${result.attempts} ` +
        (
            isEnglish
                ? (result.attempts > 1 ? "attempts" : "attempt")
                : (result.attempts > 1 ? "essais" : "essai")
        )
    );
}


/* =========================================================
   QUITTER LE MODE 2 JOUEURS
   ========================================================= */

function quitTwoPlayers() {

    showPopup(
        "Quitter le duel ?",
        "La partie en cours sera abandonnée.",
        () => {

            clearInterval(
                twoTimerInterval
            );


            twoGameOver = true;


            showScreen(
                "homeScreen"
            );


            playSound("click");
        }
    );
}


/* =========================================================
   NOUVEAU DUEL
   ========================================================= */

function newTwoPlayersGame() {

    startTwoPlayers();
}


/* =========================================================
   ÉVÉNEMENTS
   ========================================================= */


/* Accueil */

document
    .getElementById("soloBtn")
    .addEventListener(
        "click",
        () => showLevels()
    );


document
    .getElementById("twoPlayersBtn")
    .addEventListener(
        "click",
        startTwoPlayers
    );
document
    .getElementById("onlineBtn")
    .addEventListener(
        "click",
        () => {

            showScreen(
                "onlineScreen"
            );

        }
    );
document
    .getElementById("createOnlineGameBtn")
    .addEventListener(
        "click",
        async () => {

            showScreen(
                "createOnlineScreen"
            );

            const game = await createOnlineGame();
            console.log("🟢 GAME CRÉÉE :", game);
            console.log("🟣 ID DE LA SALLE :", game.id);
           listenToOnlineGame(game.id);
           listenToOnlineSecrets(game.id);
           listenToOnlineChat(game.id);

        }
    );
document
    .getElementById("joinOnlineGameBtn")
    .addEventListener(
        "click",
        () => {

            showScreen(
                "joinOnlineScreen"
            );

        }
    );
console.log("🟡 TEST : bloc REJOINDRE atteint");
document
    .getElementById("confirmJoinOnlineBtn")
    .addEventListener(
        "click",
        async () => {

            console.log("🟢 BOUTON REJOINDRE CLIQUÉ");

            const input =
                document.getElementById("joinRoomCode");

            const roomCode =
                input.value.trim().toUpperCase();

            if (!roomCode) {

                document
                    .getElementById("joinOnlineMessage")
                    .textContent =
                        "⚠️ Entre le code de la partie.";

                return;
            }

            const game = await joinOnlineGame(roomCode);

if (game) {
    listenToOnlineSecrets(game.id);
}

        }
    );
document
    .getElementById("statisticsBtn")
    .addEventListener(
        "click",
        () => {

            updateStatisticsUI();

            showScreen(
                "statisticsScreen"
            );
        }
    );


document
    .getElementById("challengesBtn")
    .addEventListener(
        "click",
        () => {

            updateChallengesUI();

            showScreen(
                "challengesScreen"
            );
        }
    );


document
    .getElementById("levelsBtn")
    .addEventListener(
        "click",
        showLevels
    );


document
    .getElementById("rulesBtn")
    .addEventListener(
        "click",
        () => showScreen("rulesScreen")
    );


document
    .getElementById("soundBtn")
    .addEventListener(
        "click",
        toggleSound
    );


/* Niveaux */

document
    .querySelectorAll(".level-card")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                startSolo(
                    button.dataset.level
                );
            }
        );
    });


/* Retour */

document
    .querySelectorAll("[data-back]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                showScreen(
                    button.dataset.back
                );
            }
        );
    });


/* Jeu solo */

document
    .getElementById("guessForm")
    .addEventListener(
        "submit",
        event => {

            event.preventDefault();

            submitSoloGuess();
        }
    );


document
    .getElementById("quitGameBtn")
    .addEventListener(
        "click",
        quitSolo
    );


document
    .getElementById("playAgainBtn")
    .addEventListener(
        "click",
        () => {

            startSolo(
                currentLevel
            );
        }
    );


document
    .getElementById("finalHomeBtn")
    .addEventListener(
        "click",
        () => {

            showScreen(
                "homeScreen"
            );
        }
    );


/* Statistiques */

document
    .getElementById("resetStatsBtn")
    .addEventListener(
        "click",
        resetStatistics
    );


/* Mode 2 joueurs */

document
    .getElementById("p1SecretForm")
    .addEventListener(
        "submit",
        event => {

            event.preventDefault();

            saveP1Secret();
        }
    );


document
    .getElementById("p2SecretForm")
    .addEventListener(
        "submit",
        event => {

            event.preventDefault();

            saveP2Secret();
        }
    );


document
    .getElementById("twoGuessForm")
    .addEventListener(
        "submit",
        event => {

            event.preventDefault();

            submitTwoGuess();
        }
    );
 /* Mode en ligne */
async function loadOnlineHistory() {

    if (!currentOnlineGame || !currentUser) {
        return;
    }

    const { data, error } =
        await supabaseClient
            .from("online_guesses")
            .select(
                "player_id, guess, well_placed, misplaced"
            )
            .eq(
                "game_id",
                currentOnlineGame.id
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );

    if (error) {

        console.error(
            "❌ ERREUR HISTORIQUE :",
            error
        );

        return;
    }

    const myHistory =
        document.getElementById(
            "onlineMyHistory"
        );

    const opponentHistory =
        document.getElementById(
            "onlineOpponentHistory"
        );

    if (!myHistory || !opponentHistory) {
        return;
    }

    myHistory.innerHTML = "";
    opponentHistory.innerHTML = "";

    data.forEach(row => {

        const item =
            document.createElement("div");

        item.className =
            "online-history-item";

        item.innerHTML = `
            <span class="online-history-guess">
                ${row.guess}
            </span>

            <span class="online-history-result">
                ${row.well_placed} V ·
                ${row.misplaced} X
            </span>
        `;

        if (
            row.player_id === currentUser.id
        ) {

            myHistory.appendChild(item);

        } else {

            opponentHistory.appendChild(item);
        }

    });
}
supabaseClient
    .channel("online-guesses-history")
    .on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "online_guesses"
        },
        async (payload) => {

            console.log(
                "🟣 NOUVELLE PROPOSITION REALTIME :",
                payload.new
            );

            if (
                currentOnlineGame &&
                payload.new.game_id === currentOnlineGame.id
            ) {

                await loadOnlineHistory();
            }

        }
    )
    .subscribe((status) => {

        console.log(
            "🟢 REALTIME HISTORIQUE :",
            status
        );

    });
document
    .getElementById("onlineGuessForm")
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const input =
                document.getElementById("onlineGuessInput");

            const guess =
                input.value.trim();

            console.log(
                "🟢 PROPOSITION EN LIGNE :",
                guess
            );

            if (!/^[0-9]{3}$/.test(guess)) {

                document
                    .getElementById("onlineGameMessage")
                    .textContent =
                        "❌ Entre exactement 3 chiffres.";

                return;
            }

            if (
                guess[0] === guess[1] ||
                guess[0] === guess[2] ||
                guess[1] === guess[2]
            ) {

                document
                    .getElementById("onlineGameMessage")
                    .textContent =
                        "❌ Les 3 chiffres doivent être différents.";

                return;
            }

            const { data, error } =
    await supabaseClient.rpc(
        "submit_online_guess",
        {
            p_game_id: currentOnlineGame.id,
            p_guess: guess
        }
    );

            if (error) {

                console.error(
                    "❌ ERREUR ENREGISTREMENT PROPOSITION :",
                    error
                );

                document
                    .getElementById("onlineGameMessage")
                    .textContent =
                        "❌ Impossible d'enregistrer la proposition.";

                return;
            }

            console.log(
                "✅ PROPOSITION ENREGISTRÉE :",
                data
            );
            console.log(
    "🎯 RÉSULTAT V/X :",
    data[0]
);

            const result = data[0];
            if (result.well_placed === 3) {

    console.log("🏆 VICTOIRE ! CODE TROUVÉ :", guess);

    document
        .getElementById("onlineGameMessage")
        .textContent =
            `🏆 BRAVO ! Tu as trouvé le code ${guess} !`;

    return;
}

document
    .getElementById("onlineGameMessage")
    .textContent =
        `🔎 ${guess} → ${result.well_placed} V · ${result.misplaced} X`;

            input.value = "";
            await loadOnlineHistory();
        }
    );

document.getElementById("continueTwoBtn")
    .addEventListener("click", event => {
        const button = event.currentTarget;

        if (button.onclick) {
            return;
        }

        continueTwoPlayers();
    });

document
    .getElementById("twoPlayAgainBtn")
    .addEventListener(
        "click",
        newTwoPlayersGame
    );


document
    .getElementById("twoHomeBtn")
    .addEventListener(
        "click",
        () => {

            clearInterval(
                twoTimerInterval
            );

            showScreen(
                "homeScreen"
            );
        }
    );


document
    .getElementById("quitTwoGameBtn")
    .addEventListener(
        "click",
        quitTwoPlayers
    );


document
    .getElementById("quitTwoFromP1")
    .addEventListener(
        "click",
        quitTwoPlayers
    );


document
    .getElementById("quitTwoFromP2")
    .addEventListener(
        "click",
        quitTwoPlayers
    );


document
    .getElementById("quitTwoPassBtn")
    .addEventListener(
        "click",
        quitTwoPlayers
    );


/* Popup */

document
    .getElementById("popupCancel")
    .addEventListener(
        "click",
        closePopup
    );


document
    .getElementById("popupConfirm")
    .addEventListener(
        "click",
        () => {

            const callback =
                popupConfirmCallback;


            closePopup();


            if (callback) {
                callback();
            }
        }
    );


/* =========================================================
   EFFETS DE SAISIE
   ========================================================= */

document
    .querySelectorAll(
        ".guess-input"
    )
    .forEach(input => {

        input.addEventListener(
            "input",
            () => {

                input.value =
                    input.value
                        .replace(/\D/g, "")
                        .slice(0, 3);


                input.classList.remove(
                    "number-pop"
                );

                void input.offsetWidth;

                input.classList.add(
                    "number-pop"
                );
            }
        );
    });


/* =========================================================
   SON GLOBAL DES BOUTONS
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "button"
            );


        if (!button) {
            return;
        }


        if (
            button.id === "soundBtn" ||
            button.id === "popupConfirm" ||
            button.id === "popupCancel"
        ) {
            return;
        }


        initAudio();

        playSound("click");
    }
);

/* =========================================================
   BOUTONS DU VERDICT EN LIGNE
   ========================================================= */
document.getElementById("quitOnlineGameBtn")
    ?.addEventListener("click", () => {

        showPopup(
            "Quitter la partie ?",
            "La partie en cours sera abandonnée.",
            async () => {

    const game = currentOnlineGame;

    if (!game || !currentUser) {
        resetOnlineGameState();

        const overlay =
            document.getElementById("onlineVerdictOverlay");

        if (overlay) {
            overlay.style.display = "none";
        }

        showScreen("homeScreen");
        playSound("click");
        return;
    }

    const playerNumber =
        game.player1_id === currentUser.id ? 1 : 2;

    const opponentNumber =
        playerNumber === 1 ? 2 : 1;

    console.log(
        "🚪 QUITTER LA PARTIE — GAGNANT : JOUEUR",
        opponentNumber
    );

   const { data, error } =
    await supabaseClient.rpc(
        "quit_online_game",
        {
            p_game_id: game.id
        }
    );

console.log(
    "🚪 RÉSULTAT QUITTER :",
    data,
    error
);
    if (error) {
        console.error(
            "❌ ERREUR ENREGISTREMENT ABANDON :",
            error
        );
        return;
    }

    resetOnlineGameState();

    const overlay =
        document.getElementById("onlineVerdictOverlay");

    if (overlay) {
        overlay.style.display = "none";
    }

    showScreen("homeScreen");

    playSound("click");
}
        );

    });
document.getElementById("onlineVerdictReplayBtn")
    ?.addEventListener("click", () => {

        console.log("🔄 REJOUER : retour au lobby en ligne");

        resetOnlineGameState();

        document.getElementById("onlineVerdictOverlay").style.display = "none";

        showScreen("onlineScreen");
    });

document.getElementById("onlineVerdictHomeBtn")
    ?.addEventListener("click", () => {

        console.log("🏠 RETOUR AU MENU DEPUIS LE VERDICT");

        resetOnlineGameState();

        document.getElementById("onlineVerdictOverlay").style.display = "none";

        showScreen("homeScreen");
    });    // =================================================
// OUVERTURE D'UNE PARTIE VIA LIEN DE PARTAGE
// =================================================

const sharedRoomCode =
    new URLSearchParams(window.location.search)
        .get("room");

if (sharedRoomCode) {

    const joinInput =
        document.getElementById("joinRoomCode");

    if (joinInput) {

        joinInput.value =
            sharedRoomCode
                .trim()
                .toUpperCase();

        showScreen("joinOnlineScreen");

        console.log(
            "🔗 CODE RÉCUPÉRÉ DEPUIS LE LIEN :",
            joinInput.value
        );
    }
}
// =================================================
// REJOINDRE AUTOMATIQUEMENT UNE PARTIE VIA UN LIEN
// =================================================

async function joinSharedRoom() {

    const sharedRoomCode =
        new URLSearchParams(window.location.search)
            .get("room");

    if (!sharedRoomCode) {
        return;
    }

    const roomCode =
        sharedRoomCode
            .trim()
            .toUpperCase();

    console.log(
        "🔗 CODE PARTAGÉ DÉTECTÉ :",
        roomCode
    );

    while (!currentUser) {

        await new Promise(
            resolve => setTimeout(resolve, 100)
        );
    }

    console.log(
        "👤 UTILISATEUR PRÊT :",
        currentUser.id
    );

    const game =
        await joinOnlineGame(roomCode);

    if (game) {

        listenToOnlineSecrets(game.id);

        console.log(
            "✅ PARTIE REJOINTE AUTOMATIQUEMENT :",
            roomCode
        );
    }
}
joinSharedRoom();
/* =========================================================
   DÉTECTION DE LA HAUTEUR VISIBLE — CLAVIER MOBILE
   ========================================================= */

if (window.visualViewport) {

    function updateKeyboardState() {

        const visibleHeight =
            window.visualViewport.height;

        const screenHeight =
            window.innerHeight;

        const keyboardOpen =
            screenHeight - visibleHeight > 150;

        document.body.classList.toggle(
            "keyboard-open",
            keyboardOpen
        );

        console.log(
            "📱 HAUTEUR ÉCRAN :",
            screenHeight,
            "| HAUTEUR VISIBLE :",
            Math.round(visibleHeight),
            "| CLAVIER :",
            keyboardOpen ? "OUVERT" : "FERMÉ"
        );
    }

    window.visualViewport.addEventListener(
        "resize",
        updateKeyboardState
    );

    window.visualViewport.addEventListener(
        "scroll",
        updateKeyboardState
    );

    updateKeyboardState();
}
// ← RETOUR depuis l'écran des parties gratuites épuisées
const closeFreeGamesLimitBtn =
    document.getElementById(
        "closeFreeGamesLimitBtn"
    );

if (closeFreeGamesLimitBtn) {

    closeFreeGamesLimitBtn.addEventListener(
        "click",
        () => {

            console.log(
                "🟢 BOUTON RETOUR PARTIES GRATUITES CLIQUÉ"
            );

            document
                .getElementById("freeGamesLimitOverlay")
                .style.display = "none";

            showScreen("levelsScreen");
        }
    );

}
// 🔓 BOUTON CONTINUER À JOUER — 1 000 FCFA
const continuePaidGameBtn =
    document.getElementById("continuePaidGameBtn");

if (continuePaidGameBtn) {

    continuePaidGameBtn.addEventListener(
        "click",
        () => {

            console.log(
                "💰 CONTINUER À JOUER — 1 000 FCFA CLIQUÉ"
            );

            document
                .getElementById("freeGamesLimitOverlay")
                .style.display = "none";

            showScreen("paymentScreen");

        }
    );
}
// ← RETOUR depuis l'écran de paiement
const backFromPaymentBtn =
    document.getElementById("backFromPaymentBtn");

if (backFromPaymentBtn) {

    backFromPaymentBtn.addEventListener(
        "click",
        () => {

            console.log(
                "🟢 RETOUR DEPUIS L'ÉCRAN PAIEMENT"
            );

            document
                .getElementById("paymentScreen")
                .classList.remove("active");

            document
                .getElementById("freeGamesLimitOverlay")
                .style.display = "flex";

        }
    );

}
// 💳 BOUTON CARTE BANCAIRE
const cardPaymentBtn =
    document.getElementById("cardPaymentBtn");

if (cardPaymentBtn) {

    cardPaymentBtn.addEventListener(
        "click",
        () => {

            console.log(
                "💳 PAIEMENT PAR CARTE CLIQUÉ"
            );

            document
                .getElementById("paymentScreen")
                .classList.remove("active");

            document
                .getElementById("cardPaymentScreen")
                .classList.add("active");

        }
    );

}
// ← RETOUR depuis le paiement par carte
const backFromCardPaymentBtn =
    document.getElementById("backFromCardPaymentBtn");

if (backFromCardPaymentBtn) {

    backFromCardPaymentBtn.addEventListener(
        "click",
        () => {

            console.log(
                "🟢 RETOUR DEPUIS PAIEMENT PAR CARTE"
            );

            document
                .getElementById("cardPaymentScreen")
                .classList.remove("active");

            document
                .getElementById("paymentScreen")
                .classList.add("active");

        }
    );

}
// 🌍 SÉLECTEUR DE LANGUE
const frLanguageBtn =
    document.getElementById("frLanguageBtn");

const enLanguageBtn =
    document.getElementById("enLanguageBtn");

if (frLanguageBtn && enLanguageBtn) {

    frLanguageBtn.addEventListener(
        "click",
        () => {
            // 🏆 VERDICT DU DUEL EN LIGNE — FRANÇAIS

document.getElementById("onlineVerdictSubtitle").textContent =
    "TU AS TROUVÉ LE CODE !";

document.getElementById("onlineVerdictMessage").textContent =
    "Félicitations !";

document.querySelector(
    "#onlineVerdictPopup .verdict-code-box.winner-code .verdict-code-label"
).textContent =
    "TON CODE";

document.querySelector(
    "#onlineVerdictPopup .verdict-code-box.opponent-code .verdict-code-label"
).textContent =
    "CODE DE TON ADVERSAIRE";

document.getElementById("onlineVerdictHistoryBtn").textContent =
    "📜 HISTORIQUE";

document.querySelector(
    "#onlineVerdictPopup .verdict-history-title"
).textContent =
    "🎯 TES ESSAIS";

document.querySelectorAll(
    "#onlineVerdictPopup .verdict-history-title"
)[1].textContent =
    "⚔️ ESSAIS DE L'ADVERSAIRE";

document.querySelector(
    "#onlineVerdictPopup .verdict-summary-title"
).textContent =
    "RÉSUMÉ DE LA PARTIE";

document.querySelectorAll(
    "#onlineVerdictPopup .verdict-player strong"
)[0].textContent =
    "TOI";

document.querySelectorAll(
    "#onlineVerdictPopup .verdict-player strong"
)[1].textContent =
    "ADVERSAIRE";

document.getElementById("onlineVerdictReplayBtn").textContent =
    "🔄 REJOUER";

document.getElementById("onlineVerdictHomeBtn").textContent =
    "🏠 RETOUR AU MENU";

            console.log("🇫🇷 LANGUE : FRANÇAIS");

            frLanguageBtn.classList.add("active");
            enLanguageBtn.classList.remove("active");
                        // 🌐 ÉCRAN CRÉER UNE PARTIE — FRANÇAIS

            document.querySelector(
                "#createOnlineScreen .back-btn"
            ).textContent =
                "← Retour";

            document.querySelector(
                "#createOnlineScreen h2"
            ).textContent =
                "🎮 Créer une partie";

            document.querySelector(
                "#createOnlineScreen .two-instruction"
            ).textContent =
                "Crée une partie et invite ton adversaire.";

            document.querySelector(
                "#createOnlineScreen .room-code-label"
            ).textContent =
                "CODE DE LA PARTIE";

            document.getElementById(
                "shareOnlineGameBtn"
            ).textContent =
                "🔗 TRANSFÉRER LE LIEN";

            document.querySelector(
                "#createOnlineScreen .room-info"
            ).textContent =
                "Donne ce code à ton adversaire pour qu'il puisse rejoindre la partie.";

            document.getElementById(
                "cancelCreateOnlineBtn"
            ).textContent =
                "← Annuler";

            // ⭐ ÉCRAN DES NIVEAUX — FRANÇAIS

            document.querySelector("#levelsScreen h2").textContent =
                "Choisis ton niveau";

            document.querySelector("#levelsScreen .back-btn").textContent =
                "← Retour";

            document.querySelector(
                '#levelsScreen [data-level="beginner"] strong'
            ).textContent = "Débutant";

            document.querySelector(
                '#levelsScreen [data-level="beginner"] small'
            ).textContent = "5 minutes";

            document.querySelector(
                '#levelsScreen [data-level="intermediate"] strong'
            ).textContent = "Intermédiaire";

            document.querySelector(
                '#levelsScreen [data-level="intermediate"] small'
            ).textContent = "4 minutes";

            document.querySelector(
                '#levelsScreen [data-level="pro"] strong'
            ).textContent = "Pro";

            document.querySelector(
                '#levelsScreen [data-level="pro"] small'
            ).textContent = "3 minutes";

            document.querySelector(
                '#levelsScreen [data-level="expert"] strong'
            ).textContent = "Expert";

            document.querySelector(
                '#levelsScreen [data-level="expert"] small'
            ).textContent = "2 minutes";


            // 🏠 ÉCRAN D'ACCUEIL — FRANÇAIS

            document.getElementById("soloBtn").textContent =
                "🎯 SOLO";

            document.getElementById("twoPlayersBtn").textContent =
                "👥 2 JOUEURS — DUEL";

            document.getElementById("onlineBtn").textContent =
                "🌐 JOUER EN LIGNE";

            document.getElementById("statisticsBtn").textContent =
                "📊 STATISTIQUES";

            document.getElementById("challengesBtn").textContent =
                "🏆 DÉFIS";

            document.getElementById("levelsBtn").textContent =
                "⭐ NIVEAUX";

            document.getElementById("rulesBtn").textContent =
                "📖 RÈGLES";

            document.querySelector(".tagline").textContent =
                "Trouve le code. Bat le chrono.";

            document.querySelector(".best-score-box span").textContent =
                "🏆 Meilleur score";


            // 👥 DUEL 2 JOUEURS — FRANÇAIS

            document.querySelector(
                "#twoGameScreen .two-turn-banner span"
            ).textContent =
                "JOUEUR 1";

            document.querySelector(
                "#twoGameScreen .timer-label"
            ).textContent =
                "TEMPS";

            document.querySelector(
                "#twoGameScreen .game-title h2"
            ).textContent =
                "Trouve le code";

            document.querySelector(
                "#twoGameScreen .game-title p"
            ).textContent =
                "Les 3 chiffres sont différents.";

            document.querySelector(
                "#twoGameScreen .guess-btn"
            ).textContent =
                "DEVINER";

            document.querySelector(
                "#twoGameScreen .rules-mini span:nth-child(1)"
            ).innerHTML =
                '<b class="v-color">V</b> = bien placé';

            document.querySelector(
                "#twoGameScreen .rules-mini span:nth-child(2)"
            ).innerHTML =
                '<b class="x-color">X</b> = mal placé';

            document.querySelector(
                "#twoGameScreen .section-title"
            ).textContent =
                "Historique";

            document.getElementById("quitTwoGameBtn").textContent =
                "← Abandonner";


            // 👥 DUEL 2 JOUEURS — CODES SECRETS — FRANÇAIS

            document.querySelector(
                "#twoP1SecretScreen .two-turn-banner"
            ).textContent =
                "👤 JOUEUR 1";

            document.querySelector(
                "#twoP1SecretScreen h2"
            ).textContent =
                "Choisis ton code secret";

            document.querySelector(
                "#twoP1SecretScreen .two-instruction"
            ).textContent =
                "Le joueur 2 devra deviner ton code.";

            document.querySelector(
                "#twoP1SecretScreen .guess-btn"
            ).textContent =
                "VALIDER";

            document.getElementById("quitTwoFromP1").textContent =
                "← Quitter";


            document.querySelector(
                "#twoP2SecretScreen .two-turn-banner"
            ).textContent =
                "👤 JOUEUR 2";

            document.querySelector(
                "#twoP2SecretScreen h2"
            ).textContent =
                "Choisis ton code secret";

            document.querySelector(
                "#twoP2SecretScreen .two-instruction"
            ).textContent =
                "Le joueur 1 devra deviner ton code.";

            document.querySelector(
                "#twoP2SecretScreen .guess-btn"
            ).textContent =
                "VALIDER";

            document.getElementById("quitTwoFromP2").textContent =
                "← Quitter";


            // 🏆 ÉCRAN FINAL DU DUEL — FRANÇAIS

            document.getElementById("twoPlayAgainBtn").textContent =
                "🔄 Nouveau duel";

            document.getElementById("twoHomeBtn").textContent =
                "🏠 Accueil";

            document.querySelector(
                "#twoFinalScreen .player-result-card:nth-child(1) span"
            ).textContent =
                "👤 Joueur 1";

            document.querySelector(
                "#twoFinalScreen .player-result-card:nth-child(2) span"
            ).textContent =
                "👤 Joueur 2";


            // 📱 ÉCRAN PASSE LE TÉLÉPHONE — FRANÇAIS

            document.getElementById("continueTwoBtn").textContent =
                "CONTINUER";

            document.getElementById("quitTwoPassBtn").textContent =
                "← Quitter";
                // 🌐 DUEL EN LIGNE — FRANÇAIS

document.getElementById("quitOnlineGameBtn").textContent =
    "← Quitter";

document.querySelector(
    "#onlineGameScreen .timer-label"
).textContent =
    "TEMPS";

document.querySelector(
    "#onlineGameScreen .game-title h2"
).textContent =
    "Trouve le code";

document.querySelector(
    "#onlineGameScreen .game-title p"
).textContent =
    "Les 3 chiffres sont différents.";

document.getElementById("onlineChatInput").placeholder =
    "Écris un message...";

document.getElementById("onlineChatSendBtn").textContent =
    "ENVOYER";

document.querySelector(
    "#onlineGameScreen .online-history-title"
).textContent =
    "👤 TOI";

document.querySelectorAll(
    "#onlineGameScreen .online-history-title"
)[1].textContent =
    "👤 ADVERSAIRE";

document.getElementById("onlineGuessInput").setAttribute(
    "aria-label",
    "Entre une proposition à trois chiffres"
);

document.getElementById("onlineGuessBtn").textContent =
    "DEVINER";

document.querySelector(
    "#onlineGameScreen .rules-mini span:nth-child(1)"
).innerHTML =
    '<b class="v-color">V</b> = bien placé';

document.querySelector(
    "#onlineGameScreen .rules-mini span:nth-child(2)"
).innerHTML =
    '<b class="x-color">X</b> = mal placé';

document.querySelector(
    "#onlineGameScreen .section-title"
).textContent =
    "Historique";

        }
    );


    enLanguageBtn.addEventListener(
        "click",
        () => {

            console.log("🇬🇧 LANGUE : ANGLAIS");

            enLanguageBtn.classList.add("active");
            frLanguageBtn.classList.remove("active");


            // ⭐ LEVELS SCREEN — ENGLISH

            document.querySelector("#levelsScreen h2").textContent =
                "Choose your level";

            document.querySelector("#levelsScreen .back-btn").textContent =
                "← Back";

            document.querySelector(
                '#levelsScreen [data-level="beginner"] strong'
            ).textContent = "Beginner";

            document.querySelector(
                '#levelsScreen [data-level="beginner"] small'
            ).textContent = "5 minutes";

            document.querySelector(
                '#levelsScreen [data-level="intermediate"] strong'
            ).textContent = "Intermediate";

            document.querySelector(
                '#levelsScreen [data-level="intermediate"] small'
            ).textContent = "4 minutes";

            document.querySelector(
                '#levelsScreen [data-level="pro"] strong'
            ).textContent = "Pro";

            document.querySelector(
                '#levelsScreen [data-level="pro"] small'
            ).textContent = "3 minutes";

            document.querySelector(
                '#levelsScreen [data-level="expert"] strong'
            ).textContent = "Expert";

            document.querySelector(
                '#levelsScreen [data-level="expert"] small'
            ).textContent = "2 minutes";


            // 🏠 HOME SCREEN — ENGLISH

            document.getElementById("soloBtn").textContent =
                "🎯 SOLO";

            document.getElementById("twoPlayersBtn").textContent =
                "👥 2 PLAYERS — DUEL";

            document.getElementById("onlineBtn").textContent =
                "🌐 PLAY ONLINE";

            document.getElementById("statisticsBtn").textContent =
                "📊 STATISTICS";

            document.getElementById("challengesBtn").textContent =
                "🏆 CHALLENGES";

            document.getElementById("levelsBtn").textContent =
                "⭐ LEVELS";

            document.getElementById("rulesBtn").textContent =
                "📖 RULES";

            document.querySelector(".tagline").textContent =
                "Find the code. Beat the clock.";

            document.querySelector(".best-score-box span").textContent =
                "🏆 Best score";


            // 👥 2-PLAYER DUEL — ENGLISH

            document.querySelector(
                "#twoGameScreen .two-turn-banner span"
            ).textContent =
                "PLAYER 1";

            document.querySelector(
                "#twoGameScreen .timer-label"
            ).textContent =
                "TIME";

            document.querySelector(
                "#twoGameScreen .game-title h2"
            ).textContent =
                "Find the code";

            document.querySelector(
                "#twoGameScreen .game-title p"
            ).textContent =
                "The 3 digits are different.";

            document.querySelector(
                "#twoGameScreen .guess-btn"
            ).textContent =
                "GUESS";

            document.querySelector(
                "#twoGameScreen .rules-mini span:nth-child(1)"
            ).innerHTML =
                '<b class="v-color">V</b> = correct position';

            document.querySelector(
                "#twoGameScreen .rules-mini span:nth-child(2)"
            ).innerHTML =
                '<b class="x-color">X</b> = wrong position';

            document.querySelector(
                "#twoGameScreen .section-title"
            ).textContent =
                "History";

            document.getElementById("quitTwoGameBtn").textContent =
                "← Quit";


            // 👥 2-PLAYER DUEL — SECRET CODE SCREENS — ENGLISH

            document.querySelector(
                "#twoP1SecretScreen .two-turn-banner"
            ).textContent =
                "👤 PLAYER 1";

            document.querySelector(
                "#twoP1SecretScreen h2"
            ).textContent =
                "Choose your secret code";

            document.querySelector(
                "#twoP1SecretScreen .two-instruction"
            ).textContent =
                "Player 2 will have to guess your code.";

            document.querySelector(
                "#twoP1SecretScreen .guess-btn"
            ).textContent =
                "CONFIRM";

            document.getElementById("quitTwoFromP1").textContent =
                "← Quit";


            document.querySelector(
                "#twoP2SecretScreen .two-turn-banner"
            ).textContent =
                "👤 PLAYER 2";

            document.querySelector(
                "#twoP2SecretScreen h2"
            ).textContent =
                "Choose your secret code";

            document.querySelector(
                "#twoP2SecretScreen .two-instruction"
            ).textContent =
                "Player 1 will have to guess your code.";

            document.querySelector(
                "#twoP2SecretScreen .guess-btn"
            ).textContent =
                "CONFIRM";

            document.getElementById("quitTwoFromP2").textContent =
                "← Quit";


            // 🏆 FINAL DUEL SCREEN — ENGLISH

            document.getElementById("twoPlayAgainBtn").textContent =
                "🔄 New duel";

            document.getElementById("twoHomeBtn").textContent =
                "🏠 Home";

            document.querySelector(
                "#twoFinalScreen .player-result-card:nth-child(1) span"
            ).textContent =
                "👤 Player 1";

            document.querySelector(
                "#twoFinalScreen .player-result-card:nth-child(2) span"
            ).textContent =
                "👤 Player 2";


            // 📱 PASS THE PHONE SCREEN — ENGLISH

            document.getElementById("continueTwoBtn").textContent =
                "CONTINUE";

            document.getElementById("quitTwoPassBtn").textContent =
                "← Quit";
                // 🌐 ONLINE DUEL — ENGLISH

document.getElementById("quitOnlineGameBtn").textContent =
    "← Quit";

document.querySelector(
    "#onlineGameScreen .timer-label"
).textContent =
    "TIME";

document.querySelector(
    "#onlineGameScreen .game-title h2"
).textContent =
    "Find the code";

document.querySelector(
    "#onlineGameScreen .game-title p"
).textContent =
    "The 3 digits are different.";

document.getElementById("onlineChatInput").placeholder =
    "Write a message...";

document.getElementById("onlineChatSendBtn").textContent =
    "SEND";

document.querySelector(
    "#onlineGameScreen .online-history-title"
).textContent =
    "👤 YOU";

document.querySelectorAll(
    "#onlineGameScreen .online-history-title"
)[1].textContent =
    "👤 OPPONENT";

document.getElementById("onlineGuessInput").setAttribute(
    "aria-label",
    "Enter a three-digit guess"
);

document.getElementById("onlineGuessBtn").textContent =
    "GUESS";

document.querySelector(
    "#onlineGameScreen .rules-mini span:nth-child(1)"
).innerHTML =
    '<b class="v-color">V</b> = correct position';

document.querySelector(
    "#onlineGameScreen .rules-mini span:nth-child(2)"
).innerHTML =
    '<b class="x-color">X</b> = wrong position';

document.querySelector(
    "#onlineGameScreen .section-title"
).textContent =
    "History";
    // 🏆 VERDICT DU DUEL EN LIGNE — ENGLISH

document.getElementById("onlineVerdictSubtitle").textContent =
    "YOU FOUND THE CODE!";

document.getElementById("onlineVerdictMessage").textContent =
    "Congratulations!";

document.querySelector(
    "#onlineVerdictPopup .verdict-code-box.winner-code .verdict-code-label"
).textContent =
    "YOUR CODE";

document.querySelector(
    "#onlineVerdictPopup .verdict-code-box.opponent-code .verdict-code-label"
).textContent =
    "YOUR OPPONENT'S CODE";

document.getElementById("onlineVerdictHistoryBtn").textContent =
    "📜 HISTORY";

document.querySelector(
    "#onlineVerdictPopup .verdict-history-title"
).textContent =
    "🎯 YOUR GUESSES";

document.querySelectorAll(
    "#onlineVerdictPopup .verdict-history-title"
)[1].textContent =
    "⚔️ OPPONENT'S GUESSES";

document.querySelector(
    "#onlineVerdictPopup .verdict-summary-title"
).textContent =
    "GAME SUMMARY";

document.querySelectorAll(
    "#onlineVerdictPopup .verdict-player strong"
)[0].textContent =
    "YOU";

document.querySelectorAll(
    "#onlineVerdictPopup .verdict-player strong"
)[1].textContent =
    "OPPONENT";

document.getElementById("onlineVerdictReplayBtn").textContent =
    "🔄 PLAY AGAIN";

document.getElementById("onlineVerdictHomeBtn").textContent =
    "🏠 BACK TO MENU";

        }
    );

}

        /* =========================================================
   INITIALISATION
   ========================================================= */

updateHome();

updateStatisticsUI();

updateChallengesUI();

updateSoundButton();


/* =========================================================
   FIN
   ========================================================= */
