Object.assign(GensokyoApp, {
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

        const allDomains = { ...GensokyoSeedData.domains, ...this.userDomains };
        const matchedWebs = [];

        Object.keys(allDomains).forEach((domainKey) => {
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

        const matchedImages = GensokyoSeedData.images.filter((img) => {
            if (!cleanQ) return true;
            return img.title.toLowerCase().includes(cleanQ) ||
                img.tags.some((t) => t.toLowerCase().includes(cleanQ)) ||
                img.domain.toLowerCase().includes(cleanQ);
        });

        const matchedVideos = GensokyoSeedData.videos.filter((vid) => {
            if (!cleanQ) return true;
            return vid.title.toLowerCase().includes(cleanQ) ||
                vid.description.toLowerCase().includes(cleanQ) ||
                vid.tags.some((t) => t.toLowerCase().includes(cleanQ));
        });

        let activeCount = matchedWebs.length;
        if (filterTab === 'images') activeCount = matchedImages.length;
        if (filterTab === 'videos') activeCount = matchedVideos.length;
        if (filterTab === 'news') activeCount = matchedWebs.filter((w) => w.domain.includes('news') || w.domain.includes('blog')).length;

        viewport.innerHTML = `
            <div class="google-serp-container">
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

                ${filterTab === 'all' ? this.renderWebResultsHTML(matchedWebs) : ''}
                ${filterTab === 'images' ? this.renderImageResultsHTML(matchedImages) : ''}
                ${filterTab === 'videos' ? this.renderVideoResultsHTML(matchedVideos) : ''}
                ${filterTab === 'news' ? this.renderWebResultsHTML(matchedWebs.filter((w) => w.domain.includes('news') || w.domain.includes('blog'))) : ''}
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
                ${webResults.map((item) => `
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
            return '<div class="th-card" style="text-align:center;"><p>No se encontraron imágenes para esta búsqueda.</p></div>';
        }

        return `
            <div class="search-images-grid">
                ${imageResults.map((img) => `
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
            return '<div class="th-card" style="text-align:center;"><p>No se encontraron vídeos o PVs animadas para esta búsqueda.</p></div>';
        }

        return `
            <div class="search-videos-list">
                ${videoResults.map((vid) => `
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
    }
});
