import { buscarTodoProgressoDB } from './db.js';
import { obterAnimePorId } from './repository.js';

export async function carregarContinuarAssistindo() {
    const containerSecao = document.getElementById("secao-continuar-assistindo");
    const containerGrade = document.getElementById("grade-continuar-assistindo");

    if (!containerGrade || !containerSecao) return;

    // 1. Busca todo o progresso armazenado no IndexedDB
    const mapaProgresso = await buscarTodoProgressoDB();
    const listaEpisodiosSalvos = Object.keys(mapaProgresso);

    // Se não houver episódios em andamento, esconde a seção
    if (listaEpisodiosSalvos.length === 0) {
        containerSecao.style.display = "none";
        return;
    }

    containerGrade.innerHTML = "";
    let temConteudo = false;

    // 2. Iterar pelos episódios e montar os cards
    for (const epId of listaEpisodiosSalvos) {
        const dadosProgresso = mapaProgresso[epId];

        // Filtra apenas episódios com progresso válido
        if (!dadosProgresso || dadosProgresso.tempo <= 0 || dadosProgresso.total <= 0) continue;

        // Extrai o ID do anime a partir do ID do episódio (ex: "naruto_s01e02" -> "naruto")
        const animeId = epId.split("_s")[0]; 
        const anime = await obterAnimePorId(animeId);

        if (!anime) continue;

        // Calcula a porcentagem assistida para a barra vermelha
        const porcentagem = Math.min((dadosProgresso.tempo / dadosProgresso.total) * 100, 100);

        // 3. Montar o Card Dinâmico
        const card = document.createElement("a");
        card.href = `#player?anime=${encodeURIComponent(animeId)}&ep=${encodeURIComponent(epId)}`;
        card.className = "card poster";
        card.tabIndex = 0;

        card.innerHTML = `
            <div class="card-media" style="position: relative;">
                <img src="${anime.banner || anime.poster}" alt="${anime.titulo}">
                
                <!-- Barra Vermelha de Progresso -->
                <div class="barra-progresso-container">
                    <div class="barra-progresso-preenchimento" style="width: ${porcentagem}%;"></div>
                </div>
            </div>
            <h3 class="card-title">${anime.titulo}</h3>
        `;

        containerGrade.appendChild(card);
        temConteudo = true;
    }

    // Exibe a seção apenas se houver pelo menos 1 card válido renderizado
    containerSecao.style.display = temConteudo ? "block" : "none";
}
