// ------------------------------------------------------------------
// Este script hace dos cosas automáticamente para cada tarjeta de
// integrante, así que al editar el HTML NO hay que tocar el JS:
//
// 1. Genera las iniciales del avatar a partir del nombre visible
//    (.member-name). Si escriben "Ana Torres" -> avatar dirá "AT".
// 2. Aplica el color de acento indicado en el atributo
//    data-accent="terracota | salvia | oliva | rosa" de cada .card.
// ------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const tarjetas = document.querySelectorAll('.card[data-accent]');

  tarjetas.forEach(card => {
    // --- Color de acento ---
    const accent = card.dataset.accent || 'terracota';
    card.style.setProperty('--accent', `var(--${accent})`);

    // --- Iniciales automáticas ---
    const nombreEl = card.querySelector('.member-name');
    const initialsEl = card.querySelector('.initials');
    if (nombreEl && initialsEl) {
      const palabras = nombreEl.textContent.trim().split(/\s+/).filter(Boolean);
      const iniciales = palabras.slice(0, 2).map(p => p[0]).join('').toUpperCase();
      initialsEl.textContent = iniciales || '?';
    }
  });

  // Actualiza el contador "X integrantes" según cuántas tarjetas reales
  // (no placeholder) hay en el roster.
  const total = document.querySelectorAll('.roster .card:not(.placeholder)').length;
  const countEl = document.getElementById('memberCount');
  if (countEl) countEl.textContent = `${total} integrante${total === 1 ? '' : 's'}`;

  // --- Animación al hacer scroll ---
  // Cada tarjeta empieza invisible/desplazada (ver .card en style.css) y
  // aparece con un fundido + deslizamiento al entrar en pantalla.
  const soportaObserver = 'IntersectionObserver' in window;
  const prefiereMenosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (soportaObserver && !prefiereMenosMovimiento) {
    const observer = new IntersectionObserver((entradas) => {
      entradas.forEach(entrada => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('in-view');
          observer.unobserve(entrada.target); // solo se anima una vez
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    tarjetas.forEach(card => observer.observe(card));
  } else {
    // Sin soporte o el usuario prefiere menos movimiento: mostrar directo.
    tarjetas.forEach(card => card.classList.add('in-view'));
  }
});
