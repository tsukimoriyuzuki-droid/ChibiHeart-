document.addEventListener("DOMContentLoaded", () => {
    const tabItems = document.querySelectorAll(".tab-item");
    const appViews = document.querySelectorAll(".app-view");

    // Função que lê a URL e renderiza a tela correta
    function navegarPeloHash() {
        // 1. Pega o hash bruto (ex: #info?anime=onimai)
        let rawHash = window.location.hash || "#inicio";
        
        // 2. Limpa os parâmetros, pegando só o ID da tela (ex: #info)
        let hashAtual = rawHash.split("?")[0];

        // Verifica se a tela realmente existe no HTML para evitar erros
        const telaAlvo = document.querySelector(hashAtual);

        if (!telaAlvo) {
            hashAtual = "#inicio"; // Se o hash for inválido, força ir para o início
        }

        // 3. Esconde todas as telas e mostra apenas a do hash limpo
        appViews.forEach(view => view.classList.remove("active"));
        document.querySelector(hashAtual).classList.add("active");

        // 4. Atualiza os ícones da Tab Bar (limpa se for #info)
        tabItems.forEach(tab => {
            tab.classList.remove("active");
            // Só acende o ícone se o hash atual bater exatamente com o menu
            if (tab.getAttribute("href") === hashAtual) {
                tab.classList.add("active");
            }
        });

        // 5. Joga o scroll para o topo suavemente
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Escuta a mudança de hash na URL
    window.addEventListener("hashchange", navegarPeloHash);

    // Executa no carregamento inicial da página
    navegarPeloHash();
});
