document.addEventListener("DOMContentLoaded", () => {

    async function carregarAnimesRecomendados() {
        const grade = document.getElementById("grade-recomendados");
        const modelo = document.getElementById("modelo-card-anime");

        console.log("🔍 [Recomendados] Verificando elementos no HTML...");
        console.log("- Elemento 'grade-recomendados':", grade);
        console.log("- Elemento 'modelo-card-anime':", modelo);

        if (!grade || !modelo) {
            console.error("❌ [Recomendados] Elementos necessários não foram encontrados no HTML! Verifique se os IDs no index.html estão certos.");
            return;
        }

        try {
            console.log("📡 [Recomendados] Fazendo fetch em 'animes_recomendados.json'...");
            const resposta = await fetch("./dados/animes_recomendados.json");
            
            if (!resposta.ok) {
                throw new Error(`Erro HTTP ao buscar JSON! Status: ${resposta.status}`);
            }

            const listaAnimes = await resposta.json();
            console.log("✅ [Recomendados] JSON baixado. Total de animes encontrados:", listaAnimes.length, listaAnimes);

            if (listaAnimes.length === 0) {
                console.warn("⚠️ [Recomendados] O arquivo JSON foi lido, mas está vazio []");
                return;
            }

            // Limpa a grade antes de injetar para evitar duplicados
            grade.innerHTML = "";

            // Clona o molde, preenche e injeta um por um de forma limpa
            listaAnimes.forEach((anime, index) => {
                const clone = modelo.content.cloneNode(true);

                const linkCard = clone.querySelector("a");
                const imgCard = clone.querySelector("img");
                const tituloCard = clone.querySelector(".card-title");

                // Verifica se o template interno está correto
                if (!linkCard || !imgCard || !tituloCard) {
                    console.error(`❌ [Recomendados] Erro na estrutura interna do <template> no item de índice ${index}`);
                    return;
                }

                linkCard.href = `#info?anime=${anime.id}`;
                imgCard.src = anime.capa;
                imgCard.alt = `Capa de ${anime.titulo}`;
                tituloCard.textContent = anime.titulo;

                grade.appendChild(clone);
            });

            console.log("✨ [Recomendados] Todos os cards foram injetados na tela com sucesso!");

        } catch (erro) {
            console.error("❌ [Recomendados] Falha crítica no processo:", erro);
        }
    }

    // Executa a carga dinâmica dos cards
    carregarAnimesRecomendados();
});
