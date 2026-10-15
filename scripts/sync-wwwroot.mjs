/**
 * scripts/sync-wwwroot.mjs
 * Sincronizador multiplataforma (Linux / macOS / Windows)
 * Replica los archivos del núcleo hacia GensokyoNetApp/wwwroot
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const appRoot = path.join(repoRoot, 'GensokyoNetApp');

const candidateTargets = [
    path.join(appRoot, 'wwwroot'),
    path.join(appRoot, 'bin', 'Debug', 'net8.0-windows', 'wwwroot'),
    path.join(appRoot, 'bin', 'Release', 'net8.0-windows', 'wwwroot'),
    path.join(appRoot, 'bin', 'Release', 'net8.0-windows', 'win-x64', 'wwwroot'),
    path.join(appRoot, 'publish', 'wwwroot'),
    path.join(appRoot, 'output', 'wwwroot')
];

const singleFiles = ['index.html', 'app.js', 'seed-data.js', 'style.css', 'CNAME'];
const folders = ['js', 'styles', 'assets'];

for (const targetDir of candidateTargets) {
    // Si la carpeta padre existe o es el wwwroot principal, sincronizar
    const parent = path.dirname(targetDir);
    if (!fs.existsSync(parent) && targetDir !== path.join(appRoot, 'wwwroot')) {
        continue;
    }

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    for (const file of singleFiles) {
        const src = path.join(repoRoot, file);
        const dst = path.join(targetDir, file);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dst);
        }
    }

    for (const folder of folders) {
        const srcFolder = path.join(repoRoot, folder);
        const dstFolder = path.join(targetDir, folder);
        if (fs.existsSync(srcFolder)) {
            fs.cpSync(srcFolder, dstFolder, { recursive: true, force: true });
        }
    }
}

console.log('[sync] wwwroot sincronizado en todos los entornos y carpetas bin/debug/release.');
