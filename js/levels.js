// Define Levels globally
const LEVELS = [
    {
        id: 'tutorial-1',
        category: 'Aprende lo Básico',
        title: 'La Torre Poderosa',
        description: 'La Torre se mueve en líneas rectas (horizontal o vertical). Captura al peón negro.',
        startFen: '8/p7/8/8/8/8/8/R7 w - - 0 1',
        type: 'capture',
        targetPiece: 'p',
        hint: 'Mueve la torre hasta a7 para capturar.'
    },
    {
        id: 'tutorial-2',
        category: 'Aprende lo Básico',
        title: 'El Alfil',
        description: 'El Alfil se mueve en diagonales. Captura al peón negro en h8.',
        startFen: '7p/8/8/8/8/8/8/B7 w - - 0 1',
        type: 'capture',
        targetPiece: 'p',
        hint: 'Cruza todo el tablero en diagonal.'
    },
    {
        id: 'tutorial-3',
        category: 'Aprende lo Básico',
        title: 'La Dama (Reina)',
        description: 'La Dama combina los movimientos de Torre y Alfil. Es la pieza más poderosa.',
        startFen: '8/8/8/3p4/8/8/8/3Q4 w - - 0 1',
        type: 'capture',
        targetPiece: 'p',
        hint: 'Mueve hacia adelante para capturar.'
    },
    {
        id: 'challenge-1',
        category: 'Desafíos - Nivel 1',
        title: 'Jaque Mate en 1',
        description: 'Encuentra el movimiento que gana la partida inmediatamente.',
        startFen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
        type: 'mate',
        playerColor: 'w',
        hint: 'Busca un mate en la última fila.'
    },
    {
        id: 'challenge-2',
        category: 'Desafíos - Nivel 1',
        title: 'El Beso de la Muerte',
        description: 'Usa la Dama para dar jaque mate al Rey oponente con apoyo.',
        startFen: 'k7/2Q5/K7/8/8/8/8/8 w - - 0 1',
        type: 'mate',
        playerColor: 'w',
        hint: 'La Dama debe acercarse al Rey, apoyada por tu Rey.'
    },
    // New Puzzles (Mate in 2)
    {
        id: 'challenge-3',
        category: 'Desafíos - Nivel 2',
        title: 'Sacrificio de Dama',
        description: 'A veces hay que sacrificar lo más valioso para ganar. (Mate en 2)',
        startFen: 'r2qkb1r/pp2nppp/3p4/2pNN3/2BpP3/8/PPP2PPP/R1BbK2R w KQkq - 1 6',
        type: 'mate',
        playerColor: 'w',
        hint: 'Busca un sacrificio de Caballo o un ataque descubierto.'
    },
    {
        id: 'challenge-4',
        category: 'Desafíos - Nivel 2',
        title: 'Ataque Doble',
        description: 'Usa tus piezas para atacar dos objetivos a la vez. (Mate en 2)',
        startFen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
        type: 'mate',
        playerColor: 'w',
        hint: 'Amenaza mate en f7.'
    },
    {
        id: 'challenge-5',
        category: 'Desafíos - Maestro',
        title: 'El Mate de Anastasia',
        description: 'Un patrón clásico de mate con Caballo y Torre.',
        startFen: '5r1k/3N1p1p/5Pp1/8/8/8/7Q/R4K2 w - - 0 1',
        type: 'mate',
        playerColor: 'w',
        hint: 'Sacrifica la Dama para abrir la columna h.'
    },
    {
        id: 'challenge-6',
        category: 'Desafíos - Maestro',
        title: 'El Mate de la Coz',
        description: 'Un mate ahogado donde el Rey no puede escapar de sus propias piezas.',
        startFen: 'r1b1k2r/pppp1ppp/8/4N3/2B1n3/8/PPPP1qPP/RNBQ3K b kq - 1 7', // Smothered mate setup often involves Nf2+
        type: 'mate',
        playerColor: 'b',
        hint: 'El Rey está atrapado por sus propias piezas.'
    }
];

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LEVELS;
}
