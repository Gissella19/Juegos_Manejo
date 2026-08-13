# Invasión Zombie

(antes *Eco Invaders*)

Basado en el repo público de **chriscourses**:
[`HTML5-Canvas-and-JavaScript-Games-for-Beginners`](https://github.com/chriscourses/HTML5-Canvas-and-JavaScript-Games-for-Beginners)
(shooter estilo Asteroids en Canvas + JavaScript vanilla).

## Cómo jugar

Solo abre `index.html` en el navegador (doble clic). No necesita `npm install`
ni servidor.

- **WASD** o **flechas**: mover
- **Clic**: disparar hacia el cursor
- **E**: invocar tu Eco

## Qué es el Eco (la mecánica que agregué)

El juego graba continuamente tus últimos 4 segundos de movimiento y disparos.
Al presionar `E` (con un enfriamiento de 8s), ese recorrido se congela en un
**Eco**: un reflejo violeta de ti mismo que repite exactamente esos mismos
movimientos y disparos una vez, peleando a tu lado mientras tú sigues
controlando al jugador real en tiempo real. Es una versión aplicada de la
misma idea de "grabar y repetir" que usé en mi otro juego (ECO), pero aquí
convertida en una habilidad táctica dentro de un shooter ya existente.

Archivo relevante: `main.js`, sección marcada como `ECO:` (clase `Echo`,
`spawnEcho()`, y el registro `movementLog` / `shotLog` dentro de `animate()`).

## Qué más se modificó respecto al original

- Se quitó la dependencia del bundler (Vite) y del paquete `howler`: el
  `import` de Howler no funciona sin un paso de build, así que se reemplazó
  por una función `playSound()` con `<audio>` nativo que también permite
  sonidos superpuestos. Esto permite abrir el juego directamente desde el
  archivo, sin instalar nada — útil para entregarlo como tarea.
- Se agregó un HUD nuevo (abajo a la izquierda) que muestra el estado del
  enfriamiento del Eco.
- Se actualizó la pantalla de inicio con las instrucciones del control nuevo.

## Versión 3 — Correcciones de balance y jugabilidad

- **Bug de rondas bloqueadas corregido**: antes, cuando varios enemigos y
  proyectiles colisionaban en el mismo frame, se hacían `splice()` con
  índices desfasados que borraban al enemigo equivocado, dejando enemigos
  "fantasma" vivos e inalcanzables; en la oleada 5 (que exige eliminarlos a
  todos) esto trababa el juego. Ahora las colisiones se resuelven marcando lo
  que debe morir (`_dead`) y filtrando los arrays una sola vez al final del
  frame. Además se añadió una **red de seguridad**: cualquier enemigo que
  sobreviva demasiado tiempo o se aleje de la pantalla se vuelve lento,
  lineal y predecible, garantizando que la oleada siempre pueda terminar.
- **Economía re-equilibrada (más estricta)**: la moneda se separó del puntaje
  y las recompensas se redujeron (matar enemigo: 60; impacto al jefe: 10;
  golpe a enemigo grande: 15). Los precios de la tienda subieron y crecen de
  forma más agresiva por nivel, para que ya no se pueda comprar todo en pocas
  oleadas.
- **Torreta eliminada** por completo (clase, ítem de tienda y lógica).
- **Armas extra rediseñadas**: dejaron de auto-apuntar. Ahora son un único
  ítem con 2 niveles (Nv1: un cañón extra; Nv2: dos) que disparan cañones
  paralelos **en tu misma dirección, solo cuando disparas**. El **aliado es
  el único** elemento con disparo automático.

## Créditos v3

Correcciones de colisiones/rondas, re-balance de economía, eliminación de la
torreta y rediseño de las armas extra: cambios propios para la actividad.

## Versión 4 — Ajustes de ritmo, disparo doble y economía

- **Oleadas de 45 segundos** (antes 30s), para dar más margen a cada ronda.
- **Disparo doble rediseñado**: ya no son dos cañones paralelos, sino una
  ráfaga de dos proyectiles en la MISMA línea y dirección, saliendo uno
  detrás del otro.
- **Economía re-equilibrada a un punto medio**: se bajaron los precios
  respecto a la v3 (que era demasiado cara) y se subieron un poco las
  ganancias por eliminación. El objetivo es que puedas comprar bastantes
  mejoras en una partida pero no todas, obligando a priorizar una estrategia
  (por ejemplo, invertir en velocidad + armas, o en aliado + consumibles).

## Créditos v4

Ajuste de duración de oleadas, rediseño del disparo doble y re-balance de la
economía: cambios propios para la actividad.

## Versión 5 — Rayos, disparo doble y oleada del jefe

- **Rayos (disparo continuo) mucho más raros**: antes aparecía uno cada ~5s
  de forma garantizada; ahora se intenta sólo cada ~15s, con probabilidad, y
  nunca hay más de uno en el campo a la vez. Es un premio ocasional.
- **Disparo doble ajustado**: se aumentó la separación entre las dos balas
  (26px) para que se vea con claridad una detrás de la otra, en la misma
  línea y dirección.
- **Oleada final por tiempo**: la oleada 5 ya no exige eliminar a todos los
  enemigos; ahora dura 45 segundos como las demás. Al superarla, se pasa por
  la tienda y luego a la **oleada del Jefe Final**.
- **Oleada del Jefe Final sin muerte instantánea**: al empezar la pelea, se
  limpia el campo, se reinicia la posición del jugador al centro-abajo y el
  jefe aparece arriba, lejos. Además el jugador recibe unos segundos de
  invulnerabilidad al aparecer. Antes podías morir al instante si el jefe se
  materializaba justo encima de ti.

## Créditos v5

Ajuste de frecuencia de rayos, separación del disparo doble y rediseño de la
oleada/aparición del jefe: cambios propios para la actividad.

## Versión 6 — Invasión Zombie, torreta y jefe más resistente

- **Nuevo nombre**: el juego pasó a llamarse **Invasión Zombie** (con tilde),
  actualizado en el título de la pestaña y en la pantalla de inicio.
- **Protagonista con forma de torreta**: el jugador ahora se dibuja con la
  imagen de una torreta/cañón (`img/cannon.png`) que **gira apuntando su mira
  hacia el cursor**, es decir, hacia donde va a disparar. Se limpió el fondo
  cuadriculado de la imagen original para dejarla con transparencia real. Si
  la imagen no estuviera disponible, el juego usa un círculo de respaldo.
  El ajuste de orientación vive en `CANNON_ART_OFFSET` dentro de `main.js`.
- **Jefe final mucho más resistente**: su vida subió de 420 a **1500**
  (~3.5x), para que aguante muchos más ataques antes de caer.

## Créditos v6

Cambio de nombre, integración de la torreta giratoria del protagonista y
aumento de la vida del jefe: cambios propios para la actividad.

## Versión 2 — Oleadas, jefe final y tienda de mejoras

- **Movimiento corregido**: se reemplazó el sistema de velocidad acumulativa
  (que generaba respuestas erráticas) por un sistema de teclas presionadas +
  `keyup`. El movimiento ahora es arcade: responde al instante y se detiene
  apenas sueltas la tecla.
- **5 oleadas controladas**: cada oleada aumenta en enemigos (+5), velocidad,
  tamaño y comportamientos impredecibles. Las oleadas 1-4 se superan
  sobreviviendo 30s; la oleada 5 (los 5 enemigos más duros) se supera
  eliminándolos a todos.
- **Jefe final con 3 fases**: aparece tras la oleada 5, cambia de
  comportamiento (velocidad, patrón de ataque, invocación de minions) según
  su % de vida.
- **Vida en corazones** (5 segmentos) con invulnerabilidad breve tras cada
  golpe.
- **Tienda entre oleadas** (pausa el juego): mejoras permanentes (velocidad,
  disparo doble, disparo telerigido, 2 armas extra, torreta fija, aliado de
  combate) y consumibles (granadas con tecla `G`, disparo perforante con
  tecla `Q`). Todo se reinicia en cada partida nueva.
- **HUD renovado**: corazones, oleada actual, temporizador/barra de progreso
  y puntos siempre visibles.
