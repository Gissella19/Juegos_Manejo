// Nota: el repo original cargaba 'howler' vía npm/Vite. Lo quitamos para que
// el juego corra abriendo index.html directamente, sin instalar nada.
// playSound() clona el <audio> cada vez que suena, así los efectos pueden
// solaparse igual que hacía Howler.
function playSound(src, volume = 1) {
  const a = new Audio(src)
  a.volume = volume
  a.play().catch(() => {})
  return a
}

const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

canvas.width = innerWidth
canvas.height = innerHeight

// ===================== REFERENCIAS DOM =====================
const scoreEl = document.querySelector('#scoreEl')
const startGameBtn = document.querySelector('#startGameBtn')
const restartGameBtn = document.querySelector('#restartGameBtn')
const startModalEl = document.querySelector('#startModalEl')
const endModalEl = document.querySelector('#endModalEl')
const endTitleEl = document.querySelector('#endTitleEl')
const endWaveEl = document.querySelector('#endWaveEl')
const bigScoreEl = document.querySelector('#bigScoreEl')
const soundOffEl = document.querySelector('#soundOffEl')
const soundOnEl = document.querySelector('#soundOnEl')
const echoBarFillEl = document.querySelector('#echoBarFill')
const echoLabelEl = document.querySelector('#echoLabel')
const echoHudEl = document.querySelector('#echoHudEl')
const hudEl = document.querySelector('#hudEl')
const heartsEl = document.querySelector('#heartsEl')
const waveLabelEl = document.querySelector('#waveLabelEl')
const waveTimerFillEl = document.querySelector('#waveTimerFillEl')
const waveStatusEl = document.querySelector('#waveStatusEl')
const consumableHudEl = document.querySelector('#consumableHudEl')
const grenadeCountEl = document.querySelector('#grenadeCountEl')
const oneHitCountEl = document.querySelector('#oneHitCountEl')
const shopModalEl = document.querySelector('#shopModalEl')
const shopTitleEl = document.querySelector('#shopTitleEl')
const shopCurrencyEl = document.querySelector('#shopCurrencyEl')
const permanentListEl = document.querySelector('#permanentListEl')
const consumableListEl = document.querySelector('#consumableListEl')
const continueBtn = document.querySelector('#continueBtn')

// ===================== AUDIO =====================
const startGameAudio = new Audio('./audio/startGame.mp3')
const endGameAudio = new Audio('./audio/endGame.mp3')
const shootAudio = { play: () => playSound('./audio/shoot.mp3', 0.6) }
const enemyHitAudio = { play: () => playSound('./audio/enemyHit.mp3') }
const enemyEliminatedAudio = { play: () => playSound('./audio/enemyEliminated.mp3') }
const obtainPowerUpAudio = { play: () => playSound('./audio/obtainPowerUp.mp3') }
const backgroundMusicAudio = new Audio('./audio/backgroundMusic.mp3')
backgroundMusicAudio.loop = true

// ===================== ESTADO GENERAL DEL JUEGO =====================
// 'menu' | 'playing' | 'shop' | 'gameover' | 'victory'
const scene = {
  active: false,
  state: 'menu'
}

const MAX_HEARTS = 5
const INVULNERABLE_FRAMES = 60 // ~1s de invulnerabilidad tras recibir un golpe

// ===================== MOVIMIENTO (FIX) =====================
// Antes: cada keydown sumaba velocidad sin un keyup que la restara, lo que
// generaba una respuesta errática y acumulativa. Ahora usamos un set de
// teclas presionadas y calculamos la velocidad desde cero en cada frame:
// arcade preciso, responde al instante y se detiene apenas sueltas la tecla.
const keysPressed = new Set()
const MOVE_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
])

addEventListener('keydown', (e) => {
  if (MOVE_KEYS.has(e.code)) keysPressed.add(e.code)

  if (e.code === 'KeyE') {
    if (scene.state === 'playing') spawnEcho()
  } else if (e.code === 'KeyG') {
    if (scene.state === 'playing') throwGrenade()
  } else if (e.code === 'KeyQ') {
    if (scene.state === 'playing') armPiercingShot()
  }
})

addEventListener('keyup', (e) => {
  if (MOVE_KEYS.has(e.code)) keysPressed.delete(e.code)
})

// se pierde el foco de la ventana -> soltamos todas las teclas para que el
// jugador no quede "trabado" moviéndose solo
addEventListener('blur', () => keysPressed.clear())

class Player {
  constructor(x, y, radius, color) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    this.velocity = { x: 0, y: 0 }
    this.powerUp = ''

    this.hearts = MAX_HEARTS
    this.invulnerable = 0

    // ---- mejoras permanentes (se resetean cada partida nueva) ----
    this.speedLevel = 0 // +10% por nivel, hasta 5
    this.doubleShot = false
    this.homing = false
    this.extraWeaponLevel = 0 // 0 = ninguna, 1 = un cañón extra, 2 = dos cañones extra
    this.hasAlly = false

    // ---- consumibles ----
    this.grenades = 0
    this.piercingShots = 0
    this.piercingArmed = false
  }

  get baseSpeed() {
    return 4.2 * (1 + this.speedLevel * 0.1)
  }

  draw() {
    c.save()
    if (this.invulnerable > 0 && Math.floor(this.invulnerable / 4) % 2 === 0) {
      c.globalAlpha = 0.35
    }

    if (cannonImgReady) {
      // dibuja la torreta centrada en el jugador, rotada hacia el cursor
      const angle = (typeof mouse !== 'undefined' && mouse.x !== undefined)
        ? Math.atan2(mouse.y - this.y, mouse.x - this.x)
        : 0
      // tamaño visual de la torreta (mayor que el hitbox para que se vea
      // bien el detalle), respetando la proporción de la imagen.
      const targetW = this.radius * 6
      const ratio = cannonImg.height / cannonImg.width
      const w = targetW
      const h = targetW * ratio
      c.translate(this.x, this.y)
      c.rotate(angle + CANNON_ART_OFFSET)
      c.drawImage(cannonImg, -w / 2, -h / 2, w, h)
    } else {
      // respaldo: círculo (mientras no exista la imagen del cañón)
      c.beginPath()
      c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
      c.fillStyle = this.color
      c.fill()
    }
    c.restore()
  }

  update() {
    this.draw()

    // --- calcular dirección desde las teclas presionadas (arcade preciso) ---
    let dx = 0
    let dy = 0
    if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) dy -= 1
    if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) dy += 1
    if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) dx -= 1
    if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) dx += 1

    if (dx !== 0 && dy !== 0) {
      // normalizar diagonal para que no sea más rápido que en línea recta
      const inv = 1 / Math.sqrt(2)
      dx *= inv
      dy *= inv
    }

    this.velocity.x = dx * this.baseSpeed
    this.velocity.y = dy * this.baseSpeed

    const nextX = this.x + this.velocity.x
    const nextY = this.y + this.velocity.y

    if (nextX - this.radius > 0 && nextX + this.radius < canvas.width) {
      this.x = nextX
    }
    if (nextY - this.radius > 0 && nextY + this.radius < canvas.height) {
      this.y = nextY
    }

    if (this.invulnerable > 0) this.invulnerable--
  }

  takeHit() {
    if (this.invulnerable > 0) return false
    this.hearts--
    this.invulnerable = INVULNERABLE_FRAMES
    updateHeartsHud()
    for (let i = 0; i < 14; i++) {
      particles.push(
        new Particle(this.x, this.y, Math.random() * 2, '#ff4d4d', {
          x: (Math.random() - 0.5) * 6,
          y: (Math.random() - 0.5) * 6
        })
      )
    }
    return true
  }

  shoot(mouse, color = 'white') {
    const angle = Math.atan2(mouse.y - this.y, mouse.x - this.x)
    const speed = 5
    const piercing = this.piercingArmed
    if (piercing) this.piercingArmed = false

    const perpAngle = angle + Math.PI / 2
    const perp = { x: Math.cos(perpAngle), y: Math.sin(perpAngle) }

    // dispara una bala en la MISMA dirección del arma principal, desplazada
    // lateralmente `lateral` px, y opcionalmente retrocedida `back` px sobre
    // la línea de tiro (para el efecto de "una bala detrás de otra").
    const makeShot = (lateral, shotColor, back = 0) => {
      const velocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }
      const px = this.x + perp.x * lateral - Math.cos(angle) * back
      const py = this.y + perp.y * lateral - Math.sin(angle) * back
      const projectile = new Projectile(px, py, 5, shotColor, velocity)
      projectile.homing = this.homing
      projectile.piercing = piercing
      if (piercing) projectile.color = '#00E5FF'
      projectiles.push(projectile)
    }

    // ---- arma principal ----
    // Disparo doble = dos proyectiles en la MISMA línea y dirección; el
    // segundo sale claramente por detrás del primero (mismo instante,
    // separado en el espacio) para que se vea uno siguiendo al otro.
    makeShot(0, color)
    if (this.doubleShot) {
      makeShot(0, color, 26) // segunda bala, misma línea, separada detrás
    }

    // ---- armas extra: cañones paralelos, misma dirección ----
    // Solo disparan cuando el jugador dispara (no auto-apuntan).
    // Nivel 1: un cañón extra. Nivel 2: dos cañones extra (uno a cada lado).
    const extraColor = '#00e5ff'
    if (this.extraWeaponLevel >= 1) makeShot(20, extraColor)
    if (this.extraWeaponLevel >= 2) makeShot(-20, extraColor)

    shootAudio.play()

    // Registramos el disparo (con el frame exacto y el ángulo) para que,
    // si más tarde invocamos un Eco, pueda repetir este mismo disparo.
    shotLog.push({ frame, angle })
  }
}

class Projectile {
  constructor(x, y, radius, color, velocity) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    this.velocity = velocity
    this.damage = 25
    this.homing = false
    this.piercing = false
  }

  draw() {
    c.beginPath()
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
    c.fillStyle = this.color
    c.fill()
  }

  update() {
    if (this.homing) steerTowardNearestEnemy(this, 0.05)
    this.draw()
    this.x = this.x + this.velocity.x
    this.y = this.y + this.velocity.y
  }
}

// Proyectiles disparados por el jefe final hacia el jugador
class EnemyProjectile {
  constructor(x, y, radius, color, velocity) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    this.velocity = velocity
  }

  draw() {
    c.beginPath()
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
    c.fillStyle = this.color
    c.shadowColor = this.color
    c.shadowBlur = 8
    c.fill()
    c.shadowBlur = 0
  }

  update() {
    this.draw()
    this.x += this.velocity.x
    this.y += this.velocity.y
  }
}

function steerTowardNearestEnemy(projectile, turnRate) {
  let target = null
  let bestDist = 260
  const pool = boss ? [...enemies, boss] : enemies
  pool.forEach((e) => {
    const d = Math.hypot(e.x - projectile.x, e.y - projectile.y)
    if (d < bestDist) {
      bestDist = d
      target = e
    }
  })
  if (!target) return
  const currentAngle = Math.atan2(projectile.velocity.y, projectile.velocity.x)
  const targetAngle = Math.atan2(target.y - projectile.y, target.x - projectile.x)
  let diff = targetAngle - currentAngle
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  const newAngle = currentAngle + diff * turnRate
  const speed = Math.hypot(projectile.velocity.x, projectile.velocity.y)
  projectile.velocity.x = Math.cos(newAngle) * speed
  projectile.velocity.y = Math.sin(newAngle) * speed
}

const powerUpImg = new Image()
powerUpImg.src = './img/lightning.png'

// Imagen del protagonista (torreta/cañón). Se dibuja rotada hacia el cursor.
// En la imagen de origen, la mira (los dos cañones) apunta a la IZQUIERDA en
// reposo, por eso el offset es π (180°): así la mira queda alineada con la
// dirección real de disparo hacia el cursor.
const cannonImg = new Image()
let cannonImgReady = false
cannonImg.onload = () => { cannonImgReady = true }
cannonImg.src = './img/cannon.png'
const CANNON_ART_OFFSET = Math.PI // la mira de la imagen apunta a la izquierda

class PowerUp {
  constructor(x, y, velocity) {
    this.x = x
    this.y = y
    this.velocity = velocity
    this.width = 14
    this.height = 18
    this.radians = 0
  }

  draw() {
    c.save()
    c.translate(this.x + this.width / 2, this.y + this.height / 2)
    c.rotate(this.radians)
    c.translate(-this.x - this.width / 2, -this.y - this.height / 2)
    c.drawImage(powerUpImg, this.x, this.y, 14, 18)
    c.restore()
  }

  update() {
    this.radians += 0.002
    this.draw()
    this.x = this.x + this.velocity.x
    this.y = this.y + this.velocity.y
  }
}

class Enemy {
  constructor(x, y, radius, color, velocity, unpredictableChance = 0.25) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    this.velocity = velocity
    this.type = 'linear'
    this.center = { x, y }
    this.radians = 0
    this.age = 0 // frames vividos, usado como red de seguridad en oleada 5

    if (Math.random() < unpredictableChance) {
      this.type = 'homing'
      if (Math.random() < 0.5) {
        this.type = 'spinning'
        if (Math.random() < 0.75) {
          this.type = 'homingSpinning'
        }
      }
    }
  }

  draw() {
    c.beginPath()
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
    c.fillStyle = this.color
    c.fill()
  }

  update() {
    this.draw()
    this.age++

    // Red de seguridad para que la oleada 5 (que exige eliminar a todos)
    // nunca se trabe: si un enemigo sobrevive demasiado tiempo, dejamos
    // de dejar que orbite/esquive y lo convertimos en un blanco lento y
    // predecible que avanza recto hacia el jugador. Así siempre es
    // alcanzable y la ronda puede terminar.
    if (this.age > 600 && (this.type === 'spinning' || this.type === 'homingSpinning')) {
      this.type = 'homing'
    }
    if (this.age > 900) {
      this.type = 'linear'
      const toPlayer = Math.atan2(player.y - this.y, player.x - this.x)
      const slow = 1.6
      this.velocity = { x: Math.cos(toPlayer) * slow, y: Math.sin(toPlayer) * slow }
    }

    // Si un enemigo se aleja demasiado de la pantalla (puede pasar con los
    // tipos que orbitan), lo reorientamos al centro para que no quede
    // inalcanzable.
    const margin = 160
    const offscreen =
      this.x < -margin || this.x > canvas.width + margin ||
      this.y < -margin || this.y > canvas.height + margin
    if (offscreen) {
      const speed = Math.hypot(this.velocity.x, this.velocity.y) || 1.5
      const toCenter = Math.atan2(canvas.height / 2 - this.y, canvas.width / 2 - this.x)
      this.velocity = { x: Math.cos(toCenter) * speed, y: Math.sin(toCenter) * speed }
      this.type = 'linear'
    }

    if (this.type === 'linear') {
      this.x = this.x + this.velocity.x
      this.y = this.y + this.velocity.y
    } else if (this.type === 'homing') {
      const angle = Math.atan2(player.y - this.y, player.x - this.x)
      this.velocity = { x: Math.cos(angle), y: Math.sin(angle) }
      this.x = this.x + this.velocity.x
      this.y = this.y + this.velocity.y
    } else if (this.type === 'spinning') {
      this.radians += 0.05
      this.center.x += this.velocity.x
      this.center.y += this.velocity.y
      this.x = this.center.x + Math.cos(this.radians) * 100
      this.y = this.center.y + Math.sin(this.radians) * 100
    } else if (this.type === 'homingSpinning') {
      const angle = Math.atan2(player.y - this.y, player.x - this.x)
      this.velocity = { x: Math.cos(angle), y: Math.sin(angle) }
      this.radians += 0.05
      this.center.x += this.velocity.x
      this.center.y += this.velocity.y
      this.x = this.center.x + Math.cos(this.radians) * 100
      this.y = this.center.y + Math.sin(this.radians) * 100
    }
  }
}

// ===================== JEFE FINAL (3 fases) =====================
class Boss {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.radius = 90
    this.color = '#e74c3c'
    this.maxHp = 1500
    this.hp = this.maxHp
    this.phase = 1
    this.attackTimer = 90
    this.minionTimer = 260
    this.jitter = { x: 0, y: 0 }
  }

  get phaseConfig() {
    if (this.phase === 1) return { speed: 0.55, attackInterval: 150, projectiles: 8, minionInterval: 0 }
    if (this.phase === 2) return { speed: 0.9, attackInterval: 120, projectiles: 12, minionInterval: 360 }
    return { speed: 1.4, attackInterval: 80, projectiles: 16, minionInterval: 240 }
  }

  updatePhase() {
    const pct = this.hp / this.maxHp
    let newPhase = 1
    if (pct <= 0.33) newPhase = 3
    else if (pct <= 0.66) newPhase = 2
    if (newPhase !== this.phase) {
      this.phase = newPhase
      waveStatusEl.textContent = `JEFE FINAL — Fase ${this.phase}`
      for (let i = 0; i < 40; i++) {
        particles.push(
          new Particle(this.x, this.y, Math.random() * 3, this.color, {
            x: (Math.random() - 0.5) * 8,
            y: (Math.random() - 0.5) * 8
          })
        )
      }
    }
  }

  draw() {
    c.beginPath()
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
    c.fillStyle = this.color
    c.fill()

    // barra de vida propia sobre el jefe
    const barWidth = this.radius * 2
    const pct = Math.max(0, this.hp / this.maxHp)
    c.fillStyle = 'rgba(0,0,0,0.5)'
    c.fillRect(this.x - barWidth / 2, this.y - this.radius - 18, barWidth, 8)
    c.fillStyle = pct > 0.33 ? '#e74c3c' : '#ff6b6b'
    c.fillRect(this.x - barWidth / 2, this.y - this.radius - 18, barWidth * pct, 8)
  }

  update() {
    this.updatePhase()
    const cfg = this.phaseConfig

    // movimiento: sigue lentamente al jugador (en fase 3 con temblor errático)
    const angle = Math.atan2(player.y - this.y, player.x - this.x)
    let vx = Math.cos(angle) * cfg.speed
    let vy = Math.sin(angle) * cfg.speed

    if (this.phase === 3) {
      this.jitter.x += (Math.random() - 0.5) * 0.6
      this.jitter.y += (Math.random() - 0.5) * 0.6
      this.jitter.x *= 0.9
      this.jitter.y *= 0.9
      vx += this.jitter.x
      vy += this.jitter.y
    }

    const nextX = this.x + vx
    const nextY = this.y + vy
    if (nextX - this.radius > 0 && nextX + this.radius < canvas.width) this.x = nextX
    if (nextY - this.radius > 0 && nextY + this.radius < canvas.height) this.y = nextY

    this.draw()

    // ataque en anillo de proyectiles
    this.attackTimer--
    if (this.attackTimer <= 0) {
      this.attackTimer = cfg.attackInterval
      const n = cfg.projectiles
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n
        enemyProjectiles.push(
          new EnemyProjectile(this.x, this.y, 6, '#ff6b6b', {
            x: Math.cos(a) * 3.2,
            y: Math.sin(a) * 3.2
          })
        )
      }
    }

    // invoca minions en fases 2 y 3
    if (cfg.minionInterval > 0) {
      this.minionTimer--
      if (this.minionTimer <= 0) {
        this.minionTimer = cfg.minionInterval
        spawnMinionNear(this.x, this.y)
      }
    }
  }
}

function spawnMinionNear(x, y) {
  const angle = Math.random() * Math.PI * 2
  const dist = 160
  const ex = x + Math.cos(angle) * dist
  const ey = y + Math.sin(angle) * dist
  const color = `hsl(${Math.random() * 360}, 50%, 50%)`
  const dirAngle = Math.atan2(player.y - ey, player.x - ex)
  enemies.push(
    new Enemy(ex, ey, 12, color, { x: Math.cos(dirAngle) * 1.4, y: Math.sin(dirAngle) * 1.4 }, 0.3)
  )
}

// ===================== ALIADO Y TORRETA (mejoras permanentes) =====================
class Ally {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.radius = 9
    this.color = '#3ddc97'
    this.cooldown = 0
    this.range = 260
  }

  draw() {
    c.beginPath()
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
    c.fillStyle = this.color
    c.fill()
  }

  update() {
    // sigue al jugador manteniendo una distancia (offset diagonal)
    const targetX = player.x - 42
    const targetY = player.y - 42
    this.x += (targetX - this.x) * 0.08
    this.y += (targetY - this.y) * 0.08
    this.draw()

    if (this.cooldown > 0) {
      this.cooldown--
      return
    }
    const target = findNearestTarget(this.x, this.y, this.range)
    if (target) {
      fireAutoProjectile(this.x, this.y, target, this.color, 18)
      this.cooldown = 40
    }
  }
}

function findNearestTarget(x, y, range) {
  let best = null
  let bestDist = range
  enemies.forEach((e) => {
    const d = Math.hypot(e.x - x, e.y - y)
    if (d < bestDist) {
      bestDist = d
      best = e
    }
  })
  if (boss) {
    const d = Math.hypot(boss.x - x, boss.y - y)
    if (d < bestDist) best = boss
  }
  return best
}

function fireAutoProjectile(x, y, target, color, damage) {
  const angle = Math.atan2(target.y - y, target.x - x)
  const velocity = { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5 }
  const p = new Projectile(x, y, 4, color, velocity)
  p.damage = damage
  projectiles.push(p)
}

// ===================== GRANADAS =====================
class Grenade {
  constructor(x, y, targetX, targetY) {
    this.x = x
    this.y = y
    this.startX = x
    this.startY = y
    this.targetX = targetX
    this.targetY = targetY
    this.t = 0
    this.duration = 34
    this.exploded = false
    this.blastRadius = 110
  }

  draw() {
    const arc = Math.sin((this.t / this.duration) * Math.PI) * -40
    c.beginPath()
    c.arc(this.x, this.y + arc, 6, 0, Math.PI * 2, false)
    c.fillStyle = '#8bc34a'
    c.fill()
  }

  update() {
    this.t++
    const progress = Math.min(1, this.t / this.duration)
    this.x = this.startX + (this.targetX - this.startX) * progress
    this.y = this.startY + (this.targetY - this.startY) * progress
    this.draw()

    if (progress >= 1 && !this.exploded) {
      this.explode()
    }
  }

  explode() {
    this.exploded = true
    for (let i = 0; i < 30; i++) {
      particles.push(
        new Particle(this.x, this.y, Math.random() * 3, '#8bc34a', {
          x: (Math.random() - 0.5) * (Math.random() * 8),
          y: (Math.random() - 0.5) * (Math.random() * 8)
        })
      )
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i]
      const d = Math.hypot(e.x - this.x, e.y - this.y)
      if (d < this.blastRadius) {
        killEnemy(e)
      }
    }
    // la limpieza real de los marcados ocurre al final del frame en animate()

    if (boss) {
      const d = Math.hypot(boss.x - this.x, boss.y - this.y)
      if (d < this.blastRadius) {
        boss.hp -= 70
      }
    }
  }
}

function throwGrenade() {
  if (player.grenades <= 0) return
  if (mouse.x === undefined) return
  player.grenades--
  updateConsumablesHud()
  grenades.push(new Grenade(player.x, player.y, mouse.x, mouse.y))
}

function armPiercingShot() {
  if (player.piercingShots <= 0) return
  if (player.piercingArmed) return
  player.piercingShots--
  player.piercingArmed = true
  updateConsumablesHud()
}

// ---------------------------------------------------------------------
// ECO: mecánica existente. Mientras juegas, grabamos continuamente tu
// posición (movementLog) y tus disparos (shotLog) en una ventana de los
// últimos ECHO_WINDOW_FRAMES. Al presionar E, esa ventana se "congela" en
// un Echo: un reflejo violeta de ti mismo que repite ese recorrido y esos
// disparos una vez, peleando a tu lado mientras tú sigues jugando.
// ---------------------------------------------------------------------
const ECHO_WINDOW_FRAMES = 240
const ECHO_COOLDOWN_FRAMES = 480
const ECHO_OFFSET = 46
const ECHO_COLOR = '#8B7FE8'

class Echo {
  constructor(frames, shots) {
    this.frames = frames
    this.shots = shots
    this.t = 0
    this.radius = 8
    this.alpha = 1
    this.done = false
    const first = this.frames[0] || { x: player.x, y: player.y }
    this.x = this.clampX(first.x + ECHO_OFFSET)
    this.y = this.clampY(first.y + ECHO_OFFSET)
  }

  clampX(x) { return Math.min(canvas.width - this.radius, Math.max(this.radius, x)) }
  clampY(y) { return Math.min(canvas.height - this.radius, Math.max(this.radius, y)) }

  draw() {
    c.save()
    c.globalAlpha = this.alpha
    c.beginPath()
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
    c.fillStyle = ECHO_COLOR
    c.shadowColor = ECHO_COLOR
    c.shadowBlur = 15
    c.fill()
    c.restore()
  }

  update() {
    if (this.t >= this.frames.length) {
      this.alpha -= 0.05
      if (this.alpha <= 0) this.done = true
      this.draw()
      return
    }

    const f = this.frames[this.t]
    this.x = this.clampX(f.x + ECHO_OFFSET)
    this.y = this.clampY(f.y + ECHO_OFFSET)
    this.draw()

    this.shots
      .filter((s) => s.frame === this.t)
      .forEach((s) => {
        const velocity = { x: Math.cos(s.angle) * 5, y: Math.sin(s.angle) * 5 }
        projectiles.push(new Projectile(this.x, this.y, 5, ECHO_COLOR, velocity))
      })

    this.t++
  }
}

function spawnEcho() {
  if (echoCooldown > 0) return
  if (movementLog.length < 10) return

  const startFrame = movementLog[0].frame
  const frames = movementLog.map((m) => ({ x: m.x, y: m.y }))
  const shots = shotLog
    .filter((s) => s.frame >= startFrame)
    .map((s) => ({ frame: s.frame - startFrame, angle: s.angle }))

  echoes.push(new Echo(frames, shots))
  echoCooldown = ECHO_COOLDOWN_FRAMES

  for (let i = 0; i < 20; i++) {
    particles.push(
      new Particle(player.x, player.y, Math.random() * 2, ECHO_COLOR, {
        x: (Math.random() - 0.5) * 6,
        y: (Math.random() - 0.5) * 6
      })
    )
  }
}

const friction = 0.99
class Particle {
  constructor(x, y, radius, color, velocity) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    this.velocity = velocity
    this.alpha = 1
  }

  draw() {
    c.save()
    c.globalAlpha = this.alpha
    c.beginPath()
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
    c.fillStyle = this.color
    c.fill()
    c.restore()
  }

  update() {
    this.draw()
    this.velocity.x *= friction
    this.velocity.y *= friction
    this.x = this.x + this.velocity.x
    this.y = this.y + this.velocity.y
    this.alpha -= 0.01
  }
}

class BackgroundParticle {
  constructor(x, y, radius, color) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    this.alpha = 0.05
    this.initialAlpha = this.alpha
  }

  draw() {
    c.save()
    c.globalAlpha = this.alpha
    c.beginPath()
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
    c.fillStyle = this.color
    c.fill()
    c.restore()
  }

  update() {
    this.draw()
  }
}

// ===================== CONFIGURACIÓN DE OLEADAS =====================
// waves 1-4: se "limpian" sobreviviendo un tiempo fijo (30s), sin importar
// cuántos enemigos mates. Oleada 5: hay que eliminar a los 5 enemigos (los
// más difíciles antes del jefe) para que aparezca el Jefe Final.
const WAVE_DURATION_FRAMES = 45 * 60 // 45s a 60fps
const TOTAL_WAVES = 5

const waveConfigs = [
  { count: 5, speedMult: 1.0, minR: 8, maxR: 14, unpredictable: 0.08, mode: 'timer' },
  { count: 10, speedMult: 1.3, minR: 10, maxR: 17, unpredictable: 0.25, mode: 'timer' },
  { count: 15, speedMult: 1.6, minR: 12, maxR: 20, unpredictable: 0.4, mode: 'timer' },
  { count: 20, speedMult: 2.0, minR: 14, maxR: 24, unpredictable: 0.55, mode: 'timer' },
  { count: 20, speedMult: 2.3, minR: 16, maxR: 26, unpredictable: 0.7, mode: 'timer' }
]

const waveManager = {
  wave: 1,
  mode: 'timer',
  timer: 0,
  duration: WAVE_DURATION_FRAMES,
  spawnedCount: 0,
  totalToSpawn: 0,
  spawnInterval: 0,
  spawnCounter: 0,
  bossTriggered: false
}

// ===================== TIENDA: DATOS =====================
function makePermanentUpgrades() {
  return [
    {
      id: 'speed', name: 'Velocidad de Movimiento', maxLevel: 5, baseCost: 300, growth: 1.45,
      desc: '+10% de velocidad de movimiento por nivel.'
    },
    {
      id: 'doubleShot', name: 'Disparo Doble', maxLevel: 1, baseCost: 650, growth: 1,
      desc: 'Tu arma principal dispara dos proyectiles seguidos en la misma dirección.'
    },
    {
      id: 'homing', name: 'Disparo Telerigido', maxLevel: 1, baseCost: 800, growth: 1,
      desc: 'Tus balas se curvan levemente hacia el enemigo más cercano.'
    },
    {
      id: 'extraWeapon', name: 'Armas Extra', maxLevel: 2, baseCost: 550, growth: 1.6,
      desc: 'Cañones adicionales que disparan en tu misma dirección al disparar. Nv1: un cañón. Nv2: dos cañones.'
    },
    {
      id: 'ally', name: 'Aliado de Combate', maxLevel: 1, baseCost: 950, growth: 1,
      desc: 'Te sigue de cerca y dispara solo a los enemigos que se acercan.'
    }
  ]
}

function makeConsumables() {
  return [
    { id: 'grenade', name: 'Granada', key: 'G', cost: 220, desc: 'Daño en área en el punto del cursor.' },
    { id: 'oneHit', name: 'Disparo Perforante', key: 'Q', cost: 320, desc: 'El próximo disparo elimina de un golpe.' }
  ]
}

let permanentUpgrades = makePermanentUpgrades()
let consumableItems = makeConsumables()

function upgradeLevel(id) {
  const u = permanentUpgrades.find((x) => x.id === id)
  return u ? u.level || 0 : 0
}

function costForLevel(u) {
  const level = u.level || 0
  return Math.round(u.baseCost * Math.pow(u.growth, level))
}

function applyPermanentEffect(id) {
  if (id === 'speed') player.speedLevel++
  else if (id === 'doubleShot') player.doubleShot = true
  else if (id === 'homing') player.homing = true
  else if (id === 'extraWeapon') {
    player.extraWeaponLevel++
  } else if (id === 'ally') {
    player.hasAlly = true
    ally = new Ally(player.x - 42, player.y - 42)
  }
}

// ===================== VARIABLES GLOBALES DE JUEGO =====================
let player
let powerUps = []
let projectiles = []
let enemyProjectiles = []
let enemies = []
let grenades = []
let particles = []
let backgroundParticles = []
let echoes = []
let movementLog = []
let shotLog = []
let echoCooldown = 0
let ally = null
let boss = null

let score = 0
let currency = 0

function init() {
  const x = canvas.width / 2
  const y = canvas.height / 2
  player = new Player(x, y, 10, 'white')
  powerUps = []
  projectiles = []
  enemyProjectiles = []
  enemies = []
  grenades = []
  particles = []
  backgroundParticles = []
  echoes = []
  movementLog = []
  shotLog = []
  echoCooldown = 0
  ally = null
  boss = null

  score = 0
  currency = 0
  permanentUpgrades = makePermanentUpgrades()
  consumableItems = makeConsumables()

  waveManager.wave = 1
  waveManager.bossTriggered = false

  for (let x = 0; x < canvas.width; x += 30) {
    for (let y = 0; y < canvas.height; y += 30) {
      backgroundParticles.push(new BackgroundParticle(x, y, 3, 'blue'))
    }
  }

  scoreEl.innerHTML = score
  updateHeartsHud()
  updateConsumablesHud()
}

// ===================== SPAWN DE ENEMIGOS / POWER-UPS =====================
function spawnEnemyForWave() {
  const cfg = waveConfigs[waveManager.wave - 1]
  const radius = Math.random() * (cfg.maxR - cfg.minR) + cfg.minR

  let x, y
  if (Math.random() < 0.5) {
    x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius
    y = Math.random() * canvas.height
  } else {
    x = Math.random() * canvas.width
    y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius
  }

  const color = `hsl(${Math.random() * 360}, 50%, 50%)`
  const angle = Math.atan2(canvas.height / 2 - y, canvas.width / 2 - x)
  const velocity = {
    x: Math.cos(angle) * cfg.speedMult,
    y: Math.sin(angle) * cfg.speedMult
  }

  enemies.push(new Enemy(x, y, radius, color, velocity, cfg.unpredictable))
}

function spawnPowerUps() {
  let x, y
  if (Math.random() < 0.5) {
    x = Math.random() < 0.5 ? 0 - 7 : canvas.width + 7
    y = Math.random() * canvas.height
  } else {
    x = Math.random() * canvas.width
    y = Math.random() < 0.5 ? 0 - 9 : canvas.height + 9
  }

  const angle = Math.atan2(canvas.height / 2 - y, canvas.width / 2 - x)
  const velocity = { x: Math.cos(angle), y: Math.sin(angle) }
  powerUps.push(new PowerUp(x, y, velocity))
}

function createScoreLabel(projectile, scoreGained) {
  const scoreLabel = document.createElement('label')
  scoreLabel.innerHTML = scoreGained
  scoreLabel.style.position = 'absolute'
  scoreLabel.style.color = 'white'
  scoreLabel.style.userSelect = 'none'
  scoreLabel.style.left = projectile.x + 'px'
  scoreLabel.style.top = projectile.y + 'px'
  document.body.appendChild(scoreLabel)

  gsap.to(scoreLabel, {
    opacity: 0,
    y: -30,
    duration: 0.75,
    onComplete: () => {
      scoreLabel.parentNode.removeChild(scoreLabel)
    }
  })
}

// ===================== HUD =====================
function updateHeartsHud() {
  heartsEl.innerHTML = ''
  for (let i = 0; i < MAX_HEARTS; i++) {
    const span = document.createElement('span')
    span.className = 'heart' + (i < player.hearts ? '' : ' lost')
    span.textContent = '♥'
    heartsEl.appendChild(span)
  }
}

function updateConsumablesHud() {
  grenadeCountEl.textContent = player.grenades
  oneHitCountEl.textContent = player.piercingShots
}

function updateWaveHud() {
  if (waveManager.mode === 'boss') {
    waveLabelEl.textContent = 'OLEADA JEFE FINAL'
    if (boss) {
      const pct = Math.max(0, boss.hp / boss.maxHp)
      waveTimerFillEl.style.width = pct * 100 + '%'
      waveTimerFillEl.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)'
      waveStatusEl.textContent = `Fase ${boss.phase} / 3`
    }
  } else if (waveManager.mode === 'timer') {
    const isFinal = waveManager.wave === TOTAL_WAVES
    waveLabelEl.textContent = isFinal
      ? `Oleada Final ${waveManager.wave} / ${TOTAL_WAVES}`
      : `Oleada ${waveManager.wave} / ${TOTAL_WAVES}`
    const pct = Math.max(0, waveManager.timer / waveManager.duration)
    waveTimerFillEl.style.width = pct * 100 + '%'
    waveTimerFillEl.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)'
    waveStatusEl.textContent = ''
  }
}

// ===================== FLUJO DE OLEADAS =====================
function startWave(waveNumber) {
  waveManager.wave = waveNumber
  const cfg = waveConfigs[waveNumber - 1]
  waveManager.mode = cfg.mode
  waveManager.totalToSpawn = cfg.count
  waveManager.spawnedCount = 0
  waveManager.spawnCounter = 0

  if (cfg.mode === 'timer') {
    waveManager.duration = WAVE_DURATION_FRAMES
    waveManager.timer = WAVE_DURATION_FRAMES
    waveManager.spawnInterval = Math.floor((WAVE_DURATION_FRAMES * 0.7) / cfg.count)
  } else {
    waveManager.spawnInterval = 50
  }

  enemies = []
  enemyProjectiles = []
  waveStatusEl.textContent = ''
  scene.state = 'playing'
  hudEl.classList.remove('hidden')
  consumableHudEl.classList.remove('hidden')
  updateWaveHud()
}

function startBossFight() {
  waveManager.mode = 'boss'
  waveManager.bossTriggered = true

  // Limpiamos el campo y reiniciamos la posición del jugador al centro-abajo.
  // Antes el jugador podía quedar justo donde aparece el jefe y morir al
  // instante por contacto; ahora arrancan separados.
  enemies = []
  enemyProjectiles = []
  projectiles = []
  player.x = canvas.width / 2
  player.y = canvas.height - 140
  player.invulnerable = INVULNERABLE_FRAMES * 2 // breve gracia al comenzar

  // El jefe aparece arriba, lejos del jugador.
  boss = new Boss(canvas.width / 2, 150)

  scene.state = 'playing'
  updateWaveHud()
}

function goToShop(title) {
  scene.state = 'shop'
  shopTitleEl.textContent = title
  renderShop()
  shopModalEl.classList.remove('hidden')
}

function renderShop() {
  shopCurrencyEl.textContent = currency

  permanentListEl.innerHTML = ''
  permanentUpgrades.forEach((u) => {
    const level = u.level || 0
    const maxed = level >= u.maxLevel
    const cost = costForLevel(u)
    const affordable = currency >= cost

    const item = document.createElement('div')
    item.className = 'shop-item'

    const info = document.createElement('div')
    info.className = 'shop-item-info'
    info.innerHTML = `
      <span class="shop-item-name">${u.name}</span>
      <span class="shop-item-desc">${u.desc}</span>
      ${u.maxLevel > 1 ? `<span class="shop-item-level">Nivel ${level}/${u.maxLevel}</span>` : ''}
    `

    const btn = document.createElement('button')
    btn.className = 'shop-buy-btn' + (maxed ? ' maxed' : '')
    btn.disabled = maxed || !affordable
    btn.textContent = maxed ? 'Al máximo' : `Comprar (${cost})`
    btn.addEventListener('click', () => {
      if (maxed || currency < cost) return
      currency -= cost
      u.level = level + 1
      applyPermanentEffect(u.id)
      renderShop()
    })

    item.appendChild(info)
    item.appendChild(btn)
    permanentListEl.appendChild(item)
  })

  consumableListEl.innerHTML = ''
  consumableItems.forEach((cItem) => {
    const owned = cItem.id === 'grenade' ? player.grenades : player.piercingShots
    const affordable = currency >= cItem.cost

    const item = document.createElement('div')
    item.className = 'shop-item'

    const info = document.createElement('div')
    info.className = 'shop-item-info'
    info.innerHTML = `
      <span class="shop-item-name">${cItem.name} (${cItem.key})</span>
      <span class="shop-item-desc">${cItem.desc}</span>
      <span class="shop-item-level">Tienes: ${owned}</span>
    `

    const btn = document.createElement('button')
    btn.className = 'shop-buy-btn'
    btn.disabled = !affordable
    btn.textContent = `+1 (${cItem.cost})`
    btn.addEventListener('click', () => {
      if (currency < cItem.cost) return
      currency -= cItem.cost
      if (cItem.id === 'grenade') player.grenades++
      else player.piercingShots++
      updateConsumablesHud()
      renderShop()
    })

    item.appendChild(info)
    item.appendChild(btn)
    consumableListEl.appendChild(item)
  })
}

continueBtn.addEventListener('click', () => {
  shopModalEl.classList.add('hidden')

  if (waveManager.wave === TOTAL_WAVES && waveManager.bossTriggered === false) {
    // venimos de superar la oleada 5 (por tiempo) -> ahora el Jefe Final
    startBossFight()
    return
  }

  if (waveManager.wave < TOTAL_WAVES) {
    startWave(waveManager.wave + 1)
  }
})

function handleWaveCleared() {
  // detiene toda la acción restante de la oleada actual con una pequeña explosión
  enemies.forEach((e) => {
    for (let i = 0; i < 6; i++) {
      particles.push(
        new Particle(e.x, e.y, Math.random() * 2, e.color, {
          x: (Math.random() - 0.5) * 4,
          y: (Math.random() - 0.5) * 4
        })
      )
    }
  })
  enemies = []
  enemyProjectiles = []

  if (waveManager.wave < TOTAL_WAVES) {
    // oleadas 1-4: tienda normal antes de la siguiente oleada
    goToShop(`¡Oleada ${waveManager.wave} completada!`)
  } else {
    // oleada 5 superada (por tiempo): tienda de preparación para el jefe
    goToShop('¡Prepárate para el Jefe Final!')
  }
}

function handleVictory() {
  scene.active = false
  scene.state = 'victory'
  cancelAnimationFrame(animationId)
  hudEl.classList.add('hidden')
  consumableHudEl.classList.add('hidden')
  echoHudEl.classList.add('hidden')
  endTitleEl.textContent = '¡Victoria! Jefe derrotado'
  bigScoreEl.innerHTML = score
  endWaveEl.textContent = 'Completaste las 5 oleadas y al Jefe Final'
  endModalEl.classList.remove('hidden')
  endGameAudio.play()
}

function handleGameOver() {
  scene.active = false
  scene.state = 'gameover'
  cancelAnimationFrame(animationId)
  hudEl.classList.add('hidden')
  consumableHudEl.classList.add('hidden')
  echoHudEl.classList.add('hidden')
  endTitleEl.textContent = 'Game Over'
  bigScoreEl.innerHTML = score
  endWaveEl.textContent = waveManager.mode === 'boss'
    ? 'Caíste enfrentando al Jefe Final'
    : `Oleada alcanzada: ${waveManager.wave} / ${TOTAL_WAVES}`
  endModalEl.classList.remove('hidden')
  endGameAudio.play()
}

// ===================== BUCLE PRINCIPAL =====================
const mouse = { down: false, x: undefined, y: undefined }

addEventListener('mousedown', ({ clientX, clientY }) => {
  mouse.x = clientX
  mouse.y = clientY
  mouse.down = true
})

addEventListener('mousemove', ({ clientX, clientY }) => {
  mouse.x = clientX
  mouse.y = clientY
})

addEventListener('mouseup', () => { mouse.down = false })

addEventListener('touchstart', (event) => {
  mouse.x = event.touches[0].clientX
  mouse.y = event.touches[0].clientY
  mouse.down = true
})

addEventListener('touchmove', (event) => {
  mouse.x = event.touches[0].clientX
  mouse.y = event.touches[0].clientY
})

addEventListener('touchend', () => { mouse.down = false })

addEventListener('click', ({ clientX, clientY }) => {
  if (scene.state === 'playing' && player.powerUp !== 'Automatic') {
    mouse.x = clientX
    mouse.y = clientY
    player.shoot(mouse)
  }
})

addEventListener('resize', () => {
  canvas.width = innerWidth
  canvas.height = innerHeight
  if (scene.state === 'menu' || scene.state === 'gameover' || scene.state === 'victory') {
    // no reiniciamos partidas en curso solo por cambiar tamaño de ventana
  }
})

let animationId
let frame = 0

function animate() {
  animationId = requestAnimationFrame(animate)

  if (scene.state !== 'playing') return

  frame++
  c.fillStyle = 'rgba(0, 0, 0, 0.1)'
  c.fillRect(0, 0, canvas.width, canvas.height)

  // ---- fondo ----
  backgroundParticles.forEach((backgroundParticle) => {
    const dist = Math.hypot(player.x - backgroundParticle.x, player.y - backgroundParticle.y)
    const hideRadius = 100
    if (dist < hideRadius) {
      if (dist < 70) {
        backgroundParticle.alpha = 0
      } else {
        backgroundParticle.alpha = 0.5
      }
    } else if (dist >= hideRadius && backgroundParticle.alpha < backgroundParticle.initialAlpha) {
      backgroundParticle.alpha += 0.01
    } else if (dist >= hideRadius && backgroundParticle.alpha > backgroundParticle.initialAlpha) {
      backgroundParticle.alpha -= 0.01
    }
    backgroundParticle.update()
  })

  // ---- jugador ----
  player.update()

  movementLog.push({ frame, x: player.x, y: player.y })
  while (movementLog.length && frame - movementLog[0].frame > ECHO_WINDOW_FRAMES) {
    movementLog.shift()
  }
  shotLog = shotLog.filter((s) => frame - s.frame <= ECHO_WINDOW_FRAMES)

  if (echoCooldown > 0) echoCooldown--
  if (echoBarFillEl) {
    const pct = 100 - (echoCooldown / ECHO_COOLDOWN_FRAMES) * 100
    echoBarFillEl.style.width = Math.min(100, Math.max(0, pct)) + '%'
  }
  if (echoLabelEl) {
    echoLabelEl.textContent = echoCooldown > 0 ? `ECO: ${Math.ceil(echoCooldown / 60)}s` : 'ECO: listo (E)'
  }

  echoes.forEach((echo, index) => {
    echo.update()
    if (echo.done) echoes.splice(index, 1)
  })

  particles.forEach((particle, index) => {
    if (particle.alpha <= 0) particles.splice(index, 1)
    else particle.update()
  })

  // ---- disparo automático (power-up de rayo) ----
  if (player.powerUp === 'Automatic' && mouse.down) {
    if (frame % 4 === 0) player.shoot(mouse, '#FFF500')
  }

  // ---- aliado (único con auto-disparo) ----
  if (ally) ally.update()

  // ---- granadas ----
  grenades.forEach((g, i) => {
    g.update()
    if (g.exploded) grenades.splice(i, 1)
  })

  // ---- power-ups (rayo de disparo automático) ----
  powerUps.forEach((powerUp, index) => {
    const dist = Math.hypot(player.x - powerUp.x, player.y - powerUp.y)
    if (dist - player.radius - powerUp.width / 2 < 1) {
      player.color = '#FFF500'
      player.powerUp = 'Automatic'
      powerUps.splice(index, 1)
      obtainPowerUpAudio.play()
      setTimeout(() => {
        player.powerUp = null
        player.color = '#FFFFFF'
      }, 5000)
    } else {
      powerUp.update()
    }
  })

  // ---- proyectiles del jugador ----
  projectiles.forEach((projectile, index) => {
    projectile.update()
    if (
      projectile.x + projectile.radius < 0 ||
      projectile.x - projectile.radius > canvas.width ||
      projectile.y + projectile.radius < 0 ||
      projectile.y - projectile.radius > canvas.height
    ) {
      setTimeout(() => { projectiles.splice(index, 1) }, 0)
    }
  })

  // ---- proyectiles del jefe ----
  enemyProjectiles.forEach((ep, index) => {
    ep.update()
    if (
      ep.x + ep.radius < 0 || ep.x - ep.radius > canvas.width ||
      ep.y + ep.radius < 0 || ep.y - ep.radius > canvas.height
    ) {
      enemyProjectiles.splice(index, 1)
      return
    }
    const dist = Math.hypot(player.x - ep.x, player.y - ep.y)
    if (dist - ep.radius - player.radius < 1) {
      enemyProjectiles.splice(index, 1)
      const hit = player.takeHit()
      if (hit && player.hearts <= 0) {
        handleGameOver()
      }
    }
  })

  // ---- oleada: spawn programado (todas las oleadas son por tiempo) ----
  if (waveManager.mode === 'timer') {
    waveManager.spawnCounter++
    if (
      waveManager.spawnedCount < waveManager.totalToSpawn &&
      waveManager.spawnCounter >= waveManager.spawnInterval
    ) {
      waveManager.spawnCounter = 0
      spawnEnemyForWave()
      waveManager.spawnedCount++
    }

    waveManager.timer--
    if (waveManager.timer <= 0) {
      handleWaveCleared()
      updateWaveHud()
      return
    }
  }

  // Rayos (disparo continuo): un premio ocasional y raro. Antes salía uno
  // cada ~5s de forma garantizada; ahora sólo lo intentamos cada ~15s y con
  // baja probabilidad, y nunca hay más de uno en el campo a la vez.
  if (frame % 900 === 0 && powerUps.length === 0 && Math.random() < 0.5) {
    spawnPowerUps()
  }

  updateWaveHud()

  // =================================================================
  // RESOLUCIÓN DE COLISIONES (reescrita para evitar el bug de rondas)
  //
  // El bug anterior: se hacía enemies.splice(index, 1) dentro de bucles
  // forEach anidados con setTimeout, usando índices que quedaban
  // desfasados cuando había varias colisiones en el mismo frame. Eso
  // borraba al enemigo equivocado y dejaba enemigos "fantasma" vivos que
  // nunca morían -> la oleada 5 (que exige enemies.length === 0) quedaba
  // bloqueada.
  //
  // Solución: NO mutar los arrays mientras se recorren. Marcamos con
  // `._dead` a lo que debe eliminarse y al final del frame filtramos los
  // arrays una sola vez. Cada proyectil golpea a un solo objetivo.
  // =================================================================

  // ---- jefe final: movimiento + contacto ----
  if (boss) {
    boss.update()
    const distToPlayer = Math.hypot(player.x - boss.x, player.y - boss.y)
    if (distToPlayer - boss.radius - player.radius < 1) {
      const hit = player.takeHit()
      if (hit && player.hearts <= 0) {
        handleGameOver()
        return
      }
    }
  }

  // ---- contacto enemigo <-> jugador ----
  enemies.forEach((enemy) => {
    enemy.update()
    if (enemy._dead) return
    const d = Math.hypot(player.x - enemy.x, player.y - enemy.y)
    if (d - enemy.radius - player.radius < 1) {
      const hit = player.takeHit()
      if (hit) {
        spawnDeathParticles(enemy.x, enemy.y, enemy.color, 10)
        enemy._dead = true // el enemigo que te golpea se destruye
      }
    }
  })

  // ---- proyectiles del jugador <-> enemigos y jefe ----
  // Cada proyectil sólo puede impactar a un objetivo por frame.
  projectiles.forEach((projectile) => {
    if (projectile._dead) return

    // primero el jefe (si existe)
    if (boss) {
      const d = Math.hypot(projectile.x - boss.x, projectile.y - boss.y)
      if (d - boss.radius - projectile.radius < 0.5) {
        spawnDeathParticles(projectile.x, projectile.y, boss.color, 8)
        const dmg = projectile.piercing ? 150 : projectile.damage
        boss.hp -= dmg
        gainCurrency(10) // el jefe da poca moneda por impacto (economía estricta)
        score += 50
        scoreEl.innerHTML = score
        enemyHitAudio.play()
        projectile._dead = true

        if (boss.hp <= 0) {
          spawnDeathParticles(boss.x, boss.y, boss.color, 60)
          score += 5000
          gainCurrency(1500)
          scoreEl.innerHTML = score
          boss = null
          handleVictory()
        }
        return // este proyectil ya golpeó, no revisa enemigos
      }
    }

    // luego los enemigos: golpea al primero con el que colisione
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i]
      if (enemy._dead) continue
      const d = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y)
      if (d - enemy.radius - projectile.radius < 0.03) {
        spawnDeathParticles(projectile.x, projectile.y, enemy.color, Math.min(20, enemy.radius))

        if (projectile.piercing) {
          killEnemy(enemy)
          projectile._dead = true
        } else if (enemy.radius - 10 > 5) {
          // enemigo grande: se encoge, no muere; da poca moneda
          enemyHitAudio.play()
          score += 40
          gainCurrency(25)
          scoreEl.innerHTML = score
          gsap.to(enemy, { radius: enemy.radius - 10 })
          projectile._dead = true
        } else {
          killEnemy(enemy)
          projectile._dead = true
        }
        break // el proyectil ya impactó un enemigo
      }
    }
  })

  // ---- limpieza única al final del frame ----
  enemies = enemies.filter((e) => !e._dead)
  projectiles = projectiles.filter((p) => !p._dead)
}

// Elimina un enemigo (lo marca) y otorga recompensa. Recompensa reducida
// respecto a la versión anterior para una economía más estricta.
function killEnemy(enemy) {
  if (enemy._dead) return
  enemy._dead = true
  enemyEliminatedAudio.play()
  score += 150
  gainCurrency(90)
  scoreEl.innerHTML = score

  backgroundParticles.forEach((backgroundParticle) => {
    backgroundParticle.color = enemy.color
    gsap.to(backgroundParticle, {
      alpha: 0.5,
      duration: 0.015,
      onComplete: () => {
        gsap.to(backgroundParticle, { alpha: backgroundParticle.initialAlpha, duration: 0.03 })
      }
    })
  })
}

function spawnDeathParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push(
      new Particle(x, y, Math.random() * 2, color, {
        x: (Math.random() - 0.5) * (Math.random() * 6),
        y: (Math.random() - 0.5) * (Math.random() * 6)
      })
    )
  }
}

// Punto único para sumar moneda, por si luego quieres aplicar multiplicadores.
function gainCurrency(amount) {
  currency += amount
}

// ===================== BOTONES / INICIO / REINICIO =====================
function beginGame() {
  init()
  animate()
  startGameAudio.play()
  scene.active = true
  backgroundMusicAudio.play()
  startWave(1)
}

startGameBtn.addEventListener('click', () => {
  gsap.to('#startModalEl', {
    opacity: 0,
    scale: 0.75,
    duration: 0.25,
    ease: 'expo.in',
    onComplete: () => {
      startModalEl.style.display = 'none'
      startModalEl.style.opacity = 1
      startModalEl.style.transform = 'scale(1)'
    }
  })
  beginGame()
})

restartGameBtn.addEventListener('click', () => {
  endModalEl.classList.add('hidden')
  beginGame()
})

soundOffEl.addEventListener('click', () => {
  backgroundMusicAudio.volume = 0
  soundOnEl.style.display = 'block'
  soundOffEl.style.display = 'none'
})

soundOnEl.addEventListener('click', () => {
  backgroundMusicAudio.volume = 1
  soundOnEl.style.display = 'none'
  soundOffEl.style.display = 'block'
})
