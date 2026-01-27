export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
          id?: string
          message_type?: string
          query_result?: Json | null
          response_time_ms?: number | null
          session_id?: string
          tokens_used?: number | null
          user_id?: string | null
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
          id?: string
          image_url?: string | null
          inspector?: string
          notes?: string | null
          quantity?: number
          reviewer?: string
          updated_at?: string
          weight_kg?: number
        }
        Relationships: []
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
        ]
      }
      equipment: {
        Row: {
          created_at: string | null
          current_model: string | null
          equipment_number: number
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
          id?: string
          last_maintenance?: string | null
          location?: Database["public"]["Enums"]["equipment_location"]
          model_code?: string | null
          process?: string | null
          status?: Database["public"]["Enums"]["equipment_status"] | null
          tool_position_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          created_at: string | null
          current_stock: number | null
          endmill_type_id: string | null
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
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          equipment_id: string | null
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
      user_profiles: {
        Row: {
          created_at: string | null
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
            foreignKeyName: "user_profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_insights: {
        Row: {
          chart_config: Json | null
          chart_data: Json | null
          content: string
          content_type: string | null
          created_at: string | null
          created_by: string | null
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
          chart_data?: Json | null
          content: string
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
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
          chart_data?: Json | null
          content?: string
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
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
        Relationships: []
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
      get_user_accessible_factories: {
        Args: Record<string, never>
        Returns: {
          factory_id: string
          code: string
          name: string
          name_ko: string
          name_vi: string
          country: string
          timezone: string
          is_default: boolean
        }[]
      }
      user_has_factory_access: {
        Args: {
          p_factory_id: string
        }
        Returns: boolean
      }
      get_user_default_factory: {
        Args: Record<string, never>
        Returns: string
      }
      upsert_setting: {
        Args: {
          p_category: string
          p_key: string
          p_updated_by?: string
          p_value: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      change_reason: "수명완료" | "파손" | "마모" | "예방교체" | "모델변경" | "기타"
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

type PublicSchema = Database[keyof Database]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
