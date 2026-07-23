/**
 * GensokyoNet Seed Data - Intranet Initial Sites
 * Base de datos inicial simulada conectada a la API de espinoza.engineer
 */

const GensokyoSeedData = {
    // Dominios Pre-registrados
    domains: {
        "bunbunmaru.news": {
            title: "Periódico Bunbunmaru • El Diario de Aya Shameimaru",
            author: "Aya Shameimaru (Tengu Press)",
            type: "newspaper",
            category: "Noticias & Doujin",
            updatedAt: "2026-07-21",
            content: `
                <div class="bunbunmaru-hero">
                    <h1 class="bunbunmaru-title">📰 Periódico Bunbunmaru</h1>
                    <p class="bunbunmaru-tagline">"La verdad vuela más rápido que el viento de Gensokyo" — Edición Hispana</p>
                    <p>Bienvenido a la portada oficial de la red <strong>GensokyoNet</strong>. Aquí recopilamos las últimas noticias de ZUN, eventos doujin, fangames hispanos y publicaciones destacadas de los dominios creados por la comunidad.</p>
                </div>

                <h2 style="font-family: var(--font-heading); color: var(--th-gold-bright); margin-bottom: 16px;">🔥 Noticias Destacadas</h2>
                
                <div class="bunbunmaru-grid">
                    <article class="news-article-card">
                        <div class="article-date">21 de Julio, 2026 • Por Aya Shameimaru</div>
                        <h3 class="article-title">⛩️ ¡La Barrera Hakurei Abre la Intranet GensokyoNet!</h3>
                        <p class="article-body">
                            La red descentralizada para fans de Touhou ha iniciado operaciones bajo la infraestructura de <code>espinoza.engineer</code>. Ahora cualquier artista, programador o fan puede reclamar su propio dominio <code>gensokyo://tu-alias</code> de forma 100% gratuita.
                        </p>
                    </article>

                    <article class="news-article-card">
                        <div class="article-date">19 de Julio, 2026 • Por Aya Shameimaru</div>
                        <h3 class="article-title">🎮 Nuevo Búnker de Fangames (.exe) Disponible</h3>
                        <p class="article-body">
                            Visita <code>gensokyo://fangames.vault</code> para explorar y descargar fangames, remakes 3D, utilidades de replays (.rpy) y mods desarrollados por la comunidad hispana. ¡Sube tu propio ejecutable gratis!
                        </p>
                    </article>

                    <article class="news-article-card">
                        <div class="article-date">15 de Julio, 2026 • Por Reimu Hakurei</div>
                        <h3 class="article-title">💰 Meta Anual de Mantenimiento de la Barrera ($17 USD)</h3>
                        <p class="article-body">
                            Para mantener el dominio base renovado por un año completo, el templo ha abierto la caja de ofrendas. Con solo $17 USD al año recaudados entre donaciones comunitarias, la intranet se mantendrá activa sin muros de pago.
                        </p>
                    </article>
                </div>

                <div class="th-card" style="margin-top: 30px;">
                    <div class="th-card-header">
                        <h3 class="th-card-title">🌸 Dominios Recientes en la Red</h3>
                    </div>
                    <ul style="list-style: none; line-height: 2;">
                        <li>⛩️ <a href="#" onclick="GensokyoApp.navigate('gensokyo://reimu.shrine')" style="color: var(--th-gold-bright);">gensokyo://reimu.shrine</a> — Bitácora del Templo Hakurei & Caja de Donaciones</li>
                        <li>❄️ <a href="#" onclick="GensokyoApp.navigate('gensokyo://cirno.blog')" style="color: var(--th-gold-bright);">gensokyo://cirno.blog</a> — El Blog de Cirno (¡La más fuerte!)</li>
                        <li>🧹 <a href="#" onclick="GensokyoApp.navigate('gensokyo://marisa.magic')" style="color: var(--th-gold-bright);">gensokyo://marisa.magic</a> — Taller de Magia & Mini-Hakkero</li>
                        <li>🎮 <a href="#" onclick="GensokyoApp.navigate('gensokyo://fangames.vault')" style="color: var(--th-gold-bright);">gensokyo://fangames.vault</a> — Catálogo de Ejecutables & Descargas</li>
                    </ul>
                </div>
            `
        },

        "reimu.shrine": {
            title: "Templo Hakurei • Bitácora Oficial de Reimu",
            author: "Reimu Hakurei",
            type: "blog",
            category: "Oficial & Lore",
            updatedAt: "2026-07-20",
            content: `
                <div class="th-card">
                    <div class="th-card-header">
                        <h1 class="th-card-title">⛩️ Templo Hakurei (博麗神社)</h1>
                        <span class="th-badge">Verificado</span>
                    </div>
                    <p style="font-size: 1.05rem; line-height: 1.6; margin-bottom: 20px;">
                        Bienvenido al Templo Hakurei. Este rincón está dedicado a supervisar la paz en Gensokyo y asegurar que las conexiones del "Mundo Exterior" sigan bloqueadas de manera segura.
                    </p>
                    
                    <h3 style="font-family: var(--font-heading); color: var(--th-gold-bright); margin-bottom: 12px;">🍵 Registro del Templo</h3>
                    <p style="margin-bottom: 16px; color: var(--th-text-muted);">
                        "Hoy tampoco vinieron muchos creyentes a dejar donaciones, pero Marisa vino a beber mi té verde. La red GensokyoNet funciona de maravilla para mantener a los yokai ocupados escribiendo sus blogs en vez de causar incidentes."
                    </p>

                    <div style="background: rgba(153, 0, 0, 0.2); border: 1px solid var(--th-red-bright); padding: 16px; border-radius: 8px;">
                        <h4 style="color: var(--th-gold-bright); margin-bottom: 6px;">🏮 ¿Quieres contribuir a la caja de donaciones?</h4>
                        <p style="font-size: 0.9rem; margin-bottom: 10px;">Tu apoyo cubre el dominio <code>espinoza.engineer</code> para que toda la comunidad disfrute de dominios gratis.</p>
                        <button class="th-btn-donate" onclick="GensokyoApp.showDonationModal()">❤️ Donar al Templo</button>
                    </div>
                </div>
            `
        },

        "cirno.blog": {
            title: "⑨ El Blog de Cirno • ¡La Más Fuerte de Gensokyo!",
            author: "Cirno ⑨",
            type: "blog",
            category: "Hadas & Hielo",
            updatedAt: "2026-07-21",
            content: `
                <div class="th-card" style="border-color: #00bcd4;">
                    <div class="th-card-header">
                        <h1 class="th-card-title" style="color: #80deea;">❄️ El Sitio Oficial de Cirno ⑨</h1>
                        <span class="th-badge" style="border-color: #00bcd4; color: #80deea;">¡Nivel 9 de Poder!</span>
                    </div>
                    
                    <p style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 20px; color: #e0f7fa;">
                        ¡SOY LA MÁS FUERTE DE TODO GENSOKYO Y NINGUNA OTRA HADA PUEDE SUPERAR MI NAVEGADOR! ❄️❄️❄️
                    </p>

                    <h3 style="font-family: var(--font-heading); color: #80deea; margin-bottom: 12px;">⑨ Razones por las que soy la mejor:</h3>
                    <ol style="margin-left: 20px; line-height: 1.8; color: var(--th-text-main);">
                        <li>Puedo congelar las ranas del estanque al instante.</li>
                        <li>Mi dominio <code>gensokyo://cirno.blog</code> es el más helado de la red.</li>
                        <li>En los exámenes de Daiyousei siempre saco un 9 perfecto.</li>
                        <li>Mi Spell Card <em>"Perfect Freeze"</em> congelará tu pantalla si no me das me gusta.</li>
                    </ol>
                </div>
            `
        },

        "marisa.magic": {
            title: "🧹 Taller de Magia de Marisa Kirisame",
            author: "Marisa Kirisame",
            type: "blog",
            category: "Magia & Artículos",
            updatedAt: "2026-07-18",
            content: `
                <div class="th-card">
                    <div class="th-card-header">
                        <h1 class="th-card-title" style="color: var(--th-gold-bright);">🧹 Marisa's Magic Shop & Research</h1>
                        <span class="th-badge">Ordinary Magician</span>
                    </div>
                    <p style="font-size: 1rem; line-height: 1.6; margin-bottom: 16px;">
                        ¡Ze~! Bienvenido a mi rincón en el bosque de la magia. Aquí comparto experimentos con el Mini-Hakkero, notas de hechizos y colecciones de libros (prestados de la biblioteca Scarlet por tiempo indefinido, ze~).
                    </p>

                    <h3 style="font-family: var(--font-heading); color: var(--th-gold-bright); margin-bottom: 10px;">🌟 Master Spark Generator</h3>
                    <p style="color: var(--th-text-muted); font-size: 0.9rem;">
                        Receta mágica: 1x Mini-Hakkero, 3x Hongos del Bosque, y un torrente de energía estelar pura.
                    </p>
                </div>
            `
        },

        "fangames.vault": {
            title: "🎮 Búnker de Fangames & Archivos (.exe) de Touhou",
            author: "Comunidad GensokyoNet",
            type: "vault",
            category: "Descargas",
            updatedAt: "2026-07-21",
            content: `
                <div class="bunbunmaru-hero" style="background: linear-gradient(135deg, rgba(30, 10, 45, 0.9) 0%, rgba(139, 0, 0, 0.5) 100%);">
                    <h1 class="bunbunmaru-title">🎮 Búnker de Fangames & Ejecutables (.exe)</h1>
                    <p class="bunbunmaru-tagline">Descarga libre de fangames, mods, replays .rpy y herramientas creadas por la comunidad de Touhou.</p>
                </div>

                <div class="fangame-grid">
                    <!-- Game 1 -->
                    <div class="fangame-card">
                        <div class="fangame-cover" style="background-image: radial-gradient(circle, rgba(153, 0, 0, 0.6), rgba(0, 0, 0, 0.9));">
                            <div class="fangame-cover-overlay"></div>
                            <h3 class="fangame-title">Touhou 6 3D Danmaku Remake</h3>
                        </div>
                        <div class="fangame-content">
                            <div>
                                <div class="fangame-meta">
                                    <span class="tag-badge">Fangame 3D</span>
                                    <span class="tag-badge">Windows .exe</span>
                                    <span class="tag-badge">v1.2.0</span>
                                </div>
                                <p class="fangame-desc">
                                    Recreación en Unreal Engine 5 de la batalla de Boss contra Flandre Scarlet y Remilia Scarlet con cámara libre y efectos visuales de Spell Cards HD.
                                </p>
                            </div>
                            <div>
                                <div class="fangame-specs">
                                    💾 Tamaño: 480 MB • Windows 10/11 (64-bit) • DX12
                                </div>
                                <a href="#" onclick="alert('Iniciando descarga segura de Touhou6_3DRemake_v1.2.zip (Simulada)...')" class="btn-download-exe">
                                    ⬇️ Descargar Archivo (.exe)
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- Game 2 -->
                    <div class="fangame-card">
                        <div class="fangame-cover" style="background-image: radial-gradient(circle, rgba(0, 150, 136, 0.6), rgba(0, 0, 0, 0.9));">
                            <div class="fangame-cover-overlay"></div>
                            <h3 class="fangame-title">Koumajou Densetsu: Scarlet Edition</h3>
                        </div>
                        <div class="fangame-content">
                            <div>
                                <div class="fangame-meta">
                                    <span class="tag-badge">Plataformas 2D</span>
                                    <span class="tag-badge">Castlevania Style</span>
                                    <span class="tag-badge">v2.0.4</span>
                                </div>
                                <p class="fangame-desc">
                                    Acción plataformas al estilo Castlevania donde controlas a Reimu Hakurei investigando la bruma carmesí de la Mansión Scarlet.
                                </p>
                            </div>
                            <div>
                                <div class="fangame-specs">
                                    💾 Tamaño: 120 MB • Portátil .zip / .exe • Mandos Soportados
                                </div>
                                <a href="#" onclick="alert('Iniciando descarga segura de Koumajou_ScarletEdition.zip (Simulada)...')" class="btn-download-exe">
                                    ⬇️ Descargar Archivo (.exe)
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- Game 3 -->
                    <div class="fangame-card">
                        <div class="fangame-cover" style="background-image: radial-gradient(circle, rgba(156, 39, 176, 0.6), rgba(0, 0, 0, 0.9));">
                            <div class="fangame-cover-overlay"></div>
                            <h3 class="fangame-title">Gensokyo Replay Analyzer & Mod tool</h3>
                        </div>
                        <div class="fangame-content">
                            <div>
                                <div class="fangame-meta">
                                    <span class="tag-badge">Herramienta</span>
                                    <span class="tag-badge">Replays .rpy</span>
                                    <span class="tag-badge">Open Source</span>
                                </div>
                                <p class="fangame-desc">
                                    Analizador de archivos de partida (.rpy) para Touhou 6, 7, 8 y 9. Muestra hitboxes, conteo de graze, frames y métricas de captura de Spell Cards.
                                </p>
                            </div>
                            <div>
                                <div class="fangame-specs">
                                    💾 Tamaño: 15 MB • C# (.NET Core) • Funciona offline
                                </div>
                                <a href="#" onclick="alert('Iniciando descarga segura de TouhouReplayAnalyzer.zip (Simulada)...')" class="btn-download-exe">
                                    ⬇️ Descargar Herramienta (.exe)
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `
        },

        "search": {
            title: "🔍 Buscador Gensokyo • El Motor de Búsqueda de la Intranet",
            author: "GensokyoNet Indexer",
            type: "search",
            category: "Utilidades",
            updatedAt: "2026-07-21",
            content: `
                <div class="th-card" style="text-align: center; padding: 40px 20px;">
                    <h1 style="font-family: var(--font-heading); font-size: 2.2rem; color: var(--th-gold-bright); margin-bottom: 12px;">
                        🔍 Buscador de Gensokyo
                    </h1>
                    <p style="color: var(--th-text-muted); margin-bottom: 24px;">
                        Explora todos los dominios <code>gensokyo://</code> creados por la comunidad dentro de la intranet.
                    </p>

                    <div style="max-width: 600px; margin: 0 auto 30px auto; display: flex; gap: 10px;">
                        <input type="text" id="th-search-query" class="th-form-input" placeholder="Escribe palabras clave (ej: Reimu, Cirno, fangames, magia)..." style="font-size: 1rem;">
                        <button class="btn-th-submit" onclick="GensokyoApp.performSearch()">Buscar 🔎</button>
                    </div>

                    <div id="th-search-results" style="text-align: left; max-width: 750px; margin: 0 auto;">
                        <!-- Results dynamically inserted -->
                    </div>
                </div>
            `
        }
    }
};
