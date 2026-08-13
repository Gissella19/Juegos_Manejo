// =========================================================
// ENTIDADES DEL JUEGO (equivalente a gameRole.py)
// =========================================================

// -------------------------
// Clase Bullet
// -------------------------
class Bullet {
    constructor(x, y) {
        this.w = SPRITE.bullet.w;
        this.h = SPRITE.bullet.h;
        // init_pos es "midbottom" en pygame
        this.x = x - this.w / 2;
        this.y = y - this.h;
        this.speed = 10;
    }

    move() {
        this.y -= this.speed;
    }

    get bottom() {
        return this.y + this.h;
    }

    get rect() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }
}

// -------------------------
// Clase Player
// -------------------------
class Player {
    constructor(spriteSheet, initPos, color, style) {
        this.spriteSheet = spriteSheet;
        this.color = color;
        this.style = style; // 0 = clasico, 1 = grande

        // Escala aplicada al sprite (estilo GRANDE = 1.10x, igual que Python)
        this.scale = style === 1 ? 1.10 : 1.0;

        this.baseW = SPRITE.player[0].w * this.scale;
        this.baseH = SPRITE.player[0].h * this.scale;

        this.x = initPos[0];
        this.y = initPos[1];

        this.speed = 8;
        this.bullets = [];
        this.imgIndex = 0;
        this.isHit = false;
    }

    get width() {
        return this.baseW;
    }

    get height() {
        return this.baseH;
    }

    get rect() {
        return { x: this.x, y: this.y, w: this.width, h: this.height };
    }

    // Centro de colisión (equivalente a collide_circle de pygame)
    get center() {
        return { x: this.x + this.width / 2, y: this.y + this.height / 2 };
    }

    get radius() {
        return Math.min(this.width, this.height) * 0.4;
    }

    shoot() {
        const midTopX = this.x + this.width / 2;
        const midTopY = this.y;
        this.bullets.push(new Bullet(midTopX, midTopY));
    }

    moveUp() {
        this.y = Math.max(0, this.y - this.speed);
    }

    moveDown() {
        this.y = Math.min(SCREEN_HEIGHT - this.height, this.y + this.speed);
    }

    moveLeft() {
        this.x = Math.max(0, this.x - this.speed);
    }

    moveRight() {
        this.x = Math.min(SCREEN_WIDTH - this.width, this.x + this.speed);
    }
}

// -------------------------
// Clase Enemy
// -------------------------
class Enemy {
    constructor(initPos, speed) {
        this.w = SPRITE.enemy1.w;
        this.h = SPRITE.enemy1.h;
        this.x = initPos[0];
        this.y = initPos[1];
        this.speed = speed;
        this.downIndex = 0; // -1 significa "no explotando"
        this.exploding = false;
    }

    move() {
        this.y += this.speed;
    }

    get rect() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }

    get center() {
        return { x: this.x + this.w / 2, y: this.y + this.h / 2 };
    }

    get radius() {
        return Math.min(this.w, this.h) * 0.45;
    }
}

// -------------------------
// Utilidad de colisión (rectángulos)
// -------------------------
function rectsCollide(a, b) {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}

// Colisión circular (equivalente a pygame.sprite.collide_circle)
function circlesCollide(entityA, entityB) {
    const ca = entityA.center;
    const cb = entityB.center;
    const dx = ca.x - cb.x;
    const dy = ca.y - cb.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < entityA.radius + entityB.radius;
}
