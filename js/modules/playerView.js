// js/modules/playerView.js

import { salvarProgressoDB, buscarProgressoDB, buscarTodoProgressoDB, deletarProgressoDB } from "./db.js";
import { obterAnimePorId } from "./repository.js";

let plyrInstance = null;
let todosEpisodiosAtuais = [];
let epIdAtual = null;
let animeIdAtual = null;

function makeEpisodeId(animeId, seasonIdx, episodeIdx) {
  const s = String(seasonIdx).padStart(2, '0');
  const e = String(episodeIdx).padStart(2, '0');
  return `${animeId}_s${s}e${e}`;
}

export function limparPlayer() {
  if (plyrInstance) {
    try {
      plyrInstance.stop();
      plyrInstance.destroy();
    } catch (e) {
      console.warn("Aviso ao destruir Plyr:", e);
    }
    plyrInstance = null;
  }

  const videoElement = document.getElementById("player-video");
  if (videoElement) {
    videoElement.pause();
    videoElement.removeAttribute("src");
    videoElement.load();
  }
}

export async function gerenciarTelaPlayer() {
  const hash = window.location.hash;

  if (!hash.startsWith("#player")) {
    limparPlayer();
    return;
  }

  const params = new URLSearchParams(hash.split("?")[1]);
  const animeId = params.get("anime");
  const epId = params.get("ep");

  if (!animeId || !epId) return;

  try {
    const anime = await obterAnimePorId(animeId);

    if (!anime) return;

    let episodioAtual = null;
    let todosEpisodios = [];
    let temporadaAtualNome = "";

    const temporadas = Array.isArray(anime.temporadas)
      ? anime.temporadas
      : Array.isArray(anime.episodios)
        ? [{ nome: "Temporada Única", episodios: anime.episodios }]
        : [];

    let temporadaEncontrada = null;

    for (let tIdx = 0; tIdx < temporadas.length; tIdx++) {
      const temp = temporadas[tIdx];
      const eps = Array.isArray(temp.episodios) ? temp.episodios : [];

      const epAchado = eps.find((ep, eIdx) => {
        const indexEp = typeof ep.index === 'number' ? ep.index : eIdx + 1;
        const idEp = ep.id || makeEpisodeId(animeId, tIdx + 1, indexEp);
        return idEp === epId;
      });

      if (epAchado) {
        temporadaEncontrada = { temp, tIdx };
        break;
      }
    }

    if (temporadaEncontrada) {
      const { temp, tIdx } = temporadaEncontrada;
      temporadaAtualNome = temp.nome || "Temporada Única";
      const eps = Array.isArray(temp.episodios) ? temp.episodios : [];

      eps.forEach((ep, eIdx) => {
        const indexEp = typeof ep.index === 'number' ? ep.index : eIdx + 1;
        const idEp = ep.id || makeEpisodeId(animeId, tIdx + 1, indexEp);

        const epFormatado = { ...ep, index: indexEp, id: idEp, temporadaNome: temporadaAtualNome };
        todosEpisodios.push(epFormatado);

        if (idEp === epId) {
          episodioAtual = epFormatado;
        }
      });
    }

    if (!episodioAtual) return;

    todosEpisodiosAtuais = todosEpisodios;
    epIdAtual = epId;
    animeIdAtual = animeId;

    const videoElement = document.getElementById("player-video");
    const metaTag = document.getElementById("player-meta-tag");
    const tituloEp = document.getElementById("player-titulo-ep");
    const btnVerTodos = document.getElementById("lnk-ver-todos");

    if (videoElement) {
      async function restaurarTempoSalvo() {
        const progressoSalvo = await buscarProgressoDB(epIdAtual);
        if (progressoSalvo && progressoSalvo.tempo > 0) {
          videoElement.addEventListener('loadedmetadata', () => {
            if (plyrInstance) plyrInstance.currentTime = progressoSalvo.tempo;
          }, { once: true });
          
          if (videoElement.readyState >= 1 && plyrInstance) {
            plyrInstance.currentTime = progressoSalvo.tempo;
          }
        }
      }

      if (!plyrInstance) {
        videoElement.src = episodioAtual.video || "";
        videoElement.poster = episodioAtual.thumb || "";

        plyrInstance = new Plyr(videoElement, {
          controls: [
            'rewind',
            'play',
            'fast-forward',
            'progress',
            'current-time',
            'duration',
            'mute',
            'volume',
            'fullscreen'
          ],
          seekTime: 10,
          tooltips: { controls: true, seek: true },
          autoplay: true,
          i18n: {
            rewind: 'Voltar 10s',
            fastForward: 'Avançar 10s',
            play: 'Reproduzir',
            pause: 'Pausar'
          }
        });

        plyrInstance.on('ready', async () => {
          await restaurarTempoSalvo();

          const container = plyrInstance.elements.controls;
          if (container) {
            const btnRewind = container.querySelector('[data-plyr="rewind"]');
            const btnPlay = container.querySelector('[data-plyr="play"]');
            const btnForward = container.querySelector('[data-plyr="fast-forward"]');

            if (btnRewind) btnRewind.innerHTML = `<span class="material-symbols-outlined">replay_10</span>`;
            if (btnForward) btnForward.innerHTML = `<span class="material-symbols-outlined">forward_10</span>`;

            const atualizarIconePlay = () => {
              if (btnPlay) {
                btnPlay.innerHTML = plyrInstance.playing
                  ? `<span class="material-symbols-outlined">pause</span>`
                  : `<span class="material-symbols-outlined">play_arrow</span>`;
              }
            };

            plyrInstance.on('play', atualizarIconePlay);
            plyrInstance.on('pause', atualizarIconePlay);
            atualizarIconePlay();
          }
        });

        plyrInstance.on('timeupdate', () => {
          const tempoAtual = Math.floor(plyrInstance.currentTime);
          const duracaoTotal = Math.floor(plyrInstance.duration || 0);

          if (tempoAtual >= 15 && tempoAtual % 5 === 0) {
            salvarProgressoDB(epIdAtual, tempoAtual, duracaoTotal);
          }
        });

        plyrInstance.on('ended', async () => {
          await deletarProgressoDB(epIdAtual);

          const indexAtualIndex = todosEpisodiosAtuais.findIndex(e => e.id === epIdAtual);
          if (indexAtualIndex !== -1 && indexAtualIndex + 1 < todosEpisodiosAtuais.length) {
            const proximoEp = todosEpisodiosAtuais[indexAtualIndex + 1];

            const novaUrl = `${window.location.pathname}#player?anime=${animeIdAtual}&ep=${proximoEp.id}`;
            window.location.replace(novaUrl);
          }
        });

        plyrInstance.on('enterfullscreen', () => {
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {});
          }
        });

        plyrInstance.on('exitfullscreen', () => {
          if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
          }
        });

      } else {
        plyrInstance.source = {
          type: 'video',
          title: episodioAtual.titulo || '',
          sources: [
            {
              src: episodioAtual.video || '',
              type: 'video/mp4'
            }
          ],
          poster: episodioAtual.thumb || ''
        };

        await restaurarTempoSalvo();
      }

      setTimeout(() => {
        if (plyrInstance) {
          plyrInstance.play().catch(e => console.log("Autoplay bloqueado pelo navegador:", e));
        }
      }, 200);
    }

    const numTemp = temporadaAtualNome.replace(/\D/g, "").padStart(2, "0") || "01";
    const numEp = String(episodioAtual.index || 1).padStart(2, "0");

    if (metaTag) metaTag.textContent = `${anime.titulo || "Anime"} T${numTemp}E${numEp}`;
    if (tituloEp) tituloEp.textContent = episodioAtual.titulo || "Episódio sem título";
    if (btnVerTodos) btnVerTodos.href = `#info?anime=${animeId}`;

    const indexAtual = todosEpisodios.findIndex(e => e.id === epId);
    const proximosEpisodios = todosEpisodios.slice(indexAtual + 1);

    await renderizarProximos(proximosEpisodios, animeId);

  } catch (erro) {
    console.error("Erro ao carregar dados do player:", erro);
  }
}

async function renderizarProximos(lista, animeId) {
  const container = document.getElementById("player-lista-proximos");
  const template = document.getElementById("modelo-card-player");

  if (!container || !template) return;

  container.innerHTML = "";

  if (!Array.isArray(lista) || lista.length === 0) {
    container.innerHTML = "<p class='badge-tag' style='margin-top: 12px;'>Nenhum episódio seguinte disponível nesta temporada.</p>";
    return;
  }

  const mapaProgresso = await buscarTodoProgressoDB();

  lista.forEach(ep => {
    const clone = template.content.cloneNode(true);

    const img = clone.querySelector(".player-ep-thumb");
    const duracao = clone.querySelector(".player-ep-duration");
    const titulo = clone.querySelector(".player-card-title");
    const card = clone.querySelector(".card-player-ep");

    const containerBarra = clone.querySelector(".barra-progresso-container");
    const preenchimentoBarra = clone.querySelector(".barra-progresso-preenchimento");

    if (img) {
      img.src = ep.thumb || "";
      img.alt = ep.titulo || "Episódio";
    }
    if (duracao) duracao.textContent = ep.duracao || "--min";
    if (titulo) titulo.textContent = ep.titulo || "Episódio";

    if (card) {
      card.style.cursor = "pointer";
      card.addEventListener("click", (e) => {
        e.preventDefault();

        const novaUrl = `${window.location.pathname}#player?anime=${animeId}&ep=${ep.id}`;
        window.location.replace(novaUrl);
      });
    }

    if (mapaProgresso[ep.id]) {
      const dadosEp = mapaProgresso[ep.id];
      if (dadosEp.total > 0 && dadosEp.tempo > 0) {
        const porcentagem = (dadosEp.tempo / dadosEp.total) * 100;
        
        if (containerBarra && preenchimentoBarra) {
          containerBarra.style.display = "block";
          preenchimentoBarra.style.width = `${Math.min(porcentagem, 100)}%`;
        }
      }
    }

    container.appendChild(clone);
  });
}
