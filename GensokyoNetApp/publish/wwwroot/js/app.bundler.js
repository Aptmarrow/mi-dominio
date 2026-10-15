(function() {
    const getConsoleBridgeScript = () => `<script>\n(function(){\n    var send = function(level, args) {\n        try {\n            var msg = Array.prototype.slice.call(args).map(function(a) {\n                if (a instanceof Error) return a.stack || a.message;\n                if (typeof a === 'object') {\n                    try { return JSON.stringify(a); } catch(e) { return String(a); }\n                }\n                return String(a);\n            }).join(' ');\n            window.parent.postMessage({\n                source: 'gensokyo-ide-console',\n                level: level,\n                message: msg,\n                timestamp: new Date().toLocaleTimeString()\n            }, '*');\n        } catch(err) {}\n    };\n    ['log','info','warn','error'].forEach(function(lvl) {\n        var orig = console[lvl];\n        console[lvl] = function() {\n            send(lvl, arguments);\n            if (orig) orig.apply(console, arguments);\n        };\n    });\n    window.addEventListener('error', function(e) {\n        send('error', ['[' + (e.filename || 'runtime') + ':' + (e.lineno || 0) + '] ' + e.message]);\n    });\n    window.addEventListener('unhandledrejection', function(e) {\n        send('error', ['[Promise Rejection] ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason))]);\n    });\n    window.__gxSendConsole = send;\n})();\n<\/script>`;
    const rewriteCssUrls = (cssText, cssFilePath, vfs) => String(cssText || "").replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, quote, relUrl) => {
        if (/^(https?:|data:|blob:|#)/i.test(relUrl)) return full;
        const resolved = GensokyoVFS.resolveRelativePath(cssFilePath, relUrl);
        const asset = vfs.files[resolved];
        if (!asset) return full;
        if (asset.startsWith("data:")) return `url("${asset}")`;
        if (resolved.endsWith(".svg")) {
            return `url("data:image/svg+xml;utf8,${encodeURIComponent(asset)}")`;
        }
        return full;
    });
    const utf8ToBase64 = str => {
        try {
            if (typeof TextEncoder !== "undefined") {
                const bytes = (new TextEncoder).encode(str);
                let bin = "";
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
    const createIntranetRuntimeBootstrap = (vfs, entryHtmlPath) => {
        const jsonStr = JSON.stringify(vfs.files || {});
        const b64 = utf8ToBase64(jsonStr);
        return `<script id="gx-intranet-vfs-runtime">\n(function() {\n    let VFS_FILES = {};\n    try {\n        const b64Str = "${b64}";\n        const bin = atob(b64Str);\n        const bytes = new Uint8Array(bin.length);\n        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);\n        VFS_FILES = JSON.parse(new TextDecoder('utf-8').decode(bytes));\n    } catch(err) {\n        console.error("VFS bootstrap decoding error", err);\n    }\n    const CURRENT_ENTRY = ${JSON.stringify(entryHtmlPath)};\n\n    const norm = (p) => String(p || '').split('?')[0].split('#')[0].replace(/\\\\/g, '/').replace(/^\\.\\//, '').replace(/^\\/+|\\/+$/g, '');\n    const resolveVfs = (target) => {\n        if (!target || typeof target !== 'string') return null;\n        if (/^(https?:|data:|blob:|mailto:|javascript:)/i.test(target)) return null;\n        const clean = norm(target);\n        if (VFS_FILES[clean] !== undefined) return clean;\n        const baseDir = CURRENT_ENTRY.includes('/') ? CURRENT_ENTRY.slice(0, CURRENT_ENTRY.lastIndexOf('/')) : '';\n        if (baseDir && VFS_FILES[baseDir + '/' + clean] !== undefined) return baseDir + '/' + clean;\n        return null;\n    };\n\n    const toResponseBody = (path, content) => {\n        if (typeof content === 'string' && content.startsWith('data:')) {\n            const parts = content.split(',');\n            const mime = (parts[0].match(/data:([^;]+)/) || [,'application/octet-stream'])[1];\n            const bin = atob(parts[1] || '');\n            const u8 = new Uint8Array(bin.length);\n            for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);\n            return new Response(u8, { status: 200, headers: { 'Content-Type': mime } });\n        }\n        const ext = path.split('.').pop().toLowerCase();\n        const mimeMap = { json: 'application/json', js: 'application/javascript', css: 'text/css', html: 'text/html', svg: 'image/svg+xml' };\n        return new Response(content, { status: 200, headers: { 'Content-Type': mimeMap[ext] || 'text/plain; charset=utf-8' } });\n    };\n\n    // 1. Interceptar window.fetch para soportar JSON, text, binarios y WASM locales del proyecto\n    const origFetch = window.fetch;\n    window.fetch = async function(input, init) {\n        const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');\n        const vfsKey = resolveVfs(url);\n        if (vfsKey !== null) {\n            return toResponseBody(vfsKey, VFS_FILES[vfsKey]);\n        }\n        return origFetch.apply(this, arguments);\n    };\n\n    // 2. Interceptar XMLHttpRequest para motores de juegos y librerías legacy\n    const OrigXHR = window.XMLHttpRequest;\n    window.XMLHttpRequest = function() {\n        const xhr = new OrigXHR();\n        const origOpen = xhr.open;\n        let interceptedKey = null;\n        xhr.open = function(method, url) {\n            interceptedKey = resolveVfs(String(url || ''));\n            if (interceptedKey !== null) {\n                const raw = VFS_FILES[interceptedKey];\n                const dataUri = raw.startsWith('data:')\n                    ? raw\n                    : 'data:text/plain;charset=utf-8,' + encodeURIComponent(raw);\n                return origOpen.call(this, method, dataUri, true);\n            }\n            return origOpen.apply(this, arguments);\n        };\n        return xhr;\n    };\n\n    // 3. Soportar navegación entre múltiples archivos .html del mismo proyecto o links a gensokyo://\n    document.addEventListener('click', function(e) {\n        const link = e.target.closest && e.target.closest('a[href]');\n        if (!link) return;\n        const href = link.getAttribute('href');\n        if (!href || href.startsWith('#')) return;\n\n        if (/^(gensokyo|outside):\\/\\//i.test(href) || /^https?:\\/\\//i.test(href)) {\n            e.preventDefault();\n            window.parent.postMessage({ source: 'gensokyo-intranet-nav', url: href }, '*');\n            return;\n        }\n\n        const vfsTarget = resolveVfs(href);\n        if (vfsTarget && vfsTarget.endsWith('.html')) {\n            e.preventDefault();\n            window.parent.postMessage({ source: 'gensokyo-intranet-subpage', page: vfsTarget }, '*');\n        }\n    });\n\n    // 5. Puente de Identidad del Pasaporte de GensokyoNet (SDK para paginas de la intranet)\n    window.GensokyoPassport = {\n        getPublicProfile: function() {\n            return new Promise(function(resolve) {\n                var reqId = 'gx_req_' + Math.random().toString(36).slice(2);\n                var handler = function(e) {\n                    if (e.data && e.data.type === 'GENSOKYO_PASSPORT_PROFILE_RESPONSE' && e.data.requestId === reqId) {\n                        window.removeEventListener('message', handler);\n                        resolve(e.data.profile);\n                    }\n                };\n                window.addEventListener('message', handler);\n                window.parent.postMessage({\n                    source: 'gensokyo-passport-sdk',\n                    type: 'GENSOKYO_GET_PASSPORT_PROFILE',\n                    action: 'getProfile',\n                    requestId: reqId\n                }, '*');\n                setTimeout(function() {\n                    window.removeEventListener('message', handler);\n                    resolve({ username: 'Nameless Youkai', userId: 'ID#0000', avatarUrl: 'assets/nameless_avatar.png', isRegistered: false });\n                }, 1200);\n            });\n        }\n    };\n    window.GensokyoSDK = window.GensokyoPassport;\n})();\n<\/script>`;
    };
    const GensokyoBundler = {
        getConsoleBridgeScript: getConsoleBridgeScript,
        bundle(vfs, requestedEntry = null) {
            const files = vfs && vfs.files ? vfs.files : {};
            const paths = Object.keys(files);
            const entryPath = requestedEntry && files[requestedEntry] ? requestedEntry : paths.find(p => p === "index.html" || p.endsWith("/index.html")) || paths.find(p => p.endsWith(".html")) || paths[0];
            if (!entryPath || !files[entryPath]) {
                return {
                    html: "<!DOCTYPE html><html><body></body></html>",
                    tech: {
                        id: "web",
                        label: "HTML5",
                        entry: "index.html"
                    }
                };
            }
            let html = files[entryPath];
            html = html.replace(/<link\b[^>]*href=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi, (full, href) => {
                const resolved = GensokyoVFS.resolveRelativePath(entryPath, href);
                if (files[resolved] !== undefined) {
                    const processedCss = rewriteCssUrls(files[resolved], resolved, vfs);
                    return `<style data-vfs-css="${resolved}">\n${processedCss}\n</style>`;
                }
                return full;
            });
            html = html.replace(/\b(src|href|poster)=["']([^"']+)["']/gi, (full, attr, relUrl) => {
                if (/^(https?:|data:|blob:|#|mailto:|gensokyo:|outside:)/i.test(relUrl)) return full;
                const resolved = GensokyoVFS.resolveRelativePath(entryPath, relUrl);
                const content = files[resolved];
                if (typeof content !== "string") return full;
                if (content.startsWith("data:")) {
                    return `${attr}="${content}"`;
                }
                if (resolved.endsWith(".svg")) {
                    return `${attr}="data:image/svg+xml;utf8,${encodeURIComponent(content)}"`;
                }
                return full;
            });
            html = html.replace(/<script\b([^>]*)src=["']([^"']+)["']([^>]*)><\/script>/gi, (full, pre, src, post) => {
                if (/^(https?:|data:|blob:)/i.test(src)) return full;
                const resolved = GensokyoVFS.resolveRelativePath(entryPath, src);
                if (files[resolved] !== undefined) {
                    const attrs = `${pre} ${post}`.trim();
                    const isModule = /type=["']module["']/i.test(attrs);
                    return `<script ${isModule ? 'type="module"' : ""} data-vfs-script="${resolved}">\n${String(files[resolved] || "").replace(/<\/script/gi, "<\\/script")}\n<\/script>`;
                }
                return full;
            });
            const consoleScript = getConsoleBridgeScript();
            const runtimeScript = createIntranetRuntimeBootstrap(vfs, entryPath);
            const injected = `${consoleScript}\n${runtimeScript}`;
            if (/<head\b[^>]*>/i.test(html)) {
                html = html.replace(/<head\b[^>]*>/i, m => `${m}\n${injected}`);
            } else {
                html = `<!DOCTYPE html><html><head>${injected}</head><body>${html}</body></html>`;
            }
            return {
                html: html,
                tech: {
                    id: "web",
                    label: "Intranet Bundle",
                    entry: entryPath
                }
            };
        }
    };
    window.GensokyoBundler = GensokyoBundler;
    if (window.GensokyoApp) {
        window.GensokyoApp.Bundler = GensokyoBundler;
        window.GensokyoApp.getIdeConsoleBridgeScript = getConsoleBridgeScript;
    }
})();