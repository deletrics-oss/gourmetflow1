import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NFCeItem {
  nome: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  ncm?: string;
  cfop?: string;
}

interface NFCePayload {
  order_id: string;
  restaurant_id: string;
  cliente_cpf?: string;
  cliente_nome?: string;
  itens: NFCeItem[];
  valor_total: number;
  forma_pagamento: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: NFCePayload = await req.json();
    console.log('📄 [emit-nfce] Recebido payload:', JSON.stringify(payload, null, 2));

    // Buscar configurações NFC-e do restaurante
    const { data: nfceSettings, error: settingsError } = await supabase
      .from('nfce_settings')
      .select('*')
      .eq('restaurant_id', payload.restaurant_id)
      .single();

    if (settingsError || !nfceSettings) {
      console.error('❌ [emit-nfce] Configurações NFC-e não encontradas:', settingsError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Configurações NFC-e não encontradas. Configure em Nota Fiscal > Configurações.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!nfceSettings.is_active) {
      console.log('⚠️ [emit-nfce] NFC-e não está ativa para este restaurante');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'NFC-e não está ativada. Ative em Nota Fiscal > Configurações.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar token Focus NFe das secrets ou configurações
    const focusToken = Deno.env.get('FOCUS_NFE_TOKEN');
    const ambiente = Deno.env.get('FOCUS_NFE_AMBIENTE') || nfceSettings.environment || 'homologacao';

    if (!focusToken) {
      console.error('❌ [emit-nfce] Token Focus NFe não configurado');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Token Focus NFe não configurado. Adicione FOCUS_NFE_TOKEN nas configurações.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Incrementar número da nota
    const novoNumeroNota = (nfceSettings.last_nf_number || 0) + 1;

    // Montar payload para Focus NFe
    const focusPayload = {
      natureza_operacao: "VENDA AO CONSUMIDOR",
      forma_pagamento: "0", // 0 = à vista
      tipo_documento: "1", // 1 = NFC-e
      finalidade_emissao: "1", // 1 = Normal
      consumidor_final: "1", // 1 = Sim
      presenca_comprador: "1", // 1 = Presencial
      
      cnpj_emitente: nfceSettings.cnpj?.replace(/\D/g, ''),
      
      // Dados do destinatário (opcional)
      ...(payload.cliente_cpf && {
        cpf_destinatario: payload.cliente_cpf.replace(/\D/g, ''),
        nome_destinatario: payload.cliente_nome || "CONSUMIDOR"
      }),
      
      // Itens
      itens: payload.itens.map((item, index) => ({
        numero_item: String(index + 1),
        codigo_produto: String(index + 1).padStart(6, '0'),
        descricao: item.nome.substring(0, 120),
        quantidade_comercial: String(item.quantidade.toFixed(4)),
        quantidade_tributavel: String(item.quantidade.toFixed(4)),
        valor_unitario_comercial: String(item.valor_unitario.toFixed(2)),
        valor_unitario_tributavel: String(item.valor_unitario.toFixed(2)),
        valor_bruto: String(item.valor_total.toFixed(2)),
        unidade_comercial: "UN",
        unidade_tributavel: "UN",
        ncm: item.ncm || "21069090", // NCM padrão para alimentos preparados
        cfop: item.cfop || "5102", // CFOP padrão para venda
        icms_situacao_tributaria: "102", // Simples Nacional
        icms_origem: "0", // Nacional
        pis_situacao_tributaria: "49", // Outras operações
        cofins_situacao_tributaria: "49" // Outras operações
      })),
      
      // Formas de pagamento
      formas_pagamento: [{
        forma_pagamento: mapFormaPagamento(payload.forma_pagamento),
        valor_pagamento: String(payload.valor_total.toFixed(2))
      }],
      
      // Valores totais
      valor_produtos: String(payload.valor_total.toFixed(2)),
      valor_total: String(payload.valor_total.toFixed(2)),
      
      // Informações adicionais
      informacoes_adicionais_contribuinte: `Pedido: ${payload.order_id}`
    };

    console.log('📤 [emit-nfce] Enviando para Focus NFe:', JSON.stringify(focusPayload, null, 2));

    // Determinar URL baseado no ambiente
    const baseUrl = ambiente === 'producao' 
      ? 'https://api.focusnfe.com.br' 
      : 'https://homologacao.focusnfe.com.br';

    // Fazer requisição para Focus NFe
    const focusResponse = await fetch(`${baseUrl}/v2/nfce?ref=${payload.order_id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(focusToken + ':')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(focusPayload)
    });

    const focusResult = await focusResponse.json();
    console.log('📥 [emit-nfce] Resposta Focus NFe:', JSON.stringify(focusResult, null, 2));

    if (!focusResponse.ok || focusResult.erros) {
      const errorMsg = focusResult.erros 
        ? focusResult.erros.map((e: any) => e.mensagem).join(', ')
        : focusResult.mensagem || 'Erro desconhecido';

      // Salvar nota com status de erro
      await supabase.from('nfce_issued').insert({
        restaurant_id: payload.restaurant_id,
        order_id: payload.order_id,
        nf_number: String(novoNumeroNota),
        serie: nfceSettings.serie_number || '1',
        status: 'rejeitada',
        total_value: payload.valor_total,
        error_message: errorMsg,
        ambiente: ambiente,
        resposta_sefaz: focusResult
      });

      console.error('❌ [emit-nfce] Erro Focus NFe:', errorMsg);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Erro SEFAZ: ${errorMsg}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Aguardar processamento (polling)
    let nfceData = null;
    let tentativas = 0;
    const maxTentativas = 10;

    while (tentativas < maxTentativas) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos

      const statusResponse = await fetch(`${baseUrl}/v2/nfce/${payload.order_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(focusToken + ':')}`
        }
      });

      const statusResult = await statusResponse.json();
      console.log(`🔄 [emit-nfce] Status tentativa ${tentativas + 1}:`, statusResult.status);

      if (statusResult.status === 'autorizado') {
        nfceData = statusResult;
        break;
      } else if (statusResult.status === 'erro_autorizacao') {
        throw new Error(statusResult.mensagem_sefaz || 'Erro na autorização');
      }

      tentativas++;
    }

    if (!nfceData) {
      throw new Error('Timeout aguardando autorização da NFC-e');
    }

    // Salvar nota autorizada no banco
    const { data: nfceRecord, error: insertError } = await supabase
      .from('nfce_issued')
      .insert({
        restaurant_id: payload.restaurant_id,
        order_id: payload.order_id,
        nf_number: String(nfceData.numero || novoNumeroNota),
        serie: nfceData.serie || nfceSettings.serie_number || '1',
        chave_acesso: nfceData.chave_nfe,
        protocol: nfceData.protocolo,
        status: 'autorizada',
        total_value: payload.valor_total,
        authorization_date: new Date().toISOString(),
        xml_content: nfceData.caminho_xml_nota_fiscal,
        ambiente: ambiente,
        resposta_sefaz: nfceData
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ [emit-nfce] Erro ao salvar NFC-e:', insertError);
    }

    // Atualizar último número de nota
    await supabase
      .from('nfce_settings')
      .update({ last_nf_number: parseInt(nfceData.numero || novoNumeroNota) })
      .eq('restaurant_id', payload.restaurant_id);

    console.log('✅ [emit-nfce] NFC-e autorizada com sucesso!');

    return new Response(JSON.stringify({
      success: true,
      nfce: {
        numero: nfceData.numero,
        serie: nfceData.serie,
        chave_acesso: nfceData.chave_nfe,
        protocolo: nfceData.protocolo,
        url_danfe: nfceData.caminho_danfe,
        url_xml: nfceData.caminho_xml_nota_fiscal,
        qrcode_url: nfceData.url_qrcode || `https://www.sefaz.rs.gov.br/nfce/consulta?chave=${nfceData.chave_nfe}`
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ [emit-nfce] Erro:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error?.message || 'Erro interno ao emitir NFC-e' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Mapear forma de pagamento para código SEFAZ
function mapFormaPagamento(forma: string): string {
  const mapa: Record<string, string> = {
    'cash': '01', // Dinheiro
    'credit_card': '03', // Cartão de Crédito
    'debit_card': '04', // Cartão de Débito
    'pix': '17', // PIX
    'pending': '99' // Outros
  };
  return mapa[forma] || '01';
}
