import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrialExpiringRequest {
  email: string;
  name: string;
  daysLeft: number;
  restaurantName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, daysLeft, restaurantName }: TrialExpiringRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const appUrl = Deno.env.get("APP_URL") || "https://gourmetflow.com.br";
    const urgency = daysLeft <= 3 ? "🚨" : "⚠️";
    const subject = daysLeft === 1 
      ? `${urgency} Último dia do seu trial no GourmetFlow!`
      : `${urgency} Seu trial expira em ${daysLeft} dias`;

    const emailResponse = await resend.emails.send({
      from: "GourmetFlow <noreply@gourmetflow.com.br>",
      to: [email],
      subject,
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
            .alert { background: ${daysLeft <= 3 ? '#fee2e2' : '#fef3c7'}; border-left: 4px solid ${daysLeft <= 3 ? '#ef4444' : '#f59e0b'}; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .button { display: inline-block; background: #e53e3e; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; margin: 20px 0; font-weight: bold; }
            .plans { background: #fff; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .plan { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .plan:last-child { border-bottom: none; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .countdown { font-size: 48px; font-weight: bold; color: ${daysLeft <= 3 ? '#ef4444' : '#f59e0b'}; text-align: center; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍴 GourmetFlow</h1>
            </div>
            
            <div class="content">
              <h2>Olá, ${name || 'Parceiro'}!</h2>
              
              <div class="alert">
                <strong>${daysLeft === 1 ? '⏰ Último dia!' : `Restam ${daysLeft} dias`}</strong><br>
                Seu período de teste ${restaurantName ? `do "${restaurantName}"` : ''} está chegando ao fim.
              </div>
              
              <div class="countdown">${daysLeft}</div>
              <p style="text-align: center; margin-top: -10px; color: #666;">dia${daysLeft > 1 ? 's' : ''} restante${daysLeft > 1 ? 's' : ''}</p>
              
              <p>Para não perder acesso às suas configurações, cardápio e histórico de pedidos, escolha um plano agora:</p>
              
              <div class="plans">
                <div class="plan">
                  <span><strong>Essencial</strong> - Delivery e Balcão</span>
                  <span>R$ 149/mês</span>
                </div>
                <div class="plan">
                  <span><strong>Essencial + Mesas</strong> - Com Salão</span>
                  <span>R$ 249/mês</span>
                </div>
                <div class="plan">
                  <span><strong>Customizado</strong> - Completo</span>
                  <span>R$ 399/mês</span>
                </div>
              </div>
              
              <center>
                <a href="${appUrl}/planos" class="button">Escolher Plano →</a>
              </center>
              
              <p style="font-size: 14px; color: #666; text-align: center;">
                🔒 Seus dados estão seguros. Após escolher um plano, tudo continua exatamente como você configurou.
              </p>
            </div>
            
            <div class="footer">
              <p>Dúvidas sobre os planos? Responda este e-mail.</p>
              <p>© ${new Date().getFullYear()} GourmetFlow. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Trial expiring email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-trial-expiring-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
