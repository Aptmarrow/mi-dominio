Object.assign(GensokyoApp, {
    getRegisterView() {
        if (!this.passport.isRegistered) {
            return `
                <div class="th-card" style="max-width: 600px; margin: 40px auto; text-align: center;">
                    <h2 class="th-card-title" style="color: var(--th-crimson); margin-bottom: 12px;">Registro de Dominio Protegido</h2>
                    <p style="line-height: 1.6; margin-bottom: 20px;">
                        Las cuentas sin registrar (<strong>Nameless Youkai</strong>) no pueden reclamar dominios para evitar suplantaciones.<br><br>
                        Regístrate gratis en tu Pasaporte asignándole una contraseña para obtener tu ID propio.
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
                            <input type="text" id="reg-alias" class="gx-url-input" style="border: 1.5px solid var(--th-crimson); border-radius: 6px; padding: 10px 14px;" placeholder="ej. marisa-blog, scarlet-mansion" required spellcheck="false">
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
                    <button type="submit" class="gx-btn-go" style="padding: 12px 24px; font-size: 1rem;">Reclamar Dominio Gratis</button>
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

        // Dominio recién registrado se inicia sin contenido (En construcción)
        const emptyHtml = '';

        this.userDomains[fullDomain] = {
            title: titleInput.value.trim(),
            author: this.passport.username,
            ownerId: this.passport.userId,
            suffix,
            visibility: 'public',
            activeVersion: 'v1',
            versions: {
                v1: {
                    versionTag: 'v1',
                    htmlContent: emptyHtml,
                    sizeBytes: 0,
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
        this.showToastNotification(`¡Dominio gensokyo://${fullDomain} registrado a tu nombre!`, 'success');
        this.navigate('gensokyo://builder');
    },

    selectDomainForBuilder(domainName) {
        this.builderSelectedDomain = domainName;
        this.renderRoute('gensokyo://builder');
    },

    setDomainVisibility(domainName, visibilityTag) {
        const domObj = this.userDomains[domainName];
        if (!domObj) return;

        const isOwner = this.passport.userId && this.passport.userId !== 'ID#0000' && (domObj.ownerId === this.passport.userId || (Array.isArray(this.passport.ownedDomains) && this.passport.ownedDomains.includes(domainName)));

        if (!isOwner) {
            this.showToastNotification('Acceso Denegado 🛑: No tienes permisos para modificar este dominio.', 'error');
            return;
        }

        domObj.visibility = visibilityTag;
        this.saveUserDomains();

        let label = 'Público y Listado';
        if (visibilityTag === 'unlisted') label = 'No Listado (Solo Dirección Directa)';
        if (visibilityTag === 'private') label = 'Completamente Privado';

        this.showToastNotification(`Visibilidad de gensokyo://${domainName} actualizada a: ${label}`, 'success');
        this.renderRoute('gensokyo://builder');
    },

    /* PANEL DE CONTROL DE DOMINIOS EN 2 NIVELES CON GESTIÓN DE VISIBILIDAD, DESPLIEGUE VS CODE Y ROLLBACK */
    getBuilderView() {
        if (!this.passport.isRegistered) {
            return `
                <div class="th-card" style="max-width: 600px; margin: 40px auto; text-align: center;">
                    <h2 class="th-card-title" style="color: var(--th-crimson); margin-bottom: 12px;">Acceso Denegado al Creador Web</h2>
                    <p style="line-height: 1.6; margin-bottom: 20px;">
                        Las cuentas sin registrar (<strong>Nameless Youkai</strong>) no poseen dominios.<br>
                        Regístrate en tu Pasaporte para crear e independizar tus propios sitios.
                    </p>
                    <button class="gx-btn-go" style="padding: 12px 24px; font-size: 1rem;" onclick="GensokyoApp.showPassportModal()">
                        Abrir Pasaporte
                    </button>
                </div>
            `;
        }

        // Filtra ÚNICAMENTE los dominios pertenecientes a la cuenta actual por ownerId
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
                        <button class="gx-btn-go" style="padding:12px 24px;" onclick="GensokyoApp.navigate('gensokyo://register')">Reclamar tu Primer Dominio Gratis ➔</button>
                    </div>
                </div>
            `;
        }

        // NIVEL 2: PANTALLA DE GESTIÓN INDIVIDUAL DE UN DOMINIO SELECCIONADO
        if (this.builderSelectedDomain && myOwnedDomains.includes(this.builderSelectedDomain)) {
            const domKey = this.builderSelectedDomain;
            const domObj = this.userDomains[domKey];
            const vis = domObj.visibility || 'public';

            const versionsObj = domObj.versions || { v1: { htmlContent: domObj.htmlContent || '', sizeBytes: (domObj.htmlContent || '').length } };
            const versionKeys = Object.keys(versionsObj);
            const activeVer = domObj.activeVersion || versionKeys[versionKeys.length - 1] || 'v1';

            const activeContent = versionsObj[activeVer] ? versionsObj[activeVer].htmlContent : domObj.htmlContent;
            const currentSize = (versionsObj[activeVer] ? versionsObj[activeVer].sizeBytes : (activeContent || '').length) || 0;

            const maxSizeBytes = 25 * 1024 * 1024; // 25 MB soft limit
            const usedMb = (currentSize / (1024 * 1024)).toFixed(2);
            const percentage = Math.min(100, Math.max(1, (currentSize / maxSizeBytes) * 100)).toFixed(1);

            const versionOptions = versionKeys.map((v) => `<option value="${v}" ${v === activeVer ? 'selected' : ''}>${v} (${(versionsObj[v].sizeBytes ? (versionsObj[v].sizeBytes / 1024).toFixed(1) : 0)} KB)</option>`).join('');

            return `
                <div style="max-width: 900px; margin: 0 auto;">
                    <div style="margin-bottom: 16px; display:flex; align-items:center; justify-content:space-between;">
                        <button class="gx-btn-go" style="background:var(--th-bg-main); border:1.5px solid var(--th-border-warm); color:var(--th-text-main);" onclick="GensokyoApp.selectDomainForBuilder(null)">
                            ← Volver a Mis Dominios
                        </button>
                        <span class="version-badge">Versión Activa: ${this.escapeHtml(activeVer)}</span>
                    </div>

                    <div class="th-card" style="margin-bottom: 24px; border: 1.5px solid var(--th-crimson);">
                        <div class="th-card-header" style="margin-bottom: 16px;">
                            <div>
                                <h1 style="font-family:var(--font-heading); font-size:1.4rem; color:var(--th-crimson); margin-bottom:2px;">gensokyo://${this.escapeHtml(domKey)}</h1>
                                <span style="font-size:0.85rem; color:var(--th-text-sub); font-weight:600;">Título: ${this.escapeHtml(domObj.title)}</span>
                            </div>
                            <button class="gx-btn-go" onclick="GensokyoApp.navigate('gensokyo://${this.escapeHtml(domKey)}')">Ver en la Red ➔</button>
                        </div>

                        <!-- SELECTOR DE VISIBILIDAD DE 3 OPCIONES -->
                        <div style="background:var(--th-bg-main); border:1.5px solid var(--th-border-warm); padding:16px 20px; border-radius:10px; margin-bottom:16px;">
                            <label style="display:block; font-family:var(--font-heading); font-weight:700; color:var(--th-crimson); margin-bottom:10px; font-size:0.9rem;">Configuración de Visibilidad del Dominio:</label>
                            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                                <button type="button" class="gx-btn-go" style="flex:1; min-width:180px; padding:10px; background:${vis === 'public' ? 'var(--th-crimson)' : 'var(--th-bg-card)'}; color:${vis === 'public' ? '#ffffff' : 'var(--th-text-main)'}; border:1.5px solid var(--th-crimson);" onclick="GensokyoApp.setDomainVisibility('${this.escapeHtml(domKey)}', 'public')">
                                    🟢 Público y Listado
                                </button>
                                <button type="button" class="gx-btn-go" style="flex:1; min-width:180px; padding:10px; background:${vis === 'unlisted' ? '#f57c00' : 'var(--th-bg-card)'}; color:${vis === 'unlisted' ? '#ffffff' : 'var(--th-text-main)'}; border:1.5px solid #f57c00;" onclick="GensokyoApp.setDomainVisibility('${this.escapeHtml(domKey)}', 'unlisted')">
                                    🟡 No Listado (Solo URL Directa)
                                </button>
                                <button type="button" class="gx-btn-go" style="flex:1; min-width:180px; padding:10px; background:${vis === 'private' ? '#c62828' : 'var(--th-bg-card)'}; color:${vis === 'private' ? '#ffffff' : 'var(--th-text-main)'}; border:1.5px solid #c62828;" onclick="GensokyoApp.setDomainVisibility('${this.escapeHtml(domKey)}', 'private')">
                                    🔴 Completamente Privado
                                </button>
                            </div>
                            <p style="font-size:0.82rem; color:var(--th-text-sub); margin-top:10px; margin-bottom:0; line-height:1.4;">
                                ${vis === 'public' ? '<strong>Estado Actual:</strong> Listado en las búsquedas de GensokyoNet y accesible para todos los usuarios.' : ''}
                                ${vis === 'unlisted' ? '<strong>Estado Actual:</strong> Oculto en las búsquedas de GensokyoNet. Accesible solo para quienes tengan la dirección directa gensokyo://' + this.escapeHtml(domKey) + '.' : ''}
                                ${vis === 'private' ? '<strong>Estado Actual:</strong> Protegido por barrera mística. Nadie excepto tú puede acceder a esta página.' : ''}
                            </p>
                        </div>

                        <!-- CONTROL DE VERSIONES & ROLLBACK -->
                        <div style="background:var(--th-bg-main); border:1px solid var(--th-border-warm); padding:12px 16px; border-radius:8px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="font-family:var(--font-heading); font-weight:700; font-size:0.85rem; color:var(--th-crimson);">Historial de Despliegues:</span>
                                <select id="version-select-${this.escapeHtml(domKey)}" style="background:var(--th-bg-card); border:1px solid var(--th-crimson); color:var(--th-text-main); padding:6px 10px; border-radius:6px; font-weight:700; font-size:0.85rem;">
                                    ${versionOptions}
                                </select>
                            </div>
                            <button class="gx-btn-go" style="padding:6px 14px; font-size:0.8rem; background:var(--th-bg-main); border:1px solid var(--th-crimson); color:var(--th-crimson);" onclick="GensokyoApp.rollbackDomainVersion('${this.escapeHtml(domKey)}', document.getElementById('version-select-${this.escapeHtml(domKey)}').value)">
                                Restaurar Versión (Rollback)
                            </button>
                        </div>

                        <!-- ZONA DRAG & DROP / SUBIDA DE CARPETA VS CODE -->
                        <div class="project-drop-zone" onclick="document.getElementById('file-upload-${this.escapeHtml(domKey)}').click()" ondragover="event.preventDefault(); this.classList.add('dragover');" ondragleave="this.classList.remove('dragover');" ondrop="GensokyoApp.handleProjectDrop(event, '${this.escapeHtml(domKey)}')">
                            <input type="file" id="file-upload-${this.escapeHtml(domKey)}" webkitdirectory directory multiple style="display:none;" onchange="GensokyoApp.handleProjectFolderUpload(event, '${this.escapeHtml(domKey)}')">
                            <div class="project-drop-icon">📁</div>
                            <h3 style="font-family:var(--font-heading); font-size:1.05rem; color:var(--th-crimson); margin-bottom:4px;">Subir Proyecto desde VS Code / PC</h3>
                            <p style="font-size:0.85rem; color:var(--th-text-sub);">Haz clic para elegir la carpeta de tu proyecto o arrastra tu archivo <strong>index.html</strong> aquí.</p>
                        </div>

                        <!-- BARRA DE CUOTA DE ALMACENAMIENTO (SOFT-LIMIT 25 MB) -->
                        <div class="storage-quota-bar-container">
                            <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700; color:var(--th-crimson);">
                                <span>Uso del Bucket (Cuota Máxima 25 MB)</span>
                                <span>${usedMb} MB / 25 MB (${percentage}%)</span>
                            </div>
                            <div class="storage-quota-bar">
                                <div class="storage-quota-fill" style="width: ${percentage}%;"></div>
                            </div>
                        </div>

                        <!-- EDITOR EN LÍNEA -->
                        <div style="margin-bottom: 14px;">
                            <label style="display: block; font-family: var(--font-heading); font-weight: 700; color: var(--th-crimson); margin-bottom: 6px;">Código HTML / Touhou UI en vivo:</label>
                            <textarea id="builder-editor-${this.escapeHtml(domKey)}" style="width: 100%; height: 200px; background: var(--th-bg-main); border: 1.5px solid var(--th-border-warm); border-radius: 6px; padding: 12px; font-family: monospace; font-size: 0.88rem; color: var(--th-text-main);">${this.escapeHtml(activeContent)}</textarea>
                        </div>

                        <div style="display: flex; gap: 12px;">
                            <button class="gx-btn-go" onclick="GensokyoApp.saveEditorContent('${this.escapeHtml(domKey)}')">Guardar Nueva Versión</button>
                            <button class="gx-btn-go" style="background: var(--th-bg-main); border: 1px solid var(--th-border-warm); color: var(--th-text-main);" onclick="GensokyoApp.navigate('gensokyo://${this.escapeHtml(domKey)}')">Ver en la Red ➔</button>
                        </div>
                    </div>
                </div>
            `;
        }

        // NIVEL 1: LISTADO PRINCIPAL DE TODOS LOS DOMINIOS RECLAMADOS
        const domainCardsHtml = myOwnedDomains.map((domKey) => {
            const domObj = this.userDomains[domKey];
            const vis = domObj.visibility || 'public';
            const versionsObj = domObj.versions || { v1: { htmlContent: domObj.htmlContent || '', sizeBytes: (domObj.htmlContent || '').length } };
            const activeVer = domObj.activeVersion || 'v1';
            const currentSize = (versionsObj[activeVer] ? versionsObj[activeVer].sizeBytes : (domObj.htmlContent || '').length) || 0;
            const usedMb = (currentSize / (1024 * 1024)).toFixed(2);

            let visBadgeHtml = '<span class="version-badge" style="background:#2e7d32;">🟢 Público y Listado</span>';
            if (vis === 'unlisted') visBadgeHtml = '<span class="version-badge" style="background:#f57c00;">🟡 No Listado</span>';
            if (vis === 'private') visBadgeHtml = '<span class="version-badge" style="background:#c62828;">🔴 Privado</span>';

            return `
                <div class="th-card" style="margin-bottom: 16px; border: 1.5px solid var(--th-border-warm); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
                    <div>
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
                            <h2 style="font-family:var(--font-heading); font-size:1.2rem; color:var(--th-crimson); margin:0;">gensokyo://${this.escapeHtml(domKey)}</h2>
                            ${visBadgeHtml}
                        </div>
                        <p style="font-size:0.85rem; color:var(--th-text-sub); margin:0;">
                            Título: <strong>${this.escapeHtml(domObj.title)}</strong> • Almacenamiento: ${usedMb} MB / 25 MB
                        </p>
                    </div>

                    <div style="display:flex; gap:10px;">
                        <button class="gx-btn-go" style="padding:8px 16px; font-size:0.85rem;" onclick="GensokyoApp.selectDomainForBuilder('${this.escapeHtml(domKey)}')">
                            Gestionar / Editar Dominio ⚙️
                        </button>
                        <button class="gx-btn-go" style="background:var(--th-bg-main); border:1px solid var(--th-border-warm); color:var(--th-text-main); padding:8px 14px; font-size:0.85rem;" onclick="GensokyoApp.navigate('gensokyo://${this.escapeHtml(domKey)}')">
                            Visitar ➔
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div style="max-width: 900px; margin: 0 auto;">
                <div style="margin-bottom: 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                    <div>
                        <h1 style="font-family:var(--font-heading); font-size:1.6rem; color:var(--th-crimson); text-transform:uppercase;">Panel de Administración Web</h1>
                        <p style="font-size:0.88rem; color:var(--th-text-sub);">Selecciona uno de tus dominios reclamados para gestionar sus archivos, visibilidad y versiones.</p>
                    </div>
                    <button class="gx-btn-go" onclick="GensokyoApp.navigate('gensokyo://register')">+ Registrar Nuevo Dominio</button>
                </div>
                ${domainCardsHtml}
            </div>
        `;
    },

    /* PROCESAMIENTO DE CARPETA DE PROYECTO DESDE PC / VS CODE */
    handleProjectFolderUpload(event, domainName) {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;
        this.processProjectFiles(files, domainName);
    },

    handleProjectDrop(event, domainName) {
        event.preventDefault();
        const dropZone = event.currentTarget;
        if (dropZone) dropZone.classList.remove('dragover');

        const files = Array.from(event.dataTransfer.files || []);
        if (files.length === 0) return;
        this.processProjectFiles(files, domainName);
    },

    processProjectFiles(files, domainName) {
        const domObj = this.userDomains[domainName];
        if (!domObj) return;

        // Validación Estricta de Propietario (ownerId únicamente)
        const isOwner = this.passport.userId && this.passport.userId !== 'ID#0000' && (domObj.ownerId === this.passport.userId || (Array.isArray(this.passport.ownedDomains) && this.passport.ownedDomains.includes(domainName)));
        if (!isOwner) {
            this.showToastNotification('Acceso Denegado 🛑: No tienes permisos para modificar este dominio.', 'error');
            return;
        }

        // Calcula el tamaño total de los archivos del proyecto
        let totalSizeBytes = files.reduce((acc, f) => acc + f.size, 0);
        const maxSizeBytes = 25 * 1024 * 1024; // 25 MB limit

        if (totalSizeBytes > maxSizeBytes) {
            this.showToastNotification(`Error: El proyecto mide ${(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB y supera el límite de 25 MB. Enlaza archivos pesados desde GitHub u otra plataforma.`, 'error');
            return;
        }

        // Busca el archivo principal index.html o el primer .html
        let mainHtmlFile = files.find(f => f.name.toLowerCase() === 'index.html') || files.find(f => f.name.toLowerCase().endsWith('.html'));

        if (!mainHtmlFile) {
            this.showToastNotification('No se encontró ningún archivo .html en la carpeta seleccionada.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const htmlText = e.target.result;

            if (!domObj.versions) {
                domObj.versions = {
                    v1: { versionTag: 'v1', htmlContent: domObj.htmlContent || '', sizeBytes: (domObj.htmlContent || '').length, createdAt: new Date().toISOString() }
                };
            }

            const versionKeys = Object.keys(domObj.versions);
            const nextVersionNumber = versionKeys.length + 1;
            const nextVersionTag = `v${nextVersionNumber}`;

            domObj.versions[nextVersionTag] = {
                versionTag: nextVersionTag,
                htmlContent: htmlText,
                sizeBytes: totalSizeBytes || htmlText.length,
                createdAt: new Date().toISOString(),
                fileCount: files.length
            };

            domObj.activeVersion = nextVersionTag;
            domObj.htmlContent = htmlText;

            this.saveUserDomains();
            this.renderRoute('gensokyo://builder');
            this.showToastNotification(`¡Proyecto desplegado con éxito! Versión ${nextVersionTag} activa en gensokyo://${domainName}.`, 'success');
        };

        reader.readAsText(mainHtmlFile);
    },

    saveEditorContent(domainName) {
        const domObj = this.userDomains[domainName];
        if (!domObj) return;

        const isOwner = this.passport.userId && this.passport.userId !== 'ID#0000' && (domObj.ownerId === this.passport.userId || (Array.isArray(this.passport.ownedDomains) && this.passport.ownedDomains.includes(domainName)));
        if (!isOwner) {
            this.showToastNotification('Acceso Denegado 🛑: No tienes permisos para modificar este dominio.', 'error');
            return;
        }

        const textarea = document.getElementById(`builder-editor-${domainName}`);
        if (!textarea) return;

        const newHtml = textarea.value;

        if (!domObj.versions) {
            domObj.versions = {
                v1: { versionTag: 'v1', htmlContent: domObj.htmlContent || '', sizeBytes: (domObj.htmlContent || '').length, createdAt: new Date().toISOString() }
            };
        }

        const versionKeys = Object.keys(domObj.versions);
        const nextVersionNumber = versionKeys.length + 1;
        const nextVersionTag = `v${nextVersionNumber}`;

        domObj.versions[nextVersionTag] = {
            versionTag: nextVersionTag,
            htmlContent: newHtml,
            sizeBytes: newHtml.length,
            createdAt: new Date().toISOString(),
            fileCount: 1
        };

        domObj.activeVersion = nextVersionTag;
        domObj.htmlContent = newHtml;

        this.saveUserDomains();
        this.renderRoute('gensokyo://builder');
        this.showToastNotification(`¡Guardado exitoso! Nueva versión ${nextVersionTag} desplegada en gensokyo://${domainName}.`, 'success');
    },

    /* RESTAURACIÓN / ROLLBACK DE VERSIONES ANTERIORES */
    rollbackDomainVersion(domainName, versionTag) {
        const domObj = this.userDomains[domainName];
        if (!domObj || !domObj.versions || !domObj.versions[versionTag]) return;

        const isOwner = this.passport.userId && this.passport.userId !== 'ID#0000' && (domObj.ownerId === this.passport.userId || (Array.isArray(this.passport.ownedDomains) && this.passport.ownedDomains.includes(domainName)));
        if (!isOwner) {
            this.showToastNotification('Acceso Denegado 🛑: No tienes permisos para gestionar este dominio.', 'error');
            return;
        }

        domObj.activeVersion = versionTag;
        domObj.htmlContent = domObj.versions[versionTag].htmlContent;

        this.saveUserDomains();
        this.renderRoute('gensokyo://builder');
        this.showToastNotification(`¡Rollback Exitoso! Dominio gensokyo://${domainName} restaurado a la versión ${versionTag}.`, 'success');
    }
});
