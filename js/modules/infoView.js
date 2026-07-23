import { abrirOverlayEp, fecharOverlayEp } from './overlayEpisodio.js';

// Estado local
let temporadasAtuais = [];
let temporadaSelecionadaIndex = 0;
let currentAnimeId = "";
export let episodesMap = {}; // map: episodeId -> { ep, animeId, seasonIndex }

// --- Helpers de ID / Indexação ---

function makeEpisodeId(animeId, seasonIdx, episodeIdx) {
    const s = String(seasonIdx).padStart(2, '0');
    const e = String(episodeIdx).padStart(2, '0');
    return `${animeId}_s${s}e${e}`;
}

function indexEpisodes(animeId) {
    episodesMap = {};
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

function stripLeadingNumber(title) {
    if (!title || typeof title !== 'string') return title || '';
    return title.replace(/^\s*\d{1,3}(?:[.\)\-:]\s*|\s+-\s*|\.\s*)*/, '').trim();
}

// --- Gerenciador Principal da Tela ---

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

    // Configura Event Delegation no container de episódios (Apenas 1 vez)
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

    // Se não informou ID de anime na URL, envia para a tela de erro
    if (!itemId) {
        window.location.hash = "#erro";
        return;
    }

    currentAnimeId = itemId;

    try {
        const resposta = await fetch("./dados/info.json");
        if (!resposta.ok) throw new Error('Erro ao carregar info.json: ' + resposta.status);
        const bancoDados = await resposta.json();
        let item = bancoDados[itemId];

        // Se o anime/filme não existir no JSON, envia para a tela de erro
        if (!item) {
            console.error("Item não encontrado no info.json:", itemId);
            window.location.hash = "#erro";
            return;
        }

        // Preenche dados básicos (IDs confirmados no HTML)
        const infoBanner = document.getElementById("info-banner");
        const infoTitulo = document.getElementById("info-titulo");
        const infoAno = document.getElementById("info-ano");
        const infoTemporadas = document.getElementById("info-temporadas");
        const infoSinopse = document.getElementById("info-sinopse");

        if (infoBanner) infoBanner.src = item.banner || "";
        if (infoTitulo) infoTitulo.textContent = item.titulo || "Sem título";
        if (infoAno) infoAno.textContent = item.ano || "----";
        if (infoSinopse) infoSinopse.textContent = item.sinopse || "Sem sinopse disponível.";

        // Preenche os gêneros
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

        // Filme vs Série
        if (item.tipo === "filme" || item.video) {
            if (blocoEpisodios) blocoEpisodios.style.display = "none";
            if (blocoFilme) blocoFilme.style.display = "block";
            if (infoTemporadas) infoTemporadas.style.display = "none";

            const btnPlay = document.getElementById("btn-play-filme");
            if (btnPlay) {
                btnPlay.onclick = (e) => {
                    e.preventDefault();
                    const videoUrl = item.video || "";
                    if (videoUrl) {
                        window.location.hash = `#player?video=${encodeURIComponent(videoUrl)}`;
                    } else {
                        alert("Vídeo indisponível para este filme.");
                    }
                };
            }

        } else {
            // SÉRIE / ANIME: Mantém o botão ASSISTIR do topo visível
            if (blocoFilme) blocoFilme.style.display = "block";
            if (blocoEpisodios) blocoEpisodios.style.display = "block";
            if (infoTemporadas) infoTemporadas.style.display = "inline";

            // Ação do botão do topo para Séries (Toca o 1º Episódio da temporada atual)
            const btnPlay = document.getElementById("btn-play-filme");
            if (btnPlay) {
                btnPlay.onclick = (e) => {
                    e.preventDefault();
                    const tempAtiva = temporadasAtuais[temporadaSelecionadaIndex];
                    const primeiroEp = tempAtiva?.episodios?.[0];

                    if (primeiroEp && primeiroEp.video) {
                        window.location.hash = `#player?video=${encodeURIComponent(primeiroEp.video)}`;
                    } else {
                        alert("Nenhum episódio disponível para reprodução.");
                    }
                };
            }

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

            // Define a temporada salva na URL se for válida; caso contrário, padrão é a 0
            if (!isNaN(tempParam) && tempParam >= 1 && tempParam <= temporadasAtuais.length) {
                temporadaSelecionadaIndex = tempParam - 1;
            } else {
                temporadaSelecionadaIndex = 0;
            }

            indexEpisodes(itemId);

            renderizarPopUpTemporadas(containerEps, modeloEp);
            
            const tempAtiva = temporadasAtuais[temporadaSelecionadaIndex];
            if (tempAtiva && tempAtiva.episodios) {
                renderizarListaEpisodios(tempAtiva.episodios, containerEps, modeloEp);
            } else {
                containerEps.innerHTML = "<p style='color: #888; padding: 10px;'>Nenhum episódio disponível nesta temporada.</p>";
            }
        }

    } catch (erro) {
        console.error("Erro ao carregar os dados de info.json:", erro);
        window.location.hash = "#erro";
    }
}

// --- FUNÇÕES DO SELETOR CUSTOMIZADO ---

function renderizarPopUpTemporadas(containerEps, modeloEp) {
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
        renderizarListaEpisodios(temporadasAtuais[index].episodios, containerEps, modeloEp);
    }
}

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

// --- RENDERIZAR EPISÓDIOS ---

function renderizarListaEpisodios(listaEpisodios, container, modelo) {
    container.innerHTML = "";

    if (!Array.isArray(listaEpisodios) || listaEpisodios.length === 0) {
        container.innerHTML = "<p style='color: #888; padding: 10px;'>Nenhum episódio disponível nesta temporada.</p>";
        return;
    }

    listaEpisodios.sort((a, b) => (a.index || 0) - (b.index || 0));

    const frag = document.createDocumentFragment();

    listaEpisodios.forEach((ep, epIndex) => {
        if (typeof ep.index !== 'number') ep.index = epIndex + 1;
        if (!ep.id) ep.id = makeEpisodeId(currentAnimeId, temporadaSelecionadaIndex + 1, ep.index);

        const clone = modelo.content.cloneNode(true);

        const imgEl = clone.querySelector("img");
        const durationEl = clone.querySelector(".ep-duration");
        const titleEl = clone.querySelector(".card-title-ep");
        const subtitleEl = clone.querySelector(".card-descricao-ep");
        const cardWrapper = clone.querySelector(".card-ep");

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

        frag.appendChild(clone);
    });

    container.appendChild(frag);
}
