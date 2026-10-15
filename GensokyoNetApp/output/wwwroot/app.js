const GensokyoApp = {
    tabs: [],
    activeTabId: null,
    nextTabId: 1,
    bookmarks: [],
    remoteDomainCache: {},
    remoteRegistry: {
        enabled: true,
        supabaseUrl: "https://tgtzexzgdqxjezjxrium.supabase.co",
        apiBase: "https://tgtzexzgdqxjezjxrium.supabase.co",
        supabaseAnonKey: "sb_publishable_YZ-iFdyG0pFxPmv17SGLPQ_EUlmuzkG",
        bucketName: "gensokyo-sites",
        timeoutMs: 8e3
    },
    getSupabaseHeaders(extra = {}) {
        const key = this.remoteRegistry && this.remoteRegistry.supabaseAnonKey || "";
        return {
            "Content-Type": "application/json",
            apikey: key,
            Authorization: `Bearer ${key}`,
            ...extra
        };
    },
    userDomains: {},
    accountsDB: {},
    currentTheme: "scarlet",
    securityConfig: {
        localhostSandboxMode: "secure"
    },
    passport: {
        isLoggedIn: true,
        isRegistered: false,
        userId: "ID#0000",
        username: "Nameless Youkai",
        avatarUrl: "assets/nameless_avatar.png",
        ownedDomains: [],
        oauthToken: "gx_live_token_0000_nameless_youkai_key"
    },
    hakureiPolicy: "ask",
    tempAvatarDataUrl: null,
    cropZoom: 1,
    navigationHistory: [],
    closedTabsStack: [],
    _remoteDirectoryCache: null,
    _remoteDirectoryLastFetch: 0,
    init() {
        this.loadAccountsDB();
        this.loadPassportData();
        this.loadUserDomains();
        this.loadSecurityConfig();
        this.loadHakureiPolicy();
        this.loadBookmarks();
        this.loadSidebarState();
        this.loadNavigationHistory();
        const urlInput = document.getElementById("th-url-input");
        if (urlInput) {
            urlInput.addEventListener("keypress", e => {
                if (e.key === "Enter") this.submitUrl();
            });
        }
        document.addEventListener("keydown", e => {
            const key = e.key.toLowerCase();
            if (e.ctrlKey && key === "t") {
                e.preventDefault();
                if (e.shiftKey) {
                    this.reopenLastClosedTab();
                } else {
                    this.createNewTab("gensokyo://home", "Inicio");
                }
                return;
            }
            if (e.ctrlKey && key === "h") {
                e.preventDefault();
                this.navigate("gensokyo://history");
                return;
            }
            if (e.ctrlKey && key === "w") {
                e.preventDefault();
                const activeTab = this.getActiveTab ? this.getActiveTab() : null;
                if (activeTab) this.closeTab(activeTab.id);
                return;
            }
            if (!e.ctrlKey && e.key === "F5") {
                e.preventDefault();
                this.reloadPage();
                return;
            }
            if (e.ctrlKey && key === "l") {
                e.preventDefault();
                const input = document.getElementById("th-url-input");
                if (input) {
                    input.focus();
                    input.select();
                }
                return;
            }
            if (e.ctrlKey && key === "b") {
                e.preventDefault();
                this.toggleMainSidebar();
                return;
            }
        });
        const restored = this.loadSavedTabs();
        if (!restored) {
            this.createNewTab("gensokyo://home", "Inicio");
        } else if (this.activeTabId) {
            this.switchTab(this.activeTabId);
        }
        this.updateDomainCount();
        this.updatePassportUI();
        this.syncBookmarkButtonUI();
    },
    toggleMainSidebar() {
        const sidebar = document.querySelector(".gx-sidebar");
        if (!sidebar) return;
        const willCollapse = !sidebar.classList.contains("collapsed");
        this.setSidebarCollapsed(willCollapse);
    },
    setSidebarCollapsed(collapsed) {
        const sidebar = document.querySelector(".gx-sidebar");
        const navToggleBtn = document.getElementById("gx-sidebar-toggle-btn");
        const floatingTab = document.getElementById("gx-sidebar-floating-tab");
        if (!sidebar) return;
        this.isSidebarCollapsed = collapsed;
        sidebar.classList.toggle("collapsed", collapsed);
        if (collapsed) {
            sidebar.style.setProperty("display", "none", "important");
            if (floatingTab) floatingTab.style.display = "flex";
        } else {
            sidebar.style.removeProperty("display");
            if (floatingTab) floatingTab.style.display = "none";
        }
        if (navToggleBtn) {
            navToggleBtn.classList.toggle("active", collapsed);
            navToggleBtn.title = collapsed ? "Mostrar barra lateral (Ctrl+B)" : "Ocultar barra lateral (Ctrl+B)";
        }
        try {
            localStorage.setItem("gensokyo_sidebar_collapsed", collapsed ? "1" : "0");
        } catch (e) {}
        window.dispatchEvent(new Event("resize"));
    },
    loadSidebarState() {
        try {
            const saved = localStorage.getItem("gensokyo_sidebar_collapsed");
            if (saved === "1") {
                this.setSidebarCollapsed(true);
            }
        } catch (e) {}
    },
    loadBookmarks() {
        const stored = localStorage.getItem("gensokyo_bookmarks");
        if (!stored) return;
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                this.bookmarks = parsed.filter(b => b && typeof b.url === "string" && typeof b.title === "string");
            }
        } catch (e) {
            console.error("Error al cargar favoritos", e);
        }
    },
    saveBookmarks() {
        try {
            localStorage.setItem("gensokyo_bookmarks", JSON.stringify(this.bookmarks));
        } catch (e) {
            console.error("Error al guardar favoritos", e);
            if (this.showToastNotification) {
                this.showToastNotification("No se pudieron guardar favoritos por límite de almacenamiento.", "error");
            }
        }
    },
    normalizeBookmarkUrl(url) {
        if (!url || typeof url !== "string") return "gensokyo://home";
        let cleaned = url.trim();
        cleaned = cleaned.replace(/^https?:\/\//i, "outside://");
        if (!/^(gensokyo|outside):\/\//i.test(cleaned)) {
            cleaned = `gensokyo://${cleaned}`;
        }
        return cleaned;
    },
    isBookmarked(url) {
        const normalized = this.normalizeBookmarkUrl(url);
        return this.bookmarks.some(b => b.url === normalized);
    },
    toggleBookmarkCurrentTab() {
        const activeTab = this.getActiveTab ? this.getActiveTab() : null;
        if (!activeTab) return;
        const normalizedUrl = this.normalizeBookmarkUrl(activeTab.url);
        const index = this.bookmarks.findIndex(b => b.url === normalizedUrl);
        if (index >= 0) {
            this.bookmarks.splice(index, 1);
            this.saveBookmarks();
            this.syncBookmarkButtonUI();
            this.renderBookmarksList();
            this.showToastNotification("Favorito eliminado.", "info");
            return;
        }
        this.bookmarks.unshift({
            title: activeTab.title || normalizedUrl,
            url: normalizedUrl,
            createdAt: (new Date).toISOString()
        });
        this.saveBookmarks();
        this.syncBookmarkButtonUI();
        this.renderBookmarksList();
        this.showToastNotification("Favorito guardado.", "success");
    },
    removeBookmark(url) {
        const normalized = this.normalizeBookmarkUrl(url);
        const index = this.bookmarks.findIndex(b => b.url === normalized);
        if (index < 0) return;
        this.bookmarks.splice(index, 1);
        this.saveBookmarks();
        this.syncBookmarkButtonUI();
        this.renderBookmarksList();
    },
    openBookmark(url) {
        const normalized = this.normalizeBookmarkUrl(url);
        this.createNewTab(normalized);
        this.hideBookmarksModal();
    },
    loadNavigationHistory() {
        try {
            const raw = localStorage.getItem("gensokyo_navigation_history");
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    this.navigationHistory = parsed.filter(item => item && item.url);
                }
            }
        } catch (e) {
            this.navigationHistory = [];
        }
    },
    saveNavigationHistory() {
        try {
            if (this.navigationHistory.length > 200) {
                this.navigationHistory = this.navigationHistory.slice(0, 200);
            }
            localStorage.setItem("gensokyo_navigation_history", JSON.stringify(this.navigationHistory));
        } catch (e) {}
    },
    recordNavigationHistory(url, title) {
        if (!url || typeof url !== "string") return;
        const cleanUrl = url.trim();
        if (cleanUrl.toLowerCase().startsWith("gensokyo://history")) return;
        const entry = {
            url: cleanUrl,
            title: title || this.getTabTitleFromUrl(cleanUrl),
            timestamp: Date.now()
        };
        if (this.navigationHistory.length > 0 && this.navigationHistory[0].url === cleanUrl) {
            this.navigationHistory[0].timestamp = entry.timestamp;
            if (title) this.navigationHistory[0].title = title;
        } else {
            this.navigationHistory.unshift(entry);
        }
        this.saveNavigationHistory();
    },
    clearNavigationHistory() {
        this.navigationHistory = [];
        try {
            localStorage.removeItem("gensokyo_navigation_history");
        } catch (e) {}
        if (this.showToastNotification) {
            this.showToastNotification("Historial de navegacion eliminado.", "info");
        }
        const container = document.getElementById("gx-history-list");
        if (container) {
            container.innerHTML = '<div class="th-card" style="text-align:center; padding:30px;"><p>El historial esta vacio.</p></div>';
        }
    },
    deleteNavigationHistoryItem(index) {
        if (index >= 0 && index < this.navigationHistory.length) {
            this.navigationHistory.splice(index, 1);
            this.saveNavigationHistory();
            if (typeof this.renderHistoryView === "function") {
                this.renderHistoryView();
            }
        }
    },
    loadSavedTabs() {
        try {
            const raw = localStorage.getItem("gensokyo_saved_tabs");
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
                this.tabs = parsed.tabs;
                this.activeTabId = parsed.activeTabId || this.tabs[0].id;
                const maxNum = Math.max(...this.tabs.map(t => {
                    const match = String(t.id).match(/\d+/);
                    return match ? parseInt(match[0], 10) : 0;
                }), 0);
                this.nextTabId = maxNum + 1;
                return true;
            }
        } catch (e) {
            console.warn("No se pudieron restaurar pestañas", e);
        }
        return false;
    },
    saveTabsSession() {
        try {
            if (!this.tabs || this.tabs.length === 0) return;
            const payload = {
                tabs: this.tabs.map(t => ({
                    id: t.id,
                    title: t.title,
                    url: t.url,
                    history: (t.history || [ t.url ]).slice(-15),
                    historyIndex: t.historyIndex || 0
                })),
                activeTabId: this.activeTabId
            };
            localStorage.setItem("gensokyo_saved_tabs", JSON.stringify(payload));
        } catch (e) {}
    },
    reopenLastClosedTab() {
        if (!this.closedTabsStack || this.closedTabsStack.length === 0) {
            if (this.showToastNotification) {
                this.showToastNotification("No hay pestañas cerradas recientemente.", "info");
            }
            return;
        }
        const last = this.closedTabsStack.pop();
        if (last && last.url) {
            this.createNewTab(last.url, last.title);
        }
    },
    async fetchRemoteDirectory() {
        if (!this.remoteRegistry?.enabled || !this.remoteRegistry.supabaseUrl) return [];
        const now = Date.now();
        if (this._remoteDirectoryCache && now - this._remoteDirectoryLastFetch < 2e4) {
            return this._remoteDirectoryCache;
        }
        try {
            const base = this.remoteRegistry.supabaseUrl.replace(/\/$/, "");
            const url = `${base}/rest/v1/gensokyo_domains?visibility=eq.public&select=domain,title,author,active_version,badge_url,badge_text,updated_at&order=updated_at.desc`;
            const res = await this.fetchWithTimeout(url, {
                method: "GET",
                headers: this.getSupabaseHeaders()
            }, 4500);
            if (res.ok) {
                const rows = await res.json();
                const list = (Array.isArray(rows) ? rows : []).map(r => ({
                    domain: r.domain,
                    title: r.title,
                    author: r.author,
                    activeVersion: r.active_version,
                    badgeUrl: r.badge_url,
                    badgeText: r.badge_text,
                    updatedAt: r.updated_at
                }));
                this._remoteDirectoryCache = list;
                this._remoteDirectoryLastFetch = now;
                return list;
            }
        } catch (e) {}
        return this._remoteDirectoryCache || [];
    },
    syncBookmarkButtonUI() {
        const button = document.getElementById("th-bookmark-toggle-btn");
        if (!button) return;
        const activeTab = this.getActiveTab ? this.getActiveTab() : null;
        const activeUrl = activeTab ? activeTab.url : "gensokyo://home";
        const marked = this.isBookmarked(activeUrl);
        button.innerText = marked ? "★" : "☆";
        button.title = marked ? "Quitar de favoritos" : "Agregar a favoritos";
        button.classList.toggle("bookmarked", marked);
    },
    showBookmarksModal() {
        this.renderBookmarksList();
        document.getElementById("th-bookmarks-modal")?.classList.remove("hidden");
    },
    hideBookmarksModal() {
        document.getElementById("th-bookmarks-modal")?.classList.add("hidden");
    },
    renderBookmarksList() {
        const listEl = document.getElementById("th-bookmarks-list");
        if (!listEl) return;
        listEl.innerHTML = "";
        if (!this.bookmarks.length) {
            const emptyMsg = document.createElement("p");
            emptyMsg.style.color = "var(--th-text-sub)";
            emptyMsg.textContent = "Todavía no guardaste favoritos.";
            listEl.appendChild(emptyMsg);
            return;
        }
        this.bookmarks.forEach(b => {
            const item = document.createElement("div");
            item.className = "gx-bookmark-item";
            const openBtn = document.createElement("button");
            openBtn.type = "button";
            openBtn.className = "gx-bookmark-open";
            openBtn.addEventListener("click", () => this.openBookmark(b.url));
            const titleSpan = document.createElement("span");
            titleSpan.className = "gx-bookmark-title";
            titleSpan.textContent = b.title;
            const urlSpan = document.createElement("span");
            urlSpan.className = "gx-bookmark-url";
            urlSpan.textContent = b.url;
            openBtn.append(titleSpan, urlSpan);
            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "gx-bookmark-delete";
            delBtn.textContent = "✕";
            delBtn.addEventListener("click", () => this.removeBookmark(b.url));
            item.append(openBtn, delBtn);
            listEl.appendChild(item);
        });
    },
    loadAccountsDB() {
        const stored = localStorage.getItem("gensokyo_accounts_db");
        if (!stored) return;
        try {
            this.accountsDB = JSON.parse(stored);
        } catch (e) {
            console.error("Error al cargar Cuentas DB", e);
        }
    },
    saveAccountsDB() {
        try {
            localStorage.setItem("gensokyo_accounts_db", JSON.stringify(this.accountsDB));
        } catch (e) {
            console.error("Error de cuota en almacenamiento local de Cuentas", e);
            if (this.showToastNotification) {
                this.showToastNotification("No se pudo guardar la cuenta: Almacenamiento lleno.", "error");
            }
        }
    },
    loadPassportData() {
        const stored = localStorage.getItem("gensokyo_passport");
        if (!stored) {
            this.savePassportData();
            return;
        }
        try {
            this.passport = JSON.parse(stored);
        } catch (e) {
            console.error("Error al cargar Pasaporte", e);
        }
    },
    savePassportData() {
        try {
            localStorage.setItem("gensokyo_passport", JSON.stringify(this.passport));
        } catch (e) {
            console.error("Error de cuota en almacenamiento local de Pasaporte", e);
            if (this.showToastNotification) {
                this.showToastNotification("No se pudo guardar el Pasaporte: Almacenamiento lleno.", "error");
            }
        }
        this.updatePassportUI();
    },
    loadUserDomains() {
        const stored = localStorage.getItem("gensokyo_user_domains");
        if (!stored) return;
        try {
            this.userDomains = JSON.parse(stored);
        } catch (e) {
            console.error("Error al cargar dominios", e);
        }
    },
    loadSecurityConfig() {
        const stored = localStorage.getItem("gensokyo_security_config");
        if (!stored) return;
        try {
            const parsed = JSON.parse(stored);
            if (parsed && (parsed.localhostSandboxMode === "secure" || parsed.localhostSandboxMode === "dev")) {
                this.securityConfig.localhostSandboxMode = parsed.localhostSandboxMode;
            }
        } catch (e) {
            console.error("Error al cargar configuración de seguridad", e);
        }
    },
    saveSecurityConfig() {
        try {
            localStorage.setItem("gensokyo_security_config", JSON.stringify(this.securityConfig));
        } catch (e) {
            console.error("No se pudo guardar configuración de seguridad", e);
        }
    },
    setLocalhostSandboxMode(mode) {
        const nextMode = (mode || "").toLowerCase();
        if (nextMode !== "secure" && nextMode !== "dev") {
            if (this.showToastNotification) {
                this.showToastNotification("Modo inválido. Usa secure o dev.", "error");
            }
            return;
        }
        this.securityConfig.localhostSandboxMode = nextMode;
        this.saveSecurityConfig();
        if (this.showToastNotification) {
            const label = nextMode === "secure" ? "Seguro" : "Desarrollo";
            this.showToastNotification(`Sandbox localhost: ${label}`, "success");
        }
        const activeTab = this.getActiveTab ? this.getActiveTab() : null;
        if (activeTab && this.isLocalhostDomain && this.isLocalhostDomain(activeTab.url)) {
            this.renderRoute(activeTab.url);
        }
    },
    getLocalhostSandboxAttr() {
        return this.securityConfig.localhostSandboxMode === "dev" ? "allow-scripts allow-forms allow-same-origin" : "allow-scripts allow-forms";
    },
    saveUserDomains() {
        try {
            localStorage.setItem("gensokyo_user_domains", JSON.stringify(this.userDomains));
        } catch (e) {
            console.error("Error de cuota en almacenamiento local de Dominios", e);
            if (this.showToastNotification) {
                this.showToastNotification("No se pudieron guardar los cambios del dominio: Límite de cuota superado.", "error");
            }
        }
        this.updateDomainCount();
    },
    clearRemoteDomainCache(domainName = null) {
        if (!domainName) {
            this.remoteDomainCache = {};
            return;
        }
        delete this.remoteDomainCache[String(domainName || "").toLowerCase()];
    },
    normalizeDomainKey(domainName) {
        return String(domainName || "").trim().toLowerCase();
    },
    isRemoteRegistryEnabled() {
        return !!(this.remoteRegistry && this.remoteRegistry.enabled && (this.remoteRegistry.supabaseUrl || this.remoteRegistry.apiBase));
    },
    async fetchWithTimeout(url, options = {}, timeoutMs = 5e3) {
        const controller = new AbortController;
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await fetch(url, {
                ...options,
                signal: controller.signal
            });
        } finally {
            clearTimeout(timer);
        }
    },
    getRemoteAuthHeaders() {
        const headers = {
            "Content-Type": "application/json"
        };
        const token = this.passport && this.passport.oauthToken ? String(this.passport.oauthToken).trim() : "";
        const isPlaceholder = token.includes("0000_nameless_youkai");
        if (token && this.passport.isRegistered && !isPlaceholder) {
            headers.Authorization = `Bearer ${token}`;
        }
        return headers;
    },
    isAllowedRemoteContentUrl(rawUrl) {
        if (!rawUrl || typeof rawUrl !== "string") return false;
        try {
            const parsed = new URL(rawUrl);
            if (parsed.protocol !== "https:") return false;
            const targetHost = parsed.hostname.toLowerCase();
            if (targetHost.endsWith(".supabase.co")) return true;
            if (this.remoteRegistry && (this.remoteRegistry.supabaseUrl || this.remoteRegistry.apiBase)) {
                const baseHost = new URL(this.remoteRegistry.supabaseUrl || this.remoteRegistry.apiBase).hostname.toLowerCase();
                if (targetHost === baseHost || targetHost.endsWith(`.${baseHost}`)) return true;
            }
            return false;
        } catch {
            return false;
        }
    },
    normalizeRemoteRoutePayload(payload, domainName) {
        if (!payload || typeof payload !== "object") return null;
        const domain = this.normalizeDomainKey(payload.domain || payload.domainName || payload.site && (payload.site.domain || payload.site.domainName) || domainName);
        const ownerId = payload.ownerId || payload.site && payload.site.ownerId || null;
        const title = payload.title || payload.site && payload.site.title || domain;
        const author = payload.author || payload.site && payload.site.author || "Unknown";
        const visibility = String(payload.visibility || payload.site && payload.site.visibility || "public").toLowerCase();
        const activeVersion = payload.activeVersion || payload.site && payload.site.activeVersion || "v1";
        const htmlContent = payload.htmlContent || payload.site && payload.site.htmlContent || null;
        const contentUrl = payload.contentUrl || payload.site && payload.site.contentUrl || null;
        const versions = Array.isArray(payload.versions) ? payload.versions : Object.keys(payload.site && payload.site.versions || payload.versions || {
            [activeVersion]: true
        });
        return {
            domain: domain,
            ownerId: ownerId,
            title: title,
            author: author,
            visibility: visibility,
            activeVersion: activeVersion,
            versions: versions,
            htmlContent: htmlContent,
            contentUrl: contentUrl,
            sizeBytes: payload.sizeBytes || payload.site && payload.site.sizeBytes || (htmlContent ? htmlContent.length : 0)
        };
    },
    async resolveDomainRouteRemote(domainName) {
        const domainKey = this.normalizeDomainKey(domainName);
        if (!domainKey || !this.remoteRegistry?.enabled || !this.remoteRegistry.supabaseUrl) return null;
        const cacheHit = this.remoteDomainCache[domainKey];
        if (cacheHit && Date.now() - cacheHit.cachedAt < 15e3) {
            return cacheHit.routeInfo;
        }
        const base = this.remoteRegistry.supabaseUrl.replace(/\/$/, "");
        const url = `${base}/rest/v1/gensokyo_domains?domain=eq.${encodeURIComponent(domainKey)}&select=domain,title,author,owner_id,visibility,active_version,versions,content_url,html_content,size_bytes&limit=1`;
        try {
            const response = await this.fetchWithTimeout(url, {
                method: "GET",
                headers: this.getSupabaseHeaders()
            }, this.remoteRegistry.timeoutMs || 8e3);
            if (!response.ok) return null;
            const rows = await response.json();
            if (!Array.isArray(rows) || !rows.length) return null;
            const record = rows[0];
            const isOwner = this.passport.userId && this.passport.userId !== "ID#0000" && (record.owner_id === this.passport.userId || Array.isArray(this.passport.ownedDomains) && this.passport.ownedDomains.includes(record.domain));
            if (record.visibility === "private" && !isOwner) {
                return {
                    domain: record.domain,
                    isPrivateBlocked: true,
                    title: record.title,
                    author: record.author,
                    fromRemoteRegistry: true
                };
            }
            let htmlContent = record.html_content;
            if (!htmlContent && record.content_url && this.isAllowedRemoteContentUrl(record.content_url)) {
                try {
                    const contentRes = await this.fetchWithTimeout(record.content_url, {
                        method: "GET"
                    }, 6e3);
                    if (contentRes.ok) htmlContent = await contentRes.text();
                } catch (cErr) {
                    console.warn("Fallo obteniendo HTML de CDN/Bucket", cErr);
                }
            }
            if (!htmlContent || typeof htmlContent !== "string") return null;
            const routeInfo = {
                domain: record.domain,
                title: record.title,
                activeVersion: record.active_version || "v1",
                versions: Array.isArray(record.versions) ? record.versions : [ "v1" ],
                ownerId: record.owner_id,
                author: record.author,
                targetUrl: record.content_url || null,
                htmlContent: htmlContent,
                sizeBytes: record.size_bytes || htmlContent.length,
                isUserSite: true,
                fromRemoteRegistry: true
            };
            this.remoteDomainCache[domainKey] = {
                cachedAt: Date.now(),
                routeInfo: routeInfo
            };
            return routeInfo;
        } catch (err) {
            console.warn("Fallo consultando dominio remoto en Supabase", err);
            return null;
        }
    },
    async publishDomainVersionToRegistry(domainName, versionTag, reason = "update") {
        const domainKey = this.normalizeDomainKey(domainName);
        const domainObj = this.userDomains[domainKey];
        if (!domainKey || !domainObj || !this.remoteRegistry?.enabled || !this.remoteRegistry.supabaseUrl) return false;
        const activeVersion = versionTag || domainObj.activeVersion || "v1";
        const versionObj = domainObj.versions && domainObj.versions[activeVersion] ? domainObj.versions[activeVersion] : null;
        const htmlContent = versionObj ? versionObj.htmlContent : domainObj.htmlContent || "";
        const base = this.remoteRegistry.supabaseUrl.replace(/\/$/, "");
        const bucket = this.remoteRegistry.bucketName || "gensokyo-sites";
        const objectPath = `${encodeURIComponent(domainKey)}/${encodeURIComponent(activeVersion)}/index.html`;
        const storageUrl = `${base}/storage/v1/object/${bucket}/${objectPath}`;
        const publicCdnUrl = `${base}/storage/v1/object/public/${bucket}/${objectPath}`;
        try {
            try {
                await this.fetchWithTimeout(storageUrl, {
                    method: "POST",
                    headers: {
                        apikey: this.remoteRegistry.supabaseAnonKey,
                        Authorization: `Bearer ${this.remoteRegistry.supabaseAnonKey}`,
                        "Content-Type": "text/html; charset=utf-8",
                        "x-upsert": "true"
                    },
                    body: htmlContent
                }, this.remoteRegistry.timeoutMs || 8e3);
            } catch (storageErr) {
                console.warn("Aviso: Storage upload omitido o pendiente de bucket:", storageErr);
            }
            const rpcRes = await this.fetchWithTimeout(`${base}/rest/v1/rpc/publish_gensokyo_domain`, {
                method: "POST",
                headers: this.getSupabaseHeaders(),
                body: JSON.stringify({
                    p_domain: domainKey,
                    p_title: domainObj.title || domainKey,
                    p_author: domainObj.author || this.passport.username,
                    p_owner_id: domainObj.ownerId || this.passport.userId,
                    p_token: this.passport.oauthToken,
                    p_visibility: domainObj.visibility || "public",
                    p_badge_url: domainObj.badgeUrl || null,
                    p_badge_text: domainObj.badgeText || null,
                    p_active_version: activeVersion,
                    p_html_content: htmlContent,
                    p_content_url: publicCdnUrl
                })
            }, this.remoteRegistry.timeoutMs || 8e3);
            if (!rpcRes.ok) {
                console.warn("RPC publish_gensokyo_domain rechazada:", rpcRes.status, await rpcRes.text());
                return false;
            }
            this.clearRemoteDomainCache(domainKey);
            this._remoteDirectoryCache = null;
            return true;
        } catch (err) {
            console.warn("Error publicando en Supabase (fallback local activo):", err);
            return false;
        }
    },
    async notifyRemoteDomainMutation(domainName, versionTag, reason = "update") {
        const ok = await this.publishDomainVersionToRegistry(domainName, versionTag, reason);
        if (!ok) {
            return false;
        }
        return true;
    },
    updateDomainCount() {
        const total = Object.keys(GensokyoSeedData.domains).length + Object.keys(this.userDomains).length;
        const countEl = document.getElementById("th-domain-count");
        if (countEl) countEl.innerText = `Dominios Activos: ${total}`;
    },
    loadHakureiPolicy() {
        const stored = localStorage.getItem("gensokyo_hakurei_policy");
        if (stored && [ "ask", "auto", "block" ].includes(stored)) {
            this.hakureiPolicy = stored;
        }
    },
    setHakureiPolicy(policyValue) {
        if (![ "ask", "auto", "block" ].includes(policyValue)) return;
        this.hakureiPolicy = policyValue;
        try {
            localStorage.setItem("gensokyo_hakurei_policy", policyValue);
        } catch (e) {
            console.error("Error al guardar política de la Barrera Hakurei", e);
        }
        if (this.showToastNotification) {
            let label = "Preguntar antes de acceder a dominios externos";
            if (policyValue === "auto") label = "Acceso automático al Mundo Exterior";
            if (policyValue === "block") label = "Bloqueo total del Mundo Exterior";
            this.showToastNotification(`Navegación Externa: ${label}`, "info");
        }
        this.syncHakureiPolicyUI();
    },
    syncHakureiPolicyUI() {
        const radio = document.querySelector(`input[name="hakurei-policy-option"][value="${this.hakureiPolicy}"]`);
        if (radio) radio.checked = true;
    },
    showThemeModal() {
        this.syncHakureiPolicyUI();
        document.getElementById("th-theme-modal")?.classList.remove("hidden");
    },
    hideThemeModal() {
        document.getElementById("th-theme-modal")?.classList.add("hidden");
    },
    applyTheme(themeKey) {
        this.currentTheme = themeKey;
        document.body.classList.remove("theme-scarlet", "theme-hakugyokurou");
        document.getElementById("theme-card-scarlet")?.classList.remove("active");
        document.getElementById("theme-card-hakugyokurou")?.classList.remove("active");
        const statusEl = document.getElementById("th-status-text");
        if (themeKey === "hakugyokurou") {
            document.body.classList.add("theme-hakugyokurou");
            document.getElementById("theme-card-hakugyokurou")?.classList.add("active");
            if (statusEl) statusEl.innerText = "GensokyoNet • Estilo Hakugyokurou (TH07 Modo Oscuro)";
        } else {
            document.body.classList.add("theme-scarlet");
            document.getElementById("theme-card-scarlet")?.classList.add("active");
            if (statusEl) statusEl.innerText = "GensokyoNet • Estilo Scarlet Mist (TH06 Modo Pergamino)";
        }
        this.hideThemeModal();
    },
    showDonationModal() {},
    hideDonationModal() {},
    showSupportModal() {
        const modal = document.getElementById("th-support-modal");
        if (!modal) return;
        const banner = document.getElementById("support-status-banner");
        if (banner) {
            banner.className = "th-form-error-banner hidden";
            banner.style.display = "none";
            banner.innerText = "";
        }
        modal.classList.remove("hidden");
        setTimeout(() => {
            document.getElementById("support-email-input")?.focus();
        }, 80);
    },
    hideSupportModal() {
        const modal = document.getElementById("th-support-modal");
        if (!modal) return;
        modal.classList.add("hidden");
    },
    async submitSupportMessage() {
        const emailInput = document.getElementById("support-email-input");
        const titleInput = document.getElementById("support-title-input");
        const descInput = document.getElementById("support-desc-input");
        const submitBtn = document.getElementById("support-submit-btn");
        const banner = document.getElementById("support-status-banner");
        const email = emailInput ? emailInput.value.trim() : "";
        const title = titleInput ? titleInput.value.trim() : "";
        const desc = descInput ? descInput.value.trim() : "";
        if (!email || !title || !desc) {
            if (banner) {
                banner.className = "th-form-error-banner";
                banner.style.display = "block";
                banner.style.borderColor = "var(--th-crimson)";
                banner.style.background = "rgba(166, 27, 50, 0.15)";
                banner.style.color = "var(--th-crimson)";
                banner.innerText = "Por favor completa todos los campos requeridos.";
            }
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            if (banner) {
                banner.className = "th-form-error-banner";
                banner.style.display = "block";
                banner.style.borderColor = "var(--th-crimson)";
                banner.style.background = "rgba(166, 27, 50, 0.15)";
                banner.style.color = "var(--th-crimson)";
                banner.innerText = "Por favor ingresa un correo electrónico válido.";
            }
            return;
        }
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "Enviando...";
        }
        if (banner) {
            banner.style.display = "none";
        }
        try {
            const base = (this.remoteRegistry && this.remoteRegistry.supabaseUrl ? this.remoteRegistry.supabaseUrl : "https://tgtzexzgdqxjezjxrium.supabase.co").replace(/\/$/, "");
            const headers = this.getSupabaseHeaders ? this.getSupabaseHeaders() : {
                "Content-Type": "application/json",
                apikey: this.remoteRegistry.supabaseAnonKey,
                Authorization: `Bearer ${this.remoteRegistry.supabaseAnonKey}`
            };
            let sentOk = false;
            try {
                const rpcRes = await this.fetchWithTimeout(`${base}/rest/v1/rpc/submit_support_ticket`, {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify({
                        p_email: email,
                        p_title: title,
                        p_description: desc
                    })
                }, 8e3);
                if (rpcRes.ok) {
                    sentOk = true;
                }
            } catch (rpcErr) {
                console.warn("RPC submit_support_ticket no respondió, intentando inserción en tabla:", rpcErr);
            }
            if (!sentOk) {
                const insertRes = await this.fetchWithTimeout(`${base}/rest/v1/gensokyo_support_messages`, {
                    method: "POST",
                    headers: {
                        ...headers,
                        Prefer: "return=minimal"
                    },
                    body: JSON.stringify({
                        sender_email: email,
                        subject: title,
                        message: desc
                    })
                }, 8e3);
                if (insertRes.ok || insertRes.status === 201) {
                    sentOk = true;
                }
            }
            if (sentOk) {
                if (banner) {
                    banner.className = "th-form-error-banner";
                    banner.style.display = "block";
                    banner.style.borderColor = "#10b981";
                    banner.style.background = "rgba(16, 185, 129, 0.15)";
                    banner.style.color = "#10b981";
                    banner.innerText = "✓ ¡Mensaje enviado con éxito! Te responderemos a la brevedad.";
                }
                if (emailInput) emailInput.value = "";
                if (titleInput) titleInput.value = "";
                if (descInput) descInput.value = "";
                if (typeof this.showToastNotification === "function") {
                    this.showToastNotification("Mensaje de soporte enviado correctamente", "success");
                }
                setTimeout(() => {
                    this.hideSupportModal();
                    if (banner) {
                        banner.style.display = "none";
                        banner.style.borderColor = "";
                        banner.style.background = "";
                        banner.style.color = "";
                    }
                }, 1800);
            } else {
                throw new Error("No se pudo guardar el mensaje.");
            }
        } catch (err) {
            console.error("Error enviando ticket de soporte:", err);
            if (banner) {
                banner.className = "th-form-error-banner";
                banner.style.display = "block";
                banner.style.borderColor = "var(--th-crimson)";
                banner.style.background = "rgba(166, 27, 50, 0.15)";
                banner.style.color = "var(--th-crimson)";
                banner.innerText = "Hubo un error al enviar tu consulta. Por favor inténtalo de nuevo.";
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = "Enviar Mensaje";
            }
        }
    },
    async hashPassword(password) {
        if (!password) return "";
        const encoder = new TextEncoder;
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    },
    escapeHtml(str) {
        if (str === null || str === undefined) return "";
        return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
};

window.GensokyoApp = GensokyoApp;

document.addEventListener("DOMContentLoaded", () => {
    GensokyoApp.init();
});