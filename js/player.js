document.addEventListener('DOMContentLoaded', () => {
    const playerElement = document.getElementById('main-player');
    
    // Inicializa o Video.js
    const player = videojs('main-player', {
        controls: true,
        autoplay: false,
        preload: 'auto',
        responsive: true,
        fluid: true
    });

    // Função para entrar em Fullscreen e Travar a Tela na Horizontal
    async function entrarEmModoPlayer() {
        try {
            // 1. Tenta colocar o contêiner do vídeo em Tela Cheia no navegador
            const container = document.querySelector('.player-container');
            if (container.requestFullscreen) {
                await container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) { /* Safari / iOS */
                await container.webkitRequestFullscreen();
            }

            // 2. Força a rotação da tela do celular para Horizontal (Landscape)
            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock('landscape').catch(() => {
                    // Alguns navegadores exigem interação ativa, ignora se bloqueado
                });
            }
        } catch (err) {
            console.log('Modo Fullscreen automático não suportado ou bloqueado pelo navegador:', err);
        }
    }

    // Função para Sair do Fullscreen
    function sairDoModoPlayer() {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }

        // Destrava a orientação de tela do celular
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
    }

    // Monitora as mudanças de Hash na URL (#player?video=...)
    function tratarTrocaDeRota() {
        const hash = window.location.hash;

        if (hash.startsWith('#player')) {
            const urlParams = new URLSearchParams(hash.split('?')[1]);
            const videoUrl = urlParams.get('video');

            if (videoUrl) {
                player.src({ type: 'video/mp4', src: videoUrl });
                player.ready(() => {
                    player.play().then(() => {
                        entrarEmModoPlayer();
                    }).catch(() => {
                        // Trata políticas de Autoplay com áudio
                        entrarEmModoPlayer();
                    });
                });
            }
        } else {
            // Se o usuário saiu do #player (ex: apertou o voltar do celular)
            player.pause();
            sairDoModoPlayer();
        }
    }

    // Detecta quando o usuário sai do Fullscreen manualmente (ex: gestos do Android)
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && window.location.hash.startsWith('#player')) {
            // Se ele fechou o Fullscreen, redireciona a app para o #inicio
            window.location.hash = '#inicio';
        }
    });

    // Escuta a troca de páginas/rotas da SPA
    window.addEventListener('hashchange', tratarTrocaDeRota);
    tratarTrocaDeRota();
});
