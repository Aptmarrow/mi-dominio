Object.assign(GensokyoApp, {
    updatePassportUI() {
        const serpAvatarEl = document.getElementById('serp-header-avatar');
        if (serpAvatarEl) {
            serpAvatarEl.innerHTML = `<img src="${this.passport.avatarUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" alt="${this.escapeHtml(this.passport.username)}">`;
        }

        const sideAvatarEl = document.getElementById('sidebar-passport-avatar');
        if (sideAvatarEl) {
            sideAvatarEl.innerHTML = `<img src="${this.passport.avatarUrl}" style="width:26px; height:26px; object-fit:cover; border-radius:50%;" alt="${this.escapeHtml(this.passport.username)}">`;
        }

        const modalAvatarEl = document.getElementById('passport-modal-avatar');
        if (modalAvatarEl) modalAvatarEl.src = this.passport.avatarUrl;

        const nameEl = document.getElementById('passport-display-name');
        if (nameEl) nameEl.innerText = this.passport.username.toUpperCase();

        const idEl = document.getElementById('passport-display-id');
        if (idEl) idEl.innerText = this.passport.userId;

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
            <button type="button" class="gx-btn-go" style="flex:1; background:var(--th-crimson); padding:10px; font-size:0.9rem; border-radius:6px; font-weight:700; text-transform:uppercase;" onclick="GensokyoApp.handleRegisterPrompt()">
                Registrarse
            </button>
            <button type="button" class="gx-btn-go" style="flex:1; background:var(--th-bg-main); border:1.5px solid var(--th-crimson); color:var(--th-crimson); padding:10px; font-size:0.9rem; border-radius:6px; font-weight:700;" onclick="GensokyoApp.handleLoginPrompt()">
                Iniciar Sesión
            </button>
        `;
    },

    showPassportModal() {
        const modal = document.getElementById('th-passport-modal');
        if (!modal) return;

        this.updatePassportUI();

        const domainListEl = document.getElementById('passport-domain-list');
        if (domainListEl) {
            const allOwned = [...this.passport.ownedDomains, ...Object.keys(this.userDomains)];
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
            this.passport.avatarUrl = croppedDataUrl;

            const accountKey = this.passport.username.toLowerCase();
            if (this.passport.isRegistered && this.accountsDB[accountKey]) {
                this.accountsDB[accountKey].avatarUrl = croppedDataUrl;
                this.saveAccountsDB();
            }

            this.savePassportData();
            this.hideAvatarCropModal();
            this.tempAvatarDataUrl = null;
            alert('¡Foto de perfil actualizada con éxito!');
        };

        img.src = this.tempAvatarDataUrl;
    },

    handleRegisterPrompt() {
        const username = prompt('Registro de Cuenta en GensokyoNet:\n\nIngresa tu Nombre de Usuario deseado:', 'Nameless Youkai');
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

        if (this.passport.userId === 'ID#0000') {
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
        const username = prompt('Iniciar Sesión en GensokyoNet:\n\nIngresa tu Nombre de Usuario:');
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
            avatarUrl: acc.avatarUrl || 'assets/nameless_avatar.png',
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
            userId: 'ID#0000',
            username: 'Nameless Youkai',
            email: 'nameless@gensokyo.net',
            avatarUrl: 'assets/nameless_avatar.png',
            ownedDomains: [],
            oauthToken: 'gx_live_token_0000_nameless_youkai_key'
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
    }
});
