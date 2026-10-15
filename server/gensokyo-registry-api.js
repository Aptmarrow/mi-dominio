/**
 * ==========================================================================
 * server/gensokyo-registry-api.js
 * Backend de Registro de Dominios + Almacenamiento en Bucket (S3 / R2 / Local CDN)
 * Compatible 100% con GensokyoApp.remoteRegistry en app.js
 * ==========================================================================
 */
const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const app = express();

// Permitir bundles con assets empaquetados de hasta 25 MB por versión
app.use(express.json({ limit: '25mb' }));

// Middleware CORS compatible con Express 5 para permitir peticiones desde GitHub Pages y WebView2
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

const DATA_DIR = process.env.GENSOKYO_DATA_DIR || path.join(__dirname, 'data');
const CDN_BUCKET_DIR = path.join(DATA_DIR, 'cdn-bucket');
const REGISTRY_INDEX_FILE = path.join(DATA_DIR, 'domains-index.json');
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || 'https://espinoza.engineer').replace(/\/$/, '');

const sanitizeSegment = (str) => String(str || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');

const hashToken = (token) => crypto.createHash('sha256').update(String(token || '')).digest('hex');

const RESERVED_DOMAINS = new Set([
    'admin', 'api', 'cdn', 'system', 'root', 'gensokyo',
    'auth', 'login', 'register', 'status', 'config', 'espinoza', 'mail', 'dns'
]);

async function loadRegistryIndex() {
    try {
        const raw = await fs.readFile(REGISTRY_INDEX_FILE, 'utf8');
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

async function saveRegistryIndex(index) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(REGISTRY_INDEX_FILE, JSON.stringify(index, null, 2), 'utf8');
}

// 0. Healthcheck y Monitoreo para el Proveedor
app.get('/api/gensokyo/health', (req, res) => {
    res.json({
        status: 'ok',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: Date.now()
    });
});

// Metricas de Uso de Disco y Dominios (Para el Proveedor)
app.get('/api/gensokyo/stats', async (req, res) => {
    try {
        const index = await loadRegistryIndex();
        const domains = Object.values(index);
        let totalBytes = 0;
        let totalVersions = 0;
        domains.forEach(d => {
            totalBytes += Number(d.sizeBytes) || 0;
            totalVersions += Object.keys(d.versions || {}).length || 1;
        });
        res.json({
            ok: true,
            totalDomains: domains.length,
            publicDomains: domains.filter(d => d.visibility === 'public').length,
            privateDomains: domains.filter(d => d.visibility === 'private').length,
            totalVersions,
            storageUsedBytes: totalBytes,
            storageUsedMB: (totalBytes / (1024 * 1024)).toFixed(2),
            uptimeSeconds: Math.floor(process.uptime()),
            maxPerSiteLimitMB: 25
        });
    } catch (err) {
        res.status(500).json({ error: 'Error calculando estadisticas de proveedor.' });
    }
});

// 1. Servir los sitios estáticos del Bucket con caché agresiva por versión
app.use('/cdn', express.static(CDN_BUCKET_DIR, {
    maxAge: '365d',
    immutable: true,
    setHeaders(res) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('X-Content-Type-Options', 'nosniff');
    }
}));

// 2. Endpoint de Publicación: POST /api/gensokyo/publish
app.post('/api/gensokyo/publish', async (req, res) => {
    try {
        const authHeader = req.headers.authorization || '';
        const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
        if (!bearerToken || bearerToken.includes('0000_nameless_youkai')) {
            return res.status(401).json({ error: 'Se requiere un Pasaporte registrado para publicar en la nube.' });
        }

        const domain = sanitizeSegment(req.body.domain);
        const version = sanitizeSegment(req.body.activeVersion || 'v1') || 'v1';
        const htmlContent = String(req.body.htmlContent || '');

        if (!domain || !htmlContent) {
            return res.status(400).json({ error: 'Dominio o contenido HTML inválido.' });
        }

        if (RESERVED_DOMAINS.has(domain)) {
            return res.status(400).json({ error: 'Este dominio esta reservado por el sistema de GensokyoNet.' });
        }

        const index = await loadRegistryIndex();
        const existing = index[domain];
        const callerTokenHash = hashToken(bearerToken);

        // Verificar propiedad del dominio: si ya existe en la nube, solo su dueño puede actualizarlo
        if (existing && existing.ownerTokenHash !== callerTokenHash) {
            return res.status(403).json({ error: 'Este dominio ya pertenece a otro Pasaporte en GensokyoNet.' });
        }

        // Guardar el bundle estático en el Bucket (/cdn/{domain}/{version}/index.html)
        const bucketFolder = path.join(CDN_BUCKET_DIR, domain, version);
        await fs.mkdir(bucketFolder, { recursive: true });
        await fs.writeFile(path.join(bucketFolder, 'index.html'), htmlContent, 'utf8');

        const contentUrl = `${PUBLIC_BASE_URL}/cdn/${encodeURIComponent(domain)}/${encodeURIComponent(version)}/index.html`;
        const versionsMap = (existing && existing.versions) ? existing.versions : {};
        versionsMap[version] = {
            contentUrl,
            sizeBytes: Buffer.byteLength(htmlContent, 'utf8'),
            publishedAt: new Date().toISOString()
        };

        index[domain] = {
            domain,
            title: String(req.body.title || domain).slice(0, 120),
            author: String(req.body.author || 'Unknown').slice(0, 80),
            ownerId: String(req.body.ownerId || 'ID#0000').slice(0, 40),
            ownerTokenHash: callerTokenHash,
            visibility: req.body.visibility === 'private' ? 'private' : 'public',
            badgeUrl: req.body.badgeUrl ? String(req.body.badgeUrl).slice(0, 500) : null,
            badgeText: req.body.badgeText ? String(req.body.badgeText).slice(0, 30) : null,
            activeVersion: version,
            contentUrl,
            sizeBytes: Buffer.byteLength(htmlContent, 'utf8'),
            versions: versionsMap,
            updatedAt: new Date().toISOString()
        };

        await saveRegistryIndex(index);

        return res.status(200).json({
            ok: true,
            domain,
            activeVersion: version,
            contentUrl,
            badgeUrl: index[domain].badgeUrl,
            badgeText: index[domain].badgeText
        });
    } catch (err) {
        console.error('Error al publicar en bucket:', err);
        return res.status(500).json({ error: 'Error interno al publicar dominio.' });
    }
});

// 3. Endpoint de Resolución: GET /api/gensokyo/domains/:domain
app.get('/api/gensokyo/domains/:domain', async (req, res) => {
    try {
        const domain = sanitizeSegment(req.params.domain);
        const index = await loadRegistryIndex();
        const record = index[domain];

        if (!record) {
            return res.status(404).json({ error: 'Dominio no encontrado en el registro.' });
        }

        // El cliente en app.js descargará el HTML directo desde record.contentUrl (Bucket/CDN)
        return res.status(200).json({
            domain: record.domain,
            title: record.title,
            author: record.author,
            ownerId: record.ownerId,
            visibility: record.visibility,
            badgeUrl: record.badgeUrl || null,
            badgeText: record.badgeText || null,
            activeVersion: record.activeVersion,
            versions: Object.keys(record.versions || {}),
            contentUrl: record.contentUrl,
            sizeBytes: record.sizeBytes
        });
    } catch (err) {
        return res.status(500).json({ error: 'Error al resolver dominio.' });
    }
});

// 4. Directorio Público para que el buscador de GensokyoNet descubra sitios de otros usuarios
app.get('/api/gensokyo/directory', async (req, res) => {
    const index = await loadRegistryIndex();
    const publicList = Object.values(index)
        .filter(d => d.visibility === 'public')
        .map(d => ({
            domain: d.domain,
            title: d.title,
            author: d.author,
            badgeUrl: d.badgeUrl || null,
            badgeText: d.badgeText || null,
            activeVersion: d.activeVersion,
            updatedAt: d.updatedAt
        }));
    res.json({ domains: publicList });
});

// 5. Endpoint de Eliminacion / Liberacion de Dominio (Dueño o Administrador Proveedor)
app.delete('/api/gensokyo/domains/:domain', async (req, res) => {
    try {
        const domain = sanitizeSegment(req.params.domain);
        const index = await loadRegistryIndex();
        const record = index[domain];
        if (!record) {
            return res.status(404).json({ error: 'Dominio no encontrado.' });
        }

        const authHeader = req.headers.authorization || '';
        const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
        const adminKey = req.headers['x-admin-key'] || req.query.adminKey || '';
        const expectedAdminSecret = process.env.GENSOKYO_ADMIN_SECRET || 'gensokyo_admin_secret_key';

        const isOwner = bearerToken && (hashToken(bearerToken) === record.ownerTokenHash);
        const isAdmin = adminKey && (adminKey === expectedAdminSecret);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'No tienes autorizacion para eliminar este dominio.' });
        }

        // Eliminar del bucket en disco
        const bucketFolder = path.join(CDN_BUCKET_DIR, domain);
        await fs.rm(bucketFolder, { recursive: true, force: true }).catch(() => {});

        delete index[domain];
        await saveRegistryIndex(index);

        return res.json({ ok: true, message: `Dominio ${domain} eliminado exitosamente.`, by: isAdmin ? 'admin' : 'owner' });
    } catch (err) {
        console.error('Error al eliminar dominio:', err);
        return res.status(500).json({ error: 'Error interno al eliminar dominio.' });
    }
});

// 6. Endpoint de Moderacion Administrativa (Takedown / Bloqueo Inmediato por el Proveedor)
app.post('/api/gensokyo/domains/:domain/takedown', async (req, res) => {
    try {
        const domain = sanitizeSegment(req.params.domain);
        const adminKey = req.headers['x-admin-key'] || req.body.adminKey || '';
        const expectedAdminSecret = process.env.GENSOKYO_ADMIN_SECRET || 'gensokyo_admin_secret_key';

        if (!adminKey || adminKey !== expectedAdminSecret) {
            return res.status(403).json({ error: 'Acceso exclusivo de administrador del proveedor.' });
        }

        const index = await loadRegistryIndex();
        if (!index[domain]) {
            return res.status(404).json({ error: 'Dominio no encontrado.' });
        }

        index[domain].visibility = 'private';
        index[domain].takedownReason = req.body.reason || 'Moderacion por el proveedor de GensokyoNet';
        await saveRegistryIndex(index);

        return res.json({ ok: true, message: `Dominio ${domain} suspendido por moderacion.` });
    } catch (err) {
        return res.status(500).json({ error: 'Error al aplicar moderacion.' });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`GensokyoNet Registry + Bucket CDN escuchando en puerto ${PORT}`);
});
