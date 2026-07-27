export async function carregarNovosEpisodios() {
    const grade = document.getElementById("grade-novos-episodios"); //[cite: 2]
    const modelo = document.getElementById("modelo-card-anime"); //[cite: 2]

    if (!grade || !modelo) return; //[cite: 2]

    try {
        const [resNovos, resInfo] = await Promise.all([
            fetch("./dados/novos_episodios.json"), //[cite: 2]
            fetch("./dados/info.json") //[cite: 2]
        ]);

        if (!resNovos.ok || !resInfo.ok) return; //[cite: 2]

        const listaNovos = await resNovos.json(); //[cite: 2]
        const infoCompleta = await resInfo.json(); //[cite: 2]

        grade.innerHTML = ""; //[cite: 2]

        listaNovos.forEach(item => { //[cite: 2]
            const anime = infoCompleta[item.animeId]; //[cite: 2]
            if (!anime) return; //[cite: 2]

            let epEncontrado = null; //[cite: 2]
            if (Array.isArray(anime.temporadas)) { //[cite: 2]
                for (const temp of anime.temporadas) { //[cite: 2]
                    const ep = temp.episodios?.find(e => e.id === item.epId); //[cite: 2]
                    if (ep) { //[cite: 2]
                        epEncontrado = ep; //[cite: 2]
                        break; //[cite: 2]
                    }
                }
            }

            if (!epEncontrado) return; //[cite: 2]

            const clone = modelo.content.cloneNode(true); //[cite: 2]
            const linkCard = clone.querySelector("a"); //[cite: 2]
            const imgCard = clone.querySelector("img"); //[cite: 2]
            const tituloCard = clone.querySelector(".card-title"); //[cite: 2]

            if (linkCard && imgCard && tituloCard) { //[cite: 2]
                // 🔄 TROCA A CLASSE: Remove 'poster' e adiciona 'horizontal'
                linkCard.classList.remove("poster"); //[cite: 2]
                linkCard.classList.add("horizontal"); //[cite: 2]

                // Link direto para o player
                linkCard.href = `#player?anime=${encodeURIComponent(item.animeId)}&ep=${encodeURIComponent(item.epId)}`; //[cite: 2]
                
                // Imagem de thumb da tela ou do anime
                imgCard.src = epEncontrado.thumb || anime.banner || anime.poster || ""; //[cite: 2]
                imgCard.alt = epEncontrado.titulo; //[cite: 2]

                // Título (Apenas o nome do episódio)
                tituloCard.textContent = epEncontrado.titulo; //[cite: 2]

                grade.appendChild(clone); //[cite: 2]
            }
        });

    } catch (erro) {
        console.error("❌ [Novos Episódios] Falha ao carregar:", erro); //[cite: 2]
    }
}
