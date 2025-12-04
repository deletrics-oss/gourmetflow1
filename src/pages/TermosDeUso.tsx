import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Utensils } from "lucide-react";
import { Link } from "react-router-dom";

export default function TermosDeUso() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Utensils className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">GourmetFlow</span>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Termos de Uso</CardTitle>
            <p className="text-sm text-muted-foreground">Última atualização: Dezembro de 2024</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Aceitação dos Termos</h2>
              <p className="text-muted-foreground">
                Ao acessar e utilizar a plataforma GourmetFlow, você concorda com estes Termos de Uso. 
                Se não concordar com qualquer parte destes termos, não utilize nossos serviços.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">2. Descrição do Serviço</h2>
              <p className="text-muted-foreground">
                O GourmetFlow é um sistema de gestão para restaurantes, bares e estabelecimentos alimentícios 
                que oferece funcionalidades como: Ponto de Venda (PDV), gestão de mesas e comandas, 
                controle de cozinha, delivery, relatórios e outras ferramentas de gestão.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">3. Cadastro e Conta</h2>
              <p className="text-muted-foreground">
                Para utilizar o GourmetFlow, você deve criar uma conta fornecendo informações verdadeiras 
                e completas. Você é responsável por manter a confidencialidade de suas credenciais de acesso 
                e por todas as atividades realizadas em sua conta.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">4. Planos e Pagamentos</h2>
              <p className="text-muted-foreground">
                O GourmetFlow oferece diferentes planos de assinatura. Os valores e funcionalidades de cada 
                plano estão descritos em nossa página de preços. Os pagamentos são processados mensalmente 
                e podem ser feitos via cartão de crédito, PIX ou boleto bancário.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">5. Período de Trial</h2>
              <p className="text-muted-foreground">
                Novos usuários têm direito a 30 dias de teste gratuito com acesso a todas as funcionalidades. 
                Ao final do período de trial, será necessário escolher um plano pago para continuar utilizando 
                o sistema.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">6. Responsabilidades do Usuário</h2>
              <ul className="text-muted-foreground list-disc pl-6 space-y-1">
                <li>Manter suas credenciais de acesso seguras</li>
                <li>Utilizar o sistema de forma lícita e ética</li>
                <li>Não compartilhar acesso com terceiros não autorizados</li>
                <li>Manter backup de seus dados quando necessário</li>
                <li>Cumprir a legislação fiscal aplicável ao seu estabelecimento</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">7. Propriedade Intelectual</h2>
              <p className="text-muted-foreground">
                Todo o conteúdo, código, design e funcionalidades do GourmetFlow são propriedade exclusiva 
                da empresa. O uso da plataforma não confere ao usuário nenhum direito sobre a propriedade 
                intelectual do sistema.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">8. Limitação de Responsabilidade</h2>
              <p className="text-muted-foreground">
                O GourmetFlow não se responsabiliza por: danos decorrentes de mau uso do sistema, 
                interrupções de serviço causadas por terceiros, perda de dados por falha do usuário 
                em realizar backups, ou problemas decorrentes de integrações com sistemas externos.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">9. Cancelamento</h2>
              <p className="text-muted-foreground">
                O usuário pode cancelar sua assinatura a qualquer momento. O cancelamento será efetivado 
                ao final do período já pago. Não há reembolso para períodos parciais. Os dados do usuário 
                serão mantidos por 30 dias após o cancelamento.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">10. Modificações nos Termos</h2>
              <p className="text-muted-foreground">
                Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações 
                significativas serão comunicadas por email. O uso contínuo do sistema após modificações 
                constitui aceitação dos novos termos.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">11. Lei Aplicável e Foro</h2>
              <p className="text-muted-foreground">
                Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa 
                será resolvida no foro da comarca de São Paulo, SP, com exclusão de qualquer outro.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">12. Contato</h2>
              <p className="text-muted-foreground">
                Para dúvidas sobre estes Termos de Uso, entre em contato conosco pelo email: 
                contato@gourmetflow.com.br
              </p>
            </section>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 GourmetFlow. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}