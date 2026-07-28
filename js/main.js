// js/main.js

// 🔄 IMPORTS UNIFICADOS
import { 
  carregarHeroBanner, 
  carregarAnimesRecomendados, 
  carregarAnimesRecentes, 
  carregarNovosEpisodios, 
  carregarAnimesPorGenero 
} from './modules/inicio.js';

import { gerenciarTelaInfo, fecharOverlayEp } from './modules/info.js';
import { gerenciarTelaPlayer } from './modules/playerView.js';
import { inicializarPesquisa } from './modules/pesquisa.js';

// --- MÓDULO TV INTEGRADO DIRECTAMENTE ---
function inicializarNavegacaoTV() {
  window.addEventListener("keydown", (e) => {
    const chavesSuportadas = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "BackSpace", "Escape"];
    if (chavesSuportadas.includes(e.key)) {
      document.body.classList.add("tv-mode");
    }
  });

  document.addEventListener("focus", (event) => {
      const elementoFocado = event.target;
      if (elementoFocado && elementoFocado !== document.body) {
        elementoFocado.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
    }, true
  );

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" || event.keyCode === 27 || event.keyCode === 10009) {
      const overlay = document.querySelector('.overlay-ep[aria-hidden="false"]');
      if (overlay) {
        event.preventDefault();
        const btnFechar = overlay.querySelector('.overlay-close');
        if (btnFechar) btnFechar.click();
        return;
      }

      if (window.location.hash && window.location.hash !== "#inicio") {
        event.preventDefault();
        window.history.back();
      }
    }
  });
}

function atualizarElementosFocaveis(container = document) {
  const seletores = ".card, .card-ep, .btn-hero, .tab-item, button, a[href]";
  const elementos = container.querySelectorAll(seletores);

  elementos.forEach((el) => {
    if (!el.hasAttribute("tabindex")) {
      el.setAttribute("tabindex", "0");
    }
  });
}

// --- ROTEADOR ---
function navegarPeloHash() {
  const rawHash = window.location.hash || "#inicio";
  const [hashLimpa] = rawHash.split("?");

  const views = document.querySelectorAll(".app-view");
  const tabItems = document.querySelectorAll(".tab-item");

  let encontrouView = false;

  views.forEach((view) => {
    if (`#${view.id}` === hashLimpa) {
      view.classList.add("active");
      encontrouView = true;
    } else {
      view.classList.remove("active");
    }
  });

  if (!encontrouView) {
    views.forEach((view) => {
      if (view.id === "erro") {
        view.classList.add("active");
      } else {
        view.classList.remove("active");
      }
    });
  }

  tabItems.forEach((tab) => {
    const tabHref = tab.getAttribute("href");
    if (tabHref === hashLimpa) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  window.scrollTo(0, 0);
}

// --- INICIALIZAÇÃO DA APLICAÇÃO ---
document.addEventListener("DOMContentLoaded", () => {
  const btnErroVoltar = document.getElementById("btn-erro-voltar");
  if (btnErroVoltar) {
    btnErroVoltar.addEventListener("click", () => {
      window.location.hash = "#inicio";
    });
  }

  // Executa os carregadores da Home
  carregarHeroBanner();
  carregarAnimesRecomendados();
  carregarAnimesRecentes();
  carregarNovosEpisodios();
  carregarAnimesPorGenero();
  
  inicializarPesquisa();
  inicializarNavegacaoTV();

  window.addEventListener("hashchange", () => {
    navegarPeloHash();
    fecharOverlayEp();
    gerenciarTelaInfo();
    gerenciarTelaPlayer();
    atualizarElementosFocaveis();
  });

  navegarPeloHash();
  gerenciarTelaInfo();
  gerenciarTelaPlayer();
  atualizarElementosFocaveis();
});
