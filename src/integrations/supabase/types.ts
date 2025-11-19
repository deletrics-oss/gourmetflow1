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
      access_levels: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          permissions: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          permissions?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          permissions?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
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
          restaurant_id: string | null
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
          restaurant_id?: string | null
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
          restaurant_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          restaurant_id: string | null
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
          restaurant_id?: string | null
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
          restaurant_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
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
          restaurant_id: string | null
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
          restaurant_id?: string | null
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
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          created_at: string | null
          fee: number
          id: string
          is_active: boolean
          max_distance: number
          min_distance: number
          restaurant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fee?: number
          id?: string
          is_active?: boolean
          max_distance: number
          min_distance?: number
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fee?: number
          id?: string
          is_active?: boolean
          max_distance?: number
          min_distance?: number
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          attachment_url: string | null
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          payment_method: string
          restaurant_id: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          category: string
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method: string
          restaurant_id?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string
          restaurant_id?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
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
          restaurant_id: string | null
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
          restaurant_id?: string | null
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
          restaurant_id?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
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
          restaurant_id: string | null
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
          restaurant_id?: string | null
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
          restaurant_id?: string | null
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
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
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
      motoboys: {
        Row: {
          cnh: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          restaurant_id: string | null
          updated_at: string | null
          vehicle_plate: string | null
        }
        Insert: {
          cnh?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          restaurant_id?: string | null
          updated_at?: string | null
          vehicle_plate?: string | null
        }
        Update: {
          cnh?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          restaurant_id?: string | null
          updated_at?: string | null
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "motoboys_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      nfce_issued: {
        Row: {
          authorization_date: string | null
          cancellation_date: string | null
          cancellation_reason: string | null
          chave_acesso: string | null
          created_at: string | null
          error_message: string | null
          id: string
          nf_number: string
          order_id: string | null
          protocol: string | null
          restaurant_id: string | null
          serie: string
          status: string | null
          total_value: number | null
          updated_at: string | null
          xml_content: string | null
        }
        Insert: {
          authorization_date?: string | null
          cancellation_date?: string | null
          cancellation_reason?: string | null
          chave_acesso?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          nf_number: string
          order_id?: string | null
          protocol?: string | null
          restaurant_id?: string | null
          serie: string
          status?: string | null
          total_value?: number | null
          updated_at?: string | null
          xml_content?: string | null
        }
        Update: {
          authorization_date?: string | null
          cancellation_date?: string | null
          cancellation_reason?: string | null
          chave_acesso?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          nf_number?: string
          order_id?: string | null
          protocol?: string | null
          restaurant_id?: string | null
          serie?: string
          status?: string | null
          total_value?: number | null
          updated_at?: string | null
          xml_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfce_issued_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfce_issued_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      nfce_settings: {
        Row: {
          certificate_data: string | null
          certificate_expiry: string | null
          certificate_password: string | null
          certificate_type: string | null
          cnpj: string | null
          created_at: string | null
          environment: string | null
          id: string
          ie: string | null
          im: string | null
          is_active: boolean | null
          last_nf_number: number | null
          regime_tributario: string | null
          restaurant_id: string | null
          serie_number: string | null
          updated_at: string | null
        }
        Insert: {
          certificate_data?: string | null
          certificate_expiry?: string | null
          certificate_password?: string | null
          certificate_type?: string | null
          cnpj?: string | null
          created_at?: string | null
          environment?: string | null
          id?: string
          ie?: string | null
          im?: string | null
          is_active?: boolean | null
          last_nf_number?: number | null
          regime_tributario?: string | null
          restaurant_id?: string | null
          serie_number?: string | null
          updated_at?: string | null
        }
        Update: {
          certificate_data?: string | null
          certificate_expiry?: string | null
          certificate_password?: string | null
          certificate_type?: string | null
          cnpj?: string | null
          created_at?: string | null
          environment?: string | null
          id?: string
          ie?: string | null
          im?: string | null
          is_active?: boolean | null
          last_nf_number?: number | null
          regime_tributario?: string | null
          restaurant_id?: string | null
          serie_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfce_settings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
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
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: Json | null
          delivery_fee: number | null
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          discount: number | null
          id: string
          loyalty_points_earned: number | null
          loyalty_points_used: number | null
          motoboy_id: string | null
          notes: string | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          restaurant_id: string | null
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
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          discount?: number | null
          id?: string
          loyalty_points_earned?: number | null
          loyalty_points_used?: number | null
          motoboy_id?: string | null
          notes?: string | null
          order_number: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          restaurant_id?: string | null
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
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          discount?: number | null
          id?: string
          loyalty_points_earned?: number | null
          loyalty_points_used?: number | null
          motoboy_id?: string | null
          notes?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          restaurant_id?: string | null
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
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_order_history"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_motoboy_id_fkey"
            columns: ["motoboy_id"]
            isOneToOne: false
            referencedRelation: "motoboys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          payment_date: string | null
          status: string
          stripe_payment_id: string | null
          subscription_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          payment_date?: string | null
          status: string
          stripe_payment_id?: string | null
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          payment_date?: string | null
          status?: string
          stripe_payment_id?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          feature_key: string
          id: string
          plan_type: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          feature_key: string
          id?: string
          plan_type: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          feature_key?: string
          id?: string
          plan_type?: string
        }
        Relationships: []
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
          apify_api_key: string | null
          business_hours: Json | null
          city: string | null
          cnpj_cpf: string | null
          complement: string | null
          created_at: string | null
          delivery_options: Json | null
          dine_in_settings: Json | null
          facebook_access_token: string | null
          facebook_business_id: string | null
          facebook_phone_number_id: string | null
          id: string
          ifood_token: string | null
          instagram: string | null
          is_active: boolean | null
          keeta_token: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          loyalty_enabled: boolean | null
          loyalty_points_per_real: number | null
          loyalty_redemption_value: number | null
          max_delivery_radius: number | null
          name: string
          neighborhood: string | null
          ninefood_token: string | null
          number: string | null
          paghiper_api_key: string | null
          payment_methods: Json | null
          phone: string | null
          responsible_name: string | null
          segment: string | null
          state: string | null
          street: string | null
          twilio_account_sid: string | null
          twilio_auth_token: string | null
          twilio_phone_number: string | null
          updated_at: string | null
          whatsapp_api_key: string | null
          whatsapp_phone: string | null
          whatsapp_webhook_url: string | null
          zipcode: string | null
        }
        Insert: {
          accept_scheduled_orders?: boolean | null
          address?: Json | null
          apify_api_key?: string | null
          business_hours?: Json | null
          city?: string | null
          cnpj_cpf?: string | null
          complement?: string | null
          created_at?: string | null
          delivery_options?: Json | null
          dine_in_settings?: Json | null
          facebook_access_token?: string | null
          facebook_business_id?: string | null
          facebook_phone_number_id?: string | null
          id?: string
          ifood_token?: string | null
          instagram?: string | null
          is_active?: boolean | null
          keeta_token?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          loyalty_enabled?: boolean | null
          loyalty_points_per_real?: number | null
          loyalty_redemption_value?: number | null
          max_delivery_radius?: number | null
          name: string
          neighborhood?: string | null
          ninefood_token?: string | null
          number?: string | null
          paghiper_api_key?: string | null
          payment_methods?: Json | null
          phone?: string | null
          responsible_name?: string | null
          segment?: string | null
          state?: string | null
          street?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_phone_number?: string | null
          updated_at?: string | null
          whatsapp_api_key?: string | null
          whatsapp_phone?: string | null
          whatsapp_webhook_url?: string | null
          zipcode?: string | null
        }
        Update: {
          accept_scheduled_orders?: boolean | null
          address?: Json | null
          apify_api_key?: string | null
          business_hours?: Json | null
          city?: string | null
          cnpj_cpf?: string | null
          complement?: string | null
          created_at?: string | null
          delivery_options?: Json | null
          dine_in_settings?: Json | null
          facebook_access_token?: string | null
          facebook_business_id?: string | null
          facebook_phone_number_id?: string | null
          id?: string
          ifood_token?: string | null
          instagram?: string | null
          is_active?: boolean | null
          keeta_token?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          loyalty_enabled?: boolean | null
          loyalty_points_per_real?: number | null
          loyalty_redemption_value?: number | null
          max_delivery_radius?: number | null
          name?: string
          neighborhood?: string | null
          ninefood_token?: string | null
          number?: string | null
          paghiper_api_key?: string | null
          payment_methods?: Json | null
          phone?: string | null
          responsible_name?: string | null
          segment?: string | null
          state?: string | null
          street?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_phone_number?: string | null
          updated_at?: string | null
          whatsapp_api_key?: string | null
          whatsapp_phone?: string | null
          whatsapp_webhook_url?: string | null
          zipcode?: string | null
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          city: string | null
          complement: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          neighborhood: string | null
          number: string | null
          owner_user_id: string | null
          phone: string | null
          settings: Json | null
          slug: string
          state: string | null
          street: string | null
          subscription_id: string | null
          updated_at: string | null
          zipcode: string | null
        }
        Insert: {
          city?: string | null
          complement?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          neighborhood?: string | null
          number?: string | null
          owner_user_id?: string | null
          phone?: string | null
          settings?: Json | null
          slug: string
          state?: string | null
          street?: string | null
          subscription_id?: string | null
          updated_at?: string | null
          zipcode?: string | null
        }
        Update: {
          city?: string | null
          complement?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          neighborhood?: string | null
          number?: string | null
          owner_user_id?: string | null
          phone?: string | null
          settings?: Json | null
          slug?: string
          state?: string | null
          street?: string | null
          subscription_id?: string | null
          updated_at?: string | null
          zipcode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          blocked_reason: string | null
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          manually_blocked: boolean | null
          plan_type: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          blocked_reason?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          manually_blocked?: boolean | null
          plan_type: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          blocked_reason?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          manually_blocked?: boolean | null
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string
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
          restaurant_id: string | null
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
          restaurant_id?: string | null
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
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          restaurant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          restaurant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          restaurant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_user_permissions: {
        Row: {
          created_at: string | null
          id: string
          screen_id: string
          screen_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          screen_id: string
          screen_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          screen_id?: string
          screen_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "system_users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_users: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          password_hash: string
          updated_at: string | null
          user_type: string
          username: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          password_hash: string
          updated_at?: string | null
          user_type?: string
          username: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          password_hash?: string
          updated_at?: string | null
          user_type?: string
          username?: string
        }
        Relationships: []
      }
      tables: {
        Row: {
          capacity: number | null
          created_at: string | null
          id: string
          number: number
          restaurant_id: string | null
          status: Database["public"]["Enums"]["table_status"] | null
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          id?: string
          number: number
          restaurant_id?: string | null
          status?: Database["public"]["Enums"]["table_status"] | null
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          id?: string
          number?: number
          restaurant_id?: string | null
          status?: Database["public"]["Enums"]["table_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
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
      user_restaurants: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          restaurant_id: string | null
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          restaurant_id?: string | null
          role?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          restaurant_id?: string | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_restaurants_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
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
      whatsapp_appointments: {
        Row: {
          appointment_date: string | null
          appointment_type: string | null
          created_at: string | null
          customer_name: string | null
          id: string
          notas: string | null
          phone_number: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_date?: string | null
          appointment_type?: string | null
          created_at?: string | null
          customer_name?: string | null
          id?: string
          notas?: string | null
          phone_number: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string | null
          appointment_type?: string | null
          created_at?: string | null
          customer_name?: string | null
          id?: string
          notas?: string | null
          phone_number?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          ai_response: string | null
          created_at: string | null
          id: string
          message_content: string
          message_type: string
          phone_number: string
          processado: boolean | null
          received_at: string | null
          remetente: string
        }
        Insert: {
          ai_response?: string | null
          created_at?: string | null
          id?: string
          message_content: string
          message_type?: string
          phone_number: string
          processado?: boolean | null
          received_at?: string | null
          remetente: string
        }
        Update: {
          ai_response?: string | null
          created_at?: string | null
          id?: string
          message_content?: string
          message_type?: string
          phone_number?: string
          processado?: boolean | null
          received_at?: string | null
          remetente?: string
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
      get_admin_subscriptions: {
        Args: never
        Returns: {
          blocked_reason: string
          created_at: string
          current_period_end: string
          current_period_start: string
          detailed_status: string
          id: string
          manually_blocked: boolean
          plan_type: string
          restaurant_email: string
          restaurant_name: string
          restaurant_phone: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          trial_days_left: number
          trial_end: string
          updated_at: string
          user_id: string
        }[]
      }
      get_subscription_payments: {
        Args: { p_subscription_id: string }
        Returns: {
          amount: number
          currency: string
          id: string
          payment_date: string
          status: string
          stripe_payment_id: string
        }[]
      }
      get_user_restaurant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_action:
        | {
            Args: {
              p_action: string
              p_details?: Json
              p_entity_id?: string
              p_entity_type?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_action: string
              p_details?: Json
              p_entity_id?: string
              p_entity_type?: string
              p_restaurant_id?: string
            }
            Returns: string
          }
      toggle_subscription_block: {
        Args: {
          p_blocked: boolean
          p_reason?: string
          p_subscription_id: string
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
