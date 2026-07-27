// js/modules/infoView.js

import { abrirOverlayEp } from './overlayEpisodio.js';
import { inicializarTemporadas } from './seletorTemporadas.js';
import { indexEpisodes, renderizarListaEpisodios } from './renderizadorEpisodios.js';
// 📥 Importa o buscador em lote do seu banco local
import { buscarTodoProgressoDB } from './db.js';

export async function gerenciarTelaInfo() {
    const rawHash = window.location.hash || "#inicio";
    const [hashAtual, queryString] = rawHash.split("?");

    if (hashAtual !== "#info") return;

    const containerEps = document.getElementById("lista-episodios");
    const modeloEp = document.getElementById("modelo-card-ep");
    const containerGeneros = document.getElementById("info-generos");
    const customSelectContainer = document.querySelector(".custom-select-container");
    const blocoFilme = document.querySelector(".acao-principal-container");
    const blocoEpisodios = document.getElementById("container-episodios");

    if (!containerEps || !modeloEp) return;

    // Configura Event Delegation nos cards de episódios
    if (!containerEps.dataset.listenerAttached) {
        containerEps.dataset.listenerAttached = "true";
        containerEps.addEventListener("click", (e) => {
            const card = e.target.closest(".card-ep");
            if (card && card.dataset.epId) {
                abrirOverlayEp(card.dataset.epId);
            }
        });
    }

    const params = new URLSearchParams(queryString);
    const itemId = params.get("anime") || params.get("id");
    const tempParam = parseInt(params.get("temp"), 10);

    if (!itemId) {
        window.location.hash = "#erro";
        return;
    }

    try {
        const resposta = await fetch("./dados/info.json");
        if (!resposta.ok) throw new Error('Erro ao carregar info.json: ' + resposta.status);
        const bancoDados = await resposta.json();
        const item = bancoDados[itemId];

        if (!item) {
            console.error("Item não encontrado no info.json:", itemId);
            window.location.hash = "#erro";
            return;
        }

        // 1. Preenche Banner, Título, Ano, Sinopse e Gêneros
        preencherMetadados(item, containerGeneros);

        // 2. Trata exibição: Filme vs Série (Note o uso do await aqui na Série)
        if (item.tipo === "filme" || item.video) {
            configurarModoFilme(item, itemId, blocoFilme, blocoEpisodios);
        } else {
            await configurarModoSerie(item, itemId, tempParam, {
                blocoFilme,
                blocoEpisodios,
                customSelectContainer,
                containerEps,
                modeloEp
            });
        }

    } catch (erro) {
        console.error("Erro ao carregar os dados de info.json:", erro);
        window.location.hash = "#erro";
    }
}

// --- FUNÇÕES AUXILIARES DE RENDERIZAÇÃO DA VIEW ---

function preencherMetadados(item, containerGeneros) {
    const infoBanner = document.getElementById("info-banner");
    const infoTitulo = document.getElementById("info-titulo");
    const infoAno = document.getElementById("info-ano");
    const infoSinopse = document.getElementById("info-sinopse");

    if (infoBanner) infoBanner.src = item.banner || "";
    if (infoTitulo) infoTitulo.textContent = item.titulo || "Sem título";
    if (infoAno) infoAno.textContent = item.ano || "----";
    if (infoSinopse) infoSinopse.textContent = item.sinopse || "Sem sinopse disponível.";

    if (containerGeneros) {
        containerGeneros.innerHTML = "";
        if (Array.isArray(item.generos)) {
            item.generos.forEach(genero => {
                const tag = document.createElement("span");
                tag.className = "genre-tag";
                tag.textContent = genero;
                containerGeneros.appendChild(tag);
            });
        }
    }
}

function configurarModoFilme(item, itemId, blocoFilme, blocoEpisodios) {
    const infoTemporadas = document.getElementById("info-temporadas");
    if (blocoEpisodios) blocoEpisodios.style.display = "none";
    if (blocoFilme) blocoFilme.style.display = "block";
    if (infoTemporadas) infoTemporadas.style.display = "none";

    const btnPlay = document.getElementById("btn-play-filme");
    if (btnPlay) {
        btnPlay.onclick = (e) => {
            e.preventDefault();
            const epId = item.episodios?.[0]?.id || itemId;
            if (item.video || item.episodios?.[0]?.video) {
                window.location.hash = `#player?anime=${encodeURIComponent(itemId)}&ep=${encodeURIComponent(epId)}`;
            } else {
                alert("Vídeo indisponível para este filme.");
            }
        };
    }
}

// 🧱 Adicionado async para esperar a consulta do IndexedDB
async function configurarModoSerie(item, itemId, tempParam, dom) {
    const infoTemporadas = document.getElementById("info-temporadas");
    if (dom.blocoFilme) dom.blocoFilme.style.display = "block";
    if (dom.blocoEpisodios) dom.blocoEpisodios.style.display = "block";
    if (infoTemporadas) infoTemporadas.style.display = "inline";

    // Inicializa o seletor de temporadas
    const { temporadasAtuais, temporadaIndex } = inicializarTemporadas(
        item,
        tempParam,
        dom.customSelectContainer,
        infoTemporadas,
        dom.containerEps,
        dom.modeloEp,
        itemId
    );

    // Configura o botão "ASSISTIR" para dar Play no 1º episódio enviando anime e ep
    const btnPlay = document.getElementById("btn-play-filme");
    if (btnPlay) {
        btnPlay.onclick = (e) => {
            e.preventDefault();
            const tempAtiva = temporadasAtuais[temporadaIndex];
            const primeiroEp = tempAtiva?.episodios?.[0];

            if (primeiroEp && primeiroEp.video) {
                window.location.hash = `#player?anime=${encodeURIComponent(itemId)}&ep=${encodeURIComponent(primeiroEp.id)}`;
            } else {
                alert("Nenhum episódio disponível para reprodução.");
            }
        };
    }

    // Indexa os episódios no mapa de episódios
    indexEpisodes(itemId, temporadasAtuais);

    // 🎯 Coleta a tabela inteira do IndexedDB para cruzar no loop de renderização
    const mapaProgresso = await buscarTodoProgressoDB();

    // Renderiza a lista de episódios da temporada ativa repassando o mapa do banco
    const tempAtiva = temporadasAtuais[temporadaIndex];
    if (tempAtiva && tempAtiva.episodios) {
        // Passamos o mapaProgresso como o último argumento para ser usado no loop
        renderizarListaEpisodios(tempAtiva.episodios, dom.containerEps, dom.modeloEp, itemId, temporadaIndex, mapaProgresso);
    } else {
        dom.containerEps.innerHTML = "<p style='color: #888; padding: 10px;'>Nenhum episódio disponível nesta temporada.</p>";
    }
}
