// js/main.js
import { carregarHeroBanner } from './modules/heroBanner.js';
import { carregarAnimesRecomendados } from './modules/destaque_principal_card.js';
import { carregarAnimesRecentes } from './modules/add.recent.js';
import { carregarNovosEpisodios } from './modules/novosEpisodios.js';
import { carregarAnimesPorGenero } from './modules/generos.js';
import { gerenciarTelaInfo } from './modules/infoView.js';
import { fecharOverlayEp } from './modules/overlayEpisodio.js';
import { gerenciarTelaPlayer } from './modules/playerView.js';
// 🟥 NOVO IMPORT: Inicializa o escopo de pesquisa em tempo real
import { inicializarPesquisa } from './modules/pesquisa.js';

document.addEventListener("DOMContentLoaded", () => {
  // --- ROTEADOR DE ABAS / VIEWS ---
  const tabItems = document.querySelectorAll(".tab-item");
  const appViews = document.querySelectorAll(".app-view");

  const scrollPositions = {};
  let hashAnterior = null;

  function navegarPeloHash() {
    let rawHash = window.location.hash || "#inicio";
    let hashAtual = rawHash.split("?")[0];                                               
    
    // Salva a posição do scroll apenas se estiver mudando para uma tela DIFERENTE
    if (hashAnterior && hashAnterior !== hashAtual) {
      scrollPositions[hashAnterior] = window.scrollY;
    }

    let telaAlvo = document.querySelector(hashAtual);
    if (!telaAlvo) {
      hashAtual = "#erro";
      telaAlvo = document.querySelector(hashAtual);
    }                                                                                    
    appViews.forEach(view => view.classList.remove("active"));
    telaAlvo?.classList.add("active");

    tabItems.forEach(tab => {
      tab.classList.remove("active");
      if (tab.getAttribute("href") === hashAtual) {
        tab.classList.add("active");
      }
    });

    // Se mudou de aba/tela, restaura o scroll anterior.
    // Se permaneceu na mesma tela (ex: trocando de EP dentro do #player), rola para o topo.
    if (hashAnterior !== hashAtual) {
      const savedScroll = scrollPositions[hashAtual] || 0;
      window.scrollTo({ top: savedScroll, behavior: "instant" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    hashAnterior = hashAtual;
  }

  const btnErroVoltar = document.getElementById("btn-erro-voltar");
  if (btnErroVoltar) {
    btnErroVoltar.addEventListener("click", () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.hash = "#inicio";
      }
    });
  }

  // --- INICIALIZAÇÃO DOS MÓDULOS ---
  carregarHeroBanner();
  carregarAnimesRecomendados();
  carregarAnimesRecentes();
  carregarNovosEpisodios();
  carregarAnimesPorGenero();
  // 🟥 Chamada do módulo para indexar o info.json em cache e escutar o input
  inicializarPesquisa();

  window.addEventListener("hashchange", () => {
    navegarPeloHash();
    fecharOverlayEp();
    gerenciarTelaInfo();
    gerenciarTelaPlayer();
  });

  navegarPeloHash();
  gerenciarTelaInfo();
  gerenciarTelaPlayer();
});
