document.addEventListener("DOMContentLoaded", () => {

    // Estado local
    let temporadasAtuais = [];
    let temporadaSelecionadaIndex = 0;
    let currentAnimeId = "";
    let episodesMap = {}; // map: episodeId -> { ep, animeId, seasonIndex }
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

    function abrirOverlayEp(epId) {
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

    function fecharOverlayEp() {
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

    async function gerenciarTelaInfo() {
        const rawHash = window.location.hash || "#inicio";
        const [hashAtual, queryString] = rawHash.split("?");

        if (hashAtual !== "#info") return;

        const containerEps = document.getElementById("lista-episodios");
        const modeloEp = document.getElementById("modelo-card-ep");
        const containerGeneros = document.getElementById("info-generos");
        const customSelectContainer = document.querySelector(".custom-select-container");
        const blocoFilme = document.getElementById("acao-filme");
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

        if (!itemId) {
            window.location.hash = "#inicio";
            return;
        }

        currentAnimeId = itemId;

        try {
            const resposta = await fetch("dados/info.json");
            if (!resposta.ok) throw new Error('Erro ao carregar info.json: ' + resposta.status);
            const bancoDados = await resposta.json();
            let item = bancoDados[itemId];

            if (!item) {
                console.error("Item não encontrado no info.json:", itemId);
                return;
            }

            // Preenche dados básicos
            const infoBanner = document.getElementById("info-banner");
            const infoPoster = document.getElementById("info-poster-img");
            const infoTitulo = document.getElementById("info-titulo");
            const infoAno = document.getElementById("info-ano");
            const infoClass = document.getElementById("info-classificacao");
            const infoSinopse = document.getElementById("info-sinopse");

            if (infoBanner) infoBanner.src = item.banner || "";
            if (infoPoster) infoPoster.src = item.poster || "";
            if (infoTitulo) infoTitulo.textContent = item.titulo || "Sem título";
            if (infoAno) infoAno.textContent = item.ano || "----";
            if (infoClass) infoClass.textContent = item.classificacao || "--";
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

            // Filme vs série
            if (item.tipo === "filme" || item.video) {
                if (blocoEpisodios) blocoEpisodios.style.display = "none";
                if (blocoFilme) blocoFilme.style.display = "block";

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
                if (blocoFilme) blocoFilme.style.display = "none";
                if (blocoEpisodios) blocoEpisodios.style.display = "block";

                if (Array.isArray(item.temporadas) && item.temporadas.length > 0) {
                    if (customSelectContainer) customSelectContainer.style.display = "inline-block";
                    temporadasAtuais = item.temporadas;
                } else if (Array.isArray(item.episodios)) {
                    if (customSelectContainer) customSelectContainer.style.display = "none";
                    temporadasAtuais = [{ nome: "Temporada Única", episodios: item.episodios }];
                } else {
                    temporadasAtuais = [];
                }

                temporadaSelecionadaIndex = 0;
                indexEpisodes(itemId);

                renderizarPopUpTemporadas(containerEps, modeloEp);
                if (temporadasAtuais[0] && temporadasAtuais[0].episodios) {
                    renderizarListaEpisodios(temporadasAtuais[0].episodios, containerEps, modeloEp);
                } else {
                    containerEps.innerHTML = "<p style='color: #888; padding: 10px;'>Nenhum episódio disponível nesta temporada.</p>";
                }
            }

        } catch (erro) {
            console.error("Erro ao carregar os dados de info.json:", erro);
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

    // --- RENDERIZAR EPISÓDIOS (Otimizado) ---

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
                // Nota: O clique agora é capturado via Event Delegation no container
            }

            frag.appendChild(clone);
        });

        container.appendChild(frag);
    }

    // --- ROTEAMENTO ---

    window.addEventListener("hashchange", () => {
        fecharOverlayEp(); // Fecha o overlay ao trocar de tela/hash
        gerenciarTelaInfo();
    });

    gerenciarTelaInfo();
});
