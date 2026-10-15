/**
 * ==========================================================================
 * js/app.storage.js
 * Motor de Persistencia IndexedDB + Sincronización con Bucket Remoto
 * Reemplaza el límite de 5MB de localStorage manteniendo compatibilidad total
 * con GensokyoApp.userDomains y GensokyoApp.saveUserDomains().
 * ==========================================================================
 */
(function () {
    const DB_NAME = 'GensokyoNetStorageDB';
    const DB_VERSION = 1;
    const STORE_DOMAINS = 'user_domains';
    const STORE_CDN_CACHE = 'bucket_cdn_cache';

    const GensokyoStorage = {
        db: null,

        openDB() {
            if (this.db) return Promise.resolve(this.db);
            return new Promise((resolve, reject) => {
                const req = indexedDB.open(DB_NAME, DB_VERSION);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_DOMAINS)) {
                        db.createObjectStore(STORE_DOMAINS, { keyPath: 'domain' });
                    }
                    if (!db.objectStoreNames.contains(STORE_CDN_CACHE)) {
                        db.createObjectStore(STORE_CDN_CACHE, { keyPath: 'cacheKey' });
                    }
                };
                req.onsuccess = (e) => {
                    this.db = e.target.result;
                    resolve(this.db);
                };
                req.onerror = (e) => reject(e.target.error);
            });
        },

        async getAllDomainsMap() {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_DOMAINS, 'readonly');
                const store = tx.objectStore(STORE_DOMAINS);
                const req = store.getAll();
                req.onsuccess = () => {
                    const map = {};
                    (req.result || []).forEach((record) => {
                        if (record && record.domain) {
                            map[record.domain] = record.data;
                        }
                    });
                    resolve(map);
                };
                req.onerror = () => reject(req.error);
            });
        },

        async saveDomainsMap(domainsMap) {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_DOMAINS, 'readwrite');
                const store = tx.objectStore(STORE_DOMAINS);

                store.clear();
                Object.entries(domainsMap || {}).forEach(([domain, data]) => {
                    store.put({
                        domain: domain.toLowerCase(),
                        updatedAt: Date.now(),
                        data
                    });
                });

                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            });
        },

        async getCachedBucketHtml(domain, version) {
            try {
                const db = await this.openDB();
                const cacheKey = `${domain.toLowerCase()}@${version}`;
                return await new Promise((resolve) => {
                    const tx = db.transaction(STORE_CDN_CACHE, 'readonly');
                    const req = tx.objectStore(STORE_CDN_CACHE).get(cacheKey);
                    req.onsuccess = () => resolve(req.result ? req.result.htmlContent : null);
                    req.onerror = () => resolve(null);
                });
            } catch {
                return null;
            }
        },

        async setCachedBucketHtml(domain, version, htmlContent) {
            try {
                const db = await this.openDB();
                const cacheKey = `${domain.toLowerCase()}@${version}`;
                const tx = db.transaction(STORE_CDN_CACHE, 'readwrite');
                tx.objectStore(STORE_CDN_CACHE).put({
                    cacheKey,
                    htmlContent,
                    cachedAt: Date.now()
                });
            } catch (e) {
                console.warn('No se pudo cachear el bundle del bucket en IndexedDB', e);
            }
        }
    };

    window.GensokyoStorage = GensokyoStorage;

    if (!window.GensokyoApp) return;

    // 1. Sobrescribir loadUserDomains() para hidratar desde IndexedDB y migrar localStorage viejo
    GensokyoApp.loadUserDomains = function () {
        const legacyRaw = localStorage.getItem('gensokyo_user_domains');
        if (legacyRaw) {
            try {
                this.userDomains = JSON.parse(legacyRaw) || {};
            } catch (e) {
                this.userDomains = {};
            }
        }

        GensokyoStorage.getAllDomainsMap().then(async (idbDomains) => {
            const hasIdbData = Object.keys(idbDomains).length > 0;

            if (!hasIdbData && Object.keys(this.userDomains).length > 0) {
                // Migrar automáticamente los dominios que estaban en localStorage hacia IndexedDB
                await GensokyoStorage.saveDomainsMap(this.userDomains);
                localStorage.removeItem('gensokyo_user_domains');
            } else if (hasIdbData) {
                this.userDomains = { ...this.userDomains, ...idbDomains };
                localStorage.removeItem('gensokyo_user_domains');
            }

            this.updateDomainCount();
            this.updatePassportUI && this.updatePassportUI();
        }).catch((err) => {
            console.error('Error al inicializar IndexedDB para dominios', err);
        });
    };

    // 2. Sobrescribir saveUserDomains() para guardar en IndexedDB sin límite de 5MB
    GensokyoApp.saveUserDomains = function () {
        this.updateDomainCount();
        GensokyoStorage.saveDomainsMap(this.userDomains).catch((err) => {
            console.error('Error guardando dominios en IndexedDB', err);
            if (this.showToastNotification) {
                this.showToastNotification('Error al persistir en IndexedDB.', 'error');
            }
        });
    };
})();
