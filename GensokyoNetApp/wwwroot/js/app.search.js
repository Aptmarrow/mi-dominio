Object.assign(GensokyoApp, {
    submitHomeSearch() {
        const input = document.getElementById("gx-home-search");
        if (!input) return;
        const q = input.value.trim();
        if (!q) return;
        this.navigate(`gensokyo://search?q=${encodeURIComponent(q)}`);
    },
    submitSerpSearch() {
        const input = document.getElementById("serp-search-input");
        if (!input) return;
        const q = input.value.trim();
        if (!q) return;
        this.navigate(`gensokyo://search?q=${encodeURIComponent(q)}`);
    },
    renderSearchResults(query, filterTab = "all") {
        const viewport = document.getElementById("th-viewport");
        if (!viewport) return;
        const cleanQ = (query || "").toLowerCase().trim();
        this.currentSearchQuery = query || "";
        const allDomains = {
            ...GensokyoSeedData.domains,
            ...this.userDomains
        };
        if (Array.isArray(this._remoteDirectoryCache)) {
            this._remoteDirectoryCache.forEach(rem => {
                if (rem && rem.domain && !allDomains[rem.domain]) {
                    allDomains[rem.domain] = {
                        title: rem.title || rem.domain,
                        author: rem.author || "la comunidad",
                        snippet: `Sitio publicado en la red GensokyoNet (${rem.activeVersion || "v1"}).`,
                        visibility: "public"
                    };
                }
            });
        }
        if (typeof this.fetchRemoteDirectory === "function") {
            this.fetchRemoteDirectory().then(remoteDomains => {
                if (Array.isArray(remoteDomains) && this.currentSearchQuery === query) {
                    const hasNew = remoteDomains.some(r => r && r.domain && !allDomains[r.domain]);
                    if (hasNew) {
                        this.renderSearchResults(query, filterTab);
                    }
                }
            });
        }
        const matchedWebs = [];
        Object.keys(allDomains).forEach(domainKey => {
            const site = allDomains[domainKey];
            if (site.visibility === "unlisted" || site.visibility === "private") {
                return;
            }
            const title = (site.title || "").toLowerCase();
            const snippet = (site.snippet || site.author || "").toLowerCase();
            const content = (site.htmlContent || site.content || "").toLowerCase();
            if (!cleanQ || domainKey.includes(cleanQ) || title.includes(cleanQ) || snippet.includes(cleanQ) || content.includes(cleanQ)) {
                matchedWebs.push({
                    domain: domainKey,
                    title: site.title || domainKey,
                    author: site.author || "la comunidad",
                    snippet: site.snippet || `Sitio publicado en la red GensokyoNet por ${site.author || "la comunidad"}.`
                });
            }
        });
        const matchedImages = GensokyoSeedData.images.filter(img => {
            if (!cleanQ) return true;
            return img.title.toLowerCase().includes(cleanQ) || img.tags.some(t => t.toLowerCase().includes(cleanQ)) || img.domain.toLowerCase().includes(cleanQ);
        });
        const matchedVideos = GensokyoSeedData.videos.filter(vid => {
            if (!cleanQ) return true;
            return vid.title.toLowerCase().includes(cleanQ) || vid.description.toLowerCase().includes(cleanQ) || imgTagFilter(vid.tags, cleanQ);
        });
        function imgTagFilter(tags, q) {
            return Array.isArray(tags) && tags.some(t => String(t).toLowerCase().includes(q));
        }
        let activeCount = matchedWebs.length;
        if (filterTab === "images") activeCount = matchedImages.length;
        if (filterTab === "videos") activeCount = matchedVideos.length;
        if (filterTab === "news") activeCount = matchedWebs.filter(w => w.domain.includes("news") || w.domain.includes("blog")).length;
        const safeAvatar = this.sanitizeAvatarUrl ? this.sanitizeAvatarUrl(this.passport.avatarUrl) : this.passport.avatarUrl || "assets/nameless_avatar.png";
        viewport.innerHTML = `\n            <div class="google-serp-container">\n                <div class="google-serp-top-header">\n                    <div class="serp-brand-group" data-action="go-home">\n                        <span class="serp-google-logo">GensokyoNet</span>\n                    </div>\n\n                    <div class="serp-search-bar-wrap">\n                        <input type="text" id="serp-search-input" class="serp-search-input" value="${this.escapeHtml(query)}">\n                        <span class="serp-clear-btn" data-action="clear-search-input">\n                            <svg class="th-svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>\n                        </span>\n                        <div class="serp-divider"></div>\n                        <button class="serp-search-icon-btn" data-action="submit-serp-search">\n                            <svg class="th-svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>\n                        </button>\n                    </div>\n\n                    <div class="serp-user-profile-group">\n                        <div id="serp-header-avatar" class="serp-avatar-circle" data-action="open-passport" title="Pasaporte de Gensokyo: ${this.escapeHtml(this.passport.username)} (${this.escapeHtml(this.passport.userId)})">\n                            <img src="${this.escapeHtml(safeAvatar)}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" alt="${this.escapeHtml(this.passport.username)}">\n                        </div>\n                    </div>\n                </div>\n\n                <div class="search-stats-banner">\n                    Aproximadamente ${matchedWebs.length} resultados (${(Math.random() * .15 + .1).toFixed(2)} segundos)\n                </div>\n\n                ${this.renderWebResultsHTML(matchedWebs)}\n            </div>\n        `;
        this.bindSearchInteractions();
    },
    bindSearchInteractions() {
        const viewport = document.getElementById("th-viewport");
        if (!viewport) return;
        const serp = viewport.querySelector(".google-serp-container");
        if (!serp) return;
        const searchInput = serp.querySelector("#serp-search-input");
        if (searchInput) {
            searchInput.addEventListener("keydown", event => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    this.submitSerpSearch();
                }
            });
        }
        serp.addEventListener("click", event => {
            const target = event.target.closest("[data-action], [data-filter-tab], [data-domain], .search-web-title");
            if (!target) return;
            const action = target.dataset.action || "";
            if (action === "go-home") {
                this.navigate("gensokyo://home");
                return;
            }
            if (action === "clear-search-input") {
                const input = serp.querySelector("#serp-search-input");
                if (input) {
                    input.value = "";
                    input.focus();
                }
                return;
            }
            if (action === "submit-serp-search") {
                this.submitSerpSearch();
                return;
            }
            if (action === "open-passport") {
                this.showPassportModal();
                return;
            }
            if (action === "go-register") {
                const targetDomain = this.currentSearchQuery ? this.currentSearchQuery.toLowerCase().replace(/[^a-z0-9.-]/g, "") : "";
                this.navigate(targetDomain ? `gensokyo://register?domain=${encodeURIComponent(targetDomain)}` : "gensokyo://register");
                return;
            }
            const domain = target.dataset.domain;
            if (domain) {
                this.navigate(`gensokyo://${domain}`);
                return;
            }
            if (target.classList.contains("search-web-title")) {
                event.preventDefault();
            }
        });
    },
    setSearchFilterTab(filterTab) {
        this.renderSearchResults(this.currentSearchQuery || "", filterTab || "all");
    },
    renderWebResultsHTML(webResults) {
        if (webResults.length === 0) {
            return `\n                <div class="th-card" style="text-align: center; padding: 30px;">\n                    <h2 class="th-card-title">Sin resultados web</h2>\n                    <p style="margin-bottom: 16px;">No se encontraron páginas web registradas para tu búsqueda.</p>\n                    <button class="gx-btn-go" data-action="go-register">Reclamar Dominio Gratis</button>\n                </div>\n            `;
        }
        return `\n            <div class="search-results-list">\n                ${webResults.map(item => `\n                    <div class="search-web-card">\n                        <div class="search-web-domain">\n                            <svg class="th-svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>\n                            gensokyo://${this.escapeHtml(item.domain)}\n                        </div>\n                        <a class="search-web-title" href="#" data-domain="${this.escapeHtml(item.domain)}">\n                            ${this.escapeHtml(item.title)}\n                        </a>\n                        <div class="search-web-snippet">${this.escapeHtml(item.snippet)}</div>\n                    </div>\n                `).join("")}\n            </div>\n        `;
    },
    renderImageResultsHTML(imageResults) {
        if (imageResults.length === 0) {
            return '<div class="th-card" style="text-align:center;"><p>No se encontraron imágenes para esta búsqueda.</p></div>';
        }
        return `\n            <div class="search-images-grid">\n                ${imageResults.map(img => `\n                    <div class="search-image-card" data-domain="${this.escapeHtml(img.domain)}">\n                        <img src="${this.escapeHtml(img.url)}" class="search-image-thumb" alt="${this.escapeHtml(img.title)}">\n                        <div class="search-image-meta">\n                            <div class="search-image-title">${this.escapeHtml(img.title)}</div>\n                            <div class="search-image-sub">gensokyo://${this.escapeHtml(img.domain)} • ${this.escapeHtml(img.author)}</div>\n                        </div>\n                    </div>\n                `).join("")}\n            </div>\n        `;
    },
    renderVideoResultsHTML(videoResults) {
        if (videoResults.length === 0) {
            return '<div class="th-card" style="text-align:center;"><p>No se encontraron vídeos o PVs animadas para esta búsqueda.</p></div>';
        }
        return `\n            <div class="search-videos-list">\n                ${videoResults.map(vid => `\n                    <div class="search-video-card">\n                        <div class="search-video-preview">\n                            <iframe src="${this.escapeHtml(vid.embedUrl)}" style="width:100%; height:100%; border:none;" allowfullscreen></iframe>\n                            <span class="search-video-duration">${this.escapeHtml(vid.duration)}</span>\n                        </div>\n                        <div class="search-video-info">\n                            <div class="search-video-title">${this.escapeHtml(vid.title)}</div>\n                            <div class="search-video-author">Autor: ${this.escapeHtml(vid.author)}</div>\n                            <div class="search-video-desc">${this.escapeHtml(vid.description)}</div>\n                            <button class="gx-btn-go" data-domain="${this.escapeHtml(vid.domain)}">Ver en gensokyo://${this.escapeHtml(vid.domain)}</button>\n                        </div>\n                    </div>\n                `).join("")}\n            </div>\n        `;
    }
});