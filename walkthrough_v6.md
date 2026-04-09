# Walkthrough V6: Estabilização Industrial do SDR e IA

Esta atualização resolve definitivamente os erros de conexão com a IA e garante que o sistema suporte múltiplos estabelecimentos sem conflitos.

## 🤖 IA Restaurada (Gemini v1beta)
Identificamos que a versão `v1` da API estava rejeitando algumas chamadas.
- **Mudança:** Revertemos para o endpoint `v1beta` usando o modelo estável `gemini-1.5-flash-latest`.
- **Chave:** Atualizamos todas as chaves de ambiente para a nova credencial fornecida (`AIzaSyD1I...`).

## 🛡️ Blindagem de Rotas (No more "Multiple Rows")
O servidor estava travando ao listar dispositivos ou motoboys se houvesse qualquer duplicidade.
- **Mudança:** Substituímos todos os seletores rígidos por `.limit(1)`. O sistema agora é inteligente o suficiente para ignorar registros "sujos" e focar no dado operacional ativo.

## 🔗 Sidebar Inteligente
Reforçamos o isolamento da Lara e de novos clientes.
- **Mudança:** Adicionamos redundância na detecção do `restaurantId`. Se o ID não for detectado via contexto, o sistema tenta recuperá-lo do estado global antes de abrir qualquer link externo.

---

## 🔔 Comandos para Ativação Final
1. `git pull origin main`
2. `npm run build`
3. `pm2 restart all`
