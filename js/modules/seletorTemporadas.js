import { renderizarListaEpisodios } from './renderizadorEpisodios.js';

// Estado local do seletor
let temporadasAtuais = [];
let temporadaSelecionadaIndex = 0;
let currentAnimeId = "";

/**
 * Inicializa a estrutura de temporadas e define a temporada ativa.
 */
export function inicializarTemporadas(item, tempParam, customSelectContainer, infoTemporadas, containerEps, modeloEp, itemId) {
    currentAnimeId = itemId;

    if (Array.isArray(item.temporadas) && item.temporadas.length > 0) {
        if (customSelectContainer) customSelectContainer.style.display = "inline-block";
        temporadasAtuais = item.temporadas;
        if (infoTemporadas) {
            const totalTemp = item.temporadas.length;
            infoTemporadas.textContent = `${totalTemp} ${totalTemp === 1 ? 'Temporada' : 'Temporadas'}`;
        }
    } else if (Array.isArray(item.episodios)) {
        if (customSelectContainer) customSelectContainer.style.display = "none";
        temporadasAtuais = [{ nome: "Temporada Única", episodios: item.episodios }];
        if (infoTemporadas) infoTemporadas.textContent = "1 Temporada";
    } else {
        temporadasAtuais = [];
        if (infoTemporadas) infoTemporadas.textContent = "-- Temporadas";
    }

    // Valida o parâmetro de temporada recebido na URL
    if (!isNaN(tempParam) && tempParam >= 1 && tempParam <= temporadasAtuais.length) {
        temporadaSelecionadaIndex = tempParam - 1;
    } else {
        temporadaSelecionadaIndex = 0;
    }

    renderizarPopUpTemporadas(containerEps, modeloEp);

    return {
        temporadasAtuais,
        temporadaIndex: temporadaSelecionadaIndex
    };
}

/**
 * Monta os itens dentro do popup dropdown de temporadas.
 */
export function renderizarPopUpTemporadas(containerEps, modeloEp) {
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

/**
 * Troca a temporada selecionada e atualiza a URL sem recarregar a tela.
 */
function mudarTemporada(index, containerEps, modeloEp) {
    temporadaSelecionadaIndex = index;

    const novaTempNum = index + 1;
    const urlAtual = new URL(window.location.href);
    const [hashBase, hashQuery] = urlAtual.hash.split("?");
    const params = new URLSearchParams(hashQuery || "");
    params.set("temp", novaTempNum);

    history.replaceState(null, "", `${hashBase}?${params.toString()}`);

    renderizarPopUpTemporadas(containerEps, modeloEp);

    const popup = document.getElementById("popup-temporadas");
    if (popup) popup.classList.remove("mostrar");

    if (temporadasAtuais[index] && temporadasAtuais[index].episodios) {
        renderizarListaEpisodios(temporadasAtuais[index].episodios, containerEps, modeloEp, currentAnimeId, index);
    } else {
        containerEps.innerHTML = "<p style='color: #888; padding: 10px;'>Nenhum episódio disponível nesta temporada.</p>";
    }
}

// --- EVENTOS DO DROPDOWN ---

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
