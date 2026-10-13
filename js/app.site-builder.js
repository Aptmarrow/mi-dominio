/**
 * GensokyoNet - Estudio Web Avanzado (GensokyoNet IDE)
 * Arquitectura modular estilo VS Code con editor de código, explorador de archivos,
 * vista previa en tiempo real lado a lado y soporte multi-archivo de hasta 25 MB.
 * Libre de emojis, enfocado en estética limpia y control total.
 */

Object.assign(GensokyoApp, {
    builderActiveFile: 'index.html',
    builderPreviewDevice: 'desktop',
    builderOpenTabs: ['index.html'],

    getRegisterView() {
        if (!this.passport.isRegistered) {
            return `
                <div class="th-card" style="max-width: 600px; margin: 40px auto; text-align: center;">
                    <h2 class="th-card-title" style="color: var(--th-crimson); margin-bottom: 12px;">Registro de Dominio Protegido</h2>
                    <p style="line-height: 1.6; margin-bottom: 20px;">
                        Las cuentas sin registrar (<strong>Nameless Youkai</strong>) no pueden reclamar dominios para evitar suplantaciones.<br><br>
                        Regístrate en tu Pasaporte asignándole una contraseña para obtener tu ID propio.
                    </p>
                    <button class="gx-btn-go" style="padding: 12px 24px; font-size: 1rem;" onclick="GensokyoApp.showPassportModal()">
                        Abrir Pasaporte para Registrarse
                    </button>
                </div>
            `;
        }

        return `
            <div class="th-card">
                <div class="th-card-header">
                    <h1 class="th-card-title">Registro de Dominios de Gensokyo</h1>
                    <span class="th-badge">Titular: ${this.escapeHtml(this.passport.username)}</span>
                </div>
                <form onsubmit="GensokyoApp.handleRegisterSubmit(event)">
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-family: var(--font-heading); font-weight: 700; color: var(--th-crimson); margin-bottom: 6px;">Nombre del Dominio / Alias:</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-family: var(--font-heading); color: var(--th-crimson); font-weight: 700;">gensokyo://</span>
                            <input type="text" id="reg-alias" class="gx-url-input" style="border: 1.5px solid var(--th-crimson); border-radius: 6px; padding: 10px 14px;" placeholder="ej. marisa-blog, scarlet-mansion, video-portal" required spellcheck="false">
                            <select id="reg-suffix" style="width: 140px; background: var(--th-bg-main); border: 1.5px solid var(--th-crimson); color: var(--th-text-main); padding: 10px; border-radius: 6px; font-weight: 700;">
                                <option value=".blog">.blog</option>
                                <option value=".shrine">.shrine</option>
                                <option value=".mansion">.mansion</option>
                                <option value=".bamboo">.bamboo</option>
                                <option value=".9">.9</option>
                            </select>
                        </div>
                    </div>
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-family: var(--font-heading); font-weight: 700; color: var(--th-crimson); margin-bottom: 6px;">Vinculado al Pasaporte Gensokyo ID:</label>
                        <input type="text" id="reg-author" class="gx-url-input" style="width: 100%; border: 1.5px solid var(--th-border-warm); border-radius: 6px; padding: 10px 14px; background:var(--th-bg-sidebar);" value="${this.escapeHtml(this.passport.username)} (${this.escapeHtml(this.passport.userId)})" readonly>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-family: var(--font-heading); font-weight: 700; color: var(--th-crimson); margin-bottom: 6px;">Título del Sitio Web:</label>
                        <input type="text" id="reg-title" class="gx-url-input" style="width: 100%; border: 1.5px solid var(--th-crimson); border-radius: 6px; padding: 10px 14px;" placeholder="ej. El Rincón de Marisa" required>
                    </div>
                    <button type="submit" class="gx-btn-go" style="padding: 12px 24px; font-size: 1rem;">Reclamar Dominio</button>
                </form>
            </div>
        `;
    },

    handleRegisterSubmit(e) {
        e.preventDefault();

        if (!this.passport.isRegistered) {
            this.showToastNotification('Debes registrar tu cuenta primero desde tu Pasaporte.', 'error');
            this.showPassportModal();
            return;
        }

        const aliasInput = document.getElementById('reg-alias');
        const suffixSelect = document.getElementById('reg-suffix');
        const titleInput = document.getElementById('reg-title');
        if (!aliasInput || !titleInput || !suffixSelect) return;

        const cleanAlias = aliasInput.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
        const suffix = suffixSelect.value;
        const fullDomain = `${cleanAlias}${suffix}`;

        if (GensokyoSeedData.domains[fullDomain] || this.userDomains[fullDomain]) {
            this.showToastNotification(`El dominio gensokyo://${fullDomain} ya está registrado.`, 'error');
            return;
        }

        const emptyHtml = '';

        this.userDomains[fullDomain] = {
            title: titleInput.value.trim(),
            author: this.passport.username,
            ownerId: this.passport.userId,
            suffix,
            visibility: 'public',
            activeVersion: 'v1',
            files: {
                'index.html': { name: 'index.html', path: 'index.html', type: 'text/html', content: emptyHtml, size: 0 }
            },
            versions: {
                v1: {
                    versionTag: 'v1',
                    htmlContent: emptyHtml,
                    sizeBytes: 0,
                    fileCount: 1,
                    createdAt: new Date().toISOString()
                }
            },
            htmlContent: emptyHtml,
            createdAt: new Date().toISOString().split('T')[0]
        };

        if (!this.passport.ownedDomains.includes(fullDomain)) {
            this.passport.ownedDomains.push(fullDomain);
            this.savePassportData();
        }

        this.saveUserDomains();
        this.builderSelectedDomain = fullDomain;
        this.builderActiveFile = 'index.html';
        this.builderOpenTabs = ['index.html'];
        this.showToastNotification(`Dominio gensokyo://${fullDomain} registrado a tu nombre.`, 'success');
        this.navigate('gensokyo://builder');
    },

    selectDomainForBuilder(domainName) {
        this.builderSelectedDomain = domainName;
        this.builderActiveFile = 'index.html';
        this.builderOpenTabs = ['index.html'];
        this.renderRoute('gensokyo://builder');
    },

    setDomainVisibility(domainName, visibilityTag) {
        const domObj = this.userDomains[domainName];
        if (!domObj) return;

        const isOwner = this.passport.userId && this.passport.userId !== 'ID#0000' && (domObj.ownerId === this.passport.userId || (Array.isArray(this.passport.ownedDomains) && this.passport.ownedDomains.includes(domainName)));

        if (!isOwner) {
            this.showToastNotification('Acceso Denegado: No tienes permisos para modificar este dominio.', 'error');
            return;
        }

        domObj.visibility = visibilityTag;
        this.saveUserDomains();
        if (this.notifyRemoteDomainMutation) {
            this.notifyRemoteDomainMutation(domainName, domObj.activeVersion || 'v1', 'visibility').catch(() => {});
        }

        let label = 'Público y Listado';
        if (visibilityTag === 'unlisted') label = 'No Listado (Solo URL Directa)';
        if (visibilityTag === 'private') label = 'Completamente Privado';

        this.showToastNotification(`Visibilidad de gensokyo://${domainName}: ${label}`, 'success');
        this.renderRoute('gensokyo://builder');
    },

    getDomainProjectFiles(domKey) {
        const domObj = this.userDomains[domKey];
        if (!domObj) return {};

        const activeVer = domObj.activeVersion || 'v1';
        let files = null;

        if (domObj.versions && domObj.versions[activeVer] && domObj.versions[activeVer].files) {
            files = domObj.versions[activeVer].files;
        } else if (domObj.files) {
            files = domObj.files;
        } else if (window.GensokyoVFS && GensokyoVFS.memoryStore[domKey] && GensokyoVFS.memoryStore[domKey].versions[activeVer]) {
            files = GensokyoVFS.memoryStore[domKey].versions[activeVer].files;
        }

        if (!files || Object.keys(files).length === 0) {
            const rawHtml = domObj.htmlContent || '';
            files = {
                'index.html': {
                    name: 'index.html',
                    path: 'index.html',
                    type: 'text/html',
                    content: rawHtml,
                    size: rawHtml.length
                }
            };
        }

        return files;
    },

    getBuilderView() {
        if (!this.passport.isRegistered) {
            return `
                <div class="th-card" style="max-width: 600px; margin: 40px auto; text-align: center;">
                    <h2 class="th-card-title" style="color: var(--th-crimson); margin-bottom: 12px;">Acceso al Creador Web</h2>
                    <p style="line-height: 1.6; margin-bottom: 20px;">
                        Las cuentas sin registrar (<strong>Nameless Youkai</strong>) no poseen dominios.<br>
                        Regístrate en tu Pasaporte para crear y administrar tus propios sitios.
                    </p>
                    <button class="gx-btn-go" style="padding: 12px 24px; font-size: 1rem;" onclick="GensokyoApp.showPassportModal()">
                        Abrir Pasaporte
                    </button>
                </div>
            `;
        }

        const myOwnedDomains = Object.keys(this.userDomains).filter((domainKey) => {
            const dom = this.userDomains[domainKey];
            return dom && this.passport.userId && this.passport.userId !== 'ID#0000' && (dom.ownerId === this.passport.userId || (Array.isArray(this.passport.ownedDomains) && this.passport.ownedDomains.includes(domainKey)));
        });

        if (myOwnedDomains.length === 0) {
            return `
                <div class="th-card">
                    <div class="th-card-header">
                        <h1 class="th-card-title">Panel de Administración Web</h1>
                        <span class="th-badge">Titular: ${this.escapeHtml(this.passport.username)} (${this.escapeHtml(this.passport.userId)})</span>
                    </div>
                    <div style="background:var(--th-bg-main); border:1.5px solid var(--th-border-warm); padding:30px; border-radius:10px; text-align:center;">
                        <p style="font-size:1.05rem; color:var(--th-text-sub); margin-bottom:16px;">No tienes dominios activos registrados en tu Pasaporte.</p>
                        <button class="gx-btn-go" style="padding:12px 24px;" onclick="GensokyoApp.navigate('gensokyo://register')">Reclamar tu Primer Dominio ➔</button>
                    </div>
                </div>
            `;
        }

        // NIVEL 2: ENTORNO IDE ESTILO VS CODE PARA EL DOMINIO SELECCIONADO
        if (this.builderSelectedDomain && myOwnedDomains.includes(this.builderSelectedDomain)) {
            return this.renderVsCodeIdeWorkspace(this.builderSelectedDomain);
        }

        // NIVEL 1: LISTADO DE DOMINIOS CON ESTÉTICA LIMPIA
        const domainCardsHtml = myOwnedDomains.map((domKey) => {
            const domObj = this.userDomains[domKey];
            const vis = domObj.visibility || 'public';
            const versionsObj = domObj.versions || { v1: { htmlContent: domObj.htmlContent || '', sizeBytes: (domObj.htmlContent || '').length } };
            const activeVer = domObj.activeVersion || 'v1';
            const currentSize = (versionsObj[activeVer] ? versionsObj[activeVer].sizeBytes : (domObj.htmlContent || '').length) || 0;
            const usedMb = (currentSize / (1024 * 1024)).toFixed(2);

            const files = this.getDomainProjectFiles(domKey);
            const techAnalysis = window.GensokyoTechDetector ? GensokyoTechDetector.detect(files) : { technologies: [], summary: {} };
            const techBadges = techAnalysis.technologies.slice(0, 4).map(t => `
                <span class="ide-tag-ext ide-tag-${t.tag ? t.tag.toLowerCase() : 'generic'}" style="margin-right:4px;">
                    ${t.tag || t.badge}
                </span>
            `).join('');

            let visBadgeText = 'Público';
            if (vis === 'unlisted') visBadgeText = 'No Listado';
            if (vis === 'private') visBadgeText = 'Privado';

            return `
                <div class="th-card" style="margin-bottom: 16px; border: 1.5px solid var(--th-border-warm); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
                    <div>
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
                            <h2 style="font-family:var(--font-heading); font-size:1.2rem; color:var(--th-crimson); margin:0;">gensokyo://${this.escapeHtml(domKey)}</h2>
                            <span class="version-badge">${visBadgeText}</span>
                        </div>
                        <p style="font-size:0.85rem; color:var(--th-text-sub); margin:0 0 6px 0;">
                            Título: <strong>${this.escapeHtml(domObj.title)}</strong> • ${Object.keys(files).length} archivos • ${usedMb} MB / 25 MB
                        </p>
                        <div>
                            ${techBadges}
                        </div>
                    </div>

                    <div style="display:flex; gap:10px;">
                        <button class="gx-btn-go" style="padding:8px 16px; font-size:0.85rem;" onclick="GensokyoApp.selectDomainForBuilder('${this.escapeHtml(domKey)}')">
                            Abrir en IDE ➔
                        </button>
                        <button class="gx-btn-go" style="background:var(--th-bg-main); border:1px solid var(--th-border-warm); color:var(--th-text-main); padding:8px 14px; font-size:0.85rem;" onclick="GensokyoApp.navigate('gensokyo://${this.escapeHtml(domKey)}')">
                            Visitar
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div style="max-width: 960px; margin: 0 auto;">
                <div style="margin-bottom: 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                    <div>
                        <h1 style="font-family:var(--font-heading); font-size:1.6rem; color:var(--th-crimson); text-transform:uppercase;">Panel de Dominios y Proyectos</h1>
                        <p style="font-size:0.88rem; color:var(--th-text-sub);">Administra tus sitios web, sube carpetas completas y edita archivos en el entorno de desarrollo integrado.</p>
                    </div>
                    <button class="gx-btn-go" onclick="GensokyoApp.navigate('gensokyo://register')">+ Reclamar Nuevo Dominio</button>
                </div>
                ${domainCardsHtml}
            </div>
        `;
    },

    /* RENDERIZA EL ENTORNO DE DESARROLLO ESTILO VS CODE */
    renderVsCodeIdeWorkspace(domKey) {
        const domObj = this.userDomains[domKey];
        const vis = domObj.visibility || 'public';
        const files = this.getDomainProjectFiles(domKey);
        const fileKeys = Object.keys(files);

        if (!files[this.builderActiveFile]) {
            this.builderActiveFile = fileKeys.find(k => k.toLowerCase() === 'index.html') || fileKeys[0] || 'index.html';
        }
        if (!this.builderOpenTabs.includes(this.builderActiveFile)) {
            this.builderOpenTabs.push(this.builderActiveFile);
        }

        const activeFileObj = files[this.builderActiveFile] || { content: '', name: 'index.html' };

        // Análisis tecnológico
        const techAnalysis = window.GensokyoTechDetector ? GensokyoTechDetector.detect(files) : { technologies: [], summary: {} };
        const summary = techAnalysis.summary || {};

        // Versiones
        const versionsObj = domObj.versions || { v1: { fileCount: fileKeys.length, sizeBytes: domObj.sizeBytes || 0 } };
        const versionKeys = Object.keys(versionsObj);
        const activeVer = domObj.activeVersion || versionKeys[versionKeys.length - 1] || 'v1';
        const versionOptions = versionKeys.map(v => `<option value="${v}" ${v === activeVer ? 'selected' : ''}>${v} (${versionsObj[v].fileCount || 1} arch.)</option>`).join('');

        // Lista de archivos en el Explorer
        const fileListHtml = fileKeys.map(fPath => {
            const isAct = fPath === this.builderActiveFile;
            const ext = fPath.split('.').pop().toLowerCase();
            let extClass = 'generic';
            if (['html', 'htm'].includes(ext)) extClass = 'html';
            else if (ext === 'css') extClass = 'css';
            else if (['js', 'mjs'].includes(ext)) extClass = 'js';
            else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'mp3', 'wav'].includes(ext)) extClass = 'asset';

            return `
                <li class="ide-file-item ${isAct ? 'active' : ''}" onclick="GensokyoApp.switchStudioFile('${this.escapeHtml(domKey)}', '${this.escapeHtml(fPath)}')">
                    <span class="ide-file-label">
                        <span class="ide-tag-ext ide-tag-${extClass}">${ext.toUpperCase()}</span>
                        <span>${this.escapeHtml(fPath)}</span>
                    </span>
                    <button class="ide-icon-btn" onclick="event.stopPropagation(); GensokyoApp.deleteStudioFilePrompt('${this.escapeHtml(domKey)}', '${this.escapeHtml(fPath)}')" title="Eliminar archivo">✕</button>
                </li>
            `;
        }).join('');

        // Pestañas abiertas del editor
        const tabsHtml = this.builderOpenTabs.filter(t => files[t]).map(tabPath => {
            const isAct = tabPath === this.builderActiveFile;
            return `
                <div class="ide-tab ${isAct ? 'active' : ''}" onclick="GensokyoApp.switchStudioFile('${this.escapeHtml(domKey)}', '${this.escapeHtml(tabPath)}')">
                    <span>${this.escapeHtml(tabPath)}</span>
                    <span style="font-size:0.75rem; opacity:0.7; padding-left:4px;" onclick="event.stopPropagation(); GensokyoApp.closeStudioTab('${this.escapeHtml(domKey)}', '${this.escapeHtml(tabPath)}')">✕</span>
                </div>
            `;
        }).join('');

        // Generar números de línea
        const contentLines = (activeFileObj.content || '').split('\n');
        const gutterLinesHtml = Array.from({ length: Math.max(contentLines.length, 1) }, (_, i) => i + 1).join('<br>');

        // Empaquetado virtual para la previsualización en vivo
        const bundledHtml = window.GensokyoBundler ? GensokyoBundler.bundle(files) : (activeFileObj.content || '');
        const escapedBundle = this.escapeHtml(bundledHtml);

        const currentSize = summary.totalBytes || 0;
        const maxSizeBytes = 25 * 1024 * 1024;
        const usedMb = (currentSize / (1024 * 1024)).toFixed(2);
        const percentage = Math.min(100, Math.max(1, (currentSize / maxSizeBytes) * 100)).toFixed(1);

        // Chips de tecnología para la status bar
        const techChipsHtml = techAnalysis.technologies.slice(0, 5).map(t => `
            <span class="ide-tech-chip">${t.badge || t.name}</span>
        `).join('');

        return `
            <div class="vscode-ide-container">
                <!-- 1. TOPBAR DE CONTROL DEL IDE -->
                <header class="ide-topbar">
                    <div class="ide-topbar-left">
                        <button class="ide-btn-back" onclick="GensokyoApp.selectDomainForBuilder(null)">
                            ← Mis Dominios
                        </button>
                        <div class="ide-project-title">
                            <span>gensokyo://${this.escapeHtml(domKey)}</span>
                            <span class="ide-badge-version">${this.escapeHtml(activeVer)}</span>
                        </div>
                    </div>

                    <div class="ide-topbar-actions">
                        <select class="ide-select" onchange="GensokyoApp.setDomainVisibility('${this.escapeHtml(domKey)}', this.value)">
                            <option value="public" ${vis === 'public' ? 'selected' : ''}>Público</option>
                            <option value="unlisted" ${vis === 'unlisted' ? 'selected' : ''}>No Listado</option>
                            <option value="private" ${vis === 'private' ? 'selected' : ''}>Privado</option>
                        </select>

                        <select id="studio-version-select" class="ide-select">
                            ${versionOptions}
                        </select>
                        <button class="ide-btn-secondary" onclick="GensokyoApp.rollbackDomainVersion('${this.escapeHtml(domKey)}', document.getElementById('studio-version-select').value)">
                            Rollback
                        </button>

                        <button class="ide-btn-secondary" onclick="GensokyoApp.openTemplatesModal('${this.escapeHtml(domKey)}')">
                            Plantillas
                        </button>

                        <button class="ide-btn-primary" onclick="GensokyoApp.saveActiveStudioFile('${this.escapeHtml(domKey)}')">
                            Guardar [Ctrl+S]
                        </button>

                        <button class="ide-btn-secondary" onclick="GensokyoApp.navigate('gensokyo://${this.escapeHtml(domKey)}')">
                            Abrir en Pestaña ↗
                        </button>
                    </div>
                </header>

                <!-- 2. WORKSPACE DIVIDIDO: EXPLORER + EDITOR + LIVE PREVIEW -->
                <div class="ide-main-workspace">
                    <!-- 2.1 EXPLORER (PANEL LATERAL) -->
                    <aside class="ide-explorer-panel">
                        <div class="ide-explorer-header">
                            <span>Explorador (${fileKeys.length})</span>
                            <div class="ide-explorer-actions">
                                <button class="ide-icon-btn" onclick="GensokyoApp.createNewFilePrompt('${this.escapeHtml(domKey)}')" title="Nuevo Archivo">+</button>
                                <label class="ide-icon-btn" style="cursor:pointer;" title="Subir Carpeta">
                                    <span>DIR</span>
                                    <input type="file" webkitdirectory directory multiple style="display:none;" onchange="GensokyoApp.handleStudioFolderUpload(event, '${this.escapeHtml(domKey)}')">
                                </label>
                                <label class="ide-icon-btn" style="cursor:pointer;" title="Subir Archivos">
                                    <span>FILE</span>
                                    <input type="file" multiple style="display:none;" onchange="GensokyoApp.handleStudioFolderUpload(event, '${this.escapeHtml(domKey)}')">
                                </label>
                            </div>
                        </div>

                        <ul class="ide-file-tree" ondragover="event.preventDefault();" ondrop="GensokyoApp.handleStudioProjectDrop(event, '${this.escapeHtml(domKey)}')">
                            ${fileListHtml}
                        </ul>

                        <div class="ide-explorer-footer">
                            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                                <span>Almacenamiento</span>
                                <span>${usedMb} / 25 MB</span>
                            </div>
                            <div class="ide-quota-progress">
                                <div class="ide-quota-fill" style="width: ${percentage}%;"></div>
                            </div>
                        </div>
                    </aside>

                    <!-- 2.2 COLUMNA DEL EDITOR DE CÓDIGO -->
                    <section class="ide-editor-column">
                        <div class="ide-tabs-bar">
                            ${tabsHtml}
                        </div>

                        <div class="ide-editor-wrapper">
                            <div id="ide-line-gutter" class="ide-gutter">
                                ${gutterLinesHtml}
                            </div>
                            <textarea id="studio-code-editor" class="ide-textarea" spellcheck="false" oninput="GensokyoApp.handleEditorInput()" onkeydown="GensokyoApp.handleCodeEditorKeydown(event, '${this.escapeHtml(domKey)}')">${this.escapeHtml(activeFileObj.content || '')}</textarea>
                        </div>
                    </section>

                    <!-- 2.3 COLUMNA DE VISTA PREVIA EN VIVO (SPLIT LADO A LADO) -->
                    <section class="ide-preview-column">
                        <div class="ide-preview-toolbar">
                            <div class="ide-preview-url-box">
                                <span>gensokyo://${this.escapeHtml(domKey)}/${this.escapeHtml(this.builderActiveFile)}</span>
                            </div>

                            <div style="display:flex; align-items:center; gap:8px;">
                                <div class="ide-device-switch">
                                    <button class="ide-device-btn ${this.builderPreviewDevice === 'desktop' ? 'active' : ''}" onclick="GensokyoApp.setStudioPreviewDevice('desktop')">100%</button>
                                    <button class="ide-device-btn ${this.builderPreviewDevice === 'tablet' ? 'active' : ''}" onclick="GensokyoApp.setStudioPreviewDevice('tablet')">768px</button>
                                    <button class="ide-device-btn ${this.builderPreviewDevice === 'mobile' ? 'active' : ''}" onclick="GensokyoApp.setStudioPreviewDevice('mobile')">375px</button>
                                </div>
                                <button class="ide-icon-btn" onclick="GensokyoApp.reloadStudioPreview('${this.escapeHtml(domKey)}')" title="Recargar">RELOAD</button>
                            </div>
                        </div>

                        <div class="ide-preview-viewport">
                            <iframe id="studio-preview-iframe" class="ide-live-iframe ${this.builderPreviewDevice === 'tablet' ? 'device-tablet' : (this.builderPreviewDevice === 'mobile' ? 'device-mobile' : '')}" sandbox="allow-scripts allow-forms allow-modals" srcdoc="${escapedBundle}"></iframe>
                        </div>
                    </section>
                </div>

                <!-- 3. STATUS BAR INFERIOR ESTILO VS CODE -->
                <footer class="ide-statusbar">
                    <div class="ide-statusbar-section">
                        <span>GensokyoNet IDE</span>
                        <span>UTF-8</span>
                        <span id="ide-status-lines">Líneas: ${contentLines.length}</span>
                        <span>${this.escapeHtml(summary.archetype || 'Sitio Web')}</span>
                    </div>

                    <div class="ide-statusbar-section">
                        ${techChipsHtml}
                        <span>Cuota: 25 MB</span>
                    </div>
                </footer>

                <!-- MODAL DE SELECCIÓN DE PLANTILLAS -->
                <div id="ide-templates-dialog" class="ide-dialog-overlay" style="display:none;" onclick="if(event.target===this){ this.style.display='none'; }">
                    <div class="ide-dialog-card">
                        <div class="ide-dialog-header">
                            <h3>Plantillas de Inicio</h3>
                            <button class="ide-icon-btn" onclick="document.getElementById('ide-templates-dialog').style.display='none'">✕</button>
                        </div>
                        <div class="ide-dialog-item" onclick="GensokyoApp.loadStarterTemplate('${this.escapeHtml(domKey)}', 'danmaku-game')">
                            <div class="ide-dialog-item-title">Mini-Juego Danmaku 2D</div>
                            <div class="ide-dialog-item-desc">Motor Canvas 2D + Web Audio API con bucle a 60fps y patrones de balas.</div>
                        </div>
                        <div class="ide-dialog-item" onclick="GensokyoApp.loadStarterTemplate('${this.escapeHtml(domKey)}', 'shrine-blog')">
                            <div class="ide-dialog-item-title">Bitácora Doujin del Templo</div>
                            <div class="ide-dialog-item-desc">Diseño responsive con CSS Grid/Flexbox y libro de visitas interactivo.</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    openTemplatesModal(domKey) {
        const dialog = document.getElementById('ide-templates-dialog');
        if (dialog) dialog.style.display = 'flex';
    },

    handleEditorInput() {
        const textarea = document.getElementById('studio-code-editor');
        const gutter = document.getElementById('ide-line-gutter');
        const statusLines = document.getElementById('ide-status-lines');
        if (!textarea || !gutter) return;

        const lines = textarea.value.split('\n');
        gutter.innerHTML = Array.from({ length: Math.max(lines.length, 1) }, (_, i) => i + 1).join('<br>');
        if (statusLines) statusLines.innerText = `Líneas: ${lines.length}`;
    },

    switchStudioFile(domKey, filePath) {
        this.builderActiveFile = filePath;
        if (!this.builderOpenTabs.includes(filePath)) {
            this.builderOpenTabs.push(filePath);
        }
        this.renderRoute('gensokyo://builder');
    },

    closeStudioTab(domKey, tabPath) {
        this.builderOpenTabs = this.builderOpenTabs.filter(t => t !== tabPath);
        if (this.builderActiveFile === tabPath) {
            this.builderActiveFile = this.builderOpenTabs[this.builderOpenTabs.length - 1] || 'index.html';
        }
        this.renderRoute('gensokyo://builder');
    },

    setStudioPreviewDevice(mode) {
        this.builderPreviewDevice = mode;
        const iframe = document.getElementById('studio-preview-iframe');
        if (iframe) {
            iframe.className = `ide-live-iframe ${mode === 'tablet' ? 'device-tablet' : (mode === 'mobile' ? 'device-mobile' : '')}`;
        }
        document.querySelectorAll('.ide-device-btn').forEach(b => b.classList.remove('active'));
        if (event && event.target) event.target.classList.add('active');
    },

    reloadStudioPreview(domKey) {
        const files = this.getDomainProjectFiles(domKey);
        const bundled = window.GensokyoBundler ? GensokyoBundler.bundle(files) : '';
        const iframe = document.getElementById('studio-preview-iframe');
        if (iframe) {
            iframe.srcdoc = bundled;
        }
    },

    handleCodeEditorKeydown(e, domKey) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const textarea = e.target;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + 2;
            this.handleEditorInput();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.saveActiveStudioFile(domKey);
        }
    },

    saveActiveStudioFile(domKey) {
        const domObj = this.userDomains[domKey];
        if (!domObj) return;

        const isOwner = this.passport.userId && this.passport.userId !== 'ID#0000' && (domObj.ownerId === this.passport.userId || (Array.isArray(this.passport.ownedDomains) && this.passport.ownedDomains.includes(domKey)));
        if (!isOwner) {
            this.showToastNotification('Acceso Denegado: No tienes permisos para modificar este dominio.', 'error');
            return;
        }

        const textarea = document.getElementById('studio-code-editor');
        if (!textarea) return;

        const files = this.getDomainProjectFiles(domKey);
        const fPath = this.builderActiveFile;
        const newContent = textarea.value;

        if (files[fPath]) {
            files[fPath].content = newContent;
            files[fPath].size = newContent.length;
        } else {
            files[fPath] = {
                name: fPath.split('/').pop(),
                path: fPath,
                type: 'text/plain',
                content: newContent,
                size: newContent.length
            };
        }

        this.deployProjectUpdate(domKey, files);
    },

    createNewFilePrompt(domKey) {
        const name = prompt('Nombre del nuevo archivo (ej: style.css, js/app.js, about.html):');
        if (!name) return;
        const cleanName = name.trim().replace(/^[./]+/, '');
        if (!cleanName) return;

        const files = this.getDomainProjectFiles(domKey);
        if (files[cleanName]) {
            this.showToastNotification('El archivo ya existe en este proyecto.', 'error');
            return;
        }

        let initialContent = '';
        if (cleanName.endsWith('.html')) initialContent = '<!DOCTYPE html>\n<html>\n<head>\n  <title>Página</title>\n</head>\n<body>\n  <h1>Nueva Página</h1>\n</body>\n</html>';
        else if (cleanName.endsWith('.css')) initialContent = '/* Estilos adicionales */\nbody {\n  margin: 0;\n}\n';
        else if (cleanName.endsWith('.js')) initialContent = '// Script adicional\nconsole.log("Cargado");\n';

        files[cleanName] = {
            name: cleanName.split('/').pop(),
            path: cleanName,
            type: cleanName.endsWith('.html') ? 'text/html' : (cleanName.endsWith('.css') ? 'text/css' : 'application/javascript'),
            content: initialContent,
            size: initialContent.length
        };

        this.builderActiveFile = cleanName;
        if (!this.builderOpenTabs.includes(cleanName)) this.builderOpenTabs.push(cleanName);
        this.deployProjectUpdate(domKey, files);
    },

    deleteStudioFilePrompt(domKey, fPath) {
        const files = this.getDomainProjectFiles(domKey);
        if (Object.keys(files).length <= 1) {
            this.showToastNotification('No puedes eliminar el único archivo del proyecto.', 'error');
            return;
        }
        if (!confirm(`¿Eliminar ${fPath}?`)) return;

        delete files[fPath];
        this.builderOpenTabs = this.builderOpenTabs.filter(t => t !== fPath);
        this.builderActiveFile = this.builderOpenTabs[0] || Object.keys(files)[0];
        this.deployProjectUpdate(domKey, files);
    },

    loadStarterTemplate(domKey, templateId) {
        const dialog = document.getElementById('ide-templates-dialog');
        if (dialog) dialog.style.display = 'none';

        if (!window.GensokyoTemplates || !GensokyoTemplates.templates[templateId]) {
            this.showToastNotification('Plantilla no encontrada.', 'error');
            return;
        }

        const template = GensokyoTemplates.templates[templateId];
        const rawFiles = template.files;
        const formattedFiles = {};

        for (const [p, content] of Object.entries(rawFiles)) {
            const ext = p.split('.').pop().toLowerCase();
            let mime = 'text/plain';
            if (ext === 'html') mime = 'text/html';
            else if (ext === 'css') mime = 'text/css';
            else if (ext === 'js') mime = 'application/javascript';

            formattedFiles[p] = {
                name: p.split('/').pop(),
                path: p,
                type: mime,
                content: content,
                size: content.length
            };
        }

        this.builderActiveFile = 'index.html';
        this.builderOpenTabs = Object.keys(formattedFiles);
        this.deployProjectUpdate(domKey, formattedFiles);
        this.showToastNotification(`Plantilla "${template.name}" cargada con éxito.`, 'success');
    },

    deployProjectUpdate(domKey, files) {
        const domObj = this.userDomains[domKey];
        if (!domObj) return;

        const bundledHtml = window.GensokyoBundler ? GensokyoBundler.bundle(files) : (files['index.html'] ? files['index.html'].content : '');
        const techAnalysis = window.GensokyoTechDetector ? GensokyoTechDetector.detect(files) : { summary: {} };

        if (!domObj.versions) {
            domObj.versions = {
                v1: { versionTag: 'v1', htmlContent: domObj.htmlContent || '', sizeBytes: 0, createdAt: new Date().toISOString() }
            };
        }

        const versionKeys = Object.keys(domObj.versions);
        const nextVersionTag = `v${versionKeys.length + 1}`;
        const totalSize = techAnalysis.summary.totalBytes || bundledHtml.length;

        domObj.versions[nextVersionTag] = {
            versionTag: nextVersionTag,
            htmlContent: bundledHtml,
            files: files,
            sizeBytes: totalSize,
            fileCount: Object.keys(files).length,
            createdAt: new Date().toISOString()
        };

        domObj.activeVersion = nextVersionTag;
        domObj.files = files;
        domObj.htmlContent = bundledHtml;
        domObj.sizeBytes = totalSize;
        domObj.techStack = techAnalysis;

        if (window.GensokyoVFS) {
            GensokyoVFS.saveProject(domKey, nextVersionTag, files, techAnalysis);
        }

        this.saveUserDomains();
        if (this.notifyRemoteDomainMutation) {
            this.notifyRemoteDomainMutation(domKey, nextVersionTag, 'deploy').catch(() => {});
        }
        this.renderRoute('gensokyo://builder');
        this.showToastNotification(`Proyecto desplegado: Versión ${nextVersionTag} (${Object.keys(files).length} archivos).`, 'success');
    },

    handleStudioFolderUpload(event, domainName) {
        const fileList = Array.from(event.target.files || []);
        if (fileList.length === 0) return;
        this.processProjectFiles(fileList, domainName);
    },

    async handleStudioProjectDrop(event, domainName) {
        event.preventDefault();
        const items = event.dataTransfer.items;
        const fileEntries = [];

        if (items && items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.webkitGetAsEntry) {
                    const entry = item.webkitGetAsEntry();
                    if (entry) {
                        const extracted = await this.readFileSystemEntry(entry);
                        fileEntries.push(...extracted);
                    }
                }
            }
        }

        if (fileEntries.length > 0) {
            this.processProjectFiles(fileEntries, domainName);
        } else {
            const rawFiles = Array.from(event.dataTransfer.files || []);
            if (rawFiles.length > 0) this.processProjectFiles(rawFiles, domainName);
        }
    },

    async readFileSystemEntry(entry, currentPath = '') {
        if (entry.isFile) {
            return new Promise((resolve) => {
                entry.file((file) => {
                    file.customRelativePath = currentPath + file.name;
                    resolve([file]);
                }, () => resolve([]));
            });
        } else if (entry.isDirectory) {
            const dirReader = entry.createReader();
            const entries = await new Promise((resolve) => {
                dirReader.readEntries((results) => resolve(results || []), () => resolve([]));
            });

            const nested = await Promise.all(
                entries.map(child => this.readFileSystemEntry(child, currentPath + entry.name + '/'))
            );
            return nested.flat();
        }
        return [];
    },

    async processProjectFiles(filesList, domainName) {
        const domObj = this.userDomains[domainName];
        if (!domObj) return;

        const isOwner = this.passport.userId && this.passport.userId !== 'ID#0000' && (domObj.ownerId === this.passport.userId || (Array.isArray(this.passport.ownedDomains) && this.passport.ownedDomains.includes(domainName)));
        if (!isOwner) {
            this.showToastNotification('Acceso Denegado: No tienes permisos para modificar este dominio.', 'error');
            return;
        }

        if (!filesList || filesList.length === 0) {
            this.showToastNotification('No se recibieron archivos válidos.', 'error');
            return;
        }

        const projectFiles = {};
        const textExtensions = ['html', 'htm', 'css', 'js', 'mjs', 'json', 'svg', 'txt', 'md', 'xml'];

        for (const file of filesList) {
            let rawPath = file.customRelativePath || file.webkitRelativePath || file.name;
            const parts = rawPath.split('/').filter(Boolean);
            let normalizedPath = parts.length > 1 ? parts.slice(1).join('/') : parts[0];
            if (!normalizedPath || normalizedPath === '.') normalizedPath = file.name;

            const ext = normalizedPath.split('.').pop().toLowerCase();
            const isText = textExtensions.includes(ext);

            try {
                const content = await this.readFileContent(file, isText);
                projectFiles[normalizedPath] = {
                    name: file.name,
                    path: normalizedPath,
                    type: file.type || (isText ? `text/${ext}` : 'application/octet-stream'),
                    isBinary: !isText,
                    content: content,
                    size: file.size || (content ? content.length : 0)
                };
            } catch (err) {
                console.warn(`[GensokyoNet IDE] Error al leer archivo ${normalizedPath}:`, err);
            }
        }

        const keys = Object.keys(projectFiles);
        if (keys.length === 0) {
            this.showToastNotification('No se pudo procesar ningún archivo.', 'error');
            return;
        }

        // Límite estricto de 25 MB por paquete (Medios pesados a bucket externo)
        const maxSizeBytes = 25 * 1024 * 1024;
        const totalProjectBytes = Object.values(projectFiles).reduce((acc, f) => acc + (f.size || 0), 0);
        if (totalProjectBytes > maxSizeBytes) {
            const mb = (totalProjectBytes / (1024 * 1024)).toFixed(2);
            this.showToastNotification(`Límite superado: El paquete pesa ${mb} MB (máx. 25 MB). Aloja videos y medios pesados en tu bucket externo.`, 'error');
            return;
        }

        let mainHtml = keys.find(k => k.toLowerCase() === 'index.html')
            || keys.find(k => k.toLowerCase().endsWith('/index.html'))
            || keys.find(k => k.toLowerCase().endsWith('.html') || k.toLowerCase().endsWith('.htm'));

        if (!mainHtml) {
            mainHtml = 'index.html';
            projectFiles['index.html'] = {
                name: 'index.html',
                path: 'index.html',
                type: 'text/html',
                isBinary: false,
                content: `<!DOCTYPE html><html><head><title>${domainName}</title></head><body style="font-family:sans-serif; padding:30px;"><h1>${domainName}</h1><ul>${keys.map(k => `<li><a href="${k}">${k}</a></li>`).join('')}</ul></body></html>`,
                size: 200
            };
        }

        this.builderActiveFile = mainHtml;
        this.builderOpenTabs = keys.slice(0, 6);
        this.deployProjectUpdate(domainName, projectFiles);

        const tech = window.GensokyoTechDetector ? GensokyoTechDetector.detect(projectFiles) : null;
        const techNames = tech && tech.technologies ? tech.technologies.map(t => t.name).join(', ') : '';
        this.showToastNotification(`Proyecto importado (${keys.length} archivos). Tecnologías: ${techNames || 'HTML5 Estándar'}`, 'success');
    },

    readFileContent(file, isText) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            if (isText) reader.readAsText(file);
            else reader.readAsDataURL(file);
        });
    },

    rollbackDomainVersion(domainName, versionTag) {
        const domObj = this.userDomains[domainName];
        if (!domObj || !domObj.versions || !domObj.versions[versionTag]) return;

        const isOwner = this.passport.userId && this.passport.userId !== 'ID#0000' && (domObj.ownerId === this.passport.userId || (Array.isArray(this.passport.ownedDomains) && this.passport.ownedDomains.includes(domainName)));
        if (!isOwner) {
            this.showToastNotification('Acceso Denegado: No tienes permisos para gestionar este dominio.', 'error');
            return;
        }

        const verData = domObj.versions[versionTag];
        domObj.activeVersion = versionTag;
        domObj.htmlContent = verData.htmlContent;
        if (verData.files) {
            domObj.files = verData.files;
            this.builderActiveFile = Object.keys(verData.files)[0] || 'index.html';
            this.builderOpenTabs = Object.keys(verData.files).slice(0, 5);
        }

        this.saveUserDomains();
        if (this.notifyRemoteDomainMutation) {
            this.notifyRemoteDomainMutation(domainName, versionTag, 'rollback').catch(() => {});
        }
        this.renderRoute('gensokyo://builder');
        this.showToastNotification(`Rollback: Dominio gensokyo://${domainName} restaurado a ${versionTag}.`, 'success');
    },

    handleProjectFolderUpload(e, domainName) {
        this.handleStudioFolderUpload(e, domainName);
    },

    handleProjectDrop(e, domainName) {
        this.handleStudioProjectDrop(e, domainName);
    },

    saveEditorContent(domainName) {
        this.saveActiveStudioFile(domainName);
    }
});
