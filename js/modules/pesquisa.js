// js/modules/pesquisa.js

let bancoDadosCache = null; // Guarda o info.json em memória para buscas instantâneas

/**
 * Remove acentos e converte para minúsculas para facilitar a comparação
 */
function normalizarTexto(texto) {
    return (texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

export async function inicializarPesquisa() {
    const inputBusca = document.getElementById("input-busca");
    const gradeResultados = document.getElementById("grade-resultados-busca");
    const modeloCard = document.getElementById("modelo-card-anime");
    const msgVazia = document.getElementById("busca-vazia");

    if (!inputBusca || !gradeResultados || !modeloCard) return;

    // 🎹 Escuta a digitação em tempo real a cada caractere
    inputBusca.addEventListener("input", async (e) => {
        const termoBusca = normalizarTexto(e.target.value.trim());

        // Se o input estiver vazio, limpa a tela e oculta mensagens
        if (termoBusca === "") {
            gradeResultados.innerHTML = "";
            if (msgVazia) msgVazia.style.display = "none";
            return;
        }

        // 📡 Carrega o info.json apenas na primeira busca realizada
        if (!bancoDadosCache) {
            try {
                console.log("📡 [Pesquisa] Carregando dados de info.json...");
                const resposta = await fetch("./dados/info.json");
                if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);
                bancoDadosCache = await resposta.json();
                console.log("✅ [Pesquisa] Banco indexado com sucesso.");
            } catch (erro) {
                console.error("❌ [Pesquisa] Falha ao carregar info.json:", erro);
                return;
            }
        }

        executarFiltro(termoBusca, gradeResultados, modeloCard, msgVazia);
    });
}

/**
 * Filtra e renderiza os resultados cruzando os termos com títulos e gêneros
 */
function executarFiltro(termo, container, template, feedbackVazio) {
    container.innerHTML = ""; // Limpa os resultados anteriores
    let totalEncontrados = 0;

    const frag = document.createDocumentFragment();

    if (!bancoDadosCache) return;

    // Varre os animes do info.json
    Object.keys(bancoDadosCache).forEach(animeId => {
        const anime = bancoDadosCache[animeId];
        
        const tituloNormalizado = normalizarTexto(anime.titulo);
        
        // Verifica se algum gênero coincide com o termo digitado (sem acento)
        const matchesGenero = Array.isArray(anime.generos) && 
            anime.generos.some(g => normalizarTexto(g).includes(termo));

        // Condição: Se bater com o título OU com o gênero, exibe o card
        if (tituloNormalizado.includes(termo) || matchesGenero) {
            totalEncontrados++;

            // Clona o molde padrão de card
            const clone = template.content.cloneNode(true);

            const linkCard = clone.querySelector("a");
            const imgCard = clone.querySelector("img");
            const tituloCard = clone.querySelector(".card-title");

            if (linkCard && imgCard && tituloCard) {
                linkCard.href = `#info?anime=${encodeURIComponent(animeId)}`;
                imgCard.src = anime.poster || anime.banner || "";
                imgCard.alt = `Capa de ${anime.titulo || animeId}`;
                tituloCard.textContent = anime.titulo || animeId;

                frag.appendChild(clone);
            }
        }
    });

    // Injeta todos os cards filtrados na tela
    container.appendChild(frag);

    // Exibe ou oculta a mensagem de "Nenhum resultado"
    if (feedbackVazio) {
        feedbackVazio.style.display = totalEncontrados === 0 ? "block" : "none";
    }
}
