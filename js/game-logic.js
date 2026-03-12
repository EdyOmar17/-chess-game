// Wrapper for Chess.js
// Defined as global class for direct browser usage

class ChessGame {
    constructor() {
        if (typeof Chess === 'undefined') {
            console.error("Chess.js library not loaded!");
            return;
        }
        this.game = new Chess();
        this.sounds = {
            move: () => chessSounds?.playMove(),
            capture: () => chessSounds?.playCapture(),
            notify: () => chessSounds?.playCheck()
        };
        this.currentLevel = null;

        // Piece Square Tables (Simplified) - encouraging center control
        this.positionTables = {
            'n': [
                -50, -40, -30, -30, -30, -30, -40, -50,
                -40, -20, 0, 0, 0, 0, -20, -40,
                -30, 0, 10, 15, 15, 10, 0, -30,
                -30, 5, 15, 20, 20, 15, 5, -30,
                -30, 0, 15, 20, 20, 15, 0, -30,
                -30, 5, 10, 15, 15, 10, 5, -30,
                -40, -20, 0, 5, 5, 0, -20, -40,
                -50, -40, -30, -30, -30, -30, -40, -50
            ],
            'p': [
                0, 0, 0, 0, 0, 0, 0, 0,
                50, 50, 50, 50, 50, 50, 50, 50,
                10, 10, 20, 30, 30, 20, 10, 10,
                5, 5, 10, 25, 25, 10, 5, 5,
                0, 0, 0, 20, 20, 0, 0, 0,
                5, -5, -10, 0, 0, -10, -5, 5,
                5, 10, 10, -20, -20, 10, 10, 5,
                0, 0, 0, 0, 0, 0, 0, 0
            ]
            // Add others if needed, using defaults for now
        };
    }

    reset() {
        this.game.reset();
        this.currentLevel = null;
    }

    loadLevel(level) {
        this.currentLevel = level;
        this.game.load(level.startFen);
    }

    getFen() {
        return this.game.fen();
    }

    loadFen(fen) {
        return this.game.load(fen);
    }

    getTurn() {
        return this.game.turn(); // 'w' or 'b'
    }

    getBoard() {
        return this.game.board(); // 8x8 array
    }

    getLegalMoves(square) {
        return this.game.moves({ square: square, verbose: true });
    }

    move(from, to, promotion = 'q') {
        try {
            const moveResult = this.game.move({ from, to, promotion: promotion });

            if (moveResult) {
                if (moveResult.captured) {
                    this.sounds.capture();
                } else {
                    this.sounds.move();
                }

                if (this.game.in_check()) {
                    this.sounds.notify();
                }
            }
            return moveResult;
        } catch (e) {
            return null; // Invalid move
        }
    }

    isGameOver() {
        return this.game.game_over();
    }

    getGameOverState() {
        if (!this.game.game_over()) return null;

        if (this.game.in_checkmate()) {
            return {
                type: 'checkmate',
                winner: this.game.turn() === 'w' ? 'b' : 'w',
                reason: 'Jaque mate'
            };
        }

        if (this.game.in_draw()) {
            let reason = 'Tablas';
            let type = 'draw';

            if (this.game.in_stalemate()) {
                reason = 'Ahogado (Stalemate)';
                type = 'stalemate';
            } else if (this.game.in_threefold_repetition()) {
                reason = 'Triple repetición';
                type = 'repetition';
            } else if (this.game.insufficient_material()) {
                reason = 'Material insuficiente';
                type = 'insufficient';
            } else if (this.game.half_moves >= 100) { // 50-move rule
                reason = 'Regla de los 50 movimientos';
                type = '50-moves';
            }

            return { type, winner: null, reason };
        }

        return null;
    }

    inCheck() {
        return this.game.in_check();
    }

    checkWinCondition() {
        if (!this.currentLevel) return null;

        if (this.currentLevel.type === 'capture') {
            const history = this.game.history({ verbose: true });
            const lastMove = history[history.length - 1];
            if (lastMove && lastMove.captured === this.currentLevel.targetPiece) {
                return 'win';
            }
        }

        if (this.currentLevel.type === 'mate') {
            if (this.game.in_checkmate() && this.game.turn() !== this.currentLevel.playerColor) {
                return 'win';
            }
        }

        return null;
    }

    getPGN() {
        return this.game.pgn();
    }

    loadPGN(pgn) {
        return this.game.load_pgn(pgn);
    }

    getMoveHistory(options = undefined) {
        try {
            return options ? this.game.history(options) : this.game.history();
        } catch (e) {
            return this.game.history();
        }
    }

    getCapturedPieces() {
        const history = this.game.history({ verbose: true });
        const captured = { w: [], b: [] };
        history.forEach(m => {
            if (m.captured) {
                if (m.color === 'w') captured.b.push(m.captured);
                else captured.w.push(m.captured);
            }
        });
        return captured;
    }

    // --- AI LOGIC (Web Worker) ---

    makeComputerMoveAsync() {
        return new Promise((resolve) => {
            const worker = new Worker('js/ai-worker.js');
            worker.onmessage = (e) => {
                const bestMove = e.data;
                worker.terminate();
                if (bestMove) {
                    const res = this.move(bestMove.from, bestMove.to, bestMove.promotion);
                    resolve(res);
                } else {
                    resolve(null);
                }
            };
            worker.onerror = (err) => {
                console.error("Worker error:", err);
                worker.terminate();
                // Fallback to random if Web Worker fails
                const moves = this.game.moves({ verbose: true });
                if (moves.length > 0) {
                    const m = moves[Math.floor(Math.random() * moves.length)];
                    resolve(this.move(m.from, m.to, m.promotion));
                } else {
                    resolve(null);
                }
            };
            worker.postMessage({ fen: this.getFen(), depth: 3 });
        });
    }
}
