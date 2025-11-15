import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Brain, MessageCircle, Users, Clock, TrendingUp, Zap } from "lucide-react";

export default function WhatsAppBot() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
            <Bot className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent">
            Diggy Bot
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transforme seu WhatsApp em um assistente inteligente que atende seus clientes 24/7
          </p>
          <Badge variant="outline" className="bg-gradient-to-r from-pink-50 to-pink-100 border-pink-200">
            <Brain className="h-3 w-3 mr-1" />
            Com Inteligência Artificial
          </Badge>
        </div>

        {/* Trial Badge */}
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-500 rounded-full p-2">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-green-900">7 dias de teste gratuito</h3>
                <p className="text-sm text-green-800">
                  Experimente todos os recursos sem compromisso. Cancele quando quiser.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* AI Features */}
          <Card className="bg-gradient-to-br from-pink-50 to-white">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-pink-100 p-3 rounded-lg">
                  <Brain className="h-6 w-6 text-pink-600" />
                </div>
                <h2 className="text-xl font-bold">Inteligência Artificial</h2>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Respostas automáticas inteligentes</p>
                    <p className="text-sm text-muted-foreground">
                      O bot entende o contexto e responde de forma natural
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Aprendizado contínuo</p>
                    <p className="text-sm text-muted-foreground">
                      Melhora com cada interação
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Atendimento rápido</p>
                    <p className="text-sm text-muted-foreground">
                      Responde em segundos
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp Integration */}
          <Card className="bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-3 rounded-lg">
                  <MessageCircle className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-xl font-bold">Integração WhatsApp</h2>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Conexão direta com WhatsApp</p>
                    <p className="text-sm text-muted-foreground">
                      Use seu número comercial existente
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Gestão de conversas</p>
                    <p className="text-sm text-muted-foreground">
                      Visualize e gerencie todas as conversas
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Transferência para humano</p>
                    <p className="text-sm text-muted-foreground">
                      Passe conversas complexas para atendentes
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Benefits */}
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Benefícios para seu negócio</h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-pink-600 mb-2">24/7</div>
                <p className="text-sm font-semibold">Atendimento ininterrupto</p>
              </div>
              
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">80%</div>
                <p className="text-sm font-semibold">Redução no tempo de resposta</p>
              </div>
              
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">+300%</div>
                <p className="text-sm font-semibold">Aumento na satisfação</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-pink-500 to-pink-600 border-0 text-white">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Pronto para começar?</h2>
            <p className="mb-6 text-pink-50">
              Configure seu bot em menos de 5 minutos e comece a automatizar seus atendimentos hoje mesmo.
            </p>
            <Button size="lg" variant="secondary" className="bg-white text-pink-600 hover:bg-pink-50">
              <Bot className="h-5 w-5 mr-2" />
              Iniciar Integração
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
