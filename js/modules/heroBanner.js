export async function carregarHeroBanner() {
  const container = document.getElementById('hero-banner');
  const template = document.getElementById('modelo-hero-banner');

  if (!container || !template) {
    console.warn('[Hero] Container ou template não encontrados.');
    return;
  }

  try {
    const res = await fetch('./dados/hero_banner.json');
    if (!res.ok) throw new Error('Erro ao carregar hero_banner.json: ' + res.status);
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) {
      console.warn('[Hero] JSON vazio.');
      return;
    }

    // Escolha do hero: primeiro que tiver highlight=true, senão o primeiro da lista
    const highlight = items.find(i => i.highlight);
    const hero = highlight || items[0];

    // Se a entrada não trouxer vídeo, tenta buscar no info.json (episódio 0)
    let videoUrl = hero.video && hero.video.trim() ? hero.video : '';
    if (!videoUrl) {
      try {
        const infoRes = await fetch('info.json');
        if (infoRes.ok) {
          const info = await infoRes.json();
          if (info[hero.id] && Array.isArray(info[hero.id].episodios) && info[hero.id].episodios.length) {
            videoUrl = info[hero.id].episodios[0].video || '';
          }
        }
      } catch (e) {
        // não crítico
      }
    }

    // Injeta o template
    const clone = template.content.cloneNode(true);
    const slide = clone.querySelector('.hero-banner-slide');
    const img = clone.querySelector('.hero-banner-img');
    const title = clone.querySelector('.hero-banner-title');
    const desc = clone.querySelector('.hero-banner-desc');
    const btnPlay = clone.querySelector('.btn-hero-play');
    const btnInfo = clone.querySelector('.btn-hero-info');

    if (img) {
      img.src = hero.banner || '';
      img.alt = hero.title || 'Destaque';
    }
    if (title) title.textContent = hero.title || '';
    if (desc) {
      desc.textContent = hero.synopsis || '';
      // adiciona comportamento de truncar/expandir (CSS lida com truncamento)
      desc.dataset.collapsed = 'true';
    }
    if (btnPlay) {
      btnPlay.textContent = '▶ Assistir';
      btnPlay.href = '#';
      btnPlay.addEventListener('click', (ev) => {
        ev.preventDefault();
        if (!videoUrl) {
          console.warn('[Hero] Nenhum vídeo disponível para este destaque.');
          return;
        }
        // define hash para o fluxo existente do player
        window.location.hash = `#player?video=${encodeURIComponent(videoUrl)}`;
      });
    }
    if (btnInfo) {
      btnInfo.textContent = 'ⓘ Detalhes';
      btnInfo.href = '#';
      btnInfo.addEventListener('click', (ev) => {
        ev.preventDefault();
        window.location.hash = `#info?anime=${encodeURIComponent(hero.id)}`;
      });
    }

    // Se quiser que clicar no slide leve para detalhes (mantive comportamento opcional)
    if (slide) {
      slide.addEventListener('click', (ev) => {
        // ignora se o clique for nos botões (para não duplicar)
        const target = ev.target;
        if (target.closest('.btn-hero')) return;
        window.location.hash = `#info?anime=${encodeURIComponent(hero.id)}`;
      });
    }

    container.appendChild(clone);

    // Expand / collapse da sinopse ao tocar (tela pequena)
    const descEl = container.querySelector('.hero-banner-desc');
    if (descEl) {
      descEl.addEventListener('click', (e) => {
        const collapsed = descEl.dataset.collapsed === 'true';
        if (collapsed) {
          descEl.dataset.collapsed = 'false';
          descEl.classList.add('expanded');
        } else {
          descEl.dataset.collapsed = 'true';
          descEl.classList.remove('expanded');
        }
      });
    }

  } catch (err) {
    console.error('[Hero] Erro ao inicializar hero banner:', err);
  }
}
