/**
 * ==========================================================================
 * js/app.site-builder.js
 * Koumakan Studio IDE - Workbench Completo
 * - Árbol jerárquico real con carpetas colapsables
 * - Menú contextual nativo (Click derecho: Nuevo archivo, Nueva carpeta, Renombrar F2, Eliminar Del)
 * - Command Palette (Ctrl+Shift+P / F1) & Quick Open (Ctrl+P)
 * - Importación de Carpetas completas (webkitdirectory / Drag&Drop / .zip) y Exportación .zip
 * - Compilador políglota (HTML/CSS/JS, TypeScript, React JSX/TSX, Python 3, Lua, Markdown)
 * ==========================================================================
 */
(function () {
    const IDE = {
        currentDomain: null,
        vfs: { files: {}, folders: [] },
        expandedFolders: new Set(['src', 'src/styles', 'src/app']),
        selectedNode: { path: 'index.html', type: 'file' },
        activeFile: 'index.html',
        openTabs: ['index.html'],
        dirtyFiles: new Set(),
        monacoLoaded: false,
        monacoInstance: null,
        monacoModels: {},
        viewStates: {},
        contextTarget: { path: '', type: 'folder' },
        inlineEditMode: null, // { mode: 'new-file'|'new-folder'|'rename', parentPath, targetPath, isFolder }
        globalListenersBound: false
    };

    const getLanguageForFile = (filePath) => {
        const ext = GensokyoVFS.extname(filePath);
        const map = {
            html: 'html', htm: 'html',
            css: 'css', scss: 'scss',
            js: 'javascript', mjs: 'javascript', jsx: 'javascript',
            ts: 'typescript', tsx: 'typescript',
            py: 'python',
            lua: 'lua',
            json: 'json',
            md: 'markdown',
            svg: 'xml', xml: 'xml'
        };
        return map[ext] || 'plaintext';
    };

    const loadMonaco = () => {
        if (window.monaco && window.monaco.editor) {
            IDE.monacoLoaded = true;
            return Promise.resolve(window.monaco);
        }
        return new Promise((resolve, reject) => {
            const baseUrl = window.GENSOKYO_MONACO_PATH || 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.47.0/min/vs';
            const script = document.createElement('script');
            script.src = `${baseUrl}/loader.min.js`;
            script.onload = () => {
                window.require.config({ paths: { vs: baseUrl } });
                window.require(['vs/editor/editor.main'], () => {
                    defineTouhouThemes(window.monaco);
                    IDE.monacoLoaded = true;
                    resolve(window.monaco);
                });
            };
            script.onerror = () => reject(new Error('Monaco offline'));
            document.head.appendChild(script);
        });
    };

    const defineTouhouThemes = (monaco) => {
        monaco.editor.defineTheme('touhou-scarlet', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '8c6d73', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'a61b32', fontStyle: 'bold' },
                { token: 'string', foreground: '7a2e1d' }
            ],
            colors: {
                'editor.background': '#fcf7f1',
                'editor.foreground': '#2d181c',
                'editor.lineHighlightBackground': '#f5ebe0',
                'editorCursor.foreground': '#a61b32'
            }
        });

        monaco.editor.defineTheme('touhou-hakugyokurou', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '7e6c88', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'ff7eb6', fontStyle: 'bold' },
                { token: 'string', foreground: 'b4e3ff' }
            ],
            colors: {
                'editor.background': '#15101c',
                'editor.foreground': '#f2e9f7',
                'editor.lineHighlightBackground': '#21192c',
                'editorCursor.foreground': '#ff7eb6'
            }
        });
    };

    const activeMonacoTheme = () =>
        GensokyoApp.currentTheme === 'hakugyokurou' ? 'touhou-hakugyokurou' : 'touhou-scarlet';

    /* ==========================================================================
       1. MONTAJE DEL WORKBENCH
       ========================================================================== */
    GensokyoApp.renderSiteBuilder = function (requestedDomain = null) {
        const viewport = document.getElementById('th-viewport');
        if (!viewport) return;

        const domains = Object.keys(this.userDomains || {});
        if (!IDE.currentDomain || (requestedDomain && this.userDomains[requestedDomain])) {
            IDE.currentDomain = requestedDomain || domains[0] || 'demo.gensokyo';
        }

        this.loadDomainIntoVfs(IDE.currentDomain);
        const sandboxMode = (this.securityConfig && this.securityConfig.localhostSandboxMode) || 'secure';

        viewport.innerHTML = `
            <section class="gx-ide-workbench" id="gx-ide-workbench">
                <!-- Inputs ocultos para Importar Carpeta o ZIP -->
                <input type="file" id="gx-ide-folder-input" webkitdirectory directory multiple style="display:none;">
                <input type="file" id="gx-ide-zip-input" accept=".zip" style="display:none;">

                <header class="gx-ide-toolbar">
                    <div class="gx-ide-toolbar-group">
                        <span class="gx-ide-brand-badge">⛩️ KOUMAKAN STUDIO</span>
                        <select id="gx-ide-domain-select" class="gx-ide-select">
                            ${domains.length
                                ? domains.map(d => `<option value="${this.escapeHtml(d)}" ${d === IDE.currentDomain ? 'selected' : ''}>gensokyo://${this.escapeHtml(d)}</option>`).join('')
                                : `<option value="demo.gensokyo">gensokyo://demo.gensokyo</option>`
                            }
                        </select>
                        <span id="gx-ide-tech-pill" class="gx-ide-tech-badge">HTML5 / JS</span>
                    </div>

                    <div class="gx-ide-toolbar-group">
                        <button type="button" class="gx-ide-btn" data-ide-cmd="import-folder" title="Importar carpeta de proyecto completa (Ctrl+O)">📂 Importar Carpeta</button>
                        <button type="button" class="gx-ide-btn" data-ide-cmd="export-zip" title="Exportar proyecto como .zip">📦 Exportar ZIP</button>
                        <button type="button" class="gx-ide-btn" data-ide-cmd="open-palette" title="Paleta de Comandos (Ctrl+Shift+P)">⌘ Comandos</button>
                        <button type="button" class="gx-ide-btn" id="gx-ide-sandbox-btn" data-ide-cmd="toggle-sandbox">
                            ${sandboxMode === 'secure' ? '🔒 Sandbox: Seguro' : '⚡ Sandbox: Dev'}
                        </button>
                        <button type="button" class="gx-ide-btn" data-ide-cmd="build-run" title="Compilar (Ctrl+S)">▶ Build (Ctrl+S)</button>
                        <button type="button" class="gx-ide-btn gx-ide-btn-primary" data-ide-cmd="publish-remote">🚀 Publicar</button>
                    </div>
                </header>

                <div class="gx-ide-main">
                    <!-- EXPLORADOR JERÁRQUICO (CLICK DERECHO / ATAJOS) -->
                    <aside class="gx-ide-sidebar">
                        <div class="gx-ide-sidebar-header">
                            <span>EXPLORADOR</span>
                            <span style="font-size:0.66rem; color:var(--th-text-sub);">Click Derecho / F2 / Del</span>
                        </div>
                        <div id="gx-ide-file-tree" class="gx-ide-file-tree" tabindex="0"></div>
                    </aside>

                    <!-- EDITOR CENTRAL -->
                    <section class="gx-ide-editor-pane">
                        <div id="gx-ide-file-tabs" class="gx-ide-file-tabs"></div>
                        <div class="gx-ide-breadcrumbs">
                            <span id="gx-ide-breadcrumb-path"></span>
                            <span id="gx-ide-cursor-pos">Ln 1, Col 1</span>
                        </div>
                        <div id="gx-ide-monaco-container" class="gx-ide-monaco-host"></div>
                    </section>

                    <div id="gx-ide-splitter" class="gx-ide-splitter"></div>

                    <!-- PREVIEW POLÍGLOTA + DEVTOOLS -->
                    <section id="gx-ide-right-pane" class="gx-ide-right-pane">
                        <div class="gx-ide-preview-header">
                            <span class="gx-ide-preview-url">gensokyo://${this.escapeHtml(IDE.currentDomain)}</span>
                            <div class="gx-ide-toolbar-group">
                                <button type="button" class="gx-ide-btn" style="padding:2px 8px; font-size:0.72rem;" data-ide-cmd="toggle-viewport">📱 / 🖥️</button>
                                <button type="button" class="gx-ide-btn" style="padding:2px 8px; font-size:0.72rem;" data-ide-cmd="build-run">↻</button>
                            </div>
                        </div>

                        <div class="gx-ide-preview-stage">
                            <iframe id="gx-ide-preview-frame" class="gx-ide-preview-iframe" sandbox="${this.getLocalhostSandboxAttr()}"></iframe>
                        </div>

                        <footer id="gx-ide-console-box" class="gx-ide-console">
                            <div class="gx-ide-console-header">
                                <span>TERMINAL / STDOUT / DEVTOOLS</span>
                                <div class="gx-ide-toolbar-group">
                                    <button type="button" class="gx-ide-btn" style="padding:1px 7px; font-size:0.68rem;" data-ide-cmd="clear-console">Limpiar</button>
                                    <button type="button" class="gx-ide-btn" style="padding:1px 7px; font-size:0.68rem;" data-ide-cmd="toggle-console">_</button>
                                </div>
                            </div>
                            <div id="gx-ide-console-output" class="gx-ide-console-output"></div>
                        </footer>
                    </section>
                </div>

                <!-- MENÚ CONTEXTUAL (CLICK DERECHO) -->
                <div id="gx-ide-context-menu" class="gx-ide-context-menu hidden">
                    <div class="gx-ctx-item" data-ctx-action="new-file"><span>Nuevo Archivo...</span><span class="gx-ctx-shortcut">Alt+N</span></div>
                    <div class="gx-ctx-item" data-ctx-action="new-folder"><span>Nueva Carpeta...</span><span class="gx-ctx-shortcut">Alt+Shift+N</span></div>
                    <div class="gx-ctx-divider"></div>
                    <div class="gx-ctx-item" data-ctx-action="rename"><span>Renombrar</span><span class="gx-ctx-shortcut">F2</span></div>
                    <div class="gx-ctx-item" data-ctx-action="delete"><span>Eliminar</span><span class="gx-ctx-shortcut">Del</span></div>
                    <div class="gx-ctx-divider"></div>
                    <div class="gx-ctx-item" data-ctx-action="import-folder"><span>Importar Carpeta...</span><span class="gx-ctx-shortcut">Ctrl+O</span></div>
                    <div class="gx-ctx-item" data-ctx-action="import-zip"><span>Importar archivo .ZIP...</span><span class="gx-ctx-shortcut"></span></div>
                    <div class="gx-ctx-item" data-ctx-action="export-zip"><span>Exportar Proyecto (.ZIP)</span><span class="gx-ctx-shortcut">Ctrl+Shift+E</span></div>
                </div>

                <!-- COMMAND PALETTE (CTRL+SHIFT+P / CTRL+P) -->
                <div id="gx-ide-palette-overlay" class="gx-ide-palette-overlay hidden">
                    <div class="gx-ide-palette-box">
                        <input type="text" id="gx-ide-palette-input" class="gx-ide-palette-input" placeholder="Escribe un comando o busca un archivo...">
                        <div id="gx-ide-palette-list" class="gx-ide-palette-list"></div>
                    </div>
                </div>

                <footer class="gx-ide-statusbar">
                    <div class="gx-ide-statusbar-side">
                        <span id="gx-ide-status-sync">● VFS Jerárquico Listo</span>
                        <span id="gx-ide-build-time">Build: 0 ms</span>
                    </div>
                    <div class="gx-ide-statusbar-side">
                        <span id="gx-ide-bundle-size">0 KB</span>
                        <span id="gx-ide-engine-label">Monaco Ready</span>
                    </div>
                </footer>
            </section>
        `;

        this.renderVfsHierarchyUI();
        this.bindWorkbenchEvents();
        this.mountMonacoEditor();
        this.compileAndRunPreview(false);
    };

    /* ==========================================================================
       2. ÁRBOL DE CARPETAS JERÁRQUICO + INPUT INLINE (SIN PROMPTS FALSOS)
       ========================================================================== */
    GensokyoApp.loadDomainIntoVfs = function (domainName) {
        const domainObj = this.userDomains[domainName];
        if (domainObj && domainObj.vfs && domainObj.vfs.files) {
            IDE.vfs = {
                files: { ...domainObj.vfs.files },
                folders: Array.isArray(domainObj.vfs.folders) ? [...domainObj.vfs.folders] : []
            };
        } else if (domainObj && domainObj.vfsFiles) {
            IDE.vfs = { files: { ...domainObj.vfsFiles }, folders: [] };
            Object.keys(IDE.vfs.files).forEach(f => GensokyoVFS.ensureParentFolders(IDE.vfs, f));
        } else {
            IDE.vfs = GensokyoVFS.createDefaultTree();
        }

        const allFiles = Object.keys(IDE.vfs.files);
        IDE.activeFile = allFiles.includes(IDE.activeFile) ? IDE.activeFile : (allFiles[0] || 'index.html');
        IDE.openTabs = allFiles.slice(0, 4);
        IDE.selectedNode = { path: IDE.activeFile, type: 'file' };
        IDE.dirtyFiles.clear();
    };

    GensokyoApp.renderVfsHierarchyUI = function () {
        const treeEl = document.getElementById('gx-ide-file-tree');
        const tabsEl = document.getElementById('gx-ide-file-tabs');
        if (!treeEl || !tabsEl) return;

        treeEl.innerHTML = '';
        const hierarchy = GensokyoVFS.buildHierarchy(IDE.vfs);

        const renderInlineInputRow = (depth, initialValue = '') => {
            const row = document.createElement('div');
            row.className = 'gx-tree-row';
            row.style.paddingLeft = `${10 + depth * 14}px`;

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'gx-tree-inline-input';
            input.value = initialValue;
            input.placeholder = IDE.inlineEditMode.mode === 'new-folder' ? 'nombre-carpeta' : 'archivo.ext';

            let committed = false;
            const commit = () => {
                if (committed) return;
                committed = true;
                const val = input.value.trim();
                const edit = IDE.inlineEditMode;
                IDE.inlineEditMode = null;

                if (!val) {
                    this.renderVfsHierarchyUI();
                    return;
                }

                if (edit.mode === 'new-file') {
                    const target = edit.parentPath ? `${edit.parentPath}/${val}` : val;
                    const created = GensokyoVFS.upsertFile(IDE.vfs, target, '');
                    if (created) {
                        this.syncMonacoModelForFile(created);
                        this.switchIdeFile(created);
                    }
                } else if (edit.mode === 'new-folder') {
                    const target = edit.parentPath ? `${edit.parentPath}/${val}` : val;
                    const created = GensokyoVFS.createFolder(IDE.vfs, target);
                    if (created) IDE.expandedFolders.add(created);
                } else if (edit.mode === 'rename') {
                    const baseDir = GensokyoVFS.dirname(edit.targetPath);
                    const nextPath = baseDir ? `${baseDir}/${val}` : val;
                    const renamed = GensokyoVFS.renameNode(IDE.vfs, edit.targetPath, nextPath, edit.isFolder);
                    if (renamed && !edit.isFolder) {
                        this.disposeMonacoModel(edit.targetPath);
                        this.syncMonacoModelForFile(renamed);
                        IDE.openTabs = IDE.openTabs.map(t => t === edit.targetPath ? renamed : t);
                        if (IDE.activeFile === edit.targetPath) IDE.activeFile = renamed;
                    }
                }
                this.renderVfsHierarchyUI();
            };

            input.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
                if (ev.key === 'Escape') { ev.preventDefault(); IDE.inlineEditMode = null; this.renderVfsHierarchyUI(); }
            });
            input.addEventListener('blur', commit);

            row.appendChild(input);
            treeEl.appendChild(row);
            requestAnimationFrame(() => { input.focus(); input.select(); });
        };

        const renderNodes = (nodes, depth) => {
            if (IDE.inlineEditMode &&
                (IDE.inlineEditMode.mode === 'new-file' || IDE.inlineEditMode.mode === 'new-folder') &&
                IDE.inlineEditMode.parentPath === '' && depth === 0) {
                renderInlineInputRow(0, '');
            }

            nodes.forEach(node => {
                if (IDE.inlineEditMode && IDE.inlineEditMode.mode === 'rename' && IDE.inlineEditMode.targetPath === node.path) {
                    renderInlineInputRow(depth, node.name);
                    return;
                }

                const row = document.createElement('div');
                const isSelected = IDE.selectedNode.path === node.path || (!IDE.selectedNode.path && node.path === IDE.activeFile);
                row.className = `gx-tree-row ${isSelected ? 'active' : ''}`;
                row.style.paddingLeft = `${10 + depth * 14}px`;
                row.dataset.vfsPath = node.path;
                row.dataset.vfsType = node.type;

                if (node.type === 'folder') {
                    const isOpen = IDE.expandedFolders.has(node.path);
                    const caret = document.createElement('span');
                    caret.className = `gx-tree-caret ${isOpen ? 'open' : ''}`;
                    caret.textContent = '▶';

                    const icon = document.createElement('span');
                    icon.textContent = isOpen ? '📂' : '📁';

                    const label = document.createElement('span');
                    label.textContent = node.name;

                    row.append(caret, icon, label);
                    treeEl.appendChild(row);

                    if (isOpen) {
                        if (IDE.inlineEditMode &&
                            (IDE.inlineEditMode.mode === 'new-file' || IDE.inlineEditMode.mode === 'new-folder') &&
                            IDE.inlineEditMode.parentPath === node.path) {
                            renderInlineInputRow(depth + 1, '');
                        }
                        if (node.sortedChildren) renderNodes(node.sortedChildren, depth + 1);
                    }
                } else {
                    const spacer = document.createElement('span');
                    spacer.className = 'gx-tree-caret';

                    const badge = document.createElement('span');
                    badge.className = `gx-tree-ext gx-ext-${node.ext || 'txt'}`;
                    badge.textContent = (node.ext || 'FILE').slice(0, 4).toUpperCase();

                    const label = document.createElement('span');
                    label.textContent = node.name;

                    row.append(spacer, badge, label);
                    treeEl.appendChild(row);
                }
            });
        };

        renderNodes(hierarchy, 0);

        // Renderizar Pestañas de Archivos Abiertos
        tabsEl.innerHTML = '';
        IDE.openTabs.forEach(filePath => {
            if (!(filePath in IDE.vfs.files)) return;
            const tab = document.createElement('div');
            tab.className = `gx-ide-tab ${filePath === IDE.activeFile ? 'active' : ''}`;
            tab.dataset.tabPath = filePath;
            tab.title = filePath;

            const name = document.createElement('span');
            name.textContent = GensokyoVFS.basename(filePath);
            tab.appendChild(name);

            if (IDE.dirtyFiles.has(filePath)) {
                const dot = document.createElement('span');
                dot.className = 'gx-ide-dirty-dot';
                tab.appendChild(dot);
            }

            const closeBtn = document.createElement('span');
            closeBtn.className = 'gx-ide-tab-close';
            closeBtn.dataset.closeTab = filePath;
            closeBtn.textContent = '×';
            tab.appendChild(closeBtn);

            tabsEl.appendChild(tab);
        });

        const bc = document.getElementById('gx-ide-breadcrumb-path');
        if (bc) {
            bc.textContent = `gensokyo://${IDE.currentDomain} › ${(IDE.activeFile || '').replace(/\//g, ' › ')}`;
        }
    };

    /* ==========================================================================
       3. MONACO MULTI-MODELO Y CAMBIO DE ARCHIVOS
       ========================================================================== */
    GensokyoApp.syncMonacoModelForFile = function (filePath) {
        if (!window.monaco || !window.monaco.editor) return null;
        const uri = window.monaco.Uri.parse(`inmemory://gensokyo/${IDE.currentDomain}/${filePath}`);
        let model = window.monaco.editor.getModel(uri);
        if (!model) {
            model = window.monaco.editor.createModel(
                IDE.vfs.files[filePath] || '',
                getLanguageForFile(filePath),
                uri
            );
        } else {
            model.setValue(IDE.vfs.files[filePath] || '');
        }
        IDE.monacoModels[filePath] = model;
        return model;
    };

    GensokyoApp.disposeMonacoModel = function (filePath) {
        if (IDE.monacoModels[filePath]) {
            IDE.monacoModels[filePath].dispose();
            delete IDE.monacoModels[filePath];
        }
    };

    GensokyoApp.mountMonacoEditor = async function () {
        const host = document.getElementById('gx-ide-monaco-container');
        if (!host) return;

        try {
            const monaco = await loadMonaco();
            host.innerHTML = '';

            Object.values(IDE.monacoModels).forEach(m => m && m.dispose && m.dispose());
            IDE.monacoModels = {};
            Object.keys(IDE.vfs.files).forEach(p => this.syncMonacoModelForFile(p));

            IDE.monacoInstance = monaco.editor.create(host, {
                model: IDE.monacoModels[IDE.activeFile],
                theme: activeMonacoTheme(),
                automaticLayout: true,
                fontSize: 13.5,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                minimap: { enabled: true, scale: 0.75 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                bracketPairColorization: { enabled: true }
            });

            IDE.monacoInstance.onDidChangeModelContent(() => {
                if (!IDE.activeFile) return;
                IDE.vfs.files[IDE.activeFile] = IDE.monacoInstance.getValue();
                IDE.dirtyFiles.add(IDE.activeFile);
                this.renderVfsHierarchyUI();
            });

            IDE.monacoInstance.onDidChangeCursorPosition((e) => {
                const pos = document.getElementById('gx-ide-cursor-pos');
                if (pos) pos.textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
            });

            IDE.monacoInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                this.compileAndRunPreview(true);
            });
            IDE.monacoInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
                this.openCommandPalette('files');
            });
            IDE.monacoInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, () => {
                this.openCommandPalette('commands');
            });
        } catch (err) {
            host.innerHTML = `<textarea id="gx-ide-fallback-textarea" style="width:100%;height:100%;border:none;padding:14px;font-family:monospace;background:var(--th-bg-main);color:var(--th-text-main);outline:none;"></textarea>`;
            const area = document.getElementById('gx-ide-fallback-textarea');
            if (area) {
                area.value = IDE.vfs.files[IDE.activeFile] || '';
                area.addEventListener('input', () => {
                    IDE.vfs.files[IDE.activeFile] = area.value;
                    IDE.dirtyFiles.add(IDE.activeFile);
                });
            }
        }
    };

    GensokyoApp.switchIdeFile = function (filePath) {
        if (!(filePath in IDE.vfs.files)) return;
        if (IDE.monacoInstance && IDE.monacoModels[IDE.activeFile]) {
            IDE.viewStates[IDE.activeFile] = IDE.monacoInstance.saveViewState();
        }

        IDE.activeFile = filePath;
        IDE.selectedNode = { path: filePath, type: 'file' };
        if (!IDE.openTabs.includes(filePath)) IDE.openTabs.push(filePath);

        // Expandir automáticamente las carpetas padre del archivo abierto
        const parentDir = GensokyoVFS.dirname(filePath);
        if (parentDir) {
            let acc = '';
            parentDir.split('/').forEach(part => {
                acc = acc ? `${acc}/${part}` : part;
                IDE.expandedFolders.add(acc);
            });
        }

        if (IDE.monacoInstance) {
            const model = IDE.monacoModels[filePath] || this.syncMonacoModelForFile(filePath);
            if (model) {
                IDE.monacoInstance.setModel(model);
                if (IDE.viewStates[filePath]) IDE.monacoInstance.restoreViewState(IDE.viewStates[filePath]);
                IDE.monacoInstance.focus();
            }
        } else {
            const area = document.getElementById('gx-ide-fallback-textarea');
            if (area) area.value = IDE.vfs.files[filePath] || '';
        }

        this.renderVfsHierarchyUI();
    };

    /* ==========================================================================
       4. COMPILACIÓN POLÍGLOTA Y PREVIEW UNIVERSAL
       ========================================================================== */
    GensokyoApp.compileAndRunPreview = function (notify = true) {
        const t0 = performance.now();
        const { html: bundledHtml, tech } = GensokyoBundler.bundle(IDE.vfs);
        const elapsed = Math.max(1, Math.round(performance.now() - t0));

        const pill = document.getElementById('gx-ide-tech-pill');
        if (pill) pill.textContent = tech.label;

        const domainKey = IDE.currentDomain;
        if (!this.userDomains[domainKey]) {
            this.userDomains[domainKey] = {
                title: domainKey,
                author: this.passport?.username || 'Nameless Youkai',
                ownerId: this.passport?.userId || 'ID#0000',
                activeVersion: 'v1',
                versions: {}
            };
        }

        const domainObj = this.userDomains[domainKey];
        const ver = domainObj.activeVersion || 'v1';
        domainObj.htmlContent = bundledHtml;
        domainObj.vfs = {
            files: { ...IDE.vfs.files },
            folders: [...IDE.vfs.folders]
        };
        domainObj.versions = domainObj.versions || {};
        domainObj.versions[ver] = {
            htmlContent: bundledHtml,
            vfs: { files: { ...IDE.vfs.files }, folders: [...IDE.vfs.folders] },
            updatedAt: new Date().toISOString()
        };

        this.saveUserDomains();
        IDE.dirtyFiles.clear();
        this.renderVfsHierarchyUI();

        const iframe = document.getElementById('gx-ide-preview-frame');
        if (iframe) {
            iframe.setAttribute('sandbox', this.getLocalhostSandboxAttr());
            iframe.srcdoc = bundledHtml;
        }

        const kb = (new Blob([bundledHtml]).size / 1024).toFixed(2);
        const buildEl = document.getElementById('gx-ide-build-time');
        const sizeEl = document.getElementById('gx-ide-bundle-size');
        if (buildEl) buildEl.textContent = `Build: ${elapsed} ms`;
        if (sizeEl) sizeEl.textContent = `${kb} KB`;

        if (notify && this.showToastNotification) {
            this.showToastNotification(`${tech.label} compilado en ${elapsed} ms`, 'success');
        }
    };

    /* ==========================================================================
       5. MENÚ CONTEXTUAL (CLICK DERECHO), COMMAND PALETTE Y ATAJOS REALES
       ========================================================================== */
    GensokyoApp.triggerVfsOperation = function (action) {
        const target = IDE.contextTarget.path
            ? IDE.contextTarget
            : IDE.selectedNode;

        const parentFolder = target.type === 'folder'
            ? target.path
            : GensokyoVFS.dirname(target.path);

        if (action === 'new-file' || action === 'new-folder') {
            if (parentFolder) IDE.expandedFolders.add(parentFolder);
            IDE.inlineEditMode = { mode: action, parentPath: parentFolder };
            this.renderVfsHierarchyUI();
        } else if (action === 'rename' && target.path) {
            IDE.inlineEditMode = {
                mode: 'rename',
                targetPath: target.path,
                isFolder: target.type === 'folder'
            };
            this.renderVfsHierarchyUI();
        } else if (action === 'delete' && target.path) {
            const isFolder = target.type === 'folder';
            GensokyoVFS.deleteNode(IDE.vfs, target.path, isFolder);
            if (!isFolder) {
                this.disposeMonacoModel(target.path);
                IDE.openTabs = IDE.openTabs.filter(t => t !== target.path);
                if (IDE.activeFile === target.path) {
                    IDE.activeFile = IDE.openTabs[0] || Object.keys(IDE.vfs.files)[0] || '';
                    if (IDE.activeFile) this.switchIdeFile(IDE.activeFile);
                }
            }
            IDE.selectedNode = { path: IDE.activeFile, type: 'file' };
            this.renderVfsHierarchyUI();
        } else if (action === 'import-folder') {
            document.getElementById('gx-ide-folder-input')?.click();
        } else if (action === 'import-zip') {
            document.getElementById('gx-ide-zip-input')?.click();
        } else if (action === 'export-zip') {
            const blob = GensokyoVFS.exportToZipBlob(IDE.vfs);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${IDE.currentDomain || 'gensokyo-project'}.zip`;
            a.click();
            URL.revokeObjectURL(url);
            if (this.showToastNotification) {
                this.showToastNotification('Proyecto exportado como .ZIP con estructura de carpetas', 'success');
            }
        }
    };

    GensokyoApp.openCommandPalette = function (mode = 'commands') {
        const overlay = document.getElementById('gx-ide-palette-overlay');
        const input = document.getElementById('gx-ide-palette-input');
        const list = document.getElementById('gx-ide-palette-list');
        if (!overlay || !input || !list) return;

        overlay.classList.remove('hidden');
        input.value = mode === 'commands' ? '>' : '';
        input.focus();

        const commands = [
            { label: '> Archivo: Nuevo Archivo en carpeta actual', run: () => this.triggerVfsOperation('new-file') },
            { label: '> Carpeta: Nueva Carpeta', run: () => this.triggerVfsOperation('new-folder') },
            { label: '> Proyecto: Importar Carpeta desde PC', run: () => this.triggerVfsOperation('import-folder') },
            { label: '> Proyecto: Importar archivo .ZIP', run: () => this.triggerVfsOperation('import-zip') },
            { label: '> Proyecto: Exportar como .ZIP', run: () => this.triggerVfsOperation('export-zip') },
            { label: '> Build: Compilar y Ejecutar Vista Previa (Ctrl+S)', run: () => this.compileAndRunPreview(true) },
            { label: '> Nube: Publicar Release en Registro Remoto', run: () => document.querySelector('[data-ide-cmd="publish-remote"]')?.click() }
        ];

        const renderFiltered = () => {
            const q = input.value.trim();
            list.innerHTML = '';
            const items = q.startsWith('>')
                ? commands.filter(c => c.label.toLowerCase().includes(q.slice(1).trim().toLowerCase()))
                : Object.keys(IDE.vfs.files)
                    .filter(f => f.toLowerCase().includes(q.toLowerCase()))
                    .map(f => ({ label: `📄 ${f}`, run: () => this.switchIdeFile(f) }));

            items.forEach((item) => {
                const row = document.createElement('div');
                row.className = 'gx-ctx-item';
                row.textContent = item.label;
                row.addEventListener('click', () => {
                    overlay.classList.add('hidden');
                    item.run();
                });
                list.appendChild(row);
            });
        };

        input.oninput = renderFiltered;
        input.onkeydown = (ev) => {
            if (ev.key === 'Escape') overlay.classList.add('hidden');
            if (ev.key === 'Enter' && list.firstElementChild) list.firstElementChild.click();
        };
        renderFiltered();
    };

    GensokyoApp.bindWorkbenchEvents = function () {
        const workbench = document.getElementById('gx-ide-workbench');
        const treeEl = document.getElementById('gx-ide-file-tree');
        const ctxMenu = document.getElementById('gx-ide-context-menu');
        if (!workbench || !treeEl || !ctxMenu) return;

        // 1. Click izquierdo en Explorador, Pestañas y Comandos
        workbench.addEventListener('click', async (e) => {
            ctxMenu.classList.add('hidden');

            const closeTabBtn = e.target.closest('[data-close-tab]');
            if (closeTabBtn) {
                e.stopPropagation();
                const pathToClose = closeTabBtn.dataset.closeTab;
                IDE.openTabs = IDE.openTabs.filter(t => t !== pathToClose);
                if (IDE.activeFile === pathToClose) {
                    IDE.activeFile = IDE.openTabs[0] || Object.keys(IDE.vfs.files)[0] || '';
                    if (IDE.activeFile) this.switchIdeFile(IDE.activeFile);
                }
                this.renderVfsHierarchyUI();
                return;
            }

            const tabEl = e.target.closest('[data-tab-path]');
            if (tabEl) {
                this.switchIdeFile(tabEl.dataset.tabPath);
                return;
            }

            const treeRow = e.target.closest('[data-vfs-path]');
            if (treeRow) {
                const path = treeRow.dataset.vfsPath;
                const type = treeRow.dataset.vfsType;
                IDE.selectedNode = { path, type };

                if (type === 'folder') {
                    if (IDE.expandedFolders.has(path)) IDE.expandedFolders.delete(path);
                    else IDE.expandedFolders.add(path);
                    this.renderVfsHierarchyUI();
                } else {
                    this.switchIdeFile(path);
                }
                return;
            }

            const ctxItem = e.target.closest('[data-ctx-action]');
            if (ctxItem) {
                this.triggerVfsOperation(ctxItem.dataset.ctxAction);
                return;
            }

            const cmdBtn = e.target.closest('[data-ide-cmd]');
            if (!cmdBtn) return;

            const cmd = cmdBtn.dataset.ideCmd;
            if (cmd === 'build-run') this.compileAndRunPreview(true);
            else if (cmd === 'import-folder') this.triggerVfsOperation('import-folder');
            else if (cmd === 'export-zip') this.triggerVfsOperation('export-zip');
            else if (cmd === 'open-palette') this.openCommandPalette('commands');
            else if (cmd === 'toggle-viewport') document.getElementById('gx-ide-preview-frame')?.classList.toggle('viewport-mobile');
            else if (cmd === 'clear-console') {
                const out = document.getElementById('gx-ide-console-output');
                if (out) out.innerHTML = '';
            } else if (cmd === 'toggle-console') {
                document.getElementById('gx-ide-console-box')?.classList.toggle('collapsed');
            } else if (cmd === 'toggle-sandbox') {
                const next = this.securityConfig.localhostSandboxMode === 'secure' ? 'dev' : 'secure';
                this.setLocalhostSandboxMode(next);
                cmdBtn.textContent = next === 'secure' ? '🔒 Sandbox: Seguro' : '⚡ Sandbox: Dev';
                this.compileAndRunPreview(false);
            } else if (cmd === 'publish-remote') {
                this.compileAndRunPreview(false);
                const domainObj = this.userDomains[IDE.currentDomain];
                const ver = domainObj ? domainObj.activeVersion : 'v1';
                const ok = await this.publishDomainVersionToRegistry(IDE.currentDomain, ver, 'ide-release');
                if (this.showToastNotification) {
                    this.showToastNotification(
                        ok ? `Release ${ver} publicado` : 'Guardado en VFS local (Registro remoto offline)',
                        ok ? 'success' : 'info'
                    );
                }
            }
        });

        // 2. Click Derecho Real en el Árbol VFS
        treeEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const row = e.target.closest('[data-vfs-path]');
            if (row) {
                IDE.contextTarget = { path: row.dataset.vfsPath, type: row.dataset.vfsType };
                IDE.selectedNode = { ...IDE.contextTarget };
                this.renderVfsHierarchyUI();
            } else {
                IDE.contextTarget = { path: '', type: 'folder' };
            }

            ctxMenu.classList.remove('hidden');
            const x = Math.min(e.clientX, window.innerWidth - 230);
            const y = Math.min(e.clientY, window.innerHeight - 260);
            ctxMenu.style.left = `${x}px`;
            ctxMenu.style.top = `${y}px`;
        });

        // 3. Atajos de teclado nativos en el árbol (F2, Delete, Alt+N, Alt+Shift+N)
        treeEl.addEventListener('keydown', (e) => {
            if (IDE.inlineEditMode) return;
            if (e.key === 'F2') {
                e.preventDefault();
                this.triggerVfsOperation('rename');
            } else if (e.key === 'Delete') {
                e.preventDefault();
                this.triggerVfsOperation('delete');
            } else if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                this.triggerVfsOperation('new-folder');
            } else if (e.altKey && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                this.triggerVfsOperation('new-file');
            }
        });

        // 4. Importar Carpeta o ZIP desde inputs o Drag & Drop sobre el árbol
        const handleImportedVfs = (importedVfs) => {
            if (!importedVfs || !Object.keys(importedVfs.files).length) return;
            IDE.vfs = importedVfs;
            IDE.expandedFolders = new Set(importedVfs.folders.slice(0, 12));
            const tech = GensokyoTechDetector.analyze(IDE.vfs);
            IDE.activeFile = tech.entry || Object.keys(IDE.vfs.files)[0];
            IDE.openTabs = Object.keys(IDE.vfs.files).slice(0, 5);
            this.mountMonacoEditor();
            this.renderVfsHierarchyUI();
            this.compileAndRunPreview(true);
        };

        document.getElementById('gx-ide-folder-input')?.addEventListener('change', async (e) => {
            handleImportedVfs(await GensokyoVFS.importFromFileList(e.target.files));
        });

        document.getElementById('gx-ide-zip-input')?.addEventListener('change', async (e) => {
            handleImportedVfs(await GensokyoVFS.importFromFileList(e.target.files));
        });

        treeEl.addEventListener('dragover', (e) => { e.preventDefault(); treeEl.classList.add('drag-over'); });
        treeEl.addEventListener('dragleave', () => treeEl.classList.remove('drag-over'));
        treeEl.addEventListener('drop', async (e) => {
            e.preventDefault();
            treeEl.classList.remove('drag-over');
            if (e.dataTransfer?.files?.length) {
                handleImportedVfs(await GensokyoVFS.importFromFileList(e.dataTransfer.files));
            }
        });

        // 5. Cambio de dominio y Splitter
        document.getElementById('gx-ide-domain-select')?.addEventListener('change', (e) => {
            IDE.currentDomain = e.target.value;
            this.renderSiteBuilder(IDE.currentDomain);
        });

        const splitter = document.getElementById('gx-ide-splitter');
        const rightPane = document.getElementById('gx-ide-right-pane');
        if (splitter && rightPane) {
            let dragging = false;
            splitter.addEventListener('mousedown', () => {
                dragging = true;
                splitter.classList.add('dragging');
                workbench.classList.add('is-resizing');
            });
            window.addEventListener('mousemove', (e) => {
                if (!dragging) return;
                const rect = workbench.getBoundingClientRect();
                const w = rect.right - e.clientX;
                if (w >= 240 && w <= rect.width - 420) rightPane.style.width = `${w}px`;
            });
            window.addEventListener('mouseup', () => {
                if (!dragging) return;
                dragging = false;
                splitter.classList.remove('dragging');
                workbench.classList.remove('is-resizing');
            });
        }

        // 6. Listeners globales únicos (Consola + Atajos de IDE)
        if (!IDE.globalListenersBound) {
            IDE.globalListenersBound = true;

            window.addEventListener('message', (event) => {
                const data = event.data;
                if (!data || data.source !== 'gensokyo-ide-console') return;
                const out = document.getElementById('gx-ide-console-output');
                if (!out) return;

                const row = document.createElement('div');
                row.className = `gx-console-row gx-console-${data.level || 'log'}`;
                const time = document.createElement('span');
                time.className = 'gx-console-time';
                time.textContent = `[${data.timestamp || ''}]`;
                const msg = document.createElement('span');
                msg.textContent = ` ${data.message || ''}`;
                row.append(time, msg);
                out.appendChild(row);
                out.scrollTop = out.scrollHeight;
            });

            document.addEventListener('keydown', (e) => {
                if (!document.getElementById('gx-ide-workbench')) return;
                const key = e.key.toLowerCase();
                if (e.ctrlKey && e.shiftKey && key === 'p') {
                    e.preventDefault();
                    this.openCommandPalette('commands');
                } else if (e.ctrlKey && !e.shiftKey && key === 'p') {
                    e.preventDefault();
                    this.openCommandPalette('files');
                } else if (e.ctrlKey && key === 's') {
                    e.preventDefault();
                    this.compileAndRunPreview(true);
                } else if (e.ctrlKey && key === 'o') {
                    e.preventDefault();
                    this.triggerVfsOperation('import-folder');
                } else if (e.ctrlKey && e.shiftKey && key === 'e') {
                    e.preventDefault();
                    this.triggerVfsOperation('export-zip');
                }
            });
        }
    };

    const origApplyTheme = GensokyoApp.applyTheme;
    GensokyoApp.applyTheme = function (themeKey) {
        if (origApplyTheme) origApplyTheme.call(this, themeKey);
        if (window.monaco && window.monaco.editor && IDE.monacoLoaded) {
            window.monaco.editor.setTheme(activeMonacoTheme());
        }
    };
})();