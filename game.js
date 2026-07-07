const boardEl = document.getElementById("board");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const movesEl = document.getElementById("moves");
const messageEl = document.getElementById("message");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const BOARD_SIZE = 6;
const MAX_MOVES = 30;

const COLORS = ["red", "blue", "green", "yellow", "purple", "orange"];

let board = [];
let selectedTile = null;
let score = 0;
let movesLeft = MAX_MOVES;
let bestScore = Number(localStorage.getItem("colorMatchBestScore") || 0);

let isRunning = false;
let isBusy = false;
let isGameOver = false;

bestScoreEl.textContent = bestScore;

function startGame() {
  score = 0;
  movesLeft = MAX_MOVES;
  selectedTile = null;
  isRunning = true;
  isBusy = false;
  isGameOver = false;

  createInitialBoard();
  updateInfo();
  hideMessage();
  renderBoard();
}

function createInitialBoard() {
  board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      board[row][col] = {
        color: getRandomColorWithoutInitialMatch(row, col)
      };
    }
  }
}

function getRandomColorWithoutInitialMatch(row, col) {
  const availableColors = COLORS.filter(color => {
    const makesHorizontalMatch =
      col >= 2 &&
      board[row][col - 1]?.color === color &&
      board[row][col - 2]?.color === color;

    const makesVerticalMatch =
      row >= 2 &&
      board[row - 1][col]?.color === color &&
      board[row - 2][col]?.color === color;

    return !makesHorizontalMatch && !makesVerticalMatch;
  });

  return availableColors[Math.floor(Math.random() * availableColors.length)];
}

function getRandomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function renderBoard(matchedSet = new Set()) {
  boardEl.innerHTML = "";

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const tile = document.createElement("button");
      const cell = board[row][col];

      tile.type = "button";
      tile.className = "tile";

      if (cell) {
        tile.classList.add(cell.color);
      }

      if (
        selectedTile &&
        selectedTile.row === row &&
        selectedTile.col === col
      ) {
        tile.classList.add("selected");
      }

      if (matchedSet.has(getKey(row, col))) {
        tile.classList.add("matched");
      }

      tile.dataset.row = row;
      tile.dataset.col = col;
      tile.setAttribute("aria-label", `${row + 1}행 ${col + 1}열 블록`);

      tile.addEventListener("click", () => handleTileClick(row, col));

      boardEl.appendChild(tile);
    }
  }
}

async function handleTileClick(row, col) {
  if (!isRunning || isBusy || isGameOver) return;

  if (!selectedTile) {
    selectedTile = { row, col };
    renderBoard();
    return;
  }

  if (selectedTile.row === row && selectedTile.col === col) {
    selectedTile = null;
    renderBoard();
    return;
  }

  if (!isAdjacent(selectedTile, { row, col })) {
    selectedTile = { row, col };
    renderBoard();
    return;
  }

  const first = selectedTile;
  const second = { row, col };

  selectedTile = null;

  await trySwap(first, second);
}

function isAdjacent(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

async function trySwap(first, second) {
  isBusy = true;

  swapCells(first, second);
  renderBoard();

  await wait(120);

  let matches = findMatches();

  if (matches.size === 0) {
    swapCells(first, second);
    renderBoard();
    isBusy = false;
    return;
  }

  movesLeft--;
  updateInfo();

  await resolveMatches(matches);

  isBusy = false;

  if (movesLeft <= 0) {
    endGame();
  }
}

async function resolveMatches(initialMatches) {
  let matches = initialMatches;
  let combo = 1;

  while (matches.size > 0) {
    renderBoard(matches);

    const gainedScore = matches.size * 10 * combo;
    score += gainedScore;
    updateInfo();

    await wait(220);

    removeMatches(matches);
    applyGravity();
    fillEmptyCells();

    renderBoard();

    await wait(180);

    matches = findMatches();
    combo++;
  }
}

function findMatches() {
  const matches = new Set();

  // 가로 매칭 확인
  for (let row = 0; row < BOARD_SIZE; row++) {
    let count = 1;

    for (let col = 1; col <= BOARD_SIZE; col++) {
      const currentColor = board[row][col]?.color;
      const previousColor = board[row][col - 1]?.color;

      if (col < BOARD_SIZE && currentColor === previousColor) {
        count++;
      } else {
        if (count >= 3) {
          for (let k = 0; k < count; k++) {
            matches.add(getKey(row, col - 1 - k));
          }
        }

        count = 1;
      }
    }
  }

  // 세로 매칭 확인
  for (let col = 0; col < BOARD_SIZE; col++) {
    let count = 1;

    for (let row = 1; row <= BOARD_SIZE; row++) {
      const currentColor = board[row]?.[col]?.color;
      const previousColor = board[row - 1]?.[col]?.color;

      if (row < BOARD_SIZE && currentColor === previousColor) {
        count++;
      } else {
        if (count >= 3) {
          for (let k = 0; k < count; k++) {
            matches.add(getKey(row - 1 - k, col));
          }
        }

        count = 1;
      }
    }
  }

  return matches;
}

function removeMatches(matches) {
  matches.forEach(key => {
    const { row, col } = parseKey(key);
    board[row][col] = null;
  });
}

function applyGravity() {
  for (let col = 0; col < BOARD_SIZE; col++) {
    const remainingCells = [];

    for (let row = BOARD_SIZE - 1; row >= 0; row--) {
      if (board[row][col] !== null) {
        remainingCells.push(board[row][col]);
      }
    }

    for (let row = BOARD_SIZE - 1; row >= 0; row--) {
      board[row][col] = remainingCells[BOARD_SIZE - 1 - row] || null;
    }
  }
}

function fillEmptyCells() {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === null) {
        board[row][col] = {
          color: getRandomColor()
        };
      }
    }
  }
}

function swapCells(first, second) {
  const temp = board[first.row][first.col];
  board[first.row][first.col] = board[second.row][second.col];
  board[second.row][second.col] = temp;
}

function updateInfo() {
  scoreEl.textContent = score;
  movesEl.textContent = movesLeft;
  bestScoreEl.textContent = bestScore;
}

function endGame() {
  isGameOver = true;
  isRunning = false;

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("colorMatchBestScore", String(bestScore));
  }

  updateInfo();
  showMessage(`게임 종료<br>최종 점수: ${score}`);
}

function showMessage(text) {
  messageEl.innerHTML = text;
  messageEl.classList.add("show");
}

function hideMessage() {
  messageEl.classList.remove("show");
}

function getKey(row, col) {
  return `${row}-${col}`;
}

function parseKey(key) {
  const [row, col] = key.split("-").map(Number);
  return { row, col };
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

createInitialBoard();
renderBoard();
updateInfo();
showMessage("시작 버튼을 눌러주세요");
