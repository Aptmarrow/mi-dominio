/**
 * ==========================================================================
 * js/app.tech-detector.js
 * Detector Políglota de Tecnologías, Lenguajes y Entrypoints del VFS
 * ==========================================================================
 */
(function () {
    const GensokyoTechDetector = {
        analyze(vfs) {
            const files = vfs && vfs.files ? vfs.files : {};
            const paths = Object.keys(files);
            const exts = new Set(paths.map(p => GensokyoVFS.extname(p)));
            const allContent = Object.values(files).join('\n');

            // 1. React / JSX / TSX
            if (exts.has('jsx') || exts.has('tsx') || /from\s+['"]react['"]|ReactDOM\.createRoot/.test(allContent)) {
                return {
                    id: 'react',
                    label: 'React / JSX (Babel)',
                    entry: this.findEntry(paths, ['src/main.tsx', 'src/main.jsx', 'src/App.tsx', 'src/App.jsx', 'App.jsx', 'index.jsx', 'index.tsx'])
                };
            }

            // 2. Vue SFC / Vue 3
            if (exts.has('vue') || /createApp\s*\(/.test(allContent)) {
                return {
                    id: 'vue',
                    label: 'Vue 3 Runtime',
                    entry: this.findEntry(paths, ['src/App.vue', 'App.vue', 'src/main.js', 'index.html'])
                };
            }

            // 3. Python (Brython / PyScript)
            if (exts.has('py') || /<script[^>]*type=["']text\/python["']/i.test(allContent)) {
                return {
                    id: 'python',
                    label: 'Python 3 (WebRuntime)',
                    entry: this.findEntry(paths, ['main.py', 'app.py', 'src/main.py']) || paths.find(p => p.endsWith('.py'))
                };
            }

            // 4. Lua (Fengari VM)
            if (exts.has('lua') || /<script[^>]*type=["']application\/lua["']/i.test(allContent)) {
                return {
                    id: 'lua',
                    label: 'Lua 5.3 VM',
                    entry: this.findEntry(paths, ['main.lua', 'init.lua', 'src/main.lua']) || paths.find(p => p.endsWith('.lua'))
                };
            }

            // 5. TypeScript
            if (exts.has('ts')) {
                return {
                    id: 'typescript',
                    label: 'TypeScript',
                    entry: this.findEntry(paths, ['src/main.ts', 'main.ts', 'index.ts']) || paths.find(p => p.endsWith('.ts'))
                };
            }

            // 6. Markdown Document / Wiki
            if (!exts.has('html') && exts.has('md')) {
                return {
                    id: 'markdown',
                    label: 'Markdown Docs',
                    entry: this.findEntry(paths, ['README.md', 'index.md']) || paths.find(p => p.endsWith('.md'))
                };
            }

            // 7. Estándar HTML5 / CSS3 / JS (+ SCSS)
            return {
                id: 'web',
                label: exts.has('scss') ? 'HTML5 + SCSS + JS' : 'HTML5 / CSS / JS',
                entry: this.findEntry(paths, ['index.html', 'public/index.html', 'src/index.html']) || paths.find(p => p.endsWith('.html')) || paths[0]
            };
        },

        findEntry(paths, candidates) {
            for (const c of candidates) {
                if (paths.includes(c)) return c;
            }
            return paths[0] || 'index.html';
        }
    };

    window.GensokyoTechDetector = GensokyoTechDetector;
    if (window.GensokyoApp) window.GensokyoApp.TechDetector = GensokyoTechDetector;
})();