// PRD 기반 데이터베이스 타입 정의

export interface Database {
  public: {
    Tables: {
      equipments: {
        Row: {
          id: string;
          model_code: string; // PA1, PA2, PS, B7, Q7
          equipment_number: number;
          status: 'active' | 'maintenance' | 'offline';
          location: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          model_code: string;
          equipment_number: number;
          status?: 'active' | 'maintenance' | 'offline';
          location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          model_code?: string;
          equipment_number?: number;
          status?: 'active' | 'maintenance' | 'offline';
          location?: string | null;
          updated_at?: string;
        };
      };
      processes: {
        Row: {
          id: string;
          equipment_id: string;
          process_name: string; // CNC#1, CNC#2
          process_order: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          equipment_id: string;
          process_name: string;
          process_order?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          equipment_id?: string;
          process_name?: string;
          process_order?: number | null;
        };
      };
      endmill_categories: {
        Row: {
          id: string;
          code: string; // FLAT, BALL, T-CUT, C-CUT, REAMER, DRILL
          name_ko: string;
          name_vi: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name_ko: string;
          name_vi?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name_ko?: string;
          name_vi?: string | null;
          description?: string | null;
        };
      };
      endmill_types: {
        Row: {
          id: string;
          code: string; // AT001, AT002
          category_id: string;
          description_ko: string | null;
          description_vi: string | null;
          specifications: any; // JSONB
          unit_cost: number | null; // VND
          standard_life: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          category_id: string;
          description_ko?: string | null;
          description_vi?: string | null;
          specifications?: any;
          unit_cost?: number | null; // VND
          standard_life?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          category_id?: string;
          description_ko?: string | null;
          description_vi?: string | null;
          specifications?: any;
          unit_cost?: number | null; // VND
          standard_life?: number;
        };
      };
      inventory: {
        Row: {
          id: string;
          endmill_type_id: string;
          current_stock: number;
          min_stock: number;
          max_stock: number;
          location: string | null;
          last_updated: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          endmill_type_id: string;
          current_stock?: number;
          min_stock?: number;
          max_stock?: number;
          location?: string | null;
          last_updated?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          endmill_type_id?: string;
          current_stock?: number;
          min_stock?: number;
          max_stock?: number;
          location?: string | null;
          last_updated?: string;
        };
      };
      // Tool Changes 테이블
      tool_changes: {
        Row: {
          id: string;
          change_date: string;
          equipment_number: number;
          model: string;
          process: string;
          t_number: number;
          endmill_code: string;
          endmill_name: string;
          changed_by: string;
          change_reason: string;
          tool_life: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          change_date: string;
          equipment_number: number;
          model: string;
          process: string;
          t_number: number;
          endmill_code: string;
          endmill_name: string;
          changed_by: string;
          change_reason: string;
          tool_life?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          change_date?: string;
          equipment_number?: number;
          model?: string;
          process?: string;
          t_number?: number;
          endmill_code?: string;
          endmill_name?: string;
          changed_by?: string;
          change_reason?: string;
          tool_life?: number | null;
        };
      };
      // CAM Sheet 관련 테이블들
      cam_sheets: {
        Row: {
          id: string;
          model: string;
          process: string;
          cam_version: string;
          version_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          model: string;
          process: string;
          cam_version: string;
          version_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          model?: string;
          process?: string;
          cam_version?: string;
          version_date?: string;
          updated_at?: string;
        };
      };
      cam_sheet_endmills: {
        Row: {
          id: string;
          cam_sheet_id: string;
          t_number: number;
          endmill_code: string;
          endmill_name: string;
          specifications: string;
          tool_life: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          cam_sheet_id: string;
          t_number: number;
          endmill_code: string;
          endmill_name: string;
          specifications: string;
          tool_life: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          cam_sheet_id?: string;
          t_number?: number;
          endmill_code?: string;
          endmill_name?: string;
          specifications?: string;
          tool_life?: number;
        };
      };
      // User Profiles 테이블
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          employee_id: string | null;
          department: string | null;
          position: string | null;
          shift: string | null;
          role_id: string | null;
          is_active: boolean;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          employee_id?: string | null;
          department?: string | null;
          position?: string | null;
          shift?: string | null;
          role_id?: string | null;
          is_active?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          employee_id?: string | null;
          department?: string | null;
          position?: string | null;
          shift?: string | null;
          role_id?: string | null;
          is_active?: boolean;
          last_login?: string | null;
          updated_at?: string;
        };
      };
      // 추후 확장될 테이블들...
      tool_positions: {
        Row: {
          id: string;
          equipment_id: string;
          process_id: string;
          position_number: number; // 1-24 (T1-T24)
          endmill_type_id: string | null;
          current_endmill_id: string | null;
          standard_life: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          equipment_id: string;
          process_id: string;
          position_number: number;
          endmill_type_id?: string | null;
          current_endmill_id?: string | null;
          standard_life?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          equipment_id?: string;
          process_id?: string;
          position_number?: number;
          endmill_type_id?: string | null;
          current_endmill_id?: string | null;
          standard_life?: number | null;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      equipment_status: 'active' | 'maintenance' | 'offline';
      user_role: 'admin' | 'manager' | 'operator';
      user_shift: 'A' | 'B' | 'C';
    };
  };
}

// 편의 타입들
export type Equipment = Database['public']['Tables']['equipments']['Row'];
export type EquipmentInsert = Database['public']['Tables']['equipments']['Insert'];
export type EquipmentUpdate = Database['public']['Tables']['equipments']['Update'];

export type Process = Database['public']['Tables']['processes']['Row'];
export type ProcessInsert = Database['public']['Tables']['processes']['Insert'];

export type EndmillCategory = Database['public']['Tables']['endmill_categories']['Row'];
export type EndmillCategoryInsert = Database['public']['Tables']['endmill_categories']['Insert'];

export type EndmillType = Database['public']['Tables']['endmill_types']['Row'];
export type EndmillTypeInsert = Database['public']['Tables']['endmill_types']['Insert'];

export type Inventory = Database['public']['Tables']['inventory']['Row'];
export type InventoryInsert = Database['public']['Tables']['inventory']['Insert'];
export type InventoryUpdate = Database['public']['Tables']['inventory']['Update'];

export type ToolPosition = Database['public']['Tables']['tool_positions']['Row'];
export type ToolPositionInsert = Database['public']['Tables']['tool_positions']['Insert']; 

export type ToolChange = Database['public']['Tables']['tool_changes']['Row'];
export type ToolChangeInsert = Database['public']['Tables']['tool_changes']['Insert'];
export type ToolChangeUpdate = Database['public']['Tables']['tool_changes']['Update'];

export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert'];
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];