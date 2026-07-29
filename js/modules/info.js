// js/modules/info.js

import { buscarTodoProgressoDB } from './db.js';

// --- ESTADO LOCAL E MAPEAMENTOS ---
export let episodesMap = {}; 
let pendingRaf = null;

let temporadasAtuais = [];
let temporadaSelecionadaIndex = 0;
let currentAnimeId = "";

/**
 * Zera o mapeamento de episódios da memória.
 */
export function limparMapaEpisodios() {
    episodesMap = {};
}

// --- HELPERS E AUXILIARES ---

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
 * Mapeia todos os episódios de todas as temporadas
 */
export function indexEpisodes(animeId, temporadas) {
    limparMapaEpisodios();
    if (!Array.isArray(temporadas)) return;

    temporadas.forEach((temp, tIdx) => {
        const eps = Array.isArray(temp.episodios) ? temp.episodios : [];
        eps.forEach((ep, eIdx) => {
            if (typeof ep.index !== 'number') ep.index = eIdx + 1;
            if (!ep.id) ep.id = makeEpisodeId(animeId, tIdx + 1, ep.index || (eIdx + 1));
            episodesMap[ep.id] = { ep, animeId, seasonIndex: tIdx };
        });
    });
}

// --- GERENCIADOR DE TEMPORADAS ---

export function inicializarTemporadas(item, tempParam, customSelectContainer, infoTemporadas, containerEps, modeloEp, itemId) {
    currentAnimeId = itemId;

    if (Array.isArray(item.temporadas) && item.temporadas.length > 0) {
        if (customSelectContainer) customSelectContainer.style.display = "inline-block";
        temporadasAtuais = item.temporadas;
        if (infoTemporadas) {
            const totalTemp = item.temporadas.length;
            infoTemporadas.textContent = `${totalTemp} ${totalTemp === 1 ? 'Temporada' : 'Temporadas'}`;
        }
    } else if (Array.isArray(item.episodios)) {
        if (customSelectContainer) customSelectContainer.style.display = "none";
        temporadasAtuais = [{ nome: "Temporada Única", episodios: item.episodios }];
        if (infoTemporadas) infoTemporadas.textContent = "1 Temporada";
    } else {
        temporadasAtuais = [];
        if (infoTemporadas) infoTemporadas.textContent = "-- Temporadas";
    }

    if (!isNaN(tempParam) && tempParam >= 1 && tempParam <= temporadasAtuais.length) {
        temporadaSelecionadaIndex = tempParam - 1;
    } else {
        temporadaSelecionadaIndex = 0;
    }

    renderizarPopUpTemporadas(containerEps, modeloEp);

    return {
        temporadasAtuais,
        temporadaIndex: temporadaSelecionadaIndex
    };
}

export function renderizarPopUpTemporadas(containerEps, modeloEp) {
    const popup = document.getElementById("popup-temporadas");
    const btnAtual = document.getElementById("btn-selecionar-temporada");

    if (!popup || !btnAtual) return;

    popup.innerHTML = "";

    temporadasAtuais.forEach((temp, index) => {
        const item = document.createElement("div");
        item.className = "opcao-temporada";
        const nomeTemporada = temp.nome || `${index + 1}ª Temporada`;
        item.innerText = nomeTemporada;

        if (index === temporadaSelecionadaIndex) {
            item.classList.add("selecionada");
            btnAtual.innerText = nomeTemporada + " ▾";
        }

        item.onclick = function () {
            mudarTemporada(index, containerEps, modeloEp);
        };

        popup.appendChild(item);
    });
}

function mudarTemporada(index, containerEps, modeloEp) {
    temporadaSelecionadaIndex = index;

    const novaTempNum = index + 1;
    const urlAtual = new URL(window.location.href);
    const [hashBase, hashQuery] = urlAtual.hash.split("?");
    const params = new URLSearchParams(hashQuery || "");
    params.set("temp", novaTempNum);

    history.replaceState(null, "", `${hashBase}?${params.toString()}`);

    renderizarPopUpTemporadas(containerEps, modeloEp);

    const popup = document.getElementById("popup-temporadas");
    if (popup) popup.classList.remove("mostrar");

    if (temporadasAtuais[index] && temporadasAtuais[index].episodios) {
        renderizarListaEpisodios(temporadasAtuais[index].episodios, containerEps, modeloEp, currentAnimeId, index);
    } else {
        containerEps.innerHTML = "<p style='color: #888; padding: 10px;'>Nenhum episódio disponível nesta temporada.</p>";
    }
}

// Global para acionamento via onclick no HTML
window.togglePopupTemporadas = function () {
    const popup = document.getElementById("popup-temporadas");
    if (popup) popup.classList.toggle("mostrar");
};

window.addEventListener("click", (event) => {
    if (!event.target.matches('#btn-selecionar-temporada')) {
        const popup = document.getElementById("popup-temporadas");
        if (popup && popup.classList.contains('mostrar')) {
            popup.classList.remove('mostrar');
        }
    }
});

// --- RENDERIZADOR DE LISTA DE EPISÓDIOS ---

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

        if (mapaProgresso[ep.id]) {
            const dadosEp = mapaProgresso[ep.id];
            if (dadosEp.total > 0 && dadosEp.tempo > 0) {
                const porcentagem = (dadosEp.tempo / dadosEp.total) * 100;
                
                if (containerBarra && preenchimentoBarra) {
                    containerBarra.style.display = "block";
                    preenchimentoBarra.style.width = `${Math.min(porcentagem, 100)}%`;
                }
            }
        }

        frag.appendChild(clone);
    });

    container.appendChild(frag);
}

// --- MODAL / OVERLAY DE EPISÓDIOS ---

function createOverlayIfNeeded() {
    if (document.getElementById('overlay-ep')) return;

    const overlay = document.createElement('div');
    overlay.id = 'overlay-ep';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.display = 'none';
    overlay.style.zIndex = '10000';
    overlay.setAttribute('aria-hidden', 'true');

    const backdrop = document.createElement('div');
    backdrop.id = 'overlay-backdrop';
    backdrop.style.position = 'absolute';
    backdrop.style.inset = '0';
    backdrop.style.background = 'rgba(0,0,0,0.45)';
    backdrop.style.backdropFilter = 'blur(6px)';
    backdrop.style.webkitBackdropFilter = 'blur(6px)';
    overlay.appendChild(backdrop);

    const panel = document.createElement('div');
    panel.id = 'overlay-panel';
    panel.style.position = 'absolute';
    panel.style.left = '50%';
    panel.style.top = '50%';
    panel.style.transform = 'translate(-50%, -50%)';
    panel.style.width = 'min(720px, 96%)';
    panel.style.maxHeight = '85vh';
    panel.style.overflowY = 'auto';
    panel.style.background = '#0f1114';
    panel.style.borderRadius = '12px';
    panel.style.padding = '18px';
    panel.style.boxShadow = '0 10px 40px rgba(0,0,0,0.6)';
    panel.style.color = '#fff';
    panel.style.zIndex = '10001';

    const closeBtn = document.createElement('button');
    closeBtn.id = 'overlay-close';
    closeBtn.innerText = '✕';
    closeBtn.setAttribute('aria-label', 'Fechar');
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
    thumb.style.objectFit = 'cover';
    panel.appendChild(thumb);

    const title = document.createElement('h3');
    title.id = 'overlay-ep-title';
    title.style.margin = '6px 0';
    panel.appendChild(title);

    const desc = document.createElement('p');
    desc.id = 'overlay-ep-desc';
    desc.style.margin = '10px 0';
    desc.style.lineHeight = '1.5';
    desc.style.maxHeight = '4.8em';
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

    backdrop.addEventListener('click', fecharOverlayEp);
    closeBtn.addEventListener('click', fecharOverlayEp);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.style.display !== 'none') {
            fecharOverlayEp();
        }
    });

    toggleBtn.addEventListener('click', () => {
        const expanded = toggleBtn.dataset.expanded === 'true';
        const descEl = document.getElementById('overlay-ep-desc');
        if (expanded) {
            descEl.style.maxHeight = '4.8em';
            toggleBtn.innerText = 'Ver mais';
            toggleBtn.dataset.expanded = 'false';
        } else {
            descEl.style.maxHeight = 'none';
            toggleBtn.innerText = 'Ver menos';
            toggleBtn.dataset.expanded = 'true';
        }
    });
}

export function abrirOverlayEp(epId) {
    const meta = episodesMap[epId];
    if (!meta) {
        console.warn('[Overlay] Episódio não encontrado:', epId);
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
    thumb.alt = ep.titulo || 'Thumb do Episódio';
    title.textContent = ep.titulo || '';
    desc.textContent = ep.descricao || '';

    desc.style.maxHeight = '4.8em';
    desc.style.overflow = 'hidden';
    toggleBtn.style.display = 'none';
    toggleBtn.dataset.expanded = 'false';
    toggleBtn.innerText = 'Ver mais';

    if (pendingRaf) cancelAnimationFrame(pendingRaf);
    pendingRaf = requestAnimationFrame(() => {
        if (desc.scrollHeight > desc.clientHeight + 2) {
            toggleBtn.style.display = 'inline-block';
        }
        pendingRaf = null;
    });

    playBtn.onclick = (e) => {
        e.preventDefault();
        if (ep.video) {
            window.location.hash = `#player?anime=${encodeURIComponent(meta.animeId)}&ep=${encodeURIComponent(ep.id)}`;
            fecharOverlayEp();
        } else {
            alert('Vídeo indisponível para este episódio.');
        }
    };

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

    const thumb = document.getElementById('overlay-thumb');
    const title = document.getElementById('overlay-ep-title');
    const desc = document.getElementById('overlay-ep-desc');

    if (thumb) thumb.src = '';
    if (title) title.textContent = '';
    if (desc) desc.textContent = '';
}

// --- GERENCIADOR PRINCIPAL DA TELA INFO ---

export async function gerenciarTelaInfo() {
    const rawHash = window.location.hash || "#inicio";
    const [hashAtual, queryString] = rawHash.split("?");

    if (hashAtual !== "#info") return;

    const containerEps = document.getElementById("lista-episodios");
    const modeloEp = document.getElementById("modelo-card-ep");
    const containerGeneros = document.getElementById("info-generos");
    const customSelectContainer = document.querySelector(".custom-select-container");
    const blocoFilme = document.querySelector(".acao-principal-container");
    const blocoEpisodios = document.getElementById("container-episodios");

    if (!containerEps || !modeloEp) return;

    if (!containerEps.dataset.listenerAttached) {
        containerEps.dataset.listenerAttached = "true";
        containerEps.addEventListener("click", (e) => {
            const card = e.target.closest(".card-ep");
            if (card && card.dataset.epId) {
                abrirOverlayEp(card.dataset.epId);
            }
        });
    }

    const params = new URLSearchParams(queryString);
    const itemId = params.get("anime") || params.get("id");
    const tempParam = parseInt(params.get("temp"), 10);

    if (!itemId) {
        window.location.hash = "#erro";
        return;
    }

    try {
        const resposta = await fetch("./dados/info.json");
        if (!resposta.ok) throw new Error('Erro ao carregar info.json: ' + resposta.status);
        const bancoDados = await resposta.json();
        const item = bancoDados[itemId];

        if (!item) {
            console.error("Item não encontrado no info.json:", itemId);
            window.location.hash = "#erro";
            return;
        }

        preencherMetadados(item, containerGeneros);

        if (item.tipo === "filme" || item.video) {
            configurarModoFilme(item, itemId, blocoFilme, blocoEpisodios);
        } else {
            await configurarModoSerie(item, itemId, tempParam, {
                blocoFilme,
                blocoEpisodios,
                customSelectContainer,
                containerEps,
                modeloEp
            });
        }

    } catch (erro) {
        console.error("Erro ao carregar os dados de info.json:", erro);
        window.location.hash = "#erro";
    }
}

function preencherMetadados(item, containerGeneros) {
    const infoBanner = document.getElementById("info-banner");
    const infoTitulo = document.getElementById("info-titulo");
    const infoAno = document.getElementById("info-ano");
    const infoSinopse = document.getElementById("info-sinopse");

    // Alterado para carregar o 'poster' primeiro, mantendo 'banner' como fallback
    if (infoBanner) infoBanner.src = item.poster || item.banner || "";
    if (infoTitulo) infoTitulo.textContent = item.titulo || "Sem título";
    if (infoAno) infoAno.textContent = item.ano || "----";
    if (infoSinopse) infoSinopse.textContent = item.sinopse || "Sem sinopse disponível.";

    if (containerGeneros) {
        containerGeneros.innerHTML = "";
        if (Array.isArray(item.generos)) {
            item.generos.forEach(genero => {
                const tag = document.createElement("span");
                tag.className = "genre-tag";
                tag.textContent = genero;
                containerGeneros.appendChild(tag);
            });
        }
    }
}

function configurarModoFilme(item, itemId, blocoFilme, blocoEpisodios) {
    const infoTemporadas = document.getElementById("info-temporadas");
    if (blocoEpisodios) blocoEpisodios.style.display = "none";
    if (blocoFilme) blocoFilme.style.display = "block";
    if (infoTemporadas) infoTemporadas.style.display = "none";

    const btnPlay = document.getElementById("btn-play-filme");
    if (btnPlay) {
        btnPlay.onclick = (e) => {
            e.preventDefault();
            const epId = item.episodios?.[0]?.id || itemId;
            if (item.video || item.episodios?.[0]?.video) {
                window.location.hash = `#player?anime=${encodeURIComponent(itemId)}&ep=${encodeURIComponent(epId)}`;
            } else {
                alert("Vídeo indisponível para este filme.");
            }
        };
    }
}

async function configurarModoSerie(item, itemId, tempParam, dom) {
    const infoTemporadas = document.getElementById("info-temporadas");
    if (dom.blocoFilme) dom.blocoFilme.style.display = "block";
    if (dom.blocoEpisodios) dom.blocoEpisodios.style.display = "block";
    if (infoTemporadas) infoTemporadas.style.display = "inline";

    const { temporadasAtuais, temporadaIndex } = inicializarTemporadas(
        item,
        tempParam,
        dom.customSelectContainer,
        infoTemporadas,
        dom.containerEps,
        dom.modeloEp,
        itemId
    );

    const btnPlay = document.getElementById("btn-play-filme");
    if (btnPlay) {
        btnPlay.onclick = (e) => {
            e.preventDefault();
            const tempAtiva = temporadasAtuais[temporadaIndex];
            const primeiroEp = tempAtiva?.episodios?.[0];

            if (primeiroEp && primeiroEp.video) {
                window.location.hash = `#player?anime=${encodeURIComponent(itemId)}&ep=${encodeURIComponent(primeiroEp.id)}`;
            } else {
                alert("Nenhum episódio disponível para reprodução.");
            }
        };
    }

    indexEpisodes(itemId, temporadasAtuais);

    const mapaProgresso = await buscarTodoProgressoDB();

    const tempAtiva = temporadasAtuais[temporadaIndex];
    if (tempAtiva && tempAtiva.episodios) {
        renderizarListaEpisodios(tempAtiva.episodios, dom.containerEps, dom.modeloEp, itemId, temporadaIndex, mapaProgresso);
    } else {
        dom.containerEps.innerHTML = "<p style='color: #888; padding: 10px;'>Nenhum episódio disponível nesta temporada.</p>";
    }
}
