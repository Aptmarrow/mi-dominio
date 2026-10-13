/**
 * GensokyoVFS - Sistema de Archivos Virtual con Respaldo en IndexedDB
 * Permite almacenar y gestionar proyectos web multi-archivo completos
 * (HTML, CSS, JS, imágenes, audio y fuentes) sin limitaciones de cuota.
 */

const GensokyoVFS = {
    dbName: 'gensokyo_net_vfs',
    dbVersion: 1,
    db: null,
    memoryStore: {},

    async init() {
        if (this.db) return this.db;
        if (!window.indexedDB) {
            console.warn('[GensokyoVFS] IndexedDB no disponible, usando memoria virtual.');
            return null;
        }

        return new Promise((resolve) => {
            try {
                const request = indexedDB.open(this.dbName, this.dbVersion);

                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('projects')) {
                        db.createObjectStore('projects', { keyPath: 'domain' });
                    }
                };

                request.onsuccess = (e) => {
                    this.db = e.target.result;
                    resolve(this.db);
                };

                request.onerror = (e) => {
                    console.error('[GensokyoVFS] Error al abrir IndexedDB:', e);
                    resolve(null);
                };
            } catch (err) {
                console.error('[GensokyoVFS] Excepción en init:', err);
                resolve(null);
            }
        });
    },

    async saveProject(domain, versionTag, files, metadata = {}) {
        await this.init();

        const projectData = {
            domain,
            activeVersion: versionTag || 'v1',
            updatedAt: new Date().toISOString(),
            metadata,
            versions: {}
        };

        // Si ya existe proyecto, conservar versiones previas
        const existing = await this.getProject(domain);
        if (existing && existing.versions) {
            projectData.versions = existing.versions;
        }

        projectData.versions[versionTag] = {
            versionTag,
            createdAt: new Date().toISOString(),
            fileCount: Object.keys(files).length,
            files: files
        };

        // Respaldo en memoria
        this.memoryStore[domain] = projectData;

        if (this.db) {
            return new Promise((resolve) => {
                try {
                    const tx = this.db.transaction(['projects'], 'readwrite');
                    const store = tx.objectStore('projects');
                    const putReq = store.put(projectData);
                    putReq.onsuccess = () => resolve(true);
                    putReq.onerror = (err) => {
                        console.error('[GensokyoVFS] Error al guardar en IndexedDB:', err);
                        resolve(false);
                    };
                } catch (err) {
                    console.error('[GensokyoVFS] Excepción en saveProject:', err);
                    resolve(false);
                }
            });
        }
        return true;
    },

    async getProject(domain) {
        if (this.memoryStore[domain]) {
            return this.memoryStore[domain];
        }

        await this.init();
        if (!this.db) return null;

        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction(['projects'], 'readonly');
                const store = tx.objectStore('projects');
                const getReq = store.get(domain);
                getReq.onsuccess = (e) => {
                    const data = e.target.result || null;
                    if (data) this.memoryStore[domain] = data;
                    resolve(data);
                };
                getReq.onerror = () => resolve(null);
            } catch (err) {
                console.error('[GensokyoVFS] Excepción en getProject:', err);
                resolve(null);
            }
        });
    },

    async getFiles(domain, versionTag = null) {
        const project = await this.getProject(domain);
        if (!project || !project.versions) return null;
        const ver = versionTag || project.activeVersion || 'v1';
        return project.versions[ver] ? project.versions[ver].files : null;
    },

    async deleteProject(domain) {
        delete this.memoryStore[domain];
        await this.init();
        if (!this.db) return true;

        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction(['projects'], 'readwrite');
                const store = tx.objectStore('projects');
                const delReq = store.delete(domain);
                delReq.onsuccess = () => resolve(true);
                delReq.onerror = () => resolve(false);
            } catch (err) {
                resolve(false);
            }
        });
    }
};

window.GensokyoVFS = GensokyoVFS;
