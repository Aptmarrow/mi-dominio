(function() {
    const GensokyoTechDetector = {
        analyze(vfs) {
            const files = vfs && vfs.files ? vfs.files : {};
            const paths = Object.keys(files);
            const exts = new Set(paths.map(p => GensokyoVFS.extname(p)));
            const pkgJson = files["package.json"] ? this.safeJson(files["package.json"]) : null;
            const deps = pkgJson ? {
                ...pkgJson.dependencies,
                ...pkgJson.devDependencies
            } : {};
            if (exts.has("vue") || deps.vue) {
                return {
                    id: "vue",
                    label: "Vue 3 SFC",
                    entry: this.findEntry(paths, [ "src/App.vue", "App.vue", "src/main.js", "index.html" ])
                };
            }
            if (exts.has("jsx") || exts.has("tsx") || deps.react) {
                return {
                    id: "react",
                    label: exts.has("tsx") ? "React 18 + TypeScript" : "React 18 (ESM)",
                    entry: this.findEntry(paths, [ "src/main.tsx", "src/main.jsx", "src/index.tsx", "src/index.jsx", "src/App.tsx", "src/App.jsx", "App.jsx", "index.jsx" ])
                };
            }
            if (exts.has("cpp") || exts.has("c") || exts.has("cc")) {
                return {
                    id: "cpp",
                    label: "C / C++ (VM Runtime)",
                    entry: this.findEntry(paths, [ "main.cpp", "src/main.cpp", "main.c", "src/main.c" ]) || paths.find(p => /\.(cpp|c|cc)$/.test(p))
                };
            }
            if (exts.has("py")) {
                return {
                    id: "python",
                    label: "Python 3 (WASM/Brython)",
                    entry: this.findEntry(paths, [ "main.py", "app.py", "src/main.py" ]) || paths.find(p => p.endsWith(".py"))
                };
            }
            if (exts.has("php")) {
                return {
                    id: "php",
                    label: "PHP 8 (WASM CGI)",
                    entry: this.findEntry(paths, [ "index.php", "main.php", "src/index.php" ]) || paths.find(p => p.endsWith(".php"))
                };
            }
            if (exts.has("rb")) {
                return {
                    id: "ruby",
                    label: "Ruby (Opal VM)",
                    entry: this.findEntry(paths, [ "main.rb", "app.rb", "src/main.rb" ]) || paths.find(p => p.endsWith(".rb"))
                };
            }
            if (exts.has("lua")) {
                return {
                    id: "lua",
                    label: "Lua 5.3 VM",
                    entry: this.findEntry(paths, [ "main.lua", "init.lua", "src/main.lua" ]) || paths.find(p => p.endsWith(".lua"))
                };
            }
            if (exts.has("sql")) {
                return {
                    id: "sql",
                    label: "SQLite 3 (WASM)",
                    entry: this.findEntry(paths, [ "schema.sql", "query.sql", "main.sql", "init.sql" ]) || paths.find(p => p.endsWith(".sql"))
                };
            }
            if (exts.has("ts")) {
                return {
                    id: "typescript",
                    label: "TypeScript (ESM)",
                    entry: this.findEntry(paths, [ "src/main.ts", "main.ts", "index.ts" ]) || paths.find(p => p.endsWith(".ts"))
                };
            }
            if (!exts.has("html") && exts.has("md")) {
                return {
                    id: "markdown",
                    label: "Markdown Docs",
                    entry: this.findEntry(paths, [ "README.md", "index.md" ]) || paths.find(p => p.endsWith(".md"))
                };
            }
            return {
                id: "web",
                label: "Web ESM / HTML5",
                entry: this.findEntry(paths, [ "index.html", "public/index.html", "src/index.html" ]) || paths.find(p => p.endsWith(".html")) || paths[0]
            };
        },
        safeJson(str) {
            try {
                return JSON.parse(str);
            } catch {
                return null;
            }
        },
        findEntry(paths, candidates) {
            for (const c of candidates) {
                if (paths.includes(c)) return c;
            }
            return paths[0] || "index.html";
        }
    };
    window.GensokyoTechDetector = GensokyoTechDetector;
    if (window.GensokyoApp) window.GensokyoApp.TechDetector = GensokyoTechDetector;
})();