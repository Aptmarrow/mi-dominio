/**
 * GensokyoTechDetector - Motor de Reconocimiento y Análisis de Tecnologías Web
 * Inspecciona el árbol de archivos (HTML, CSS, JS, assets) y detecta qué
 * tecnologías, APIs, frameworks y patrones de diseño están presentes.
 */

const GensokyoTechDetector = {
    detect(files = {}) {
        const fileList = Object.values(files);
        const fileNames = Object.keys(files);

        let htmlFiles = 0, cssFiles = 0, jsFiles = 0, assetFiles = 0;
        let totalLines = 0;
        let totalBytes = 0;

        let htmlCombined = '';
        let cssCombined = '';
        let jsCombined = '';

        fileList.forEach((file) => {
            const size = file.size || (file.content ? file.content.length : 0);
            totalBytes += size;
            const ext = (file.name || file.path || '').split('.').pop().toLowerCase();

            if (ext === 'html' || ext === 'htm') {
                htmlFiles++;
                if (typeof file.content === 'string') {
                    htmlCombined += ' ' + file.content;
                    totalLines += file.content.split('\n').length;
                }
            } else if (ext === 'css') {
                cssFiles++;
                if (typeof file.content === 'string') {
                    cssCombined += ' ' + file.content;
                    totalLines += file.content.split('\n').length;
                }
            } else if (ext === 'js' || ext === 'mjs') {
                jsFiles++;
                if (typeof file.content === 'string') {
                    jsCombined += ' ' + file.content;
                    totalLines += file.content.split('\n').length;
                }
            } else {
                assetFiles++;
            }
        });

        const allCode = `${htmlCombined} ${cssCombined} ${jsCombined}`;
        const technologies = [];

        // 1. HTML5 Semántica y Estructura
        if (/<(header|nav|main|article|section|footer|aside|figure|figcaption)/i.test(htmlCombined)) {
            technologies.push({
                id: 'html5_semantic',
                name: 'HTML5 Semántico',
                category: 'Estructura',
                badge: 'HTML5',
                color: '#e44d26',
                tag: 'HTML5',
                description: 'Estructura semántica con etiquetas estándar (header, nav, section, article).'
            });
        }

        // 2. CSS3 Layout (Flexbox & Grid)
        const hasFlex = /display\s*:\s*(flex|inline-flex)/i.test(cssCombined + htmlCombined);
        const hasGrid = /display\s*:\s*(grid|inline-grid)|grid-template/i.test(cssCombined + htmlCombined);
        if (hasFlex || hasGrid) {
            technologies.push({
                id: 'css3_layout',
                name: hasGrid && hasFlex ? 'CSS Grid & Flexbox' : (hasGrid ? 'CSS3 Grid' : 'CSS3 Flexbox'),
                category: 'Estilos',
                badge: hasGrid ? 'GRID' : 'FLEX',
                color: '#264de4',
                tag: 'CSS3',
                description: 'Maquetación avanzada mediante sistemas CSS Grid y Flexbox.'
            });
        }

        // 3. CSS3 Animaciones y Efectos
        if (/@keyframes|animation\s*:|transition\s*:|transform\s*:|backdrop-filter/i.test(cssCombined + htmlCombined)) {
            technologies.push({
                id: 'css3_anim',
                name: 'Animaciones CSS3',
                category: 'Efectos',
                badge: 'ANIM',
                color: '#9c27b0',
                tag: 'FX',
                description: 'Transiciones, transformaciones y keyframes dinámicos.'
            });
        }

        // 4. Variables CSS (Custom Properties)
        if (/var\s*\(--|--[a-z0-9_-]+\s*:/i.test(cssCombined + htmlCombined)) {
            technologies.push({
                id: 'css_vars',
                name: 'CSS Variables',
                category: 'Estilos',
                badge: 'VARS',
                color: '#00838f',
                tag: 'CSS',
                description: 'Diseño modular con Custom Properties nativas.'
            });
        }

        // 5. Diseño Responsivo
        if (/@media\s*\(|<meta[^>]+viewport/i.test(allCode)) {
            technologies.push({
                id: 'responsive',
                name: 'Diseño Responsivo',
                category: 'Maquetación',
                badge: 'RESPONSIVE',
                color: '#2e7d32',
                tag: 'MEDIA',
                description: 'Adaptación a múltiples pantallas y dispositivos.'
            });
        }

        // 6. JavaScript Moderno (ES6+)
        if (/(const|let)\s+\w+|\b(async|await)\b|=>|\bclass\s+\w+|\bPromise\b/i.test(jsCombined + htmlCombined)) {
            technologies.push({
                id: 'es6_js',
                name: 'JavaScript ES6+',
                category: 'Lógica',
                badge: 'ES6+',
                color: '#f7df1e',
                textColor: '#1a1a1a',
                tag: 'JS',
                description: 'Sintaxis moderna de JavaScript (arrow functions, async/await, promesas).'
            });
        }

        // 7. HTML5 Canvas 2D / Danmaku Game Engine
        if (/<canvas|getContext\s*\(\s*['"]2d['"]\s*\)|requestAnimationFrame/i.test(allCode)) {
            technologies.push({
                id: 'canvas_2d',
                name: 'HTML5 Canvas 2D',
                category: 'Gráficos',
                badge: 'CANVAS 2D',
                color: '#c2185b',
                tag: 'CANVAS',
                description: 'Renderizado gráfico por lienzo interactivo (juegos danmaku y visualizadores).'
            });
        }

        // 8. WebGL / 3D Graphics
        if (/getContext\s*\(\s*['"](webgl|experimental-webgl)['"]\s*\)|THREE\./i.test(allCode)) {
            technologies.push({
                id: 'webgl_3d',
                name: 'WebGL / 3D',
                category: 'Gráficos',
                badge: 'WEBGL',
                color: '#d81b60',
                tag: '3D',
                description: 'Aceleración de gráficos por hardware 3D en el navegador.'
            });
        }

        // 9. Web Audio API / Multimedia
        if (/AudioContext|webkitAudioContext|new\s+Audio\(|<(audio|video)\b/i.test(allCode)) {
            technologies.push({
                id: 'web_audio',
                name: 'Web Audio & Media',
                category: 'Multimedia',
                badge: 'AUDIO API',
                color: '#e65100',
                tag: 'AUDIO',
                description: 'Sonido dinámico sintetizado y reproducción de medios.'
            });
        }

        // 10. Vector Graphics (SVG)
        if (/<svg\b|\.svg/i.test(allCode) || fileNames.some(f => f.endsWith('.svg'))) {
            technologies.push({
                id: 'svg_vectors',
                name: 'Gráficos Vectoriales SVG',
                category: 'Gráficos',
                badge: 'SVG',
                color: '#ff6f00',
                tag: 'SVG',
                description: 'Ilustraciones e iconos vectoriales escalables.'
            });
        }

        // 11. Frameworks y Librerías Detectadas
        if (/@tailwind|class="[^"]*(?:flex|grid|p-\d|m-\d|text-\w+-\d+)/i.test(allCode)) {
            technologies.push({
                id: 'tailwind_css',
                name: 'Tailwind CSS',
                category: 'Frameworks',
                badge: 'TAILWIND',
                color: '#06b6d4',
                tag: 'CSS',
                description: 'Framework CSS de utilidades de diseño.'
            });
        }

        if (/bootstrap(\.min)?\.(css|js)|class="[^"]*(?:container|row|col-|btn-primary)/i.test(allCode)) {
            technologies.push({
                id: 'bootstrap',
                name: 'Bootstrap',
                category: 'Frameworks',
                badge: 'BOOTSTRAP',
                color: '#7952b3',
                tag: 'CSS',
                description: 'Librería de componentes responsivos.'
            });
        }

        if (/fonts\.googleapis\.com|@font-face/i.test(allCode)) {
            technologies.push({
                id: 'web_fonts',
                name: 'Fuentes Web Personalizadas',
                category: 'Tipografía',
                badge: 'FONTS',
                color: '#455a64',
                tag: 'FONT',
                description: 'Tipografías importadas (Google Fonts o @font-face).'
            });
        }

        if (/localStorage|sessionStorage|fetch\s*\(|XMLHttpRequest/i.test(allCode)) {
            technologies.push({
                id: 'storage_api',
                name: 'Web APIs / Storage',
                category: 'APIs',
                badge: 'APIs',
                color: '#00796b',
                tag: 'API',
                description: 'Almacenamiento local o llamadas de red asíncronas.'
            });
        }

        // Arquetipo o categoría del proyecto (limpio, sin emojis)
        let archetype = 'Sitio Web Doujin';
        if (technologies.some(t => t.id === 'canvas_2d' || t.id === 'webgl_3d')) {
            archetype = 'Aplicación Interactiva / Danmaku Canvas';
        } else if (technologies.some(t => t.id === 'web_audio') && technologies.some(t => t.id === 'css3_anim')) {
            archetype = 'Showcase Multimedia Doujin';
        } else if (technologies.some(t => t.id === 'es6_js') && htmlFiles > 1) {
            archetype = 'Portal Web Multi-Página';
        } else if (technologies.some(t => t.id === 'es6_js')) {
            archetype = 'Single Page Application';
        }

        return {
            summary: {
                totalFiles: fileList.length,
                totalBytes,
                totalLines,
                htmlCount: htmlFiles,
                cssCount: cssFiles,
                jsCount: jsFiles,
                assetCount: assetFiles,
                archetype
            },
            technologies
        };
    }
};

window.GensokyoTechDetector = GensokyoTechDetector;
