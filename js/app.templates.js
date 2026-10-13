/**
 * GensokyoTemplates - Plantillas Reales Multi-Archivo para el Creador Web
 * Proporciona proyectos completos (HTML + CSS + JS) listos para usar,
 * probar el detector de tecnologías y desplegar inmediatamente.
 */

const GensokyoTemplates = {
    templates: {
        'danmaku-game': {
            name: 'Mini-Juego Danmaku (Canvas 2D + Web Audio)',
            description: 'Juego danmaku completo en HTML5 Canvas con bucle a 60fps, oleadas de balas mágicas, graze, partículas y efectos de sonido por Web Audio.',
            files: {
                'index.html': `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Starlight Danmaku • 東方弾幕</title>
    <link rel="stylesheet" href="css/game.css">
</head>
<body>
    <div class="game-container">
        <header class="game-header">
            <h1>東方弾幕 • STARLIGHT DANMAKU</h1>
            <div class="hud-bar">
                <span>PUNTOS: <strong id="score">0</strong></span>
                <span>VIDAS: <strong id="lives">❤️❤️❤️</strong></span>
                <span>GRAZE: <strong id="graze">0</strong></span>
            </div>
        </header>

        <div class="canvas-wrapper">
            <canvas id="gameCanvas" width="480" height="600"></canvas>
            <div id="gameOverlay" class="overlay">
                <h2>SPELL CARD READY</h2>
                <p>Usa <strong>FLECHAS / WASD</strong> para moverte</p>
                <p>Presiona <strong>Z / ESPACIO</strong> para disparar</p>
                <p>Mantén <strong>SHIFT</strong> para modo foco (precisión)</p>
                <button id="startBtn" class="btn-play">¡Comenzar Partida!</button>
            </div>
        </div>

        <footer class="game-footer">
            <p>Creado en el Creador Web de GensokyoNet • HTML5 Canvas + Web Audio API</p>
        </footer>
    </div>
    <script src="js/game.js"></script>
</body>
</html>`,
                'css/game.css': `/* Estilos de Starlight Danmaku Arcade */
:root {
    --bg-dark: #120206;
    --th-crimson: #a61b32;
    --th-gold: #ffd700;
    --th-cyan: #00e5ff;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
    background: var(--bg-dark);
    color: #ffffff;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 16px;
}

.game-container {
    background: #1c050c;
    border: 2px solid var(--th-crimson);
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 8px 32px rgba(166, 27, 50, 0.4);
    text-align: center;
}

.game-header h1 {
    font-size: 1.3rem;
    color: var(--th-gold);
    letter-spacing: 1px;
    margin-bottom: 8px;
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}

.hud-bar {
    display: flex;
    justify-content: space-around;
    background: #2a0812;
    padding: 8px 12px;
    border-radius: 6px;
    margin-bottom: 12px;
    font-weight: bold;
    border: 1px solid var(--th-crimson);
}

.canvas-wrapper {
    position: relative;
    display: inline-block;
    border: 2px solid var(--th-gold);
    border-radius: 8px;
    overflow: hidden;
    background: #080003;
}

#gameCanvas {
    display: block;
    background: radial-gradient(circle at center, #1f030c 0%, #050002 100%);
}

.overlay {
    position: absolute;
    inset: 0;
    background: rgba(10, 0, 4, 0.88);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    backdrop-filter: blur(4px);
}

.overlay h2 {
    color: var(--th-gold);
    margin-bottom: 14px;
    font-size: 1.6rem;
}

.overlay p {
    margin: 4px 0;
    color: #e0d0d5;
    font-size: 0.95rem;
}

.btn-play {
    margin-top: 18px;
    background: var(--th-crimson);
    color: #ffffff;
    border: none;
    padding: 12px 28px;
    font-size: 1.1rem;
    font-weight: bold;
    border-radius: 25px;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(166, 27, 50, 0.6);
    transition: transform 0.2s, background 0.2s;
}

.btn-play:hover {
    transform: scale(1.05);
    background: #c62828;
}

.game-footer {
    margin-top: 12px;
    font-size: 0.75rem;
    color: #8c7078;
}`,
                'js/game.js': `// Motor de Danmaku en Canvas 2D + Sintetizador Web Audio
(function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const livesEl = document.getElementById('lives');
    const grazeEl = document.getElementById('graze');
    const overlay = document.getElementById('gameOverlay');
    const startBtn = document.getElementById('startBtn');

    // Sintetizador Web Audio
    let audioCtx = null;
    function playBeep(freq, type, duration) {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type || 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch(e) {}
    }

    let running = false;
    let score = 0;
    let lives = 3;
    let graze = 0;
    let frame = 0;

    const keys = {};
    window.addEventListener('keydown', e => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === ' ' || e.key === 'z') e.preventDefault();
    });
    window.addEventListener('keyup', e => {
        keys[e.key.toLowerCase()] = false;
    });

    const player = {
        x: canvas.width / 2,
        y: canvas.height - 80,
        radius: 4,
        speed: 4.5,
        focusSpeed: 2.2
    };

    let bullets = [];
    let enemyBullets = [];
    let particles = [];
    let boss = { x: canvas.width / 2, y: 100, angle: 0, hp: 100 };

    function shootPlayer() {
        bullets.push({ x: player.x - 8, y: player.y - 10, vy: -10 });
        bullets.push({ x: player.x + 8, y: player.y - 10, vy: -10 });
        playBeep(780, 'square', 0.05);
    }

    function spawnBossBullets() {
        const ringCount = 12;
        const speed = 2.4;
        boss.angle += 0.12;

        for (let i = 0; i < ringCount; i++) {
            const a = boss.angle + (i * (Math.PI * 2 / ringCount));
            enemyBullets.push({
                x: boss.x,
                y: boss.y,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed,
                color: i % 2 === 0 ? '#ff1744' : '#00e5ff',
                radius: 4,
                grazed: false
            });
        }
        playBeep(320, 'triangle', 0.04);
    }

    function addExplosion(x, y, color) {
        for (let i = 0; i < 16; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 4 + 1;
            particles.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 25,
                color: color || '#ffd700'
            });
        }
    }

    function update() {
        if (!running) return;
        frame++;

        const isFocus = keys['shift'];
        const spd = isFocus ? player.focusSpeed : player.speed;

        if (keys['arrowleft'] || keys['a']) player.x -= spd;
        if (keys['arrowright'] || keys['d']) player.x += spd;
        if (keys['arrowup'] || keys['w']) player.y -= spd;
        if (keys['arrowdown'] || keys['s']) player.y += spd;

        player.x = Math.max(16, Math.min(canvas.width - 16, player.x));
        player.y = Math.max(20, Math.min(canvas.height - 20, player.y));

        if ((keys[' '] || keys['z']) && frame % 6 === 0) {
            shootPlayer();
        }

        // Movimiento del Boss
        boss.x = canvas.width / 2 + Math.sin(frame * 0.02) * 140;
        if (frame % 28 === 0) spawnBossBullets();

        // Balas del jugador
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            b.y += b.vy;
            if (b.y < -10) bullets.splice(i, 1);
            else if (Math.hypot(b.x - boss.x, b.y - boss.y) < 28) {
                bullets.splice(i, 1);
                score += 100;
                addExplosion(b.x, b.y, '#ffd700');
            }
        }

        // Balas enemigas
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const eb = enemyBullets[i];
            eb.x += eb.vx;
            eb.y += eb.vy;

            // Graze
            const dist = Math.hypot(eb.x - player.x, eb.y - player.y);
            if (!eb.grazed && dist < 18 && dist > player.radius) {
                eb.grazed = true;
                graze++;
                score += 50;
                playBeep(920, 'sine', 0.02);
            }

            // Colisión con jugador
            if (dist < player.radius + eb.radius) {
                enemyBullets.splice(i, 1);
                lives--;
                addExplosion(player.x, player.y, '#ff1744');
                playBeep(180, 'sawtooth', 0.3);
                if (lives <= 0) {
                    gameOver();
                    return;
                }
                continue;
            }

            if (eb.x < -10 || eb.x > canvas.width + 10 || eb.y < -10 || eb.y > canvas.height + 10) {
                enemyBullets.splice(i, 1);
            }
        }

        // Partículas
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) particles.splice(i, 1);
        }

        scoreEl.innerText = score;
        grazeEl.innerText = graze;
        livesEl.innerText = '❤️'.repeat(Math.max(0, lives));
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Estrellas de fondo animadas
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        for (let i = 0; i < 20; i++) {
            const sx = (i * 47 + frame * 0.5) % canvas.width;
            const sy = (i * 91 + frame * 1.5) % canvas.height;
            ctx.fillRect(sx, sy, 1.5, 1.5);
        }

        // Boss
        ctx.fillStyle = '#ff1744';
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Balas del jugador
        ctx.fillStyle = '#00e5ff';
        bullets.forEach(b => {
            ctx.fillRect(b.x - 2, b.y - 8, 4, 16);
        });

        // Balas enemigas
        enemyBullets.forEach(eb => {
            ctx.fillStyle = eb.color;
            ctx.beginPath();
            ctx.arc(eb.x, eb.y, eb.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        // Partículas
        particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 2.5, 2.5);
        });

        // Jugador
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(player.x, player.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#a61b32';
        ctx.beginPath();
        ctx.arc(player.x, player.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Hitbox visible en foco
        if (keys['shift']) {
            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
        }
    }

    function loop() {
        update();
        draw();
        if (running) requestAnimationFrame(loop);
    }

    function gameOver() {
        running = false;
        overlay.style.display = 'flex';
        overlay.querySelector('h2').innerText = 'GAME OVER';
        startBtn.innerText = 'Reintentar Partida';
    }

    startBtn.addEventListener('click', () => {
        score = 0;
        lives = 3;
        graze = 0;
        bullets = [];
        enemyBullets = [];
        particles = [];
        player.x = canvas.width / 2;
        player.y = canvas.height - 80;
        overlay.style.display = 'none';
        running = true;
        loop();
    });
})();`
            }
        },

        'shrine-blog': {
            name: 'Bitácora Doujin del Templo (Blog Responsive + CSS3)',
            description: 'Sitio web doujin multi-archivo con estética japonesa tradicional, diseño responsive en CSS Grid/Flexbox, artículos y libro de visitas interactivo.',
            files: {
                'index.html': `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>博麗神社日誌 • Bitácora del Templo Hakurei</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header class="shrine-header">
        <div class="header-inner">
            <h1 class="shrine-title">博麗神社日誌</h1>
            <p class="shrine-subtitle">Crónicas oficiales y novedades en la frontera de Gensokyo</p>
            <nav class="shrine-nav">
                <a href="#articulos" class="active">Crónicas</a>
                <a href="#visitas">Libro de Visitas</a>
                <a href="#acerca">Sobre el Templo</a>
            </nav>
        </div>
    </header>

    <main class="shrine-container">
        <section class="main-column" id="articulos">
            <article class="article-card">
                <div class="article-meta">13 de Octubre • Reimu Hakurei</div>
                <h2>El susurro de los cerezos en otoño</h2>
                <p>Las hojas del gran cerezo del templo comenzaron a descender suavemente sobre el camino de piedra. Marisa pasó esta mañana con una cesta de champiñones luminosos recolectados en el Bosque de la Magia.</p>
                <div class="article-actions">
                    <button class="btn-like" onclick="ShrineApp.likeArticle(this)">Me gusta (<span class="like-count">14</span>)</button>
                </div>
            </article>

            <article class="article-card">
                <div class="article-meta">08 de Octubre • Sanae Kochiya</div>
                <h2>Festival del Viento y los Dioses</h2>
                <p>La montaña Youkai prepara las festividades para la próxima estación. La armonía entre los clanes mantiene la paz en la región.</p>
                <div class="article-actions">
                    <button class="btn-like" onclick="ShrineApp.likeArticle(this)">Me gusta (<span class="like-count">9</span>)</button>
                </div>
            </article>

            <section class="guestbook-section" id="visitas">
                <h3>Libro de Visitas del Templo</h3>
                <form id="commentForm" onsubmit="ShrineApp.addComment(event)">
                    <input type="text" id="commentAuthor" placeholder="Tu nombre..." required>
                    <textarea id="commentText" placeholder="Deja un saludo o mensaje para Reimu..." rows="3" required></textarea>
                    <button type="submit" class="btn-submit">Publicar en el Libro</button>
                </form>
                <div id="commentsList" class="comments-list"></div>
            </section>
        </section>

        <aside class="sidebar-column" id="acerca">
            <div class="widget-card">
                <h3>Estado del Servidor</h3>
                <p>Red de dominios activos en GensokyoNet.</p>
                <div class="barrier-meter">
                    <div class="barrier-fill" style="width: 99%;">99% En Línea</div>
                </div>
            </div>

            <div class="widget-card">
                <h3>Clima en Gensokyo</h3>
                <p>Cielo despejado, vientos suaves del tengu.</p>
            </div>
        </aside>
    </main>

    <footer class="shrine-footer">
        <p>GensokyoNet Doujin Portal • Creado con HTML5 & CSS3</p>
    </footer>

    <script src="js/blog.js"></script>
</body>
</html>`,
                'css/style.css': `/* Estilos de la Bitácora del Templo */
:root {
    --th-crimson: #a61b32;
    --th-crimson-dark: #7a1222;
    --th-gold: #c59b27;
    --th-paper: #fcf9f2;
    --th-card: #ffffff;
    --th-border: #e6dac6;
    --th-text: #2c211c;
    --th-sub: #6c5a52;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
    background-color: var(--th-paper);
    color: var(--th-text);
    font-family: 'Segoe UI', serif;
    line-height: 1.6;
}

.shrine-header {
    background: linear-gradient(135deg, var(--th-crimson-dark) 0%, var(--th-crimson) 100%);
    color: #ffffff;
    padding: 36px 20px 24px;
    text-align: center;
    border-bottom: 4px solid var(--th-gold);
}

.shrine-title {
    font-size: 2.2rem;
    letter-spacing: 2px;
    margin-bottom: 6px;
}

.shrine-subtitle {
    font-size: 1rem;
    opacity: 0.9;
    margin-bottom: 20px;
}

.shrine-nav {
    display: flex;
    justify-content: center;
    gap: 16px;
}

.shrine-nav a {
    color: #ffffff;
    text-decoration: none;
    font-weight: bold;
    padding: 6px 14px;
    border-radius: 20px;
    background: rgba(255,255,255,0.15);
    transition: background 0.2s;
}

.shrine-nav a:hover, .shrine-nav a.active {
    background: var(--th-gold);
    color: #1a1005;
}

.shrine-container {
    max-width: 960px;
    margin: 30px auto;
    padding: 0 16px;
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 24px;
}

@media (max-width: 768px) {
    .shrine-container { grid-template-columns: 1fr; }
}

.article-card, .widget-card, .guestbook-section {
    background: var(--th-card);
    border: 1px solid var(--th-border);
    border-radius: 10px;
    padding: 22px;
    margin-bottom: 20px;
    box-shadow: 0 4px 16px rgba(166, 27, 50, 0.05);
}

.article-meta {
    font-size: 0.85rem;
    color: var(--th-crimson);
    font-weight: bold;
    margin-bottom: 8px;
}

.article-card h2 {
    color: var(--th-crimson-dark);
    margin-bottom: 12px;
}

.btn-like, .btn-submit {
    background: var(--th-paper);
    border: 1.5px solid var(--th-crimson);
    color: var(--th-crimson);
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: bold;
    cursor: pointer;
    margin-top: 14px;
    transition: all 0.2s;
}

.btn-like:hover, .btn-submit:hover {
    background: var(--th-crimson);
    color: #ffffff;
}

.guestbook-section form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 14px 0 20px;
}

.guestbook-section input, .guestbook-section textarea {
    padding: 10px;
    border: 1px solid var(--th-border);
    border-radius: 6px;
    font-family: inherit;
}

.comment-item {
    border-left: 3px solid var(--th-crimson);
    background: var(--th-paper);
    padding: 10px 14px;
    border-radius: 0 6px 6px 0;
    margin-bottom: 10px;
}

.barrier-meter {
    background: #e0d5c5;
    border-radius: 10px;
    overflow: hidden;
    margin-top: 8px;
}

.barrier-fill {
    background: var(--th-crimson);
    color: #ffffff;
    font-size: 0.75rem;
    text-align: center;
    padding: 4px;
    font-weight: bold;
}

.shrine-footer {
    text-align: center;
    padding: 24px;
    color: var(--th-sub);
    font-size: 0.85rem;
    border-top: 1px solid var(--th-border);
}`,
                'js/blog.js': `// Lógica interactiva del Blog y Libro de Visitas
const ShrineApp = {
    comments: [
        { author: 'Cirno ⑨', text: '¡Soy la más fuerte de todo Gensokyo!' },
        { author: 'Aya Shameimaru', text: 'Excelente nota, saldrá en la edición matutina de Bunbunmaru.' }
    ],

    init() {
        this.renderComments();
    },

    likeArticle(btn) {
        const countEl = btn.querySelector('.like-count');
        let count = parseInt(countEl.innerText) || 0;
        countEl.innerText = count + 1;
        btn.style.transform = 'scale(1.1)';
        setTimeout(() => { btn.style.transform = 'scale(1)'; }, 200);
    },

    addComment(e) {
        e.preventDefault();
        const author = document.getElementById('commentAuthor').value.trim();
        const text = document.getElementById('commentText').value.trim();
        if (!author || !text) return;

        this.comments.unshift({ author, text });
        this.renderComments();

        document.getElementById('commentAuthor').value = '';
        document.getElementById('commentText').value = '';
    },

    renderComments() {
        const list = document.getElementById('commentsList');
        if (!list) return;
        list.innerHTML = this.comments.map(c => \`
            <div class="comment-item">
                <strong style="color:var(--th-crimson);">\${c.author}:</strong>
                <p style="margin-top:3px; font-size:0.95rem;">\${c.text}</p>
            </div>
        \`).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => ShrineApp.init());
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    ShrineApp.init();
}`
            }
        }
    }
};

window.GensokyoTemplates = GensokyoTemplates;
