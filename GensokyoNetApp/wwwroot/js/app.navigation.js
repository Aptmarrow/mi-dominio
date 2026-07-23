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
        return clean;
    },

    submitUrl() {
        const input = document.getElementById('th-url-input');
        if (!input) return;

        let rawVal = input.value.trim();
        if (rawVal.startsWith('gensokyo://')) {
            rawVal = rawVal.replace('gensokyo://', '');
        }

        if (!rawVal.includes('.') && !rawVal.startsWith('search') && !rawVal.startsWith('register') && !rawVal.startsWith('builder') && !rawVal.startsWith('home')) {
            this.navigate(`gensokyo://search?q=${encodeURIComponent(rawVal)}`);
            return;
        }

        this.navigate(`gensokyo://${rawVal}`);
    },

    navigate(fullUrl) {
        const activeTab = this.getActiveTab();
        if (!activeTab) return;

        let path = fullUrl;
        if (path.startsWith('gensokyo://')) path = path.replace('gensokyo://', '');
        path = path.trim();

        if (path.includes('.') && (path.endsWith('.com') || path.endsWith('.org') || path.endsWith('.net') || path.includes('http') || path.includes('roblox') || path.includes('google'))) {
            this.renderHakureiBarrier(path);
            this.updateUrlInput(path);
            return;
        }

        const normalizedUrl = `gensokyo://${path}`;
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

    updateUrlInput(url) {
        const input = document.getElementById('th-url-input');
        if (!input) return;
        input.value = url.replace('gensokyo://', '');
    },

    updateSidebarActiveState(url) {
        const clean = url.replace('gensokyo://', '').trim().toLowerCase();
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

    renderRoute(fullUrl) {
        const viewport = document.getElementById('th-viewport');
        if (!viewport) return;

        let path = fullUrl.replace('gensokyo://', '').trim();

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

        if (GensokyoSeedData.domains[path]) {
            viewport.innerHTML = GensokyoSeedData.domains[path].content;
            return;
        }

        if (this.userDomains[path]) {
            const userSite = this.userDomains[path];
            viewport.innerHTML = `
                <div class="th-card">
                    <div class="th-card-header">
                        <h1 class="th-card-title">${this.escapeHtml(userSite.title)}</h1>
                        <span class="th-badge">Dominio de Usuario • ${this.escapeHtml(userSite.suffix || '.blog')}</span>
                    </div>
                    <div style="font-size: 0.88rem; color: var(--th-crimson); font-weight:700; margin-bottom: 16px;">
                        Creador (Gensokyo ID): ${this.escapeHtml(userSite.author || this.passport.username)} • Publicado en GensokyoNet
                    </div>
                    <div class="user-site-body" style="font-size: 1rem; line-height: 1.6;">
                        ${userSite.htmlContent}
                    </div>
                </div>
            `;
            return;
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
                        <input type="text" id="gx-home-search" class="gx-search-input" placeholder="Buscar en la red (ej: noticias, templo, marisa, bad apple)..." onkeypress="if(event.key==='Enter'){ GensokyoApp.submitHomeSearch(); }">
                        <button class="gx-search-btn" onclick="GensokyoApp.submitHomeSearch()">Buscar</button>
                    </div>
                </div>

                <div class="gx-speed-dial-grid">
                    <div class="gx-dial-card" onclick="GensokyoApp.navigate('gensokyo://bunbunmaru.news')">
                        <div class="dial-icon-wrap">
                            <svg class="th-svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                        </div>
                        <div class="dial-title">Bunbunmaru</div>
                        <div class="dial-sub">Diario de Aya Shameimaru</div>
                    </div>

                    <div class="gx-dial-card" onclick="GensokyoApp.navigate('gensokyo://reimu.shrine')">
                        <div class="dial-icon-wrap">
                            <svg class="th-svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/></svg>
                        </div>
                        <div class="dial-title">reimu.shrine</div>
                        <div class="dial-sub">Templo Hakurei</div>
                    </div>

                    <div class="gx-dial-card" onclick="GensokyoApp.navigate('gensokyo://register')">
                        <div class="dial-icon-wrap">
                            <svg class="th-svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>
                        </div>
                        <div class="dial-title">Reclamar Dominio</div>
                        <div class="dial-sub">Obtén tu dirección gratis</div>
                    </div>

                    <div class="gx-dial-card" onclick="GensokyoApp.navigate('gensokyo://builder')">
                        <div class="dial-icon-wrap">
                            <svg class="th-svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </div>
                        <div class="dial-title">Creador Web</div>
                        <div class="dial-sub">Escribe tu propio rincón</div>
                    </div>
                </div>
            </div>
        `;
    },

    renderHakureiBarrier(externalUrl) {
        const viewport = document.getElementById('th-viewport');
        if (!viewport) return;

        viewport.innerHTML = `
            <div class="th-card" style="max-width: 650px; margin: 40px auto; text-align: center; border-color: var(--th-crimson);">
                <h2 class="th-card-title" style="margin-bottom: 10px;">Paz sobre la Barrera Hakurei</h2>
                <div class="gx-address-bar" style="max-width: 400px; margin: 15px auto; justify-content: center;">${this.escapeHtml(externalUrl)}</div>
                <p style="line-height: 1.6; margin-bottom: 24px;">
                    <strong>Acceso denegado.</strong> La Barrera Hakurei impide las conexiones hacia el <em>Mundo Exterior</em>.<br>
                    GensokyoNet es un ecosistema exclusivo para la comunidad.
                </p>
                <button class="gx-btn-go" onclick="GensokyoApp.navigate('gensokyo://home')">Regresar a Inicio</button>
            </div>
        `;
    }
});
