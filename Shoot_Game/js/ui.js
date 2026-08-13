// =========================================================
// FUNCIONES DE DIBUJO DE INTERFAZ
// (equivalente a draw_text / draw_title / draw_button / draw_decorations)
// =========================================================

function drawText(ctx, text, size, color, x, y, center = true) {
    ctx.font = `${size}px "Segoe UI", Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = center ? "center" : "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
}

function drawTitle(ctx, text, size, color, x, y) {
    ctx.font = `bold ${size}px "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Sombra
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillText(text, x + 4, y + 4);

    // Texto principal
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

function drawButton(ctx, text, y, selected = false) {
    const width = 330;
    const height = 58;
    const x = (SCREEN_WIDTH - width) / 2;
    const radius = 15;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();

    if (selected) {
        ctx.fillStyle = COLORS.PINK;
        ctx.fill();
        ctx.strokeStyle = COLORS.LIGHT_PINK;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Punto amarillo indicador
        ctx.beginPath();
        ctx.fillStyle = COLORS.YELLOW;
        ctx.arc(x + 20, y + height / 2, 6, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.fillStyle = COLORS.BUTTON_DARK;
        ctx.fill();
        ctx.strokeStyle = COLORS.PURPLE;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawText(ctx, text, 26, COLORS.WHITE, SCREEN_WIDTH / 2, y + height / 2);
}

function drawDecorations(ctx) {
    const dots = [
        [25, 40, COLORS.LIGHT_PINK, 7],
        [455, 60, COLORS.LIGHT_BLUE, 8],
        [30, 735, COLORS.YELLOW, 6],
        [450, 750, COLORS.LIGHT_PURPLE, 8]
    ];

    dots.forEach(([x, y, color, r]) => {
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    });

    const stars = [
        [45, 130], [430, 145], [30, 430],
        [450, 440], [55, 690], [420, 680]
    ];

    stars.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.fillStyle = COLORS.WHITE;
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawLine(ctx, x1, y1, x2, y2, color, width = 2) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function drawHud(ctx, score, difficultyIndex) {
    // Caja de puntuación
    ctx.beginPath();
    const rx = 8, ry = 8, rw = 190, rh = 48, radius = 12;
    ctx.moveTo(rx + radius, ry);
    ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, radius);
    ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, radius);
    ctx.arcTo(rx, ry + rh, rx, ry, radius);
    ctx.arcTo(rx, ry, rx + rw, ry, radius);
    ctx.closePath();
    ctx.fillStyle = COLORS.BLACK;
    ctx.fill();
    ctx.strokeStyle = COLORS.PINK;
    ctx.lineWidth = 2;
    ctx.stroke();

    drawText(ctx, "PUNTOS:", 20, COLORS.WHITE, 60, 32, false);
    drawText(ctx, String(score), 22, COLORS.YELLOW, 150, 32, false);

    const diff = DIFFICULTY[difficultyIndex];
    drawText(ctx, diff.name, 18, diff.color, 420, 30);
}
