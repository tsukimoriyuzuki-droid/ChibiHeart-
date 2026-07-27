export async function carregarAnimesPorGenero() {
    // 1. Corrigido: Aponta para a section 'inicio' presente no seu HTML
    const containerPrincipal = document.getElementById("inicio");
    
    const modeloSecao = document.getElementById("modelo-secao-genero");
    const modeloCard = document.getElementById("modelo-card-anime");

    if (!containerPrincipal || !modeloSecao || !modeloCard) {
        console.warn("⚠️ [Gêneros] Elementos ou templates principais não encontrados no HTML.");
        return;
    }

    // Limpa seções de gêneros geradas anteriormente para evitar duplicatas ao recarregar
    const secoesExistentes = containerPrincipal.querySelectorAll(".secao-genero-container");
    secoesExistentes.forEach(secao => secao.remove());

    try {
        console.log("📡 [Gêneros] Fazendo fetch automático no 'info.json'...");
        const respostaInfo = await fetch("./dados/info.json");
        if (!respostaInfo.ok) throw new Error(`Erro HTTP: ${respostaInfo.status}`);

        const infoCompleta = await respostaInfo.json();

        // Extração Automática de Gêneros Únicos
        const setGeneros = new Set();
        Object.values(infoCompleta).forEach(anime => {
            if (Array.isArray(anime.generos)) {
                anime.generos.forEach(g => setGeneros.add(g));
            }
        });

        // Converte em Array e embaralha a ordem das categorias
        let listaGeneros = Array.from(setGeneros);
        listaGeneros = embaralharLista(listaGeneros);

        console.log("🎲 [Gêneros] Ordem sorteada para esta sessão:", listaGeneros);

        // Renderização Dinâmica das Seções e dos Cards
        listaGeneros.forEach(generoAlvo => {
            // Clona o modelo do carrossel/seção do HTML
            const cloneSecao = modeloSecao.content.cloneNode(true);
            
            const tituloSecao = cloneSecao.querySelector(".titulo-categoria");
            const gradeCards = cloneSecao.querySelector(".cards-grid");

            if (!tituloSecao || !gradeCards) return;

            // Define o título da categoria
            tituloSecao.textContent = generoAlvo;

            // Procura no JSON os animes que contêm este gênero
            Object.keys(infoCompleta).forEach(animeId => {
                const anime = infoCompleta[animeId];

                if (anime.generos && anime.generos.includes(generoAlvo)) {
                    // Clona o modelo de card do anime
                    const cloneCard = modeloCard.content.cloneNode(true);
                    
                    const linkCard = cloneCard.querySelector("a");
                    const imgCard = cloneCard.querySelector("img");
                    const tituloCard = cloneCard.querySelector(".card-title");

                    if (linkCard && imgCard && tituloCard) {
                        linkCard.href = `#info?anime=${animeId}`;
                        imgCard.src = anime.poster || anime.banner || "";
                        imgCard.alt = `Capa de ${anime.titulo || animeId}`;
                        tituloCard.textContent = anime.titulo || animeId;

                        // Adiciona o card à grade do carrossel
                        gradeCards.appendChild(cloneCard);
                    }
                }
            });

            // Se a seção possuir animes, insere no container principal (#inicio)
            if (gradeCards.children.length > 0) {
                containerPrincipal.appendChild(cloneSecao);
            }
        });

        console.log("✨ [Gêneros] Carrosséis gerados e embaralhados automaticamente!");

    } catch (erro) {
        console.error("❌ [Gêneros] Falha crítica ao gerar categorias:", erro);
    }
}

// Algoritmo Fisher-Yates de Embaralhamento
function embaralharLista(array) {
    let copia = [...array];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}
