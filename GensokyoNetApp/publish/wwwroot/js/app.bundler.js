/**
 * ==========================================================================
 * js/app.bundler.js
 * Empaquetador Universal de Intranet + Virtual Asset Runtime
 * Empaqueta cualquier proyecto compilado (Vite, React, Vue, Astro, juegos HTML5,
 * sitios multi-página, subcarpetas CSS/JS/imágenes/audio) dentro de un único
 * payload autoejecutable que intercepta fetch(), XHR, imágenes, rutas SPA y
 * enlaces entre páginas internas sin romper ningún asset en gensokyo://
 * ==========================================================================
 */
(function () {
    const getConsoleBridgeScript = () => `<script>
(function(){
    var send = function(level, args) {
        try {
            var msg = Array.prototype.slice.call(args).map(function(a) {
                if (a instanceof Error) return a.stack || a.message;
                if (typeof a === 'object') {
                    try { return JSON.stringify(a); } catch(e) { return String(a); }
                }
                return String(a);
            }).join(' ');
            window.parent.postMessage({
                source: 'gensokyo-ide-console',
                level: level,
                message: msg,
                timestamp: new Date().toLocaleTimeString()
            }, '*');
        } catch(err) {}
    };
    ['log','info','warn','error'].forEach(function(lvl) {
        var orig = console[lvl];
        console[lvl] = function() {
            send(lvl, arguments);
            if (orig) orig.apply(console, arguments);
        };
    });
    window.addEventListener('error', function(e) {
        send('error', ['[' + (e.filename || 'runtime') + ':' + (e.lineno || 0) + '] ' + e.message]);
    });
    window.addEventListener('unhandledrejection', function(e) {
        send('error', ['[Promise Rejection] ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason))]);
    });
    window.__gxSendConsole = send;
})();
<\/script>`;

    const rewriteCssUrls = (cssText, cssFilePath, vfs) => {
        return String(cssText || '').replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, quote, relUrl) => {
            if (/^(https?:|data:|blob:|#)/i.test(relUrl)) return full;
            const resolved = GensokyoVFS.resolveRelativePath(cssFilePath, relUrl);
            const asset = vfs.files[resolved];
            if (!asset) return full;
            if (asset.startsWith('data:')) return `url("${asset}")`;
            if (resolved.endsWith('.svg')) {
                return `url("data:image/svg+xml;utf8,${encodeURIComponent(asset)}")`;
            }
            return full;
        });
    };

    const utf8ToBase64 = (str) => {
        try {
            if (typeof TextEncoder !== 'undefined') {
                const bytes = new TextEncoder().encode(str);
                let bin = '';
                const chunk = 8192;
                for (let i = 0; i < bytes.length; i += chunk) {
                    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
                }
                return btoa(bin);
            }
            return btoa(unescape(encodeURIComponent(str)));
        } catch (e) {
            return btoa(unescape(encodeURIComponent(str)));
        }
    };

    /**
     * Script inyectado en el documento empaquetado para que cualquier página web
     * pueda hacer fetch('./data.json'), cargar imágenes dinámicas desde JS,
     * cambiar de ruta en React Router / Vue Router o navegar entre páginas .html
     * dentro del mismo dominio de la intranet.
     */
    const createIntranetRuntimeBootstrap = (vfs, entryHtmlPath) => {
        const jsonStr = JSON.stringify(vfs.files || {});
        const b64 = utf8ToBase64(jsonStr);
        return `<script id="gx-intranet-vfs-runtime">
(function() {
    let VFS_FILES = {};
    try {
        const b64Str = "${b64}";
        const bin = atob(b64Str);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        VFS_FILES = JSON.parse(new TextDecoder('utf-8').decode(bytes));
    } catch(err) {
        console.error("VFS bootstrap decoding error", err);
    }
    const CURRENT_ENTRY = ${JSON.stringify(entryHtmlPath)};

    const norm = (p) => String(p || '').split('?')[0].split('#')[0].replace(/\\\\/g, '/').replace(/^\\.\\//, '').replace(/^\\/+|\\/+$/g, '');
    const resolveVfs = (target) => {
        if (!target || typeof target !== 'string') return null;
        if (/^(https?:|data:|blob:|mailto:|javascript:)/i.test(target)) return null;
        const clean = norm(target);
        if (VFS_FILES[clean] !== undefined) return clean;
        const baseDir = CURRENT_ENTRY.includes('/') ? CURRENT_ENTRY.slice(0, CURRENT_ENTRY.lastIndexOf('/')) : '';
        if (baseDir && VFS_FILES[baseDir + '/' + clean] !== undefined) return baseDir + '/' + clean;
        return null;
    };

    const toResponseBody = (path, content) => {
        if (typeof content === 'string' && content.startsWith('data:')) {
            const parts = content.split(',');
            const mime = (parts[0].match(/data:([^;]+)/) || [,'application/octet-stream'])[1];
            const bin = atob(parts[1] || '');
            const u8 = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
            return new Response(u8, { status: 200, headers: { 'Content-Type': mime } });
        }
        const ext = path.split('.').pop().toLowerCase();
        const mimeMap = { json: 'application/json', js: 'application/javascript', css: 'text/css', html: 'text/html', svg: 'image/svg+xml' };
        return new Response(content, { status: 200, headers: { 'Content-Type': mimeMap[ext] || 'text/plain; charset=utf-8' } });
    };

    // 1. Interceptar window.fetch para soportar JSON, text, binarios y WASM locales del proyecto
    const origFetch = window.fetch;
    window.fetch = async function(input, init) {
        const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
        const vfsKey = resolveVfs(url);
        if (vfsKey !== null) {
            return toResponseBody(vfsKey, VFS_FILES[vfsKey]);
        }
        return origFetch.apply(this, arguments);
    };

    // 2. Interceptar XMLHttpRequest para motores de juegos y librerías legacy
    const OrigXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
        const xhr = new OrigXHR();
        const origOpen = xhr.open;
        let interceptedKey = null;
        xhr.open = function(method, url) {
            interceptedKey = resolveVfs(String(url || ''));
            if (interceptedKey !== null) {
                const raw = VFS_FILES[interceptedKey];
                const dataUri = raw.startsWith('data:')
                    ? raw
                    : 'data:text/plain;charset=utf-8,' + encodeURIComponent(raw);
                return origOpen.call(this, method, dataUri, true);
            }
            return origOpen.apply(this, arguments);
        };
        return xhr;
    };

    // 3. Soportar navegación entre múltiples archivos .html del mismo proyecto o links a gensokyo://
    document.addEventListener('click', function(e) {
        const link = e.target.closest && e.target.closest('a[href]');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#')) return;

        if (/^(gensokyo|outside):\\/\\//i.test(href) || /^https?:\\/\\//i.test(href)) {
            e.preventDefault();
            window.parent.postMessage({ source: 'gensokyo-intranet-nav', url: href }, '*');
            return;
        }

        const vfsTarget = resolveVfs(href);
        if (vfsTarget && vfsTarget.endsWith('.html')) {
            e.preventDefault();
            window.parent.postMessage({ source: 'gensokyo-intranet-subpage', page: vfsTarget }, '*');
        }
    });

    // 5. Puente de Identidad del Pasaporte de GensokyoNet (SDK para paginas de la intranet)
    window.GensokyoPassport = {
        getPublicProfile: function() {
            return new Promise(function(resolve) {
                var reqId = 'gx_req_' + Math.random().toString(36).slice(2);
                var handler = function(e) {
                    if (e.data && e.data.type === 'GENSOKYO_PASSPORT_PROFILE_RESPONSE' && e.data.requestId === reqId) {
                        window.removeEventListener('message', handler);
                        resolve(e.data.profile);
                    }
                };
                window.addEventListener('message', handler);
                window.parent.postMessage({
                    source: 'gensokyo-passport-sdk',
                    type: 'GENSOKYO_GET_PASSPORT_PROFILE',
                    action: 'getProfile',
                    requestId: reqId
                }, '*');
                setTimeout(function() {
                    window.removeEventListener('message', handler);
                    resolve({ username: 'Nameless Youkai', userId: 'ID#0000', avatarUrl: 'assets/nameless_avatar.png', isRegistered: false });
                }, 1200);
            });
        }
    };
    window.GensokyoSDK = window.GensokyoPassport;
})();
<\/script>`;
    };

    const GensokyoBundler = {
        getConsoleBridgeScript,
        bundle(vfs, requestedEntry = null) {
            const files = (vfs && vfs.files) ? vfs.files : {};
            const paths = Object.keys(files);
            const entryPath = (requestedEntry && files[requestedEntry])
                ? requestedEntry
                : (paths.find(p => p === 'index.html' || p.endsWith('/index.html')) || paths.find(p => p.endsWith('.html')) || paths[0]);

            if (!entryPath || !files[entryPath]) {
                return { html: '<!DOCTYPE html><html><body></body></html>', tech: { id: 'web', label: 'HTML5', entry: 'index.html' } };
            }

            let html = files[entryPath];

            // 1. Inyectar hojas de estilo locales (<link rel="stylesheet">) reescribiendo sus url() internas
            html = html.replace(/<link\b[^>]*href=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi, (full, href) => {
                const resolved = GensokyoVFS.resolveRelativePath(entryPath, href);
                if (files[resolved] !== undefined) {
                    const processedCss = rewriteCssUrls(files[resolved], resolved, vfs);
                    return `<style data-vfs-css="${resolved}">\n${processedCss}\n</style>`;
                }
                return full;
            });

            // 2. Reescribir atributos src, href, poster (imágenes, audio, video, favicons, SVGs)
            html = html.replace(/\b(src|href|poster)=["']([^"']+)["']/gi, (full, attr, relUrl) => {
                if (/^(https?:|data:|blob:|#|mailto:|gensokyo:|outside:)/i.test(relUrl)) return full;
                const resolved = GensokyoVFS.resolveRelativePath(entryPath, relUrl);
                const content = files[resolved];
                if (typeof content !== 'string') return full;

                if (content.startsWith('data:')) {
                    return `${attr}="${content}"`;
                }
                if (resolved.endsWith('.svg')) {
                    return `${attr}="data:image/svg+xml;utf8,${encodeURIComponent(content)}"`;
                }
                return full;
            });

            // 3. Inyectar scripts locales (<script src="...">) preservando type="module" si corresponde
            html = html.replace(/<script\b([^>]*)src=["']([^"']+)["']([^>]*)><\/script>/gi, (full, pre, src, post) => {
                if (/^(https?:|data:|blob:)/i.test(src)) return full;
                const resolved = GensokyoVFS.resolveRelativePath(entryPath, src);
                if (files[resolved] !== undefined) {
                    const attrs = `${pre} ${post}`.trim();
                    const isModule = /type=["']module["']/i.test(attrs);
                    return `<script ${isModule ? 'type="module"' : ''} data-vfs-script="${resolved}">\n${String(files[resolved] || '').replace(/<\/script/gi, '<\\/script')}\n<\/script>`;
                }
                return full;
            });

            // 4. Inyectar el Runtime VFS de Intranet y Console Bridge en <head>
            const consoleScript = getConsoleBridgeScript();
            const runtimeScript = createIntranetRuntimeBootstrap(vfs, entryPath);
            const injected = `${consoleScript}\n${runtimeScript}`;
            if (/<head\b[^>]*>/i.test(html)) {
                html = html.replace(/<head\b[^>]*>/i, (m) => `${m}\n${injected}`);
            } else {
                html = `<!DOCTYPE html><html><head>${injected}</head><body>${html}</body></html>`;
            }

            return {
                html,
                tech: { id: 'web', label: 'Intranet Bundle', entry: entryPath }
            };
        }
    };

    window.GensokyoBundler = GensokyoBundler;
    if (window.GensokyoApp) {
        window.GensokyoApp.Bundler = GensokyoBundler;
        window.GensokyoApp.getIdeConsoleBridgeScript = getConsoleBridgeScript;
    }
})();