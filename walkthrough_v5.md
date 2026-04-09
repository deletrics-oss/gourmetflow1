# Walkthrough: Sincronização Multi-Tenant e Resiliência SDR (V5)

Esta atualização resolve os problemas de isolamento de links para novos usuários e recupera a operação do SDR (WhatsApp).

## 🤖 SDR: Fim dos Erros de "Multiple Rows"
O atendimento automático estava ignorando mensagens da instância **"atendimento12"** devido a duplicidades no banco de dados.
- **Antes:** O servidor usava uma busca rigorosa que travava se encontrasse dois registros com o mesmo nome.
- **Depois:** Implementamos uma busca resiliente com `.limit(1)`. O sistema agora ignora registros órfãos e foca no registro ativo, garantindo que o Webhook seja processado e a IA responda.

## 🔗 Links Externos: Isolamento de Restaurantes
Os links de Balcão, Totem e Tablet eram genéricos e não funcionavam para novos inquilinos.
- **Antes:** O link era fixo (ex: `/totem`), e o sistema não sabia qual restaurante carregar.
- **Depois:** Injetamos dinamicamente o `restaurantId` em todos os botões de telas externas. Agora, ao clicar em "Abrir Balcão Externo", o link gerado será algo como `/balcao-externo?restaurantId=uuid-do-restaurante`.

---

## 🔔 Ações Necessárias
- **Build no VPS:** É obrigatório rodar `npm run build` no servidor para que os botões comecem a gerar os links com os IDs corretos.
- **Restart SDR:** Rode `pm2 restart all` para que as novas regras de busca de dispositivos entrem em vigor.
