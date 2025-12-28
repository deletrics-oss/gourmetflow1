# GourmetFlow WhatsApp Server

Servidor WhatsApp para o GourmetFlow usando whatsapp-web.js.

## Requisitos

- Node.js 18+ 
- Chromium/Chrome instalado (para puppeteer)

## Instalação

```bash
cd whatsapp-server
npm install
```

## Executar

```bash
npm start
```

O servidor vai rodar na porta **3022** por padrão.

## Configurar no GourmetFlow

Após iniciar o servidor, você precisa configurar a URL no GourmetFlow:

### Opção 1: Rodar localmente
Se estiver rodando no mesmo computador:
- URL: `http://localhost:3022`

### Opção 2: Rodar em VPS
Se estiver rodando em um servidor:
- URL: `http://SEU-IP:3022`

### Configurar no Supabase
Altere o arquivo `supabase/functions/whatsapp-server-proxy/index.ts`:
```typescript
const DEFAULT_SERVER_URL = "http://localhost:3022"; // ou seu IP
```

Ou configure por restaurante nas configurações do banco de dados.

## Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/sessions` | Criar sessão e obter QR Code |
| GET | `/api/sessions/:id/status` | Status da conexão |
| POST | `/api/sessions/:id/reconnect` | Reconectar sessão |
| DELETE | `/api/sessions/:id` | Desconectar |
| POST | `/api/messages/send` | Enviar mensagem de texto |
| POST | `/api/messages/send-media` | Enviar mídia |
| GET | `/api/contacts/:id` | Listar contatos |

## Uso

1. Inicie o servidor: `npm start`
2. No GourmetFlow, vá em **WhatsApp Manager**
3. Clique em **Adicionar Dispositivo**
4. Clique em **Conectar** - o QR Code aparecerá
5. Escaneie com o WhatsApp do celular
6. Pronto! O dispositivo está conectado

## Estrutura de arquivos

```
whatsapp-server/
├── package.json    # Dependências
├── server.js       # Servidor principal
├── .wwebjs_auth/   # Sessões salvas (criado automaticamente)
└── README.md       # Este arquivo
```

## Deploy em VPS (Exemplo com PM2)

```bash
# Instalar PM2
npm install -g pm2

# Iniciar servidor
pm2 start server.js --name whatsapp-server

# Ver logs
pm2 logs whatsapp-server

# Reiniciar
pm2 restart whatsapp-server
```

## Troubleshooting

### Erro "Chromium not found"
```bash
# No Ubuntu/Debian
sudo apt-get install -y chromium-browser

# No Windows - instalar Chrome
```

### Erro de permissão (Linux)
```bash
sudo chmod -R 777 .wwebjs_auth
```
