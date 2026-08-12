// =========================================================
// CONFIGURACIÓN GENERAL (equivalente a gameRole.py / constantes)
// =========================================================

const SCREEN_WIDTH = 480;
const SCREEN_HEIGHT = 800;

const COLORS = {
    WHITE: "#ffffff",
    BLACK: "#14101c",

    PINK: "#e12d87",
    DARK_PINK: "#aa195f",
    LIGHT_PINK: "#f555a5",

    PURPLE: "#a55ff0",
    DARK_PURPLE: "#6e37a5",
    LIGHT_PURPLE: "#cda5ff",

    BLUE: "#46aaff",
    DARK_BLUE: "#235aa5",
    LIGHT_BLUE: "#a0dcff",

    YELLOW: "#ffdc46",
    DARK_YELLOW: "#be9114",

    GREEN: "#46dc96",
    DARK_GREEN: "#1e915a",

    RED: "#ff4b5f",
    GRAY: "#b4b4c3",

    BUTTON_DARK: "#2d2341"
};

// Colores disponibles para la nave (nombre, color)
const SHIP_COLORS = [
    { name: "AZUL", value: "#5096ff" },
    { name: "ROJO", value: "#ff5050" },
    { name: "VERDE", value: "#50dc78" },
    { name: "MORADO", value: "#be64ff" }
];

// Rectángulos dentro del spritesheet shoot.png (igual que mainGame.py)
const SPRITE = {
    // Nave: [normal, disparando] + frames de explosión
    player: [
        { x: 0, y: 99, w: 102, h: 126 },
        { x: 165, y: 360, w: 102, h: 126 },
        { x: 165, y: 234, w: 102, h: 126 },
        { x: 330, y: 624, w: 102, h: 126 },
        { x: 330, y: 498, w: 102, h: 126 },
        { x: 432, y: 624, w: 102, h: 126 }
    ],
    bullet: { x: 1004, y: 987, w: 9, h: 21 },
    enemy1: { x: 534, y: 612, w: 57, h: 43 },
    enemy1Down: [
        { x: 267, y: 347, w: 57, h: 43 },
        { x: 873, y: 697, w: 57, h: 43 },
        { x: 267, y: 296, w: 57, h: 43 },
        { x: 930, y: 697, w: 57, h: 43 }
    ]
};

// Dificultades (igual que play_game() en mainGame.py)
const DIFFICULTY = [
    { name: "NORMAL", enemySpeed: 2, spawnFrequency: 50, color: COLORS.GREEN },
    { name: "DIFICIL", enemySpeed: 5, spawnFrequency: 35, color: COLORS.RED }
];

const STYLE_NAMES = ["CLASICO", "GRANDE"];
