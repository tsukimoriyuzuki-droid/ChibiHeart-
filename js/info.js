document.addEventListener("DOMContentLoaded", () => {
    
    async function gerenciarTelaInfo() {
        // 1. Pega a rota e os parâmetros da URL (ex: #info?anime=onimai)
        const rawHash = window.location.hash || "#inicio";
        const [hashAtual, queryString] = rawHash.split("?");

        // Só roda a função se o usuário estiver na View de Informações
        if (hashAtual !== "#info") return;

        // Referências do DOM
        const containerEps = document.getElementById("lista-episodios");
        const modeloEp = document.getElementById("modelo-card-ep");
        const containerGeneros = document.getElementById("info-generos");
        const selectTemporadas = document.getElementById("select-temporadas");
        const blocoFilme = document.getElementById("acao-filme");
        const blocoEpisodios = document.getElementById("container-episodios");

        if (!containerEps || !modeloEp) return;

        // Pega o ID do anime/filme contido na URL (?anime=id ou ?id=id)
        const params = new URLSearchParams(queryString);
        const itemId = params.get("anime") || params.get("id");

        if (!itemId) {
            window.location.hash = "#inicio"; // Se não tiver ID válido, volta pra Home
            return;
        }

        try {
            // Busca o arquivo info.json do servidor
            const resposta = await fetch("info.json");
            const bancoDados = await resposta.json();
            const item = bancoDados[itemId];

            if (!item) {
                console.error("Item não encontrado no info.json:", itemId);
                return;
            }

            // 2. Preenche os dados visuais básicos (Comuns para Filme e Série)
            document.getElementById("info-banner").src = item.banner || "";
            document.getElementById("info-poster-img").src = item.poster || "";
            document.getElementById("info-titulo").textContent = item.titulo || "Sem título";
            document.getElementById("info-ano").textContent = item.ano || "----";
            document.getElementById("info-classificacao").textContent = item.classificacao || "--";
            document.getElementById("info-sinopse").textContent = item.sinopse || "Sem sinopse disponível.";

            // Preenche as tags de Gêneros
            containerGeneros.innerHTML = "";
            if (Array.isArray(item.generos)) {
                item.generos.forEach(genero => {
                    const tag = document.createElement("span");
                    tag.className = "genre-tag";
                    tag.textContent = genero;
                    containerGeneros.appendChild(tag);
                });
            }

            // 3. CONDICIONAL: É FILME OU SÉRIE/ANIME?

            if (item.tipo === "filme" || item.video) {
                // --- É UM FILME ---
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
                // --- É UMA SÉRIE / ANIME ---
                if (blocoFilme) blocoFilme.style.display = "none";
                if (blocoEpisodios) blocoEpisodios.style.display = "block";

                // Se o JSON contiver a lista de TEMPORADAS:
                if (Array.isArray(item.temporadas) && item.temporadas.length > 0) {
                    if (selectTemporadas) {
                        selectTemporadas.style.display = "block";
                        selectTemporadas.innerHTML = "";

                        // Popula o <select> com as temporadas
                        item.temporadas.forEach((temp, index) => {
                            const option = document.createElement("option");
                            option.value = index;
                            option.textContent = temp.nome || `${index + 1}ª Temporada`;
                            selectTemporadas.appendChild(option);
                        });

                        // Evento ao trocar de temporada no menu
                        selectTemporadas.onchange = (e) => {
                            const idx = e.target.value;
                            renderizarListaEpisodios(item.temporadas[idx].episodios, containerEps, modeloEp);
                        };
                    }

                    // Renderiza a 1ª temporada por padrão
                    renderizarListaEpisodios(item.temporadas[0].episodios, containerEps, modeloEp);

                } else if (Array.isArray(item.episodios)) {
                    // Compatibilidade: Se for um anime sem temporadas (lista simples de episódios)
                    if (selectTemporadas) selectTemporadas.style.display = "none";
                    renderizarListaEpisodios(item.episodios, containerEps, modeloEp);
                }
            }

        } catch (erro) {
            console.error("Erro ao carregar os dados de info.json:", erro);
        }
    }

    // Função interna para clonar e injetar os episódios na tela
    function renderizarListaEpisodios(listaEpisodios, container, modelo) {
        container.innerHTML = ""; // Limpa episódios anteriores

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
