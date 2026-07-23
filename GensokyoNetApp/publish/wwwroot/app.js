/**
 * GensokyoNet Engine - Pasaporte de Gensokyo (Identidad Centralizada & OAuth API)
 * Layout Exacto de la Imagen: Perfil Compacto (Foto 52px, Nameless Youkai + ID, Cartelito Sin Registrar)
 * Botonera Limpia: Registrarse + Iniciar Sesión (o Log Out al estar registrado)
 */

const GensokyoApp = {
    tabs: [],
    activeTabId: null,
    nextTabId: 1,
    userDomains: {},
    accountsDB: {},
    currentTheme: 'scarlet',

    // Pasaporte por defecto: Nameless Youkai (Sin Registrar)
    passport: {
        isLoggedIn: true,
        isRegistered: false,
        userId: "ID#0000",
        username: "Nameless Youkai",
        avatarUrl: "assets/nameless_avatar.png",
        ownedDomains: [],
        oauthToken: "gx_live_token_0000_nameless_youkai_key"
    },

    // Estado temporal para el recortador de foto de perfil
    tempAvatarDataUrl: null,
    cropZoom: 1,

    init() {
        this.loadAccountsDB();
        this.loadPassportData();
        this.loadUserDomains();

        const urlInput = document.getElementById('th-url-input');
        if (urlInput) {
            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.submitUrl();
                }
            });
        }

        this.createNewTab('gensokyo://home', 'Inicio');
        this.updateDomainCount();
        this.updatePassportUI();
    },

    /* ==========================================================================
       BASE DE DATOS Y SISTEMA DE PASAPORTE (NAMELESS YOUKAI POR DEFECTO)
       ========================================================================== */

    loadAccountsDB() {
        const stored = localStorage.getItem('gensokyo_accounts_db');
        if (stored) {
            try {
                this.accountsDB = JSON.parse(stored);
            } catch (e) {
                console.error("Error al cargar Cuentas DB", e);
            }
        }
    },

    saveAccountsDB() {
        localStorage.setItem('gensokyo_accounts_db', JSON.stringify(this.accountsDB));
    },

    loadPassportData() {
        const stored = localStorage.getItem('gensokyo_passport');
        if (stored) {
            try {
                this.passport = JSON.parse(stored);
            } catch (e) {
                console.error("Error al cargar Pasaporte", e);
            }
        } else {
            this.savePassportData();
        }
    },

    savePassportData() {
        localStorage.setItem('gensokyo_passport', JSON.stringify(this.passport));
        this.updatePassportUI();
    },

    updatePassportUI() {
        // Header de Google SERP y Sidebar Avatar
        const serpAvatarEl = document.getElementById('serp-header-avatar');
        if (serpAvatarEl) {
            serpAvatarEl.innerHTML = `<img src="${this.passport.avatarUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" alt="${this.escapeHtml(this.passport.username)}">`;
        }

        const sideAvatarEl = document.getElementById('sidebar-passport-avatar');
        if (sideAvatarEl) {
            sideAvatarEl.innerHTML = `<img src="${this.passport.avatarUrl}" style="width:26px; height:26px; object-fit:cover; border-radius:50%;" alt="${this.escapeHtml(this.passport.username)}">`;
        }

        const modalAvatarEl = document.getElementById('passport-modal-avatar');
        if (modalAvatarEl) {
            modalAvatarEl.src = this.passport.avatarUrl;
        }

        const nameEl = document.getElementById('passport-display-name');
        if (nameEl) nameEl.innerText = this.passport.username.toUpperCase();

        const idEl = document.getElementById('passport-display-id');
        if (idEl) idEl.innerText = this.passport.userId;

        // Cartelito "Cuenta Sin Registrar" / "Cuenta Protegida"
        const statusBadgeEl = document.getElementById('passport-status-badge');
        if (statusBadgeEl) {
            if (this.passport.isRegistered) {
                statusBadgeEl.innerText = 'Cuenta Protegida 🔒';
                statusBadgeEl.style.color = '#2e7d32';
            } else {
                statusBadgeEl.innerText = 'Cuenta Sin Registrar';
                statusBadgeEl.style.color = 'var(--th-crimson)';
            }
        }

        // Renderizado dinámico de la botonera (Sin campo apodo, exacto a la imagen)
        const btnContainer = document.getElementById('passport-session-buttons');
        if (btnContainer) {
            if (this.passport.isRegistered) {
                btnContainer.innerHTML = `
                    <button type="button" class="gx-btn-go" style="width:100%; background:var(--th-crimson); padding:10px; font-size:0.9rem; border-radius:6px;" onclick="GensokyoApp.handleLogout()">
                        Log Out (Cerrar Sesión)
                    </button>
                `;
            } else {
                btnContainer.innerHTML = `
                    <button type="button" class="gx-btn-go" style="flex:1; background:var(--th-crimson); padding:10px; font-size:0.9rem; border-radius:6px; font-weight:700; text-transform:uppercase;" onclick="GensokyoApp.handleRegisterPrompt()">
                        Registrarse
                    </button>
                    <button type="button" class="gx-btn-go" style="flex:1; background:var(--th-bg-main); border:1.5px solid var(--th-crimson); color:var(--th-crimson); padding:10px; font-size:0.9rem; border-radius:6px; font-weight:700;" onclick="GensokyoApp.handleLoginPrompt()">
                        Iniciar Sesión
                    </button>
                `;
            }
        }
    },

    showPassportModal() {
        const modal = document.getElementById('th-passport-modal');
        if (!modal) return;

        this.updatePassportUI();

        // Cargar lista de dominios propios
        const domainListEl = document.getElementById('passport-domain-list');
        if (domainListEl) {
            const allOwned = [...this.passport.ownedDomains, ...Object.keys(this.userDomains)];
            const uniqueOwned = [...new Set(allOwned)];

            if (uniqueOwned.length === 0) {
                domainListEl.innerHTML = `<p style="font-size:0.85rem; color:var(--th-text-sub);">Aún no posees dominios. Registra uno gratis en gensokyo://register</p>`;
            } else {
                domainListEl.innerHTML = uniqueOwned.map(dom => `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--th-bg-main); padding:8px 12px; border-radius:6px; border:1px solid var(--th-border-warm); margin-bottom:6px;">
                        <span style="font-family:var(--font-heading); font-weight:700; color:var(--th-crimson); font-size:0.88rem;">gensokyo://${this.escapeHtml(dom)}</span>
                        <button class="gx-btn-go" style="padding:4px 10px; font-size:0.75rem;" onclick="GensokyoApp.hidePassportModal(); GensokyoApp.navigate('gensokyo://${this.escapeHtml(dom)}');">Visitar</button>
                    </div>
                `).join('');
            }
        }

        modal.classList.remove('hidden');
    },

    hidePassportModal() {
        document.getElementById('th-passport-modal')?.classList.add('hidden');
    },

    /* ==========================================================================
       SUBIR & AJUSTAR FOTO DE PERFIL ESTILO GOOGLE (CROPPER / ZOOM)
       ========================================================================== */

    triggerAvatarUpload() {
        const input = document.getElementById('avatar-file-input');
        if (input) input.click();
    },

    handleAvatarFileSelected(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.tempAvatarDataUrl = e.target.result;
            this.cropZoom = 1;
            this.cropZoomMin = 1;
            this.cropZoomMax = 8;
            this.showAvatarCropModal();
        };
        reader.readAsDataURL(file);

        // Permite re-seleccionar el mismo archivo sin recargar la app.
        event.target.value = '';
    },

    showAvatarCropModal() {
        const modal = document.getElementById('th-avatar-crop-modal');
        const img = document.getElementById('avatar-crop-img');
        const zoomInput = document.getElementById('crop-zoom-range');

        if (!modal || !img || !this.tempAvatarDataUrl) return;

        img.onload = () => {
            const naturalW = img.naturalWidth || 1;
            const naturalH = img.naturalHeight || 1;
            const aspectRatio = Math.max(naturalW, naturalH) / Math.max(1, Math.min(naturalW, naturalH));

            this.cropZoomMin = 1;
            this.cropZoomMax = Math.min(12, Math.max(4, Math.ceil(aspectRatio * 3)));
            this.cropZoom = 1;

            if (zoomInput) {
                zoomInput.min = String(this.cropZoomMin);
                zoomInput.max = String(this.cropZoomMax);
                zoomInput.step = '0.05';
                zoomInput.value = String(this.cropZoom);
            }

            this.updateCropZoom(this.cropZoom);
        };

        img.onerror = () => {
            alert('No se pudo cargar la imagen seleccionada. Intenta con otro archivo.');
            this.hideAvatarCropModal();
        };

        img.src = this.tempAvatarDataUrl;

        modal.classList.remove('hidden');
    },

    hideAvatarCropModal() {
        document.getElementById('th-avatar-crop-modal')?.classList.add('hidden');
    },

    updateCropZoom(val) {
        const nextZoom = Number(val);
        const minZoom = Number(this.cropZoomMin || 1);
        const maxZoom = Number(this.cropZoomMax || 8);
        const safeZoom = Number.isFinite(nextZoom) ? nextZoom : minZoom;

        this.cropZoom = Math.min(maxZoom, Math.max(minZoom, safeZoom));

        const img = document.getElementById('avatar-crop-img');
        if (img) {
            img.style.transform = `scale(${this.cropZoom})`;
        }

        const zoomInput = document.getElementById('crop-zoom-range');
        if (zoomInput && zoomInput.value !== String(this.cropZoom)) {
            zoomInput.value = String(this.cropZoom);
        }
    },

    saveCroppedAvatar() {
        if (!this.tempAvatarDataUrl) return;

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 300;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            ctx.clip();

            const sourceW = img.naturalWidth || img.width || 1;
            const sourceH = img.naturalHeight || img.height || 1;
            const coverScale = Math.max(size / sourceW, size / sourceH);
            const zoom = Math.max(1, Number(this.cropZoom) || 1);

            const drawW = sourceW * coverScale * zoom;
            const drawH = sourceH * coverScale * zoom;
            const drawX = (size - drawW) / 2;
            const drawY = (size - drawH) / 2;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, drawX, drawY, drawW, drawH);

            const croppedDataUrl = canvas.toDataURL('image/png');
            this.passport.avatarUrl = croppedDataUrl;

            if (this.passport.isRegistered && this.accountsDB[this.passport.username.toLowerCase()]) {
                this.accountsDB[this.passport.username.toLowerCase()].avatarUrl = croppedDataUrl;
                this.saveAccountsDB();
            }

            this.savePassportData();
            this.hideAvatarCropModal();
            this.tempAvatarDataUrl = null;
            alert('¡Foto de perfil actualizada con éxito!');
        };
        img.src = this.tempAvatarDataUrl;
    },

    /* ==========================================================================
       REGISTRO & AUTENTICACIÓN
       ========================================================================== */

    handleRegisterPrompt() {
        const username = prompt("Registro de Cuenta en GensokyoNet:\n\nIngresa tu Nombre de Usuario deseado:", "Nameless Youkai");
        if (!username || !username.trim()) return;

        const cleanName = username.trim();
        const key = cleanName.toLowerCase();

        if (this.accountsDB[key]) {
            alert(`El usuario "${cleanName}" ya se encuentra registrado.`);
            return;
        }

        const password = prompt(`Crea una Contraseña para proteger tu usuario "${cleanName}"\n(Mínimo 8 caracteres):`);
        if (password === null) return;

        if (password.trim().length < 8) {
            alert('Error: La contraseña debe tener como mínimo 8 caracteres.');
            return;
        }

        if (this.passport.userId === "ID#0000") {
            this.passport.userId = `ID#${Math.floor(1000 + Math.random() * 9000)}`;
        }

        this.passport.username = cleanName;
        this.passport.isRegistered = true;
        this.passport.oauthToken = `gx_live_token_${this.passport.userId.replace('ID#', '')}_${key}_key`;

        this.accountsDB[key] = {
            username: cleanName,
            userId: this.passport.userId,
            password: password.trim(),
            avatarUrl: this.passport.avatarUrl,
            ownedDomains: this.passport.ownedDomains,
            createdAt: new Date().toISOString()
        };

        this.saveAccountsDB();
        this.savePassportData();

        alert(`¡Cuenta registrada exitosamente! Bienvenido ${cleanName} (${this.passport.userId}). Ya puedes reclamar dominios propios.`);
        this.hidePassportModal();
    },

    handleLoginPrompt() {
        const username = prompt("Iniciar Sesión en GensokyoNet:\n\nIngresa tu Nombre de Usuario:");
        if (!username || !username.trim()) return;

        const key = username.trim().toLowerCase();

        if (!this.accountsDB[key]) {
            alert(`El usuario "${username.trim()}" no está registrado con contraseña aún.`);
            return;
        }

        const password = prompt(`Ingresa la contraseña para "${this.accountsDB[key].username}":`);
        if (password === null) return;

        if (this.accountsDB[key].password !== password.trim()) {
            alert('Contraseña incorrecta.');
            return;
        }

        const acc = this.accountsDB[key];
        this.passport = {
            isLoggedIn: true,
            isRegistered: true,
            userId: acc.userId,
            username: acc.username,
            avatarUrl: acc.avatarUrl || "assets/nameless_avatar.png",
            ownedDomains: acc.ownedDomains || [],
            oauthToken: `gx_live_token_${acc.userId.replace('ID#', '')}_${key}_key`
        };

        this.savePassportData();
        alert(`¡Bienvenido de vuelta, ${acc.username}!`);
        this.hidePassportModal();
    },

    handleLogout() {
        this.passport = {
            isLoggedIn: true,
            isRegistered: false,
            userId: "ID#0000",
            username: "Nameless Youkai",
            email: "nameless@gensokyo.net",
            avatarUrl: "assets/nameless_avatar.png",
            ownedDomains: [],
            oauthToken: "gx_live_token_0000_nameless_youkai_key"
        };
        this.savePassportData();
        alert('Has cerrado sesión. Ahora eres nuevamente Nameless Youkai.');
    },

    copyOAuthToken() {
        navigator.clipboard.writeText(this.passport.oauthToken).then(() => {
            alert('¡Token OAuth copiado al portapapeles! Úsalo en tus aplicaciones.');
        }).catch(() => {
            alert(`Token OAuth: ${this.passport.oauthToken}`);
        });
    },

    showThemeModal() {
        document.getElementById('th-theme-modal')?.classList.remove('hidden');
    },

    hideThemeModal() {
        document.getElementById('th-theme-modal')?.classList.add('hidden');
    },

    applyTheme(themeKey) {
        this.currentTheme = themeKey;
        document.body.classList.remove('theme-scarlet', 'theme-hakugyokurou');

        document.getElementById('theme-card-scarlet')?.classList.remove('active');
        document.getElementById('theme-card-hakugyokurou')?.classList.remove('active');

        const statusEl = document.getElementById('th-status-text');

        if (themeKey === 'hakugyokurou') {
            document.body.classList.add('theme-hakugyokurou');
            document.getElementById('theme-card-hakugyokurou')?.classList.add('active');
            if (statusEl) statusEl.innerText = 'GensokyoNet • Estilo Hakugyokurou (TH07 Modo Oscuro)';
        } else {
            document.body.classList.add('theme-scarlet');
            document.getElementById('theme-card-scarlet')?.classList.add('active');
            if (statusEl) statusEl.innerText = 'GensokyoNet • Estilo Scarlet Mist (TH06 Modo Pergamino)';
        }

        this.hideThemeModal();
    },

    loadUserDomains() {
        const stored = localStorage.getItem('gensokyo_user_domains');
        if (stored) {
            try {
                this.userDomains = JSON.parse(stored);
            } catch (e) {
                console.error("Error al cargar dominios", e);
            }
        }
    },

    saveUserDomains() {
        localStorage.setItem('gensokyo_user_domains', JSON.stringify(this.userDomains));
        this.updateDomainCount();
    },

    updateDomainCount() {
        const total = Object.keys(GensokyoSeedData.domains).length + Object.keys(this.userDomains).length;
        const countEl = document.getElementById('th-domain-count');
        if (countEl) {
            countEl.innerText = `Dominios Activos: ${total}`;
        }
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
            this.tabs[0].url = 'gensokyo://home';
            this.tabs[0].title = 'Inicio';
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
            <div class="gx-tab ${tab.id === this.activeTabId ? 'active' : ''}" onclick="GensokyoApp.switchTab('${tab.id}')">
                <span class="gx-tab-title">${this.escapeHtml(tab.title)}</span>
                <span class="gx-tab-close" onclick="GensokyoApp.closeTab('${tab.id}', event)">
                    <svg style="width:10px; height:10px;" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </span>
            </div>
        `).join('');
    },

    getTabTitleFromUrl(url) {
        let clean = url.replace('gensokyo://', '').trim().toLowerCase();
        if (clean === 'home' || clean === '') return 'Inicio';
        if (clean.startsWith('search')) return 'Búsqueda';
        if (clean === 'bunbunmaru.news') return 'Bunbunmaru';
        if (clean === 'reimu.shrine') return 'reimu.shrine';
        if (clean === 'register') return 'Reclamar Dominio';
        if (clean === 'builder') return 'Creador Web';
        return clean;
    },

    /* ==========================================================================
       ENRUTAMIENTO Y BARRERA HAKUREI
       ========================================================================== */

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
        if (path.startsWith('gensokyo://')) {
            path = path.replace('gensokyo://', '');
        }
        path = path.trim();

        // Sandbox Barrera Hakurei
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
        if (input) {
            let clean = url.replace('gensokyo://', '');
            input.value = clean;
        }
    },

    updateSidebarActiveState(url) {
        let clean = url.replace('gensokyo://', '').trim().toLowerCase();
        document.querySelectorAll('.gx-side-btn').forEach(btn => btn.classList.remove('active'));

        if (clean === 'home' || clean === '') document.getElementById('nav-home')?.classList.add('active');
        else if (clean === 'bunbunmaru.news') document.getElementById('nav-news')?.classList.add('active');
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
       MOTOR DE BÚSQUEDA GENSOKYONET CON INTERFAZ EXACTA A GOOGLE SERP
       ========================================================================== */

    submitHomeSearch() {
        const input = document.getElementById('gx-home-search');
        if (!input) return;
        const q = input.value.trim();
        if (!q) return;

        this.navigate(`gensokyo://search?q=${encodeURIComponent(q)}`);
    },

    submitSerpSearch() {
        const input = document.getElementById('serp-search-input');
        if (!input) return;
        const q = input.value.trim();
        if (!q) return;

        this.navigate(`gensokyo://search?q=${encodeURIComponent(q)}`);
    },

    renderSearchResults(query, filterTab = 'all') {
        const viewport = document.getElementById('th-viewport');
        if (!viewport) return;

        const cleanQ = (query || '').toLowerCase().trim();

        // 1. Filtrar Sitios Web
        const allDomains = { ...GensokyoSeedData.domains, ...this.userDomains };
        const matchedWebs = [];

        Object.keys(allDomains).forEach(domainKey => {
            const site = allDomains[domainKey];
            const title = (site.title || '').toLowerCase();
            const snippet = (site.snippet || site.author || '').toLowerCase();
            const content = (site.htmlContent || site.content || '').toLowerCase();

            if (!cleanQ || domainKey.includes(cleanQ) || title.includes(cleanQ) || snippet.includes(cleanQ) || content.includes(cleanQ)) {
                matchedWebs.push({
                    domain: domainKey,
                    title: site.title || domainKey,
                    author: site.author || 'la comunidad',
                    snippet: site.snippet || `Sitio publicado en la red GensokyoNet por ${site.author || 'la comunidad'}.`
                });
            }
        });

        // 2. Filtrar Imágenes
        const matchedImages = GensokyoSeedData.images.filter(img => {
            if (!cleanQ) return true;
            return img.title.toLowerCase().includes(cleanQ) || 
                   img.tags.some(t => t.toLowerCase().includes(cleanQ)) ||
                   img.domain.toLowerCase().includes(cleanQ);
        });

        // 3. Filtrar Vídeos / PVs
        const matchedVideos = GensokyoSeedData.videos.filter(vid => {
            if (!cleanQ) return true;
            return vid.title.toLowerCase().includes(cleanQ) || 
                   vid.description.toLowerCase().includes(cleanQ) ||
                   vid.tags.some(t => t.toLowerCase().includes(cleanQ));
        });

        let activeCount = matchedWebs.length;
        if (filterTab === 'images') activeCount = matchedImages.length;
        if (filterTab === 'videos') activeCount = matchedVideos.length;
        if (filterTab === 'news') activeCount = matchedWebs.filter(w => w.domain.includes('news') || w.domain.includes('blog')).length;

        viewport.innerHTML = `
            <div class="google-serp-container">
                <!-- Google SERP Header Superior -->
                <div class="google-serp-top-header">
                    <div class="serp-brand-group" onclick="GensokyoApp.navigate('gensokyo://home')">
                        <span class="serp-google-logo">GensokyoNet</span>
                    </div>
                    
                    <div class="serp-search-bar-wrap">
                        <input type="text" id="serp-search-input" class="serp-search-input" value="${this.escapeHtml(query)}" onkeypress="if(event.key==='Enter'){ GensokyoApp.submitSerpSearch(); }">
                        <span class="serp-clear-btn" onclick="document.getElementById('serp-search-input').value=''; document.getElementById('serp-search-input').focus();">
                            <svg class="th-svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                        </span>
                        <div class="serp-divider"></div>
                        <button class="serp-search-icon-btn" onclick="GensokyoApp.submitSerpSearch()">
                            <svg class="th-svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                        </button>
                    </div>

                    <div class="serp-user-profile-group">
                        <span class="serp-icon-btn" title="Compartir">
                            <svg class="th-svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
                        </span>
                        <span class="serp-icon-btn" title="Aplicaciones de Gensokyo">
                            <svg class="th-svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm4-10v4h4V4h-4zm-4 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/></svg>
                        </span>
                        <div id="serp-header-avatar" class="serp-avatar-circle" onclick="GensokyoApp.showPassportModal()" title="Pasaporte de Gensokyo: ${this.escapeHtml(this.passport.username)} (${this.escapeHtml(this.passport.userId)})">
                            <img src="${this.passport.avatarUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" alt="${this.escapeHtml(this.passport.username)}">
                        </div>
                    </div>
                </div>

                <!-- Google SERP Subheader Row -->
                <nav class="google-serp-tab-bar">
                    <button class="google-tab ${filterTab === 'all' ? 'active' : ''}" onclick="GensokyoApp.renderSearchResults('${this.escapeHtml(query)}', 'all')">Todo</button>
                    <button class="google-tab ${filterTab === 'videos' ? 'active' : ''}" onclick="GensokyoApp.renderSearchResults('${this.escapeHtml(query)}', 'videos')">Videos</button>
                    <button class="google-tab ${filterTab === 'images' ? 'active' : ''}" onclick="GensokyoApp.renderSearchResults('${this.escapeHtml(query)}', 'images')">Imágenes</button>
                    <button class="google-tab ${filterTab === 'news' ? 'active' : ''}" onclick="GensokyoApp.renderSearchResults('${this.escapeHtml(query)}', 'news')">Noticias</button>
                    <button class="google-tab">Más ▾</button>
                    <div class="serp-tools-space"></div>
                    <button class="google-tab tools-btn">Herramientas ▾</button>
                </nav>

                <div class="search-stats-banner">
                    Aproximadamente ${activeCount} resultados (${(Math.random() * 0.2 + 0.1).toFixed(2)} segundos)
                </div>

                <!-- Contenido de Resultados -->
                ${filterTab === 'all' ? this.renderWebResultsHTML(matchedWebs) : ''}
                ${filterTab === 'images' ? this.renderImageResultsHTML(matchedImages) : ''}
                ${filterTab === 'videos' ? this.renderVideoResultsHTML(matchedVideos) : ''}
                ${filterTab === 'news' ? this.renderWebResultsHTML(matchedWebs.filter(w => w.domain.includes('news') || w.domain.includes('blog'))) : ''}
            </div>
        `;
    },

    renderWebResultsHTML(webResults) {
        if (webResults.length === 0) {
            return `
                <div class="th-card" style="text-align: center; padding: 30px;">
                    <h2 class="th-card-title">Sin resultados web</h2>
                    <p style="margin-bottom: 16px;">No se encontraron páginas web registradas para tu búsqueda.</p>
                    <button class="gx-btn-go" onclick="GensokyoApp.navigate('gensokyo://register')">Reclamar Dominio Gratis</button>
                </div>
            `;
        }

        return `
            <div class="search-results-list">
                ${webResults.map(item => `
                    <div class="search-web-card">
                        <div class="search-web-domain">
                            <svg class="th-svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                            gensokyo://${this.escapeHtml(item.domain)}
                        </div>
                        <a class="search-web-title" onclick="GensokyoApp.navigate('gensokyo://${this.escapeHtml(item.domain)}')">
                            ${this.escapeHtml(item.title)}
                        </a>
                        <div class="search-web-snippet">${this.escapeHtml(item.snippet)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderImageResultsHTML(imageResults) {
        if (imageResults.length === 0) {
            return `<div class="th-card" style="text-align:center;"><p>No se encontraron imágenes para esta búsqueda.</p></div>`;
        }

        return `
            <div class="search-images-grid">
                ${imageResults.map(img => `
                    <div class="search-image-card" onclick="GensokyoApp.navigate('gensokyo://${this.escapeHtml(img.domain)}')">
                        <img src="${img.url}" class="search-image-thumb" alt="${this.escapeHtml(img.title)}">
                        <div class="search-image-meta">
                            <div class="search-image-title">${this.escapeHtml(img.title)}</div>
                            <div class="search-image-sub">gensokyo://${this.escapeHtml(img.domain)} • ${this.escapeHtml(img.author)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderVideoResultsHTML(videoResults) {
        if (videoResults.length === 0) {
            return `<div class="th-card" style="text-align:center;"><p>No se encontraron vídeos o PVs animadas para esta búsqueda.</p></div>`;
        }

        return `
            <div class="search-videos-list">
                ${videoResults.map(vid => `
                    <div class="search-video-card">
                        <div class="search-video-preview">
                            <iframe src="${vid.embedUrl}" style="width:100%; height:100%; border:none;" allowfullscreen></iframe>
                            <span class="search-video-duration">${this.escapeHtml(vid.duration)}</span>
                        </div>
                        <div class="search-video-info">
                            <div class="search-video-title">${this.escapeHtml(vid.title)}</div>
                            <div class="search-video-author">Autor: ${this.escapeHtml(vid.author)}</div>
                            <div class="search-video-desc">${this.escapeHtml(vid.description)}</div>
                            <button class="gx-btn-go" onclick="GensokyoApp.navigate('gensokyo://${this.escapeHtml(vid.domain)}')">Ver en gensokyo://${this.escapeHtml(vid.domain)}</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /* ==========================================================================
       VISTA PRINCIPAL & ENRUTAMIENTO (CON RESTRICCIÓN DE DOMINIOS)
       ========================================================================== */

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
                <!-- Touhou Showcase Hero Banner -->
                <div class="yomoyama-banner-card">
                    <div class="yomoyama-banner-inner" style="background-image: url('assets/gensokyo_banner.png');">
                        <div class="banner-overlay-gradient"></div>
                        <div class="banner-title-group">
                            <h1 class="yomoyama-main-title">東方 GensokyoNet</h1>
                            <p class="yomoyama-sub-title">Intranet Libre para la Comunidad Doujin de Touhou</p>
                        </div>
                    </div>
                </div>

                <!-- Clean Search Box -->
                <div class="gx-search-box-wrap">
                    <div class="gx-search-box">
                        <input type="text" id="gx-home-search" class="gx-search-input" placeholder="Buscar en la red (ej: noticias, templo, marisa, bad apple)..." onkeypress="if(event.key==='Enter'){ GensokyoApp.submitHomeSearch(); }">
                        <button class="gx-search-btn" onclick="GensokyoApp.submitHomeSearch()">
                            Buscar
                        </button>
                    </div>
                </div>

                <!-- Speed Dial Cards Grid -->
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
                <button class="gx-btn-go" onclick="GensokyoApp.navigate('gensokyo://home')">
                    Regresar a Inicio
                </button>
            </div>
        `;
    },

    // 1. RESTRICCIÓN: Solo Cuentas Registradas pueden reclamar dominios
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
            alert('Debes registrar tu cuenta primero desde tu Pasaporte.');
            this.showPassportModal();
            return;
        }

        const aliasInput = document.getElementById('reg-alias');
        const suffixSelect = document.getElementById('reg-suffix');
        const titleInput = document.getElementById('reg-title');

        if (!aliasInput || !titleInput) return;
        let cleanAlias = aliasInput.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
        const suffix = suffixSelect.value;
        const fullDomain = `${cleanAlias}${suffix}`;

        if (GensokyoSeedData.domains[fullDomain] || this.userDomains[fullDomain]) {
            alert(`El dominio gensokyo://${fullDomain} ya está registrado.`);
            return;
        }

        this.userDomains[fullDomain] = {
            title: titleInput.value.trim(),
            author: this.passport.username,
            ownerId: this.passport.userId,
            suffix: suffix,
            htmlContent: `
<div style="background: var(--th-bg-main); border: 1.5px solid var(--th-crimson); padding: 24px; border-radius: 10px; text-align:center;">
    <h2 style="color: var(--th-crimson); font-family: var(--font-heading); margin-bottom:10px;">${this.escapeHtml(titleInput.value)}</h2>
    <p style="margin-bottom:16px;">Página oficial registrada por <strong>${this.escapeHtml(this.passport.username)}</strong> (${this.escapeHtml(this.passport.userId)}).</p>
    
    <div style="background:var(--th-bg-card); padding:16px; border-radius:8px; border:1px solid var(--th-border-warm); max-width:400px; margin:0 auto;">
        <p style="font-size:0.85rem; font-weight:700; margin-bottom:10px;">Autenticación con Gensokyo ID OAuth</p>
        <button class="gx-btn-go" onclick="alert('¡Autenticado con tu Pasaporte: ${this.escapeHtml(this.passport.username)} (${this.escapeHtml(this.passport.userId)})!')">
            Iniciar Sesión con Gensokyo ID
        </button>
    </div>
</div>
            `.trim(),
            createdAt: new Date().toISOString().split('T')[0]
        };

        if (!this.passport.ownedDomains.includes(fullDomain)) {
            this.passport.ownedDomains.push(fullDomain);
            this.savePassportData();
        }

        this.saveUserDomains();
        alert(`¡Dominio gensokyo://${fullDomain} registrado a tu nombre! Irás al editor.`);
        this.navigate(`gensokyo://builder`);
    },

    getBuilderView() {
        const allUserDomains = Object.keys(this.userDomains);
        let domainOptions = allUserDomains.map(d => `<option value="${d}">gensokyo://${d}</option>`).join('');

        return `
            <div class="th-card">
                <div class="th-card-header">
                    <h1 class="th-card-title">Creador de Páginas Touhou</h1>
                    <span class="th-badge">Identidad: ${this.escapeHtml(this.passport.username)}</span>
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-family: var(--font-heading); font-weight: 700; color: var(--th-crimson); margin-bottom: 6px;">Selecciona el Dominio a Editar:</label>
                    <select id="builder-domain-select" style="width: 100%; background: var(--th-bg-main); border: 1.5px solid var(--th-crimson); color: var(--th-text-main); padding: 10px; border-radius: 6px; font-weight: 700;" onchange="GensokyoApp.loadDomainIntoBuilder(this.value)">
                        ${domainOptions || '<option value="">Registra primero un dominio en gensokyo://register</option>'}
                    </select>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-family: var(--font-heading); font-weight: 700; color: var(--th-crimson); margin-bottom: 6px;">Contenido HTML / Texto:</label>
                    <textarea id="builder-content-input" style="width: 100%; min-height: 150px; background: var(--th-bg-main); border: 1.5px solid var(--th-crimson); color: var(--th-text-main); padding: 12px; border-radius: 6px;" placeholder="Escribe tu contenido aquí..."></textarea>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button class="gx-btn-go" style="padding: 10px 20px;" onclick="GensokyoApp.saveBuilderContent()">Guardar y Publicar</button>
                    <button class="gx-btn-go" style="background: var(--th-crimson-dark); padding: 10px 20px;" onclick="GensokyoApp.insertTouhouTemplate()">Plantilla Gensokyo ID</button>
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
<div style="background: var(--th-bg-main); border: 1.5px solid var(--th-crimson); padding: 24px; border-radius: 10px; text-align:center;">
    <h2 style="color: var(--th-crimson); font-family: var(--font-heading); margin-bottom:10px;">Mi Rincón en Gensokyo</h2>
    <p style="margin-bottom:16px;">¡Hola a todos! Bienvenidos a mi rincón touhou.</p>
    
    <div style="background:var(--th-bg-card); padding:16px; border-radius:8px; border:1px solid var(--th-border-warm); max-width:400px; margin:0 auto;">
        <p style="font-size:0.85rem; font-weight:700; margin-bottom:10px;">Autenticación con Gensokyo ID</p>
        <button class="gx-btn-go" onclick="alert('¡Hola! Te has autenticado exitosamente con tu Pasaporte de Gensokyo ID.')">
            Iniciar Sesión con Gensokyo ID
        </button>
    </div>
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
        alert('¡Página publicada!');
        this.navigate(`gensokyo://${select.value}`);
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
