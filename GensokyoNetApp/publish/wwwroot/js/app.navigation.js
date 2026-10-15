Object.assign(GensokyoApp, {
    createNewTab(url = "gensokyo://home", customTitle = null) {
        const tabId = `tab-${this.nextTabId++}`;
        const newTab = {
            id: tabId,
            title: customTitle || this.getTabTitleFromUrl(url),
            url: url,
            history: [ url ],
            historyIndex: 0
        };
        this.tabs.push(newTab);
        if (typeof this.saveTabsSession === "function") this.saveTabsSession();
        this.switchTab(tabId);
    },
    closeTab(tabId, event) {
        if (event) event.stopPropagation();
        if (this.tabs.length <= 1) {
            this.tabs[0].url = "gensokyo://home";
            this.tabs[0].title = "Inicio";
            this.tabs[0].history = [ "gensokyo://home" ];
            this.tabs[0].historyIndex = 0;
            if (typeof this.saveTabsSession === "function") this.saveTabsSession();
            this.switchTab(this.tabs[0].id);
            return;
        }
        const index = this.tabs.findIndex(t => t.id === tabId);
        if (index === -1) return;
        const closingTab = this.tabs[index];
        if (closingTab && closingTab.url && this.closedTabsStack) {
            this.closedTabsStack.push({
                url: closingTab.url,
                title: closingTab.title
            });
            if (this.closedTabsStack.length > 20) this.closedTabsStack.shift();
        }
        this.tabs.splice(index, 1);
        if (typeof this.saveTabsSession === "function") this.saveTabsSession();
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
        if (typeof this.saveTabsSession === "function") this.saveTabsSession();
        this.renderTabsBar();
        this.updateUrlInput(activeTab.url);
        this.renderRoute(activeTab.url);
        this.syncNativeContentForTab(activeTab);
        this.updateSidebarActiveState(activeTab.url);
        this.initViewportObserver();
        this.syncBookmarkButtonUI();
    },
    getActiveTab() {
        return this.tabs.find(t => t.id === this.activeTabId);
    },
    renderTabsBar() {
        const bar = document.getElementById("th-tabs-bar");
        if (!bar) return;
        bar.innerHTML = this.tabs.map(tab => `\n            <div class="gx-tab ${tab.id === this.activeTabId ? "active" : ""}" onclick="GensokyoApp.switchTab('${tab.id}')">\n                ${this.getTabIconMarkup(tab.url)}\n                <span class="gx-tab-title">${this.escapeHtml(tab.title)}</span>\n                <span class="gx-tab-close" onclick="GensokyoApp.closeTab('${tab.id}', event)">\n                    <svg style="width:10px; height:10px;" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>\n                </span>\n            </div>\n        `).join("");
    },
    getTabIconMarkup(url) {
        const raw = (url || "").trim();
        const clean = raw.replace(/^(gensokyo|outside):\/\//i, "").toLowerCase();
        if (!clean || clean === "home") {
            return '<svg class="gx-tab-favicon" viewBox="0 0 24 24"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>';
        }
        if (clean.startsWith("search")) {
            return '<svg class="gx-tab-favicon" viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.5 6.5 0 1 0 14 15.5l.27.28v.79l5 4.99L20.49 19l-4.99-5zM9.5 14A4.5 4.5 0 1 1 14 9.5A4.5 4.5 0 0 1 9.5 14z"/></svg>';
        }
        if (clean === "builder") {
            return '<svg class="gx-tab-favicon" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83l3.75 3.75l1.84-1.82z"/></svg>';
        }
        if (clean === "register") {
            return '<svg class="gx-tab-favicon" viewBox="0 0 24 24"><path fill="currentColor" d="M21.41 11.58l-9-9A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 .59 1.41l9 9a2 2 0 0 0 2.82 0l7-7a2 2 0 0 0 0-2.83zM5.5 7A1.5 1.5 0 1 1 7 5.5A1.5 1.5 0 0 1 5.5 7z"/></svg>';
        }
        if (raw.toLowerCase().startsWith("outside://") || this.isExternalDomain(clean)) {
            const host = clean.split("/")[0].split("?")[0] || clean;
            const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`;
            return `<img class="gx-tab-favicon" src="${src}" alt="favicon">`;
        }
        return '<svg class="gx-tab-favicon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2z"/></svg>';
    },
    syncNativeContentForTab(tab) {
        if (!tab || !window.chrome || !window.chrome.webview) return;
        const rawUrl = (tab.url || "").trim();
        const isOutside = rawUrl.toLowerCase().startsWith("outside://");
        if (!isOutside) {
            window.chrome.webview.postMessage({
                action: "returnToIntranet"
            });
            return;
        }
        const cleanDomain = rawUrl.replace(/^outside:\/\//i, "").trim();
        if (!cleanDomain) {
            window.chrome.webview.postMessage({
                action: "returnToIntranet"
            });
            return;
        }
        const targetUrl = /^https?:\/\//i.test(cleanDomain) ? cleanDomain : `https://${cleanDomain}`;
        this.initViewportObserver();
        window.chrome.webview.postMessage({
            action: "crossHakureiBarrier",
            url: targetUrl
        });
    },
    getTabTitleFromUrl(url) {
        const clean = url.replace("gensokyo://", "").trim().toLowerCase();
        if (clean === "home" || clean === "") return "Inicio";
        if (clean.startsWith("search")) return "Búsqueda";
        if (clean === "bunbunmaru.news") return "Bunbunmaru";
        if (clean === "reimu.shrine") return "reimu.shrine";
        if (clean === "register" || clean.startsWith("register") || clean === "claim" || clean.startsWith("claim")) return "Reclamar Dominio";
        if (clean === "builder") return "Creador Web";
        if (clean.includes("localhost") || clean.includes("127.0.0.1")) return `Localhost (${clean})`;
        return clean;
    },
    submitUrl() {
        const input = document.getElementById("th-url-input");
        if (!input) return;
        let rawVal = input.value.trim();
        rawVal = rawVal.replace(/^(gensokyo|outside):\/\//i, "").replace(/^https?:\/\//i, "").trim();
        const isLocalhost = this.isLocalhostDomain(rawVal);
        const isExternal = !isLocalhost && this.isExternalDomain(rawVal);
        const routeRoot = rawVal.split("?")[0].toLowerCase();
        if (!isLocalhost && !isExternal && !rawVal.includes(".") && ![ "search", "register", "claim", "builder", "home", "" ].includes(routeRoot)) {
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
        if (!pathStr || typeof pathStr !== "string") return false;
        const clean = pathStr.replace(/^(gensokyo|outside):\/\//i, "").trim().toLowerCase();
        try {
            const fakeUrl = clean.startsWith("http://") || clean.startsWith("https://") ? clean : `http://${clean}`;
            const parsed = new URL(fakeUrl);
            const host = parsed.hostname.toLowerCase();
            return host === "localhost" || host === "127.0.0.1";
        } catch (e) {
            return false;
        }
    },
    isExternalDomain(pathStr) {
        if (!pathStr || typeof pathStr !== "string") return false;
        const clean = pathStr.replace(/^(gensokyo|outside):\/\//i, "").trim().toLowerCase();
        if (this.isLocalhostDomain(clean)) return false;
        if (clean === "home" || clean === "" || clean === "register" || clean.startsWith("register") || clean === "claim" || clean.startsWith("claim") || clean === "builder" || clean.startsWith("search")) return false;
        const hasExternalTld = /\.(com|org|net|io|app|ai|edu|co|es|ar|tv|me|dev|xyz|info|us|uk)$/i.test(clean.split("/")[0].split("?")[0]);
        const isHttp = pathStr.toLowerCase().startsWith("http://") || pathStr.toLowerCase().startsWith("https://") || pathStr.toLowerCase().startsWith("outside://");
        return hasExternalTld || isHttp;
    },
    initViewportObserver() {
        const target = document.querySelector(".gx-viewport-wrapper") || document.getElementById("th-viewport");
        if (!target || !window.chrome || !window.chrome.webview) return;
        if (this._viewportObserver) {
            this._viewportObserver.disconnect();
        }
        this._viewportObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const rect = entry.target.getBoundingClientRect();
                window.chrome.webview.postMessage({
                    action: "viewportRectChanged",
                    rect: {
                        x: Math.round(rect.left),
                        y: Math.round(rect.top),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height)
                    }
                });
            }
        });
        this._viewportObserver.observe(target);
    },
    navigate(fullUrl, forceCross = false) {
        const activeTab = this.getActiveTab();
        if (!activeTab) return;
        let path = fullUrl;
        if (path.startsWith("gensokyo://")) path = path.replace("gensokyo://", "");
        if (path.startsWith("outside://")) path = path.replace("outside://", "");
        path = path.trim();
        const isLocalhost = this.isLocalhostDomain(path);
        const isExternal = !isLocalhost && this.isExternalDomain(path);
        if (!isExternal && window.chrome && window.chrome.webview) {
            window.chrome.webview.postMessage({
                action: "returnToIntranet"
            });
        }
        if (isExternal && !forceCross) {
            const policy = this.hakureiPolicy || "ask";
            if (policy === "block") {
                this.renderHakureiBlocked(path);
                this.updateUrlInput(`outside://${path}`);
                return;
            }
            if (policy === "auto") {
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
        this.initViewportObserver();
        this.syncBookmarkButtonUI();
    },
    proceedCrossHakureiBarrier(externalDomain) {
        const activeTab = this.getActiveTab();
        if (!activeTab) return;
        const cleanDomain = externalDomain.replace(/^(gensokyo|outside|https?):\/\//i, "").trim();
        const targetUrl = cleanDomain.startsWith("http://") || cleanDomain.startsWith("https://") ? cleanDomain : `https://${cleanDomain}`;
        const normalizedUrl = `outside://${cleanDomain}`;
        activeTab.url = normalizedUrl;
        activeTab.title = cleanDomain;
        if (activeTab.history[activeTab.historyIndex] !== normalizedUrl) {
            activeTab.history = activeTab.history.slice(0, activeTab.historyIndex + 1);
            activeTab.history.push(normalizedUrl);
            activeTab.historyIndex = activeTab.history.length - 1;
        }
        if (window.chrome && window.chrome.webview) {
            this.initViewportObserver();
            window.chrome.webview.postMessage({
                action: "crossHakureiBarrier",
                url: targetUrl
            });
            this.renderTabsBar();
            this.updateUrlInput(normalizedUrl);
            this.updateSidebarActiveState(normalizedUrl);
            this.syncBookmarkButtonUI();
            return;
        }
        window.open(targetUrl, "_blank", "noopener,noreferrer");
        const viewport = document.getElementById("th-viewport");
        if (viewport) {
            viewport.innerHTML = `\n                <div class="th-card" style="max-width: 700px; margin: 40px auto; text-align: center; border: 2px solid var(--th-crimson);">\n                    <h2 class="th-card-title" style="color: var(--th-crimson); margin-bottom: 10px;">Sitio externo abierto en pestaña nueva</h2>\n                    <p style="font-size: 0.95rem; line-height: 1.6; margin-bottom: 18px; color: var(--th-text-sub);">\n                        Este modo web no puede embeber varios sitios del Mundo Exterior por restricciones de seguridad del propio sitio destino (X-Frame-Options / CSP).<br>\n                        Se abrió el enlace directamente para que puedas navegar sin bloqueo.\n                    </p>\n                    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">\n                        <button class="gx-btn-go" onclick="window.open('${this.escapeHtml(targetUrl)}', '_blank', 'noopener,noreferrer')">Abrir de nuevo ➔</button>\n                        <button class="gx-btn-go" style="background: var(--th-bg-main); border: 1px solid var(--th-border-warm); color: var(--th-text-main);" onclick="GensokyoApp.navigate('gensokyo://home')">Volver a GensokyoNet</button>\n                    </div>\n                </div>\n            `;
        }
        this.renderTabsBar();
        this.updateUrlInput(normalizedUrl);
        this.updateSidebarActiveState(normalizedUrl);
        this.syncBookmarkButtonUI();
    },
    updateExternalUrlFromNative(currentUrl) {
        if (!currentUrl || typeof currentUrl !== "string") return;
        const activeTab = this.getActiveTab();
        if (!activeTab) return;
        const clean = currentUrl.replace(/^(https?:\/\/)/i, "").trim();
        const normalized = `outside://${clean}`;
        activeTab.url = normalized;
        this.updateUrlInput(normalized);
        this.syncBookmarkButtonUI();
    },
    updateExternalTitleFromNative(title) {
        if (typeof title !== "string") return;
        const activeTab = this.getActiveTab();
        if (!activeTab) return;
        const nextTitle = title.trim();
        if (!nextTitle) return;
        activeTab.title = nextTitle;
        this.renderTabsBar();
    },
    updateUrlInput(url) {
        const prefixEl = document.getElementById("th-url-prefix");
        const input = document.getElementById("th-url-input");
        if (!input) return;
        let clean = (url || "").trim();
        clean = clean.replace(/^(gensokyo|outside):\/\//i, "").replace(/^https?:\/\//i, "").trim();
        const isExternal = this.isExternalDomain(clean);
        if (prefixEl) {
            if (isExternal) {
                prefixEl.innerText = "OUTSIDE://";
                prefixEl.style.color = "#e65100";
            } else {
                prefixEl.innerText = "GENSOKYO://";
                prefixEl.style.color = "var(--th-crimson)";
            }
        }
        input.value = clean;
    },
    updateSidebarActiveState(url) {
        const clean = url.replace(/^(gensokyo|outside):\/\//i, "").trim().toLowerCase();
        document.querySelectorAll(".gx-side-btn").forEach(btn => btn.classList.remove("active"));
        if (clean === "home" || clean === "") document.getElementById("nav-home")?.classList.add("active"); else if (clean === "register") document.getElementById("nav-register")?.classList.add("active"); else if (clean === "builder") document.getElementById("nav-builder")?.classList.add("active");
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
        this.syncNativeContentForTab(tab);
        this.syncBookmarkButtonUI();
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
        this.syncNativeContentForTab(tab);
        this.syncBookmarkButtonUI();
    },
    reloadPage() {
        const tab = this.getActiveTab();
        if (!tab) return;
        this.renderRoute(tab.url);
        this.syncNativeContentForTab(tab);
        this.syncBookmarkButtonUI();
    },
    async checkLocalhostStatus(targetUrl) {
        try {
            const controller = new AbortController;
            const timeoutId = setTimeout(() => controller.abort(), 1200);
            await fetch(targetUrl, {
                mode: "no-cors",
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return true;
        } catch (err) {
            return false;
        }
    },
    isHtmlContentEmpty(htmlText) {
        if (!htmlText || typeof htmlText !== "string") return true;
        const cleanStr = htmlText.trim();
        if (cleanStr === "") return true;
        try {
            const parsed = (new DOMParser).parseFromString(cleanStr, "text/html");
            const hasAppBootstrapSignals = !!parsed.querySelector([ "script[src]", 'script[type="module"]', 'link[rel="stylesheet"]', "#app", "#root", "[data-app]", "[data-root]" ].join(","));
            if (hasAppBootstrapSignals) {
                return false;
            }
            const root = parsed.body || parsed;
            root.querySelectorAll("script, style, meta, link, template, noscript").forEach(el => el.remove());
            const hasVisualMedia = root.querySelector("img, video, canvas, svg, iframe, audio, input, button, select, a, p, h1, h2, h3, h4, h5, h6, table, form, article, section, header, footer");
            const visibleTextLength = root.textContent ? root.textContent.trim().length : 0;
            const hasStructuralContainers = root.querySelector("main, nav, aside, div[class], div[id]");
            return !hasVisualMedia && !hasStructuralContainers && visibleTextLength < 5;
        } catch (err) {
            return cleanStr.length < 5;
        }
    },
    resolveDomainRouteLocal(path) {
        const seedSite = GensokyoSeedData.domains[path];
        if (seedSite) {
            return {
                domain: path,
                activeVersion: "v1.0-seed",
                ownerId: "GENSOKYO_NET",
                author: seedSite.author || "Hakurei Shrine",
                targetUrl: `https://cdn.gensokyo.net/assets/official/${path}/index.html`,
                htmlContent: seedSite.content,
                isSeed: true
            };
        }
        const userSite = this.userDomains[path];
        if (userSite) {
            const isPrivate = userSite.visibility === "private";
            const isOwner = this.passport.userId && this.passport.userId !== "ID#0000" && (userSite.ownerId === this.passport.userId || Array.isArray(this.passport.ownedDomains) && this.passport.ownedDomains.includes(path));
            if (isPrivate && !isOwner) {
                return {
                    domain: path,
                    isPrivateBlocked: true,
                    title: userSite.title || path,
                    author: userSite.author
                };
            }
            const activeVer = userSite.activeVersion || "v1";
            const versionObj = userSite.versions && userSite.versions[activeVer] ? userSite.versions[activeVer] : null;
            let finalHtml = versionObj ? versionObj.htmlContent : userSite.htmlContent;
            const versionsList = userSite.versions ? Object.keys(userSite.versions) : [ "v1" ];
            const files = versionObj && versionObj.files || userSite.files || (this.getDomainProjectFiles ? this.getDomainProjectFiles(path) : null);
            if (files && Object.keys(files).length > 0 && window.GensokyoBundler) {
                const bundled = GensokyoBundler.bundle(files, null, path);
                finalHtml = bundled.html || bundled;
            }
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
                sizeBytes: versionObj ? versionObj.sizeBytes : finalHtml ? finalHtml.length : 0,
                isEmptySite: isEmpty,
                isUserSite: true
            };
        }
        return null;
    },
    loadVirtualPage(pagePath) {
        const activeTab = this.getActiveTab();
        if (!activeTab) return;
        const cleanDomain = activeTab.url.replace("gensokyo://", "").trim().toLowerCase();
        const files = this.getDomainProjectFiles ? this.getDomainProjectFiles(cleanDomain) : null;
        if (files && window.GensokyoBundler) {
            const bundled = GensokyoBundler.bundle(files, pagePath);
            const iframe = document.querySelector("iframe.user-site-iframe");
            if (iframe) {
                iframe.srcdoc = bundled;
            }
        }
    },
    async resolveDomainRoute(path) {
        const remoteRoute = this.resolveDomainRouteRemote ? await this.resolveDomainRouteRemote(path) : null;
        if (remoteRoute) {
            return remoteRoute;
        }
        return this.resolveDomainRouteLocal(path);
    },
    async renderRoute(fullUrl) {
        const renderToken = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        this._latestRouteRenderToken = renderToken;
        const wrapperEl = document.querySelector(".gx-viewport-wrapper");
        const viewport = document.getElementById("th-viewport");
        if (!viewport) return;
        let path = fullUrl.replace("gensokyo://", "").trim().toLowerCase();
        if (typeof this.recordNavigationHistory === "function") {
            const activeTab = this.getActiveTab ? this.getActiveTab() : null;
            this.recordNavigationHistory(fullUrl, activeTab ? activeTab.title : null);
        }
        if (typeof this.saveTabsSession === "function") this.saveTabsSession();
        const isInternalCentered = path === "" || path === "home" || path === "register" || path.startsWith("register") || path === "claim" || path.startsWith("claim") || path === "history" || path === "webring" || path === "directory" || path.startsWith("search");
        const isFullWidthRoute = !isInternalCentered;
        if (isFullWidthRoute) {
            viewport.classList.add("full-width");
            if (wrapperEl) wrapperEl.classList.add("full-bleed");
        } else {
            viewport.classList.remove("full-width");
            if (wrapperEl) wrapperEl.classList.remove("full-bleed");
        }
        if (this.isLocalhostDomain && (this.isLocalhostDomain(fullUrl) || this.isLocalhostDomain(path))) {
            this.renderLocalDevPort(fullUrl);
            return;
        }
        if (path === "history") {
            this.renderHistoryView();
            return;
        }
        if (path === "webring" || path === "directory") {
            this.renderWebringFullView();
            return;
        }
        if (path.startsWith("search")) {
            const urlParams = new URLSearchParams(path.includes("?") ? path.split("?")[1] : "");
            const q = urlParams.get("q") || "";
            this.renderSearchResults(q, "all");
            return;
        }
        path = path.toLowerCase();
        if (path === "" || path === "home") {
            viewport.innerHTML = this.getSpeedDialView();
            return;
        }
        const cleanPath = path.split("?")[0].trim();
        if (cleanPath === "register" || cleanPath === "claim") {
            this.renderRegisterView(path);
            return;
        }
        if (path === "builder") {
            if (typeof this.renderSiteBuilder === "function") {
                this.renderSiteBuilder(this.builderSelectedDomain);
            } else {
                viewport.innerHTML = this.getBuilderView();
            }
            return;
        }
        const routeInfo = await this.resolveDomainRoute(path);
        if (this._latestRouteRenderToken !== renderToken) {
            return;
        }
        if (routeInfo) {
            if (routeInfo.isPrivateBlocked) {
                viewport.classList.add("full-width");
                if (wrapperEl) wrapperEl.classList.add("full-bleed");
                viewport.innerHTML = `\n                    <div style="width: 100%; min-height: calc(100vh - 110px); margin: 0; background: var(--th-bg-main); display: flex; flex-direction: column; align-items: center;">\n                        \x3c!-- BANNER PANORÁMICO DE ANCHO COMPLETO (OPCIÓN B) --\x3e\n                        <div style="width: 100%; height: 240px; background: linear-gradient(180deg, #1c0308 0%, #3d0816 100%); border-bottom: 3px solid var(--th-crimson); position: relative; overflow: hidden;">\n                            <svg viewBox="0 0 800 240" style="width: 100%; height: 100%; display: block;" preserveAspectRatio="xMidYMid slice">\n                                <defs>\n                                    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">\n                                        <stop offset="0%" stop-color="#1c0308" />\n                                        <stop offset="60%" stop-color="#3d0816" />\n                                        <stop offset="100%" stop-color="#140206" />\n                                    </linearGradient>\n                                </defs>\n                                <rect width="800" height="240" fill="url(#skyGrad)" />\n\n                                \x3c!-- Mansión Escarlata en el Centro --\x3e\n                                <path d="M 370 140 L 370 50 L 400 20 L 430 50 L 430 140 Z" fill="#180208" opacity="0.9" />\n                                <polygon points="400,8 408,20 392,20" fill="#a61b32" opacity="0.85" />\n                                <rect x="396" y="55" width="8" height="18" rx="4" fill="#ffd700" opacity="0.85" />\n                                <rect x="396" y="85" width="8" height="18" rx="4" fill="#ffd700" opacity="0.7" />\n\n                                <path d="M 280 150 L 280 75 L 300 50 L 320 75 L 320 150 Z" fill="#140206" opacity="0.85" />\n                                <polygon points="300,35 307,50 293,50" fill="#a61b32" opacity="0.75" />\n                                <rect x="296" y="80" width="8" height="15" rx="4" fill="#ffd700" opacity="0.7" />\n\n                                <path d="M 480 150 L 480 75 L 500 50 L 520 75 L 520 150 Z" fill="#140206" opacity="0.85" />\n                                <polygon points="500,35 507,50 493,50" fill="#a61b32" opacity="0.75" />\n                                <rect x="496" y="80" width="8" height="15" rx="4" fill="#ffd700" opacity="0.7" />\n\n                                \x3c!-- Portones de Hierro Forjado Escarlata Panorámico --\x3e\n                                <rect x="20" y="30" width="14" height="190" fill="#0d0104" />\n                                <rect x="766" y="30" width="14" height="190" fill="#0d0104" />\n                                <path d="M 30 50 Q 400 10 770 50 L 770 220 L 30 220 Z" fill="none" stroke="#a61b32" stroke-width="4.5" />\n\n                                <line x1="60" y1="52" x2="60" y2="220" stroke="#a61b32" stroke-width="2" />\n                                <line x1="90" y1="48" x2="90" y2="220" stroke="#a61b32" stroke-width="2" />\n                                <line x1="120" y1="44" x2="120" y2="220" stroke="#a61b32" stroke-width="2" />\n                                <line x1="150" y1="40" x2="150" y2="220" stroke="#a61b32" stroke-width="2" />\n                                <line x1="180" y1="36" x2="180" y2="220" stroke="#a61b32" stroke-width="2" />\n                                <line x1="210" y1="33" x2="210" y2="220" stroke="#a61b32" stroke-width="2" />\n                                <line x1="240" y1="30" x2="240" y2="220" stroke="#a61b32" stroke-width="2" />\n                                <line x1="270" y1="28" x2="270" y2="220" stroke="#a61b32" stroke-width="2" />\n                                <line x1="300" y1="26" x2="300" y2="220" stroke="#a61b32" stroke-width="2" />\n                                <line x1="330" y1="25" x2="330" y2="220" stroke="#a61b32" stroke-width="2" />\n                                <line x1="360" y1="25" x2="360" y2="220" stroke="#a61b32" stroke-width="2" />\n\n                                <line x1="440" y1="25" x2="440" y2="220" stroke="#a61b32" stroke-width="2" />\n                                <line x1="470" y1="25" x2="470" y2="220" stroke="#a61b32" stroke-width="2" />\n                                <line x1="500" y1="26" x2="500" y2="220" stroke="#a61b32" stroke-width="2" />\n                                <line x1="530" y1="28" x2="530" y2="220" stroke="#a61b32" stroke-width="2" />\n                                <line x1="560" y1="30" x2="560" y2="220" stroke="#a61b32" stroke-width="2" />\n                                <line x1="590" y1="33" x2="590" y2="220" stroke="#a61b32" stroke-width="2" stroke-dasharray="0" />\n                                <line x1="620" y1="36" x2="620" y2="220" stroke="#a61b32" stroke-width="2" />\n                                <line x1="650" y1="40" x2="650" y2="220" stroke="#a61b32" stroke-width="2" />\n                                <line x1="680" y1="44" x2="680" y2="220" stroke="#a61b32" stroke-width="2" />\n                                <line x1="710" y1="48" x2="710" y2="220" stroke="#a61b32" stroke-width="2" />\n                                <line x1="740" y1="52" x2="740" y2="220" stroke="#a61b32" stroke-width="2" />\n\n                                <circle cx="27" cy="30" r="6" fill="#ffd700" />\n                                <circle cx="773" cy="30" r="6" fill="#ffd700" />\n\n                                \x3c!-- Hong Meiling en el Centro --\x3e\n                                <ellipse cx="400" cy="216" rx="35" ry="6" fill="rgba(0,0,0,0.65)" />\n                                <ellipse cx="392" cy="214" rx="7" ry="3.5" fill="#0d0104" />\n                                <ellipse cx="408" cy="214" rx="7" ry="3.5" fill="#0d0104" />\n\n                                <path d="M 380 128 Q 368 150 372 208 Q 400 210 428 208 Q 432 150 420 128 Z" fill="#800f2f" />\n                                <path d="M 382 128 Q 372 152 374 206 Q 400 208 426 206 Q 428 152 418 128 Z" fill="#c1121f" />\n\n                                <path d="M 386 152 L 414 152 L 422 212 L 378 212 Z" fill="#2d6a4f" />\n                                <path d="M 392 152 L 408 152 L 410 212 L 390 212 Z" fill="#40916c" />\n                                <path d="M 400 175 L 416 212 L 408 212 Z" fill="#ffffff" />\n\n                                <path d="M 385 155 L 370 178" stroke="#2d6a4f" stroke-width="7" stroke-linecap="round" />\n                                <circle cx="368" cy="180" r="4.5" fill="#ffdfd3" />\n\n                                <path d="M 415 155 L 430 178" stroke="#2d6a4f" stroke-width="7" stroke-linecap="round" />\n                                <circle cx="432" cy="180" r="4.5" fill="#ffdfd3" />\n\n                                <path d="M 384 136 Q 376 158 378 180 L 383 180 Q 385 158 388 136 Z" fill="#a61b32" />\n                                <polygon points="374,178 384,178 379,184" fill="#0d0104" />\n                                <polygon points="374,184 384,184 379,178" fill="#0d0104" />\n\n                                <path d="M 416 136 Q 424 158 422 180 L 417 180 Q 415 158 412 136 Z" fill="#a61b32" />\n                                <polygon points="416,178 426,178 421,184" fill="#0d0104" />\n                                <polygon points="416,184 426,184 421,178" fill="#0d0104" />\n\n                                <circle cx="400" cy="138" r="16" fill="#ffdfd3" />\n                                <path d="M 384 128 L 390 136 L 396 129 L 402 136 L 408 129 L 414 136 L 416 128 Z" fill="#c1121f" />\n                                <circle cx="393" cy="137" r="2.2" fill="#1d3557" />\n                                <circle cx="407" cy="137" r="2.2" fill="#1d3557" />\n                                <path d="M 396 143 Q 400 147 404 143" stroke="#b7094c" stroke-width="1.5" fill="none" stroke-linecap="round" />\n\n                                <path d="M 380 130 Q 400 115 420 130 Q 400 124 380 130 Z" fill="#2d6a4f" />\n                                <polygon points="400,118 402,122 406,122 403,124 404,128 400,126 396,128 397,124 394,122 398,122" fill="#ffd700" />\n                            </svg>\n                        </div>\n\n                        \x3c!-- CONTENIDO DE TEXTO Y BOTÓN SOBRE LIENZO CLARO --\x3e\n                        <div style="padding: 30px 24px; text-align: center; max-width: 600px;">\n                            <div style="display: inline-block; background: var(--th-crimson); color: #ffffff; padding: 6px 18px; border-radius: 20px; font-family: var(--font-heading); font-size: 0.85rem; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(166, 27, 50, 0.3);">\n                                Configuración de Privacidad\n                            </div>\n                            <h1 class="th-card-title" style="color: var(--th-crimson); font-size: 1.8rem; margin-bottom: 12px; font-family: var(--font-heading); text-transform: uppercase;">Dominio Privado</h1>\n                            <p style="font-size: 1.15rem; font-weight: 700; color: var(--th-text-main); line-height: 1.6; margin-bottom: 24px;">\n                                Este sitio web está protegido y solo es accesible por su titular.\n                            </p>\n                            <button class="gx-btn-go" style="padding: 12px 28px; font-size: 1rem;" onclick="GensokyoApp.navigate('gensokyo://home')">Volver a GensokyoNet</button>\n                        </div>\n                    </div>\n                `;
                return;
            }
            if (routeInfo.isSeed) {
                viewport.innerHTML = routeInfo.htmlContent;
                return;
            }
            if (routeInfo.isUserSite) {
                if (routeInfo.isEmptySite) {
                    viewport.classList.remove("full-width");
                    if (wrapperEl) wrapperEl.classList.remove("full-bleed");
                    viewport.innerHTML = `\n                        <div class="th-card" style="max-width: 600px; margin: 40px auto; text-align: center; padding: 40px 24px; border: 2px solid var(--th-gold); background: linear-gradient(135deg, var(--th-bg-card) 0%, var(--th-bg-main) 100%); border-radius: 14px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08); display: flex; flex-direction: column; align-items: center; justify-content: center;">\n                            <img src="assets/yukari_construction.png" alt="Chibi Yukari Yakumo - Lugar en Construcción" style="width: 100%; max-width: 320px; height: auto; display: block; margin: 0 auto 20px auto; filter: drop-shadow(0 8px 16px rgba(186, 104, 200, 0.25));">\n\n                            <div style="display: inline-block; background: var(--th-gold); color: #ffffff; padding: 6px 18px; border-radius: 20px; font-family: var(--font-heading); font-size: 0.85rem; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 14px; box-shadow: 0 2px 8px rgba(212, 160, 23, 0.3);">\n                                Spell Card: Boundary-Sign ["Sitio en Construcción"]\n                            </div>\n                            <h1 class="th-card-title" style="color: var(--th-crimson); font-size: 1.8rem; margin-bottom: 12px; font-family: var(--font-heading); text-transform: uppercase;">Lugar en construcción</h1>\n                            <p style="font-size: 1.15rem; font-weight: 700; color: var(--th-text-main); line-height: 1.6; margin-bottom: 24px; max-width: 500px;">\n                                El titular de este dominio aún no ha empezado a construir. Ten paciencia.\n                            </p>\n                            <button class="gx-btn-go" style="padding: 12px 28px; font-size: 1rem;" onclick="GensokyoApp.navigate('gensokyo://home')">Volver a GensokyoNet</button>\n                        </div>\n                    `;
                    return;
                }
                this.renderIntranetSiteFrame(routeInfo);
                return;
            }
        }
        viewport.innerHTML = `\n            <div class="th-card" style="max-width: 600px; margin: 40px auto; text-align: center;">\n                <h2 class="th-card-title">Dominio No Registrado</h2>\n                <div class="gx-address-bar" style="max-width: 400px; margin: 15px auto; justify-content: center;">gensokyo://${this.escapeHtml(path)}</div>\n                <p style="margin-bottom: 20px;">Esta dirección aún no existe en la red <strong>GensokyoNet</strong>.</p>\n                <button class="gx-btn-go" onclick="GensokyoApp.navigate('gensokyo://register?domain=${encodeURIComponent(path)}')">\n                    Reclamar este dominio gratis\n                </button>\n            </div>\n        `;
    },
    getSpeedDialView() {
        return `\n            <div class="gx-speed-dial-container">\n                <div class="yomoyama-banner-card">\n                    <div class="yomoyama-banner-inner" style="background-image: url('assets/gensokyo_banner.png?v=${Date.now()}');">\n                        <div class="banner-overlay-gradient"></div>\n                        <div class="banner-title-group">\n                            <h1 class="yomoyama-main-title">東方 GensokyoNet</h1>\n                            <p class="yomoyama-sub-title">Intranet Libre para la Comunidad de Touhou</p>\n                        </div>\n                    </div>\n                </div>\n\n                <div class="gx-search-box-wrap">\n                    <div class="gx-search-box">\n                        <input type="text" id="gx-home-search" class="gx-search-input" placeholder="Buscar en la red..." onkeypress="if(event.key==='Enter'){ GensokyoApp.submitHomeSearch(); }">\n                        <button class="gx-search-btn" onclick="GensokyoApp.submitHomeSearch()">Buscar</button>\n                    </div>\n                </div>\n\n                <div class="gx-speed-dial-grid">\n                    <div class="gx-dial-card" onclick="GensokyoApp.navigate('gensokyo://register')">\n                        <div style="background:var(--th-crimson-light); color:var(--th-crimson); width:46px; height:46px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">\n                            <svg class="th-svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>\n                        </div>\n                        <h3 style="font-family:var(--font-heading); font-size:1.05rem; color:var(--th-crimson); margin-bottom:4px;">RECLAMAR DOMINIO</h3>\n                        <p style="font-size:0.8rem; color:var(--th-text-sub);">Crea tu propio rincón</p>\n                    </div>\n\n                    <div class="gx-dial-card" onclick="GensokyoApp.navigate('gensokyo://history')">\n                        <div style="background:var(--th-crimson-light); color:var(--th-crimson); width:46px; height:46px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">\n                            <svg class="th-svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>\n                        </div>\n                        <h3 style="font-family:var(--font-heading); font-size:1.05rem; color:var(--th-crimson); margin-bottom:4px;">HISTORIAL</h3>\n                        <p style="font-size:0.8rem; color:var(--th-text-sub);">Registro de Navegación</p>\n                    </div>\n\n                    <div class="gx-dial-card" onclick="GensokyoApp.navigate('gensokyo://builder')">\n                        <div style="background:var(--th-crimson-light); color:var(--th-crimson); width:46px; height:46px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">\n                            <svg class="th-svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>\n                        </div>\n                        <h3 style="font-family:var(--font-heading); font-size:1.05rem; color:var(--th-crimson); margin-bottom:4px;">CREADOR WEB</h3>\n                        <p style="font-size:0.8rem; color:var(--th-text-sub);">Escribe tu propio rincón</p>\n                    </div>\n\n                    <div class="gx-dial-card" onclick="GensokyoApp.navigate('gensokyo://localhost:8080')">\n                        <div style="background:var(--th-crimson-light); color:var(--th-crimson); width:46px; height:46px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">\n                            <svg class="th-svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M4 6h16v12H4zm2 2v8h12V8zm2 2h8v4H8z"/></svg>\n                        </div>\n                        <h3 style="font-family:var(--font-heading); font-size:1.05rem; color:var(--th-crimson); margin-bottom:4px;">DEV LOCALHOST</h3>\n                        <p style="font-size:0.8rem; color:var(--th-text-sub);">Probar Servidor Local</p>\n                    </div>\n                </div>\n            </div>\n        `;
    },
    renderWebringBadgesHTML() {
        const seedKeys = Object.keys(GensokyoSeedData && GensokyoSeedData.domains ? GensokyoSeedData.domains : {});
        const userKeys = Object.keys(this.userDomains || {});
        const remoteList = Array.isArray(this._remoteDirectoryCache) ? this._remoteDirectoryCache : [];
        const badgeMap = new Map;
        seedKeys.forEach(key => {
            const d = GensokyoSeedData.domains[key];
            badgeMap.set(key, {
                domain: key,
                title: d.title || key,
                badgeUrl: d.badgeUrl || null,
                badgeText: d.badgeText || key.toUpperCase()
            });
        });
        userKeys.forEach(key => {
            const d = this.userDomains[key];
            if (d && d.visibility !== "private") {
                badgeMap.set(key, {
                    domain: key,
                    title: d.title || key,
                    badgeUrl: d.badgeUrl || null,
                    badgeText: d.badgeText || key.toUpperCase()
                });
            }
        });
        remoteList.forEach(r => {
            if (r && r.domain && !badgeMap.has(r.domain)) {
                badgeMap.set(r.domain, {
                    domain: r.domain,
                    title: r.title || r.domain,
                    badgeUrl: r.badgeUrl || null,
                    badgeText: r.badgeText || r.domain.toUpperCase()
                });
            }
        });
        if (!this._remoteDirectoryCache && typeof this.fetchRemoteDirectory === "function") {
            this.fetchRemoteDirectory().then(() => {
                const el = document.getElementById("gx-webring-badges-container");
                if (el) el.innerHTML = this.renderWebringBadgesHTML();
            });
        }
        const badges = Array.from(badgeMap.values());
        if (badges.length === 0) {
            return '<div style="font-size:0.82rem; color:var(--th-text-sub); padding:10px;">No hay botones webring registrados aun.</div>';
        }
        return badges.map(b => {
            if (b.badgeUrl) {
                return `\n                    <div class="gx-badge-88x31" onclick="GensokyoApp.navigate('gensokyo://${this.escapeHtml(b.domain)}')" title="${this.escapeHtml(b.title)} (${this.escapeHtml(b.domain)})">\n                        <img src="${this.escapeHtml(b.badgeUrl)}" alt="${this.escapeHtml(b.title)}">\n                    </div>\n                `;
            }
            return `\n                <div class="gx-badge-88x31" onclick="GensokyoApp.navigate('gensokyo://${this.escapeHtml(b.domain)}')" title="${this.escapeHtml(b.title)} (gensokyo://${this.escapeHtml(b.domain)})">\n                    <span>${this.escapeHtml(b.badgeText || b.domain.slice(0, 11))}</span>\n                </div>\n            `;
        }).join("");
    },
    renderWebringFullView() {
        const viewport = document.getElementById("th-viewport");
        if (!viewport) return;
        this.fetchRemoteDirectory && this.fetchRemoteDirectory().then(() => {
            const container = document.getElementById("gx-full-webring-container");
            if (container) container.innerHTML = this.renderWebringBadgesHTML();
        });
        viewport.innerHTML = `\n            <div class="th-card" style="max-width: 880px; margin: 24px auto; padding: 24px;">\n                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--th-border-warm); padding-bottom: 14px; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">\n                    <div>\n                        <h1 class="th-card-title" style="margin: 0; font-size: 1.5rem; color: var(--th-crimson);">Directorio de la Red y Webrings</h1>\n                        <span style="font-size: 0.85rem; color: var(--th-text-sub); font-weight: 600;">Banners 88x31 px de la comunidad GensokyoNet</span>\n                    </div>\n                    <button class="gx-btn-go" onclick="GensokyoApp.navigate('gensokyo://home')">Volver al Inicio</button>\n                </div>\n\n                <p style="font-size: 0.95rem; color: var(--th-text-main); line-height: 1.6; margin-bottom: 20px;">\n                    Explora los sitios registrados en la intranet o haz clic en cualquier insignia para visitarlo directamente.\n                </p>\n\n                <div class="gx-webring-grid" id="gx-full-webring-container" style="gap: 14px; padding: 10px; background: var(--th-bg-main); border: 1.5px solid var(--th-border-warm); border-radius: 8px;">\n                    ${this.renderWebringBadgesHTML()}\n                </div>\n            </div>\n        `;
    },
    renderRegisterView(rawPath = "register") {
        const viewport = document.getElementById("th-viewport");
        if (!viewport) return;
        let prefilledDomain = "";
        if (rawPath && rawPath.includes("?")) {
            try {
                const params = new URLSearchParams(rawPath.slice(rawPath.indexOf("?") + 1));
                prefilledDomain = (params.get("domain") || params.get("q") || "").trim();
            } catch (e) {}
        }
        const isRegistered = this.passport && this.passport.isRegistered;
        if (!isRegistered) {
            viewport.innerHTML = `\n                <div class="th-card" style="max-width: 480px; margin: 30px auto; padding: 28px;">\n                    <div style="text-align: center; margin-bottom: 22px;">\n                        <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--th-crimson-light); color: var(--th-crimson); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">\n                            <svg class="th-svg-icon" style="width:26px;height:26px;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>\n                        </div>\n                        <h1 class="th-card-title" style="margin: 0; font-size: 1.35rem; color: var(--th-crimson);">Registro de Cuenta GensokyoNet</h1>\n                        <p style="font-size: 0.85rem; color: var(--th-text-sub); margin-top: 6px;">\n                            ${prefilledDomain ? `Para reclamar <strong>gensokyo://${this.escapeHtml(prefilledDomain)}</strong> necesitas registrar tu pasaporte.` : "Crea una cuenta para registrar y proteger dominios en la red."}\n                        </p>\n                    </div>\n\n                    ${prefilledDomain ? `\n                    <div style="background: rgba(166,27,50,0.08); border: 1.5px solid var(--th-crimson); border-radius: 8px; padding: 10px 14px; margin-bottom: 18px; display: flex; align-items: center; gap: 10px;">\n                        <span style="font-size: 0.75rem; font-weight: 800; color: var(--th-crimson); letter-spacing: 0.5px;">DOMINIO A RECLAMAR:</span>\n                        <span style="font-family: var(--font-heading); font-weight: 700; color: var(--th-crimson);">gensokyo://${this.escapeHtml(prefilledDomain)}</span>\n                    </div>\n                    ` : ""}\n\n                    <div id="gx-reg-page-error" class="th-form-error-banner"></div>\n\n                    <form id="gx-page-register-form" onsubmit="event.preventDefault(); GensokyoApp.submitPageRegister();">\n                        <input type="hidden" id="gx-reg-page-domain" value="${this.escapeHtml(prefilledDomain)}">\n\n                        <div class="th-form-group">\n                            <label class="th-form-label" for="gx-reg-page-username">Nombre de Usuario</label>\n                            <input type="text" id="gx-reg-page-username" class="th-form-input" required autocomplete="username">\n                        </div>\n\n                        <div class="th-form-group">\n                            <label class="th-form-label" for="gx-reg-page-password">Contraseña</label>\n                            <div class="th-input-password-wrapper">\n                                <input type="password" id="gx-reg-page-password" class="th-form-input" required minlength="8" autocomplete="new-password">\n                                <button type="button" class="yukari-eye-btn" onclick="GensokyoApp.togglePasswordVisibility('gx-reg-page-password', this)" title="Ver/Ocultar Contraseña">\n                                    <svg class="yukari-eye-svg closed" viewBox="0 0 24 24">\n                                        <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M3 10a12.5 12.5 0 0 0 18 0M6.5 12.5L5 15.5M12 13.5v3.5M17.5 12.5l1.5 3"/>\n                                    </svg>\n                                    <svg class="yukari-eye-svg open hidden" viewBox="0 0 24 24">\n                                        <path fill="#ffffff" stroke="var(--th-crimson)" stroke-width="1.8" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>\n                                        <circle cx="12" cy="12" r="4.5" fill="#a61b32"/>\n                                        <circle cx="12" cy="12" r="2" fill="#500010"/>\n                                    </svg>\n                                </button>\n                            </div>\n                        </div>\n\n                        <div class="th-form-group">\n                            <label class="th-form-label" for="gx-reg-page-confirm-password">Confirmar Contraseña</label>\n                            <div class="th-input-password-wrapper">\n                                <input type="password" id="gx-reg-page-confirm-password" class="th-form-input" required minlength="8" autocomplete="new-password">\n                                <button type="button" class="yukari-eye-btn" onclick="GensokyoApp.togglePasswordVisibility('gx-reg-page-confirm-password', this)" title="Ver/Ocultar Contraseña">\n                                    <svg class="yukari-eye-svg closed" viewBox="0 0 24 24">\n                                        <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M3 10a12.5 12.5 0 0 0 18 0M6.5 12.5L5 15.5M12 13.5v3.5M17.5 12.5l1.5 3"/>\n                                    </svg>\n                                    <svg class="yukari-eye-svg open hidden" viewBox="0 0 24 24">\n                                        <path fill="#ffffff" stroke="var(--th-crimson)" stroke-width="1.8" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>\n                                        <circle cx="12" cy="12" r="4.5" fill="#a61b32"/>\n                                        <circle cx="12" cy="12" r="2" fill="#500010"/>\n                                    </svg>\n                                </button>\n                            </div>\n                        </div>\n\n                        <button type="submit" class="gx-btn-go" style="width: 100%; padding: 12px; font-size: 0.95rem; font-weight: 700; border-radius: 8px; margin-top: 8px;">\n                            ${prefilledDomain ? "Crear Cuenta y Reclamar Dominio" : "Crear Cuenta"}\n                        </button>\n\n                        <div style="text-align: center; margin-top: 18px; font-size: 0.85rem; color: var(--th-text-sub);">\n                            ¿Ya tienes una cuenta? <a href="#" onclick="event.preventDefault(); GensokyoApp.showLoginModal();" style="color: var(--th-crimson); font-weight: 700; text-decoration: underline;">Inicia Sesión</a>\n                        </div>\n                    </form>\n                </div>\n            `;
            const userInput = document.getElementById("gx-reg-page-username");
            if (userInput) setTimeout(() => userInput.focus(), 60);
        } else {
            viewport.innerHTML = `\n                <div class="th-card" style="max-width: 500px; margin: 30px auto; padding: 28px;">\n                    <div style="text-align: center; margin-bottom: 22px;">\n                        <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--th-crimson-light); color: var(--th-crimson); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">\n                            <svg class="th-svg-icon" style="width:26px;height:26px;" viewBox="0 0 24 24"><path fill="currentColor" d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>\n                        </div>\n                        <h1 class="th-card-title" style="margin: 0; font-size: 1.35rem; color: var(--th-crimson);">Reclamar Dominio Doujin</h1>\n                        <p style="font-size: 0.85rem; color: var(--th-text-sub); margin-top: 6px;">\n                            Autenticado como <strong>${this.escapeHtml(this.passport.username)}</strong> (${this.escapeHtml(this.passport.userId)}).\n                        </p>\n                    </div>\n\n                    <div id="gx-claim-domain-error" class="th-form-error-banner"></div>\n\n                    <form id="gx-claim-domain-form" onsubmit="event.preventDefault(); GensokyoApp.submitClaimDomain();">\n                        <div class="th-form-group">\n                            <label class="th-form-label" for="gx-claim-input-domain">Nombre de Dominio</label>\n                            <div style="display: flex; align-items: center; background: var(--th-bg-main); border: 1.5px solid var(--th-border-warm); border-radius: 8px; padding: 2px 14px;">\n                                <span style="font-family: var(--font-heading); font-weight: 700; color: var(--th-crimson); font-size: 0.95rem; margin-right: 6px;">gensokyo://</span>\n                                <input type="text" id="gx-claim-input-domain" class="th-form-input" value="${this.escapeHtml(prefilledDomain)}" style="border:none; padding:8px 0; background:transparent; box-shadow:none;" required pattern="[a-zA-Z0-9.-]+" title="Solo letras, números, puntos y guiones">\n                            </div>\n                        </div>\n\n                        <button type="submit" class="gx-btn-go" style="width: 100%; padding: 12px; font-size: 0.95rem; font-weight: 700; border-radius: 8px; margin-top: 14px;">\n                            Reclamar y Abrir en Studio\n                        </button>\n                    </form>\n                </div>\n            `;
            const domainInput = document.getElementById("gx-claim-input-domain");
            if (domainInput) setTimeout(() => domainInput.focus(), 60);
        }
    },
    getRegisterView() {
        return this.renderRegisterView("register");
    },
    async submitPageRegister() {
        const userIn = document.getElementById("gx-reg-page-username");
        const passIn = document.getElementById("gx-reg-page-password");
        const confirmIn = document.getElementById("gx-reg-page-confirm-password");
        const domIn = document.getElementById("gx-reg-page-domain");
        const errBox = document.getElementById("gx-reg-page-error");
        const username = (userIn ? userIn.value : "").trim();
        const password = passIn ? passIn.value : "";
        const confirmPassword = confirmIn ? confirmIn.value : "";
        const domainToClaim = (domIn ? domIn.value : "").trim();
        const res = await this.submitRegisterFromNative({
            username: username,
            password: password,
            confirmPassword: confirmPassword
        });
        if (!res.ok) {
            if (errBox) {
                errBox.textContent = res.message;
                errBox.style.display = "block";
            }
            return;
        }
        if (domainToClaim) {
            this.claimDomainForCurrentUser(domainToClaim);
        } else {
            this.renderRegisterView("register");
        }
    },
    submitClaimDomain() {
        const domIn = document.getElementById("gx-claim-input-domain");
        const errBox = document.getElementById("gx-claim-domain-error");
        const rawDom = (domIn ? domIn.value : "").trim().toLowerCase().replace(/^gensokyo:\/\//i, "");
        const clean = rawDom.replace(/[^a-z0-9.-]/g, "");
        if (!clean) {
            if (errBox) {
                errBox.textContent = "Por favor ingresa un nombre de dominio válido.";
                errBox.style.display = "block";
            }
            return;
        }
        const res = this.claimDomainForCurrentUser(clean);
        if (!res.ok && errBox) {
            errBox.textContent = res.message;
            errBox.style.display = "block";
        }
    },
    claimDomainForCurrentUser(domainName) {
        const clean = String(domainName || "").trim().toLowerCase().replace(/^gensokyo:\/\//i, "").replace(/[^a-z0-9.-]/g, "");
        if (!clean) return {
            ok: false,
            message: "Nombre de dominio no válido."
        };
        const existing = this.userDomains[clean];
        const myId = this.passport ? this.passport.userId : "ID#0000";
        if (existing && existing.ownerId && existing.ownerId !== myId) {
            return {
                ok: false,
                message: `El dominio "gensokyo://${clean}" ya fue reclamado por otro creador.`
            };
        }
        if (!existing) {
            const vfs = typeof GensokyoVFS !== "undefined" && GensokyoVFS.createDefaultTree ? GensokyoVFS.createDefaultTree() : {
                files: {
                    "index.html": `<!DOCTYPE html><html><body><h1>gensokyo://${clean}</h1></body></html>`
                },
                folders: []
            };
            this.userDomains[clean] = {
                title: clean,
                author: this.passport?.username || "Nameless Youkai",
                ownerId: myId,
                visibility: "public",
                activeVersion: "v1",
                versions: {
                    v1: {
                        htmlContent: vfs.files["index.html"] || "",
                        vfs: vfs,
                        updatedAt: (new Date).toISOString()
                    }
                },
                vfs: vfs,
                htmlContent: vfs.files["index.html"] || ""
            };
            this.saveUserDomains();
        }
        if (this.passport && Array.isArray(this.passport.ownedDomains) && !this.passport.ownedDomains.includes(clean)) {
            this.passport.ownedDomains.push(clean);
            this.savePassportData();
            this.updatePassportUI();
        }
        if (this.showToastNotification) {
            this.showToastNotification(`¡Dominio gensokyo://${clean} reclamado con éxito!`, "success");
        }
        this.builderSelectedDomain = clean;
        this.navigate("gensokyo://builder");
        return {
            ok: true,
            domain: clean
        };
    },
    renderHistoryView() {
        const viewport = document.getElementById("th-viewport");
        if (!viewport) return;
        const history = this.navigationHistory || [];
        const formatTime = ts => {
            const d = new Date(ts);
            return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            })}`;
        };
        viewport.innerHTML = `\n            <div class="th-card" style="max-width: 800px; margin: 24px auto; padding: 24px;">\n                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--th-border-warm); padding-bottom: 14px; margin-bottom: 18px; flex-wrap: wrap; gap: 12px;">\n                    <div>\n                        <h1 class="th-card-title" style="margin: 0; font-size: 1.5rem; color: var(--th-crimson);">Historial de Navegacion</h1>\n                        <span style="font-size: 0.85rem; color: var(--th-text-sub); font-weight: 600;">${history.length} paginas registradas (Atajo: Ctrl+H)</span>\n                    </div>\n                    <div style="display: flex; gap: 10px;">\n                        <button class="gx-btn-go" style="background: var(--th-bg-main); color: var(--th-crimson); border: 1.5px solid var(--th-crimson);" onclick="GensokyoApp.clearNavigationHistory()">Borrar Historial</button>\n                        <button class="gx-btn-go" onclick="GensokyoApp.navigate('gensokyo://home')">Volver al Inicio</button>\n                    </div>\n                </div>\n\n                <div style="margin-bottom: 16px;">\n                    <input type="text" id="gx-history-filter" class="gx-search-input" placeholder="Filtrar historial..." style="width: 100%; border-radius: 6px; padding: 10px 14px;" oninput="GensokyoApp.filterHistoryView(this.value)">\n                </div>\n\n                <div id="gx-history-list" style="display: flex; flex-direction: column; gap: 8px;">\n                    ${history.length === 0 ? `\n                        <div style="text-align: center; padding: 30px; color: var(--th-text-sub);">\n                            No hay paginas en el historial.\n                        </div>\n                    ` : history.map((item, index) => `\n                        <div class="gx-history-item" data-index="${index}" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--th-bg-main); border: 1px solid var(--th-border-warm); border-radius: 8px; transition: background 0.2s;">\n                            <div style="display: flex; flex-direction: column; gap: 2px; cursor: pointer; flex: 1; overflow: hidden;" onclick="GensokyoApp.navigate('${this.escapeHtml(item.url)}')">\n                                <span style="font-weight: 700; color: var(--th-text-main); font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(item.title || item.url)}</span>\n                                <span style="font-size: 0.8rem; color: var(--th-crimson);">${this.escapeHtml(item.url)}</span>\n                            </div>\n                            <div style="display: flex; align-items: center; gap: 12px; margin-left: 12px;">\n                                <span style="font-size: 0.78rem; color: var(--th-text-sub); white-space: nowrap;">${formatTime(item.timestamp)}</span>\n                                <button onclick="GensokyoApp.deleteNavigationHistoryItem(${index})" style="background: none; border: none; cursor: pointer; color: var(--th-text-sub); padding: 4px;" title="Eliminar entrada">\n                                    <svg class="th-svg-icon" style="width: 16px; height: 16px;" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>\n                                </button>\n                            </div>\n                        </div>\n                    `).join("")}\n                </div>\n            </div>\n        `;
    },
    filterHistoryView(query) {
        const q = String(query || "").toLowerCase().trim();
        const items = document.querySelectorAll("#gx-history-list .gx-history-item");
        items.forEach(el => {
            const text = el.textContent.toLowerCase();
            el.style.display = !q || text.includes(q) ? "flex" : "none";
        });
    },
    renderHakureiBarrier(externalDomain) {
        const viewport = document.getElementById("th-viewport");
        if (!viewport) return;
        const cleanDomain = externalDomain.replace(/^(https?:\/\/|outside:\/\/|gensokyo:\/\/)/i, "").trim();
        viewport.innerHTML = `\n            <div class="th-card" style="max-width: 650px; margin: 40px auto; text-align: center; border: 2px solid var(--th-crimson);">\n                <div style="width: 70px; height: 70px; background: var(--th-crimson-light); color: var(--th-crimson); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">\n                    <svg class="th-svg-icon" style="width:36px; height:36px;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>\n                </div>\n                <h1 class="th-card-title" style="color: var(--th-crimson); font-size: 1.6rem; margin-bottom: 12px; font-family: var(--font-heading); text-transform: uppercase;">Aviso de Navegación Externa</h1>\n                <p style="font-size: 1.05rem; font-weight: 700; color: var(--th-text-main); line-height: 1.6; margin-bottom: 20px;">\n                    Estás por salir de GensokyoNet para acceder al Mundo Exterior (<code>OUTSIDE:// ${this.escapeHtml(cleanDomain)}</code>).\n                </p>\n                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">\n                    <button class="gx-btn-go" onclick="GensokyoApp.navigate('gensokyo://home')">Volver al Inicio</button>\n                    <button class="gx-btn-go" style="background: var(--th-bg-main); border: 1.5px solid var(--th-crimson); color: var(--th-crimson); font-weight: 700;" onclick="GensokyoApp.proceedCrossHakureiBarrier('${this.escapeHtml(cleanDomain)}')">Continuar al Sitio Externo ➔</button>\n                </div>\n            </div>\n        `;
    },
    renderHakureiBlocked(externalDomain) {
        const viewport = document.getElementById("th-viewport");
        if (!viewport) return;
        const cleanDomain = externalDomain.replace(/^(https?:\/\/|outside:\/\/|gensokyo:\/\/)/i, "").trim();
        viewport.innerHTML = `\n            <div class="th-card" style="max-width: 650px; margin: 40px auto; text-align: center; border: 2px solid var(--th-crimson);">\n                <div style="width: 70px; height: 70px; background: var(--th-crimson-light); color: var(--th-crimson); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">\n                    <svg class="th-svg-icon" style="width:36px; height:36px;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>\n                </div>\n                <h1 class="th-card-title" style="color: var(--th-crimson); font-size: 1.6rem; margin-bottom: 12px; font-family: var(--font-heading); text-transform: uppercase;">Navegación Externa Desactivada</h1>\n                <p style="font-size: 1.05rem; font-weight: 700; color: var(--th-text-main); line-height: 1.6; margin-bottom: 20px;">\n                    Tu configuración actual tiene desactivada la navegación al Mundo Exterior (<code>OUTSIDE:// ${this.escapeHtml(cleanDomain)}</code>).<br>\n                    Puedes habilitarla en el menú de Preferencias.\n                </p>\n                <div style="display: flex; gap: 12px; justify-content: center;">\n                    <button class="gx-btn-go" onclick="GensokyoApp.navigate('gensokyo://home')">Volver al Inicio</button>\n                    <button class="gx-btn-go" style="background: var(--th-bg-main); border: 1.5px solid var(--th-border-warm); color: var(--th-text-main);" onclick="GensokyoApp.showThemeModal()">Abrir Preferencias</button>\n                </div>\n            </div>\n        `;
    }
});

(function() {
    if (!window.GensokyoApp) return;
    Object.assign(GensokyoApp, {
        parseLocalDevServerTarget(rawUrl) {
            const cleaned = String(rawUrl || "").trim();
            const match = cleaned.match(/^(?:(?:gensokyo|outside|https?):\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)(?::(\d{1,5}))?(\/.*)?$/i);
            if (!match) return null;
            const host = match[1].toLowerCase() === "0.0.0.0" ? "127.0.0.1" : match[1].toLowerCase();
            const port = match[2] ? parseInt(match[2], 10) : 3e3;
            if (port < 1 || port > 65535) return null;
            const path = match[3] || "/";
            return {
                host: host,
                port: port,
                path: path,
                httpUrl: `http://${host}:${port}${path}`,
                displayUrl: `gensokyo://${host}:${port}${path}`
            };
        },
        isLocalhostDomain(rawUrl) {
            return !!this.parseLocalDevServerTarget(rawUrl);
        },
        postToNativeShell(payload) {
            try {
                if (window.chrome && window.chrome.webview && typeof window.chrome.webview.postMessage === "function") {
                    window.chrome.webview.postMessage(payload);
                    return true;
                }
            } catch (e) {
                console.warn("Error enviando mensaje al bridge WebView2", e);
            }
            return false;
        },
        syncNativeViewportBounds() {
            const viewport = document.getElementById("th-viewport");
            if (!viewport) return;
            const rect = viewport.getBoundingClientRect();
            this.postToNativeShell({
                action: "viewportRectChanged",
                rect: {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height
                }
            });
        },
        renderLocalDevPort(rawUrl) {
            const target = this.parseLocalDevServerTarget(rawUrl);
            const viewport = document.getElementById("th-viewport");
            if (!target || !viewport) return;
            const urlInput = document.getElementById("th-url-input");
            if (urlInput) urlInput.value = `${target.host}:${target.port}${target.path}`;
            const statusEl = document.getElementById("th-status-text");
            if (statusEl) {
                statusEl.textContent = `Modo Dev Local Activo — Escuchando ${target.httpUrl}`;
            }
            if (window.chrome && window.chrome.webview) {
                viewport.innerHTML = "";
                this.syncNativeViewportBounds();
                this.postToNativeShell({
                    action: "crossHakureiBarrier",
                    url: target.httpUrl
                });
                return;
            }
            const localhostSandbox = this.getLocalhostSandboxAttr ? this.getLocalhostSandboxAttr() : "allow-scripts allow-forms";
            viewport.innerHTML = `\n                <div style="display:flex; flex-direction:column; width:100%; height:100%; flex:1; border:none; border-radius:0; overflow:hidden; background:var(--th-bg-card);">\n                    <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 12px; background:var(--th-bg-card); border-bottom:1px solid var(--th-border-warm); font-size:0.78rem;">\n                        <div style="display:flex; align-items:center; gap:8px;">\n                            <span style="background:var(--th-crimson); color:#fff; padding:2px 8px; border-radius:10px; font-weight:700; font-size:0.7rem;">DEV PORT :${target.port}</span>\n                            <code style="color:var(--th-text-main);">${this.escapeHtml(target.httpUrl)}</code>\n                        </div>\n                        <div style="display:flex; gap:8px;">\n                            <button type="button" id="gx-devport-reload" class="gx-btn" style="padding:3px 10px; font-size:0.75rem;">Refrescar Puerto</button>\n                            <button type="button" id="gx-devport-sandbox" class="gx-btn" style="padding:3px 10px; font-size:0.75rem;">\n                                Sandbox: ${this.securityConfig && this.securityConfig.localhostSandboxMode === "dev" ? "Dev (Same-Origin)" : "Aislado"}\n                            </button>\n                        </div>\n                    </div>\n                    <iframe id="gx-devport-frame"\n                        class="user-site-iframe"\n                        src="${this.escapeHtml(target.httpUrl)}"\n                        sandbox="${localhostSandbox} allow-modals allow-popups allow-downloads"\n                        allow="autoplay; fullscreen; clipboard-read; clipboard-write; gamepad; web-share"\n                        style="flex:1; width:100%; height:100%; border:none; background:#ffffff;">\n                    </iframe>\n                </div>\n            `;
            document.getElementById("gx-devport-reload")?.addEventListener("click", () => {
                const frame = document.getElementById("gx-devport-frame");
                if (frame) frame.src = target.httpUrl;
            });
            document.getElementById("gx-devport-sandbox")?.addEventListener("click", () => {
                const next = this.securityConfig && this.securityConfig.localhostSandboxMode === "secure" ? "dev" : "secure";
                this.setLocalhostSandboxMode(next);
                this.renderLocalDevPort(rawUrl);
            });
        },
        renderIntranetSiteFrame(routeInfo) {
            const viewport = document.getElementById("th-viewport");
            if (!viewport || !routeInfo) return;
            this.postToNativeShell({
                action: "returnToIntranet"
            });
            const domainName = routeInfo.domain || "";
            let finalHtml = routeInfo.htmlContent || "";
            const localDomain = this.userDomains && this.userDomains[domainName];
            if (localDomain && (localDomain.vfs || localDomain.files) && window.GensokyoBundler) {
                finalHtml = GensokyoBundler.bundle(localDomain.vfs || {
                    files: localDomain.files
                }, routeInfo.subpage || null, domainName).html;
            }
            if (finalHtml && !finalHtml.includes('id="gx-intranet-storage-bridge"') && window.GensokyoBundler && typeof window.GensokyoBundler.getStorageBridgeScript === "function") {
                const storageScript = window.GensokyoBundler.getStorageBridgeScript(domainName);
                if (/<head\b[^>]*>/i.test(finalHtml)) {
                    finalHtml = finalHtml.replace(/<head\b[^>]*>/i, m => `${m}\n${storageScript}`);
                } else {
                    finalHtml = `<!DOCTYPE html><html><head>${storageScript}</head><body>${finalHtml}</body></html>`;
                }
            }
            if (this._activeIntranetBlobUrl) {
                URL.revokeObjectURL(this._activeIntranetBlobUrl);
            }
            const blob = new Blob([ finalHtml ], {
                type: "text/html;charset=utf-8"
            });
            this._activeIntranetBlobUrl = URL.createObjectURL(blob);
            viewport.innerHTML = `\n                <div style="width:100%; height:100%; flex:1; display:flex; flex-direction:column; border:none; border-radius:0; overflow:hidden; background:#ffffff;">\n                    <iframe id="gx-intranet-site-iframe"\n                        class="user-site-iframe"\n                        src="${this._activeIntranetBlobUrl}"\n                        sandbox="allow-scripts allow-forms allow-modals allow-popups"\n                        allow="autoplay; fullscreen; gamepad"\n                        style="width:100%; height:100%; border:none; display:block; flex:1;">\n                    </iframe>\n                </div>\n            `;
        }
    });
    window.addEventListener("message", event => {
        const data = event.data;
        if (!data || typeof data !== "object") return;
        if (data.source === "gensokyo-site-storage" && data.domain) {
            const cleanDomain = String(data.domain).toLowerCase().trim().replace(/^gensokyo:\/\//i, "").split("/")[0];
            if (!cleanDomain) return;
            const storageKey = "gx_site_storage_" + cleanDomain;
            let store = {};
            try {
                store = JSON.parse(localStorage.getItem(storageKey) || "{}");
            } catch(e) {
                store = {};
            }
            if (data.action === "setItem" && typeof data.key === "string") {
                store[data.key] = String(data.value);
            } else if (data.action === "removeItem" && typeof data.key === "string") {
                delete store[data.key];
            } else if (data.action === "clear") {
                store = {};
            }
            try {
                localStorage.setItem(storageKey, JSON.stringify(store));
            } catch(e) {}
            return;
        }
        if (data.source === "gensokyo-intranet-nav" && typeof data.url === "string") {
            GensokyoApp.navigate(data.url);
        } else if (data.source === "gensokyo-intranet-subpage" && typeof data.page === "string") {
            const activeTab = GensokyoApp.getActiveTab ? GensokyoApp.getActiveTab() : null;
            if (!activeTab) return;
            const domainKey = String(activeTab.url || "").replace(/^gensokyo:\/\//i, "").split("/")[0];
            const domainObj = GensokyoApp.userDomains[domainKey];
            if (domainObj) {
                GensokyoApp.renderIntranetSiteFrame({
                    domain: domainKey,
                    title: domainObj.title || domainKey,
                    htmlContent: domainObj.htmlContent,
                    subpage: data.page
                });
            }
        } else if (data.type === "GENSOKYO_GET_PASSPORT_PROFILE" || data.source === "gensokyo-passport-sdk" && data.action === "getProfile") {
            const iframe = document.getElementById("gx-intranet-site-iframe");
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                    type: "GENSOKYO_PASSPORT_PROFILE_RESPONSE",
                    requestId: data.requestId,
                    profile: {
                        username: GensokyoApp.passport ? GensokyoApp.passport.username || "Nameless Youkai" : "Nameless Youkai",
                        userId: GensokyoApp.passport ? GensokyoApp.passport.userId || "ID#0000" : "ID#0000",
                        avatarUrl: GensokyoApp.passport ? GensokyoApp.passport.avatarUrl || "assets/nameless_avatar.png" : "assets/nameless_avatar.png",
                        isRegistered: GensokyoApp.passport ? !!GensokyoApp.passport.isRegistered : false,
                        currentTheme: GensokyoApp.currentTheme || "scarlet"
                    }
                }, "*");
            }
        }
    });
    window.addEventListener("resize", () => {
        GensokyoApp.syncNativeViewportBounds();
    });
})();