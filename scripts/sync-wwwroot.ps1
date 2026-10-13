$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot
$appRoot = Join-Path $repoRoot 'GensokyoNetApp'
$wwwroot = Join-Path $appRoot 'wwwroot'

if (!(Test-Path $wwwroot)) {
    throw "No se encontro la ruta destino: $wwwroot"
}

$singleFiles = @('index.html', 'app.js', 'seed-data.js', 'style.css')
$folders = @('js', 'styles', 'assets')

foreach ($file in $singleFiles) {
    $src = Join-Path $repoRoot $file
    $dst = Join-Path $wwwroot $file

    if (!(Test-Path $src)) {
        throw "No se encontro el archivo origen: $src"
    }

    Copy-Item -Path $src -Destination $dst -Force
}

foreach ($folder in $folders) {
    $srcFolder = Join-Path $repoRoot $folder
    $dstFolder = Join-Path $wwwroot $folder

    if (!(Test-Path $srcFolder)) {
        throw "No se encontro la carpeta origen: $srcFolder"
    }

    if (!(Test-Path $dstFolder)) {
        New-Item -ItemType Directory -Path $dstFolder | Out-Null
    }

    Copy-Item -Path (Join-Path $srcFolder '*') -Destination $dstFolder -Recurse -Force
}

Write-Host 'wwwroot sincronizado correctamente.'
