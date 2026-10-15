$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot
$appRoot = Join-Path $repoRoot 'GensokyoNetApp'
$candidateTargets = @(
    (Join-Path $appRoot 'wwwroot'),
    (Join-Path $appRoot 'bin\Debug\net8.0-windows\wwwroot'),
    (Join-Path $appRoot 'bin\Release\net8.0-windows\wwwroot'),
    (Join-Path $appRoot 'bin\Release\net8.0-windows\win-x64\wwwroot'),
    (Join-Path $appRoot 'publish\wwwroot')
)

$singleFiles = @('index.html', 'app.js', 'seed-data.js', 'style.css')
$folders = @('js', 'styles', 'assets')

foreach ($targetDir in $candidateTargets) {
    $parent = Split-Path -Parent $targetDir
    if (!(Test-Path $parent) -and $targetDir -ne (Join-Path $appRoot 'wwwroot')) {
        continue
    }

    if (!(Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    foreach ($file in $singleFiles) {
        $src = Join-Path $repoRoot $file
        $dst = Join-Path $targetDir $file
        if (Test-Path $src) {
            Copy-Item -Path $src -Destination $dst -Force
        }
    }

    foreach ($folder in $folders) {
        $srcFolder = Join-Path $repoRoot $folder
        $dstFolder = Join-Path $targetDir $folder
        if (Test-Path $srcFolder) {
            if (!(Test-Path $dstFolder)) {
                New-Item -ItemType Directory -Path $dstFolder -Force | Out-Null
            }
            Copy-Item -Path (Join-Path $srcFolder '*') -Destination $dstFolder -Recurse -Force
        }
    }
}

Write-Host 'wwwroot sincronizado correctamente.'
