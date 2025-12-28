#!/bin/bash

# Cores
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Iniciando Instalação do GourmetFlow...${NC}"

# 1. Atualizar Sistema e Instalar Dependências Básicas
echo -e "${GREEN}📦 Atualizando sistema...${NC}"
sudo apt update && sudo apt upgrade -y

# Ferramentas de build (SQLite) e Dependências do Chromium (WhatsApp)
sudo apt install -y curl git nginx unzip build-essential python3 \
    gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 \
    libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 \
    libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
    libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 \
    libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation \
    libappindicator1 libnss3 lsb-release xdg-utils wget libgbm1

# 2. Instalar Node.js (v20)
echo -e "${GREEN}🟢 Instalando Node.js v20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Instalar PM2 (Gerenciador de Processos)
echo -e "${GREEN}⚙️ Instalando PM2...${NC}"
sudo npm install -g pm2

# 4. Configurar Diretórios
APP_DIR="/var/www/gourmetflow"
echo -e "${GREEN}📂 Configurando diretório $APP_DIR...${NC}"
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# 5. Mover Arquivos (Assume que o script está rodando onde os arquivos foram descompactados)
echo -e "${GREEN}🚚 Movendo arquivos...${NC}"
cp -r * $APP_DIR/

# 6. Instalar Dependências do Backend
echo -e "${GREEN}📥 Instalando dependências do WhatsApp Server...${NC}"
cd $APP_DIR/whatsapp-server
npm install

# 7. Configurar PM2
echo -e "${GREEN}🚀 Iniciando Servidor com PM2...${NC}"
pm2 start server.js --name "whatsapp-server"
pm2 save
pm2 startup | tail -n 1 | bash # Executa o comando que o pm2 startup sugere

# 8. Configurar Nginx
echo -e "${GREEN}🌐 Configurando Nginx...${NC}"
sudo cp $APP_DIR/deploy/nginx.conf /etc/nginx/sites-available/gourmetflow
sudo ln -sf /etc/nginx/sites-available/gourmetflow /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# 9. Configurar Firewall (UFW)
echo -e "${GREEN}🛡️ Configurando Firewall...${NC}"
sudo ufw allow 'Nginx Full'
sudo ufw allow 22
sudo ufw allow 3088
# Habilitar UFW se não estiver habilitado (com cuidado para não bloquear SSH)
# sudo ufw --force enable 

echo -e "${GREEN}✅ Instalação Concluída!${NC}"
echo -e "Acesse seu servidor pelo IP ou Domínio."
echo -e "NOTA: Verifique se o arquivo .env do whatsapp-server está configurado corretamente."
