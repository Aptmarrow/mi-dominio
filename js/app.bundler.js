/**
 * ==========================================================================
 * js/app.bundler.js
 * Compilador y Empaquetador Políglota Universal en Navegador
 * - Resuelve rutas relativas jerárquicas (CSS, JS, imágenes/SVG en subcarpetas)
 * - Ejecuta HTML/CSS/JS, TypeScript, React (JSX/TSX), Python 3, Lua y Markdown
 * - Inyecta puente bidireccional de Consola DevTools (stdout, stderr, logs)
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
    window.__gxSendConsole = send;
})();
<\/script>`;

    const collectAllCss = (vfs) => Object.entries(vfs.files || {})
        .filter(([p]) => p.endsWith('.css') || p.endsWith('.scss'))
        .map(([p, code]) => `/* === ${p} === */\n${code}`)
        .join('\n\n');

    const bundleStandardWeb = (vfs, htmlEntryPath) => {
        let html = vfs.files[htmlEntryPath] || '';

        // 1. Resolver <link rel="stylesheet" href="..."> relativos a la carpeta del HTML
        html = html.replace(/<link\b[^>]*href=["']([^"']+\.(?:css|scss))["'][^>]*>/gi, (full, href) => {
            const target = GensokyoVFS.resolveRelativePath(htmlEntryPath, href);
            if (vfs.files[target] !== undefined) {
                return `<style data-vfs-path="${target}">\n${vfs.files[target]}\n</style>`;
            }
            return full;
        });

        // 2. Resolver <script src="..."> relativos (JS / TS)
        html = html.replace(/<script\b([^>]*)src=["']([^"']+)["']([^>]*)><\/script>/gi, (full, pre, src, post) => {
            const target = GensokyoVFS.resolveRelativePath(htmlEntryPath, src);
            if (vfs.files[target] !== undefined) {
                const ext = GensokyoVFS.extname(target);
                if (ext === 'ts' || ext === 'jsx' || ext === 'tsx') {
                    return `<script type="text/babel" data-presets="env,typescript,react" data-vfs-path="${target}">\n${vfs.files[target]}\n<\/script>`;
                }
                return `<script data-vfs-path="${target}">\n${vfs.files[target]}\n<\/script>`;
            }
            return full;
        });

        // 3. Resolver imágenes .svg locales del VFS como data URI
        html = html.replace(/\bsrc=["']([^"']+\.svg)["']/gi, (full, src) => {
            const target = GensokyoVFS.resolveRelativePath(htmlEntryPath, src);
            if (vfs.files[target] !== undefined) {
                return `src="data:image/svg+xml;utf8,${encodeURIComponent(vfs.files[target])}"`;
            }
            return full;
        });

        const needsBabel = /type=["']text\/babel["']/i.test(html);
        const babelTag = needsBabel
            ? `<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.24.7/babel.min.js"><\/script>`
            : '';

        const headInjection = `${getConsoleBridgeScript()}\n${babelTag}`;
        if (/<head\b[^>]*>/i.test(html)) {
            return html.replace(/<head\b[^>]*>/i, (m) => `${m}\n${headInjection}`);
        }
        return `<!DOCTYPE html><html><head>${headInjection}</head><body>${html}</body></html>`;
    };

    const bundleReactOrTsProject = (vfs, tech) => {
        const htmlFile = Object.keys(vfs.files).find(p => p.endsWith('.html'));
        const baseBody = htmlFile
            ? vfs.files[htmlFile]
            : `<div id="root"></div>`;
        const css = collectAllCss(vfs);

        const codeModules = Object.entries(vfs.files)
            .filter(([p]) => /\.(jsx|tsx|ts|js)$/.test(p))
            .map(([p, code]) => {
                // Limpiar imports relativos para concatenar en un único runtime Babel
                const stripped = code
                    .replace(/^\s*import\s+React.*?from\s+['"]react['"];?\s*$/gm, '')
                    .replace(/^\s*import\s+ReactDOM.*?from\s+['"]react-dom(?:\/client)?['"];?\s*$/gm, '')
                    .replace(/^\s*import\s+['"][^'"]+\.css['"];?\s*$/gm, '')
                    .replace(/^\s*export\s+default\s+/gm, 'window.__GxDefaultExport = ');
                return `// --- ${p} ---\n${stripped}`;
            })
            .join('\n\n');

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    ${getConsoleBridgeScript()}
    <style>${css}</style>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.24.7/babel.min.js"><\/script>
</head>
<body>
    ${baseBody.includes('id="root"') ? baseBody : `<div id="root"></div>${baseBody}`}
    <script type="text/babel" data-presets="env,react,typescript">
        const { useState, useEffect, useRef, useMemo, useCallback } = React;
        ${codeModules}
        const rootEl = document.getElementById('root');
        if (rootEl && window.__GxDefaultExport && !rootEl.innerHTML.trim()) {
            ReactDOM.createRoot(rootEl).render(React.createElement(window.__GxDefaultExport));
        }
    <\/script>
</body>
</html>`;
    };

    const bundlePythonProject = (vfs, tech) => {
        const htmlFile = Object.keys(vfs.files).find(p => p.endsWith('.html'));
        const css = collectAllCss(vfs);
        const pyScripts = Object.entries(vfs.files)
            .filter(([p]) => p.endsWith('.py'))
            .map(([p, code]) => `# === ${p} ===\n${code}`)
            .join('\n\n');

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    ${getConsoleBridgeScript()}
    <style>
        body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #fcf7f1; color: #2b181c; }
        #gx-py-stdout { background: #161114; color: #f2e9f7; padding: 14px; border-radius: 8px; font-family: monospace; white-space: pre-wrap; }
        ${css}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/brython@3.12.3/brython.min.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/brython@3.12.3/brython_stdlib.js"><\/script>
</head>
<body onload="brython()">
    ${htmlFile ? vfs.files[htmlFile] : `<h2>Python 3 Web Runtime</h2><pre id="gx-py-stdout"></pre>`}
    <script type="text/python">
import sys
from browser import window, document

class GxBridgeOut:
    def __init__(self, level):
        self.level = level
    def write(self, data):
        text = str(data)
        if text.strip():
            window.__gxSendConsole(self.level, [text.rstrip()])
        out_el = document.getElementById("gx-py-stdout")
        if out_el is not None:
            out_el.text += text

sys.stdout = GxBridgeOut("info")
sys.stderr = GxBridgeOut("error")

${pyScripts}
    <\/script>
</body>
</html>`;
    };

    const bundleLuaProject = (vfs) => {
        const htmlFile = Object.keys(vfs.files).find(p => p.endsWith('.html'));
        const css = collectAllCss(vfs);
        const luaScripts = Object.entries(vfs.files)
            .filter(([p]) => p.endsWith('.lua'))
            .map(([p, code]) => `-- === ${p} ===\n${code}`)
            .join('\n\n');

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    ${getConsoleBridgeScript()}
    <style>
        body { font-family: system-ui, sans-serif; padding: 20px; background: #fcf7f1; color: #2b181c; }
        #gx-lua-stdout { background: #161114; color: #b4e3ff; padding: 14px; border-radius: 8px; font-family: monospace; white-space: pre-wrap; }
        ${css}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/fengari-web@0.1.4/dist/fengari-web.js"><\/script>
</head>
<body>
    ${htmlFile ? vfs.files[htmlFile] : `<h2>Lua 5.3 VM Runtime</h2><pre id="gx-lua-stdout"></pre>`}
    <script type="application/lua">
local js = require "js"
local window = js.global
local document = window.document
local orig_print = print
_G.print = function(...)
    local parts = {}
    for i = 1, select("#", ...) do
        parts[#parts + 1] = tostring(select(i, ...))
    end
    local line = table.concat(parts, "\t")
    window.console:log(line)
    local out = document:getElementById("gx-lua-stdout")
    if out ~= js.null then
        out.textContent = (out.textContent or "") .. line .. "\n"
    end
end

${luaScripts}
    <\/script>
</body>
</html>`;
    };

    const bundleMarkdownProject = (vfs, tech) => {
        const md = vfs.files[tech.entry] || Object.values(vfs.files)[0] || '';
        const css = collectAllCss(vfs);
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    ${getConsoleBridgeScript()}
    <style>
        body { font-family: system-ui, sans-serif; max-width: 780px; margin: 0 auto; padding: 28px; line-height: 1.65; background: #fcf7f1; color: #2b181c; }
        pre, code { background: #f2e6da; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
        ${css}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><\/script>
</head>
<body>
    <article id="md-root"></article>
    <script>
        const raw = ${JSON.stringify(md)};
        document.getElementById('md-root').innerHTML = window.marked ? marked.parse(raw) : raw;
    <\/script>
</body>
</html>`;
    };

    const GensokyoBundler = {
        getConsoleBridgeScript,
        bundle(vfs) {
            const tech = GensokyoTechDetector.analyze(vfs);
            let html = '';

            if (tech.id === 'python') {
                html = bundlePythonProject(vfs, tech);
            } else if (tech.id === 'lua') {
                html = bundleLuaProject(vfs, tech);
            } else if (tech.id === 'react' || tech.id === 'typescript') {
                html = bundleReactOrTsProject(vfs, tech);
            } else if (tech.id === 'markdown') {
                html = bundleMarkdownProject(vfs, tech);
            } else {
                html = bundleStandardWeb(vfs, tech.entry);
            }

            return { html, tech };
        }
    };

    window.GensokyoBundler = GensokyoBundler;
    if (window.GensokyoApp) {
        window.GensokyoApp.Bundler = GensokyoBundler;
        window.GensokyoApp.getIdeConsoleBridgeScript = getConsoleBridgeScript;
    }
})();