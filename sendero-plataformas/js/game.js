(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const GRAVITY = 0.62;
  const MOVE_SPEED = 3.6;
  const JUMP_FORCE = -12.4;

  // ---------- Datos del Jugador y Progreso ----------
  // Cargar máximo nivel desbloqueado (0 por defecto)
  let maxUnlockedLevel = parseInt(localStorage.getItem('sendero_max_level')) || 0;
  
  // Preferencias visuales del personaje
  let playerStyle = {
    shape: localStorage.getItem('sendero_shape') || 'rombo',
    color: localStorage.getItem('sendero_color') || '#ff2a6d'
  };

  // ---------- Generador Procedural de 50 Niveles ----------
  function generateProceduralLevels(totalLevels) {
    const levels = [];
    for (let i = 0; i < totalLevels; i++) {
      const diff = i / (totalLevels - 1 || 1); 
      const platforms = []; const gems = []; const enemies = [];
      let curX = 0; let curY = 350;
      
      platforms.push({x: curX, y: curY, w: 200, h: 40});
      const numJumps = 5 + Math.floor(diff * 20); 
      
      for (let j = 0; j < numJumps; j++) {
        const gapX = 25 + Math.random() * (30 + diff * 80);
        const gapY = (Math.random() * 110) - 55;
        curX += platforms[platforms.length-1].w + gapX;
        curY = Math.max(120, Math.min(400, curY + gapY));
        
        const platW = Math.max(50, 160 - (diff * 80)); 
        platforms.push({x: curX, y: curY, w: platW, h: 20});
        
        if (Math.random() < 0.45) gems.push({x: curX + platW/2, y: curY - 30});
        
        if (j > 0 && platW > 70 && Math.random() < (0.15 + diff * 0.45)) {
          enemies.push({ x: curX + platW/2, y: curY - 24, rangeMin: curX, rangeMax: curX + platW, dir: Math.random() > 0.5 ? 1 : -1, alive: true });
        }
      }
      
      const lastPlat = platforms[platforms.length-1];
      const goal = {x: lastPlat.x + lastPlat.w/2 - 17, y: lastPlat.y - 70, w: 34, h: 70};
      
      levels.push({ spawn: {x: 40, y: 310}, platforms, gems, enemies, goal, totalGems: gems.length });
    }
    return levels;
  }

  const LEVELS = generateProceduralLevels(50);

  // ---------- Estado del juego ----------
  let state = {
    levelIndex: 0, lives: 3, gemsCollected: 0, running: false,
    keys: {left:false, right:false, jump:false},
    level: null, player: null, portalPulse: 0
  };

  function loadLevel(idx){
    const data = LEVELS[idx];
    state.level = {
      platforms: data.platforms, goal: data.goal,
      gems: data.gems.map(g => ({...g, taken:false})),
      enemies: data.enemies.map(e => ({...e})),
      totalGems: data.totalGems
    };
    state.player = {
      x: data.spawn.x, y: data.spawn.y, w: 24, h: 24,
      vx: 0, vy: 0, onGround: false, rotation: 0, hurtTimer: 0
    };
    state.gemsCollected = 0;
    updateHud();
  }

  function updateHud(){
    document.getElementById('hudGems').textContent = state.gemsCollected;
    document.getElementById('hudGemsTotal').textContent = state.level.totalGems;
    document.getElementById('hudLevel').textContent = state.levelIndex + 1;
    document.getElementById('hudLevelTotal').textContent = LEVELS.length;
    document.getElementById('hudLives').textContent = state.lives;
  }

  // ---------- Lógica de Física (Reducida por brevedad) ----------
  function rectsOverlap(a,b){ return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }

  function resolvePlatforms(p, platforms){
    p.onGround = false;
    for (const plat of platforms){
      const px1=p.x, px2=p.x+p.w, py1=p.y, py2=p.y+p.h;
      const bx1=plat.x, bx2=plat.x+plat.w, by1=plat.y, by2=plat.y+plat.h;
      if (px2>bx1 && px1<bx2 && py2>by1 && py1<by2){
        const oX = Math.min(px2,bx2)-Math.max(px1,bx1);
        const oY = Math.min(py2,by2)-Math.max(py1,by1);
        if (oX < oY){ if (p.x < plat.x) p.x -= oX; else p.x += oX; p.vx = 0; } 
        else {
          if (p.y < plat.y){ p.y -= oY; p.vy = 0; p.onGround = true; } 
          else { p.y += oY; p.vy = 0; }
        }
      }
    }
  }

  function update(){
    const p = state.player, lvl = state.level;
    p.vx = 0;
    if (state.keys.left) p.vx = -MOVE_SPEED;
    if (state.keys.right) p.vx = MOVE_SPEED;
    if (state.keys.jump && p.onGround){ p.vy = JUMP_FORCE; p.onGround = false; }

    p.vy += GRAVITY; if (p.vy > 14) p.vy = 14;
    p.x += p.vx; p.x = Math.max(0, p.x); 
    
    resolvePlatforms(p, lvl.platforms);
    p.y += p.vy;
    resolvePlatforms(p, lvl.platforms);

    if(p.vx !== 0) p.rotation += (p.vx > 0 ? 0.1 : -0.1);

    if (p.y > H + 60){ loseLife(); return; }
    if (p.hurtTimer > 0) p.hurtTimer--;

    // Enemigos
    for (const e of lvl.enemies){
      if (!e.alive) continue;
      e.x += e.dir * 1.5;
      if (e.x <= e.rangeMin) { e.x = e.rangeMin; e.dir = 1; }
      if (e.x + 24 >= e.rangeMax) { e.x = e.rangeMax - 24; e.dir = -1; }

      const eBox = {x:e.x, y:e.y-24, w:24, h:24};
      const pBox = {x:p.x, y:p.y, w:p.w, h:p.h};
      if (rectsOverlap(pBox, eBox)){
        if (p.vy > 0 && p.y + p.h - eBox.y < 24){
          e.alive = false; p.vy = JUMP_FORCE * 0.6;
        } else if (p.hurtTimer === 0){ loseLife(); return; }
      }
    }

    // Gemas
    for (const g of lvl.gems){
      if (g.taken) continue;
      if (rectsOverlap({x:p.x, y:p.y, w:p.w, h:p.h}, {x:g.x-9, y:g.y-9, w:18, h:18})){
        g.taken = true; state.gemsCollected++; updateHud();
      }
    }

    state.portalPulse += 0.08;
    if (rectsOverlap({x:p.x, y:p.y, w:p.w, h:p.h}, lvl.goal)){ onLevelClear(); }
  }

  function loseLife(){
    state.lives--; updateHud();
    if (state.lives <= 0){
      state.running = false;
      document.getElementById('gameOverText').textContent = `Llegaste al nivel ${state.levelIndex+1}.`;
      showOverlay('overlayGameOver');
    } else {
      state.player.x = LEVELS[state.levelIndex].spawn.x; 
      state.player.y = LEVELS[state.levelIndex].spawn.y;
      state.player.vx = 0; state.player.vy = 0; state.player.hurtTimer = 60;
    }
  }

  function onLevelClear(){
    state.running = false;
    
    // GUARDAR PROGRESO: Desbloquear el siguiente nivel si es la primera vez que lo pasas
    if (state.levelIndex >= maxUnlockedLevel && state.levelIndex < LEVELS.length - 1) {
      maxUnlockedLevel = state.levelIndex + 1;
      localStorage.setItem('sendero_max_level', maxUnlockedLevel);
      buildLevelGrid(); // Reconstruir los botones para habilitar el nuevo
    }

    if (state.levelIndex >= LEVELS.length - 1){
      document.getElementById('winText').textContent = `¡Completaste los 50 niveles! Eres una leyenda.`;
      showOverlay('overlayWin');
    } else {
      document.getElementById('levelClearText').textContent = `Gemas: ${state.gemsCollected}/${state.level.totalGems}.`;
      showOverlay('overlayLevelClear');
    }
  }

  // ---------- Dibujo ----------
  function draw(){
    ctx.clearRect(0,0,W,H);
    ctx.save();
    let cameraOffsetX = 0;
    if (state.player && state.player.x > W / 2) cameraOffsetX = -(state.player.x - W / 2);
    ctx.translate(cameraOffsetX, 0);

    const lvl = state.level, p = state.player;

    ctx.fillStyle = 'rgba(5, 217, 232, 0.03)';
    for(let i=0; i<8; i++){
       ctx.beginPath(); ctx.arc(100 + i*300, H/2 + Math.sin(state.portalPulse + i)*50, 80, 0, Math.PI*2); ctx.fill();
    }

    // Plataformas
    for (const plat of lvl.platforms){
      ctx.fillStyle = '#2a1b42'; ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.fillStyle = '#4c3773'; ctx.fillRect(plat.x, plat.y, plat.w, 4); 
    }

    // Gemas
    for (const g of lvl.gems){
      if (g.taken) continue;
      ctx.save();
      ctx.translate(g.x, g.y + Math.sin(state.portalPulse*2 + g.x)*4); ctx.rotate(Math.PI/4);
      ctx.fillStyle = '#05d9e8'; ctx.shadowColor = '#05d9e8'; ctx.shadowBlur = 10;
      ctx.fillRect(-7,-7,14,14);
      ctx.restore();
    }

    // Enemigos
    for (const e of lvl.enemies){
      if (!e.alive) continue;
      ctx.save();
      ctx.translate(e.x + 12, e.y - 12); ctx.rotate(state.portalPulse * -2 * e.dir); 
      ctx.fillStyle = '#ff5722';
      ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(12, 12); ctx.lineTo(-12, 12); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // Portal
    ctx.save();
    ctx.translate(lvl.goal.x + lvl.goal.w/2, lvl.goal.y + lvl.goal.h/2);
    ctx.strokeStyle = '#05d9e8'; ctx.lineWidth = 4; ctx.shadowColor = '#05d9e8'; ctx.shadowBlur = 15 + Math.sin(state.portalPulse*3)*5;
    ctx.beginPath(); ctx.arc(0, 0, 20 + Math.sin(state.portalPulse)*4, 0, Math.PI*2); ctx.stroke();
    ctx.rotate(state.portalPulse);
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(10, 8); ctx.lineTo(-10, 8); ctx.closePath();
    ctx.fillStyle = '#05d9e8'; ctx.fill();
    ctx.restore();

    // Protagonista Dinámico (Basado en la configuración)
    if(p) {
        ctx.save();
        ctx.translate(p.x + p.w/2, p.y + p.h/2);
        if (p.hurtTimer > 0 && Math.floor(p.hurtTimer/4)%2===0) ctx.globalAlpha = 0.4;
        
        ctx.rotate(p.rotation);

        ctx.strokeStyle = playerStyle.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = playerStyle.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        
        // Dibujar dependiendo de la forma elegida
        if (playerStyle.shape === 'rombo') {
            ctx.moveTo(0, -p.h/2); ctx.lineTo(p.w/2, 0); ctx.lineTo(0, p.h/2); ctx.lineTo(-p.w/2, 0); ctx.closePath();
        } else if (playerStyle.shape === 'cuadrado') {
            ctx.rect(-p.w/2 + 2, -p.h/2 + 2, p.w - 4, p.h - 4);
        } else if (playerStyle.shape === 'circulo') {
            ctx.arc(0, 0, p.w/2 - 2, 0, Math.PI*2);
        }
        
        ctx.stroke();

        // Núcleo interno
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0; 
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI*2);
        ctx.fill();
        
        ctx.restore();
    }
    
    ctx.restore(); 
  }

  function loop(){ if (state.running) { update(); draw(); } requestAnimationFrame(loop); }

  function showOverlay(id){
    document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
  }
  function hideOverlays(){ document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); }

  function showMainMenu() { state.running = false; hideOverlays(); showOverlay('overlayMainMenu'); }
  function showLevelSelector() { hideOverlays(); showOverlay('overlayLevelSelect'); }
  
  // Sincronizar botones de Configuración con los datos actuales
  function showConfig() {
    hideOverlays();
    
    document.querySelectorAll('.config-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.shape === playerStyle.shape);
    });
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === playerStyle.color);
    });
    
    showOverlay('overlayConfig');
  }

  function startGame(levelIdx = 0){
    // Iniciar desde el nivel más alto si le da "Jugar" directo al menú (y es 0)
    state.levelIndex = (levelIdx === 0 && maxUnlockedLevel > 0) ? maxUnlockedLevel : levelIdx;
    state.lives = 3;
    loadLevel(state.levelIndex);
    hideOverlays();
    state.running = true;
  }
  function nextLevel(){
    state.levelIndex++; loadLevel(state.levelIndex); hideOverlays(); state.running = true;
  }

  function buildLevelGrid() {
    const grid = document.getElementById('levelGrid');
    grid.innerHTML = ''; 
    LEVELS.forEach((lvl, index) => {
      const btn = document.createElement('button');
      btn.className = 'level-btn';
      btn.textContent = index + 1;
      
      // BLOQUEAR NIVELES QUE AÚN NO SE HAN ALCANZADO
      if (index > maxUnlockedLevel) {
          btn.disabled = true;
      } else {
          btn.addEventListener('click', () => startGame(index));
      }
      grid.appendChild(btn);
    });
  }

  // Controles
  window.addEventListener('keydown', (e) => {
    if (['ArrowLeft','a','A'].includes(e.key)) state.keys.left = true;
    if (['ArrowRight','d','D'].includes(e.key)) state.keys.right = true;
    if ([' ','ArrowUp','w','W'].includes(e.key)) state.keys.jump = true;
    if ([' ','ArrowUp','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    if (['ArrowLeft','a','A'].includes(e.key)) state.keys.left = false;
    if (['ArrowRight','d','D'].includes(e.key)) state.keys.right = false;
    if ([' ','ArrowUp','w','W'].includes(e.key)) state.keys.jump = false;
  });

  // Interacciones de UI (Configuración)
  document.querySelectorAll('.config-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      playerStyle.shape = e.target.dataset.shape;
      localStorage.setItem('sendero_shape', playerStyle.shape);
      document.querySelectorAll('.config-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      draw(); // Redibujar en el fondo
    });
  });

  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      playerStyle.color = e.target.dataset.color;
      localStorage.setItem('sendero_color', playerStyle.color);
      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      draw(); 
    });
  });

  // Botones principales
  document.getElementById('btnStart').addEventListener('click', () => startGame(maxUnlockedLevel));
  document.getElementById('btnShowLevels').addEventListener('click', showLevelSelector);
  document.getElementById('btnShowConfig').addEventListener('click', showConfig);
  document.getElementById('btnBackFromConfig').addEventListener('click', showMainMenu);
  
  document.getElementById('btnBackFromLevels').addEventListener('click', showMainMenu);
  document.getElementById('btnBackToMenu').addEventListener('click', showMainMenu);
  document.getElementById('btnNextLevel').addEventListener('click', nextLevel);
  document.getElementById('btnRestart').addEventListener('click', () => startGame(state.levelIndex));
  document.getElementById('btnQuitGameOver').addEventListener('click', showMainMenu);
  document.getElementById('btnRestartWin').addEventListener('click', showMainMenu);

  buildLevelGrid();
  loadLevel(maxUnlockedLevel); // Carga el nivel actual en el fondo
  draw();
  showMainMenu();
  requestAnimationFrame(loop);
})();