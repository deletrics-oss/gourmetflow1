import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Utensils, Shield } from "lucide-react";
import { Link } from "react-router-dom";

export default function PoliticaPrivacidade() {
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
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Política de Privacidade</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)
            </p>
            <p className="text-sm text-muted-foreground">Última atualização: Dezembro de 2024</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Informações que Coletamos</h2>
              <p className="text-muted-foreground mb-2">Coletamos as seguintes categorias de dados pessoais:</p>
              <ul className="text-muted-foreground list-disc pl-6 space-y-1">
                <li><strong>Dados de cadastro:</strong> nome, email, telefone, CNPJ/CPF</li>
                <li><strong>Dados do estabelecimento:</strong> nome do restaurante, endereço, informações fiscais</li>
                <li><strong>Dados de uso:</strong> logs de acesso, funcionalidades utilizadas</li>
                <li><strong>Dados de clientes do restaurante:</strong> nome, telefone, endereço de entrega, histórico de pedidos</li>
                <li><strong>Dados financeiros:</strong> informações de pagamento (processados por terceiros)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">2. Como Usamos suas Informações</h2>
              <p className="text-muted-foreground mb-2">Utilizamos os dados coletados para:</p>
              <ul className="text-muted-foreground list-disc pl-6 space-y-1">
                <li>Prestar os serviços contratados</li>
                <li>Processar pagamentos e emitir notas fiscais</li>
                <li>Enviar comunicações sobre o serviço</li>
                <li>Melhorar e personalizar a experiência do usuário</li>
                <li>Cumprir obrigações legais e regulatórias</li>
                <li>Gerar relatórios e análises para o estabelecimento</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">3. Base Legal para Tratamento</h2>
              <p className="text-muted-foreground">
                O tratamento de dados pessoais é realizado com base nas seguintes hipóteses legais previstas 
                na LGPD: execução de contrato (Art. 7º, V), cumprimento de obrigação legal (Art. 7º, II), 
                legítimo interesse (Art. 7º, IX) e consentimento quando aplicável (Art. 7º, I).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">4. Compartilhamento de Dados</h2>
              <p className="text-muted-foreground mb-2">Seus dados podem ser compartilhados com:</p>
              <ul className="text-muted-foreground list-disc pl-6 space-y-1">
                <li><strong>Processadores de pagamento:</strong> PagSeguro, Stripe (para processar transações)</li>
                <li><strong>Serviços de infraestrutura:</strong> provedores de hospedagem e banco de dados</li>
                <li><strong>Autoridades fiscais:</strong> quando necessário para emissão de NFC-e</li>
                <li><strong>Por determinação legal:</strong> quando exigido por lei ou autoridade competente</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Não vendemos ou comercializamos dados pessoais a terceiros para fins de marketing.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">5. Armazenamento e Segurança</h2>
              <p className="text-muted-foreground">
                Seus dados são armazenados em servidores seguros com criptografia em trânsito e em repouso. 
                Implementamos medidas técnicas e organizacionais para proteger seus dados contra acesso 
                não autorizado, alteração, divulgação ou destruição.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">6. Seus Direitos (LGPD Art. 18)</h2>
              <p className="text-muted-foreground mb-2">Você tem direito a:</p>
              <ul className="text-muted-foreground list-disc pl-6 space-y-1">
                <li><strong>Confirmação e acesso:</strong> saber se tratamos seus dados e acessá-los</li>
                <li><strong>Correção:</strong> corrigir dados incompletos, inexatos ou desatualizados</li>
                <li><strong>Anonimização ou eliminação:</strong> solicitar anonimização ou exclusão de dados desnecessários</li>
                <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado</li>
                <li><strong>Informação:</strong> saber com quem compartilhamos seus dados</li>
                <li><strong>Revogação:</strong> revogar consentimento a qualquer momento</li>
                <li><strong>Oposição:</strong> opor-se ao tratamento quando aplicável</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">7. Cookies e Tecnologias</h2>
              <p className="text-muted-foreground">
                Utilizamos cookies essenciais para o funcionamento do sistema, como manutenção de sessão 
                e preferências do usuário. Não utilizamos cookies de rastreamento para publicidade de terceiros.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">8. Retenção de Dados</h2>
              <p className="text-muted-foreground">
                Seus dados são mantidos enquanto você utilizar nossos serviços. Após o cancelamento da conta, 
                mantemos os dados por 30 dias para possível reativação. Dados fiscais são mantidos pelo prazo 
                legal de 5 anos. Após esses períodos, os dados são eliminados ou anonimizados.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">9. Transferência Internacional</h2>
              <p className="text-muted-foreground">
                Alguns de nossos provedores de serviços podem estar localizados em outros países. 
                Garantimos que qualquer transferência internacional de dados ocorra em conformidade 
                com a LGPD e com medidas adequadas de proteção.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">10. Alterações nesta Política</h2>
              <p className="text-muted-foreground">
                Esta política pode ser atualizada periodicamente. Notificaremos sobre alterações 
                significativas por email ou aviso em nosso sistema. Recomendamos revisar esta 
                política regularmente.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">11. Encarregado de Dados (DPO)</h2>
              <p className="text-muted-foreground">
                Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento de seus dados 
                pessoais, entre em contato com nosso Encarregado de Proteção de Dados:
              </p>
              <div className="bg-muted/50 p-4 rounded-lg mt-2">
                <p className="text-sm"><strong>Email:</strong> privacidade@gourmetflow.com.br</p>
                <p className="text-sm"><strong>Telefone:</strong> (11) 0000-0000</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">12. Autoridade Nacional</h2>
              <p className="text-muted-foreground">
                Você também pode entrar em contato com a Autoridade Nacional de Proteção de Dados (ANPD) 
                para reclamações ou denúncias relacionadas ao tratamento de seus dados pessoais.
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