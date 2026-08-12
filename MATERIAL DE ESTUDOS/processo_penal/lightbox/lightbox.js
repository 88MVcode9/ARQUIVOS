/* ============================================================
   ESTUDA/ — Lightbox (Visualizador de Imagens)
   Componente reutilizável: zoom, pan, gestos, teclado.
   Inclui CSS próprio via injeção automática (sem dependência externa).
   ============================================================ */

(() => {
  'use strict';

  /* ---- Constantes ---- */
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 8;
  const ZOOM_STEP = 0.35;
  const ZOOM_WHEEL_FACTOR = 0.002;
  const ANIM_DURATION = 280;

  /* ---- Estado ---- */
  let overlay = null;
  let isOpen = false;
  let scale = 1;
  let posX = 0, posY = 0;
  let startDist = 0;
  let startScale = 1;
  let isDragging = false;
  let dragStartX = 0, dragStartY = 0;
  let dragOffsetX = 0, dragOffsetY = 0;
  let lastTapTime = 0;
  let activeImg = null;
  let previousFocus = null;

  /* ---- Injeção de CSS (auto-contido) ---- */
  function injectStyles() {
    if (document.getElementById('lightbox-styles')) return;
    const style = document.createElement('style');
    style.id = 'lightbox-styles';
    style.textContent = `
/* === LIGHTBOX OVERLAY === */
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 4, 10, 0.82);
  backdrop-filter: blur(18px) saturate(120%);
  -webkit-backdrop-filter: blur(18px) saturate(120%);
  opacity: 0;
  pointer-events: none;
  transition: opacity ${ANIM_DURATION}ms cubic-bezier(0.16, 1, 0.3, 1);
  cursor: zoom-out;
}
.lightbox-overlay.is-visible {
  opacity: 1;
  pointer-events: auto;
}

/* === IMAGE CONTAINER === */
.lightbox-stage {
  position: relative;
  max-width: 94vw;
  max-height: 92vh;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.lightbox-img {
  display: block;
  max-width: 94vw;
  max-height: 88vh;
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 8px 60px rgba(0,0,0,0.7), 0 2px 20px rgba(0,0,0,0.5);
  transform-origin: center center;
  opacity: 0;
  transition: transform 0.12s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.25s ease;
  will-change: transform;
  cursor: grab;
  -webkit-user-drag: none;
}
.lightbox-img.is-loaded {
  opacity: 1;
}
.lightbox-img.is-dragging {
  cursor: grabbing;
  transition: none;
}

/* === LOADING / ERROR STATE === */
.lightbox-spinner {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2.5px solid rgba(255,255,255,0.12);
  border-top-color: var(--accent, #7b8fff);
  animation: lightbox-spin 0.8s linear infinite;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}
.lightbox-stage.is-loading .lightbox-spinner { opacity: 1; }
@keyframes lightbox-spin { to { transform: rotate(360deg); } }

.lightbox-error {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: var(--text-tertiary, #8892b8);
  font-family: var(--font-body, 'Inter'), sans-serif;
  font-size: 13px;
  text-align: center;
  padding: 24px;
}
.lightbox-stage.is-error .lightbox-error { display: flex; }
.lightbox-stage.is-error .lightbox-img { display: none; }

/* === TOOLBAR === */
.lightbox-toolbar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(12px);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 14px;
  background: rgba(14, 17, 28, 0.88);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 4px 30px rgba(0,0,0,0.5);
  opacity: 0;
  pointer-events: none;
  transition: opacity ${ANIM_DURATION}ms ease, transform ${ANIM_DURATION}ms cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 10001;
}
.lightbox-overlay.is-visible .lightbox-toolbar {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(-50%) translateY(0);
}

.lightbox-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary, #c8cfe8);
  font-size: 18px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
  -webkit-tap-highlight-color: transparent;
}
.lightbox-btn:hover {
  background: var(--accent-soft, rgba(123, 143, 255, 0.15));
  color: var(--text-primary, #fff);
}
.lightbox-btn:active {
  transform: scale(0.92);
}
.lightbox-btn:focus-visible {
  outline: 2px solid var(--accent, #7b8fff);
  outline-offset: 2px;
}
.lightbox-btn svg {
  width: 20px;
  height: 20px;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}

.lightbox-zoom-label {
  font-family: var(--font-body, 'Inter'), 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary, #8892b8);
  min-width: 48px;
  text-align: center;
  user-select: none;
  letter-spacing: -0.02em;
}

.lightbox-divider {
  width: 1px;
  height: 22px;
  background: var(--border-hairline, rgba(255,255,255,0.08));
  margin: 0 2px;
}

/* === CLOSE BUTTON (top-right) === */
.lightbox-close {
  position: fixed;
  top: 18px;
  right: 18px;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(14, 17, 28, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: var(--text-secondary, #a0a8c8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  opacity: 0;
  pointer-events: none;
  transition: opacity ${ANIM_DURATION}ms ease, background 0.15s ease, color 0.15s ease, transform 0.15s ease;
}
.lightbox-overlay.is-visible .lightbox-close {
  opacity: 1;
  pointer-events: auto;
}
.lightbox-close:hover {
  background: var(--c-errado-bg, rgba(255, 90, 106, 0.18));
  color: var(--c-errado, #ff5a6a);
  border-color: rgba(255, 90, 106, 0.3);
}
.lightbox-close:active { transform: scale(0.9); }
.lightbox-close:focus-visible {
  outline: 2px solid var(--accent, #7b8fff);
  outline-offset: 2px;
}
.lightbox-close svg {
  width: 20px;
  height: 20px;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  fill: none;
}

/* === ZOOM HINT (brief flash) === */
.lightbox-hint {
  position: fixed;
  top: 18px;
  left: 50%;
  transform: translateX(-50%) translateY(-8px);
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: rgba(168, 176, 212, 0.7);
  background: rgba(14, 17, 28, 0.7);
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.05);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease, transform 0.3s ease;
  z-index: 10001;
}
.lightbox-hint.is-shown {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* === RESPONSIVE === */
@media (max-width: 768px) {
  .lightbox-toolbar {
    bottom: 16px;
    padding: 5px 6px;
    gap: 2px;
    border-radius: 12px;
  }
  .lightbox-btn {
    width: 36px;
    height: 36px;
  }
  .lightbox-close {
    top: 12px;
    right: 12px;
    width: 40px;
    height: 40px;
  }
  .lightbox-zoom-label {
    min-width: 40px;
    font-size: 11px;
  }
}
`;
    document.head.appendChild(style);
  }

  /* ---- Criar DOM do overlay (lazy) ---- */
  function ensureOverlay() {
    if (overlay) return;
    injectStyles();

    overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Visualizador de imagem');

    overlay.innerHTML = `
      <button class="lightbox-close" aria-label="Fechar visualizador" type="button">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="lightbox-stage">
        <img class="lightbox-img" alt="" draggable="false">
        <div class="lightbox-spinner" aria-hidden="true"></div>
        <div class="lightbox-error">
          <span>⚠️ Não foi possível carregar esta imagem.</span>
        </div>
      </div>
      <div class="lightbox-toolbar" role="toolbar" aria-label="Controles de zoom">
        <button class="lightbox-btn" data-action="zoom-out" aria-label="Reduzir zoom" type="button">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
        <span class="lightbox-zoom-label" aria-live="polite">100%</span>
        <button class="lightbox-btn" data-action="zoom-in" aria-label="Ampliar zoom" type="button">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
        <div class="lightbox-divider"></div>
        <button class="lightbox-btn" data-action="reset" aria-label="Restaurar zoom para 100%" type="button">
          <svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        </button>
      </div>
      <div class="lightbox-hint">Use a roda do mouse ou gestos para ampliar</div>
    `;

    document.body.appendChild(overlay);

    /* ---- Event bindings ---- */
    const img = overlay.querySelector('.lightbox-img');
    const stage = overlay.querySelector('.lightbox-stage');
    const closeBtn = overlay.querySelector('.lightbox-close');
    const toolbar = overlay.querySelector('.lightbox-toolbar');
    const hint = overlay.querySelector('.lightbox-hint');

    // Close
    closeBtn.addEventListener('click', closeLightbox);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target === stage) closeLightbox();
    });

    // Toolbar buttons
    toolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.stopPropagation();
      const action = btn.dataset.action;
      if (action === 'zoom-in') zoomBy(ZOOM_STEP);
      else if (action === 'zoom-out') zoomBy(-ZOOM_STEP);
      else if (action === 'reset') resetZoom();
    });

    // Prevent toolbar click from closing
    toolbar.addEventListener('click', (e) => e.stopPropagation());

    // Loading / error state for the image itself
    img.addEventListener('load', () => {
      stage.classList.remove('is-loading', 'is-error');
      img.classList.add('is-loaded');
    });
    img.addEventListener('error', () => {
      if (!img.src) return; // ignora o clear feito ao fechar
      stage.classList.remove('is-loading');
      stage.classList.add('is-error');
    });

    // Mouse wheel zoom
    overlay.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = -e.deltaY * ZOOM_WHEEL_FACTOR;
      zoomBy(delta * scale);
    }, { passive: false });

    // Mouse drag (pan)
    img.addEventListener('mousedown', (e) => {
      if (scale <= 1) return;
      e.preventDefault();
      isDragging = true;
      img.classList.add('is-dragging');
      dragStartX = e.clientX - posX;
      dragStartY = e.clientY - posY;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      posX = e.clientX - dragStartX;
      posY = e.clientY - dragStartY;
      applyTransform();
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      if (img) img.classList.remove('is-dragging');
      clampPosition();
    });

    // Touch: pinch + pan + double-tap
    let touches = [];
    overlay.addEventListener('touchstart', (e) => {
      touches = e.touches;
      if (touches.length === 2) {
        e.preventDefault();
        startDist = getTouchDistance(touches);
        startScale = scale;
      } else if (touches.length === 1 && scale > 1) {
        isDragging = true;
        img.classList.add('is-dragging');
        dragStartX = touches[0].clientX - posX;
        dragStartY = touches[0].clientY - posY;
      }
      // Double tap detection
      const now = Date.now();
      if (touches.length === 1 && now - lastTapTime < 300) {
        e.preventDefault();
        if (scale > 1) resetZoom();
        else zoomTo(2.5);
      }
      lastTapTime = now;
    }, { passive: false });

    overlay.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDistance(e.touches);
        const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, startScale * (dist / startDist)));
        scale = newScale;
        applyTransform();
        updateZoomLabel();
      } else if (e.touches.length === 1 && isDragging && scale > 1) {
        e.preventDefault();
        posX = e.touches[0].clientX - dragStartX;
        posY = e.touches[0].clientY - dragStartY;
        applyTransform();
      }
    }, { passive: false });

    overlay.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) startDist = 0;
      if (e.touches.length === 0) {
        isDragging = false;
        if (img) img.classList.remove('is-dragging');
        clampPosition();
      }
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (!isOpen) return;
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          closeLightbox();
          break;
        case '+':
        case '=':
          e.preventDefault();
          zoomBy(ZOOM_STEP);
          break;
        case '-':
        case '_':
          e.preventDefault();
          zoomBy(-ZOOM_STEP);
          break;
        case '0':
          e.preventDefault();
          resetZoom();
          break;
        case 'ArrowUp':
          if (scale > 1) { e.preventDefault(); posY += 40; applyTransform(); clampPosition(); }
          break;
        case 'ArrowDown':
          if (scale > 1) { e.preventDefault(); posY -= 40; applyTransform(); clampPosition(); }
          break;
        case 'ArrowLeft':
          if (scale > 1) { e.preventDefault(); posX += 40; applyTransform(); clampPosition(); }
          break;
        case 'ArrowRight':
          if (scale > 1) { e.preventDefault(); posX -= 40; applyTransform(); clampPosition(); }
          break;
      }
    });
  }

  /* ---- Helpers ---- */
  function getTouchDistance(t) {
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.hypot(dx, dy);
  }

  function applyTransform() {
    const img = overlay.querySelector('.lightbox-img');
    if (img) img.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
  }

  function updateZoomLabel() {
    const label = overlay.querySelector('.lightbox-zoom-label');
    if (label) label.textContent = Math.round(scale * 100) + '%';
  }

  function zoomBy(delta) {
    const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale + delta));
    scale = newScale;
    if (scale <= 1) { posX = 0; posY = 0; }
    applyTransform();
    updateZoomLabel();
  }

  function zoomTo(target) {
    scale = target;
    applyTransform();
    updateZoomLabel();
  }

  function resetZoom() {
    scale = 1;
    posX = 0;
    posY = 0;
    applyTransform();
    updateZoomLabel();
  }

  function clampPosition() {
    if (scale <= 1) { posX = 0; posY = 0; applyTransform(); return; }
    const img = overlay.querySelector('.lightbox-img');
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const imgW = rect.width;
    const imgH = rect.height;
    const maxPanX = Math.max(0, (imgW - vw) / 2);
    const maxPanY = Math.max(0, (imgH - vh) / 2);
    posX = Math.min(maxPanX, Math.max(-maxPanX, posX));
    posY = Math.min(maxPanY, Math.max(-maxPanY, posY));
    applyTransform();
  }

  /* ---- Open / Close ---- */
  function openLightbox(src, alt) {
    ensureOverlay();
    previousFocus = document.activeElement;
    const img = overlay.querySelector('.lightbox-img');
    const stage = overlay.querySelector('.lightbox-stage');
    img.classList.remove('is-loaded');
    stage.classList.remove('is-error');
    stage.classList.add('is-loading');
    img.src = src;
    img.alt = alt || '';
    scale = 1;
    posX = 0;
    posY = 0;
    applyTransform();
    updateZoomLabel();

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    isOpen = true;

    requestAnimationFrame(() => {
      overlay.classList.add('is-visible');
      // Focus the close button for accessibility
      const closeBtn = overlay.querySelector('.lightbox-close');
      if (closeBtn) closeBtn.focus();

      // Show hint briefly
      const hint = overlay.querySelector('.lightbox-hint');
      if (hint) {
        hint.classList.add('is-shown');
        setTimeout(() => hint.classList.remove('is-shown'), 2500);
      }
    });
  }

  function closeLightbox() {
    if (!isOpen || !overlay) return;
    overlay.classList.remove('is-visible');
    isOpen = false;
    document.body.style.overflow = '';

    setTimeout(() => {
      const img = overlay.querySelector('.lightbox-img');
      const stage = overlay.querySelector('.lightbox-stage');
      if (img) { img.src = ''; img.classList.remove('is-loaded'); }
      if (stage) stage.classList.remove('is-loading', 'is-error');
    }, ANIM_DURATION);

    // Restore focus
    if (previousFocus) {
      previousFocus.focus();
      previousFocus = null;
    }
  }

  /* ---- Auto-binding: intercepta cliques em imagens renderizadas ---- */
  function bindImages(root) {
    if (!root) return;
    const images = root.querySelectorAll('.card__image img, .topic__image img');
    images.forEach((img) => {
      if (img.dataset.lightboxBound) return;
      img.dataset.lightboxBound = 'true';
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        activeImg = img;
        openLightbox(img.src, img.alt);
      });
    });
  }

  /* ---- MutationObserver: detecta novas imagens automaticamente ---- */
  function startObserver() {
    const contentEl = document.getElementById('content');
    if (!contentEl) return;

    const observer = new MutationObserver(() => {
      bindImages(contentEl);
    });
    observer.observe(contentEl, { childList: true, subtree: true });

    // Bind existing images
    bindImages(contentEl);
  }

  /* ---- Init ---- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }

  /* ---- API pública (opcional) ---- */
  window.Lightbox = { open: openLightbox, close: closeLightbox, bindImages };
})();
