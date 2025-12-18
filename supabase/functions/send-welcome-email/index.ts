import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name: string;
  restaurantName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, restaurantName }: WelcomeEmailRequest = await req.json();

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
      subject: "🎉 Bem-vindo ao GourmetFlow!",
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
            .highlight { background: #fff; border-left: 4px solid #e53e3e; padding: 15px; margin: 20px 0; }
            .button { display: inline-block; background: #e53e3e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
            .steps { list-style: none; padding: 0; }
            .steps li { padding: 10px 0; padding-left: 30px; position: relative; }
            .steps li:before { content: "✅"; position: absolute; left: 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍴 GourmetFlow</h1>
              <p>Sistema de Gestão para Restaurantes</p>
            </div>
            
            <div class="content">
              <h2>Olá, ${name || 'Parceiro'}!</h2>
              
              <p>Seja muito bem-vindo ao <strong>GourmetFlow</strong>! ${restaurantName ? `Seu restaurante "${restaurantName}" está pronto para usar.` : 'Sua conta foi criada com sucesso.'}</p>
              
              <div class="highlight">
                <strong>🎁 Você tem 30 dias grátis!</strong><br>
                Aproveite o período de teste para explorar todas as funcionalidades sem compromisso.
              </div>
              
              <h3>Próximos passos:</h3>
              <ul class="steps">
                <li>Complete a configuração do seu restaurante</li>
                <li>Cadastre seu cardápio</li>
                <li>Configure os métodos de pagamento</li>
                <li>Comece a receber pedidos!</li>
              </ul>
              
              <center>
                <a href="${appUrl}/dashboard" class="button">Acessar o Painel →</a>
              </center>
            </div>
            
            <div class="footer">
              <p>Dúvidas? Responda este e-mail ou acesse nossa central de ajuda.</p>
              <p>© ${new Date().getFullYear()} GourmetFlow. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-welcome-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
