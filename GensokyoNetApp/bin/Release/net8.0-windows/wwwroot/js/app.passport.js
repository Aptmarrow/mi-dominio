Object.assign(GensokyoApp, {
    sanitizeAvatarUrl(url) {
        if (!url || typeof url !== 'string') return 'assets/nameless_avatar.png';
        const clean = url.trim();
        if (clean.startsWith('assets/') || clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:image/')) {
            return clean;
        }
        return 'assets/nameless_avatar.png';
    },

    generateSecureOAuthToken(userId) {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        const hex = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
        const cleanId = (userId || '0000').replace(/[^a-zA-Z0-9]/g, '');
        return `gx_oauth_${cleanId}_${hex}`;
    },

    generateUniqueUserId() {
        const existingIds = new Set(
            Object.values(this.accountsDB || {})
                .map((acc) => acc && acc.userId)
                .filter(Boolean)
        );

        // Reintenta varias veces con alta entropía para evitar colisiones.
        for (let i = 0; i < 10; i++) {
            let suffix;
            if (crypto.randomUUID) {
                suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
            } else {
                const bytes = new Uint8Array(4);
                crypto.getRandomValues(bytes);
                suffix = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
            }

            const candidate = `ID#${suffix}`;
            if (!existingIds.has(candidate)) return candidate;
        }

        // Fallback extremo con timestamp para garantizar avance.
        return `ID#${Date.now().toString(36).toUpperCase()}`;
    },

    updatePassportUI() {
        const safeAvatar = this.sanitizeAvatarUrl(this.passport.avatarUrl);

        const serpAvatarEl = document.getElementById('serp-header-avatar');
        if (serpAvatarEl) {
            serpAvatarEl.innerHTML = `<img src="${this.escapeHtml(safeAvatar)}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" alt="${this.escapeHtml(this.passport.username)}">`;
        }

        const sideAvatarEl = document.getElementById('sidebar-passport-avatar');
        if (sideAvatarEl) {
            sideAvatarEl.innerHTML = `<img src="${this.escapeHtml(safeAvatar)}" style="width:26px; height:26px; object-fit:cover; border-radius:50%;" alt="${this.escapeHtml(this.passport.username)}">`;
        }

        const modalAvatarEl = document.getElementById('passport-modal-avatar');
        if (modalAvatarEl) modalAvatarEl.src = safeAvatar;

        const nameEl = document.getElementById('passport-display-name');
        if (nameEl) nameEl.innerText = this.passport.username.toUpperCase();

        const idEl = document.getElementById('passport-display-id');
        if (idEl) idEl.innerText = this.passport.userId;

        const oauthCodeEl = document.getElementById('passport-oauth-code');
        if (oauthCodeEl) oauthCodeEl.innerText = this.passport.oauthToken;

        const statusBadgeEl = document.getElementById('passport-status-badge');
        if (statusBadgeEl) {
            if (this.passport.isRegistered) {
                statusBadgeEl.innerText = 'Cuenta Protegida';
                statusBadgeEl.style.color = '#2e7d32';
            } else {
                statusBadgeEl.innerText = 'Cuenta Sin Registrar';
                statusBadgeEl.style.color = 'var(--th-crimson)';
            }
        }

        // AUTORIZACIÓN ESTRICTA ÚNICAMENTE POR ownerId (IDENTIDAD FUERTE)
        const domainListEl = document.getElementById('passport-domain-list');
        if (domainListEl) {
            const userDomainKeys = Object.keys(this.userDomains).filter((domKey) => {
                const dom = this.userDomains[domKey];
                return dom && dom.ownerId === this.passport.userId;
            });
            const allOwned = [...(this.passport.ownedDomains || []), ...userDomainKeys];
            const uniqueOwned = [...new Set(allOwned)];

            if (uniqueOwned.length === 0) {
                domainListEl.innerHTML = '<p style="font-size:0.85rem; color:var(--th-text-sub);">Aún no posees dominios. Registra uno gratis en gensokyo://register</p>';
            } else {
                domainListEl.innerHTML = uniqueOwned.map((dom) => `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--th-bg-main); padding:8px 12px; border-radius:6px; border:1px solid var(--th-border-warm); margin-bottom:6px;">
                        <span style="font-family:var(--font-heading); font-weight:700; color:var(--th-crimson); font-size:0.88rem;">gensokyo://${this.escapeHtml(dom)}</span>
                        <button class="gx-btn-go" style="padding:4px 10px; font-size:0.75rem;" onclick="GensokyoApp.hidePassportModal(); GensokyoApp.navigate('gensokyo://${this.escapeHtml(dom)}');">Visitar</button>
                    </div>
                `).join('');
            }
        }

        const btnContainer = document.getElementById('passport-session-buttons');
        if (!btnContainer) return;

        if (this.passport.isRegistered) {
            btnContainer.innerHTML = `
                <button type="button" class="gx-btn-go" style="width:100%; background:var(--th-crimson); padding:10px; font-size:0.9rem; border-radius:6px;" onclick="GensokyoApp.handleLogout()">
                    Log Out (Cerrar Sesión)
                </button>
            `;
            return;
        }

        btnContainer.innerHTML = `
            <button type="button" class="gx-btn-go" style="flex:1; background:var(--th-crimson); padding:10px; font-size:0.9rem; border-radius:6px; font-weight:700; text-transform:uppercase;" onclick="GensokyoApp.showRegisterModal()">
                Registrarse
            </button>
            <button type="button" class="gx-btn-go" style="flex:1; background:var(--th-bg-main); border:1.5px solid var(--th-crimson); color:var(--th-crimson); padding:10px; font-size:0.9rem; border-radius:6px; font-weight:700;" onclick="GensokyoApp.showLoginModal()">
                Iniciar Sesión
            </button>
        `;
    },

    showPassportModal() {
        const modal = document.getElementById('th-passport-modal');
        if (!modal) return;

        this.updatePassportUI();
        modal.classList.remove('hidden');
    },

    hidePassportModal() {
        document.getElementById('th-passport-modal')?.classList.add('hidden');
    },

    triggerAvatarUpload() {
        const input = document.getElementById('avatar-file-input');
        if (input) input.click();
    },

    handleAvatarFileSelected(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showToastNotification('Por favor selecciona un archivo de imagen válido.', 'error');
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
            this.showToastNotification('No se pudo cargar la imagen seleccionada.', 'error');
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
        if (img) img.style.transform = `scale(${this.cropZoom})`;

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
            this.passport.avatarUrl = this.sanitizeAvatarUrl(croppedDataUrl);

            const accountKey = this.passport.username.toLowerCase();
            if (this.passport.isRegistered && this.accountsDB[accountKey]) {
                this.accountsDB[accountKey].avatarUrl = this.passport.avatarUrl;
                this.saveAccountsDB();
            }

            this.savePassportData();
            this.hideAvatarCropModal();
            this.tempAvatarDataUrl = null;
            this.onSessionChanged();
            this.showToastNotification('¡Foto de perfil actualizada con éxito!', 'success');
        };

        img.src = this.tempAvatarDataUrl;
    },

    onSessionChanged() {
        this.updatePassportUI();

        const activeTab = this.getActiveTab ? this.getActiveTab() : null;
        if (activeTab) {
            this.renderRoute(activeTab.url);
        }
    },

    togglePasswordVisibility(inputId, btnEl) {
        const input = document.getElementById(inputId);
        if (!input) return;

        const closedSvg = btnEl.querySelector('.yukari-eye-svg.closed');
        const openSvg = btnEl.querySelector('.yukari-eye-svg.open');

        if (input.type === 'password') {
            input.type = 'text';
            if (closedSvg) closedSvg.classList.add('hidden');
            if (openSvg) openSvg.classList.remove('hidden');
        } else {
            input.type = 'password';
            if (openSvg) openSvg.classList.add('hidden');
            if (closedSvg) closedSvg.classList.remove('hidden');
        }
    },

    showRegisterModal() {
        if (window.chrome && window.chrome.webview) {
            window.chrome.webview.postMessage({ action: 'openModal', modalType: 'register' });
            return;
        }

        const modal = document.getElementById('th-register-modal');
        const userIn = document.getElementById('reg-username-input');
        const passIn = document.getElementById('reg-password-input');
        const confirmPassIn = document.getElementById('reg-confirm-password-input');
        const errBanner = document.getElementById('register-error-banner');

        if (!modal) return;

        if (userIn) userIn.value = '';
        if (passIn) passIn.value = '';
        if (confirmPassIn) confirmPassIn.value = '';

        modal.querySelectorAll('.th-input-password-wrapper input').forEach(input => input.type = 'password');
        modal.querySelectorAll('.yukari-eye-btn').forEach(btn => {
            btn.querySelector('.yukari-eye-svg.closed')?.classList.remove('hidden');
            btn.querySelector('.yukari-eye-svg.open')?.classList.add('hidden');
        });

        if (errBanner) {
            errBanner.innerText = '';
            errBanner.classList.remove('visible');
        }

        modal.classList.remove('hidden');
        if (userIn) setTimeout(() => userIn.focus(), 100);
    },

    hideRegisterModal() {
        document.getElementById('th-register-modal')?.classList.add('hidden');
    },

    handleRegisterPrompt() {
        this.showRegisterModal();
    },

    async submitRegisterFromNative(payload) {
        const cleanName = String(payload?.username || '').trim();
        const password = String(payload?.password || '').trim();
        const confirmPassword = String(payload?.confirmPassword || '').trim();
        const key = cleanName.toLowerCase();

        if (!cleanName) {
            return { ok: false, message: 'Por favor ingresa un nombre de usuario válido.' };
        }

        if (this.accountsDB[key]) {
            return { ok: false, message: `El usuario "${cleanName}" ya está registrado. Por favor inicia sesión o elige otro nombre.` };
        }

        if (password.length < 8) {
            return { ok: false, message: 'Error: La contraseña debe tener como mínimo 8 caracteres.' };
        }

        if (password !== confirmPassword) {
            return { ok: false, message: 'Error: Las contraseñas no coinciden. Por favor verifica ambos campos.' };
        }

        if (this.passport.userId === 'ID#0000') {
            this.passport.userId = this.generateUniqueUserId();
        }

        const passwordHash = await this.hashPassword(password);
        const secureToken = this.generateSecureOAuthToken(this.passport.userId);

        this.passport.username = cleanName;
        this.passport.isRegistered = true;
        this.passport.ownedDomains = [];
        this.passport.oauthToken = secureToken;

        this.accountsDB[key] = {
            username: cleanName,
            userId: this.passport.userId,
            passwordHash: passwordHash,
            avatarUrl: this.sanitizeAvatarUrl(this.passport.avatarUrl),
            ownedDomains: this.passport.ownedDomains,
            createdAt: new Date().toISOString()
        };

        this.saveAccountsDB();
        this.savePassportData();
        this.onSessionChanged();
        this.showToastNotification(`¡Cuenta de ${cleanName} (${this.passport.userId}) creada exitosamente!`, 'success');

        return { ok: true, message: `Cuenta creada: ${cleanName}` };
    },

    async submitRegisterForm() {
        const userIn = document.getElementById('reg-username-input');
        const passIn = document.getElementById('reg-password-input');
        const confirmPassIn = document.getElementById('reg-confirm-password-input');
        const errBanner = document.getElementById('register-error-banner');

        const result = await this.submitRegisterFromNative({
            username: userIn ? userIn.value : '',
            password: passIn ? passIn.value : '',
            confirmPassword: confirmPassIn ? confirmPassIn.value : ''
        });

        if (!result.ok) {
            if (errBanner) {
                errBanner.innerText = result.message;
                errBanner.classList.add('visible');
            }
            return;
        }

        this.hideRegisterModal();
    },

    showLoginModal() {
        if (window.chrome && window.chrome.webview) {
            window.chrome.webview.postMessage({ action: 'openModal', modalType: 'login' });
            return;
        }

        const modal = document.getElementById('th-login-modal');
        const userIn = document.getElementById('login-username-input');
        const passIn = document.getElementById('login-password-input');
        const errBanner = document.getElementById('login-error-banner');

        if (!modal) return;

        if (userIn) userIn.value = '';
        if (passIn) passIn.value = '';
        if (errBanner) {
            errBanner.innerText = '';
            errBanner.classList.remove('visible');
        }

        modal.classList.remove('hidden');
        if (userIn) setTimeout(() => userIn.focus(), 100);
    },

    hideLoginModal() {
        document.getElementById('th-login-modal')?.classList.add('hidden');
    },

    handleLoginPrompt() {
        this.showLoginModal();
    },

    async submitLoginFromNative(payload) {
        const cleanName = String(payload?.username || '').trim();
        const password = String(payload?.password || '').trim();
        const key = cleanName.toLowerCase();

        if (!cleanName || !this.accountsDB[key]) {
            return { ok: false, message: `El usuario "${cleanName}" no está registrado. Crea una cuenta primero.` };
        }

        const passwordHash = await this.hashPassword(password);
        const acc = this.accountsDB[key];
        const expectedHash = acc.passwordHash || (acc.password ? await this.hashPassword(acc.password) : '');

        if (expectedHash !== passwordHash) {
            return { ok: false, message: 'Contraseña incorrecta. Inténtalo nuevamente.' };
        }

        if (!acc.passwordHash) {
            acc.passwordHash = passwordHash;
            delete acc.password;
            this.saveAccountsDB();
        }

        const secureToken = this.generateSecureOAuthToken(acc.userId);
        this.passport = {
            isLoggedIn: true,
            isRegistered: true,
            userId: acc.userId,
            username: acc.username,
            avatarUrl: this.sanitizeAvatarUrl(acc.avatarUrl),
            ownedDomains: acc.ownedDomains || [],
            oauthToken: secureToken
        };

        this.savePassportData();
        this.onSessionChanged();
        this.showToastNotification(`¡Bienvenido de vuelta, ${acc.username}!`, 'success');

        return { ok: true, message: `Bienvenido ${acc.username}` };
    },

    async submitLoginForm() {
        const userIn = document.getElementById('login-username-input');
        const passIn = document.getElementById('login-password-input');
        const errBanner = document.getElementById('login-error-banner');

        const result = await this.submitLoginFromNative({
            username: userIn ? userIn.value : '',
            password: passIn ? passIn.value : ''
        });

        if (!result.ok) {
            if (errBanner) {
                errBanner.innerText = result.message;
                errBanner.classList.add('visible');
            }
            return;
        }

        this.hideLoginModal();
    },

    handleLogout() {
        const anonymousToken = this.generateSecureOAuthToken('ID#0000');
        this.passport = {
            isLoggedIn: true,
            isRegistered: false,
            userId: 'ID#0000',
            username: 'Nameless Youkai',
            avatarUrl: 'assets/nameless_avatar.png',
            ownedDomains: [],
            oauthToken: anonymousToken
        };
        this.savePassportData();
        this.onSessionChanged();
        this.showToastNotification('Has cerrado sesión. Ahora eres Nameless Youkai.', 'info');
    },

    copyOAuthToken() {
        navigator.clipboard.writeText(this.passport.oauthToken).then(() => {
            this.showToastNotification('¡Token OAuth copiado al portapapeles!', 'success');
        }).catch(() => {
            this.showToastNotification(`Token OAuth: ${this.passport.oauthToken}`, 'info');
        });
    },

    showToastNotification(message, type = 'info') {
        const container = document.getElementById('th-toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `th-toast ${type}`;

        let iconHtml = '⛩️';
        if (type === 'success') iconHtml = '✓';
        if (type === 'error') iconHtml = '✕';

        toast.innerHTML = `
            <span class="toast-icon" style="font-weight:bold; font-size:1.1rem;">${iconHtml}</span>
            <span>${this.escapeHtml(message)}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
});
