document.addEventListener("DOMContentLoaded", () => {
    
    async function gerenciarTelaInfo() {
        // Pega o hash e divide para identificar se há parâmetros (ex: #info?anime=onimai)
        const rawHash = window.location.hash || "#inicio";
        const [hashAtual, queryString] = rawHash.split("?");

        // Só executa se o usuário estiver na tela de info
        if (hashAtual !== "#info") return;

        const containerEps = document.getElementById("lista-episodios");
        const modeloEp = document.getElementById("modelo-card-ep");
        const containerGeneros = document.getElementById("info-generos");

        if (!containerEps || !modeloEp) return;

        // Pega o ID do anime contido na URL
        const params = new URLSearchParams(queryString);
        const animeId = params.get("anime");

        if (!animeId) {
            window.location.hash = "#inicio"; // Se não tiver ID válido, volta pra Home
            return;
        }

        try {
            // Busca o arquivo info.json do servidor Nginx
            const resposta = await fetch("info.json");
            const bancoDados = await resposta.json();
            const anime = bancoDados[animeId];

            if (!anime) {
                console.error("Anime não encontrado no info.json");
                return;
            }

            // 1. Preenche os dados principais da tela
            document.getElementById("info-banner").src = anime.banner;
            document.getElementById("info-poster-img").src = anime.poster;
            document.getElementById("info-titulo").textContent = anime.titulo;
            document.getElementById("info-ano").textContent = anime.ano;
            document.getElementById("info-classificacao").textContent = anime.classificacao;
            document.getElementById("info-sinopse").textContent = anime.sinopse;

            // 2. Preenche os Gêneros/Tags de forma limpa
            containerGeneros.innerHTML = "";
            anime.generos.forEach(genero => {
                const tag = document.createElement("span");
                tag.className = "genre-tag";
                tag.textContent = genero;
                containerGeneros.appendChild(tag);
            });

            // 3. Preenche a Lista de Episódios usando o Template (sem destruir o DOM)
            containerEps.innerHTML = ""; // Limpa os episódios do anime anterior
            anime.episodios.forEach(ep => {
                const clone = modeloEp.content.cloneNode(true);

                clone.querySelector("img").src = ep.thumb;
                clone.querySelector("img").alt = ep.titulo;
                clone.querySelector(".ep-duration").textContent = ep.duracao;
                clone.querySelector(".card-title-ep").textContent = ep.titulo;
                clone.querySelector(".card-subtitle-ep").textContent = ep.numero;

                containerEps.appendChild(clone);
            });

        } catch (erro) {
            console.error("Erro ao processar dados da tela de informações:", erro);
        }
    }

    // Executa quando muda o hash da URL (navegação SPA)
    window.addEventListener("hashchange", gerenciarTelaInfo);
    
    // Executa também se a página já recarregar direto no link de info
    gerenciarTelaInfo();
});
