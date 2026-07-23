document.addEventListener("DOMContentLoaded", () => {
    
    // Variável para armazenar as temporadas do anime atual na memória
    let temporadasAtuais = [];
    let temporadaSelecionadaIndex = 0;

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

        const params = new URLSearchParams(queryString);
        const itemId = params.get("anime") || params.get("id");

        if (!itemId) {
            window.location.hash = "#inicio";
            return;
        }

        try {
            const resposta = await fetch("info.json");
            const bancoDados = await resposta.json();
            const item = bancoDados[itemId];

            if (!item) {
                console.error("Item não encontrado no info.json:", itemId);
                return;
            }

            // Preenche dados básicos
            document.getElementById("info-banner").src = item.banner || "";
            document.getElementById("info-poster-img").src = item.poster || "";
            document.getElementById("info-titulo").textContent = item.titulo || "Sem título";
            document.getElementById("info-ano").textContent = item.ano || "----";
            document.getElementById("info-classificacao").textContent = item.classificacao || "--";
            document.getElementById("info-sinopse").textContent = item.sinopse || "Sem sinopse disponível.";

            // Preenche os gêneros
            containerGeneros.innerHTML = "";
            if (Array.isArray(item.generos)) {
                item.generos.forEach(genero => {
                    const tag = document.createElement("span");
                    tag.className = "genre-tag";
                    tag.textContent = genero;
                    containerGeneros.appendChild(tag);
                });
            }

            // Condicional Filme vs Série/Anime
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

                // Se o JSON tiver a lista de TEMPORADAS:
                if (Array.isArray(item.temporadas) && item.temporadas.length > 0) {
                    if (customSelectContainer) customSelectContainer.style.display = "inline-block";
                    
                    temporadasAtuais = item.temporadas;
                    temporadaSelecionadaIndex = 0; // Inicia na 1ª temporada por padrão

                    // Renderiza o pop-up com as temporadas e carrega os episódios da 1ª
                    renderizarPopUpTemporadas(containerEps, modeloEp);
                    renderizarListaEpisodios(temporadasAtuais[0].episodios, containerEps, modeloEp);

                } else if (Array.isArray(item.episodios)) {
                    // Esconde o seletor caso não haja múltiplas temporadas
                    if (customSelectContainer) customSelectContainer.style.display = "none";
                    renderizarListaEpisodios(item.episodios, containerEps, modeloEp);
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

        // 1. Atualiza o layout do pop-up e do botão
        renderizarPopUpTemporadas(containerEps, modeloEp);

        // 2. Fecha o pop-up
        const popup = document.getElementById("popup-temporadas");
        if (popup) popup.classList.remove("mostrar");

        // 3. Atualiza os episódios para a temporada escolhida
        if (temporadasAtuais[index] && temporadasAtuais[index].episodios) {
            renderizarListaEpisodios(temporadasAtuais[index].episodios, containerEps, modeloEp);
        }
    }

    // Alternar visibilidade do pop-up
    window.togglePopupTemporadas = function () {
        const popup = document.getElementById("popup-temporadas");
        if (popup) popup.classList.toggle("mostrar");
    };

    // Fechar ao clicar fora
    window.addEventListener("click", (event) => {
        if (!event.target.matches('#btn-selecionar-temporada')) {
            const popup = document.getElementById("popup-temporadas");
            if (popup && popup.classList.contains('mostrar')) {
                popup.classList.remove('mostrar');
            }
        }
    });

    // --- FUNÇÃO PARA RENDERIZAR OS EPISÓDIOS ---

    function renderizarListaEpisodios(listaEpisodios, container, modelo) {
        container.innerHTML = "";

        if (!Array.isArray(listaEpisodios) || listaEpisodios.length === 0) {
            container.innerHTML = "<p style='color: #888; padding: 10px;'>Nenhum episódio disponível nesta temporada.</p>";
            return;
        }

        listaEpisodios.forEach((ep, epIndex) => {
            const clone = modelo.content.cloneNode(true);

            const imgEl = clone.querySelector("img");
            const durationEl = clone.querySelector(".ep-duration");
            const titleEl = clone.querySelector(".card-title-ep");
            const subtitleEl = clone.querySelector(".card-subtitle-ep");
            const cardWrapper = clone.querySelector(".card-ep");

            if (imgEl) {
                imgEl.src = ep.thumb || "";
                imgEl.alt = ep.titulo || `Episódio ${epIndex + 1}`;
            }
            if (durationEl) durationEl.textContent = ep.duracao || "";
            if (titleEl) titleEl.textContent = ep.titulo || `Episódio ${epIndex + 1}`;
            if (subtitleEl) subtitleEl.textContent = ep.numero || `EP ${epIndex + 1}`;

            if (cardWrapper) {
                cardWrapper.style.cursor = "pointer";
                cardWrapper.addEventListener("click", () => {
                    const videoUrl = ep.video || ep.url || "";
                    if (videoUrl) {
                        window.location.hash = `#player?video=${encodeURIComponent(videoUrl)}`;
                    } else {
                        console.warn("Episódio sem URL de vídeo vinculada.");
                    }
                });
            }

            container.appendChild(clone);
        });
    }

    // Executa ao mudar de rota ou recarregar
    window.addEventListener("hashchange", gerenciarTelaInfo);
    gerenciarTelaInfo();
});
