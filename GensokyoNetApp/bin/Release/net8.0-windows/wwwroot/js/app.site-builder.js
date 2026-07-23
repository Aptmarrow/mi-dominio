Object.assign(GensokyoApp, {
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
        if (!aliasInput || !titleInput || !suffixSelect) return;

        const cleanAlias = aliasInput.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
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
            suffix,
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
        this.navigate('gensokyo://builder');
    },

    getBuilderView() {
        const allUserDomains = Object.keys(this.userDomains);
        const domainOptions = allUserDomains.map((d) => `<option value="${d}">gensokyo://${d}</option>`).join('');

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
    }
});
