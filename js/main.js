// =========================================================
// PUNTO DE ENTRADA (equivalente al bloque "PROGRAMA PRINCIPAL")
// =========================================================

window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("game-canvas");
    canvas.width = SCREEN_WIDTH;
    canvas.height = SCREEN_HEIGHT;

    const loadingEl = document.getElementById("loading");
    const app = new GameApp(canvas);

    app.loadImages()
        .then(() => {
            loadingEl.style.display = "none";
            canvas.style.display = "block";
            app.state = STATE.MENU;
            app.start();
        })
        .catch((err) => {
            loadingEl.textContent = "Error cargando los recursos del juego.";
            console.error(err);
        });
});
