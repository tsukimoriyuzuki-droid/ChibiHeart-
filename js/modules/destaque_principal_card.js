export async function carregarAnimesRecomendados() {
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
        console.log("📡 [Recomendados] Fazendo fetch simultâneo em 'destaque_principal_card.json' e 'info.json'...");
        
        // Realiza o carregamento dos dois arquivos ao mesmo tempo para máxima performance
        const [respostaCards, respostaInfo] = await Promise.all([
            fetch("./dados/destaque_principal_card.json"),
            fetch("./dados/info.json")
        ]);

        if (!respostaCards.ok) {
            throw new Error(`Erro HTTP ao buscar destaque_principal_card.json! Status: ${respostaCards.status}`);
        }
        if (!respostaInfo.ok) {
            throw new Error(`Erro HTTP ao buscar info.json! Status: ${respostaInfo.status}`);
        }

        const listaIds = await respostaCards.json();
        const infoCompleta = await respostaInfo.json();

        console.log("✅ [Recomendados] JSONs baixados. Total de IDs na lista:", listaIds.length, listaIds);

        if (listaIds.length === 0) {
            console.warn("⚠️ [Recomendados] O arquivo JSON foi lido, mas está vazio []");
            return;
        }

        // Limpa a grade antes de injetar para evitar duplicados
        grade.innerHTML = "";

        // Clona o molde, preenche cruzando com o info.json e injeta um por um de forma limpa
        listaIds.forEach((item, index) => {
            const animeId = item.id;
            
            // Localiza os metadados do anime no banco de dados principal utilizando o ID
            const anime = infoCompleta[animeId];

            if (!anime) {
                console.warn(`⚠️ [Recomendados] O ID "${animeId}" está listado nos destaques, mas não foi encontrado no info.json. Pulando.`);
                return;
            }

            const clone = modelo.content.cloneNode(true);

            const linkCard = clone.querySelector("a");
            const imgCard = clone.querySelector("img");
            const tituloCard = clone.querySelector(".card-title");

            // Verifica se o template interno está correto
            if (!linkCard || !imgCard || !tituloCard) {
                console.error(`❌ [Recomendados] Erro na estrutura interna do <template> no item de índice ${index}`);
                return;
            }

            // Alimenta a interface utilizando exclusivamente as chaves do info.json (poster e titulo)
            linkCard.href = `#info?anime=${animeId}`;
            imgCard.src = anime.poster || anime.banner || "";
            imgCard.alt = `Capa de ${anime.titulo || animeId}`;
            tituloCard.textContent = anime.titulo || animeId;

            grade.appendChild(clone);
        });

        console.log("✨ [Recomendados] Todos os cards foram injetados na tela com sucesso!");

    } catch (erro) {
        console.error("❌ [Recomendados] Falha crítica no processo:", erro);
    }
}
