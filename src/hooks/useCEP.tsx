import { useState } from 'react';
import { toast } from 'sonner';

interface CEPData {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export const useCEP = () => {
  const [loading, setLoading] = useState(false);

  const buscarCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    
    if (cleanCEP.length !== 8) {
      toast.error('CEP inválido. Deve conter 8 números.');
      return null;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data: CEPData = await response.json();
      
      if (data.erro) {
        toast.error('CEP não encontrado.');
        return null;
      }

      return {
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || ''
      };
    } catch (error) {
      console.error('Erro ao consultar CEP:', error);
      toast.error('Erro ao consultar o CEP. Tente novamente.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { buscarCEP, loading };
};
