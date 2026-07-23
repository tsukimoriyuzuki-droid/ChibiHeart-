import { episodesMap } from './infoView.js';

let pendingRaf = null; // Guardador de referência para animação/layout check

// --- Overlay dinâmico ---
function createOverlayIfNeeded() {
    if (document.getElementById('overlay-ep')) return;

    const overlay = document.createElement('div');
    overlay.id = 'overlay-ep';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.display = 'none';
    overlay.style.zIndex = '10000';
    overlay.setAttribute('aria-hidden', 'true');

    // backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'overlay-backdrop';
    backdrop.style.position = 'absolute';
    backdrop.style.inset = '0';
    backdrop.style.background = 'rgba(0,0,0,0.45)';
    backdrop.style.backdropFilter = 'blur(6px)';
    overlay.appendChild(backdrop);

    // panel
    const panel = document.createElement('div');
    panel.id = 'overlay-panel';
    panel.style.position = 'absolute';
    panel.style.left = '50%';
    panel.style.top = '50%';
    panel.style.transform = 'translate(-50%, -50%)';
    panel.style.width = 'min(720px, 96%)';
    panel.style.maxHeight = '85vh';
    panel.style.overflow = 'auto';
    panel.style.background = '#0f1114';
    panel.style.borderRadius = '12px';
    panel.style.padding = '18px';
    panel.style.boxShadow = '0 10px 40px rgba(0,0,0,0.6)';
    panel.style.color = '#fff';
    panel.style.zIndex = '10001';

    const closeBtn = document.createElement('button');
    closeBtn.id = 'overlay-close';
    closeBtn.innerText = '✕';
    closeBtn.style.position = 'absolute';
    closeBtn.style.right = '12px';
    closeBtn.style.top = '12px';
    closeBtn.style.background = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#fff';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.cursor = 'pointer';
    panel.appendChild(closeBtn);

    const thumb = document.createElement('img');
    thumb.id = 'overlay-thumb';
    thumb.style.width = '100%';
    thumb.style.height = 'auto';
    thumb.style.borderRadius = '8px';
    thumb.style.marginBottom = '12px';
    panel.appendChild(thumb);

    const title = document.createElement('h3');
    title.id = 'overlay-ep-title';
    title.style.margin = '6px 0';
    panel.appendChild(title);

    const desc = document.createElement('p');
    desc.id = 'overlay-ep-desc';
    desc.style.margin = '10px 0';
    desc.style.lineHeight = '1.5';
    desc.style.maxHeight = '4.8em'; // cerca de 3 linhas
    desc.style.overflow = 'hidden';
    panel.appendChild(desc);

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'overlay-toggle-desc';
    toggleBtn.innerText = 'Ver mais';
    toggleBtn.style.display = 'none';
    toggleBtn.style.marginTop = '8px';
    toggleBtn.style.padding = '8px 12px';
    toggleBtn.style.background = '#1a1a1a';
    toggleBtn.style.color = '#fff';
    toggleBtn.style.border = '1px solid rgba(255,255,255,0.06)';
    toggleBtn.style.borderRadius = '8px';
    toggleBtn.style.cursor = 'pointer';
    panel.appendChild(toggleBtn);

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.style.marginTop = '12px';

    const playBtn = document.createElement('a');
    playBtn.id = 'overlay-play';
    playBtn.innerText = '▶ Assistir';
    playBtn.href = '#';
    playBtn.style.display = 'inline-flex';
    playBtn.style.alignItems = 'center';
    playBtn.style.gap = '8px';
    playBtn.style.padding = '10px 14px';
    playBtn.style.background = 'linear-gradient(135deg,#ff76b7,#ff4081)';
    playBtn.style.color = '#fff';
    playBtn.style.borderRadius = '999px';
    playBtn.style.textDecoration = 'none';
    actions.appendChild(playBtn);

    panel.appendChild(actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // Events
    backdrop.addEventListener('click', fecharOverlayEp);
    closeBtn.addEventListener('click', fecharOverlayEp);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') fecharOverlayEp();
    });

    toggleBtn.addEventListener('click', () => {
        const expanded = toggleBtn.dataset.expanded === 'true';
        const descEl = document.getElementById('overlay-ep-desc');
        if (expanded) {
            descEl.style.maxHeight = '4.8em';
            toggleBtn.innerText = 'Ver mais';
            toggleBtn.dataset.expanded = 'false';
        } else {
            descEl.style.maxHeight = '';
            toggleBtn.innerText = 'Ver menos';
            toggleBtn.dataset.expanded = 'true';
        }
    });
}

export function abrirOverlayEp(epId) {
    const meta = episodesMap[epId];
    if (!meta) {
        console.warn('Episódio não encontrado:', epId);
        return;
    }
    createOverlayIfNeeded();

    const overlay = document.getElementById('overlay-ep');
    const thumb = document.getElementById('overlay-thumb');
    const title = document.getElementById('overlay-ep-title');
    const desc = document.getElementById('overlay-ep-desc');
    const toggleBtn = document.getElementById('overlay-toggle-desc');
    const playBtn = document.getElementById('overlay-play');

    const ep = meta.ep;

    thumb.src = ep.thumb || '';
    thumb.alt = ep.titulo || '';
    title.textContent = ep.titulo || '';
    desc.textContent = ep.descricao || '';

    // Reset collapse state
    desc.style.maxHeight = '4.8em';
    desc.style.overflow = 'hidden';
    toggleBtn.style.display = 'none';
    toggleBtn.dataset.expanded = 'false';
    toggleBtn.innerText = 'Ver mais';

    // Evita chamadas acumuladas do requestAnimationFrame
    if (pendingRaf) cancelAnimationFrame(pendingRaf);
    pendingRaf = requestAnimationFrame(() => {
        if (desc.scrollHeight > desc.clientHeight + 2) {
            toggleBtn.style.display = 'inline-block';
        }
        pendingRaf = null;
    });

    // Play button behavior
    playBtn.onclick = (e) => {
        e.preventDefault();
        if (ep.video) {
            window.location.hash = `#player?video=${encodeURIComponent(ep.video)}`;
            fecharOverlayEp();
        } else {
            alert('Vídeo indisponível para este episódio.');
        }
    };

    // Show overlay
    overlay.style.display = 'block';
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('overlay-open');
    document.body.style.overflow = 'hidden';
}

export function fecharOverlayEp() {
    const overlay = document.getElementById('overlay-ep');
    if (!overlay) return;

    if (pendingRaf) {
        cancelAnimationFrame(pendingRaf);
        pendingRaf = null;
    }

    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('overlay-open');
    document.body.style.overflow = '';
}
