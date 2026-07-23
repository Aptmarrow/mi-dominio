/**
 * GensokyoNet Engine
 * Núcleo de estado y persistencia.
 * Los módulos de UI/rutas se cargan desde /js.
 */

const GensokyoApp = {
    tabs: [],
    activeTabId: null,
    nextTabId: 1,
    userDomains: {},
    accountsDB: {},
    currentTheme: 'scarlet',
    passport: {
        isLoggedIn: true,
        isRegistered: false,
        userId: 'ID#0000',
        username: 'Nameless Youkai',
        avatarUrl: 'assets/nameless_avatar.png',
        ownedDomains: [],
        oauthToken: 'gx_live_token_0000_nameless_youkai_key'
    },
    tempAvatarDataUrl: null,
    cropZoom: 1,

    init() {
        this.loadAccountsDB();
        this.loadPassportData();
        this.loadUserDomains();

        const urlInput = document.getElementById('th-url-input');
        if (urlInput) {
            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.submitUrl();
            });
        }

        this.createNewTab('gensokyo://home', 'Inicio');
        this.updateDomainCount();
        this.updatePassportUI();
    },

    loadAccountsDB() {
        const stored = localStorage.getItem('gensokyo_accounts_db');
        if (!stored) return;
        try {
            this.accountsDB = JSON.parse(stored);
        } catch (e) {
            console.error('Error al cargar Cuentas DB', e);
        }
    },

    saveAccountsDB() {
        localStorage.setItem('gensokyo_accounts_db', JSON.stringify(this.accountsDB));
    },

    loadPassportData() {
        const stored = localStorage.getItem('gensokyo_passport');
        if (!stored) {
            this.savePassportData();
            return;
        }
        try {
            this.passport = JSON.parse(stored);
        } catch (e) {
            console.error('Error al cargar Pasaporte', e);
        }
    },

    savePassportData() {
        localStorage.setItem('gensokyo_passport', JSON.stringify(this.passport));
        this.updatePassportUI();
    },

    loadUserDomains() {
        const stored = localStorage.getItem('gensokyo_user_domains');
        if (!stored) return;
        try {
            this.userDomains = JSON.parse(stored);
        } catch (e) {
            console.error('Error al cargar dominios', e);
        }
    },

    saveUserDomains() {
        localStorage.setItem('gensokyo_user_domains', JSON.stringify(this.userDomains));
        this.updateDomainCount();
    },

    updateDomainCount() {
        const total = Object.keys(GensokyoSeedData.domains).length + Object.keys(this.userDomains).length;
        const countEl = document.getElementById('th-domain-count');
        if (countEl) countEl.innerText = `Dominios Activos: ${total}`;
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

    showDonationModal() {
        document.getElementById('th-donation-modal')?.classList.remove('hidden');
    },

    hideDonationModal() {
        document.getElementById('th-donation-modal')?.classList.add('hidden');
    },

    escapeHtml(str) {
        return (str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
};

window.GensokyoApp = GensokyoApp;

document.addEventListener('DOMContentLoaded', () => {
    GensokyoApp.init();
});
