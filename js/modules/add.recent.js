export async function carregarAnimesRecentes() {
    const grade = document.getElementById("grade-recentes");
    const modelo = document.getElementById("modelo-card-anime");

    console.log("🔍 [Recentes] Verificando elementos no HTML...");

    if (!grade || !modelo) {
        console.warn("⚠️ [Recentes] Elemento 'grade-recentes' ou 'modelo-card-anime' não encontrado no DOM.");
        return;
    }

    try {
        console.log("📡 [Recentes] Carregando 'add_recent.json' e 'info.json'...");

        // Faz o carregamento dos dois arquivos simultaneamente
        const [respostaRecentes, respostaInfo] = await Promise.all([
            fetch("./dados/add_recent.json"),
            fetch("./dados/info.json")
        ]);

        if (!respostaRecentes.ok) {
            throw new Error(`Erro HTTP ao buscar add_recent.json! Status: ${respostaRecentes.status}`);
        }
        if (!respostaInfo.ok) {
            throw new Error(`Erro HTTP ao buscar info.json! Status: ${respostaInfo.status}`);
        }

        const listaIds = await respostaRecentes.json();
        const infoCompleta = await respostaInfo.json();

        if (!Array.isArray(listaIds) || listaIds.length === 0) {
            console.warn("⚠️ [Recentes] O arquivo add_recent.json está vazio.");
            return;
        }

        // Limpa o container para evitar duplicatas
        grade.innerHTML = "";

        listaIds.forEach((item, index) => {
            const animeId = item.id;
            const anime = infoCompleta[animeId];

            if (!anime) {
                console.warn(`⚠️ [Recentes] O ID "${animeId}" não foi encontrado no info.json.`);
                return;
            }

            const clone = modelo.content.cloneNode(true);
            const linkCard = clone.querySelector("a");
            const imgCard = clone.querySelector("img");
            const tituloCard = clone.querySelector(".card-title");

            if (!linkCard || !imgCard || !tituloCard) {
                console.error(`❌ [Recentes] Erro na estrutura do <template> no item de índice ${index}`);
                return;
            }

            // Alimenta os dados do card
            linkCard.href = `#info?anime=${animeId}`;
            imgCard.src = anime.poster || anime.banner || "";
            imgCard.alt = `Capa de ${anime.titulo || animeId}`;
            tituloCard.textContent = anime.titulo || animeId;

            grade.appendChild(clone);
        });

        console.log("✨ [Recentes] Seção de adicionados recentemente carregada com sucesso!");

    } catch (erro) {
        console.error("❌ [Recentes] Falha ao carregar animes recentes:", erro);
    }
}
