import { supabase as supabaseClient } from '@/integrations/supabase/client';

// Wrapper para contornar erros de tipagem quando types.ts está vazio
export const supabase = {
  from: (table: string) => (supabaseClient as any).from(table),
  auth: supabaseClient.auth,
  channel: (name: string) => supabaseClient.channel(name),
  removeChannel: (channel: any) => supabaseClient.removeChannel(channel),
  storage: supabaseClient.storage,
  functions: supabaseClient.functions,
  rpc: (fn: string, params?: any) => (supabaseClient as any).rpc(fn, params),
};

export type { Database } from '@/integrations/supabase/types';
