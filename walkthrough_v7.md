# Walkthrough V7: Estabilização Final e Canais de Venda

Esta versão consolida a segurança do ecossistema GourmetFlow e resolve a transparência de links para multi-tenant.

## 🤖 Gemini AI (Estabilizado)
- **Mudança:** Ajustado o modelo para `gemini-1.5-flash` (padrão estável) e endpoint `v1`.
- **Resultado:** Fim dos erros 404 e restauração total do atendimento automático.

## 🛡️ Resiliência de Dados
- **Mudança:** Expulsamos qualquer resquício de `.single()` ou `.maybeSingle()` das rotas críticas de dispositivos e motoboys.
- **Resultado:** O servidor agora ignora registros duplicados e mantém a fluidez operacional.

## 📡 Nova Aba: Canais de Venda
- **Localização:** `Menu > Integrações > Canais de Venda`
- **Funcionalidade:** Centralização de todos os links externos (Cardápio, Totem, Monitor, Tablet, Balcão).
- **Isolamento:** Todos os links agora exibem e permitem copiar a URL completa com o `restaurantId` injetado.

---

## ✅ Checklist de Verificação na VPS
1. [ ] `git pull` realizado com sucesso?
2. [ ] `npm run build` concluído sem erros?
3. [ ] `pm2 restart all` executado?
4. [ ] Gemini respondendo "Oi" nos logs do PM2?
