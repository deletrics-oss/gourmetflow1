# Guia de Configuração de Secrets

## Supabase Edge Functions Secrets

Acesse: **Supabase Dashboard → Edge Functions → Secrets**

### Secrets Obrigatórios

```
GEMINI_API_KEY=AIzaSyDEhOzNG-us1JqlWvz8GRMHpeNtRGw0ya0
WHATSAPP_SERVER_URL=http://seu-servidor:3088
WHATSAPP_SERVER_USER=admin
WHATSAPP_SERVER_PASSWORD=sua-senha
```

### Secrets Opcionais (adicionar quando necessário)

```
RESEND_API_KEY=re_xxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
```

## Como Adicionar Secrets

1. Acesse https://supabase.com/dashboard/project/npxhdsodvboqxrauwuwy/settings/functions
2. Role até a seção "Edge Function Secrets"
3. Clique em "Add new secret"
4. Adicione cada secret acima com seu nome e valor

## Verificação

Após adicionar, os secrets estarão disponíveis como `Deno.env.get('NOME_DO_SECRET')` nas Edge Functions.

## Deploy das Edge Functions

```bash
# Instalar CLI (se ainda não tiver)
npm install -g supabase

# Login
supabase login

# Linkar ao projeto
supabase link --project-ref npxhdsodvboqxrauwuwy

# Deploy todas as functions
supabase functions deploy
```

## Lista de Edge Functions

- check-subscription
- cielo-payment
- create-checkout
- customer-portal
- emit-nfce
- extract-menu-from-image
- generate-menu-design
- generate-product-image
- mercadopago-payment
- nubank-payment
- pagseguro-payment
- pagseguro-webhook
- rede-payment
- send-subscription-confirmed-email
- send-trial-expiring-email
- send-welcome-email
- stone-payment
- test-gemini-key
- whatsapp-ai-order
- whatsapp-broadcast-queue
- whatsapp-create-device
- whatsapp-notify-motoboy
- whatsapp-notify-order
- whatsapp-notify-owner
- whatsapp-process-message
- whatsapp-reminders-cron
- whatsapp-save-message
- whatsapp-send
- whatsapp-send-mass
- whatsapp-server-proxy
- whatsapp-sync-device
- whatsapp-webhook
