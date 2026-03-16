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
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_history: {
        Row: {
          content: string
          created_at: string | null
          error_message: string | null
          factory_id: string | null
          id: string
          message_type: string
          query_result: Json | null
          response_time_ms: number | null
          session_id: string
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          error_message?: string | null
          factory_id?: string | null
          id?: string
          message_type: string
          query_result?: Json | null
          response_time_ms?: number | null
          session_id: string
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          error_message?: string | null
          factory_id?: string | null
          id?: string
          message_type?: string
          query_result?: Json | null
          response_time_ms?: number | null
          session_id?: string
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_history_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_query_cache: {
        Row: {
          answer: string
          created_at: string | null
          expires_at: string
          hit_count: number | null
          id: string
          query_hash: string
          question: string
          result_data: Json | null
          sql_query: string | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          expires_at: string
          hit_count?: number | null
          id?: string
          query_hash: string
          question: string
          result_data?: Json | null
          sql_query?: string | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          expires_at?: string
          hit_count?: number | null
          id?: string
          query_hash?: string
          question?: string
          result_data?: Json | null
          sql_query?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_encrypted: boolean | null
          is_system: boolean | null
          key: string
          updated_at: string | null
          value: Json
          value_type: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_encrypted?: boolean | null
          is_system?: boolean | null
          key: string
          updated_at?: string | null
          value: Json
          value_type?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_encrypted?: boolean | null
          is_system?: boolean | null
          key?: string
          updated_at?: string | null
          value?: Json
          value_type?: string | null
        }
        Relationships: []
      }
      cam_sheet_endmills: {
        Row: {
          cam_sheet_id: string | null
          created_at: string | null
          endmill_code: string | null
          endmill_name: string | null
          endmill_type_id: string | null
          id: string
          specifications: string | null
          t_number: number
          tool_life: number | null
        }
        Insert: {
          cam_sheet_id?: string | null
          created_at?: string | null
          endmill_code?: string | null
          endmill_name?: string | null
          endmill_type_id?: string | null
          id?: string
          specifications?: string | null
          t_number: number
          tool_life?: number | null
        }
        Update: {
          cam_sheet_id?: string | null
          created_at?: string | null
          endmill_code?: string | null
          endmill_name?: string | null
          endmill_type_id?: string | null
          id?: string
          specifications?: string | null
          t_number?: number
          tool_life?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cam_sheet_endmills_cam_sheet_id_fkey"
            columns: ["cam_sheet_id"]
            isOneToOne: false
            referencedRelation: "cam_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cam_sheet_endmills_endmill_type_id_fkey"
            columns: ["endmill_type_id"]
            isOneToOne: false
            referencedRelation: "endmill_types"
            referencedColumns: ["id"]
          },
        ]
      }
      cam_sheets: {
        Row: {
          cam_version: string
          created_at: string | null
          created_by: string | null
          factory_id: string | null
          id: string
          model: string
          process: string
          updated_at: string | null
          version_date: string
        }
        Insert: {
          cam_version: string
          created_at?: string | null
          created_by?: string | null
          factory_id?: string | null
          id?: string
          model: string
          process: string
          updated_at?: string | null
          version_date: string
        }
        Update: {
          cam_version?: string
          created_at?: string | null
          created_by?: string | null
          factory_id?: string | null
          id?: string
          model?: string
          process?: string
          updated_at?: string | null
          version_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "cam_sheets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cam_sheets_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      endmill_categories: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          name_ko: string
          name_vi: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          name_ko: string
          name_vi?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name_ko?: string
          name_vi?: string | null
        }
        Relationships: []
      }
      endmill_disposals: {
        Row: {
          created_at: string
          disposal_date: string
          factory_id: string | null
          id: string
          image_url: string | null
          inspector: string
          notes: string | null
          quantity: number
          reviewer: string
          updated_at: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          disposal_date?: string
          factory_id?: string | null
          id?: string
          image_url?: string | null
          inspector: string
          notes?: string | null
          quantity: number
          reviewer: string
          updated_at?: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          disposal_date?: string
          factory_id?: string | null
          id?: string
          image_url?: string | null
          inspector?: string
          notes?: string | null
          quantity?: number
          reviewer?: string
          updated_at?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "endmill_disposals_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      endmill_supplier_prices: {
        Row: {
          created_at: string | null
          current_stock: number | null
          endmill_type_id: string | null
          id: string
          is_preferred: boolean | null
          lead_time_days: number | null
          min_order_quantity: number | null
          quality_rating: number | null
          supplier_id: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_stock?: number | null
          endmill_type_id?: string | null
          id?: string
          is_preferred?: boolean | null
          lead_time_days?: number | null
          min_order_quantity?: number | null
          quality_rating?: number | null
          supplier_id?: string | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_stock?: number | null
          endmill_type_id?: string | null
          id?: string
          is_preferred?: boolean | null
          lead_time_days?: number | null
          min_order_quantity?: number | null
          quality_rating?: number | null
          supplier_id?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "endmill_supplier_prices_endmill_type_id_fkey"
            columns: ["endmill_type_id"]
            isOneToOne: false
            referencedRelation: "endmill_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endmill_supplier_prices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      endmill_types: {
        Row: {
          category_id: string | null
          code: string
          created_at: string | null
          factory_id: string | null
          id: string
          name: string
          standard_life: number | null
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          code: string
          created_at?: string | null
          factory_id?: string | null
          id?: string
          name: string
          standard_life?: number | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          code?: string
          created_at?: string | null
          factory_id?: string | null
          id?: string
          name?: string
          standard_life?: number | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "endmill_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "endmill_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endmill_types_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          created_at: string | null
          current_model: string | null
          equipment_number: number
          factory_id: string | null
          id: string
          last_maintenance: string | null
          location: Database["public"]["Enums"]["equipment_location"]
          model_code: string | null
          process: string | null
          status: Database["public"]["Enums"]["equipment_status"] | null
          tool_position_count: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_model?: string | null
          equipment_number: number
          factory_id?: string | null
          id?: string
          last_maintenance?: string | null
          location: Database["public"]["Enums"]["equipment_location"]
          model_code?: string | null
          process?: string | null
          status?: Database["public"]["Enums"]["equipment_status"] | null
          tool_position_count?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_model?: string | null
          equipment_number?: number
          factory_id?: string | null
          id?: string
          last_maintenance?: string | null
          location?: Database["public"]["Enums"]["equipment_location"]
          model_code?: string | null
          process?: string | null
          status?: Database["public"]["Enums"]["equipment_status"] | null
          tool_position_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      factories: {
        Row: {
          code: string
          country: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ko: string | null
          name_vi: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ko?: string | null
          name_vi?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ko?: string | null
          name_vi?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      insight_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          insight_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          insight_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          insight_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insight_comments_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "saved_insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insight_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          created_at: string | null
          current_stock: number | null
          endmill_type_id: string | null
          factory_id: string | null
          id: string
          last_updated: string | null
          location: string | null
          max_stock: number | null
          min_stock: number | null
          status: Database["public"]["Enums"]["inventory_status"] | null
        }
        Insert: {
          created_at?: string | null
          current_stock?: number | null
          endmill_type_id?: string | null
          factory_id?: string | null
          id?: string
          last_updated?: string | null
          location?: string | null
          max_stock?: number | null
          min_stock?: number | null
          status?: Database["public"]["Enums"]["inventory_status"] | null
        }
        Update: {
          created_at?: string | null
          current_stock?: number | null
          endmill_type_id?: string | null
          factory_id?: string | null
          id?: string
          last_updated?: string | null
          location?: string | null
          max_stock?: number | null
          min_stock?: number | null
          status?: Database["public"]["Enums"]["inventory_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_endmill_type_id_fkey"
            columns: ["endmill_type_id"]
            isOneToOne: false
            referencedRelation: "endmill_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          equipment_id: string | null
          factory_id: string | null
          id: string
          inventory_id: string | null
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          purpose: string | null
          quantity: number
          t_number: number | null
          total_amount: number | null
          transaction_type: string
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          equipment_id?: string | null
          factory_id?: string | null
          id?: string
          inventory_id?: string | null
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          purpose?: string | null
          quantity: number
          t_number?: number | null
          total_amount?: number | null
          transaction_type: string
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          equipment_id?: string | null
          factory_id?: string | null
          id?: string
          inventory_id?: string | null
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          purpose?: string | null
          quantity?: number
          t_number?: number | null
          total_amount?: number | null
          transaction_type?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string | null
          recipient_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          recipient_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          recipient_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_insights: {
        Row: {
          chart_config: Json | null
          content: string
          content_type: string | null
          created_at: string | null
          created_by: string | null
          factory_id: string | null
          id: string
          is_public: boolean | null
          like_count: number | null
          metadata: Json | null
          shared_with: string[] | null
          tags: string[] | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          chart_config?: Json | null
          content: string
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          factory_id?: string | null
          id?: string
          is_public?: boolean | null
          like_count?: number | null
          metadata?: Json | null
          shared_with?: string[] | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          chart_config?: Json | null
          content?: string
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          factory_id?: string | null
          id?: string
          is_public?: boolean | null
          like_count?: number | null
          metadata?: Json | null
          shared_with?: string[] | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_insights_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_insights_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_history: {
        Row: {
          category: string
          changed_at: string | null
          changed_by: string | null
          id: string
          key: string
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          setting_id: string | null
        }
        Insert: {
          category: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          key: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          setting_id?: string | null
        }
        Update: {
          category?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          key?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          setting_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_history_setting_id_fkey"
            columns: ["setting_id"]
            isOneToOne: false
            referencedRelation: "system_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          code: string
          contact_info: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          quality_rating: number | null
          updated_at: string | null
        }
        Insert: {
          code: string
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          quality_rating?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          quality_rating?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_encrypted: boolean | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_encrypted?: boolean | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_encrypted?: boolean | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_changes: {
        Row: {
          change_date: string
          change_reason: Database["public"]["Enums"]["change_reason"]
          changed_by: string | null
          created_at: string | null
          endmill_code: string | null
          endmill_name: string | null
          endmill_type_id: string | null
          equipment_id: string | null
          equipment_number: number | null
          factory_id: string | null
          id: string
          model: string | null
          notes: string | null
          process: string | null
          production_model: string | null
          t_number: number
          tool_life: number | null
        }
        Insert: {
          change_date: string
          change_reason?: Database["public"]["Enums"]["change_reason"]
          changed_by?: string | null
          created_at?: string | null
          endmill_code?: string | null
          endmill_name?: string | null
          endmill_type_id?: string | null
          equipment_id?: string | null
          equipment_number?: number | null
          factory_id?: string | null
          id?: string
          model?: string | null
          notes?: string | null
          process?: string | null
          production_model?: string | null
          t_number: number
          tool_life?: number | null
        }
        Update: {
          change_date?: string
          change_reason?: Database["public"]["Enums"]["change_reason"]
          changed_by?: string | null
          created_at?: string | null
          endmill_code?: string | null
          endmill_name?: string | null
          endmill_type_id?: string | null
          equipment_id?: string | null
          equipment_number?: number | null
          factory_id?: string | null
          id?: string
          model?: string | null
          notes?: string | null
          process?: string | null
          production_model?: string | null
          t_number?: number
          tool_life?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_changes_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_changes_endmill_type_id_fkey"
            columns: ["endmill_type_id"]
            isOneToOne: false
            referencedRelation: "endmill_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_changes_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_changes_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_positions: {
        Row: {
          created_at: string | null
          current_life: number | null
          endmill_type_id: string | null
          equipment_id: string | null
          id: string
          install_date: string | null
          position_number: number
          status: string | null
          total_life: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_life?: number | null
          endmill_type_id?: string | null
          equipment_id?: string | null
          id?: string
          install_date?: string | null
          position_number: number
          status?: string | null
          total_life?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_life?: number | null
          endmill_type_id?: string | null
          equipment_id?: string | null
          id?: string
          install_date?: string | null
          position_number?: number
          status?: string | null
          total_life?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_positions_endmill_type_id_fkey"
            columns: ["endmill_type_id"]
            isOneToOne: false
            referencedRelation: "endmill_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_positions_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      user_factory_access: {
        Row: {
          created_at: string | null
          factory_id: string
          id: string
          is_default: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          factory_id: string
          id?: string
          is_default?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          factory_id?: string
          id?: string
          is_default?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_factory_access_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          default_factory_id: string | null
          department: string
          employee_id: string
          id: string
          is_active: boolean | null
          name: string
          permissions: Json | null
          phone: string | null
          position: string
          role_id: string | null
          shift: Database["public"]["Enums"]["shift_type"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          default_factory_id?: string | null
          department: string
          employee_id: string
          id?: string
          is_active?: boolean | null
          name: string
          permissions?: Json | null
          phone?: string | null
          position: string
          role_id?: string | null
          shift: Database["public"]["Enums"]["shift_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          default_factory_id?: string | null
          department?: string
          employee_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          permissions?: Json | null
          phone?: string | null
          position?: string
          role_id?: string | null
          shift?: Database["public"]["Enums"]["shift_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_default_factory_id_fkey"
            columns: ["default_factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          permissions: Json | null
          type: Database["public"]["Enums"]["user_role_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          permissions?: Json | null
          type: Database["public"]["Enums"]["user_role_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          permissions?: Json | null
          type?: Database["public"]["Enums"]["user_role_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_expired_cache: { Args: never; Returns: undefined }
      execute_safe_query: { Args: { query: string }; Returns: Json }
      get_cached_query: {
        Args: { p_query_hash: string }
        Returns: {
          answer: string
          result_data: Json
          sql_query: string
        }[]
      }
      get_user_accessible_factories: {
        Args: { p_user_id?: string }
        Returns: {
          code: string
          country: string
          factory_id: string
          is_default: boolean
          name: string
          name_ko: string
          name_vi: string
          timezone: string
        }[]
      }
      get_user_default_factory: {
        Args: { p_user_id?: string }
        Returns: {
          code: string
          country: string
          factory_id: string
          name: string
          name_ko: string
          name_vi: string
          timezone: string
        }[]
      }
      is_system_admin: { Args: never; Returns: boolean }
      upsert_setting: {
        Args: {
          p_category: string
          p_key: string
          p_updated_by?: string
          p_value: Json
        }
        Returns: undefined
      }
      user_has_factory_access: {
        Args: { p_factory_id: string; p_user_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      change_reason:
        | "수명완료"
        | "파손"
        | "마모"
        | "예방교체"
        | "모델변경"
        | "기타"
      equipment_location: "A동" | "B동"
      equipment_status: "가동중" | "점검중" | "셋업중"
      inventory_status: "sufficient" | "low" | "critical"
      language_code: "ko" | "vi"
      notification_type:
        | "equipment_status_change"
        | "inventory_low"
        | "tool_change_required"
        | "maintenance_due"
        | "system_alert"
      shift_type: "A" | "B" | "C"
      translation_namespace:
        | "common"
        | "navigation"
        | "dashboard"
        | "equipment"
        | "endmill"
        | "inventory"
        | "camSheets"
        | "toolChanges"
        | "reports"
        | "settings"
        | "users"
        | "auth"
      user_role_type: "system_admin" | "admin" | "user"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      change_reason: [
        "수명완료",
        "파손",
        "마모",
        "예방교체",
        "모델변경",
        "기타",
      ],
      equipment_location: ["A동", "B동"],
      equipment_status: ["가동중", "점검중", "셋업중"],
      inventory_status: ["sufficient", "low", "critical"],
      language_code: ["ko", "vi"],
      notification_type: [
        "equipment_status_change",
        "inventory_low",
        "tool_change_required",
        "maintenance_due",
        "system_alert",
      ],
      shift_type: ["A", "B", "C"],
      translation_namespace: [
        "common",
        "navigation",
        "dashboard",
        "equipment",
        "endmill",
        "inventory",
        "camSheets",
        "toolChanges",
        "reports",
        "settings",
        "users",
        "auth",
      ],
      user_role_type: ["system_admin", "admin", "user"],
    },
  },
} as const
