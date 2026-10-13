/**
 * GensokyoBundler - Empaquetador y Motor de Ejecución Virtual en Tiempo Real
 * Resuelve dependencias relativas (<link>, <script>, <img>, <audio>, url() en CSS)
 * y empaqueta proyectos multi-archivo para ejecutarse 100% funcionales dentro del iframe sandbox.
 */

const GensokyoBundler = {
    // Normalizador de rutas relativas tipo POSIX
    normalizePath(pathStr) {
        if (!pathStr) return '';
        let clean = pathStr.replace(/\\/g, '/').trim();
        clean = clean.replace(/^[./]+/, ''); // Elimina ./ inicial
        return clean;
    },

    resolveRelative(baseDir, relativePath) {
        if (/^https?:\/\/|^data:|^blob:|^javascript:/i.test(relativePath)) {
            return relativePath; // Enlace externo o absoluto
        }

        const cleanRel = relativePath.split('?')[0].split('#')[0];
        let stack = baseDir ? baseDir.split('/').filter(Boolean) : [];
        const parts = cleanRel.split('/');

        for (const p of parts) {
            if (p === '.' || p === '') continue;
            if (p === '..') {
                if (stack.length > 0) stack.pop();
            } else {
                stack.push(p);
            }
        }

        return stack.join('/');
    },

    findFile(files, resolvedPath) {
        if (!files || !resolvedPath) return null;
        const norm = this.normalizePath(resolvedPath).toLowerCase();

        // Búsqueda directa
        for (const key of Object.keys(files)) {
            if (this.normalizePath(key).toLowerCase() === norm) {
                return files[key];
            }
        }

        // Búsqueda por nombre base si no coincide la subcarpeta
        const basename = norm.split('/').pop();
        for (const key of Object.keys(files)) {
            if (this.normalizePath(key).toLowerCase().endsWith('/' + basename) || this.normalizePath(key).toLowerCase() === basename) {
                return files[key];
            }
        }

        return null;
    },

    // Resuelve url(...) dentro de bloques CSS con activos virtuales
    resolveCssUrls(cssContent, cssFilePath, files) {
        if (!cssContent || typeof cssContent !== 'string') return '';
        const baseDir = cssFilePath.includes('/') ? cssFilePath.substring(0, cssFilePath.lastIndexOf('/')) : '';

        return cssContent.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (match, quote, url) => {
            if (/^https?:\/\/|^data:|^blob:/i.test(url)) return match;

            const resolved = this.resolveRelative(baseDir, url);
            const targetFile = this.findFile(files, resolved);

            if (targetFile && targetFile.content) {
                const mime = targetFile.type || this.guessMimeType(targetFile.name || resolved);
                const dataUrl = targetFile.isBinary || targetFile.content.startsWith('data:')
                    ? targetFile.content
                    : `data:${mime};base64,${btoa(unescape(encodeURIComponent(targetFile.content)))}`;
                return `url("${dataUrl}")`;
            }

            return match;
        });
    },

    guessMimeType(filename) {
        const ext = (filename || '').split('.').pop().toLowerCase();
        const mimes = {
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            gif: 'image/gif',
            webp: 'image/webp',
            svg: 'image/svg+xml',
            ico: 'image/x-icon',
            css: 'text/css',
            js: 'application/javascript',
            html: 'text/html',
            json: 'application/json',
            mp3: 'audio/mpeg',
            wav: 'audio/wav',
            ogg: 'audio/ogg',
            woff: 'font/woff',
            woff2: 'font/woff2',
            ttf: 'font/ttf'
        };
        return mimes[ext] || 'application/octet-stream';
    },

    // Empaqueta un proyecto completo en un documento HTML autosuficiente
    bundle(files = {}, activePage = 'index.html') {
        const fileKeys = Object.keys(files);
        if (fileKeys.length === 0) {
            return `<!DOCTYPE html><html><body style="font-family:sans-serif; text-align:center; padding:40px; color:#666;"><h3>El proyecto está vacío.</h3></body></html>`;
        }

        // 1. Identificar página de entrada
        let mainHtmlKey = this.findFile(files, activePage) ? activePage : null;
        if (!mainHtmlKey) {
            mainHtmlKey = fileKeys.find(k => k.toLowerCase() === 'index.html')
                || fileKeys.find(k => k.toLowerCase().endsWith('/index.html'))
                || fileKeys.find(k => k.toLowerCase().endsWith('.html') || k.toLowerCase().endsWith('.htm'))
                || fileKeys[0];
        }

        const mainFile = this.findFile(files, mainHtmlKey);
        if (!mainFile || !mainFile.content) {
            return `<!DOCTYPE html><html><body><h1>No se encontró contenido HTML para ejecutar.</h1></body></html>`;
        }

        let htmlString = typeof mainFile.content === 'string' ? mainFile.content : '';
        const baseDir = mainHtmlKey.includes('/') ? mainHtmlKey.substring(0, mainHtmlKey.lastIndexOf('/')) : '';

        // 2. Parsear el DOM para transformar enlaces de manera segura
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        // 3. Resolver hojas de estilo externas <link rel="stylesheet">
        const linkTags = Array.from(doc.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"]'));
        linkTags.forEach((link) => {
            const href = link.getAttribute('href');
            if (!href || /^https?:\/\//i.test(href)) return; // Conservar CDN externo

            const resolved = this.resolveRelative(baseDir, href);
            const cssFile = this.findFile(files, resolved);

            if (cssFile && typeof cssFile.content === 'string') {
                const processedCss = this.resolveCssUrls(cssFile.content, resolved, files);
                const styleEl = doc.createElement('style');
                styleEl.setAttribute('data-gensokyo-origin', resolved);
                styleEl.textContent = processedCss;
                link.replaceWith(styleEl);
            }
        });

        // 4. Resolver scripts externos <script src="...">
        const scriptTags = Array.from(doc.querySelectorAll('script[src]'));
        scriptTags.forEach((script) => {
            const src = script.getAttribute('src');
            if (!src || /^https?:\/\//i.test(src)) return; // Conservar CDN externo

            const resolved = this.resolveRelative(baseDir, src);
            const jsFile = this.findFile(files, resolved);

            if (jsFile && typeof jsFile.content === 'string') {
                const inlineScript = doc.createElement('script');
                inlineScript.setAttribute('data-gensokyo-origin', resolved);
                // Conservar tipo módulo si aplica
                if (script.getAttribute('type')) {
                    inlineScript.setAttribute('type', script.getAttribute('type'));
                }
                inlineScript.textContent = `\n/* GensokyoNet Virtual Script: ${resolved} */\n` + jsFile.content;
                script.replaceWith(inlineScript);
            }
        });

        // 5. Resolver recursos multimedia e imágenes (<img>, <audio>, <video>, <source>)
        const mediaTags = Array.from(doc.querySelectorAll('img[src], audio[src], video[src], source[src], input[type="image"][src], link[rel*="icon"][href]'));
        mediaTags.forEach((tag) => {
            const attr = tag.hasAttribute('src') ? 'src' : 'href';
            const srcVal = tag.getAttribute(attr);
            if (!srcVal || /^https?:\/\/|^data:|^blob:/i.test(srcVal)) return;

            const resolved = this.resolveRelative(baseDir, srcVal);
            const mediaFile = this.findFile(files, resolved);

            if (mediaFile && mediaFile.content) {
                const mime = mediaFile.type || this.guessMimeType(mediaFile.name || resolved);
                const dataUrl = mediaFile.isBinary || mediaFile.content.startsWith('data:')
                    ? mediaFile.content
                    : `data:${mime};base64,${btoa(unescape(encodeURIComponent(mediaFile.content)))}`;
                tag.setAttribute(attr, dataUrl);
            }
        });

        // 6. Resolver estilos en línea con url(...)
        const inlineStyleTags = Array.from(doc.querySelectorAll('[style]'));
        inlineStyleTags.forEach((el) => {
            const styleAttr = el.getAttribute('style');
            if (styleAttr && styleAttr.includes('url(')) {
                el.setAttribute('style', this.resolveCssUrls(styleAttr, mainHtmlKey, files));
            }
        });

        // 7. Resolver estilos existentes <style>
        const styleElements = Array.from(doc.querySelectorAll('style'));
        styleElements.forEach((styleTag) => {
            if (styleTag.textContent && styleTag.textContent.includes('url(')) {
                styleTag.textContent = this.resolveCssUrls(styleTag.textContent, mainHtmlKey, files);
            }
        });

        // 8. Inyectar navegación virtual interactiva para enlaces multi-página (<a href="about.html">)
        const htmlPages = fileKeys.filter(k => k.toLowerCase().endsWith('.html') || k.toLowerCase().endsWith('.htm'));
        const navBridgeScript = doc.createElement('script');
        navBridgeScript.setAttribute('data-gensokyo-system', 'vfs-router');
        navBridgeScript.textContent = `
            (function() {
                // Interceptor de navegación interna de páginas en el proyecto
                document.addEventListener('click', function(e) {
                    var target = e.target.closest('a');
                    if (!target) return;
                    var href = target.getAttribute('href');
                    if (!href || href.startsWith('#') || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('javascript:')) {
                        return;
                    }
                    var cleanHref = href.split('?')[0].split('#')[0].replace(/^\\.\\//, '');
                    if (cleanHref.endsWith('.html') || cleanHref.endsWith('.htm')) {
                        e.preventDefault();
                        if (window.parent && window.parent.GensokyoApp && window.parent.GensokyoApp.loadVirtualPage) {
                            window.parent.GensokyoApp.loadVirtualPage(cleanHref);
                        } else {
                            console.log('[GensokyoNet Router] Navegando internamente a:', cleanHref);
                        }
                    }
                }, true);
            })();
        `;
        (doc.head || doc.body || doc.documentElement).appendChild(navBridgeScript);

        return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    }
};

window.GensokyoBundler = GensokyoBundler;
