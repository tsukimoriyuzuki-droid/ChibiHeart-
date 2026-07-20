let player;

document.addEventListener("DOMContentLoaded", () => {
    // Inicializa o Video.js
    player = videojs('chibi-player', {
        controls: true,
        fluid: true,
        preload: 'auto',
        playbackRates: [0.5, 1, 1.25, 1.5, 2]
    });

    // Escuta a mudança de rota/hash para saber quando o player foi aberto
    window.addEventListener("hashchange", verificarRotaPlayer);
    
    // Verifica também se a página já carregou direto na URL do player
    verificarRotaPlayer();
});

async function verificarRotaPlayer() {
    const rawHash = window.location.hash || "#inicio";
    const [hashAtual, queryString] = rawHash.split("?");

    // Se a rota não for o player, pausa o vídeo (caso estivesse tocando) e sai
    if (hashAtual !== "#player") {
        if (player && !player.paused()) {
            player.pause();
        }
        return;
    }

    // Se entrou na rota #player, pega os parâmetros da URL
    const params = new URLSearchParams(queryString);
    const urlVideo = params.get("video");
    const urlLegenda = params.get("legenda");

    if (!urlVideo) {
        console.warn("⚠️ [Player] Nenhum link de vídeo foi enviado na URL.");
        window.location.hash = "#inicio";
        return;
    }

    console.log("🎬 [Player] Inicializando reprodução automatizada para:", urlVideo);
    
    // Dispara a função de carga, play e tela cheia
    dispararCinema(urlVideo, urlLegenda);
}

function dispararCinema(urlVideo, urlLegenda) {
    if (!player) return;

    // 1. Detecta o tipo do formato
    let tipoVideo = 'video/mp4';
    if (urlVideo.endsWith('.webm')) tipoVideo = 'video/webm';
    if (urlVideo.endsWith('.mkv')) tipoVideo = 'video/x-matroska';

    // 2. Alimenta o player com a nova fonte
    player.src({ type: tipoVideo, src: urlVideo });

    // 3. Limpa as legendas antigas
    const faixasAntigas = player.remoteTextTracks();
    let i = faixasAntigas.length;
    while (i--) {
        player.removeRemoteTextTrack(faixasAntigas[i]);
    }

    // 4. Adiciona a nova legenda se houver
    if (urlLegenda) {
        player.addRemoteTextTrack({
            kind: 'captions',
            src: urlLegenda,
            srclang: 'pt-BR',
            label: 'Português',
            default: true
        }, true);
    }

    // 5. O truque de mestre: Aguarda o player estar pronto com o novo vídeo
    player.ready(() => {
        // Tenta dar o Play
        player.play().then(() => {
            console.log("▶️ [Player] Autoplay iniciado com sucesso.");
            
            // Joga em tela cheia imediatamente após o play iniciar
            setTimeout(() => {
                try {
                    player.requestFullscreen();
                    console.log("📺 [Player] Tela cheia ativada.");
                } catch (erroFs) {
                    console.error("❌ [Player] Erro ao forçar tela cheia:", erroFs);
                }
            }, 300); // Um delay cirúrgico de 300ms para o celular processar a mídia antes do baque do Fullscreen

        }).catch(erroPlay => {
            // Se o navegador do celular ainda assim bloquear o som/play automático
            console.warn("⚠️ [Player] Bloqueio de segurança do navegador detetado. Tentando modo de segurança (Muted)...");
            
            player.muted(true); // Força o mudo para burlar o bloqueio
            player.play().then(() => {
                player.requestFullscreen();
            });
        });
    });
}
