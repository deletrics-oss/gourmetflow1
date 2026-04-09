# Walkthrough V8: Migração para SDK Oficial do Gemini

Esta atualização implementa a solução definitiva para os erros de conexão com a IA do Google.

## 🤖 Google AI SDK (Migrado)
- **Mudança:** Substituímos chamadas manuais `fetch` pela biblioteca oficial `@google/generative-ai`.
- **Benefício:** Eliminação total dos erros 404 (Not Found). O SDK gerencia automaticamente endpoints e protocolos de autenticação.
- **Modelos:** Mantido o `gemini-1.5-flash` para velocidade e baixo custo.

## 📡 Transparência de Links (Canais de Venda)
- **Status:** A aba "Canais de Venda" foi integrada em `Integrações`.
- **Ação:** Requer `npm run build` na VPS para tornar-se visível no frontend.

## 🛠️ Procedimento de Instalação (Crítico)
Como adicionamos uma nova biblioteca, o comando de atualização mudou:
1. `git pull origin main`
2. `cd whatsapp-server && npm install` (Novo passo obrigatório)
3. `npm run build` (Para atualizar a UI)
4. `pm2 restart all`
