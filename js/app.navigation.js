Object.assign(GensokyoApp, {
    createNewTab(url = 'gensokyo://home', customTitle = null) {
        const tabId = `tab-${this.nextTabId++}`;
        const newTab = {
            id: tabId,
            title: customTitle || this.getTabTitleFromUrl(url),
            url,
            history: [url],
            historyIndex: 0
        };

        this.tabs.push(newTab);
        this.switchTab(tabId);
    },

    closeTab(tabId, event) {
        if (event) event.stopPropagation();

        if (this.tabs.length <= 1) {
            this.tabs[0].url = 'gensokyo://home';
            this.tabs[0].title = 'Inicio';
            this.tabs[0].history = ['gensokyo://home'];
            this.tabs[0].historyIndex = 0;
            this.switchTab(this.tabs[0].id);
            return;
        }

        const index = this.tabs.findIndex((t) => t.id === tabId);
        if (index === -1) return;

        this.tabs.splice(index, 1);
        if (this.activeTabId === tabId) {
            const nextActive = this.tabs[Math.max(0, index - 1)];
            this.switchTab(nextActive.id);
            return;
        }

        this.renderTabsBar();
    },

    switchTab(tabId) {
        this.activeTabId = tabId;
        const activeTab = this.getActiveTab();
        if (!activeTab) return;

        this.renderTabsBar();
        this.updateUrlInput(activeTab.url);
        this.renderRoute(activeTab.url);
        this.updateSidebarActiveState(activeTab.url);
    },

    getActiveTab() {
        return this.tabs.find((t) => t.id === this.activeTabId);
    },

    renderTabsBar() {
        const bar = document.getElementById('th-tabs-bar');
        if (!bar) return;

        bar.innerHTML = this.tabs.map((tab) => `
            <div class="gx-tab ${tab.id === this.activeTabId ? 'active' : ''}" onclick="GensokyoApp.switchTab('${tab.id}')">
                <span class="gx-tab-title">${this.escapeHtml(tab.title)}</span>
                <span class="gx-tab-close" onclick="GensokyoApp.closeTab('${tab.id}', event)">
                    <svg style="width:10px; height:10px;" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </span>
            </div>
        `).join('');
    },

    getTabTitleFromUrl(url) {
        const clean = url.replace('gensokyo://', '').trim().toLowerCase();
        if (clean === 'home' || clean === '') return 'Inicio';
        if (clean.startsWith('search')) return 'Búsqueda';
        if (clean === 'bunbunmaru.news') return 'Bunbunmaru';
        if (clean === 'reimu.shrine') return 'reimu.shrine';
        if (clean === 'register') return 'Reclamar Dominio';
        if (clean === 'builder') return 'Creador Web';
        if (clean.includes('localhost') || clean.includes('127.0.0.1')) return `Localhost (${clean})`;
        return clean;
    },

    submitUrl() {
        const input = document.getElementById('th-url-input');
        if (!input) return;

        let rawVal = input.value.trim();
        rawVal = rawVal.replace(/^(gensokyo|outside):\/\//i, '').replace(/^https?:\/\//i, '').trim();

        const isLocalhost = this.isLocalhostDomain(rawVal);
        const isExternal = !isLocalhost && this.isExternalDomain(rawVal);

        if (!isLocalhost && !isExternal && !rawVal.includes('.') && !['search', 'register', 'builder', 'home', ''].includes(rawVal)) {
            this.navigate(`gensokyo://search?q=${encodeURIComponent(rawVal)}`);
            return;
        }

        if (isExternal) {
            this.navigate(`outside://${rawVal}`);
            return;
        }

        this.navigate(`gensokyo://${rawVal}`);
    },

    isLocalhostDomain(pathStr) {
        if (!pathStr || typeof pathStr !== 'string') return false;
        const clean = pathStr.replace(/^(gensokyo|outside):\/\//i, '').trim().toLowerCase();
        try {
            const fakeUrl = clean.startsWith('http://') || clean.startsWith('https://') ? clean : `http://${clean}`;
            const parsed = new URL(fakeUrl);
            const host = parsed.hostname.toLowerCase();
            return host === 'localhost' || host === '127.0.0.1';
        } catch (e) {
            return false;
        }
    },

    isExternalDomain(pathStr) {
        if (!pathStr || typeof pathStr !== 'string') return false;
        const clean = pathStr.replace(/^(gensokyo|outside):\/\//i, '').trim().toLowerCase();
        if (this.isLocalhostDomain(clean)) return false;
        if (clean === 'home' || clean === '' || clean === 'register' || clean === 'builder' || clean.startsWith('search')) return false;

        const hasExternalTld = /\.(com|org|net|io|app|ai|edu|co|es|ar|tv|me|dev|xyz|info|us|uk)$/i.test(clean.split('/')[0].split('?')[0]);
        const isHttp = pathStr.toLowerCase().startsWith('http://') || pathStr.toLowerCase().startsWith('https://') || pathStr.toLowerCase().startsWith('outside://');
        return hasExternalTld || isHttp;
    },

    navigate(fullUrl, forceCross = false) {
        const activeTab = this.getActiveTab();
        if (!activeTab) return;

        let path = fullUrl;
        if (path.startsWith('gensokyo://')) path = path.replace('gensokyo://', '');
        if (path.startsWith('outside://')) path = path.replace('outside://', '');
        path = path.trim();

        const isLocalhost = this.isLocalhostDomain(path);
        const isExternal = !isLocalhost && this.isExternalDomain(path);

        if (isExternal && !forceCross) {
            const policy = this.hakureiPolicy || 'ask';

            if (policy === 'block') {
                this.renderHakureiBlocked(path);
                this.updateUrlInput(`outside://${path}`);
                return;
            }

            if (policy === 'auto') {
                this.proceedCrossHakureiBarrier(path);
                return;
            }

            this.renderHakureiBarrier(path);
            this.updateUrlInput(`outside://${path}`);
            return;
        }

        const normalizedUrl = isExternal ? `outside://${path}` : `gensokyo://${path}`;
        activeTab.url = normalizedUrl;
        activeTab.title = this.getTabTitleFromUrl(normalizedUrl);

        if (activeTab.history[activeTab.historyIndex] !== normalizedUrl) {
            activeTab.history = activeTab.history.slice(0, activeTab.historyIndex + 1);
            activeTab.history.push(normalizedUrl);
            activeTab.historyIndex = activeTab.history.length - 1;
        }

        this.renderTabsBar();
        this.updateUrlInput(normalizedUrl);
        this.renderRoute(normalizedUrl);
        this.updateSidebarActiveState(normalizedUrl);
    },

    proceedCrossHakureiBarrier(externalDomain) {
        const activeTab = this.getActiveTab();
        if (!activeTab) return;

        const cleanDomain = externalDomain.replace(/^(gensokyo|outside|https?):\/\//i, '').trim();
        const targetUrl = cleanDomain.startsWith('http://') || cleanDomain.startsWith('https://') ? cleanDomain : `https://${cleanDomain}`;
        const normalizedUrl = `outside://${cleanDomain}`;

        activeTab.url = normalizedUrl;
        activeTab.title = cleanDomain;

        if (activeTab.history[activeTab.historyIndex] !== normalizedUrl) {
            activeTab.history = activeTab.history.slice(0, activeTab.historyIndex + 1);
            activeTab.history.push(normalizedUrl);
            activeTab.historyIndex = activeTab.history.length - 1;
        }

        const wrapperEl = document.querySelector('.gx-viewport-wrapper');
        const viewport = document.getElementById('th-viewport');

        if (viewport) {
            viewport.classList.add('full-width');
            if (wrapperEl) wrapperEl.classList.add('full-bleed');

            viewport.innerHTML = `
                <div style="width: 100%; height: 100%; position: relative; background: #ffffff;">
                    <div style="background: #1c0308; color: #ffffff; padding: 6px 16px; font-size: 0.82rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid var(--th-crimson);">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="color: #ff9800; font-weight: bold;">OUTSIDE://</span>
                            <span style="color: #ffffff; font-family: monospace;">${this.escapeHtml(targetUrl)}</span>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="gx-btn-go" style="padding: 3px 10px; font-size: 0.75rem; background: var(--th-crimson);" onclick="window.open('${this.escapeHtml(targetUrl)}', '_blank', 'noopener,noreferrer')">Abrir en Pestaña Directa ➔</button>
                        </div>
                    </div>
                    <iframe class="user-site-iframe" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals" src="${this.escapeHtml(targetUrl)}" style="width:100%; height:calc(100% - 32px); border:none; background:#ffffff; display:block;"></iframe>
                </div>
            `;
        }

        this.renderTabsBar();
        this.updateUrlInput(normalizedUrl);
        this.updateSidebarActiveState(normalizedUrl);
    },

    updateUrlInput(url) {
        const prefixEl = document.getElementById('th-url-prefix');
        const input = document.getElementById('th-url-input');
        if (!input) return;

        let clean = (url || '').trim();
        clean = clean.replace(/^(gensokyo|outside):\/\//i, '').replace(/^https?:\/\//i, '').trim();

        const isExternal = this.isExternalDomain(clean);

        if (prefixEl) {
            if (isExternal) {
                prefixEl.innerText = 'OUTSIDE://';
                prefixEl.style.color = '#e65100';
            } else {
                prefixEl.innerText = 'GENSOKYO://';
                prefixEl.style.color = 'var(--th-crimson)';
            }
        }

        input.value = clean;
    },

    updateSidebarActiveState(url) {
        const clean = url.replace(/^(gensokyo|outside):\/\//i, '').trim().toLowerCase();
        document.querySelectorAll('.gx-side-btn').forEach((btn) => btn.classList.remove('active'));

        if (clean === 'home' || clean === '') document.getElementById('nav-home')?.classList.add('active');
        else if (clean === 'bunbunmaru.news') document.getElementById('nav-news')?.classList.add('active');
        else if (clean === 'register') document.getElementById('nav-register')?.classList.add('active');
        else if (clean === 'builder') document.getElementById('nav-builder')?.classList.add('active');
    },

    navigateBack() {
        const tab = this.getActiveTab();
        if (!tab || tab.historyIndex <= 0) return;

        tab.historyIndex -= 1;
        const prevUrl = tab.history[tab.historyIndex];
        tab.url = prevUrl;
        tab.title = this.getTabTitleFromUrl(prevUrl);
        this.renderTabsBar();
        this.updateUrlInput(prevUrl);
        this.renderRoute(prevUrl);
    },

    navigateForward() {
        const tab = this.getActiveTab();
        if (!tab || tab.historyIndex >= tab.history.length - 1) return;

        tab.historyIndex += 1;
        const nextUrl = tab.history[tab.historyIndex];
        tab.url = nextUrl;
        tab.title = this.getTabTitleFromUrl(nextUrl);
        this.renderTabsBar();
        this.updateUrlInput(nextUrl);
        this.renderRoute(nextUrl);
    },

    reloadPage() {
        const tab = this.getActiveTab();
        if (tab) this.renderRoute(tab.url);
    },

    /* VERIFICACIÓN PREVIA DE CONEXIÓN A SERVIDORES LOCALHOST (PING SALVAGUARDA) */
    async checkLocalhostStatus(targetUrl) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1200);
            await fetch(targetUrl, { mode: 'no-cors', signal: controller.signal });
            clearTimeout(timeoutId);
            return true;
        } catch (err) {
            return false;
        }
    },

    /* VALIDACIÓN ESTRICTA DE CONTENIDO RENDERIZABLE (FILTRA READMES Y PLANTILLAS VACÍAS) */
    isHtmlContentEmpty(htmlText) {
        if (!htmlText || typeof htmlText !== 'string') return true;
        const cleanStr = htmlText.trim();
        if (cleanStr === '') return true;

        try {
            // Parsea en documento inerte para evitar ejecutar/renderizar contenido no confiable.
            const parsed = new DOMParser().parseFromString(cleanStr, 'text/html');
            const root = parsed.body || parsed;

            root.querySelectorAll('script, style, meta, link, template, noscript').forEach((el) => el.remove());

            const hasVisualMedia = root.querySelector('img, video, canvas, svg, iframe, audio, input, button, select, a, p, h1, h2, h3, h4, h5, h6, table, form, article, section, header, footer');
            const visibleTextLength = root.textContent ? root.textContent.trim().length : 0;

            return !hasVisualMedia && visibleTextLength < 5;
        } catch (err) {
            return cleanStr.length < 5;
        }
    },

    /* CAPA DE RESOLUCIÓN API DE DOMINIOS (DESACOPLAMIENTO DEL BUCKET) */
    resolveDomainRoute(path) {
        const seedSite = GensokyoSeedData.domains[path];
        if (seedSite) {
            return {
                domain: path,
                activeVersion: 'v1.0-seed',
                ownerId: 'GENSOKYO_NET',
                author: seedSite.author || 'Hakurei Shrine',
                targetUrl: `https://cdn.gensokyo.net/assets/official/${path}/index.html`,
                htmlContent: seedSite.content,
                isSeed: true
            };
        }

        const userSite = this.userDomains[path];
        if (userSite) {
            const isPrivate = userSite.visibility === 'private';
            const isOwner = (this.passport.userId && this.passport.userId !== 'ID#0000' && (userSite.ownerId === this.passport.userId || (Array.isArray(this.passport.ownedDomains) && this.passport.ownedDomains.includes(path))));

            if (isPrivate && !isOwner) {
                return {
                    domain: path,
                    isPrivateBlocked: true,
                    title: userSite.title || path,
                    author: userSite.author
                };
            }

            const activeVer = userSite.activeVersion || 'v1';
            const versionObj = (userSite.versions && userSite.versions[activeVer]) ? userSite.versions[activeVer] : null;
            const finalHtml = versionObj ? versionObj.htmlContent : userSite.htmlContent;
            const versionsList = userSite.versions ? Object.keys(userSite.versions) : ['v1'];

            const isEmpty = this.isHtmlContentEmpty(finalHtml);

            return {
                domain: path,
                title: userSite.title || path,
                activeVersion: activeVer,
                versions: versionsList,
                ownerId: userSite.ownerId,
                author: userSite.author,
                targetUrl: `https://cdn.gensokyo.net/assets/${path}/${activeVer}/index.html`,
                htmlContent: finalHtml,
                sizeBytes: versionObj ? versionObj.sizeBytes : (finalHtml ? finalHtml.length : 0),
                isEmptySite: isEmpty,
                isUserSite: true
            };
        }

        return null;
    },

    renderRoute(fullUrl) {
        const wrapperEl = document.querySelector('.gx-viewport-wrapper');
        const viewport = document.getElementById('th-viewport');
        if (!viewport) return;

        let path = fullUrl.replace('gensokyo://', '').trim().toLowerCase();

        // CONTROL DE VISIBILIDAD DE BARRA DE ESTADO INFERIOR (Solo visible en Home)
        const statusbarEl = document.querySelector('.gx-statusbar');
        if (statusbarEl) {
            if (path === '' || path === 'home') {
                statusbarEl.classList.remove('hidden');
            } else {
                statusbarEl.classList.add('hidden');
            }
        }

        const isFullWidthRoute = this.isLocalhostDomain(path) || (path.includes('.') && !path.startsWith('search'));

        if (isFullWidthRoute) {
            viewport.classList.add('full-width');
            if (wrapperEl) wrapperEl.classList.add('full-bleed');
        } else {
            viewport.classList.remove('full-width');
            if (wrapperEl) wrapperEl.classList.remove('full-bleed');
        }

        if (path.startsWith('search')) {
            const urlParams = new URLSearchParams(path.includes('?') ? path.split('?')[1] : '');
            const q = urlParams.get('q') || '';
            this.renderSearchResults(q, 'all');
            return;
        }

        path = path.toLowerCase();

        if (path === '' || path === 'home') {
            viewport.innerHTML = this.getSpeedDialView();
            return;
        }

        if (path === 'register') {
            viewport.innerHTML = this.getRegisterView();
            return;
        }

        if (path === 'builder') {
            viewport.innerHTML = this.getBuilderView();
            return;
        }

        // SOPORTE PARA ENTORNO DE DESARROLLO LOCAL (LOCALHOST & 127.0.0.1 BORDE A BORDE NATIVO CON SANDBOX)
        if (this.isLocalhostDomain(path)) {
            let targetUrl = path;
            if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
                targetUrl = `http://${targetUrl}`;
            }

            viewport.innerHTML = `
                <div class="th-card" style="max-width: 600px; margin: 40px auto; text-align: center; width: 100%;">
                    <h2 class="th-card-title" style="color: var(--th-crimson); margin-bottom: 12px;">Comprobando Servidor Local...</h2>
                    <p style="font-size:0.9rem; color:var(--th-text-sub);">Conectando con <code>${this.escapeHtml(targetUrl)}</code></p>
                </div>
            `;

            this.checkLocalhostStatus(targetUrl).then((isOnline) => {
                if (isOnline) {
                    const localhostSandbox = this.getLocalhostSandboxAttr ? this.getLocalhostSandboxAttr() : 'allow-scripts allow-forms';
                    viewport.innerHTML = `
                        <iframe class="user-site-iframe" sandbox="${localhostSandbox}" src="${this.escapeHtml(targetUrl)}" style="width:100%; height:100%; border:none; background:#ffffff; display:block;"></iframe>
                    `;
                } else {
                    viewport.classList.remove('full-width');
                    if (wrapperEl) wrapperEl.classList.remove('full-bleed');

                    viewport.innerHTML = `
                        <div class="th-card" style="max-width: 650px; margin: 40px auto; text-align: center;">
                            <div style="width: 70px; height: 70px; background: var(--th-crimson-light); color: var(--th-crimson); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                                <svg class="th-svg-icon" style="width:36px; height:36px;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                            </div>
                            <h1 class="th-card-title" style="color: var(--th-crimson); font-size: 1.5rem; margin-bottom: 10px;">Servidor Local Inaccesible</h1>
                            <div style="background:var(--th-bg-main); border:1px solid var(--th-border-warm); padding:8px 14px; border-radius:8px; display:inline-block; font-family:monospace; color:var(--th-crimson); font-weight:bold; margin-bottom:14px;">
                                ${this.escapeHtml(targetUrl)}
                            </div>
                            <p style="font-size: 0.95rem; line-height: 1.6; margin-bottom: 20px; color: var(--th-text-sub);">
                                No se pudo establecer conexión con el puerto local especificado.<br>
                                Asegúrate de tener encendido tu servidor de desarrollo en la terminal<br>
                                (ej: <code>npm run dev</code>, <code>python -m http.server 8080</code>, etc.).
                            </p>
                            <div style="display: flex; gap: 12px; justify-content: center;">
                                <button class="gx-btn-go" onclick="GensokyoApp.reloadPage()">Reintentar Conexión</button>
                                <button class="gx-btn-go" style="background: var(--th-bg-main); border: 1px solid var(--th-border-warm); color: var(--th-text-main);" onclick="GensokyoApp.navigate('gensokyo://home')">Volver al Inicio</button>
                            </div>
                        </div>
                    `;
                }
            });
            return;
        }

        // RESOLUCIÓN DE RUTAS MEDIANTE CAPA API DESACOPLADA (EDGE TO EDGE)
        const routeInfo = this.resolveDomainRoute(path);

        if (routeInfo) {
            if (routeInfo.isPrivateBlocked) {
                viewport.classList.add('full-width');
                if (wrapperEl) wrapperEl.classList.add('full-bleed');

                viewport.innerHTML = `
                    <div style="width: 100%; min-height: calc(100vh - 110px); margin: 0; background: var(--th-bg-main); display: flex; flex-direction: column; align-items: center;">
                        <!-- BANNER PANORÁMICO DE ANCHO COMPLETO (OPCIÓN B) -->
                        <div style="width: 100%; height: 240px; background: linear-gradient(180deg, #1c0308 0%, #3d0816 100%); border-bottom: 3px solid var(--th-crimson); position: relative; overflow: hidden;">
                            <svg viewBox="0 0 800 240" style="width: 100%; height: 100%; display: block;" preserveAspectRatio="xMidYMid slice">
                                <defs>
                                    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stop-color="#1c0308" />
                                        <stop offset="60%" stop-color="#3d0816" />
                                        <stop offset="100%" stop-color="#140206" />
                                    </linearGradient>
                                </defs>
                                <rect width="800" height="240" fill="url(#skyGrad)" />

                                <!-- Mansión Escarlata en el Centro -->
                                <path d="M 370 140 L 370 50 L 400 20 L 430 50 L 430 140 Z" fill="#180208" opacity="0.9" />
                                <polygon points="400,8 408,20 392,20" fill="#a61b32" opacity="0.85" />
                                <rect x="396" y="55" width="8" height="18" rx="4" fill="#ffd700" opacity="0.85" />
                                <rect x="396" y="85" width="8" height="18" rx="4" fill="#ffd700" opacity="0.7" />

                                <path d="M 280 150 L 280 75 L 300 50 L 320 75 L 320 150 Z" fill="#140206" opacity="0.85" />
                                <polygon points="300,35 307,50 293,50" fill="#a61b32" opacity="0.75" />
                                <rect x="296" y="80" width="8" height="15" rx="4" fill="#ffd700" opacity="0.7" />

                                <path d="M 480 150 L 480 75 L 500 50 L 520 75 L 520 150 Z" fill="#140206" opacity="0.85" />
                                <polygon points="500,35 507,50 493,50" fill="#a61b32" opacity="0.75" />
                                <rect x="496" y="80" width="8" height="15" rx="4" fill="#ffd700" opacity="0.7" />

                                <!-- Portones de Hierro Forjado Escarlata Panorámico -->
                                <rect x="20" y="30" width="14" height="190" fill="#0d0104" />
                                <rect x="766" y="30" width="14" height="190" fill="#0d0104" />
                                <path d="M 30 50 Q 400 10 770 50 L 770 220 L 30 220 Z" fill="none" stroke="#a61b32" stroke-width="4.5" />

                                <line x1="60" y1="52" x2="60" y2="220" stroke="#a61b32" stroke-width="2" />
                                <line x1="90" y1="48" x2="90" y2="220" stroke="#a61b32" stroke-width="2" />
                                <line x1="120" y1="44" x2="120" y2="220" stroke="#a61b32" stroke-width="2" />
                                <line x1="150" y1="40" x2="150" y2="220" stroke="#a61b32" stroke-width="2" />
                                <line x1="180" y1="36" x2="180" y2="220" stroke="#a61b32" stroke-width="2" />
                                <line x1="210" y1="33" x2="210" y2="220" stroke="#a61b32" stroke-width="2" />
                                <line x1="240" y1="30" x2="240" y2="220" stroke="#a61b32" stroke-width="2" />
                                <line x1="270" y1="28" x2="270" y2="220" stroke="#a61b32" stroke-width="2" />
                                <line x1="300" y1="26" x2="300" y2="220" stroke="#a61b32" stroke-width="2" />
                                <line x1="330" y1="25" x2="330" y2="220" stroke="#a61b32" stroke-width="2" />
                                <line x1="360" y1="25" x2="360" y2="220" stroke="#a61b32" stroke-width="2" />

                                <line x1="440" y1="25" x2="440" y2="220" stroke="#a61b32" stroke-width="2" />
                                <line x1="470" y1="25" x2="470" y2="220" stroke="#a61b32" stroke-width="2" />
                                <line x1="500" y1="26" x2="500" y2="220" stroke="#a61b32" stroke-width="2" />
                                <line x1="530" y1="28" x2="530" y2="220" stroke="#a61b32" stroke-width="2" />
                                <line x1="560" y1="30" x2="560" y2="220" stroke="#a61b32" stroke-width="2" />
                                <line x1="590" y1="33" x2="590" y2="220" stroke="#a61b32" stroke-width="2" stroke-dasharray="0" />
                                <line x1="620" y1="36" x2="620" y2="220" stroke="#a61b32" stroke-width="2" />
                                <line x1="650" y1="40" x2="650" y2="220" stroke="#a61b32" stroke-width="2" />
                                <line x1="680" y1="44" x2="680" y2="220" stroke="#a61b32" stroke-width="2" />
                                <line x1="710" y1="48" x2="710" y2="220" stroke="#a61b32" stroke-width="2" />
                                <line x1="740" y1="52" x2="740" y2="220" stroke="#a61b32" stroke-width="2" />

                                <circle cx="27" cy="30" r="6" fill="#ffd700" />
                                <circle cx="773" cy="30" r="6" fill="#ffd700" />

                                <!-- Hong Meiling en el Centro -->
                                <ellipse cx="400" cy="216" rx="35" ry="6" fill="rgba(0,0,0,0.65)" />
                                <ellipse cx="392" cy="214" rx="7" ry="3.5" fill="#0d0104" />
                                <ellipse cx="408" cy="214" rx="7" ry="3.5" fill="#0d0104" />

                                <path d="M 380 128 Q 368 150 372 208 Q 400 210 428 208 Q 432 150 420 128 Z" fill="#800f2f" />
                                <path d="M 382 128 Q 372 152 374 206 Q 400 208 426 206 Q 428 152 418 128 Z" fill="#c1121f" />

                                <path d="M 386 152 L 414 152 L 422 212 L 378 212 Z" fill="#2d6a4f" />
                                <path d="M 392 152 L 408 152 L 410 212 L 390 212 Z" fill="#40916c" />
                                <path d="M 400 175 L 416 212 L 408 212 Z" fill="#ffffff" />

                                <path d="M 385 155 L 370 178" stroke="#2d6a4f" stroke-width="7" stroke-linecap="round" />
                                <circle cx="368" cy="180" r="4.5" fill="#ffdfd3" />

                                <path d="M 415 155 L 430 178" stroke="#2d6a4f" stroke-width="7" stroke-linecap="round" />
                                <circle cx="432" cy="180" r="4.5" fill="#ffdfd3" />

                                <path d="M 384 136 Q 376 158 378 180 L 383 180 Q 385 158 388 136 Z" fill="#a61b32" />
                                <polygon points="374,178 384,178 379,184" fill="#0d0104" />
                                <polygon points="374,184 384,184 379,178" fill="#0d0104" />

                                <path d="M 416 136 Q 424 158 422 180 L 417 180 Q 415 158 412 136 Z" fill="#a61b32" />
                                <polygon points="416,178 426,178 421,184" fill="#0d0104" />
                                <polygon points="416,184 426,184 421,178" fill="#0d0104" />

                                <circle cx="400" cy="138" r="16" fill="#ffdfd3" />
                                <path d="M 384 128 L 390 136 L 396 129 L 402 136 L 408 129 L 414 136 L 416 128 Z" fill="#c1121f" />
                                <circle cx="393" cy="137" r="2.2" fill="#1d3557" />
                                <circle cx="407" cy="137" r="2.2" fill="#1d3557" />
                                <path d="M 396 143 Q 400 147 404 143" stroke="#b7094c" stroke-width="1.5" fill="none" stroke-linecap="round" />

                                <path d="M 380 130 Q 400 115 420 130 Q 400 124 380 130 Z" fill="#2d6a4f" />
                                <polygon points="400,118 402,122 406,122 403,124 404,128 400,126 396,128 397,124 394,122 398,122" fill="#ffd700" />
                            </svg>
                        </div>

                        <!-- CONTENIDO DE TEXTO Y BOTÓN SOBRE LIENZO CLARO -->
                        <div style="padding: 30px 24px; text-align: center; max-width: 600px;">
                            <div style="display: inline-block; background: var(--th-crimson); color: #ffffff; padding: 6px 18px; border-radius: 20px; font-family: var(--font-heading); font-size: 0.85rem; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(166, 27, 50, 0.3);">
                                Spell Card: Web-Sign ["Bloqueo por Privacidad"]
                            </div>
                            <h1 class="th-card-title" style="color: var(--th-crimson); font-size: 1.8rem; margin-bottom: 12px; font-family: var(--font-heading); text-transform: uppercase;">Dominio Privado</h1>
                            <p style="font-size: 1.15rem; font-weight: 700; color: var(--th-text-main); line-height: 1.6; margin-bottom: 24px;">
                                Este lugar está siendo bloqueado por una poderosa barrera desconocida.
                            </p>
                            <button class="gx-btn-go" style="padding: 12px 28px; font-size: 1rem;" onclick="GensokyoApp.navigate('gensokyo://home')">Volver a GensokyoNet</button>
                        </div>
                    </div>
                `;
                return;
            }

            if (routeInfo.isSeed) {
                viewport.innerHTML = routeInfo.htmlContent;
                return;
            }

            if (routeInfo.isUserSite) {
                if (routeInfo.isEmptySite) {
                    viewport.classList.remove('full-width');
                    if (wrapperEl) wrapperEl.classList.remove('full-bleed');

                    viewport.innerHTML = `
                        <div class="th-card" style="max-width: 600px; margin: 40px auto; text-align: center; padding: 40px 24px; border: 2px solid var(--th-gold); background: linear-gradient(135deg, var(--th-bg-card) 0%, var(--th-bg-main) 100%); border-radius: 14px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08); display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <img src="assets/yukari_construction.png" alt="Chibi Yukari Yakumo - Lugar en Construcción" style="width: 100%; max-width: 320px; height: auto; display: block; margin: 0 auto 20px auto; filter: drop-shadow(0 8px 16px rgba(186, 104, 200, 0.25));">

                            <div style="display: inline-block; background: var(--th-gold); color: #ffffff; padding: 6px 18px; border-radius: 20px; font-family: var(--font-heading); font-size: 0.85rem; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 14px; box-shadow: 0 2px 8px rgba(212, 160, 23, 0.3);">
                                Spell Card: Boundary-Sign ["Sitio en Construcción"]
                            </div>
                            <h1 class="th-card-title" style="color: var(--th-crimson); font-size: 1.8rem; margin-bottom: 12px; font-family: var(--font-heading); text-transform: uppercase;">Lugar en construcción</h1>
                            <p style="font-size: 1.15rem; font-weight: 700; color: var(--th-text-main); line-height: 1.6; margin-bottom: 24px; max-width: 500px;">
                                El titular de este dominio aún no ha empezado a construir. Ten paciencia.
                            </p>
                            <button class="gx-btn-go" style="padding: 12px 28px; font-size: 1rem;" onclick="GensokyoApp.navigate('gensokyo://home')">Volver a GensokyoNet</button>
                        </div>
                    `;
                    return;
                }

                const escapedContent = this.escapeHtml(routeInfo.htmlContent);

                viewport.innerHTML = `
                    <iframe class="user-site-iframe" sandbox="allow-scripts allow-forms" srcdoc="${escapedContent}" style="width:100%; height:100%; border:none; background:#ffffff; display:block;"></iframe>
                `;
                return;
            }
        }

        viewport.innerHTML = `
            <div class="th-card" style="max-width: 600px; margin: 40px auto; text-align: center;">
                <h2 class="th-card-title">Dominio No Registrado</h2>
                <div class="gx-address-bar" style="max-width: 400px; margin: 15px auto; justify-content: center;">gensokyo://${this.escapeHtml(path)}</div>
                <p style="margin-bottom: 20px;">Esta dirección aún no existe en la red <strong>GensokyoNet</strong>.</p>
                <button class="gx-btn-go" onclick="GensokyoApp.navigate('gensokyo://register')">
                    Reclamar este dominio gratis
                </button>
            </div>
        `;
    },

    getSpeedDialView() {
        return `
            <div class="gx-speed-dial-container">
                <div class="yomoyama-banner-card">
                    <div class="yomoyama-banner-inner" style="background-image: url('assets/gensokyo_banner.png');">
                        <div class="banner-overlay-gradient"></div>
                        <div class="banner-title-group">
                            <h1 class="yomoyama-main-title">東方 GensokyoNet</h1>
                            <p class="yomoyama-sub-title">Intranet Libre para la Comunidad Doujin de Touhou</p>
                        </div>
                    </div>
                </div>

                <div class="gx-search-box-wrap">
                    <div class="gx-search-box">
                        <input type="text" id="gx-home-search" class="gx-search-input" placeholder="Buscar en la red (ej: noticias, templo, marisa, bad apple, localhost:3000)..." onkeypress="if(event.key==='Enter'){ GensokyoApp.submitHomeSearch(); }">
                        <button class="gx-search-btn" onclick="GensokyoApp.submitHomeSearch()">Buscar</button>
                    </div>
                </div>

                <div class="gx-speed-dial-grid">
                    <div class="gx-dial-card" onclick="GensokyoApp.navigate('gensokyo://bunbunmaru.news')">
                        <div style="background:var(--th-crimson-light); color:var(--th-crimson); width:46px; height:46px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">
                            <svg class="th-svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                        </div>
                        <h3 style="font-family:var(--font-heading); font-size:1.05rem; color:var(--th-crimson); margin-bottom:4px;">BUNBUNMARU</h3>
                        <p style="font-size:0.8rem; color:var(--th-text-sub);">Diario de Aya Shameimaru</p>
                    </div>

                    <div class="gx-dial-card" onclick="GensokyoApp.navigate('gensokyo://reimu.shrine')">
                        <div style="background:var(--th-crimson-light); color:var(--th-crimson); width:46px; height:46px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">
                            <svg class="th-svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                        </div>
                        <h3 style="font-family:var(--font-heading); font-size:1.05rem; color:var(--th-crimson); margin-bottom:4px;">REIMU.SHRINE</h3>
                        <p style="font-size:0.8rem; color:var(--th-text-sub);">Templo Hakurei</p>
                    </div>

                    <div class="gx-dial-card" onclick="GensokyoApp.navigate('gensokyo://builder')">
                        <div style="background:var(--th-crimson-light); color:var(--th-crimson); width:46px; height:46px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">
                            <svg class="th-svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </div>
                        <h3 style="font-family:var(--font-heading); font-size:1.05rem; color:var(--th-crimson); margin-bottom:4px;">CREADOR WEB</h3>
                        <p style="font-size:0.8rem; color:var(--th-text-sub);">Escribe tu propio rincón</p>
                    </div>

                    <div class="gx-dial-card" onclick="GensokyoApp.navigate('gensokyo://localhost:8080')">
                        <div style="background:var(--th-crimson-light); color:var(--th-crimson); width:46px; height:46px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">
                            <svg class="th-svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M4 6h16v12H4zm2 2v8h12V8zm2 2h8v4H8z"/></svg>
                        </div>
                        <h3 style="font-family:var(--font-heading); font-size:1.05rem; color:var(--th-crimson); margin-bottom:4px;">DEV LOCALHOST</h3>
                        <p style="font-size:0.8rem; color:var(--th-text-sub);">Probar Servidor Local</p>
                    </div>
                </div>
            </div>
        `;
    },

    renderHakureiBarrier(externalDomain) {
        const viewport = document.getElementById('th-viewport');
        if (!viewport) return;

        const cleanDomain = externalDomain.replace(/^(https?:\/\/|outside:\/\/|gensokyo:\/\/)/i, '').trim();

        viewport.innerHTML = `
            <div class="th-card" style="max-width: 650px; margin: 40px auto; text-align: center; border: 2px solid var(--th-crimson);">
                <div style="width: 70px; height: 70px; background: var(--th-crimson-light); color: var(--th-crimson); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                    <svg class="th-svg-icon" style="width:36px; height:36px;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                </div>
                <h1 class="th-card-title" style="color: var(--th-crimson); font-size: 1.6rem; margin-bottom: 12px; font-family: var(--font-heading); text-transform: uppercase;">Barrera Hakurei Impenetrable</h1>
                <p style="font-size: 1.05rem; font-weight: 700; color: var(--th-text-main); line-height: 1.6; margin-bottom: 20px;">
                    Estás intentando abandonar GensokyoNet para acceder al Mundo Exterior (<code>OUTSIDE:// ${this.escapeHtml(cleanDomain)}</code>).
                </p>
                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                    <button class="gx-btn-go" onclick="GensokyoApp.navigate('gensokyo://home')">Volver a GensokyoNet</button>
                    <button class="gx-btn-go" style="background: var(--th-bg-main); border: 1.5px solid var(--th-crimson); color: var(--th-crimson); font-weight: 700;" onclick="GensokyoApp.proceedCrossHakureiBarrier('${this.escapeHtml(cleanDomain)}')">Cruzar Barrera Bajo Tu Propio Riesgo ➔</button>
                </div>
            </div>
        `;
    },

    renderHakureiBlocked(externalDomain) {
        const viewport = document.getElementById('th-viewport');
        if (!viewport) return;

        const cleanDomain = externalDomain.replace(/^(https?:\/\/|outside:\/\/|gensokyo:\/\/)/i, '').trim();

        viewport.innerHTML = `
            <div class="th-card" style="max-width: 650px; margin: 40px auto; text-align: center; border: 2px solid var(--th-crimson);">
                <div style="width: 70px; height: 70px; background: var(--th-crimson-light); color: var(--th-crimson); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                    <svg class="th-svg-icon" style="width:36px; height:36px;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                </div>
                <h1 class="th-card-title" style="color: var(--th-crimson); font-size: 1.6rem; margin-bottom: 12px; font-family: var(--font-heading); text-transform: uppercase;">Acceso al Mundo Exterior Bloqueado</h1>
                <p style="font-size: 1.05rem; font-weight: 700; color: var(--th-text-main); line-height: 1.6; margin-bottom: 20px;">
                    La Gran Barrera Hakurei está configurada para <strong>bloquear el acceso al Mundo Exterior</strong> (<code>OUTSIDE:// ${this.escapeHtml(cleanDomain)}</code>).<br>
                    Puedes cambiar esta política desde el menú de Preferencias de GensokyoNet.
                </p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button class="gx-btn-go" onclick="GensokyoApp.navigate('gensokyo://home')">Volver a GensokyoNet</button>
                    <button class="gx-btn-go" style="background: var(--th-bg-main); border: 1.5px solid var(--th-border-warm); color: var(--th-text-main);" onclick="GensokyoApp.showThemeModal()">Abrir Preferencias ⚙️</button>
                </div>
            </div>
        `;
    }
});
