// Manages the DOM updates for the board
// Defined as global class

class BoardRenderer {
    constructor(elementId, gameLogicInstance, onMoveCallback) {
        this.boardEl = document.getElementById(elementId);
        this.game = gameLogicInstance;
        this.onMove = onMoveCallback;

        this.selectedSquare = null;
        this.draggedSource = null; // For Drag & Drop
        this.touchedSquare = null; // For Touch events

        this.files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        this.ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

        this.pieceUnicode = {
            'w': { 'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚' },
            'b': { 'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚' }
        };

        this.isTouchDevice = (typeof window !== 'undefined') &&
            ('ontouchstart' in window || navigator.maxTouchPoints > 0);

        this.initBoard();
    }

    initBoard() {
        this.boardEl.innerHTML = '';

        // Create 64 squares
        for (const rank of this.ranks) {
            for (const file of this.files) {
                const square = document.createElement('div');
                const isLight = (this.files.indexOf(file) + this.ranks.indexOf(rank)) % 2 === 0;
                square.className = `sq ${isLight ? 'light' : 'dark'}`;
                square.dataset.square = `${file}${rank}`;

                // Click Event
                square.onclick = () => this.handleSquareClick(square.dataset.square);

                // Drag & Drop Events (solo en dispositivos no táctiles)
                if (!this.isTouchDevice) {
                    square.ondragover = (e) => this.handleDragOver(e);
                    square.ondrop = (e) => this.handleDrop(e, square.dataset.square);
                }

                // Touch Events for mobile
                square.ontouchstart = (e) => this.handleTouchStart(e, square.dataset.square);
                square.ontouchmove = (e) => this.handleTouchMove(e);
                square.ontouchend = (e) => this.handleTouchEnd(e, square.dataset.square);

                this.boardEl.appendChild(square);
            }
        }
    }

    render() {
        // Clear all pieces and special classes first
        const squares = this.boardEl.querySelectorAll('.sq');
        squares.forEach(sq => {
            sq.innerHTML = ''; // Remove piece
            sq.classList.remove('selected', 'highlight', 'capture-hint', 'in-check', 'drag-over', 'last-move');
        });

        const boardData = this.game.getBoard();

        boardData.forEach((row, rowIndex) => {
            row.forEach((piece, colIndex) => {
                if (piece) {
                    const squareId = `${this.files[colIndex]}${this.ranks[rowIndex]}`;
                    const sqEl = this.boardEl.querySelector(`[data-square="${squareId}"]`);
                    if (sqEl) {
                        const pieceDiv = document.createElement('div');
                        pieceDiv.className = `piece piece-${piece.color}`;
                        pieceDiv.textContent = this.pieceUnicode[piece.color][piece.type];
                        pieceDiv.style.fontSize = 'calc(var(--sq-size) * 0.8)';
                        pieceDiv.style.lineHeight = '1';
                        pieceDiv.style.display = 'flex';
                        pieceDiv.style.alignItems = 'center';
                        pieceDiv.style.justifyContent = 'center';
                        pieceDiv.style.userSelect = 'none';
                        pieceDiv.style.cursor = this.isTouchDevice ? 'pointer' : 'grab';

                        // Drag and Drop solo en escritorio
                        if (!this.isTouchDevice) {
                            pieceDiv.draggable = true;
                            pieceDiv.ondragstart = (e) => {
                                this.draggedSource = squareId;
                                pieceDiv.classList.add('dragging');
                                e.dataTransfer.effectAllowed = 'move';
                            };
                            pieceDiv.ondragend = () => {
                                pieceDiv.classList.remove('dragging');
                                this.draggedSource = null;
                                this.removeDragOverHighlights();
                            };
                        }

                        sqEl.appendChild(pieceDiv);
                    }
                }
            });
        });

        // Highlight Last Move
        const history = this.game.getMoveHistory({ verbose: true });
        if (history.length > 0) {
            const last = history[history.length - 1];
            // last.from and last.to
            const fromSq = this.boardEl.querySelector(`[data-square="${last.from}"]`);
            const toSq = this.boardEl.querySelector(`[data-square="${last.to}"]`);
            if (fromSq) fromSq.classList.add('last-move');
            if (toSq) toSq.classList.add('last-move');
        }

        // Highlight King if in check
        if (this.game.inCheck()) {
            const turn = this.game.getTurn();
            // Find King
            boardData.forEach((row, r) => {
                row.forEach((p, c) => {
                    if (p && p.type === 'k' && p.color === turn) {
                        const sqId = `${this.files[c]}${this.ranks[r]}`;
                        const kingSq = this.boardEl.querySelector(`[data-square="${sqId}"]`);
                        if (kingSq) kingSq.classList.add('in-check');
                    }
                });
            });
        }
    }

    /* --- Click Logic --- */
    handleSquareClick(squareId) {
        if (this.selectedSquare) {
            // Attempt move
            const success = this.onMove(this.selectedSquare, squareId);

            if (success) {
                this.clearSelection();
                // Force immediate re-render to show the move
                setTimeout(() => {
                    this.render();
                }, 10);
            } else {
                // Check if user clicked on their own piece again to switch
                const piece = this.game.game.get(squareId);
                if (piece && piece.color === this.game.getTurn()) {
                    this.selectSquare(squareId);
                } else {
                    this.clearSelection();
                }
            }
        } else {
            // Select logic
            const piece = this.game.game.get(squareId);
            if (piece && piece.color === this.game.getTurn()) {
                this.selectSquare(squareId);
            }
        }
    }

    /* --- Drag & Drop Logic --- */
    handleDragOver(e) {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
        // Visual feedback
        const target = e.currentTarget; // The square div
        if (!target.classList.contains('drag-over')) {
            this.removeDragOverHighlights();
            target.classList.add('drag-over');
        }
    }

    handleDrop(e, targetSquare) {
        e.preventDefault();
        this.removeDragOverHighlights();

        if (this.draggedSource && this.draggedSource !== targetSquare) {
            const success = this.onMove(this.draggedSource, targetSquare);
            if (success) {
                this.clearSelection();
                // Force immediate re-render to show the move
                setTimeout(() => {
                    this.render();
                }, 10);
            } else {
                // Invalid move, snap back
                this.clearSelection();
                this.render();
            }
        }
    }

    removeDragOverHighlights() {
        this.boardEl.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    }

    /* --- Selection Helpers --- */
    clearSelection() {
        this.selectedSquare = null;
        const squares = this.boardEl.querySelectorAll('.sq');
        squares.forEach(sq => {
            sq.classList.remove('selected', 'highlight', 'capture-hint');
        });
    }

    selectSquare(squareId) {
        this.clearSelection();
        this.selectedSquare = squareId;
        const sqEl = this.boardEl.querySelector(`[data-square="${squareId}"]`);
        if (sqEl) {
            sqEl.classList.add('selected');
            sqEl.classList.add('pulse'); // Touch move visual feedback
        }

        // Show Legal Moves
        const moves = this.game.getLegalMoves(squareId);
        moves.forEach(move => {
            const targetSq = this.boardEl.querySelector(`[data-square="${move.to}"]`);
            if (targetSq) {
                if (move.captured) {
                    targetSq.classList.add('capture-hint');
                } else {
                    targetSq.classList.add('highlight'); // Dot
                }
            }
        });
    }

    /* --- Touch Events for Mobile --- */
    handleTouchStart(e, squareId) {
        e.preventDefault();
        this.touchedSquare = squareId;
        this.handleSquareClick(squareId);
    }

    handleTouchMove(e) {
        e.preventDefault();
        // Prevent scrolling during touch
    }

    handleTouchEnd(e, startSquareId) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        // Identify element at touch release coordinates
        const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
        const sqEl = targetEl ? targetEl.closest('.sq') : null;
        const targetSquareId = sqEl ? sqEl.dataset.square : null;

        if (this.touchedSquare && targetSquareId && this.touchedSquare !== targetSquareId) {
            // Try to move from touched square to the one under the finger
            const success = this.onMove(this.touchedSquare, targetSquareId);
            if (success) {
                this.clearSelection();
                setTimeout(() => this.render(), 10);
            } else {
                this.render(); // Snap back
            }
        }
        this.touchedSquare = null;
    }
}
