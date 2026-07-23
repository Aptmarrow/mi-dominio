/**
 * GensokyoNet Engine - App Client (Clean Layout with Tabs & Left Sidebar)
 * Multi-tab support, gensokyo:// router, Hakurei Barrier sandbox, Home Screen
 */

const GensokyoApp = {
    tabs: [],
    activeTabId: null,
    nextTabId: 1,
    userDomains: {},

    init() {
        this.loadUserDomains();

        // Configurar evento Enter en la barra de URL
        const urlInput = document.getElementById('th-url-input');
        if (urlInput) {
            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.submitUrl();
                }
            });
        }

        // Crear la primera pestaña inicial con Inicio (gensokyo://home)
        this.createNewTab('gensokyo://home', '⛩️ Inicio');
        this.updateDomainCount();
        this.renderSidebarCommunity();
    },

    loadUserDomains() {
        const stored = localStorage.getItem('gensokyo_user_domains');
        if (stored) {
            try {
                this.userDomains = JSON.parse(stored);
            } catch (e) {
                console.error("Error al cargar dominios del usuario", e);
            }
        }
    },

    saveUserDomains() {
        localStorage.setItem('gensokyo_user_domains', JSON.stringify(this.userDomains));
        this.updateDomainCount();
        this.renderSidebarCommunity();
    },

    updateDomainCount() {
        const total = Object.keys(GensokyoSeedData.domains).length + Object.keys(this.userDomains).length;
        const countEl = document.getElementById('th-domain-count');
        if (countEl) {
            countEl.innerText = `Dominios Activos: ${total}`;
        }
    },

    renderSidebarCommunity() {
        const container = document.getElementById('th-sidebar-community');
        if (!container) return;

        let html = `
            <button class="th-sidebar-link sub" onclick="GensokyoApp.navigate('gensokyo://reimu.shrine')">⛩️ reimu.shrine</button>
            <button class="th-sidebar-link sub" onclick="GensokyoApp.navigate('gensokyo://cirno.blog')">❄️ cirno.blog</button>
            <button class="th-sidebar-link sub" onclick="GensokyoApp.navigate('gensokyo://marisa.magic')">🧹 marisa.magic</button>
        `;

        Object.keys(this.userDomains).forEach(dom => {
            html += `<button class="th-sidebar-link sub" onclick="GensokyoApp.navigate('gensokyo://${dom}')">🌸 ${dom}</button>`;
        });

        container.innerHTML = html;
    },

    /* ==========================================================================
       MANEJO DE PESTAÑAS (TABS)
       ========================================================================== */

    createNewTab(url = 'gensokyo://home', customTitle = null) {
        const tabId = `tab-${this.nextTabId++}`;
        const newTab = {
            id: tabId,
            title: customTitle || this.getTabTitleFromUrl(url),
            url: url,
            history: [url],
            historyIndex: 0
        };

        this.tabs.push(newTab);
        this.switchTab(tabId);
    },

    closeTab(tabId, event) {
        if (event) event.stopPropagation();

        if (this.tabs.length <= 1) {
            // Si es la última pestaña, reiniciarla a Home
            this.tabs[0].url = 'gensokyo://home';
            this.tabs[0].title = '⛩️ Inicio';
            this.tabs[0].history = ['gensokyo://home'];
            this.tabs[0].historyIndex = 0;
            this.switchTab(this.tabs[0].id);
            return;
        }

        const index = this.tabs.findIndex(t => t.id === tabId);
        if (index !== -1) {
            this.tabs.splice(index, 1);
            if (this.activeTabId === tabId) {
                const nextActive = this.tabs[Math.max(0, index - 1)];
                this.switchTab(nextActive.id);
            } else {
                this.renderTabsBar();
            }
        }
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
        return this.tabs.find(t => t.id === this.activeTabId);
    },

    renderTabsBar() {
        const bar = document.getElementById('th-tabs-bar');
        if (!bar) return;

        bar.innerHTML = this.tabs.map(tab => `
            <div class="th-tab ${tab.id === this.activeTabId ? 'active' : ''}" onclick="GensokyoApp.switchTab('${tab.id}')">
                <span class="th-tab-title">${this.escapeHtml(tab.title)}</span>
                <span class="th-tab-close" onclick="GensokyoApp.closeTab('${tab.id}', event)">✕</span>
            </div>
        `).join('');
    },

    getTabTitleFromUrl(url) {
        let clean = url.replace('gensokyo://', '').trim().toLowerCase();
        if (clean === 'home' || clean === '') return '⛩️ Inicio';
        if (clean === 'bunbunmaru.news') return '📰 Bunbunmaru News';
        if (clean === 'fangames.vault') return '🎮 Búnker Exes';
        if (clean === 'register') return '🏷️ Reclamar Dominio';
        if (clean === 'builder') return '✍️ Creador de Sitios';
        if (clean === 'search') return '🔍 Buscador';
        return clean;
    },

    /* ==========================================================================
       ENRUTAMIENTO Y NAVEGACIÓN
       ========================================================================== */

    submitUrl() {
        const input = document.getElementById('th-url-input');
        if (!input) return;
        let rawVal = input.value.trim();
        if (rawVal.startsWith('gensokyo://')) {
            rawVal = rawVal.replace('gensokyo://', '');
        }

        this.navigate(`gensokyo://${rawVal}`);
    },

    navigate(fullUrl) {
        const activeTab = this.getActiveTab();
        if (!activeTab) return;

        let path = fullUrl;
        if (path.startsWith('gensokyo://')) {
            path = path.replace('gensokyo://', '');
        }
        path = path.trim().toLowerCase();

        // 1. Sandbox Barrera Hakurei (Bloqueo de dominios externos)
        if (path.includes('.') && (path.endsWith('.com') || path.endsWith('.org') || path.endsWith('.net') || path.includes('http') || path.includes('roblox') || path.includes('google'))) {
            this.renderHakureiBarrier(path);
            this.updateUrlInput(path);
            return;
        }

        const normalizedUrl = `gensokyo://${path}`;
        activeTab.url = normalizedUrl;
        activeTab.title = this.getTabTitleFromUrl(normalizedUrl);

        // Historial
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

    updateUrlInput(url) {
        const input = document.getElementById('th-url-input');
        if (input) {
            let clean = url.replace('gensokyo://', '');
            input.value = clean;
        }
    },

    updateSidebarActiveState(url) {
        let clean = url.replace('gensokyo://', '').trim().toLowerCase();
        
        // Quitar estado activo de todos
        document.querySelectorAll('.th-sidebar-link').forEach(btn => btn.classList.remove('active'));

        if (clean === 'home' || clean === '') document.getElementById('nav-home')?.classList.add('active');
        else if (clean === 'bunbunmaru.news') document.getElementById('nav-news')?.classList.add('active');
        else if (clean === 'fangames.vault') document.getElementById('nav-vault')?.classList.add('active');
        else if (clean === 'register') document.getElementById('nav-register')?.classList.add('active');
        else if (clean === 'builder') document.getElementById('nav-builder')?.classList.add('active');
    },

    navigateBack() {
        const tab = this.getActiveTab();
        if (tab && tab.historyIndex > 0) {
            tab.historyIndex--;
            const prevUrl = tab.history[tab.historyIndex];
            tab.url = prevUrl;
            tab.title = this.getTabTitleFromUrl(prevUrl);
            this.renderTabsBar();
            this.updateUrlInput(prevUrl);
            this.renderRoute(prevUrl);
        }
    },

    navigateForward() {
        const tab = this.getActiveTab();
        if (tab && tab.historyIndex < tab.history.length - 1) {
            tab.historyIndex++;
            const nextUrl = tab.history[tab.historyIndex];
            tab.url = nextUrl;
            tab.title = this.getTabTitleFromUrl(nextUrl);
            this.renderTabsBar();
            this.updateUrlInput(nextUrl);
            this.renderRoute(nextUrl);
        }
    },

    reloadPage() {
        const tab = this.getActiveTab();
        if (tab) this.renderRoute(tab.url);
    },

    /* ==========================================================================
       RENDERIZADO DE VISTAS (PANTALLA DE INICIO LIMPIA CENTRADA)
       ========================================================================== */

    renderRoute(fullUrl) {
        const viewport = document.getElementById('th-viewport');
        if (!viewport) return;

        let path = fullUrl.replace('gensokyo://', '').trim().toLowerCase();

        // 1. Pantalla de Inicio Limpia Centrada (Home)
        if (path === '' || path === 'home') {
            viewport.innerHTML = this.getHomeView();
            return;
        }

        // 2. Páginas del Sistema
        if (path === 'register') {
            viewport.innerHTML = this.getRegisterView();
            return;
        }
        if (path === 'builder') {
            viewport.innerHTML = this.getBuilderView();
            return;
        }

        // 3. Dominios Pre-existentes
        if (GensokyoSeedData.domains[path]) {
            viewport.innerHTML = GensokyoSeedData.domains[path].content;
            if (path === 'search') {
                setTimeout(() => this.performSearch(''), 50);
            }
            return;
        }

        // 4. Dominios del Usuario
        if (this.userDomains[path]) {
            const userSite = this.userDomains[path];
            viewport.innerHTML = `
                <div class="th-card">
                    <div class="th-card-header">
                        <h1 class="th-card-title">${this.escapeHtml(userSite.title)}</h1>
                        <span class="th-badge">Dominio de Usuario • ${this.escapeHtml(userSite.suffix || '.blog')}</span>
                    </div>
                    <div style="font-size: 0.85rem; color: var(--th-text-gold); margin-bottom: 16px;">
                        Creador: <strong>${this.escapeHtml(userSite.author)}</strong> • Publicado en GensokyoNet
                    </div>
                    <div class="user-site-body" style="font-size: 1rem; line-height: 1.6; color: var(--th-text-main);">
                        ${userSite.htmlContent}
                    </div>
                </div>
            `;
            return;
        }

        // 5. 404 No Encontrado
        viewport.innerHTML = `
            <div class="barrier-blocked-container" style="border-color: var(--th-gold-torii); max-width: 600px;">
                <div class="barrier-torii-symbol">🔍</div>
                <h2 class="barrier-blocked-title">Dominio No Registrado</h2>
                <div class="external-url-display">gensokyo://${this.escapeHtml(path)}</div>
                <p class="barrier-blocked-desc">Esta dirección aún no ha sido reclamada en la red <strong>GensokyoNet</strong>.</p>
                <button class="btn-th-submit" onclick="GensokyoApp.navigate('gensokyo://register')">
                    🏷️ ¡Reclamar este dominio gratis!
                </button>
            </div>
        `;
    },

    getHomeView() {
        return `
            <div class="th-home-container">
                <div class="th-home-logo">
                    <span class="th-home-logo-symbol">☯</span>
                </div>
                <h1 class="th-home-title">GensokyoNet</h1>
                <p class="th-home-sub">Intranet Libre para la Comunidad Doujin de Touhou</p>

                <!-- Buscador Central Limpio -->
                <div class="th-home-search-box">
                    <input type="text" id="th-home-q" class="th-home-search-input" placeholder="Buscar en la red Gensokyo (ej: cirno, fangames, reimu, noticias)..." onkeypress="if(event.key==='Enter'){ GensokyoApp.submitHomeSearch(); }">
                    <button class="th-home-search-btn" onclick="GensokyoApp.submitHomeSearch()">Buscar 🔍</button>
                </div>

                <!-- Shortcuts Grid Limpio -->
                <div class="th-home-shortcuts">
                    <div class="shortcut-card" onclick="GensokyoApp.navigate('gensokyo://bunbunmaru.news')">
                        <div class="shortcut-icon">📰</div>
                        <div class="shortcut-name">Bunbunmaru</div>
                        <div class="shortcut-desc">Diario de Aya Shameimaru</div>
                    </div>

                    <div class="shortcut-card" onclick="GensokyoApp.navigate('gensokyo://fangames.vault')">
                        <div class="shortcut-icon">🎮</div>
                        <div class="shortcut-name">Búnker Exes</div>
                        <div class="shortcut-desc">Juegos, mods & replays</div>
                    </div>

                    <div class="shortcut-card" onclick="GensokyoApp.navigate('gensokyo://register')">
                        <div class="shortcut-icon">🏷️</div>
                        <div class="shortcut-name">Reclamar Dominio</div>
                        <div class="shortcut-desc">Obtén tu dirección gratis</div>
                    </div>

                    <div class="shortcut-card" onclick="GensokyoApp.navigate('gensokyo://builder')">
                        <div class="shortcut-icon">✍️</div>
                        <div class="shortcut-name">Creador Web</div>
                        <div class="shortcut-desc">Escribe tu rincón Touhou</div>
                    </div>
                </div>
            </div>
        `;
    },

    submitHomeSearch() {
        const input = document.getElementById('th-home-q');
        if (!input) return;
        const q = input.value.trim();
        if (q) {
            this.navigate('gensokyo://search');
            setTimeout(() => {
                const searchInput = document.getElementById('th-search-query');
                if (searchInput) {
                    searchInput.value = q;
                    this.performSearch(q);
                }
            }, 100);
        }
    },

    renderHakureiBarrier(externalUrl) {
        const viewport = document.getElementById('th-viewport');
        if (!viewport) return;

        viewport.innerHTML = `
            <div class="barrier-blocked-container">
                <div class="barrier-torii-symbol">⛩️</div>
                <h2 class="barrier-blocked-title">Paz sobre la Barrera Hakurei</h2>
                <div class="external-url-display">${this.escapeHtml(externalUrl)}</div>
                <p class="barrier-blocked-desc">
                    <strong>¡Acceso denegado!</strong> La Barrera Hakurei bloquea la conexión hacia el <em>Mundo Exterior</em>.<br>
                    Esta intranet es exclusiva para el contenido creado por la comunidad de Touhou.
                </p>
                <button class="btn-th-submit" onclick="GensokyoApp.navigate('gensokyo://home')">
                    ⛩️ Regresar al Inicio de Gensokyo
                </button>
            </div>
        `;
    },

    getRegisterView() {
        return `
            <div class="th-card">
                <div class="th-card-header">
                    <h1 class="th-card-title">🏷️ Registro de Dominios de Gensokyo</h1>
                    <span class="th-badge">API espinoza.engineer • 100% Gratis</span>
                </div>
                <form onsubmit="GensokyoApp.handleRegisterSubmit(event)">
                    <div class="th-form-group">
                        <label class="th-form-label">Nombre del Dominio / Alias:</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-family: var(--font-heading); color: var(--th-sakura-pink); font-weight: 700;">gensokyo://</span>
                            <input type="text" id="reg-alias" class="th-form-input" placeholder="ej. marisa-blog, scarlet-mansion" required spellcheck="false">
                            <select id="reg-suffix" class="th-form-select" style="width: 140px;">
                                <option value=".blog">.blog</option>
                                <option value=".shrine">.shrine</option>
                                <option value=".mansion">.mansion</option>
                                <option value=".bamboo">.bamboo</option>
                                <option value=".9">.9</option>
                            </select>
                        </div>
                    </div>
                    <div class="th-form-group">
                        <label class="th-form-label">Nombre del Creador / Perfil:</label>
                        <input type="text" id="reg-author" class="th-form-input" placeholder="Tu apodo o nombre" required>
                    </div>
                    <div class="th-form-group">
                        <label class="th-form-label">Título del Sitio Web:</label>
                        <input type="text" id="reg-title" class="th-form-input" placeholder="ej. El Rincón de Marisa" required>
                    </div>
                    <button type="submit" class="btn-th-submit">✨ Reclamar Dominio Gratis</button>
                </form>
            </div>
        `;
    },

    handleRegisterSubmit(e) {
        e.preventDefault();
        const aliasInput = document.getElementById('reg-alias');
        const suffixSelect = document.getElementById('reg-suffix');
        const authorInput = document.getElementById('reg-author');
        const titleInput = document.getElementById('reg-title');

        if (!aliasInput || !authorInput || !titleInput) return;
        let cleanAlias = aliasInput.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
        const suffix = suffixSelect.value;
        const fullDomain = `${cleanAlias}${suffix}`;

        if (GensokyoSeedData.domains[fullDomain] || this.userDomains[fullDomain]) {
            alert(`El dominio gensokyo://${fullDomain} ya está registrado.`);
            return;
        }

        this.userDomains[fullDomain] = {
            title: titleInput.value.trim(),
            author: authorInput.value.trim(),
            suffix: suffix,
            htmlContent: `<div style="padding: 20px;"><h2>¡Bienvenido a ${this.escapeHtml(titleInput.value)}!</h2><p>Página creada en GensokyoNet.</p></div>`,
            createdAt: new Date().toISOString().split('T')[0]
        };

        this.saveUserDomains();
        alert(`🎉 ¡Dominio gensokyo://${fullDomain} registrado! Irás al editor.`);
        this.navigate(`gensokyo://builder`);
    },

    getBuilderView() {
        const allUserDomains = Object.keys(this.userDomains);
        let domainOptions = allUserDomains.map(d => `<option value="${d}">gensokyo://${d}</option>`).join('');

        return `
            <div class="th-card">
                <div class="th-card-header">
                    <h1 class="th-card-title">✍️ Creador de Páginas Touhou</h1>
                    <span class="th-badge">Modo Creador</span>
                </div>
                <div class="th-form-group">
                    <label class="th-form-label">Selecciona el Dominio a Editar:</label>
                    <select id="builder-domain-select" class="th-form-select" onchange="GensokyoApp.loadDomainIntoBuilder(this.value)">
                        ${domainOptions || '<option value="">Registra primero un dominio en gensokyo://register</option>'}
                    </select>
                </div>
                <div class="th-form-group">
                    <label class="th-form-label">Contenido HTML / Texto:</label>
                    <textarea id="builder-content-input" class="th-form-textarea" placeholder="Escribe tu contenido aquí..."></textarea>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button class="btn-th-submit" onclick="GensokyoApp.saveBuilderContent()">💾 Guardar y Publicar</button>
                    <button class="btn-th-submit" style="background: #1e293b; border-color: #94a3b8;" onclick="GensokyoApp.insertTouhouTemplate()">🌸 Plantilla Touhou</button>
                </div>
            </div>
        `;
    },

    loadDomainIntoBuilder(domainName) {
        if (!domainName || !this.userDomains[domainName]) return;
        const textarea = document.getElementById('builder-content-input');
        if (textarea) textarea.value = this.userDomains[domainName].htmlContent;
    },

    insertTouhouTemplate() {
        const textarea = document.getElementById('builder-content-input');
        if (!textarea) return;
        textarea.value = `
<div style="background: rgba(153,0,0,0.15); border: 1px solid var(--th-red-bright); padding: 20px; border-radius: 10px;">
    <h2 style="color: var(--th-gold-bright); font-family: var(--font-heading);">🌸 Mi Rincón en Gensokyo</h2>
    <p>¡Hola a todos! Bienvenidos a mi rincón touhou.</p>
</div>
        `.trim();
    },

    saveBuilderContent() {
        const select = document.getElementById('builder-domain-select');
        const textarea = document.getElementById('builder-content-input');
        if (!select || !select.value || !this.userDomains[select.value]) {
            alert('Selecciona un dominio válido.');
            return;
        }
        this.userDomains[select.value].htmlContent = textarea.value;
        this.saveUserDomains();
        alert('✨ ¡Página publicada!');
        this.navigate(`gensokyo://${select.value}`);
    },

    performSearch(query) {
        const input = document.getElementById('th-search-query');
        const q = (query !== undefined ? query : (input ? input.value : '')).toLowerCase().trim();
        const resultsEl = document.getElementById('th-search-results');
        if (!resultsEl) return;

        const allSites = { ...GensokyoSeedData.domains, ...this.userDomains };
        let matches = [];

        Object.keys(allSites).forEach(domain => {
            const site = allSites[domain];
            const titleStr = (site.title || '').toLowerCase();
            const contentStr = (site.content || site.htmlContent || '').toLowerCase();

            if (!q || titleStr.includes(q) || contentStr.includes(q) || domain.includes(q)) {
                matches.push({ domain, site });
            }
        });

        if (matches.length === 0) {
            resultsEl.innerHTML = `<p style="color: var(--th-text-muted); text-align: center; margin-top: 20px;">No se encontraron resultados para "${this.escapeHtml(q)}".</p>`;
            return;
        }

        let html = `<h3 style="font-family: var(--font-heading); color: var(--th-gold-bright); margin-bottom: 14px;">Resultados (${matches.length}):</h3>`;
        matches.forEach(item => {
            html += `
                <div class="news-article-card" style="margin-bottom: 12px;">
                    <a href="#" onclick="GensokyoApp.navigate('gensokyo://${item.domain}')" style="font-family: var(--font-heading); font-size: 1.1rem; color: var(--th-gold-bright); text-decoration: none;">
                        gensokyo://${item.domain}
                    </a>
                    <div style="font-size: 0.95rem; font-weight: 600; color: #fff; margin: 4px 0;">${this.escapeHtml(item.site.title)}</div>
                </div>
            `;
        });

        resultsEl.innerHTML = html;
    },

    showDonationModal() {
        document.getElementById('th-donation-modal')?.classList.remove('hidden');
    },

    hideDonationModal() {
        document.getElementById('th-donation-modal')?.classList.add('hidden');
    },

    escapeHtml(str) {
        return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
};

document.addEventListener('DOMContentLoaded', () => {
    GensokyoApp.init();
});
