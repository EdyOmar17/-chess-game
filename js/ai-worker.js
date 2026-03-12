importScripts('https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js');

const positionTables = {
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
};

function evaluateBoard(game) {
    let totalEvaluation = 0;
    const board = game.board(); // 8x8
    const weights = { 'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 900 };

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece) {
                const value = weights[piece.type];
                let positionBonus = 0;

                if (positionTables[piece.type]) {
                    positionBonus = positionTables[piece.type][i * 8 + j] || 0;
                }

                if (piece.color === 'w') {
                    totalEvaluation += (value + (piece.color === 'b' ? -positionBonus : positionBonus));
                } else {
                    totalEvaluation -= (value + (piece.color === 'w' ? -positionBonus : positionBonus));
                }
            }
        }
    }
    return totalEvaluation;
}

function minimax(game, depth, alpha, beta, isMaximizing) {
    if (depth === 0) {
        return -evaluateBoard(game);
    }

    const moves = game.moves({ verbose: true });

    if (isMaximizing) {
        let bestMove = -9999;
        for (let i = 0; i < moves.length; i++) {
            game.move(moves[i]);
            bestMove = Math.max(bestMove, minimax(game, depth - 1, alpha, beta, !isMaximizing));
            game.undo();

            alpha = Math.max(alpha, bestMove);
            if (beta <= alpha) {
                return bestMove;
            }
        }
        return bestMove;
    } else {
        let bestMove = 9999;
        for (let i = 0; i < moves.length; i++) {
            game.move(moves[i]);
            bestMove = Math.min(bestMove, minimax(game, depth - 1, alpha, beta, !isMaximizing));
            game.undo();

            beta = Math.min(beta, bestMove);
            if (beta <= alpha) {
                return bestMove;
            }
        }
        return bestMove;
    }
}

function minimaxRoot(game, depth, isMaximizing) {
    const moves = game.moves({ verbose: true });
    let bestMove = -9999;
    let bestMoveFound = null;

    // Shuffle moves to add variety in equal positions
    moves.sort(() => Math.random() - 0.5);

    for (let i = 0; i < moves.length; i++) {
        game.move(moves[i]);
        const value = minimax(game, depth - 1, -10000, 10000, !isMaximizing);
        game.undo();

        if (value >= bestMove) {
            bestMove = value;
            bestMoveFound = moves[i];
        }
    }
    return bestMoveFound;
}

self.onmessage = function (e) {
    const { fen, depth } = e.data;
    const game = new Chess(fen);

    try {
        const bestMove = minimaxRoot(game, depth, true);

        if (bestMove) {
            self.postMessage(bestMove);
        } else {
            // Fallback to random if something fails
            const moves = game.moves({ verbose: true });
            if (moves.length > 0) {
                const m = moves[Math.floor(Math.random() * moves.length)];
                self.postMessage(m);
            } else {
                self.postMessage(null);
            }
        }
    } catch (err) {
        // Fallback en caso de error
        const moves = game.moves({ verbose: true });
        if (moves.length > 0) {
            const m = moves[Math.floor(Math.random() * moves.length)];
            self.postMessage(m);
        } else {
            self.postMessage(null);
        }
    }
};
