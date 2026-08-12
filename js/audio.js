// =========================================================
// SONIDOS (equivalente a la carga de sonidos en mainGame.py)
// =========================================================

class SoundManager {
    constructor() {
        this.bulletSound = new Audio("assets/sound/bullet.mp3");
        this.enemyDownSound = new Audio("assets/sound/enemy1_down.mp3");
        this.gameOverSound = new Audio("assets/sound/game_over.mp3");
        this.music = new Audio("assets/sound/game_music.mp3");

        this.bulletSound.volume = 0.3;
        this.enemyDownSound.volume = 0.3;
        this.gameOverSound.volume = 0.3;
        this.music.volume = 0.25;
        this.music.loop = true;

        this.enabled = true;
    }

    // Clona el audio para permitir sonidos superpuestos (varias balas seguidas)
    _play(audioEl) {
        if (!this.enabled) return;
        const clone = audioEl.cloneNode();
        clone.volume = audioEl.volume;
        clone.play().catch(() => {});
    }

    playBullet() {
        this._play(this.bulletSound);
    }

    playEnemyDown() {
        this._play(this.enemyDownSound);
    }

    playGameOver() {
        this._play(this.gameOverSound);
    }

    playMusic() {
        if (!this.enabled) return;
        this.music.currentTime = 0;
        this.music.play().catch(() => {});
    }

    stopMusic() {
        this.music.pause();
        this.music.currentTime = 0;
    }
}
