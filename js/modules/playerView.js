// js/modules/playerView.js

import { salvarProgressoDB, buscarProgressoDB, buscarTodoProgressoDB, deletarProgressoDB } from "./db.js";

let plyrInstance = null; // Guarda a instância do Plyr
let todosEpisodiosAtuais = [];
let epIdAtual = null;
let animeIdAtual = null;

/**
 * Auxiliar para gerar ID único do episódio caso não exista no JSON
 */
function makeEpisodeId(animeId, seasonIdx, episodeIdx) {
  const s = String(seasonIdx).padStart(2, '0');
  const e = String(episodeIdx).padStart(2, '0');
  return `${animeId}_s${s}e${e}`;
}

/**
 * Para a reprodução, destrói a instância do Plyr e reseta o elemento <video>.
 */
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

  // Se NÃO estivermos na tela do player, limpa a mídia e encerra
  if (!hash.startsWith("#player")) {
    limparPlayer();
    return;
  }

  // 1. Extrair os parâmetros da URL (?anime=k-on&ep=k-on_s01e01)
  const params = new URLSearchParams(hash.split("?")[1]);
  const animeId = params.get("anime");
  const epId = params.get("ep");

  if (!animeId || !epId) return;

  try {
    // 2. Busca os dados diretamente do arquivo JSON
    const resposta = await fetch("./dados/info.json");
    if (!resposta.ok) throw new Error("Erro ao carregar info.json: " + resposta.status);
    const db = await resposta.json();
    const anime = db[animeId];

    if (!anime) return;

    // 3. Mapear APENAS os episódios da temporada atual do episódio selecionado
    let episodioAtual = null;
    let todosEpisodios = [];
    let temporadaAtualNome = "";

    const temporadas = Array.isArray(anime.temporadas)
      ? anime.temporadas
      : Array.isArray(anime.episodios)
        ? [{ nome: "Temporada Única", episodios: anime.episodios }]
        : [];

    // Primeiro encontra a temporada à qual o episódio pertence
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

    // Se encontrou a temporada correspondente, monta os episódios APENAS dela
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

    // Atualiza referências para os ouvintes globais do Plyr
    todosEpisodiosAtuais = todosEpisodios;
    epIdAtual = epId;
    animeIdAtual = animeId;

    // 4. Elementos da interface
    const videoElement = document.getElementById("player-video");
    const metaTag = document.getElementById("player-meta-tag");
    const tituloEp = document.getElementById("player-titulo-ep");
    const btnVerTodos = document.getElementById("lnk-ver-todos");

    // 5. Gerenciamento do Plyr (Instanciação / Atualização da Source)
    if (videoElement) {
      if (!plyrInstance) {
        videoElement.src = episodioAtual.video || "";
        videoElement.poster = episodioAtual.thumb || "";

        plyrInstance = new Plyr(videoElement, {
          controls: ['play-large', 'play', 'progress', 'current-time', 'fullscreen'],
          tooltips: { controls: true, seek: true },
          autoplay: true
        });

        // 📥 [PROGRES-TRACK] Tenta recuperar o tempo salvo no IndexedDB assim que o Plyr estiver pronto
        plyrInstance.on('ready', async () => {
          const progressoSalvo = await buscarProgressoDB(epIdAtual);
          if (progressoSalvo && progressoSalvo.tempo) {
            plyrInstance.currentTime = progressoSalvo.tempo;
          }
        });

        // 💾 [PROGRES-TRACK] Grava o tempo atualizado no IndexedDB a cada 3 segundos assistidos
        plyrInstance.on('timeupdate', () => {
          const tempoAtual = Math.floor(plyrInstance.currentTime);
          const duracaoTotal = Math.floor(plyrInstance.duration || 0);

          if (tempoAtual > 0 && tempoAtual % 3 === 0) {
            salvarProgressoDB(epIdAtual, tempoAtual, duracaoTotal);
          }
        });

        // REPRODUÇÃO AUTOMÁTICA (limitada à temporada atual)
        plyrInstance.on('ended', async () => {
          // Limpa o registro do IndexedDB pois o episódio foi concluído com sucesso
          await deletarProgressoDB(epIdAtual);

          const indexAtualIndex = todosEpisodiosAtuais.findIndex(e => e.id === epIdAtual);
          if (indexAtualIndex !== -1 && indexAtualIndex + 1 < todosEpisodiosAtuais.length) {
            const proximoEp = todosEpisodiosAtuais[indexAtualIndex + 1];

            // SUBSTITUI O HISTÓRICO: Assim o botão Voltar do celular/ESC volta para a tela de Info
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
        // Se o player já existe, atualiza apenas o objeto de mídia
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

        // 📥 [PROGRES-TRACK] Caso o player já exista e mude a fonte (troca rápida), injeta o tempo de forma assíncrona
        const progressoSalvo = await buscarProgressoDB(epIdAtual);
        if (progressoSalvo && progressoSalvo.tempo) {
          plyrInstance.currentTime = progressoSalvo.tempo;
        }
      }

      plyrInstance.play().catch(e => console.log("Autoplay bloqueado pelo navegador:", e));
    }

    // 6. Atualiza os dados de texto na interface
    const numTemp = temporadaAtualNome.replace(/\D/g, "").padStart(2, "0") || "01";
    const numEp = String(episodioAtual.index || 1).padStart(2, "0");

    if (metaTag) metaTag.textContent = `${anime.titulo || "Anime"} T${numTemp}E${numEp}`;
    if (tituloEp) tituloEp.textContent = episodioAtual.titulo || "Episódio sem título";
    if (btnVerTodos) btnVerTodos.href = `#info?anime=${animeId}`;

    // 7. Renderiza a lista de episódios seguintes (apenas da temporada atual)
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

  // 📂 Coleta todos os registros de progresso salvos no IndexedDB em uma única chamada em lote
  const mapaProgresso = await buscarTodoProgressoDB();

  lista.forEach(ep => {
    const clone = template.content.cloneNode(true);

    const img = clone.querySelector(".player-ep-thumb");
    const duracao = clone.querySelector(".player-ep-duration");
    const titulo = clone.querySelector(".player-card-title");
    const card = clone.querySelector(".card-player-ep");

    // 🟥 Seleciona os elementos da barra de progresso
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

        // SUBSTITUI O HISTÓRICO: Troca manual sem criar histórico empilhado
        const novaUrl = `${window.location.pathname}#player?anime=${animeId}&ep=${ep.id}`;
        window.location.replace(novaUrl);
      });
    }

    // 🎯 [PROGRES-TRACK] Aplica a barra se houver dado correspondente no mapa do IndexedDB
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
