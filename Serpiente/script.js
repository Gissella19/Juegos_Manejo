const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const ANCHO = 700;
const ALTO = 700;
const BLOQUE = 25;
const META_PUNTOS = 30;

// Configuración de Colores
const COLORES = [
    { nombre: 'Verde', cabeza: '#00e676', cuerpo: '#00b450' },
    { nombre: 'Naranja', cabeza: '#ff8c00', cuerpo: '#d75a00' },
    { nombre: 'Blanco', cabeza: '#f5f5fa', cuerpo: '#aaaab5' },
    { nombre: 'Amarillo', cabeza: '#ffeb3b', cuerpo: '#d2be14' },
    { nombre: 'Cian', cabeza: '#00e5ff', cuerpo: '#00a8c8' },
    { nombre: 'Rosado', cabeza: '#ff80ab', cuerpo: '#dc5a87' },
    { nombre: 'Lila', cabeza: '#d1c4e9', cuerpo: '#a08cb4' },
    { nombre: 'Dorado', cabeza: '#ffd700', cuerpo: '#d2a500' }
];

// Estado de Ajustes
let modo2P = false;
let nivelDiff = 1; // 0: Fácil (110ms), 1: Medio (70ms), 2: Difícil (45ms)
let speedMs = 70;

let colorP1Idx = 0;
let colorP2Idx = 1;

// Variables de Juego
let gameLoopTimer = null;
let estado = 'MENU'; // 'MENU', 'JUGANDO', 'GAMEOVER'

let x1 = [], y1 = [], cuerpoP1 = 3, puntosP1 = 0, dirP1 = 'D', p1Muerto = false;
let x2 = [], y2 = [], cuerpoP2 = 3, puntosP2 = 0, dirP2 = 'L', p2Muerto = false;

let manzanaX = 0, manzanaY = 0;
let mensajeGanador = "";

// Elementos HTML
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const gameoverScreen = document.getElementById('gameover-screen');

const btn1P = document.getElementById('btn-1p');
const btn2P = document.getElementById('btn-2p');
const btnFacil = document.getElementById('btn-facil');
const btnMedio = document.getElementById('btn-medio');
const btnDificil = document.getElementById('btn-dificil');

const rules2P = document.getElementById('rules-2p');
const p2ColorSection = document.getElementById('p2-color-section');

const p1Name = document.getElementById('p1-color-name');
const p1Box = document.getElementById('p1-box');
const p2Name = document.getElementById('p2-color-name');
const p2Box = document.getElementById('p2-box');

const p2PrevBtn = document.getElementById('p2-prev');
const p2NextBtn = document.getElementById('p2-next');

const scoreP1El = document.getElementById('score-p1');
const scoreP2El = document.getElementById('score-p2');

// ACTUALIZAR INTERFAZ DEL MENÚ
function updateUI() {
    p1Name.innerText = COLORES[colorP1Idx].nombre;
    p1Box.querySelector('.dot').style.backgroundColor = COLORES[colorP1Idx].cabeza;

    p2Name.innerText = COLORES[colorP2Idx].nombre;
    p2Box.querySelector('.dot').style.backgroundColor = COLORES[colorP2Idx].cabeza;

    if (modo2P) {
        btn2P.classList.add('active-mode');
        btn1P.classList.remove('active-mode');
        rules2P.classList.remove('hidden');
        p2ColorSection.style.opacity = '1';
        p2PrevBtn.disabled = false;
        p2NextBtn.disabled = false;
    } else {
        btn1P.classList.add('active-mode');
        btn2P.classList.remove('active-mode');
        rules2P.classList.add('hidden');
        p2ColorSection.style.opacity = '0.5';
        p2PrevBtn.disabled = true;
        p2NextBtn.disabled = true;
    }
}

// EVENTOS DEL MENÚ
btn1P.addEventListener('click', () => { modo2P = false; updateUI(); });
btn2P.addEventListener('click', () => { 
    modo2P = true; 
    if (colorP1Idx === colorP2Idx) colorP2Idx = (colorP1Idx + 1) % COLORES.length;
    updateUI(); 
});

btnFacil.addEventListener('click', () => setDiff(0));
btnMedio.addEventListener('click', () => setDiff(1));
btnDificil.addEventListener('click', () => setDiff(2));

function setDiff(diff) {
    nivelDiff = diff;
    [btnFacil, btnMedio, btnDificil].forEach((btn, idx) => {
        if (idx === diff) btn.classList.add('active-diff');
        else btn.classList.remove('active-diff');
    });
}

document.getElementById('p1-prev').addEventListener('click', () => {
    colorP1Idx = (colorP1Idx - 1 + COLORES.length) % COLORES.length;
    updateUI();
});
document.getElementById('p1-next').addEventListener('click', () => {
    colorP1Idx = (colorP1Idx + 1) % COLORES.length;
    updateUI();
});

p2PrevBtn.addEventListener('click', () => {
    if (!modo2P) return;
    colorP2Idx = (colorP2Idx - 1 + COLORES.length) % COLORES.length;
    updateUI();
});
p2NextBtn.addEventListener('click', () => {
    if (!modo2P) return;
    colorP2Idx = (colorP2Idx + 1) % COLORES.length;
    updateUI();
});

document.getElementById('btn-play').addEventListener('click', iniciarJuego);
document.getElementById('btn-restart').addEventListener('click', iniciarJuego);
document.getElementById('btn-menu').addEventListener('click', irAlMenu);

// MOTOR DEL JUEGO
function iniciarJuego() {
    speedMs = nivelDiff === 0 ? 110 : (nivelDiff === 1 ? 70 : 45);

    cuerpoP1 = 3; puntosP1 = 0; dirP1 = 'D'; p1Muerto = false;
    x1 = []; y1 = [];
    for (let i = 0; i < cuerpoP1; i++) {
        x1.push(150 - i * BLOQUE);
        y1.push(350);
    }

    if (modo2P) {
        cuerpoP2 = 3; puntosP2 = 0; dirP2 = 'L'; p2Muerto = false;
        x2 = []; y2 = [];
        for (let i = 0; i < cuerpoP2; i++) {
            x2.push(550 + i * BLOQUE);
            y2.push(350);
        }
    }

    generarManzana();
    estado = 'JUGANDO';

    menuScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    if (modo2P) {
        scoreP2El.classList.remove('hidden');
        scoreP1El.style.color = COLORES[colorP1Idx].cabeza;
        scoreP2El.style.color = COLORES[colorP2Idx].cabeza;
    } else {
        scoreP2El.classList.add('hidden');
        scoreP1El.style.color = '#ffffff';
    }

    if (gameLoopTimer) clearInterval(gameLoopTimer);
    gameLoopTimer = setInterval(gameLoop, speedMs);
}

function generarManzana() {
    manzanaX = Math.floor(Math.random() * (ANCHO / BLOQUE)) * BLOQUE;
    manzanaY = Math.floor(Math.random() * (ALTO / BLOQUE)) * BLOQUE;
}

function gameLoop() {
    if (estado !== 'JUGANDO') return;
    mover();
    comprobarManzana();
    comprobarColisiones();
    dibujar();
}

function mover() {
    // Mover P1
    for (let i = cuerpoP1 - 1; i > 0; i--) {
        x1[i] = x1[i - 1];
        y1[i] = y1[i - 1];
    }
    if (dirP1 === 'W') y1[0] -= BLOQUE;
    if (dirP1 === 'S') y1[0] += BLOQUE;
    if (dirP1 === 'A') x1[0] -= BLOQUE;
    if (dirP1 === 'D') x1[0] += BLOQUE;

    // Mover P2
    if (modo2P) {
        for (let i = cuerpoP2 - 1; i > 0; i--) {
            x2[i] = x2[i - 1];
            y2[i] = y2[i - 1];
        }
        if (dirP2 === 'U') y2[0] -= BLOQUE;
        if (dirP2 === 'D') y2[0] += BLOQUE;
        if (dirP2 === 'L') x2[0] -= BLOQUE;
        if (dirP2 === 'R') x2[0] += BLOQUE;

        // Paredes atravesables en 2P
        if (x1[0] < 0) x1[0] = ANCHO - BLOQUE;
        else if (x1[0] >= ANCHO) x1[0] = 0;
        if (y1[0] < 0) y1[0] = ALTO - BLOQUE;
        else if (y1[0] >= ALTO) y1[0] = 0;

        if (x2[0] < 0) x2[0] = ANCHO - BLOQUE;
        else if (x2[0] >= ANCHO) x2[0] = 0;
        if (y2[0] < 0) y2[0] = ALTO - BLOQUE;
        else if (y2[0] >= ALTO) y2[0] = 0;
    }
}

function comprobarManzana() {
    if (x1[0] === manzanaX && y1[0] === manzanaY) {
        cuerpoP1++; puntosP1++; generarManzana();
    }
    if (modo2P && x2[0] === manzanaX && y2[0] === manzanaY) {
        cuerpoP2++; puntosP2++; generarManzana();
    }
}

function comprobarColisiones() {
    if (!modo2P) {
        if (x1[0] < 0 || x1[0] >= ANCHO || y1[0] < 0 || y1[0] >= ALTO) p1Muerto = true;
        for (let i = 1; i < cuerpoP1; i++) {
            if (x1[0] === x1[i] && y1[0] === y1[i]) p1Muerto = true;
        }
        if (p1Muerto) finalizarJuego();
    } else {
        // Colisiones de cuerpo propio
        for (let i = 1; i < cuerpoP1; i++) if (x1[0] === x1[i] && y1[0] === y1[i]) p1Muerto = true;
        for (let i = 1; i < cuerpoP2; i++) if (x2[0] === x2[i] && y2[0] === y2[i]) p2Muerto = true;

        // Colisión contra el rival
        for (let i = 0; i < cuerpoP2; i++) if (x1[0] === x2[i] && y1[0] === y2[i]) p1Muerto = true;
        for (let i = 0; i < cuerpoP1; i++) if (x2[0] === x1[i] && y2[0] === y1[i]) p2Muerto = true;

        if (x1[0] === x2[0] && y1[0] === y2[0]) { p1Muerto = true; p2Muerto = true; }

        if (puntosP1 >= META_PUNTOS) {
            mensajeGanador = "¡JUGADOR 1 ALCANZÓ 30 PUNTOS! GANA P1";
            finalizarJuego();
        } else if (puntosP2 >= META_PUNTOS) {
            mensajeGanador = "¡JUGADOR 2 ALCANZÓ 30 PUNTOS! GANA P2";
            finalizarJuego();
        } else if (p1Muerto && p2Muerto) {
            mensajeGanador = "¡EMPATE! AMBOS CHOCARON AL MISMO TIEMPO";
            finalizarJuego();
        } else if (p1Muerto) {
            mensajeGanador = "¡JUGADOR 1 CHOCÓ! GANA EL JUGADOR 2";
            finalizarJuego();
        } else if (p2Muerto) {
            mensajeGanador = "¡JUGADOR 2 CHOCÓ! GANA EL JUGADOR 1";
            finalizarJuego();
        }
    }
}

function finalizarJuego() {
    estado = 'GAMEOVER';
    clearInterval(gameLoopTimer);

    document.getElementById('go-title').innerText = modo2P ? "FIN DE LA PARTIDA" : "GAME OVER";
    document.getElementById('go-winner').innerText = modo2P ? mensajeGanador : "";
    document.getElementById('go-score').innerText = modo2P ? 
        `Puntaje Final -> P1: ${puntosP1} | P2: ${puntosP2}` : 
        `Puntaje Final: ${puntosP1}`;

    gameoverScreen.classList.remove('hidden');
}

function irAlMenu() {
    estado = 'MENU';
    clearInterval(gameLoopTimer);
    gameoverScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
}

function dibujar() {
    ctx.clearRect(0, 0, ANCHO, ALTO);

    // Rejilla
    ctx.strokeStyle = '#191926';
    for (let i = 0; i < ANCHO / BLOQUE; i++) {
        ctx.beginPath(); ctx.moveTo(i * BLOQUE, 0); ctx.lineTo(i * BLOQUE, ALTO); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * BLOQUE); ctx.lineTo(ANCHO, i * BLOQUE); ctx.stroke();
    }

    // Manzana
    ctx.fillStyle = '#ff3232';
    ctx.beginPath();
    ctx.arc(manzanaX + BLOQUE / 2, manzanaY + BLOQUE / 2, BLOQUE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Dibujar P1
    for (let i = 0; i < cuerpoP1; i++) {
        ctx.fillStyle = i === 0 ? COLORES[colorP1Idx].cabeza : COLORES[colorP1Idx].cuerpo;
        ctx.fillRect(x1[i] + 1, y1[i] + 1, BLOQUE - 2, BLOQUE - 2);
    }

    // Dibujar P2
    if (modo2P) {
        for (let i = 0; i < cuerpoP2; i++) {
            ctx.fillStyle = i === 0 ? COLORES[colorP2Idx].cabeza : COLORES[colorP2Idx].cuerpo;
            ctx.fillRect(x2[i] + 1, y2[i] + 1, BLOQUE - 2, BLOQUE - 2);
        }
    }

    // HUD
    scoreP1El.innerText = modo2P ? `P1: ${puntosP1} / 30` : `Puntaje: ${puntosP1}`;
    if (modo2P) scoreP2El.innerText = `P2: ${puntosP2} / 30`;
}

// TECLADO
window.addEventListener('keydown', (e) => {
    if (estado === 'MENU') {
        if (e.key === 'Enter') iniciarJuego();
        if (e.key === 'a' || e.key === 'A') { colorP1Idx = (colorP1Idx - 1 + COLORES.length) % COLORES.length; updateUI(); }
        if (e.key === 'd' || e.key === 'D') { colorP1Idx = (colorP1Idx + 1) % COLORES.length; updateUI(); }

        if (modo2P) {
            if (e.key === 'ArrowLeft') { colorP2Idx = (colorP2Idx - 1 + COLORES.length) % COLORES.length; updateUI(); }
            if (e.key === 'ArrowRight') { colorP2Idx = (colorP2Idx + 1) % COLORES.length; updateUI(); }
        }
    } else if (estado === 'JUGANDO') {
        // P1 (WASD)
        if ((e.key === 'a' || e.key === 'A') && dirP1 !== 'D') dirP1 = 'A';
        if ((e.key === 'd' || e.key === 'D') && dirP1 !== 'A') dirP1 = 'D';
        if ((e.key === 'w' || e.key === 'W') && dirP1 !== 'S') dirP1 = 'W';
        if ((e.key === 's' || e.key === 'S') && dirP1 !== 'W') dirP1 = 'S';

        // P2 (Flechas)
        if (modo2P) {
            if (e.key === 'ArrowLeft' && dirP2 !== 'R') dirP2 = 'L';
            if (e.key === 'ArrowRight' && dirP2 !== 'L') dirP2 = 'R';
            if (e.key === 'ArrowUp' && dirP2 !== 'D') dirP2 = 'U';
            if (e.key === 'ArrowDown' && dirP2 !== 'U') dirP2 = 'D';
        }

        if (e.key === 'Escape') irAlMenu();
    } else if (estado === 'GAMEOVER') {
        if (e.key === ' ') iniciarJuego();
        if (e.key === 'm' || e.key === 'M' || e.key === 'Escape') irAlMenu();
    }
});

// Inicializar
updateUI();