export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audio_alerts: {
        Row: {
          audio_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          trigger_event: string
          updated_at: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_event: string
          updated_at?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_event?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cash_movements: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          movement_date: string | null
          payment_method: string
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          movement_date?: string | null
          payment_method: string
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          movement_date?: string | null
          payment_method?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number
          min_order_value: number
          type: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number
          min_order_value?: number
          type: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number
          min_order_value?: number
          type?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: Json | null
          cpf: string | null
          created_at: string | null
          id: string
          is_suspicious: boolean | null
          loyalty_points: number | null
          name: string
          notes: string | null
          phone: string
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          cpf?: string | null
          created_at?: string | null
          id?: string
          is_suspicious?: boolean | null
          loyalty_points?: number | null
          name: string
          notes?: string | null
          phone: string
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          cpf?: string | null
          created_at?: string | null
          id?: string
          is_suspicious?: boolean | null
          loyalty_points?: number | null
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          alert_sent: boolean | null
          category: string | null
          created_at: string | null
          current_quantity: number | null
          id: string
          last_alert_date: string | null
          min_quantity: number | null
          name: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          alert_sent?: boolean | null
          category?: string | null
          created_at?: string | null
          current_quantity?: number | null
          id?: string
          last_alert_date?: string | null
          min_quantity?: number | null
          name: string
          unit: string
          updated_at?: string | null
        }
        Update: {
          alert_sent?: boolean | null
          category?: string | null
          created_at?: string | null
          current_quantity?: number | null
          id?: string
          last_alert_date?: string | null
          min_quantity?: number | null
          name?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      item_variations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          menu_item_id: string | null
          name: string
          price_adjustment: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          menu_item_id?: string | null
          name: string
          price_adjustment?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          menu_item_id?: string | null
          name?: string
          price_adjustment?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_variations_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          created_at: string | null
          customer_id: string | null
          description: string | null
          id: string
          order_id: string | null
          points: number
          type: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          points: number
          type: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_order_history"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          available_hours: Json | null
          category_id: string | null
          created_at: string | null
          demo_images: Json | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          preparation_time: number | null
          price: number
          promotional_price: number | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          available_hours?: Json | null
          category_id?: string | null
          created_at?: string | null
          demo_images?: Json | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          preparation_time?: number | null
          price: number
          promotional_price?: number | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          available_hours?: Json | null
          category_id?: string | null
          created_at?: string | null
          demo_images?: Json | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          preparation_time?: number | null
          price?: number
          promotional_price?: number | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      monitor_settings: {
        Row: {
          audio_enabled: boolean | null
          audio_volume: number | null
          created_at: string | null
          id: string
          monitor_type: string
          slide_duration: number
          slides_config: Json | null
          updated_at: string | null
        }
        Insert: {
          audio_enabled?: boolean | null
          audio_volume?: number | null
          created_at?: string | null
          id?: string
          monitor_type: string
          slide_duration?: number
          slides_config?: Json | null
          updated_at?: string | null
        }
        Update: {
          audio_enabled?: boolean | null
          audio_volume?: number | null
          created_at?: string | null
          id?: string
          monitor_type?: string
          slide_duration?: number
          slides_config?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          menu_item_id: string | null
          name: string
          notes: string | null
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          name: string
          notes?: string | null
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          name?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string | null
          customer_notified: boolean | null
          id: string
          new_status: string
          old_status: string | null
          order_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_notified?: boolean | null
          id?: string
          new_status: string
          old_status?: string | null
          order_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_notified?: boolean | null
          id?: string
          new_status?: string
          old_status?: string | null
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          completed_at: string | null
          coupon_code: string | null
          coupon_discount: number | null
          created_at: string | null
          created_by: string | null
          customer_cpf: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: Json | null
          delivery_fee: number | null
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          discount: number | null
          id: string
          loyalty_points_earned: number | null
          loyalty_points_used: number | null
          notes: string | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          scheduled_for: string | null
          service_fee: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number | null
          table_id: string | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_cpf?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          discount?: number | null
          id?: string
          loyalty_points_earned?: number | null
          loyalty_points_used?: number | null
          notes?: string | null
          order_number: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          scheduled_for?: string | null
          service_fee?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          table_id?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_cpf?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          discount?: number | null
          id?: string
          loyalty_points_earned?: number | null
          loyalty_points_used?: number | null
          notes?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          scheduled_for?: string | null
          service_fee?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          table_id?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      restaurant_settings: {
        Row: {
          accept_scheduled_orders: boolean | null
          address: Json | null
          business_hours: Json | null
          city: string | null
          cnpj_cpf: string | null
          complement: string | null
          created_at: string | null
          delivery_options: Json | null
          dine_in_settings: Json | null
          id: string
          instagram: string | null
          is_active: boolean | null
          logo_url: string | null
          loyalty_enabled: boolean | null
          loyalty_points_per_real: number | null
          loyalty_redemption_value: number | null
          name: string
          neighborhood: string | null
          number: string | null
          paghiper_api_key: string | null
          payment_methods: Json | null
          phone: string | null
          responsible_name: string | null
          segment: string | null
          state: string | null
          street: string | null
          updated_at: string | null
          whatsapp_api_key: string | null
          zipcode: string | null
        }
        Insert: {
          accept_scheduled_orders?: boolean | null
          address?: Json | null
          business_hours?: Json | null
          city?: string | null
          cnpj_cpf?: string | null
          complement?: string | null
          created_at?: string | null
          delivery_options?: Json | null
          dine_in_settings?: Json | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          loyalty_enabled?: boolean | null
          loyalty_points_per_real?: number | null
          loyalty_redemption_value?: number | null
          name: string
          neighborhood?: string | null
          number?: string | null
          paghiper_api_key?: string | null
          payment_methods?: Json | null
          phone?: string | null
          responsible_name?: string | null
          segment?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
          whatsapp_api_key?: string | null
          zipcode?: string | null
        }
        Update: {
          accept_scheduled_orders?: boolean | null
          address?: Json | null
          business_hours?: Json | null
          city?: string | null
          cnpj_cpf?: string | null
          complement?: string | null
          created_at?: string | null
          delivery_options?: Json | null
          dine_in_settings?: Json | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          loyalty_enabled?: boolean | null
          loyalty_points_per_real?: number | null
          loyalty_redemption_value?: number | null
          name?: string
          neighborhood?: string | null
          number?: string | null
          paghiper_api_key?: string | null
          payment_methods?: Json | null
          phone?: string | null
          responsible_name?: string | null
          segment?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
          whatsapp_api_key?: string | null
          zipcode?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: Json | null
          cnpj_cpf: string | null
          created_at: string | null
          email: string | null
          id: string
          is_suspicious: boolean | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          cnpj_cpf?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_suspicious?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          cnpj_cpf?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_suspicious?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tables: {
        Row: {
          capacity: number | null
          created_at: string | null
          id: string
          number: number
          status: Database["public"]["Enums"]["table_status"] | null
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          id?: string
          number: number
          status?: Database["public"]["Enums"]["table_status"] | null
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          id?: string
          number?: number
          status?: Database["public"]["Enums"]["table_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_access: boolean
          created_at: string | null
          id: string
          screen_path: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_access?: boolean
          created_at?: string | null
          id?: string
          screen_path: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_access?: boolean
          created_at?: string | null
          id?: string
          screen_path?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          theme: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          theme?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          theme?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      customer_order_history: {
        Row: {
          cancelled_orders: number | null
          completed_orders: number | null
          customer_id: string | null
          last_order_date: string | null
          name: string | null
          phone: string | null
          total_orders: number | null
          total_spent: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "kitchen" | "waiter"
      delivery_type: "delivery" | "pickup" | "dine_in"
      order_status:
        | "new"
        | "confirmed"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "completed"
        | "cancelled"
      payment_method:
        | "cash"
        | "credit_card"
        | "debit_card"
        | "pix"
        | "paghiper"
        | "pending"
      table_status: "free" | "occupied" | "reserved"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "kitchen", "waiter"],
      delivery_type: ["delivery", "pickup", "dine_in"],
      order_status: [
        "new",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "completed",
        "cancelled",
      ],
      payment_method: [
        "cash",
        "credit_card",
        "debit_card",
        "pix",
        "paghiper",
        "pending",
      ],
      table_status: ["free", "occupied", "reserved"],
    },
  },
} as const
