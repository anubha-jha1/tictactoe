const gameBoard = document.querySelector('.game-board');
const cells = document.querySelectorAll('[data-cell]');
const status = document.getElementById('status');
const restartButton = document.getElementById('restart');
const modeBtns = document.querySelectorAll('.mode-btn');
const diffBtns = document.querySelectorAll('.diff-btn');
const difficultyDiv = document.getElementById('difficulty');

let currentPlayer = 'X';
let gameActive = true;
let gameState = ['', '', '', '', '', '', '', '', ''];
let gameMode = 'pvp';
let difficulty = 'easy';

let scores = JSON.parse(localStorage.getItem('tictactoe_scores')) || {
    X: 0,
    O: 0,
    draws: 0
};

const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

function handleCellClick(e) {
    const cell = e.target;
    const cellIndex = Array.from(cells).indexOf(cell);

    if (gameState[cellIndex] !== '' || !gameActive) return;

    makeMove(cellIndex);

    if (gameActive && gameMode === 'ai' && currentPlayer === 'O') {
        setTimeout(() => makeAIMove(), 500);
    }
}

function makeMove(index) {
    gameState[index] = currentPlayer;
    cells[index].textContent = currentPlayer;
    cells[index].classList.add(currentPlayer.toLowerCase());

    if (checkWin()) {
        const winningCombo = getWinningCombination();
        animateWinningLine(winningCombo);
        highlightWinningCells(winningCombo);
        updateScore(currentPlayer);
        status.textContent = `${currentPlayer} Wins!`;
        gameActive = false;
        return;
    }

    if (checkDraw()) {
        updateScore('draws');
        status.textContent = "Draw!";
        gameActive = false;
        return;
    }

    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    status.textContent = `${currentPlayer}'s turn`;
}

function getWinningCombination() {
    return winningCombinations.find(combination => {
        return combination.every(index => gameState[index] === currentPlayer);
    });
}

function animateWinningLine(combination) {
    const lineInfo = getLineType(combination);
    const line = document.createElement('div');
    line.className = `winning-line ${lineInfo.type}`;
    
    const cellSize = cells[0].offsetWidth;
    const gap = parseInt(getComputedStyle(gameBoard).gap);
    
    if (lineInfo.type === 'horizontal') {
        const row = Math.floor(combination[0] / 3);
        const yPos = (cellSize + gap) * row + cellSize / 2;
        line.style.top = `${yPos}px`;
        line.style.left = '0';
    } else if (lineInfo.type === 'vertical') {
        const col = combination[0] % 3;
        const xPos = (cellSize + gap) * col + cellSize / 2;
        line.style.left = `${xPos}px`;
        line.style.top = '0';
    } else {
        // For diagonal lines, we don't need to set position as it's handled by CSS
        line.style.top = '50%';
        line.style.left = '50%';
    }
    
    gameBoard.appendChild(line);
    
    // Remove the line after the game is restarted
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && 
                Array.from(cells).some(cell => cell.textContent === '')) {
                line.remove();
                observer.disconnect();
            }
        });
    });
    
    observer.observe(gameBoard, { childList: true, subtree: true });
}

function getLineType(combination) {
    const [a, b, c] = combination;
    
    if (Math.floor(a / 3) === Math.floor(c / 3)) {
        return { type: 'horizontal' };
    }
    
    if (a % 3 === c % 3) {
        return { type: 'vertical' };
    }
    
    return { type: a === 0 ? 'diagonal-1' : 'diagonal-2' };
}

function highlightWinningCells(combination) {
    combination.forEach(index => {
        cells[index].classList.add('winner');
    });
}

function updateScore(winner) {
    scores[winner]++;
    localStorage.setItem('tictactoe_scores', JSON.stringify(scores));
    
    const scoreElement = document.getElementById(`score-${winner.toLowerCase()}`);
    scoreElement.textContent = scores[winner];
    
    // Add score animation
    scoreElement.classList.remove('score-bump');
    void scoreElement.offsetWidth; // Trigger reflow
    scoreElement.classList.add('score-bump');
}

function resetScores() {
    scores = { X: 0, O: 0, draws: 0 };
    localStorage.setItem('tictactoe_scores', JSON.stringify(scores));
    ['x', 'o', 'draws'].forEach(type => {
        document.getElementById(`score-${type}`).textContent = '0';
    });
}

function makeAIMove() {
    let move;
    switch(difficulty) {
        case 'hard':
            move = getBestMove();
            break;
        case 'medium':
            move = Math.random() < 0.7 ? getBestMove() : getRandomMove();
            break;
        default: // easy
            move = getRandomMove();
    }
    makeMove(move);
}

function getBestMove() {
    let bestScore = -Infinity;
    let bestMove;

    for (let i = 0; i < 9; i++) {
        if (gameState[i] === '') {
            gameState[i] = 'O';
            let score = minimax(gameState, 0, false);
            gameState[i] = '';
            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }
    return bestMove;
}

function minimax(board, depth, isMaximizing) {
    if (checkWinForMinimax('O')) return 1;
    if (checkWinForMinimax('X')) return -1;
    if (checkDraw()) return 0;

    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = 'O';
                let score = minimax(board, depth + 1, false);
                board[i] = '';
                bestScore = Math.max(score, bestScore);
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = 'X';
                let score = minimax(board, depth + 1, true);
                board[i] = '';
                bestScore = Math.min(score, bestScore);
            }
        }
        return bestScore;
    }
}

function getRandomMove() {
    const emptyCells = gameState
        .map((cell, index) => cell === '' ? index : null)
        .filter(cell => cell !== null);
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function checkWin() {
    for (const combination of winningCombinations) {
        if (combination.every(index => gameState[index] === currentPlayer)) {
            handleWin(combination);
            return true;
        }
    }
    return false;
}

function checkWinForMinimax(player) {
    return winningCombinations.some(combination => {
        return combination.every(index => {
            return gameState[index] === player;
        });
    });
}

function checkDraw() {
    return gameState.every(cell => cell !== '');
}

function handleModeChange(e) {
    const selectedMode = e.target.dataset.mode;
    if (selectedMode === gameMode) return;

    modeBtns.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    gameMode = selectedMode;
    difficultyDiv.style.display = gameMode === 'ai' ? 'block' : 'none';
    restartGame();
}

function handleDifficultyChange(e) {
    const selectedDifficulty = e.target.dataset.difficulty;
    if (selectedDifficulty === difficulty) return;

    diffBtns.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    difficulty = selectedDifficulty;
    restartGame();
}

function restartGame() {
    gameState = ['', '', '', '', '', '', '', '', ''];
    gameActive = true;
    currentPlayer = 'X';
    
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('x', 'o', 'winner');
    });
    
    // Remove winning line if it exists
    const winningLine = document.querySelector('.winning-line');
    if (winningLine) {
        winningLine.remove();
    }
    
    status.textContent = "X's turn";

    if (gameMode === 'ai' && currentPlayer === 'O') {
        setTimeout(() => makeAIMove(), 500);
    }
}

cells.forEach(cell => cell.addEventListener('click', handleCellClick));
restartButton.addEventListener('click', restartGame);
modeBtns.forEach(btn => btn.addEventListener('click', handleModeChange));
diffBtns.forEach(btn => btn.addEventListener('click', handleDifficultyChange));

// Add reset scores functionality to restart button with long press
let pressTimer;
restartButton.addEventListener('mousedown', () => {
    pressTimer = setTimeout(() => {
        resetScores();
        restartButton.classList.add('long-press');
    }, 1000);
});

restartButton.addEventListener('mouseup', () => {
    clearTimeout(pressTimer);
    restartButton.classList.remove('long-press');
});

restartButton.addEventListener('mouseleave', () => {
    clearTimeout(pressTimer);
    restartButton.classList.remove('long-press');
});

// Initial setup
difficultyDiv.style.display = gameMode === 'ai' ? 'block' : 'none';

function createConfetti(x, y) {
    const colors = ['#2ecc71', '#3498db', '#e74c3c', '#f1c40f', '#9b59b6'];
    const particleCount = window.innerWidth < 480 ? 30 : 50;  // Fewer particles on mobile
    
    for (let i = 0; i < particleCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = x + 'px';
        confetti.style.top = y + 'px';
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        confetti.style.setProperty('--angle', Math.random() * 360 + 'deg');
        confetti.style.setProperty('--speed', (Math.random() * 0.8 + 0.3) + 's');  // Slightly faster animation
        confetti.style.setProperty('--distance', (Math.random() * 80 + 30) + 'px');  // Shorter distance
        document.body.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 1500);  // Shorter duration
    }
}

function handleWin(combination) {
    const winningCells = combination.map(index => cells[index]);
    winningCells.forEach(cell => cell.classList.add('winner'));
    
    // Get the center position of the winning cells
    const rect = gameBoard.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    createConfetti(x, y);
    animateWinningLine(combination);
    
    status.textContent = `${currentPlayer} Wins!`;
    status.classList.add('winner-status');
    gameActive = false;
    updateScore(currentPlayer);
}