// Main Game Script
// Assumes globally loaded: LEVELS, ChessGame, BoardRenderer, confetti

// Application State
const appState = {
    game: null,
    renderer: null,
    mode: 'menu',
    currentLevelId: null,
    pendingPromotion: null,
    isOnline: false,
    isMyTurn: true,
    playerColor: 'w'
};

// UI Elements
let ui = {};

// Connection status element
let connectionStatus = null;

// Initialize Game
function initApp() {
    ui = {
        menu: document.getElementById('main-menu'),
        levelMenu: document.getElementById('level-menu'),
        onlineMenu: document.getElementById('online-menu'),
        promotionDialog: document.getElementById('promotion-dialog'),
        promotionOptions: document.getElementById('promotion-options'),
        gameInterface: document.getElementById('game-interface'),
        statusToast: document.getElementById('game-status'),
        statusText: document.getElementById('status-text'),
        moveList: document.getElementById('move-list'),
        capturedWhite: document.getElementById('captured-white'),
        capturedBlack: document.getElementById('captured-black'),
        levelGrid: document.getElementById('levels-grid'),
        playerLabel: document.getElementById('player-name'),
        opponentLabel: document.getElementById('opponent-name'),
        roomCode: document.getElementById('room-code'),
        roomCodeDisplay: document.getElementById('room-code-display'),
        roomInfo: document.getElementById('room-info'),
        playerNameInput: document.getElementById('player-name-input'),
        endgameOverlay: document.getElementById('endgame-overlay'),
        endgameTitle: document.getElementById('endgame-title'),
        endgameSubtitle: document.getElementById('endgame-subtitle')
    };

    appState.game = new ChessGame();
    appState.renderer = new BoardRenderer('board', appState.game, handleMoveAttempt);

    setupLevelGrid();
    setupMultiplayer();
}

// Hide all menu overlays
function hideAllMenus() {
    ui.menu.classList.add('hidden');
    ui.levelMenu.classList.add('hidden');
    ui.onlineMenu.classList.add('hidden');
    ui.promotionDialog.classList.add('hidden');
    if (ui.endgameOverlay) {
        ui.endgameOverlay.classList.add('hidden');
    }
}

// Show main menu
function showMainMenu() {
    hideAllMenus();
    ui.menu.classList.remove('hidden');
    if (ui.gameInterface) {
        ui.gameInterface.classList.add('hidden');
    }
    if (ui.roomInfo) {
        ui.roomInfo.classList.add('hidden');
    }
    if (ui.roomCodeDisplay) {
        ui.roomCodeDisplay.textContent = '';
    }
    if (connectionStatus) {
        connectionStatus.remove();
        connectionStatus = null;
    }
    if (appState.isOnline) {
        chessMultiplayer.disconnect();
        appState.isOnline = false;
        appState.isMyTurn = true;
    }
}

// Setup multiplayer event handlers
function setupMultiplayer() {
    chessMultiplayer.onRoomCreated = (roomId) => {
        console.log('Room created callback received:', roomId);
        if (roomId) {
            ui.roomCodeDisplay.textContent = roomId;
            ui.roomInfo.classList.remove('hidden');
            showConnectionStatus('Sala creada - Esperando oponente', 'connected');
        } else {
            console.error('Room created but no roomId received');
            showConnectionStatus('Error: Sin código de sala', 'disconnected');
            ui.roomCodeDisplay.textContent = 'SIN CÓDIGO';
        }
    };

    chessMultiplayer.onRoomJoined = async (offer, roomId) => {
        await chessMultiplayer.handleOffer(offer, roomId);
        showConnectionStatus('Conectado', 'connected');
        // Start the game after handling the offer
        setTimeout(() => {
            startOnlineGame();
        }, 500);
    };

    chessMultiplayer.onGuestJoined = () => {
        ui.roomInfo.classList.add('hidden');
        startOnlineGame();
    };

    chessMultiplayer.onConnectCallback = () => {
        if (connectionStatus) {
            connectionStatus.remove();
            connectionStatus = null;
        }
    };

    chessMultiplayer.onDisconnectCallback = () => {
        showConnectionStatus('Oponente desconectado', 'disconnected');
    };

    chessMultiplayer.onPlayerNameReceived = (opponentName) => {
        console.log('Received opponent name:', opponentName);
        updatePlayerNames();
        // Forzar actualización inmediata de la UI
        setTimeout(() => {
            updatePlayerNames();
        }, 100);
    };

    chessMultiplayer.onMoveCallback = (move) => {
        // Apply opponent's move
        const success = appState.game.move(move.from, move.to, move.promotion);
        if (success) {
            appState.isMyTurn = true;
            updateUI();
            // Forzar múltiples renders para asegurar sincronización
            appState.renderer.render();
            setTimeout(() => {
                appState.renderer.render();
            }, 50);
            setTimeout(() => {
                appState.renderer.render();
            }, 200);
            checkGameOver();
        }
    };
}

// Show online menu
function showOnlineMenu() {
    hideAllMenus();
    ui.onlineMenu.classList.remove('hidden');
}

// Create online game
function createOnlineGame() {
    // Get player name from input
    const playerName = ui.playerNameInput.value.trim() || 'Jugador';
    chessMultiplayer.setPlayerName(playerName);

    appState.isOnline = true;
    appState.isMyTurn = true;
    appState.playerColor = 'w';

    console.log('Creating online game...');
    showConnectionStatus('Creando sala...', 'connecting');

    // Show room info immediately with loading state
    ui.roomCodeDisplay.textContent = 'GENERANDO...';
    ui.roomInfo.classList.remove('hidden');

    chessMultiplayer.createRoom().catch(error => {
        console.error('Error creating room:', error);
        showConnectionStatus('Error al crear sala', 'disconnected');
        ui.roomCodeDisplay.textContent = 'ERROR';
    });
}

// Join online game
function joinOnlineGame() {
    const roomCode = ui.roomCode.value.trim().toUpperCase();
    if (roomCode.length === 6) {
        // Get player name from input
        const playerName = ui.playerNameInput.value.trim() || 'Jugador';
        chessMultiplayer.setPlayerName(playerName);

        appState.isOnline = true;
        appState.isMyTurn = false;
        appState.playerColor = 'b';
        chessMultiplayer.joinRoom(roomCode);
        showConnectionStatus('Uniéndose...', 'connecting');
    } else {
        showStatus('Código inválido', 2000);
    }
}

// Start online game
function startOnlineGame() {
    hideAllMenus();
    ui.gameInterface.classList.remove('hidden');

    if (connectionStatus) {
        connectionStatus.remove();
        connectionStatus = null;
    }

    appState.game.reset();
    appState.renderer.render();
    updatePlayerNames();
    updateUI();
}

// Update player names display
function updatePlayerNames() {
    const names = chessMultiplayer.getPlayerNames();

    if (chessMultiplayer.isHost) {
        ui.playerLabel.textContent = `${names.local} (Blancas)`;
        ui.opponentLabel.textContent = `${names.opponent} (Negras)`;
    } else {
        ui.playerLabel.textContent = `${names.local} (Negras)`;
        ui.opponentLabel.textContent = `${names.opponent} (Blancas)`;
    }
}

// Show connection status
function showConnectionStatus(text, status) {
    if (!connectionStatus) {
        connectionStatus = document.createElement('div');
        connectionStatus.className = 'connection-status';
        document.body.appendChild(connectionStatus);
    }

    connectionStatus.textContent = text;
    connectionStatus.className = `connection-status ${status}`;
}

// --- FIDE Chess Clock Implementation ---
class ChessClock {
    constructor(minutes, increment, onTimeOut, onTick) {
        this.baseTime = minutes * 60 * 1000;
        this.increment = increment * 1000;
        this.timers = { w: this.baseTime, b: this.baseTime };
        this.activeColor = null;
        this.lastTick = null;
        this.interval = null;
        this.onTimeOut = onTimeOut;
        this.onTick = onTick;
    }

    start(color) {
        this.stop();
        this.activeColor = color;
        this.lastTick = Date.now();
        this.interval = setInterval(() => this.tick(), 50); // More frequent updates for smoother feel
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    tick() {
        if (!this.activeColor) return;
        const now = Date.now();
        const delta = now - this.lastTick;
        this.lastTick = now;

        this.timers[this.activeColor] -= delta;

        if (this.timers[this.activeColor] <= 0) {
            this.timers[this.activeColor] = 0;
            this.stop();
            this.onTimeOut(this.activeColor);
        }

        this.onTick(this.timers);
    }

    switch(newColor) {
        if (this.activeColor) {
            this.timers[this.activeColor] += this.increment;
        }
        this.start(newColor);
    }

    formatTime(ms) {
        const totalSeconds = Math.ceil(ms / 1000);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
}

// Global clock instance
let chessClock = null;

// Game Flow Logic
function startGame(mode, levelId = null) {
    appState.mode = mode; // 'tutorial', 'level', 'local', 'vs-cpu'
    appState.game.reset();

    // Initialize Clock from UI
    const timeVal = document.getElementById('time-select').value;
    if (timeVal !== 'none') {
        const [mins, inc] = timeVal.split('+').map(Number);
        chessClock = new ChessClock(mins, inc, handleTimeOut, updateClockUI);
        document.getElementById('player-clock').classList.remove('hidden');
        document.getElementById('opponent-clock').classList.remove('hidden');
        updateClockUI(chessClock.timers);
    } else {
        chessClock = null;
        document.getElementById('player-clock').classList.add('hidden');
        document.getElementById('opponent-clock').classList.add('hidden');
    }

    // Set labels
    if (mode === 'vs-cpu') {
        ui.playerLabel.textContent = "Tú (Blancas)";
        ui.opponentLabel.textContent = "Computadora (Inteligente)";
    } else if (mode === 'online') {
        // Names set by multiplayer handlers
    } else {
        ui.playerLabel.textContent = "Jugador 1 (Blancas)";
        ui.opponentLabel.textContent = "Jugador 2 (Negras)";
    }

    if (mode === 'tutorial' || mode === 'level') {
        const level = LEVELS.find(l => l.id === (levelId || 'tutorial-1'));
        if (level) {
            appState.game.loadLevel(level);
            appState.currentLevelId = level.id;
            const diff = level.category.includes('Desafío') ? 'Desafío' : 'Tutorial';
            ui.opponentLabel.textContent = diff;
            showStatus(level.title + ": " + level.description, 5000);
        }
    } else if (mode === 'vs-cpu') {
        showStatus("Modo vs CPU. Prepárate...", 2000);
    } else if (mode === 'local') {
        appState.currentLevelId = null;
        showStatus("Modo 2 Jugadores. ¡Suerte!", 2000);
    }

    updateUI();
    hideAllMenus();
    ui.gameInterface.classList.remove('hidden');

    // Start clock if first move is always white
    if (chessClock) {
        chessClock.start('w');
    }

    // Render initial board
    appState.renderer.render();
}

function handleTimeOut(color) {
    const winner = color === 'w' ? 'Negras' : 'Blancas';
    const message = `¡Tiempo agotado! Ganan las ${winner}.`;
    showGameOverOverlay("Perdió por tiempo", message);
}

function updateClockUI(timers) {
    const pClock = document.getElementById('player-clock');
    const oClock = document.getElementById('opponent-clock');

    // Update Times
    if (appState.playerColor === 'w') {
        pClock.textContent = chessClock.formatTime(timers.w);
        oClock.textContent = chessClock.formatTime(timers.b);
    } else {
        pClock.textContent = chessClock.formatTime(timers.b);
        oClock.textContent = chessClock.formatTime(timers.w);
    }

    // Handle Active States & Colors
    pClock.classList.remove('active', 'low-time');
    oClock.classList.remove('active', 'low-time');

    const activeColor = chessClock.activeColor;
    const playerActualColor = appState.playerColor;

    if (activeColor === playerActualColor) {
        pClock.classList.add('active');
    } else if (activeColor) {
        oClock.classList.add('active');
    }

    // Low time warning (< 15 seconds)
    if (timers.w < 15000) (playerActualColor === 'w' ? pClock : oClock).classList.add('low-time');
    if (timers.b < 15000) (playerActualColor === 'b' ? pClock : oClock).classList.add('low-time');
}

function handleMoveAttempt(from, to) {
    // If vs CPU and it's computers turn, block input
    if (appState.mode === 'vs-cpu' && appState.game.getTurn() === 'b') {
        return false;
    }

    const moveInfo = appState.game.getLegalMoves(from).find(m => m.to === to);

    if (!moveInfo) return false;

    if (moveInfo.promotion) {
        appState.pendingPromotion = { from, to };
        showPromotionDialog(appState.game.getTurn());
        return false;
    }

    return executeMove(from, to);
}

function executeMove(from, to, promotionPiece = null) {
    // Check if it's online and not my turn
    if (appState.isOnline && !appState.isMyTurn) {
        return false;
    }

    const result = appState.game.move(from, to, promotionPiece);

    if (result) {
        // Send move to opponent if online
        if (appState.isOnline) {
            chessMultiplayer.sendMove({
                from: from,
                to: to,
                promotion: promotionPiece
            });
            appState.isMyTurn = false;
        }

        onMoveComplete();
        return true;
    }
    return false;
}

function onMoveComplete() {
    if (chessClock) {
        chessClock.switch(appState.game.getTurn());
    }
    updateUI();

    // Forzar múltiples renders para asegurar sincronización en todos los dispositivos
    appState.renderer.render();
    setTimeout(() => {
        appState.renderer.render();
    }, 10);
    setTimeout(() => {
        appState.renderer.render();
    }, 100);

    if (checkGameOver()) {
        if (chessClock) chessClock.stop();
        return;
    }

    // Trigger AI if needed
    if (appState.mode === 'vs-cpu' && appState.game.getTurn() === 'b') {
        setTimeout(async () => {
            showStatus("Computadora pensando...", 0);
            const aiMove = await appState.game.makeComputerMoveAsync();
            ui.statusToast.classList.add('hidden');
            if (aiMove) {
                onMoveComplete();
            }
        }, 1500); // 1.5 seconds delay to make it more equitable and consume clock time
    }
}

function checkGameOver() {
    const state = appState.game.getGameOverState();
    if (state) {
        setTimeout(() => {
            let title = "Juego terminado";
            let subtitle = state.reason;

            if (state.type === 'checkmate') {
                const winner = state.winner === 'w' ? "Blancas" : "Negras";
                subtitle = `¡Jaque Mate! Ganan las ${winner}.`;
                triggerVictory();
            }

            showGameOverOverlay(title, subtitle);
        }, 500);
        return true;
    }

    // Custom Level conditions
    const win = appState.game.checkWinCondition();
    if (win) {
        setTimeout(() => {
            showGameOverOverlay("¡Nivel Completado!", "Has cumplido el objetivo del nivel.");
            triggerVictory();
            setTimeout(() => showLevels(), 3000);
        }, 500);
        return true;
    }
    return false;
}

function showGameOverOverlay(title, subtitle) {
    showStatus(subtitle, 0);
    if (ui.endgameOverlay && ui.endgameTitle && ui.endgameSubtitle) {
        ui.endgameTitle.textContent = title;
        ui.endgameSubtitle.textContent = subtitle;
        ui.endgameOverlay.classList.remove('hidden');
    }
}

// Technical Handlers
function copyPGN() {
    const pgn = appState.game.getPGN();
    navigator.clipboard.writeText(pgn).then(() => {
        showStatus("PGN copiado al portapapeles", 2000);
    });
}

function showTechnicalMenu() {
    document.getElementById('tech-dialog').classList.remove('hidden');
    document.getElementById('fen-input').value = appState.game.getFen();
    document.getElementById('pgn-input').value = appState.game.getPGN();
}

function hideTechMenu() {
    document.getElementById('tech-dialog').classList.add('hidden');
}

function loadFromFEN() {
    const fen = document.getElementById('fen-input').value.trim();
    if (appState.game.loadFen(fen)) {
        appState.renderer.render();
        updateUI();
        hideTechMenu();
        showStatus("Posición FEN cargada", 2000);
    } else {
        alert("FEN inválido");
    }
}

function loadFromPGN() {
    const pgn = document.getElementById('pgn-input').value.trim();
    if (appState.game.loadPGN(pgn)) {
        appState.renderer.render();
        updateUI();
        hideTechMenu();
        showStatus("Partida PGN cargada", 2000);
    } else {
        alert("PGN inválido");
    }
}

function triggerVictory() {
    if (typeof confetti !== 'undefined') {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}

// Promotion Logic
function showPromotionDialog(color) {
    ui.promotionOptions.innerHTML = '';
    const pieces = ['q', 'r', 'b', 'n'];
    const pieceUnicode = appState.renderer.pieceUnicode[color];

    pieces.forEach(p => {
        const btn = document.createElement('div');
        btn.className = `promo-btn piece-${color}`;
        btn.textContent = pieceUnicode[p];
        btn.style.fontSize = '3rem';
        btn.style.cursor = 'pointer';
        btn.style.padding = '1rem';
        btn.style.border = '2px solid var(--primary)';
        btn.style.borderRadius = '8px';
        btn.style.background = 'rgba(255, 255, 255, 0.1)';
        btn.onclick = () => confirmPromotion(p);
        ui.promotionOptions.appendChild(btn);
    });

    ui.promotionDialog.classList.remove('hidden');
}

function confirmPromotion(pieceChar) {
    ui.promotionDialog.classList.add('hidden');
    if (appState.pendingPromotion) {
        const { from, to } = appState.pendingPromotion;
        executeMove(from, to, pieceChar);
        appState.pendingPromotion = null;
    }
}

function updateUI() {
    // 1. Move History
    const history = appState.game.getMoveHistory({ verbose: true });
    ui.moveList.innerHTML = '';
    // Group moves de 2 en 2 (blancas / negras)
    for (let i = 0; i < history.length; i += 2) {
        const row = document.createElement('div');
        row.className = 'move-row';
        const whiteMove = history[i].san;
        const blackMove = history[i + 1] ? history[i + 1].san : '';
        row.innerHTML = `<span>${i / 2 + 1}.</span> <span>${whiteMove}</span> <span>${blackMove}</span>`;
        ui.moveList.appendChild(row);
    }
    // Mantener el scroll mostrando siempre las últimas jugadas
    ui.moveList.scrollTop = ui.moveList.scrollHeight;

    // 2. Captured Pieces (Icons)
    const captured = appState.game.getCapturedPieces();
    renderCaptured(ui.capturedWhite, captured.w, 'w');
    renderCaptured(ui.capturedBlack, captured.b, 'b');
}

function renderCaptured(container, pieces, colorGroup) {
    container.innerHTML = '';
    const targetColor = container === ui.capturedWhite ? 'b' : 'w';

    pieces.forEach(p => {
        const span = document.createElement('span');
        span.className = `captured-piece piece-${targetColor}`;
        span.textContent = appState.renderer.pieceUnicode[targetColor][p];
        span.style.fontSize = '20px';
        span.style.marginRight = '2px';
        container.appendChild(span);
    });
}

// (Status helper is defined later with duration handling)

// Menu Functions
function showLevels() {
    hideAllMenus();
    ui.levelMenu.classList.remove('hidden');
}

function setupLevelGrid() {
    ui.levelGrid.innerHTML = '';

    // Group levels by category
    const categories = {};
    LEVELS.forEach(level => {
        if (!categories[level.category]) {
            categories[level.category] = [];
        }
        categories[level.category].push(level);
    });

    Object.keys(categories).forEach(category => {
        // Create category container
        const categoryGroup = document.createElement('div');
        categoryGroup.className = 'level-category-group';

        // Category Header
        const header = document.createElement('h3');
        header.className = 'level-category-header';
        header.textContent = category;
        categoryGroup.appendChild(header);

        // Buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'level-buttons-grid';

        categories[category].forEach(level => {
            const btn = document.createElement('button');
            btn.className = 'btn secondary level-btn';
            btn.innerHTML = `
                <div class="level-btn-content">
                    <strong>${level.title}</strong>
                    <span class="level-desc">${level.description || level.category}</span>
                </div>
            `;
            btn.onclick = () => startGame('level', level.id);
            buttonsContainer.appendChild(btn);
        });

        categoryGroup.appendChild(buttonsContainer);
        ui.levelGrid.appendChild(categoryGroup);
    });
}

// Controls
function undoMove() {
    appState.game.game.undo();
    if (appState.mode === 'vs-cpu') appState.game.game.undo();
    appState.renderer.render();
    updateUI();
}

function resetGame() {
    if (confirm("¿Reiniciar partida?")) {
        startGame(appState.mode, appState.currentLevelId);
    }
}

function showStatus(text, duration = 3000) {
    ui.statusText.textContent = text;
    ui.statusToast.classList.remove('hidden');
    if (duration > 0) {
        setTimeout(() => {
            ui.statusToast.classList.add('hidden');
        }, duration);
    }
}

// Initialize on Load
document.addEventListener('DOMContentLoaded', initApp);
