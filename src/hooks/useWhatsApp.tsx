import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useWhatsApp = () => {
  const [sending, setSending] = useState(false);

  const sendMessage = async (phone: string, message: string, deviceId?: string) => {
    try {
      setSending(true);
      
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: { phone, message, deviceId }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error('Failed to send message');
      }

      toast.success('Mensagem enviada com sucesso!');
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      toast.error('Erro ao enviar mensagem');
      return false;
    } finally {
      setSending(false);
    }
  };

  const notifyOrderStatus = async (
    orderId: string,
    status: string,
    customerPhone: string,
    orderNumber: string,
    motoboy?: string
  ) => {
    try {
      const { error } = await supabase.functions.invoke('whatsapp-notify-order', {
        body: { orderId, status, customerPhone, orderNumber, motoboy }
      });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error notifying order:', error);
      return false;
    }
  };

  return {
    sendMessage,
    notifyOrderStatus,
    sending
  };
};
