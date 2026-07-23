// js/main.js
import { carregarHeroBanner } from './modules/heroBanner.js';
import { carregarAnimesRecomendados } from './modules/destaque_principal_card.js';
import { gerenciarTelaInfo } from './modules/infoView.js';
import { fecharOverlayEp } from './modules/overlayEpisodio.js';

document.addEventListener("DOMContentLoaded", () => {
  // --- ROTEADOR DE ABAS / VIEWS ---
  const tabItems = document.querySelectorAll(".tab-item");
  const appViews = document.querySelectorAll(".app-view");

  function navegarPeloHash() {
    let rawHash = window.location.hash || "#inicio";
    let hashAtual = rawHash.split("?")[0];

    const telaAlvo = document.querySelector(hashAtual);
    if (!telaAlvo) {
      hashAtual = "#inicio";
    }

    // Alterna a exibição das seções
    appViews.forEach(view => view.classList.remove("active"));
    document.querySelector(hashAtual)?.classList.add("active");

    // Alterna o estado ativo da bottom nav / tabs
    tabItems.forEach(tab => {
      tab.classList.remove("active");
      if (tab.getAttribute("href") === hashAtual) {
        tab.classList.add("active");
      }
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // --- INICIALIZAÇÃO DOS MÓDULOS ---
  // 1. Carrega os componentes da Home (#inicio)
  carregarHeroBanner();
  carregarAnimesRecomendados();

  // 2. Controla a troca de telas e eventos de rota
  window.addEventListener("hashchange", () => {
    navegarPeloHash();
    fecharOverlayEp();
    gerenciarTelaInfo();
  });

  // Execuções iniciais de rota
  navegarPeloHash();
  gerenciarTelaInfo();
});
