#!/bin/bash

# ============================================
# GourmetFlow WhatsApp Server - VPS Installer
# Target: Ubuntu 20.04+ / Debian 11+
# VPS IP: 206.183.130.29
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Instalando GourmetFlow WhatsApp Server...${NC}"

# 1. Update system
echo -e "${YELLOW}📦 Atualizando sistema...${NC}"
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20
echo -e "${YELLOW}🟢 Instalando Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install build tools (required for better-sqlite3)
echo -e "${YELLOW}🔧 Instalando ferramentas de build...${NC}"
sudo apt install -y build-essential python3

# 4. Install PM2
echo -e "${YELLOW}⚙️ Instalando PM2...${NC}"
sudo npm install -g pm2

# 5. Install Chromium dependencies (required for whatsapp-web.js)
echo -e "${YELLOW}🌐 Instalando dependências do Chromium...${NC}"
sudo apt install -y \
    gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 \
    libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 \
    libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
    libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 \
    libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation \
    libappindicator1 libnss3 lsb-release xdg-utils wget libgbm1

# 6. Create app directory
APP_DIR="/opt/whatsapp-server"
echo -e "${YELLOW}📂 Criando diretório ${APP_DIR}...${NC}"
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# 7. Copy files
echo -e "${YELLOW}📋 Copiando arquivos...${NC}"
cp -r ./* $APP_DIR/

# 8. Install dependencies
echo -e "${YELLOW}📥 Instalando dependências Node.js...${NC}"
cd $APP_DIR
npm install

# 9. Create .env file
if [ ! -f "$APP_DIR/.env" ]; then
    echo -e "${YELLOW}📝 Criando arquivo .env...${NC}"
    cp .env.example .env
    echo -e "${GREEN}⚠️  IMPORTANTE: Edite o arquivo .env com sua GEMINI_API_KEY${NC}"
fi

# 10. Configure PM2
echo -e "${YELLOW}🚀 Configurando PM2...${NC}"
pm2 delete whatsapp-server 2>/dev/null || true
pm2 start server.js --name "whatsapp-server"
pm2 save
pm2 startup | tail -n 1 | bash 2>/dev/null || true

# 11. Configure Firewall
echo -e "${YELLOW}🛡️ Configurando Firewall...${NC}"
sudo ufw allow 3088
sudo ufw allow 22

echo -e "${GREEN}
╔══════════════════════════════════════════════════════════════╗
║           ✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!               ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Servidor rodando em: http://206.183.130.29:3088             ║
║                                                              ║
║  PRÓXIMOS PASSOS:                                            ║
║  1. Edite o arquivo .env: nano /opt/whatsapp-server/.env     ║
║  2. Adicione sua GEMINI_API_KEY                              ║
║  3. Reinicie: pm2 restart whatsapp-server                    ║
║                                                              ║
║  COMANDOS ÚTEIS:                                             ║
║  - Ver logs: pm2 logs whatsapp-server                        ║
║  - Status: pm2 status                                        ║
║  - Reiniciar: pm2 restart whatsapp-server                    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
${NC}"
