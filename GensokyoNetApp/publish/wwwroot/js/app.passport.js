Object.assign(GensokyoApp, {
    sanitizeAvatarUrl(url) {
        if (!url || typeof url !== "string") return "assets/nameless_avatar.png";
        const clean = url.trim();
        if (clean.startsWith("assets/") || clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("data:image/")) {
            return clean;
        }
        return "assets/nameless_avatar.png";
    },
    generateSecureOAuthToken(userId) {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        const hex = Array.from(array, b => b.toString(16).padStart(2, "0")).join("");
        const cleanId = (userId || "0000").replace(/[^a-zA-Z0-9]/g, "");
        return `gx_oauth_${cleanId}_${hex}`;
    },
    generateUniqueUserId() {
        const existingIds = new Set(Object.values(this.accountsDB || {}).map(acc => acc && acc.userId).filter(Boolean));
        for (let i = 0; i < 10; i++) {
            let suffix;
            if (crypto.randomUUID) {
                suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
            } else {
                const bytes = new Uint8Array(4);
                crypto.getRandomValues(bytes);
                suffix = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
            }
            const candidate = `ID#${suffix}`;
            if (!existingIds.has(candidate)) return candidate;
        }
        return `ID#${Date.now().toString(36).toUpperCase()}`;
    },
    updatePassportUI() {
        const safeAvatar = this.sanitizeAvatarUrl(this.passport.avatarUrl);
        const serpAvatarEl = document.getElementById("serp-header-avatar");
        if (serpAvatarEl) {
            serpAvatarEl.innerHTML = `<img src="${this.escapeHtml(safeAvatar)}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" alt="${this.escapeHtml(this.passport.username)}">`;
        }
        const sideAvatarEl = document.getElementById("sidebar-passport-avatar");
        if (sideAvatarEl) {
            sideAvatarEl.innerHTML = `<img src="${this.escapeHtml(safeAvatar)}" style="width:26px; height:26px; object-fit:cover; border-radius:50%;" alt="${this.escapeHtml(this.passport.username)}">`;
        }
        const modalAvatarEl = document.getElementById("passport-modal-avatar");
        if (modalAvatarEl) modalAvatarEl.src = safeAvatar;
        const nameEl = document.getElementById("passport-display-name");
        if (nameEl) nameEl.innerText = this.passport.username.toUpperCase();
        const idEl = document.getElementById("passport-display-id");
        if (idEl) idEl.innerText = this.passport.userId;
        const oauthCodeEl = document.getElementById("passport-oauth-code");
        if (oauthCodeEl) oauthCodeEl.innerText = this.passport.oauthToken;
        const statusBadgeEl = document.getElementById("passport-status-badge");
        if (statusBadgeEl) {
            if (this.passport.isRegistered) {
                statusBadgeEl.innerText = this.t ? this.t("passport_registered") : "Identidad Autenticada";
                statusBadgeEl.style.color = "#2e7d32";
            } else {
                statusBadgeEl.innerText = this.t ? this.t("passport_unregistered") : "Cuenta Sin Registrar";
                statusBadgeEl.style.color = "var(--th-crimson)";
            }
        }
        const domainListEl = document.getElementById("passport-domain-list");
        if (domainListEl) {
            const userDomainKeys = Object.keys(this.userDomains).filter(domKey => {
                const dom = this.userDomains[domKey];
                return dom && dom.ownerId === this.passport.userId;
            });
            const allOwned = [ ...this.passport.ownedDomains || [], ...userDomainKeys ];
            const uniqueOwned = [ ...new Set(allOwned) ];
            if (uniqueOwned.length === 0) {
                domainListEl.innerHTML = `<p style="font-size:0.85rem; color:var(--th-text-sub);">${this.escapeHtml(this.t ? this.t("passport_no_domains") : "No tienes dominios registrados aún.")}</p>`;
            } else {
                domainListEl.innerHTML = uniqueOwned.map(dom => `\n                    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--th-bg-main); padding:8px 12px; border-radius:6px; border:1px solid var(--th-border-warm); margin-bottom:6px;">\n                        <span style="font-family:var(--font-heading); font-weight:700; color:var(--th-crimson); font-size:0.88rem;">gensokyo://${this.escapeHtml(dom)}</span>\n                        <button class="gx-btn-go" style="padding:4px 10px; font-size:0.75rem;" onclick="GensokyoApp.hidePassportModal(); GensokyoApp.navigate('gensokyo://${this.escapeHtml(dom)}');">${this.escapeHtml(this.t ? this.t("nav_go") : "Visitar")}</button>\n                    </div>\n                `).join("");
            }
        }
        const btnContainer = document.getElementById("passport-session-buttons");
        if (!btnContainer) return;
        if (this.passport.isRegistered) {
            btnContainer.innerHTML = `\n                <button type="button" class="gx-btn-go" style="width:100%; background:var(--th-crimson); padding:10px; font-size:0.9rem; border-radius:6px;" onclick="GensokyoApp.handleLogout()">\n                    ${this.escapeHtml(this.t ? this.t("passport_logout_btn") : "Cerrar Sesión")}\n                </button>\n            `;
            return;
        }
        btnContainer.innerHTML = `\n            <button type="button" class="gx-btn-go" style="flex:1; background:var(--th-crimson); padding:10px; font-size:0.9rem; border-radius:6px; font-weight:700; text-transform:uppercase;" onclick="GensokyoApp.showRegisterModal()">\n                ${this.escapeHtml(this.t ? this.t("passport_register_btn") : "Registrarse")}\n            </button>\n            <button type="button" class="gx-btn-go" style="flex:1; background:var(--th-bg-main); border:1.5px solid var(--th-crimson); color:var(--th-crimson); padding:10px; font-size:0.9rem; border-radius:6px; font-weight:700;" onclick="GensokyoApp.showLoginModal()">\n                ${this.escapeHtml(this.t ? this.t("passport_login_btn") : "Iniciar Sesión")}\n            </button>\n        `;
    },
    showPassportModal() {
        const modal = document.getElementById("th-passport-modal");
        if (!modal) return;
        this.updatePassportUI();
        modal.classList.remove("hidden");
    },
    hidePassportModal() {
        document.getElementById("th-passport-modal")?.classList.add("hidden");
    },
    triggerAvatarUpload() {
        const input = document.getElementById("avatar-file-input");
        if (input) input.click();
    },
    handleAvatarFileSelected(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            this.showToastNotification("Por favor selecciona un archivo de imagen válido.", "error");
            return;
        }
        const reader = new FileReader;
        reader.onload = e => {
            this.tempAvatarDataUrl = e.target.result;
            this.cropZoom = 1;
            this.cropZoomMin = 1;
            this.cropZoomMax = 8;
            this.showAvatarCropModal();
        };
        reader.readAsDataURL(file);
        event.target.value = "";
    },
    showAvatarCropModal() {
        const modal = document.getElementById("th-avatar-crop-modal");
        const img = document.getElementById("avatar-crop-img");
        const zoomInput = document.getElementById("crop-zoom-range");
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
                zoomInput.step = "0.05";
                zoomInput.value = String(this.cropZoom);
            }
            this.updateCropZoom(this.cropZoom);
        };
        img.onerror = () => {
            this.showToastNotification("No se pudo cargar la imagen seleccionada.", "error");
            this.hideAvatarCropModal();
        };
        img.src = this.tempAvatarDataUrl;
        modal.classList.remove("hidden");
    },
    hideAvatarCropModal() {
        document.getElementById("th-avatar-crop-modal")?.classList.add("hidden");
    },
    updateCropZoom(val) {
        const nextZoom = Number(val);
        const minZoom = Number(this.cropZoomMin || 1);
        const maxZoom = Number(this.cropZoomMax || 8);
        const safeZoom = Number.isFinite(nextZoom) ? nextZoom : minZoom;
        this.cropZoom = Math.min(maxZoom, Math.max(minZoom, safeZoom));
        const img = document.getElementById("avatar-crop-img");
        if (img) img.style.transform = `scale(${this.cropZoom})`;
        const zoomInput = document.getElementById("crop-zoom-range");
        if (zoomInput && zoomInput.value !== String(this.cropZoom)) {
            zoomInput.value = String(this.cropZoom);
        }
    },
    saveCroppedAvatar() {
        if (!this.tempAvatarDataUrl) return;
        const img = new Image;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const size = 300;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
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
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
            const croppedDataUrl = canvas.toDataURL("image/png");
            this.passport.avatarUrl = this.sanitizeAvatarUrl(croppedDataUrl);
            const accountKey = this.passport.username.toLowerCase();
            if (this.passport.isRegistered && this.accountsDB[accountKey]) {
                this.accountsDB[accountKey].avatarUrl = this.passport.avatarUrl;
                this.saveAccountsDB();
            }
            if (this.passport.isRegistered && this.remoteRegistry && this.remoteRegistry.supabaseUrl) {
                const base = this.remoteRegistry.supabaseUrl.replace(/\/$/, "");
                fetch(`${base}/rest/v1/rpc/update_gensokyo_avatar`, {
                    method: "POST",
                    headers: this.getSupabaseHeaders(),
                    body: JSON.stringify({
                        p_user_id: this.passport.userId,
                        p_avatar_url: this.passport.avatarUrl
                    })
                }).catch(() => {});
            }
            this.savePassportData();
            this.hideAvatarCropModal();
            this.tempAvatarDataUrl = null;
            this.onSessionChanged();
            this.showToastNotification("¡Foto de perfil actualizada con éxito!", "success");
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
        const closedSvg = btnEl.querySelector(".yukari-eye-svg.closed");
        const openSvg = btnEl.querySelector(".yukari-eye-svg.open");
        if (input.type === "password") {
            input.type = "text";
            if (closedSvg) closedSvg.classList.add("hidden");
            if (openSvg) openSvg.classList.remove("hidden");
        } else {
            input.type = "password";
            if (openSvg) openSvg.classList.add("hidden");
            if (closedSvg) closedSvg.classList.remove("hidden");
        }
    },
    showRegisterModal() {
        if (window.chrome && window.chrome.webview) {
            window.chrome.webview.postMessage({
                action: "openModal",
                modalType: "register"
            });
            return;
        }
        const modal = document.getElementById("th-register-modal");
        const userIn = document.getElementById("reg-username-input");
        const passIn = document.getElementById("reg-password-input");
        const confirmPassIn = document.getElementById("reg-confirm-password-input");
        const errBanner = document.getElementById("register-error-banner");
        if (!modal) return;
        if (userIn) userIn.value = "";
        if (passIn) passIn.value = "";
        if (confirmPassIn) confirmPassIn.value = "";
        modal.querySelectorAll(".th-input-password-wrapper input").forEach(input => input.type = "password");
        modal.querySelectorAll(".yukari-eye-btn").forEach(btn => {
            btn.querySelector(".yukari-eye-svg.closed")?.classList.remove("hidden");
            btn.querySelector(".yukari-eye-svg.open")?.classList.add("hidden");
        });
        if (errBanner) {
            errBanner.innerText = "";
            errBanner.classList.remove("visible");
        }
        modal.classList.remove("hidden");
        if (userIn) setTimeout(() => userIn.focus(), 100);
    },
    hideRegisterModal() {
        document.getElementById("th-register-modal")?.classList.add("hidden");
    },
    handleRegisterPrompt() {
        this.showRegisterModal();
    },
    async submitRegisterFromNative(payload) {
        const cleanName = String(payload?.username || "").trim();
        const password = String(payload?.password || "").trim();
        const confirmPassword = String(payload?.confirmPassword || "").trim();
        const key = cleanName.toLowerCase();
        if (!cleanName) {
            return {
                ok: false,
                message: "Por favor ingresa un nombre de usuario válido."
            };
        }
        if (password.length < 8) {
            return {
                ok: false,
                message: "Error: La contraseña debe tener como mínimo 8 caracteres."
            };
        }
        if (password !== confirmPassword) {
            return {
                ok: false,
                message: "Error: Las contraseñas no coinciden. Por favor verifica ambos campos."
            };
        }
        if (this.passport.userId === "ID#0000") {
            this.passport.userId = this.generateUniqueUserId();
        }
        const passwordHash = await this.hashPassword(password);
        const secureToken = this.generateSecureOAuthToken(this.passport.userId);
        const safeAvatar = this.sanitizeAvatarUrl(this.passport.avatarUrl);
        if (this.remoteRegistry && this.remoteRegistry.supabaseUrl) {
            try {
                const base = this.remoteRegistry.supabaseUrl.replace(/\/$/, "");
                const controller = new AbortController;
                const timeoutId = setTimeout(() => controller.abort(), 6e3);
                const resp = await fetch(`${base}/rest/v1/rpc/register_gensokyo_user`, {
                    method: "POST",
                    headers: this.getSupabaseHeaders(),
                    signal: controller.signal,
                    body: JSON.stringify({
                        p_username: cleanName,
                        p_user_id: this.passport.userId,
                        p_password_hash: passwordHash,
                        p_avatar_url: safeAvatar
                    })
                });
                clearTimeout(timeoutId);
                if (resp.ok) {
                    const data = await resp.json();
                    if (data && data.ok === false) {
                        return {
                            ok: false,
                            message: data.message || `El usuario "${cleanName}" ya está registrado.`
                        };
                    }
                } else if (resp.status === 400 || resp.status === 409) {
                    const err = await resp.json().catch(() => ({}));
                    return {
                        ok: false,
                        message: err.message || `El usuario "${cleanName}" ya está registrado.`
                    };
                }
            } catch (netErr) {
                console.warn("Registro en la nube no disponible o timeout; procediendo con registro local:", netErr);
            }
        }
        if (this.accountsDB[key]) {
            return {
                ok: false,
                message: `El usuario "${cleanName}" ya está registrado localmente.`
            };
        }
        this.passport.username = cleanName;
        this.passport.isRegistered = true;
        this.passport.ownedDomains = [];
        this.passport.oauthToken = secureToken;
        this.accountsDB[key] = {
            username: cleanName,
            userId: this.passport.userId,
            passwordHash: passwordHash,
            avatarUrl: safeAvatar,
            ownedDomains: this.passport.ownedDomains,
            preferences: { ...this.preferences },
            createdAt: (new Date).toISOString()
        };
        this.saveAccountsDB();
        this.savePassportData();
        this.syncPreferencesToCloud();
        this.onSessionChanged();
        this.showToastNotification(`¡Cuenta de ${cleanName} (${this.passport.userId}) creada exitosamente!`, "success");
        return {
            ok: true,
            message: `Cuenta creada: ${cleanName}`
        };
    },
    async submitRegisterForm() {
        const userIn = document.getElementById("reg-username-input");
        const passIn = document.getElementById("reg-password-input");
        const confirmPassIn = document.getElementById("reg-confirm-password-input");
        const errBanner = document.getElementById("register-error-banner");
        const result = await this.submitRegisterFromNative({
            username: userIn ? userIn.value : "",
            password: passIn ? passIn.value : "",
            confirmPassword: confirmPassIn ? confirmPassIn.value : ""
        });
        if (!result.ok) {
            if (errBanner) {
                errBanner.innerText = result.message;
                errBanner.classList.add("visible");
            }
            return;
        }
        this.hideRegisterModal();
    },
    showLoginModal() {
        if (window.chrome && window.chrome.webview) {
            window.chrome.webview.postMessage({
                action: "openModal",
                modalType: "login"
            });
            return;
        }
        const modal = document.getElementById("th-login-modal");
        const userIn = document.getElementById("login-username-input");
        const passIn = document.getElementById("login-password-input");
        const errBanner = document.getElementById("login-error-banner");
        if (!modal) return;
        if (userIn) userIn.value = "";
        if (passIn) passIn.value = "";
        if (errBanner) {
            errBanner.innerText = "";
            errBanner.classList.remove("visible");
        }
        modal.classList.remove("hidden");
        if (userIn) setTimeout(() => userIn.focus(), 100);
    },
    hideLoginModal() {
        document.getElementById("th-login-modal")?.classList.add("hidden");
    },
    handleLoginPrompt() {
        this.showLoginModal();
    },
    async submitLoginFromNative(payload) {
        const cleanName = String(payload?.username || "").trim();
        const password = String(payload?.password || "").trim();
        const key = cleanName.toLowerCase();
        if (!cleanName || !password) {
            return {
                ok: false,
                message: "Por favor ingresa usuario y contraseña."
            };
        }
        const passwordHash = await this.hashPassword(password);
        if (this.remoteRegistry && this.remoteRegistry.supabaseUrl) {
            try {
                const base = this.remoteRegistry.supabaseUrl.replace(/\/$/, "");
                const controller = new AbortController;
                const timeoutId = setTimeout(() => controller.abort(), 6e3);
                const resp = await fetch(`${base}/rest/v1/rpc/login_gensokyo_user`, {
                    method: "POST",
                    headers: this.getSupabaseHeaders(),
                    signal: controller.signal,
                    body: JSON.stringify({
                        p_username: cleanName,
                        p_password_hash: passwordHash
                    })
                });
                clearTimeout(timeoutId);
                if (resp.ok) {
                    const data = await resp.json();
                    if (data && data.ok === false) {
                        return {
                            ok: false,
                            message: data.message || "Credenciales incorrectas."
                        };
                    }
                    if (data && data.ok) {
                        const cloudUserId = data.userId || this.passport.userId;
                        const secureToken = this.generateSecureOAuthToken(cloudUserId);
                        const cloudDomains = Array.isArray(data.ownedDomains) ? data.ownedDomains : [];
                        this.passport = {
                            isLoggedIn: true,
                            isRegistered: true,
                            userId: cloudUserId,
                            username: data.username || cleanName,
                            avatarUrl: this.sanitizeAvatarUrl(data.avatarUrl || this.passport.avatarUrl),
                            ownedDomains: cloudDomains,
                            oauthToken: secureToken
                        };
                        this.accountsDB[key] = {
                            username: data.username || cleanName,
                            userId: cloudUserId,
                            passwordHash: passwordHash,
                            avatarUrl: this.passport.avatarUrl,
                            ownedDomains: cloudDomains,
                            preferences: { ...this.preferences },
                            updatedAt: (new Date).toISOString()
                        };
                        this.saveAccountsDB();
                        this.savePassportData();
                        if (data.preferences && typeof data.preferences === "object") {
                            this.preferences = {
                                theme: ["scarlet", "hakugyokurou"].includes(data.preferences.theme) ? data.preferences.theme : this.preferences.theme,
                                language: ["es", "en", "pt"].includes(data.preferences.language) ? data.preferences.language : this.preferences.language,
                                hakureiPolicy: ["ask", "auto", "block"].includes(data.preferences.hakureiPolicy) ? data.preferences.hakureiPolicy : this.preferences.hakureiPolicy
                            };
                            this.savePreferences(false);
                            this.applyTheme(this.preferences.theme, false);
                            this.setLanguage(this.preferences.language, false);
                            this.syncHakureiPolicyUI();
                        } else {
                            this.fetchCloudPreferences(cloudUserId);
                        }
                        this.onSessionChanged();
                        this.showToastNotification(`¡Bienvenido de vuelta, ${this.passport.username}!`, "success");
                        return {
                            ok: true,
                            message: `Bienvenido ${this.passport.username}`
                        };
                    }
                }
            } catch (cloudErr) {
                console.warn("Autenticación en la nube no disponible o timeout; usando fallback local:", cloudErr);
            }
        }
        if (!this.accountsDB[key]) {
            return {
                ok: false,
                message: `El usuario "${cleanName}" no está registrado. Crea una cuenta primero.`
            };
        }
        const acc = this.accountsDB[key];
        const expectedHash = acc.passwordHash || (acc.password ? await this.hashPassword(acc.password) : "");
        if (expectedHash !== passwordHash) {
            return {
                ok: false,
                message: "Contraseña incorrecta. Inténtalo nuevamente."
            };
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
        if (acc.preferences && typeof acc.preferences === "object") {
            this.preferences = {
                theme: ["scarlet", "hakugyokurou"].includes(acc.preferences.theme) ? acc.preferences.theme : this.preferences.theme,
                language: ["es", "en", "pt"].includes(acc.preferences.language) ? acc.preferences.language : this.preferences.language,
                hakureiPolicy: ["ask", "auto", "block"].includes(acc.preferences.hakureiPolicy) ? acc.preferences.hakureiPolicy : this.preferences.hakureiPolicy
            };
            this.savePreferences(false);
            this.applyTheme(this.preferences.theme, false);
            this.setLanguage(this.preferences.language, false);
            this.syncHakureiPolicyUI();
        }
        this.savePassportData();
        this.onSessionChanged();
        this.showToastNotification(`¡Bienvenido de vuelta, ${acc.username}!`, "success");
        return {
            ok: true,
            message: `Bienvenido ${acc.username}`
        };
    },
    async fetchCloudPreferences(userId) {
        if (!userId || !this.remoteRegistry || !this.remoteRegistry.supabaseUrl) return;
        try {
            const base = this.remoteRegistry.supabaseUrl.replace(/\/$/, "");
            const resp = await fetch(`${base}/rest/v1/gensokyo_users?user_id=eq.${encodeURIComponent(userId)}&select=preferences&limit=1`, {
                headers: this.getSupabaseHeaders()
            });
            if (resp.ok) {
                const rows = await resp.json();
                if (Array.isArray(rows) && rows.length > 0 && rows[0].preferences && typeof rows[0].preferences === "object") {
                    const p = rows[0].preferences;
                    this.preferences = {
                        theme: ["scarlet", "hakugyokurou"].includes(p.theme) ? p.theme : this.preferences.theme,
                        language: ["es", "en", "pt"].includes(p.language) ? p.language : this.preferences.language,
                        hakureiPolicy: ["ask", "auto", "block"].includes(p.hakureiPolicy) ? p.hakureiPolicy : this.preferences.hakureiPolicy
                    };
                    this.savePreferences(false);
                    this.applyTheme(this.preferences.theme, false);
                    this.setLanguage(this.preferences.language, false);
                    this.syncHakureiPolicyUI();
                    return;
                }
            }
            this.syncPreferencesToCloud();
        } catch (e) {}
    },
    async submitLoginForm() {
        const userIn = document.getElementById("login-username-input");
        const passIn = document.getElementById("login-password-input");
        const errBanner = document.getElementById("login-error-banner");
        const result = await this.submitLoginFromNative({
            username: userIn ? userIn.value : "",
            password: passIn ? passIn.value : ""
        });
        if (!result.ok) {
            if (errBanner) {
                errBanner.innerText = result.message;
                errBanner.classList.add("visible");
            }
            return;
        }
        this.hideLoginModal();
    },
    handleLogout() {
        const anonymousToken = this.generateSecureOAuthToken("ID#0000");
        this.passport = {
            isLoggedIn: true,
            isRegistered: false,
            userId: "ID#0000",
            username: "Nameless Youkai",
            avatarUrl: "assets/nameless_avatar.png",
            ownedDomains: [],
            oauthToken: anonymousToken
        };
        this.savePassportData();
        this.onSessionChanged();
        this.showToastNotification("Has cerrado sesión. Ahora eres Nameless Youkai.", "info");
    },
    copyOAuthToken() {
        navigator.clipboard.writeText(this.passport.oauthToken).then(() => {
            this.showToastNotification("¡Token OAuth copiado al portapapeles!", "success");
        }).catch(() => {
            this.showToastNotification(`Token OAuth: ${this.passport.oauthToken}`, "info");
        });
    },
    showToastNotification(message, type = "info") {
        const container = document.getElementById("th-toast-container");
        if (!container) return;
        const toast = document.createElement("div");
        toast.className = `th-toast ${type}`;
        let iconHtml = "•";
        if (type === "success") iconHtml = "✓";
        if (type === "error") iconHtml = "✕";
        toast.innerHTML = `\n            <span class="toast-icon" style="font-weight:bold; font-size:1.1rem;">${iconHtml}</span>\n            <span>${this.escapeHtml(message)}</span>\n        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(20px)";
            toast.style.transition = "all 0.3s ease";
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
});