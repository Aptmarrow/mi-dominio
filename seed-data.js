/**
 * GensokyoSeedData - Base de Datos de Búsqueda de GensokyoNet
 * Incluye Sitios Web, Galería de Imágenes Doujin y Vídeos/PVs Animados
 */

const GensokyoSeedData = {
    // Dominios Semilla Base
    domains: {
        "bunbunmaru.news": {
            title: "Bunbunmaru News • 東方文々々新報",
            author: "Aya Shameimaru (射命丸 文)",
            category: "Noticias",
            snippet: "El periódico de mayor tirada en Gensokyo. Noticias exclusivas, fotos sensacionalistas y crónicas del Templo Hakurei por Aya Shameimaru.",
            content: `
                <div class="bunbunmaru-hero">
                    <h1 class="bunbunmaru-title">東方文々々新報 • Bunbunmaru News</h1>
                    <p class="bunbunmaru-tagline">"Información a la velocidad del viento del Tengu" — Aya Shameimaru</p>
                    <img src="assets/bunbunmaru_header.png" style="width:100%; max-height:240px; object-fit:cover; border-radius:8px; border:1px solid var(--th-crimson);" alt="Bunbunmaru Header">
                </div>
                <div class="bunbunmaru-grid">
                    <article class="news-article-card">
                        <div class="article-date">Noticia de Última Hora • Cerezos en Flor</div>
                        <h3 class="article-title">¿Incidentes en el Templo Hakurei?</h3>
                        <p class="article-body">Reimu Hakurei fue vista descansando mientras el viento primaveral soplaba pétalos sobre la barrera. El periódico Bunbunmaru investiga posibles apariciones de yōkai.</p>
                    </article>
                    <article class="news-article-card">
                        <div class="article-date">Crónica de Marisa Kirisame</div>
                        <h3 class="article-title">Experimentos Mágicos en el Bosque</h3>
                        <p class="article-body">Marisa reporta nuevos hallazgos sobre champiñones luminosos y encantamientos de estrellas en el Bosque de la Magia.</p>
                    </article>
                </div>
            `
        },
        "reimu.shrine": {
            title: "Templo Hakurei • 博麗神社",
            author: "Reimu Hakurei (博麗 霊夢)",
            category: "Templo",
            snippet: "Bitácora oficial del Templo Hakurei. Estado de la Barrera Hakurei, caja de ofrendas para mantener el servidor online y té verde diario.",
            content: `
                <div class="th-card">
                    <div class="th-card-header">
                        <h1 class="th-card-title">博麗神社 • Templo Hakurei</h1>
                        <span class="th-badge">Oficial</span>
                    </div>
                    <img src="assets/gensokyo_banner.png" style="width:100%; max-height:220px; object-fit:cover; border-radius:8px; margin-bottom:16px; border:1px solid var(--th-crimson);" alt="Templo Hakurei">
                    <p style="font-size:1.05rem; line-height:1.6; margin-bottom:16px;">
                        Bienvenido al <strong>Templo Hakurei</strong>, el límite sagrado entre Gensokyo y el Mundo Exterior. 
                        Reimu Hakurei mantiene la tranquilidad de la comunidad.
                    </p>
                    <div style="background: var(--th-bg-main); padding: 16px; border-radius: 8px; border: 1px solid var(--th-border-warm);">
                        <h3 style="color: var(--th-crimson); margin-bottom: 8px;">Estado de la Barrera: <strong>100% Estable</strong></h3>
                        <p style="font-size: 0.9rem;">Las donaciones recaudadas apoyan el servidor anual de la red ($17 USD/año).</p>
                    </div>
                </div>
            `
        }
    },

    // Catálogo de Búsqueda de Imágenes Doujin
    images: [
        {
            id: "img-1",
            title: "Templo Hakurei en Primavera",
            author: "Arte Doujin de la Comunidad",
            domain: "reimu.shrine",
            url: "assets/gensokyo_banner.png",
            tags: ["reimu", "templo", "hakurei", "cerezos", "primavera"]
        },
        {
            id: "img-2",
            title: "Prensa Tengu de Aya Shameimaru",
            author: "Bunbunmaru Press",
            domain: "bunbunmaru.news",
            url: "assets/bunbunmaru_header.png",
            tags: ["aya", "shameimaru", "tengu", "noticias", "bunbunmaru"]
        },
        {
            id: "img-3",
            title: "Spell Card Vault de Flandre Scarlet",
            author: "Mansión Scarlet",
            domain: "flandre.vault",
            url: "assets/fangame_vault_cover.png",
            tags: ["flandre", "scarlet", "vampira", "spellcard", "juegos"]
        },
        {
            id: "img-4",
            title: "Niebla Roja de Koumakyou (TH06)",
            author: "ZUN Classic Art",
            domain: "touhou6.koumakyou",
            url: "assets/scarlet_mist_bg.png",
            tags: ["scarlet", "mist", "koumakyou", "remilia", "touhou6", "niebla"]
        },
        {
            id: "img-5",
            title: "Noche de Cerezos en Hakugyokurou (TH07)",
            author: "Yuyuko Netherworld Art",
            domain: "hakugyokurou.pcb",
            url: "assets/hakugyokurou_bg.png",
            tags: ["hakugyokurou", "yuyuko", "pcb", "cerezos", "touhou7", "inframundo"]
        }
    ],

    // Catálogo de Vídeos / Doujin PVs Animados
    videos: [
        {
            id: "vid-1",
            title: "Bad Apple!! feat. nomico (Official Doujin PV)",
            author: "Alstroemeria Records / Shadow Animation",
            duration: "3:39",
            domain: "badapple.pv",
            thumbnail: "assets/gensokyo_banner.png",
            embedUrl: "https://www.youtube.com/embed/FtutLA63Cp8",
            description: "El icónico vídeo musical animado en sombras de la serie Touhou Project (Alstroemeria Records).",
            tags: ["bad apple", "pv", "animacion", "musica", "video", "alstroemeria"]
        },
        {
            id: "vid-2",
            title: "Night of Nights (Koumakyou Sakuya Theme Arrange)",
            author: "COOL&CREATE / BeatMARIO",
            duration: "3:15",
            domain: "nightofnights.pv",
            thumbnail: "assets/bunbunmaru_header.png",
            embedUrl: "https://www.youtube.com/embed/vS_a8Edde8k",
            description: "Tema dinámico de Sakuya Izayoi arrange por COOL&CREATE en el concierto Touhou Doujin Live.",
            tags: ["night of nights", "sakuya", "cool create", "musica", "pv", "video"]
        },
        {
            id: "vid-3",
            title: "Cirno's Perfect Math Class (チルノのパーフェクトさんすう教室)",
            author: "IOSYS / Doujin Animation",
            duration: "4:05",
            domain: "cirno.math",
            thumbnail: "assets/fangame_vault_cover.png",
            embedUrl: "https://www.youtube.com/embed/5wFDWP5Jwac",
            description: "La famosa canción y baile animado de Cirno en la clase de matemáticas perfecta de IOSYS.",
            tags: ["cirno", "iosys", "baka", "math", "pv", "video", "animacion"]
        }
    ]
};
