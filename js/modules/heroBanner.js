export async function carregarHeroBanner() {
  const container = document.getElementById('hero-banner');
  const template = document.getElementById('modelo-hero-banner');
  
  if (!container || !template) {
    console.warn('[Hero] Container ou template não encontrados.');
    return;
  }

  try {
    // 1. Faz o download das configurações do banner e do banco principal ao mesmo tempo
    const [resBanner, resInfo] = await Promise.all([
      fetch('./dados/hero_banner.json'),
      fetch('./dados/info.json')
    ]);

    if (!resBanner.ok) throw new Error('Erro ao carregar hero_banner.json: ' + resBanner.status);
    if (!resInfo.ok) throw new Error('Erro ao carregar info.json: ' + resInfo.status);

    const items = await resBanner.json();
    const infoCompleta = await resInfo.json();

    if (!Array.isArray(items) || items.length === 0) {
      console.warn('[Hero] JSON de configurações vazio.');
      return;
    }

    // Escolha do hero: primeiro que tiver highlight=true, senão o primeiro da lista
    const highlight = items.find(i => i.highlight);
    const heroConfig = highlight || items[0];

    // 2. Busca todas as informações reais do anime dentro do info.json usando o ID
    const anime = infoCompleta[heroConfig.id];
    if (!anime) {
      console.warn(`[Hero] O anime com ID "${heroConfig.id}" não foi encontrado no info.json.`);
      return;
    }

    // Limpa o container antes de renderizar para evitar duplicados
    container.innerHTML = "";

    // 3. Descobre dinamicamente o ID do primeiro episódio para o botão Assistir
    let primeiroEpId = "";
    if (Array.isArray(anime.temporadas) && anime.temporadas.length > 0) {
      const primeiraTemp = anime.temporadas[0];
      if (Array.isArray(primeiraTemp.episodios) && primeiraTemp.episodios.length > 0) {
        primeiroEpId = primeiraTemp.episodios[0].id || "";
      }
    } else if (Array.isArray(anime.episodios) && anime.episodios.length > 0) {
      // Caso o JSON use o formato plano direto em anime.episodios
      primeiroEpId = anime.episodios[0].id || "";
    }

    // 4. Injeta o template clonado
    const clone = template.content.cloneNode(true);
    const slide = clone.querySelector('.hero-banner-slide');
    const img = clone.querySelector('.hero-banner-img');
    const title = clone.querySelector('.hero-banner-title');
    const desc = clone.querySelector('.hero-banner-desc');
    const btnPlay = clone.querySelector('.btn-hero-play');
    const btnInfo = clone.querySelector('.btn-hero-info');

    // 5. Alimenta os dados vindos centralizadamente do info.json
    if (img) {
      img.src = anime.banner || anime.poster || '';
      img.alt = anime.titulo || 'Destaque';
    }
    if (title) title.textContent = anime.titulo || '';
    if (desc) {
      desc.textContent = anime.sinopse || '';
      // adiciona comportamento de truncar/expandir (CSS lida com truncamento)
      desc.dataset.collapsed = 'true';
    }
    if (btnPlay) {
      btnPlay.textContent = '▶ Assistir';
      btnPlay.href = `#player?anime=${encodeURIComponent(heroConfig.id)}&ep=${encodeURIComponent(primeiroEpId)}`;
    }
    if (btnInfo) {
      btnInfo.textContent = 'ⓘ Detalhes';
      btnInfo.href = `#info?anime=${encodeURIComponent(heroConfig.id)}`;
    }

    // Se quiser que clicar no slide leve para detalhes
    if (slide) {
      slide.addEventListener('click', (ev) => {
        // ignora se o clique for nos botões
        const target = ev.target;
        if (target.closest('.btn-hero')) return;
        window.location.hash = `#info?anime=${encodeURIComponent(heroConfig.id)}`;
      });
    }

    container.appendChild(clone);

    // Expand / collapse da sinopse ao tocar
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
