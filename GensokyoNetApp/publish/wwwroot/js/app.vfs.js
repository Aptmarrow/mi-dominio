/**
 * ==========================================================================
 * js/app.vfs.js
 * Motor de Archivos Virtual (VFS) + Empaquetador de Builds y Assets Binarios
 * Soporta importar cualquier carpeta compilada (dist/, build/, public/) con
 * subcarpetas, imágenes, fuentes, audio y WASM para publicarla en GensokyoNet.
 * ==========================================================================
 */
(function () {
    const BINARY_MIMES = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
        ico: 'image/x-icon', bmp: 'image/bmp',
        mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', flac: 'audio/flac',
        mp4: 'video/mp4', webm: 'video/webm',
        woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
        wasm: 'application/wasm', pdf: 'application/pdf'
    };

    const normalizePath = (p) => String(p || '')
        .replace(/\\/g, '/')
        .replace(/^\/+|\/+$/g, '')
        .replace(/\/{2,}/g, '/');

    const splitPath = (p) => {
        const clean = normalizePath(p);
        return clean ? clean.split('/') : [];
    };

    const dirname = (p) => {
        const parts = splitPath(p);
        parts.pop();
        return parts.join('/');
    };

    const basename = (p) => {
        const parts = splitPath(p);
        return parts.pop() || '';
    };

    const extname = (p) => {
        const base = basename(p);
        const idx = base.lastIndexOf('.');
        return idx > 0 ? base.slice(idx + 1).toLowerCase() : '';
    };

    const resolveRelativePath = (fromFile, relativeTarget) => {
        if (!relativeTarget) return '';
        const cleanTarget = String(relativeTarget).split('?')[0].split('#')[0].trim();
        if (/^(https?:|data:|blob:|mailto:|tel:|javascript:|gensokyo:|outside:)/i.test(cleanTarget)) {
            return relativeTarget;
        }
        if (cleanTarget.startsWith('/')) return normalizePath(cleanTarget);

        const baseParts = splitPath(dirname(fromFile));
        const relParts = cleanTarget.replace(/\\/g, '/').split('/');

        for (const seg of relParts) {
            if (!seg || seg === '.') continue;
            if (seg === '..') baseParts.pop();
            else baseParts.push(seg);
        }
        return baseParts.join('/');
    };

    const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const u8ToBase64DataUrl = (u8, mime) => {
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < u8.length; i += chunk) {
            binary += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
        }
        return `data:${mime};base64,${btoa(binary)}`;
    };

    // Tabla CRC32 para empaquetar archivos .zip estándar en memoria sin librerías
    const CRC_TABLE = (() => {
        const table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            table[i] = c >>> 0;
        }
        return table;
    })();

    const crc32 = (u8) => {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < u8.length; i++) {
            crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ u8[i]) & 0xFF];
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    };

    const GensokyoVFS = {
        BINARY_MIMES,
        normalizePath,
        dirname,
        basename,
        extname,
        resolveRelativePath,

        createDefaultTree() {
            return {
                files: {
                    'index.html': `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Nodo Intranet GensokyoNet</title>
    <link rel="stylesheet" href="styles/main.css">
</head>
<body>
    <main class="card">
        <span class="tag">GENSOKYONET INTRANET</span>
        <h1>Sitio Listo para Despliegue</h1>
        <p>Desarrolla en tu IDE favorito (VS Code, Cursor, etc.) y testea tu puerto local directo en <code>gensokyo://localhost:puerto</code> o sube tu carpeta compilada aquí.</p>
    </main>
    <script src="scripts/app.js"><\/script>
</body>
</html>`,
                    'styles/main.css': `body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #fcf7f1; color: #2b181c; font-family: system-ui, sans-serif; }
.card { max-width: 480px; padding: 2rem; border-radius: 12px; background: #fff; border: 2px solid #a61b32; text-align: center; box-shadow: 0 10px 26px rgba(166,27,50,0.12); }
.tag { font-size: 0.72rem; font-weight: 800; color: #a61b32; letter-spacing: 1px; }`,
                    'scripts/app.js': `console.log("Nodo GensokyoNet activo.");`
                },
                folders: ['styles', 'scripts']
            };
        },

        ensureParentFolders(vfs, filePath) {
            const parts = splitPath(filePath);
            parts.pop();
            let current = '';
            for (const part of parts) {
                current = current ? `${current}/${part}` : part;
                if (!vfs.folders.includes(current)) vfs.folders.push(current);
            }
        },

        upsertFile(vfs, path, content = '') {
            const clean = normalizePath(path);
            if (!clean) return false;
            this.ensureParentFolders(vfs, clean);
            vfs.files[clean] = String(content);
            return clean;
        },

        createFolder(vfs, folderPath) {
            const clean = normalizePath(folderPath);
            if (!clean) return false;
            this.ensureParentFolders(vfs, `${clean}/placeholder`);
            if (!vfs.folders.includes(clean)) vfs.folders.push(clean);
            return clean;
        },

        deleteNode(vfs, targetPath, isFolder = false) {
            const clean = normalizePath(targetPath);
            if (!clean) return;
            if (!isFolder) {
                delete vfs.files[clean];
                return;
            }
            const prefix = `${clean}/`;
            vfs.folders = vfs.folders.filter(f => f !== clean && !f.startsWith(prefix));
            Object.keys(vfs.files).forEach(file => {
                if (file.startsWith(prefix)) delete vfs.files[file];
            });
        },

        renameNode(vfs, oldPath, newPath, isFolder = false) {
            const cleanOld = normalizePath(oldPath);
            const cleanNew = normalizePath(newPath);
            if (!cleanOld || !cleanNew || cleanOld === cleanNew) return false;

            if (!isFolder) {
                if (!(cleanOld in vfs.files)) return false;
                const content = vfs.files[cleanOld];
                delete vfs.files[cleanOld];
                this.upsertFile(vfs, cleanNew, content);
                return cleanNew;
            }

            const oldPrefix = `${cleanOld}/`;
            const newPrefix = `${cleanNew}/`;
            this.createFolder(vfs, cleanNew);

            vfs.folders = vfs.folders.map(f => {
                if (f === cleanOld) return cleanNew;
                if (f.startsWith(oldPrefix)) return newPrefix + f.slice(oldPrefix.length);
                return f;
            });

            Object.keys(vfs.files).forEach(f => {
                if (f.startsWith(oldPrefix)) {
                    const updated = newPrefix + f.slice(oldPrefix.length);
                    this.upsertFile(vfs, updated, vfs.files[f]);
                    delete vfs.files[f];
                }
            });
            return cleanNew;
        },

        buildHierarchy(vfs) {
            const root = { name: '', path: '', type: 'folder', children: {} };

            const ensureFolderNode = (folderPath) => {
                const parts = splitPath(folderPath);
                let cursor = root;
                let acc = '';
                for (const part of parts) {
                    acc = acc ? `${acc}/${part}` : part;
                    if (!cursor.children[part]) {
                        cursor.children[part] = { name: part, path: acc, type: 'folder', children: {} };
                    }
                    cursor = cursor.children[part];
                }
                return cursor;
            };

            (vfs.folders || []).forEach(ensureFolderNode);

            Object.keys(vfs.files || {}).forEach(filePath => {
                const folderPath = dirname(filePath);
                const fileName = basename(filePath);
                const parent = folderPath ? ensureFolderNode(folderPath) : root;
                parent.children[fileName] = {
                    name: fileName,
                    path: filePath,
                    type: 'file',
                    ext: extname(filePath),
                    size: (vfs.files[filePath] || '').length
                };
            });

            const sortNode = (node) => {
                const list = Object.values(node.children);
                list.sort((a, b) => {
                    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                    return a.name.localeCompare(b.name);
                });
                list.forEach(child => {
                    if (child.type === 'folder') child.sortedChildren = sortNode(child);
                });
                return list;
            };

            return sortNode(root);
        },

        async importFromFileList(fileList) {
            const vfs = { files: {}, folders: [] };
            const filesArray = Array.from(fileList || []);
            if (!filesArray.length) return null;

            if (filesArray.length === 1 && filesArray[0].name.toLowerCase().endsWith('.zip')) {
                return await this.importFromZipBuffer(await filesArray[0].arrayBuffer());
            }

            const rawPaths = filesArray.map(f => normalizePath(f.webkitRelativePath || f.name));
            const firstSegments = rawPaths.map(p => splitPath(p)[0]).filter(Boolean);
            const stripRoot = firstSegments.length > 0 &&
                rawPaths.every(p => p.includes('/')) &&
                firstSegments.every(s => s === firstSegments[0])
                ? `${firstSegments[0]}/`
                : '';

            for (const file of filesArray) {
                let relPath = normalizePath(file.webkitRelativePath || file.name);
                if (stripRoot && relPath.startsWith(stripRoot)) {
                    relPath = relPath.slice(stripRoot.length);
                }
                if (!relPath || relPath.startsWith('.git/') || relPath.includes('node_modules/')) continue;

                const ext = extname(relPath);
                if (BINARY_MIMES[ext]) {
                    const dataUrl = await readFileAsDataUrl(file);
                    this.upsertFile(vfs, relPath, dataUrl);
                } else {
                    const text = await file.text();
                    this.upsertFile(vfs, relPath, text);
                }
            }
            return vfs;
        },

        async importFromZipBuffer(arrayBuffer) {
            const vfs = { files: {}, folders: [] };
            const view = new DataView(arrayBuffer);
            const u8 = new Uint8Array(arrayBuffer);
            const decoder = new TextDecoder('utf-8');
            let offset = 0;

            while (offset + 30 <= view.byteLength) {
                if (view.getUint32(offset, true) !== 0x04034b50) break;
                const method = view.getUint16(offset + 8, true);
                const compSize = view.getUint32(offset + 18, true);
                const nameLen = view.getUint16(offset + 26, true);
                const extraLen = view.getUint16(offset + 28, true);
                const rawName = decoder.decode(u8.subarray(offset + 30, offset + 30 + nameLen));
                const dataStart = offset + 30 + nameLen + extraLen;
                const compData = u8.subarray(dataStart, dataStart + compSize);

                const clean = normalizePath(rawName);
                if (clean && !clean.startsWith('__MACOSX') && !clean.includes('node_modules/') && !rawName.endsWith('/')) {
                    let rawBytes = null;
                    if (method === 0) {
                        rawBytes = compData;
                    } else if (method === 8 && typeof DecompressionStream !== 'undefined') {
                        const ds = new DecompressionStream('deflate-raw');
                        const writer = ds.writable.getWriter();
                        writer.write(compData);
                        writer.close();
                        rawBytes = new Uint8Array(await new Response(ds.readable).arrayBuffer());
                    }

                    if (rawBytes) {
                        const ext = extname(clean);
                        if (BINARY_MIMES[ext]) {
                            this.upsertFile(vfs, clean, u8ToBase64DataUrl(rawBytes, BINARY_MIMES[ext]));
                        } else {
                            this.upsertFile(vfs, clean, decoder.decode(rawBytes));
                        }
                    }
                }
                offset = dataStart + compSize;
            }
            return vfs;
        },

        exportToZipBlob(vfs) {
            const encoder = new TextEncoder();
            const entries = Object.entries(vfs.files || {});
            const localChunks = [];
            const centralChunks = [];
            let offset = 0;

            for (const [path, content] of entries) {
                const nameBytes = encoder.encode(normalizePath(path));
                const dataBytes = encoder.encode(String(content ?? ''));
                const crc = crc32(dataBytes);

                const localHeader = new Uint8Array(30 + nameBytes.length);
                const lv = new DataView(localHeader.buffer);
                lv.setUint32(0, 0x04034b50, true);
                lv.setUint16(4, 20, true);
                lv.setUint16(6, 0x0800, true);
                lv.setUint16(8, 0, true);
                lv.setUint32(14, crc, true);
                lv.setUint32(18, dataBytes.length, true);
                lv.setUint32(22, dataBytes.length, true);
                lv.setUint16(26, nameBytes.length, true);
                localHeader.set(nameBytes, 30);

                const centralHeader = new Uint8Array(46 + nameBytes.length);
                const cv = new DataView(centralHeader.buffer);
                cv.setUint32(0, 0x02014b50, true);
                cv.setUint16(4, 20, true);
                cv.setUint16(6, 20, true);
                cv.setUint16(8, 0x0800, true);
                cv.setUint16(10, 0, true);
                cv.setUint32(16, crc, true);
                cv.setUint32(20, dataBytes.length, true);
                cv.setUint32(24, dataBytes.length, true);
                cv.setUint16(28, nameBytes.length, true);
                cv.setUint32(42, offset, true);
                centralHeader.set(nameBytes, 46);

                localChunks.push(localHeader, dataBytes);
                centralChunks.push(centralHeader);
                offset += localHeader.length + dataBytes.length;
            }

            const centralSize = centralChunks.reduce((acc, c) => acc + c.length, 0);
            const eocd = new Uint8Array(22);
            const ev = new DataView(eocd.buffer);
            ev.setUint32(0, 0x06054b50, true);
            ev.setUint16(8, entries.length, true);
            ev.setUint16(10, entries.length, true);
            ev.setUint32(12, centralSize, true);
            ev.setUint32(16, offset, true);

            return new Blob([...localChunks, ...centralChunks, eocd], { type: 'application/zip' });
        }
    };

    window.GensokyoVFS = GensokyoVFS;
    if (window.GensokyoApp) window.GensokyoApp.VFS = GensokyoVFS;
})();