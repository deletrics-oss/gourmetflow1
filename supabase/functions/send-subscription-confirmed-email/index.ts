import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriptionConfirmedRequest {
  email: string;
  name: string;
  planName: string;
  planPrice: number;
  nextPaymentDate: string;
  restaurantName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, planName, planPrice, nextPaymentDate, restaurantName }: SubscriptionConfirmedRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const appUrl = Deno.env.get("APP_URL") || "https://gourmetflow.com.br";

    const emailResponse = await resend.emails.send({
      from: "GourmetFlow <noreply@gourmetflow.com.br>",
      to: [email],
      subject: "✅ Assinatura Confirmada - GourmetFlow",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #e53e3e; margin: 0; }
            .content { background: #f8f9fa; border-radius: 8px; padding: 30px; }
            .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .button { display: inline-block; background: #e53e3e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
            .invoice { background: #fff; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .invoice-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .invoice-row:last-child { border-bottom: none; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍴 GourmetFlow</h1>
            </div>
            
            <div class="content">
              <div class="success">
                <strong>✅ Pagamento Confirmado!</strong><br>
                Sua assinatura está ativa.
              </div>
              
              <h2>Olá, ${name || 'Parceiro'}!</h2>
              
              <p>Obrigado por assinar o GourmetFlow! ${restaurantName ? `Seu restaurante "${restaurantName}" agora tem acesso completo.` : 'Sua conta agora tem acesso completo.'}</p>
              
              <div class="invoice">
                <h3 style="margin-top: 0;">Detalhes da Assinatura</h3>
                <div class="invoice-row">
                  <span>Plano</span>
                  <span>${planName}</span>
                </div>
                <div class="invoice-row">
                  <span>Valor Mensal</span>
                  <span>R$ ${planPrice.toFixed(2)}</span>
                </div>
                <div class="invoice-row">
                  <span>Próxima Cobrança</span>
                  <span>${nextPaymentDate}</span>
                </div>
              </div>
              
              <p><strong>O que você pode fazer agora:</strong></p>
              <ul>
                <li>Acessar todas as funcionalidades do plano ${planName}</li>
                <li>Gerenciar sua assinatura em "Planos"</li>
                <li>Baixar suas notas fiscais</li>
              </ul>
              
              <center>
                <a href="${appUrl}/dashboard" class="button">Acessar o Painel →</a>
              </center>
              
              <p style="font-size: 14px; color: #666;">
                Para gerenciar sua assinatura (alterar plano, atualizar cartão, cancelar), acesse <a href="${appUrl}/planos">Planos</a>.
              </p>
            </div>
            
            <div class="footer">
              <p>Este é um e-mail automático. Se você não realizou esta assinatura, entre em contato imediatamente.</p>
              <p>© ${new Date().getFullYear()} GourmetFlow. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Subscription confirmed email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-subscription-confirmed-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
