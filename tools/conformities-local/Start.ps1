param(
    [string]$ApiRepository = (Join-Path $PSScriptRoot '../../../../NADA A VER/astro-api')
)
$ErrorActionPreference = 'Stop'
$webRepository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$apiRepositoryPath = [IO.Path]::GetFullPath($ApiRepository)
$runtimeDirectory = Join-Path $webRepository '.backup/conformidades-local'
New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null
$env:FIREBASE_NODE_MODULES = (Join-Path $env:APPDATA 'npm/node_modules').Replace('\', '/')
$env:ASTRO_API_JAR = (Join-Path $apiRepositoryPath 'target/astro-api-0.0.1-SNAPSHOT.jar').Replace('\', '/')
if (-not (Test-Path -LiteralPath (Join-Path $webRepository '.env.conformity-local'))) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot '.env.example') -Destination (Join-Path $webRepository '.env.conformity-local')
}
docker --context desktop-linux network inspect astro657-local *> $null
if ($LASTEXITCODE -ne 0) { docker --context desktop-linux network create astro657-local | Out-Null }
foreach ($volumeName in @('astro657-postgres-data', 'astro657-mongo-data')) {
    docker --context desktop-linux volume inspect $volumeName *> $null
    if ($LASTEXITCODE -ne 0) { docker --context desktop-linux volume create $volumeName | Out-Null }
}
function Test-LocalPort([int]$Port) {
    $connection = [Net.Sockets.TcpClient]::new()
    try { $connection.Connect('127.0.0.1', $Port); return $true } catch { return $false } finally { $connection.Dispose() }
}
foreach ($service in @('postgres', 'mongo', 'redis')) {
    $containerName = "astro657-$service"
    docker --context desktop-linux container inspect $containerName *> $null
    if ($LASTEXITCODE -eq 0) { docker --context desktop-linux start $containerName | Out-Null }
    else { docker --context desktop-linux compose -f (Join-Path $PSScriptRoot 'compose.yaml') up -d $service }
    if ($LASTEXITCODE -ne 0) { throw "Não foi possível iniciar $containerName. Abra o Docker Desktop e tente novamente." }
    $networks = docker --context desktop-linux inspect --format '{{json .NetworkSettings.Networks}}' $containerName | ConvertFrom-Json
    if (-not $networks.PSObject.Properties['astro657-local']) { docker --context desktop-linux network connect astro657-local $containerName }
}
foreach ($service in @('auth', 'api')) {
    $containerName = "astro657-$service"
    docker --context desktop-linux container inspect $containerName *> $null
    if ($LASTEXITCODE -eq 0) { docker --context desktop-linux start $containerName | Out-Null }
    else { docker --context desktop-linux compose -f (Join-Path $PSScriptRoot 'compose.yaml') up -d $service }
    if ($LASTEXITCODE -ne 0) { throw "Não foi possível iniciar $containerName." }
}
if (-not (Test-LocalPort 5167)) {
    Start-Process -FilePath 'node' -ArgumentList @('./node_modules/vite/bin/vite.js', '--mode', 'conformity-local', '--host', '127.0.0.1', '--port', '5167', '--strictPort') -WorkingDirectory $webRepository -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDirectory 'web.log') -RedirectStandardError (Join-Path $runtimeDirectory 'web-error.log')
}
Write-Output 'Inicialização solicitada. WEB: http://127.0.0.1:5167 — API: http://127.0.0.1:8067'
Write-Output "Logs: $runtimeDirectory"
