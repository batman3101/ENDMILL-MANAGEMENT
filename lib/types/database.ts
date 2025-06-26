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
          unit_cost: number | null;
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
          unit_cost?: number | null;
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
          unit_cost?: number | null;
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