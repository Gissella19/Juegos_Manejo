// =========================================================
// MOTOR DEL JUEGO
// Equivalente a: main_menu(), customize_menu(), difficulty_menu(),
// play_game(), show_game_over() y el bucle principal de mainGame.py
// =========================================================

const STATE = {
    LOADING: "loading",
    MENU: "menu",
    CUSTOMIZE: "customize",
    DIFFICULTY: "difficulty",
    PLAYING: "playing",
    GAMEOVER: "gameover"
};

class GameApp {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.sound = new SoundManager();

        // "Configuración" global, equivalente a selected_color / selected_style / selected_difficulty
        this.selectedColor = 0;
        this.selectedStyle = 0;
        this.selectedDifficulty = 0;

        this.state = STATE.LOADING;
        this.menuSelected = 0;
        this.difficultySelected = 0;

        this.images = {};
        this.tinted = { normal: null, shoot: null, key: null };

        this.keysHeld = {};
        this.touchTarget = null;

        this.menuOptions = [
            "EMPEZAR JUEGO",
            "PERSONALIZAR NAVE",
            "DIFICULTAD",
            "SALIR"
        ];

        this._bindInput();
    }

    // =====================================================
    // CARGA DE RECURSOS
    // =====================================================
    async loadImages() {
        const load = (src) =>
            new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });

        const [background, gameover, sheet] = await Promise.all([
            load("assets/image/background.png"),
            load("assets/image/gameover.png"),
            load("assets/image/shoot.png")
        ]);

        this.images.background = background;
        this.images.gameover = gameover;
        this.images.sheet = sheet;
    }

    // =====================================================
    // TEÑIDO DE LA NAVE (equivalente a Player.change_color)
    // =====================================================
    getTintedShipFrames() {
        const key = `${this.selectedColor}-${this.selectedStyle}`;

        if (this.tinted.key === key) {
            return this.tinted;
        }

        const scale = this.selectedStyle === 1 ? 1.10 : 1.0;
        const color = SHIP_COLORS[this.selectedColor].value;

        const tint = (rect) => {
            const w = Math.round(rect.w * scale);
            const h = Math.round(rect.h * scale);

            const off = document.createElement("canvas");
            off.width = w;
            off.height = h;
            const octx = off.getContext("2d");

            octx.drawImage(
                this.images.sheet,
                rect.x, rect.y, rect.w, rect.h,
                0, 0, w, h
            );

            octx.globalCompositeOperation = "multiply";
            octx.fillStyle = color;
            octx.fillRect(0, 0, w, h);

            octx.globalCompositeOperation = "destination-in";
            octx.drawImage(
                this.images.sheet,
                rect.x, rect.y, rect.w, rect.h,
                0, 0, w, h
            );

            octx.globalCompositeOperation = "source-over";
            return off;
        };

        this.tinted = {
            key,
            normal: tint(SPRITE.player[0]),
            shoot: tint(SPRITE.player[1])
        };

        return this.tinted;
    }

    // =====================================================
    // ENTRADA DE TECLADO / TÁCTIL
    // =====================================================
    _bindInput() {
        window.addEventListener("keydown", (e) => {
            this.keysHeld[e.code] = true;
            this._handleKeyDown(e);
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Enter"].includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener("keyup", (e) => {
            this.keysHeld[e.code] = false;
        });

        // Controles táctiles: arrastrar el dedo mueve la nave
        this.canvas.addEventListener("touchstart", (e) => this._onTouch(e), { passive: false });
        this.canvas.addEventListener("touchmove", (e) => this._onTouch(e), { passive: false });
        this.canvas.addEventListener("touchend", () => {
            this.touchTarget = null;
        });

        this.canvas.addEventListener("click", () => this._handleClick());
    }

    _onTouch(e) {
        e.preventDefault();
        if (this.state !== STATE.PLAYING) return;

        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const scaleX = SCREEN_WIDTH / rect.width;
        const scaleY = SCREEN_HEIGHT / rect.height;

        this.touchTarget = {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY
        };
    }

    _handleClick() {
        if (this.state === STATE.GAMEOVER) {
            this._goToMenu();
        }
    }

    _handleKeyDown(e) {
        switch (this.state) {
            case STATE.MENU:
                this._menuKeyDown(e.code);
                break;
            case STATE.CUSTOMIZE:
                this._customizeKeyDown(e.code);
                break;
            case STATE.DIFFICULTY:
                this._difficultyKeyDown(e.code);
                break;
            case STATE.GAMEOVER:
                if (e.code === "Enter") this._goToMenu();
                break;
        }
    }

    // =====================================================
    // MENÚ PRINCIPAL
    // =====================================================
    _menuKeyDown(code) {
        if (code === "ArrowUp") {
            this.menuSelected =
                (this.menuSelected - 1 + this.menuOptions.length) % this.menuOptions.length;
        } else if (code === "ArrowDown") {
            this.menuSelected = (this.menuSelected + 1) % this.menuOptions.length;
        } else if (code === "Enter") {
            if (this.menuSelected === 0) {
                this._startGame();
            } else if (this.menuSelected === 1) {
                this.state = STATE.CUSTOMIZE;
            } else if (this.menuSelected === 2) {
                this.difficultySelected = this.selectedDifficulty;
                this.state = STATE.DIFFICULTY;
            } else if (this.menuSelected === 3) {
                // "SALIR": en la web simplemente volvemos al inicio del menú
                this.menuSelected = 0;
            }
        }
    }

    renderMenu() {
        const ctx = this.ctx;
        ctx.drawImage(this.images.background, 0, 0);
        drawDecorations(ctx);

        drawTitle(ctx, "SHOOT GAME", 40, COLORS.PINK, SCREEN_WIDTH / 2, 90);
        drawText(ctx, "MENU PRINCIPAL", 24, COLORS.DARK_YELLOW, SCREEN_WIDTH / 2, 145);

        this.menuOptions.forEach((option, i) => {
            drawButton(ctx, option, 205 + i * 72, i === this.menuSelected);
        });

        drawLine(ctx, 70, 515, 410, 515, COLORS.WHITE, 2);

        const colorName = SHIP_COLORS[this.selectedColor].name;
        const styleName = STYLE_NAMES[this.selectedStyle];
        const diff = DIFFICULTY[this.selectedDifficulty];

        drawText(ctx, "NAVE: " + colorName, 18, COLORS.DARK_BLUE, SCREEN_WIDTH / 2, 545);
        drawText(ctx, "ESTILO: " + styleName, 18, COLORS.DARK_PURPLE, SCREEN_WIDTH / 2, 575);
        drawText(ctx, "DIFICULTAD: " + diff.name, 18,
            this.selectedDifficulty === 0 ? COLORS.DARK_GREEN : COLORS.RED,
            SCREEN_WIDTH / 2, 605);

        drawText(ctx, "FLECHAS = SELECCIONAR", 18, COLORS.DARK_YELLOW, SCREEN_WIDTH / 2, 660);
        drawText(ctx, "ENTER = CONFIRMAR", 18, COLORS.DARK_PINK, SCREEN_WIDTH / 2, 695);
    }

    // =====================================================
    // MENÚ PERSONALIZAR NAVE
    // =====================================================
    _customizeKeyDown(code) {
        if (code === "ArrowLeft") {
            this.selectedColor = (this.selectedColor - 1 + SHIP_COLORS.length) % SHIP_COLORS.length;
        } else if (code === "ArrowRight") {
            this.selectedColor = (this.selectedColor + 1) % SHIP_COLORS.length;
        } else if (code === "ArrowUp" || code === "ArrowDown") {
            this.selectedStyle = this.selectedStyle === 0 ? 1 : 0;
        } else if (code === "Enter") {
            this.state = STATE.MENU;
        }
    }

    renderCustomize() {
        const ctx = this.ctx;
        ctx.drawImage(this.images.background, 0, 0);
        drawDecorations(ctx);

        drawTitle(ctx, "PERSONALIZAR NAVE", 36, COLORS.DARK_PINK, SCREEN_WIDTH / 2, 75);

        drawText(ctx, "COLOR", 26, COLORS.DARK_YELLOW, SCREEN_WIDTH / 2, 155);

        const colorName = SHIP_COLORS[this.selectedColor].name;
        const colorValue = SHIP_COLORS[this.selectedColor].value;

        ctx.beginPath();
        ctx.fillStyle = COLORS.BLACK;
        ctx.arc(SCREEN_WIDTH / 2, 215, 38, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = colorValue;
        ctx.arc(SCREEN_WIDTH / 2, 215, 29, 0, Math.PI * 2);
        ctx.fill();

        drawText(ctx, "<  " + colorName + "  >", 28, COLORS.DARK_BLUE, SCREEN_WIDTH / 2, 275);
        drawText(ctx, "IZQUIERDA / DERECHA = CAMBIAR COLOR", 15, COLORS.DARK_BLUE, SCREEN_WIDTH / 2, 315);

        drawText(ctx, "ESTILO", 26, COLORS.DARK_PURPLE, SCREEN_WIDTH / 2, 370);

        const styleName = STYLE_NAMES[this.selectedStyle];
        drawText(ctx, "<  " + styleName + "  >", 28, COLORS.DARK_PURPLE, SCREEN_WIDTH / 2, 425);
        drawText(ctx, "ARRIBA / ABAJO = CAMBIAR ESTILO", 15, COLORS.DARK_PURPLE, SCREEN_WIDTH / 2, 465);

        drawLine(ctx, 75, 500, 405, 500, COLORS.DARK_PURPLE, 2);

        drawText(ctx, "ENTER = VOLVER AL MENU", 20, COLORS.DARK_PINK, SCREEN_WIDTH / 2, 545);

        // Vista previa de la nave
        const tinted = this.getTintedShipFrames();
        ctx.drawImage(tinted.normal, SCREEN_WIDTH / 2 - tinted.normal.width / 2, 600);
    }

    // =====================================================
    // MENÚ DIFICULTAD
    // =====================================================
    _difficultyKeyDown(code) {
        if (code === "ArrowUp") {
            this.difficultySelected = 0;
        } else if (code === "ArrowDown") {
            this.difficultySelected = 1;
        } else if (code === "Enter") {
            this.selectedDifficulty = this.difficultySelected;
            this.state = STATE.MENU;
        }
    }

    renderDifficulty() {
        const ctx = this.ctx;
        ctx.drawImage(this.images.background, 0, 0);
        drawDecorations(ctx);

        drawTitle(ctx, "DIFICULTAD", 44, COLORS.PINK, SCREEN_WIDTH / 2, 90);

        drawButton(ctx, "NORMAL", 210, this.difficultySelected === 0);
        drawText(ctx, "Velocidad normal", 19, COLORS.GREEN, SCREEN_WIDTH / 2, 290);

        drawButton(ctx, "DIFICIL", 350, this.difficultySelected === 1);
        drawText(ctx, "Enemigos mas rapidos", 19, COLORS.RED, SCREEN_WIDTH / 2, 430);

        drawText(ctx, "FLECHAS = SELECCIONAR", 18, COLORS.DARK_YELLOW, SCREEN_WIDTH / 2, 530);
        drawText(ctx, "ENTER = ACEPTAR", 18, COLORS.DARK_PINK, SCREEN_WIDTH / 2, 565);
    }

    // =====================================================
    // JUEGO
    // =====================================================
    _startGame() {
        const tinted = this.getTintedShipFrames();

        this.player = new Player(this.images.sheet, [200, 600], SHIP_COLORS[this.selectedColor].value, this.selectedStyle);
        this.playerTintedFrames = tinted;

        this.enemies = [];
        this.enemiesDown = [];

        this.shootFrequency = 0;
        this.enemyFrequency = 0;
        this.playerDownIndex = 16;

        this.score = 0;
        this.touchTarget = null;

        const diff = DIFFICULTY[this.selectedDifficulty];
        this.enemySpeed = diff.enemySpeed;
        this.enemySpawnFrequency = diff.spawnFrequency;

        this.sound.playMusic();

        this.state = STATE.PLAYING;
    }

    updateGame() {
        const player = this.player;

        // ---- Disparo automático ----
        if (!player.isHit) {
            if (this.shootFrequency % 15 === 0) {
                this.sound.playBullet();
                player.shoot();
            }
            this.shootFrequency += 1;
            if (this.shootFrequency >= 15) this.shootFrequency = 0;
        }

        // ---- Generar enemigos ----
        if (this.enemyFrequency % this.enemySpawnFrequency === 0) {
            const ex = Math.floor(Math.random() * (SCREEN_WIDTH - SPRITE.enemy1.w));
            this.enemies.push(new Enemy([ex, 0], this.enemySpeed));
        }
        this.enemyFrequency += 1;
        if (this.enemyFrequency >= 100) this.enemyFrequency = 0;

        // ---- Mover balas ----
        player.bullets = player.bullets.filter((b) => {
            b.move();
            return b.bottom >= 0;
        });

        // ---- Mover enemigos + colisión con jugador ----
        let playerJustHit = false;
        this.enemies = this.enemies.filter((enemy) => {
            if (playerJustHit) return true;

            enemy.move();

            if (!player.isHit && circlesCollide(enemy, player)) {
                this.enemiesDown.push(enemy);
                player.isHit = true;
                this.sound.playGameOver();
                playerJustHit = true;
                return false;
            }

            if (enemy.y > SCREEN_HEIGHT) {
                return false;
            }

            return true;
        });

        // ---- Colisión balas / enemigos ----
        const survivingEnemies = [];
        for (const enemy of this.enemies) {
            let hit = false;
            player.bullets = player.bullets.filter((bullet) => {
                if (hit) return true;
                if (rectsCollide(enemy.rect, bullet.rect)) {
                    hit = true;
                    return false;
                }
                return true;
            });

            if (hit) {
                this.enemiesDown.push(enemy);
            } else {
                survivingEnemies.push(enemy);
            }
        }
        this.enemies = survivingEnemies;

        // ---- Movimiento del jugador ----
        if (!player.isHit) {
            if (this.keysHeld["KeyW"] || this.keysHeld["ArrowUp"]) player.moveUp();
            if (this.keysHeld["KeyS"] || this.keysHeld["ArrowDown"]) player.moveDown();
            if (this.keysHeld["KeyA"] || this.keysHeld["ArrowLeft"]) player.moveLeft();
            if (this.keysHeld["KeyD"] || this.keysHeld["ArrowRight"]) player.moveRight();

            if (this.touchTarget) {
                player.x = Math.min(Math.max(0, this.touchTarget.x - player.width / 2), SCREEN_WIDTH - player.width);
                player.y = Math.min(Math.max(0, this.touchTarget.y - player.height / 2), SCREEN_HEIGHT - player.height);
            }
        }

        // ---- Animación jugador / fin de juego ----
        if (!player.isHit) {
            player.imgIndex = Math.min(1, Math.floor(this.shootFrequency / 8));
        } else {
            this.playerDownIndex += 1;
            if (this.playerDownIndex > 47) {
                this._endGame();
            }
        }
    }

    _endGame() {
        this.sound.stopMusic();
        this.state = STATE.GAMEOVER;
    }

    renderGame() {
        const ctx = this.ctx;
        const player = this.player;

        ctx.drawImage(this.images.background, 0, 0);

        // ---- Jugador ----
        if (!player.isHit) {
            const frame = player.imgIndex === 0 ? this.playerTintedFrames.normal : this.playerTintedFrames.shoot;
            ctx.drawImage(frame, player.x, player.y, player.width, player.height);
        } else {
            const idx = Math.floor(this.playerDownIndex / 8);
            if (idx < SPRITE.player.length) {
                const rect = SPRITE.player[idx];
                ctx.drawImage(
                    this.images.sheet,
                    rect.x, rect.y, rect.w, rect.h,
                    player.x, player.y, player.width, player.height
                );
            }
        }

        // ---- Explosiones de enemigos ----
        this.enemiesDown = this.enemiesDown.filter((enemy) => {
            if (enemy.downIndex === 0) {
                this.sound.playEnemyDown();
            }

            if (enemy.downIndex > 7) {
                this.score += 1000;
                return false;
            }

            const rect = SPRITE.enemy1Down[Math.floor(enemy.downIndex / 2)];
            ctx.drawImage(
                this.images.sheet,
                rect.x, rect.y, rect.w, rect.h,
                enemy.x, enemy.y, enemy.w, enemy.h
            );

            enemy.downIndex += 1;
            return true;
        });

        // ---- Balas ----
        for (const bullet of player.bullets) {
            ctx.drawImage(
                this.images.sheet,
                SPRITE.bullet.x, SPRITE.bullet.y, SPRITE.bullet.w, SPRITE.bullet.h,
                bullet.x, bullet.y, bullet.w, bullet.h
            );
        }

        // ---- Enemigos ----
        for (const enemy of this.enemies) {
            ctx.drawImage(
                this.images.sheet,
                SPRITE.enemy1.x, SPRITE.enemy1.y, SPRITE.enemy1.w, SPRITE.enemy1.h,
                enemy.x, enemy.y, enemy.w, enemy.h
            );
        }

        drawHud(ctx, this.score, this.selectedDifficulty);
    }

    // =====================================================
    // GAME OVER
    // =====================================================
    renderGameOver() {
        const ctx = this.ctx;
        ctx.drawImage(this.images.gameover, 0, 0);

        drawTitle(ctx, "GAME OVER", 48, COLORS.PINK, SCREEN_WIDTH / 2, 300);
        drawText(ctx, "PUNTUACION", 24, COLORS.WHITE, SCREEN_WIDTH / 2, 370);
        drawTitle(ctx, String(this.score), 46, COLORS.YELLOW, SCREEN_WIDTH / 2, 420);
        drawText(ctx, "ENTER = VOLVER AL MENU", 20, COLORS.WHITE, SCREEN_WIDTH / 2, 500);
    }

    _goToMenu() {
        this.menuSelected = 0;
        this.state = STATE.MENU;
    }

    // =====================================================
    // BUCLE PRINCIPAL (equivalente al while running: de mainGame.py)
    // =====================================================
    start() {
        const TICK_MS = 1000 / 45; // clock.tick(45)
        let acc = 0;
        let last = performance.now();

        const loop = (now) => {
            const delta = now - last;
            last = now;
            acc += delta;

            // Actualiza la lógica en pasos fijos (igual que pygame a 45 FPS)
            while (acc >= TICK_MS) {
                if (this.state === STATE.PLAYING) {
                    this.updateGame();
                }
                acc -= TICK_MS;
            }

            this._render();
            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }

    _render() {
        switch (this.state) {
            case STATE.MENU:
                this.renderMenu();
                break;
            case STATE.CUSTOMIZE:
                this.renderCustomize();
                break;
            case STATE.DIFFICULTY:
                this.renderDifficulty();
                break;
            case STATE.PLAYING:
                this.renderGame();
                break;
            case STATE.GAMEOVER:
                this.renderGameOver();
                break;
        }
    }
}
