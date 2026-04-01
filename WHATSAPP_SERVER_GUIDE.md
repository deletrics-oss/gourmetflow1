# Guia de Integração - Servidor WhatsApp Node.js

## 🎯 Objetivo
Seu servidor WhatsApp Node.js (`whatsappManager.js`) rodando em `http://72.60.246.250:3012` precisa **receber chamadas do Lovable** para enviar mensagens.

## 📋 Endpoints Necessários

### 1. **Autenticação** (JÁ EXISTE?)
```javascript
// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === process.env.WHATSAPP_SERVER_USER && 
      password === process.env.WHATSAPP_SERVER_PASSWORD) {
    const token = jwt.sign({ user: username }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});
```

### 2. **Enviar Mensagem Individual** (NOVO - PRECISA CRIAR)
```javascript
// POST /api/send-message
// Headers: Authorization: Bearer <token>
// Body: { phone, message, deviceId }

app.post('/api/send-message', authenticateToken, async (req, res) => {
  const { phone, message, deviceId } = req.body;
  
  if (!phone || !message) {
    return res.status(400).json({ error: 'Phone and message required' });
  }

  const sessionId = deviceId || 'default';
  const success = await sendMessage(sessionId, phone, message);
  
  if (success) {
    res.json({ success: true, phone, message: 'Message sent' });
  } else {
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});
```

### 3. **Webhook para Mensagens Recebidas** (OPCIONAL - FUTURO)
```javascript
// POST /api/webhook/lovable
// Este endpoint ENVIA mensagens recebidas para o Lovable

app.post('/api/webhook/lovable', authenticateToken, async (req, res) => {
  const { from, message, sessionId } = req.body;
  
  // Enviar para Lovable backend
  try {
    await fetch('https://npxhdsodvboqxrauwuwy.supabase.co/functions/v1/whatsapp-webhook', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        message,
        sessionId,
        receivedAt: new Date().toISOString()
      })
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error forwarding to Lovable:', error);
    res.status(500).json({ error: 'Failed to forward message' });
  }
});
```

### 4. **Middleware de Autenticação**
```javascript
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}
```

## 🔧 Variáveis de Ambiente (.env)

Adicione ao seu `.env`:
```env
WHATSAPP_SERVER_USER=admin
WHATSAPP_SERVER_PASSWORD=SuaSenhaSegura123
JWT_SECRET=ChaveSecretaParaJWT
LOVABLE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📦 Dependências Necessárias

```bash
npm install express jsonwebtoken body-parser cors
```

## 🔄 Fluxo de Integração

### Envio de Mensagens (Lovable → Seu Servidor)
```
[Lovable Edge Function] 
  → POST /api/auth/login 
  → Recebe Token JWT
  → POST /api/send-message (com token)
  → [Seu whatsappManager.js] envia via whatsapp-web.js
  → Mensagem entregue ao cliente
```

### Recebimento de Mensagens (Seu Servidor → Lovable) [FUTURO]
```
[whatsapp-web.js recebe mensagem]
  → [whatsappManager.js processa]
  → POST /api/webhook/lovable (interno)
  → Webhook envia para Lovable
  → [Lovable salva no banco de dados]
```

## ✅ Como Testar

1. **Teste de Autenticação**
```bash
curl -X POST http://72.60.246.250:3012/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"SuaSenhaSegura123"}'
```

2. **Teste de Envio de Mensagem**
```bash
curl -X POST http://72.60.246.250:3012/api/send-message \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999",
    "message": "Teste de integração Lovable",
    "deviceId": "default"
  }'
```

## 🚨 Segurança

- ✅ **SEMPRE** use HTTPS em produção (atualmente HTTP)
- ✅ Use senhas fortes no `.env`
- ✅ Implemente rate limiting
- ✅ Valide todos os inputs
- ✅ Use tokens JWT com expiração curta

## 📝 Notas Importantes

1. **Seu código atual (`whatsappManager.js`)** já tem a função `sendMessage()` - você só precisa expor ela via API REST.

2. **Não altere a lógica do bot** - apenas adicione endpoints HTTP para comunicação externa.

3. **O Lovable NÃO pode rodar código Node.js** - por isso a integração via HTTP API.

4. **Mantenha o Gemini AI funcionando** - o Lovable só envia mensagens, o bot continua respondendo automaticamente.

## 🔗 Próximos Passos

1. [ ] Implementar `/api/send-message` no seu servidor
2. [ ] Configurar autenticação JWT
3. [ ] Testar envio de mensagem do Lovable
4. [ ] (Opcional) Implementar webhook de recebimento
5. [ ] Migrar para HTTPS

---

**Precisa de ajuda?** Me avise e posso gerar o código completo do servidor Express.js com todos os endpoints prontos!
