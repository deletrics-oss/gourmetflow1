# Script de Empacotamento para VPS - GourmetFlow
$ErrorActionPreference = "Stop"

# Obter Diretório Base (onde o script está)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Get-Item $ScriptDir).Parent.FullName

Write-Host "Iniciando empacotamento em: $ProjectRoot"

# 1. Build do Frontend
Write-Host "Construindo o Frontend (pode demorar)..."
Set-Location $ProjectRoot
Invoke-Expression "npm run build"

if (-not (Test-Path "$ProjectRoot\dist")) {
    Write-Host "ERRO: Pasta 'dist' nao encontrada. O build falhou ou npm nao esta no PATH." -ForegroundColor Red
    exit 1
}

# 2. Preparar pasta temporaria
$tempDirName = "temp_deploy_package"
$tempPath = Join-Path $ProjectRoot $tempDirName

if (Test-Path $tempPath) { Remove-Item $tempPath -Recurse -Force }
New-Item -ItemType Directory -Path $tempPath | Out-Null
New-Item -ItemType Directory -Path "$tempPath\whatsapp-server" | Out-Null
New-Item -ItemType Directory -Path "$tempPath\deploy" | Out-Null

# 3. Copiar Arquivos com Caminhos Absolutos
Write-Host "Copiando arquivos para o pacote..."

# Frontend
Copy-Item -Path "$ProjectRoot\dist\*" -Destination "$tempPath" -Recurse

# Backend
Copy-Item -Path "$ProjectRoot\whatsapp-server\package.json" -Destination "$tempPath\whatsapp-server"
Copy-Item -Path "$ProjectRoot\whatsapp-server\server.js" -Destination "$tempPath\whatsapp-server"
Copy-Item -Path "$ProjectRoot\whatsapp-server\.env.example" -Destination "$tempPath\whatsapp-server"

# Deploy Configs
Copy-Item -Path "$ProjectRoot\deploy\nginx.conf" -Destination "$tempPath\deploy"
Copy-Item -Path "$ProjectRoot\deploy\install_vps.sh" -Destination "$tempPath"

# 4. Compactar
Write-Host "Compactando arquivo..."
$zipFile = Join-Path $ProjectRoot "zappedido\gourmetflow-deploy.zip"
if (Test-Path $zipFile) { Remove-Item $zipFile }
Compress-Archive -Path "$tempPath\*" -DestinationPath $zipFile

# 5. Limpeza
Remove-Item $tempPath -Recurse -Force

Write-Host "Sucesso! O arquivo foi criado em:" -ForegroundColor Green
Write-Host $zipFile -ForegroundColor White
