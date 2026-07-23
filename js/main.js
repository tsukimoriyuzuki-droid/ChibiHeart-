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

    // Valida se a tela alvo existe na DOM; se não existir, redireciona para a tela de erro
    let telaAlvo = document.querySelector(hashAtual);
    if (!telaAlvo) {
      hashAtual = "#erro";
      telaAlvo = document.querySelector(hashAtual);
    }

    // Alterna a exibição das seções
    appViews.forEach(view => view.classList.remove("active"));
    telaAlvo?.classList.add("active");

    // Alterna o estado ativo da bottom nav / tabs
    tabItems.forEach(tab => {
      tab.classList.remove("active");
      if (tab.getAttribute("href") === hashAtual) {
        tab.classList.add("active");
      }
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // --- BOTÃO DE VOLTAR NA TELA DE ERRO ---
  const btnErroVoltar = document.getElementById("btn-erro-voltar");
  if (btnErroVoltar) {
    btnErroVoltar.addEventListener("click", () => {
      // Se houver histórico de navegação na aba atual, volta para a tela anterior
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // Se entrou direto pelo link quebrado em uma aba nova, vai para o início
        window.location.hash = "#inicio";
      }
    });
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
