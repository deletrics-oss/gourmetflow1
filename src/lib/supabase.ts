import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: 'admin' | 'manager' | 'kitchen' | 'waiter';
          created_at: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      menu_items: {
        Row: {
          id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          image_url: string | null;
          price: number;
          promotional_price: number | null;
          preparation_time: number;
          is_available: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
      };
      tables: {
        Row: {
          id: string;
          number: number;
          status: 'free' | 'occupied' | 'reserved';
          capacity: number;
          created_at: string;
          updated_at: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          customer_name: string | null;
          customer_phone: string | null;
          customer_cpf: string | null;
          delivery_type: 'delivery' | 'pickup' | 'dine_in';
          status: 'new' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
          table_id: string | null;
          subtotal: number;
          delivery_fee: number;
          service_fee: number;
          discount: number;
          total: number;
          payment_method: 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'paghiper' | 'pending';
          delivery_address: any | null;
          notes: string | null;
          scheduled_for: string | null;
          completed_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string | null;
          name: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          notes: string | null;
          created_at: string;
        };
      };
      inventory: {
        Row: {
          id: string;
          name: string;
          category: string | null;
          unit: string;
          current_quantity: number;
          min_quantity: number;
          alert_sent: boolean;
          last_alert_date: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      restaurant_settings: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          instagram: string | null;
          logo_url: string | null;
          cnpj_cpf: string | null;
          responsible_name: string | null;
          segment: string | null;
          address: any | null;
          business_hours: any | null;
          delivery_options: any | null;
          dine_in_settings: any | null;
          payment_methods: any | null;
          accept_scheduled_orders: boolean;
          whatsapp_api_key: string | null;
          paghiper_api_key: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};
