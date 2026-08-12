/* =========================================================
   ¡CAZA DE PATOS! - Lógica del juego
   ========================================================= */

// ---------- Configuración de niveles ----------
const LEVELS = [
  { name: "PRINCIPIANTE", time: 30, lifespan: 1600, target: 10, simultaneous: 1 },
  { name: "INTERMEDIO", time: 25, lifespan: 1000, target: 20, simultaneous: 1 },
  { name: "EXPERTO", time: 20, lifespan: 700, target: 35, simultaneous: 2 }
];

const DUCK_POINTS = 10;
const HIGH_SCORE_KEY = "duckhunt_highscore";

// ---------- Estado del juego ----------
let currentLevelIndex = 0;
let ducksCollected = 0;
let totalScore = 0;
let timeRemaining = 0;
let timerInterval = null;
let spawnTimeout = null;
let activeDucks = [];

// ---------- Referencias DOM ----------
const gameContainer = document.getElementById('gameContainer');
const timeValue = document.getElementById('timeValue');
const diamondsValue = document.getElementById('diamondsValue');
const targetValue = document.getElementById('targetValue');
const scoreValue = document.getElementById('scoreValue');
const hudTime = document.getElementById('hud-time');
const currentLevelLabel = document.getElementById('currentLevelLabel');

const startScreen = document.getElementById('startScreen');
const winScreen = document.getElementById('winScreen');
const loseScreen = document.getElementById('loseScreen');
const finalWinScreen = document.getElementById('finalWinScreen');

const startBtn = document.getElementById('startBtn');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const retryBtn = document.getElementById('retryBtn');
const playAgainBtn = document.getElementById('playAgainBtn');

const customCursor = document.getElementById('customCursor');

// ---------- Control del cursor ----------
document.addEventListener('mousemove', (e) => {
  if (gameContainer.matches(':hover')) {
     customCursor.style.display = 'block';
     customCursor.style.left = e.clientX + 'px';
     customCursor.style.top = e.clientY + 'px';
  } else {
     customCursor.style.display = 'none';
  }
});

document.addEventListener('mouseleave', () => {
  customCursor.style.display = 'none';
});

// ---------- SVG del pato (estilo 8-bit / silueta simple) ----------
function duckSVG() {
  return `
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <!-- Cuerpo -->
      <path d="M6 30
               a14 10 0 0 1 14 -10
               h10
               a10 8 0 0 1 10 8
               v2
               a4 4 0 0 1 -4 4
               h-24
               a6 6 0 0 1 -6 -4 z" />
      <!-- Cabeza -->
      <circle cx="34" cy="16" r="8" />
      <!-- Pico -->
      <path d="M41 15 l7 2 l-7 3 z" fill="#fbc02d" />
      <!-- Ojo -->
      <circle cx="36" cy="14" r="1.6" fill="#ffffff" />
      <!-- Ala -->
      <path d="M14 22 a8 6 0 0 1 10 4 a10 6 0 0 1 -10 2 z" fill="#424242" />
      <!-- Pata -->
      <line x1="20" y1="38" x2="20" y2="43" stroke="#fbc02d" stroke-width="2" />
      <line x1="26" y1="38" x2="26" y2="43" stroke="#fbc02d" stroke-width="2" />
    </svg>
  `;
}

// ---------- Utilidades ----------
function getHighScore() {
  return parseInt(localStorage.getItem(HIGH_SCORE_KEY) || "0", 10);
}

function setHighScoreIfNeeded(score) {
  const current = getHighScore();
  if (score > current) {
    localStorage.setItem(HIGH_SCORE_KEY, String(score));
    return score;
  }
  return current;
}

function refreshHighScoreDisplays() {
  const hs = getHighScore();
  document.getElementById('highScoreDisplay').textContent = `Puntuación máxima: ${hs}`;
  document.getElementById('footerHighScore').textContent = hs;
}

function updateHUD() {
  timeValue.textContent = timeRemaining;
  diamondsValue.textContent = ducksCollected;
  scoreValue.textContent = totalScore;
  targetValue.textContent = LEVELS[currentLevelIndex].target;
  currentLevelLabel.textContent = `${currentLevelIndex + 1} / ${LEVELS.length}`;

  if (timeRemaining <= 5) {
    hudTime.classList.add('warning');
  } else {
    hudTime.classList.remove('warning');
  }
}

// Calcula una posición aleatoria dentro del contenedor sin salirse de los bordes
function getRandomPosition(elementSize) {
  const containerRect = gameContainer.getBoundingClientRect();
  const maxX = containerRect.width - elementSize;
  const maxY = containerRect.height - elementSize;
  const x = Math.max(0, Math.floor(Math.random() * maxX));
  const y = Math.max(0, Math.floor(Math.random() * maxY));
  return { x, y };
}

// Muestra un texto flotante de puntuación (+10)
function showFloatingText(x, y, text, isPositive) {
  const el = document.createElement('div');
  el.className = 'floating-text ' + (isPositive ? 'positive' : 'negative');
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  gameContainer.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// ---------- Generación de patos ----------
function spawnDuck() {
  const level = LEVELS[currentLevelIndex];
  const size = 48;
  const pos = getRandomPosition(size);

  const duck = document.createElement('div');
  duck.className = 'duck ' + (Math.random() < 0.5 ? 'flying-up' : 'flying-side');
  duck.innerHTML = duckSVG();
  duck.style.left = pos.x + 'px';
  duck.style.top = pos.y + 'px';

  let clicked = false;

  duck.addEventListener('click', () => {
    if (clicked) return; // evita clics múltiples sobre el mismo pato
    clicked = true;

    ducksCollected++;
    totalScore += DUCK_POINTS;
    updateHUD();
    showFloatingText(pos.x, pos.y, '+' + DUCK_POINTS, true);

    removeDuck(duck);
  });

  gameContainer.appendChild(duck);
  activeDucks.push(duck);

  // El pato desaparece automáticamente tras su tiempo de vida (escapa)
  const lifeTimer = setTimeout(() => {
    removeDuck(duck);
  }, level.lifespan);

  duck._lifeTimer = lifeTimer;
}

function removeDuck(el) {
  if (el._lifeTimer) clearTimeout(el._lifeTimer);
  if (el.parentNode) el.remove();
  activeDucks = activeDucks.filter(o => o !== el);
}

function clearAllDucks() {
  activeDucks.forEach(el => {
    if (el._lifeTimer) clearTimeout(el._lifeTimer);
    if (el.parentNode) el.remove();
  });
  activeDucks = [];
}

// Bucle de generación de patos
function scheduleNextSpawn() {
  const level = LEVELS[currentLevelIndex];

  for (let i = 0; i < level.simultaneous; i++) {
    spawnDuck();
  }

  // Intervalo entre apariciones: un poco menor que el tiempo de vida para dar ritmo constante
  const spawnInterval = Math.max(300, level.lifespan * 0.85);
  spawnTimeout = setTimeout(scheduleNextSpawn, spawnInterval);
}

// ---------- Control del temporizador ----------
function startTimer() {
  timerInterval = setInterval(() => {
    timeRemaining--;
    updateHUD();
    if (timeRemaining <= 0) {
      endLevel();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  clearTimeout(spawnTimeout);
}

// ---------- Flujo de niveles ----------
function startLevel(levelIndex) {
  currentLevelIndex = levelIndex;
  const level = LEVELS[currentLevelIndex];

  ducksCollected = 0;
  timeRemaining = level.time;

  hideAllOverlays();
  clearAllDucks();
  updateHUD();

  startTimer();
  scheduleNextSpawn();
}

function endLevel() {
  stopTimer();
  clearAllDucks();

  const level = LEVELS[currentLevelIndex];
  const passed = ducksCollected >= level.target;

  if (passed) {
    if (currentLevelIndex === LEVELS.length - 1) {
      showFinalWinScreen();
    } else {
      showWinScreen();
    }
  } else {
    showLoseScreen();
  }
}

function showWinScreen() {
  const level = LEVELS[currentLevelIndex];
  document.getElementById('winSummary').innerHTML =
    `Conseguiste <b>${ducksCollected}</b> patos (objetivo: ${level.target}).<br>Puntuación total: <b>${totalScore}</b>`;
  winScreen.classList.remove('hidden');
}

function showLoseScreen() {
  const level = LEVELS[currentLevelIndex];
  const finalHS = setHighScoreIfNeeded(totalScore);
  document.getElementById('loseSummary').innerHTML =
    `Solo conseguiste <b>${ducksCollected}</b> patos de los ${level.target} necesarios.<br>Puntuación final: <b>${totalScore}</b>`;
  document.getElementById('finalHighScore').textContent = `Puntuación máxima: ${finalHS}`;
  loseScreen.classList.remove('hidden');
  refreshHighScoreDisplays();
}

function showFinalWinScreen() {
  const finalHS = setHighScoreIfNeeded(totalScore);
  document.getElementById('finalWinSummary').innerHTML =
    `¡Completaste los 3 niveles!<br>Puntuación final: <b>${totalScore}</b>`;
  document.getElementById('finalWinHighScore').textContent = `Puntuación máxima: ${finalHS}`;
  finalWinScreen.classList.remove('hidden');
  refreshHighScoreDisplays();
}

function hideAllOverlays() {
  startScreen.classList.add('hidden');
  winScreen.classList.add('hidden');
  loseScreen.classList.add('hidden');
  finalWinScreen.classList.add('hidden');
}

function resetGame() {
  totalScore = 0;
  ducksCollected = 0;
  currentLevelIndex = 0;
  updateHUD();
  hideAllOverlays();
  startScreen.classList.remove('hidden');
  document.getElementById('startTarget').textContent = LEVELS[0].target;
  document.getElementById('startTime').textContent = LEVELS[0].time;
  refreshHighScoreDisplays();
}

// ---------- Eventos de botones ----------
startBtn.addEventListener('click', () => {
  startLevel(0);
});

nextLevelBtn.addEventListener('click', () => {
  startLevel(currentLevelIndex + 1);
});

retryBtn.addEventListener('click', () => {
  // Reinicia desde el nivel en el que falló, revirtiendo los puntos de ese intento
  totalScore = Math.max(0, totalScore - (ducksCollected * DUCK_POINTS));
  startLevel(currentLevelIndex);
});

playAgainBtn.addEventListener('click', () => {
  resetGame();
});

// ---------- Inicialización ----------
window.addEventListener('DOMContentLoaded', () => {
  refreshHighScoreDisplays();
  updateHUD();
});