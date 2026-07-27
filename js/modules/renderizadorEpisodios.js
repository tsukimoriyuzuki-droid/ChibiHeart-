// js/modules/renderizadorEpisodios.js

// Objeto exportado para ser consultado pelo modal (overlayEpisodio.js)
export let episodesMap = {}; // map: episodeId -> { ep, animeId, seasonIndex }

/**
 * Zera o mapeamento de episódios da memória.
 */
export function limparMapaEpisodios() {
    episodesMap = {};
}

// --- HELPERS DE ID E TRATAMENTO DE TEXTO ---

function makeEpisodeId(animeId, seasonIdx, episodeIdx) {
    const s = String(seasonIdx).padStart(2, '0');
    const e = String(episodeIdx).padStart(2, '0');
    return `${animeId}_s${s}e${e}`;
}

function stripLeadingNumber(title) {
    if (!title || typeof title !== 'string') return title || '';
    return title.replace(/^\s*\d{1,3}(?:[.\)\-:]\s*|\s+-\s*|\.\s*)*/, '').trim();
}

/**
 * Mapeia todos os episódios de todas as temporadas para permitir busca rápida por ID único.
 */
export function indexEpisodes(animeId, temporadasAtuais) {
    limparMapaEpisodios(); // Limpa dados antigos antes de reindexar
    if (!Array.isArray(temporadasAtuais)) return;

    temporadasAtuais.forEach((temp, tIdx) => {
        const eps = Array.isArray(temp.episodios) ? temp.episodios : [];
        eps.forEach((ep, eIdx) => {
            if (typeof ep.index !== 'number') ep.index = eIdx + 1;
            if (!ep.id) ep.id = makeEpisodeId(animeId, tIdx + 1, ep.index || (eIdx + 1));
            episodesMap[ep.id] = { ep, animeId, seasonIndex: tIdx };
        });
    });
}

/**
 * Clona o template HTML de episódio e renderiza no container DOM com checagem de progresso.
 */
export function renderizarListaEpisodios(listaEpisodios, container, modelo, animeId, seasonIndex = 0, mapaProgresso = {}) {
    container.innerHTML = "";

    if (!Array.isArray(listaEpisodios) || listaEpisodios.length === 0) {
        container.innerHTML = "<p style='color: #888; padding: 10px;'>Nenhum episódio disponível nesta temporada.</p>";
        return;
    }

    listaEpisodios.sort((a, b) => (a.index || 0) - (b.index || 0));

    const frag = document.createDocumentFragment();

    listaEpisodios.forEach((ep, epIndex) => {
        if (typeof ep.index !== 'number') ep.index = epIndex + 1;
        if (!ep.id) ep.id = makeEpisodeId(animeId, seasonIndex + 1, ep.index);

        const clone = modelo.content.cloneNode(true);

        const imgEl = clone.querySelector("img");
        const durationEl = clone.querySelector(".ep-duration");
        const titleEl = clone.querySelector(".card-title-ep");
        const subtitleEl = clone.querySelector(".card-descricao-ep");
        const cardWrapper = clone.querySelector(".card-ep");

        // 🟥 Seleciona as referências da nova barra de progresso no template de info
        const containerBarra = clone.querySelector(".barra-progresso-container");
        const preenchimentoBarra = clone.querySelector(".barra-progresso-preenchimento");

        const rawTitle = ep.titulo || '';
        const baseTitle = stripLeadingNumber(rawTitle) || rawTitle;
        const displayTitle = `${String(ep.index).padStart(2, '0')}. ${baseTitle}`;

        if (imgEl) {
            imgEl.src = ep.thumb || "";
            imgEl.alt = ep.titulo || `Episódio ${epIndex + 1}`;
        }
        if (durationEl) durationEl.textContent = ep.duracao || "";
        if (titleEl) titleEl.textContent = displayTitle;
        if (subtitleEl) subtitleEl.textContent = ep.descricao || "";

        if (cardWrapper) {
            cardWrapper.dataset.epId = ep.id;
            cardWrapper.style.cursor = "pointer";
        }

        // 🎯 [PROGRES-TRACK] Verifica se o usuário tem histórico salvo para este episódio no IndexedDB
        if (mapaProgresso[ep.id]) {
            const dadosEp = mapaProgresso[ep.id];
            if (dadosEp.total > 0 && dadosEp.tempo > 0) {
                const porcentagem = (dadosEp.tempo / dadosEp.total) * 100;
                
                if (containerBarra && preenchimentoBarra) {
                    containerBarra.style.display = "block"; // Revela o container de fundo da barra
                    preenchimentoBarra.style.width = `${Math.min(porcentagem, 100)}%`; // Define a largura proporcional do preenchimento vermelho
                }
            }
        }

        frag.appendChild(clone);
    });

    container.appendChild(frag);
}
