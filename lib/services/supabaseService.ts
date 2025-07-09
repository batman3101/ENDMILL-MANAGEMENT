import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

// Supabase 클라이언트 타입
type SupabaseClient = ReturnType<typeof createClient<Database>>

// 기본 Supabase 클라이언트 생성
export const createSupabaseClient = (): SupabaseClient => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  return createClient<Database>(supabaseUrl, supabaseKey)
}

// 서버용 Supabase 클라이언트 생성 (Service Role Key 사용)
export const createServerSupabaseClient = (): SupabaseClient => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey)
}

// Equipment 서비스
export class EquipmentService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  // 전체 설비 조회
  async getAll() {
    const { data, error } = await this.supabase
      .from('equipments')
      .select('*')
      .order('equipment_number')

    if (error) throw error
    return data
  }

  // 설비 상태별 조회
  async getByStatus(status: 'active' | 'maintenance' | 'offline') {
    const { data, error } = await this.supabase
      .from('equipments')
      .select('*')
      .eq('status', status)

    if (error) throw error
    return data
  }

  // 설비 생성
  async create(equipment: Database['public']['Tables']['equipments']['Insert']) {
    const { data, error } = await this.supabase
      .from('equipments')
      .insert(equipment)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // 설비 업데이트
  async update(id: string, updates: Database['public']['Tables']['equipments']['Update']) {
    const { data, error } = await this.supabase
      .from('equipments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // 설비 삭제
  async delete(id: string) {
    const { error } = await this.supabase
      .from('equipments')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // 설비 통계
  async getStats() {
    const { data, error } = await this.supabase
      .from('equipments')
      .select('status')

    if (error) throw error

    const stats = data.reduce((acc, equipment) => {
      acc[equipment.status] = (acc[equipment.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: data.length,
      active: stats.active || 0,
      maintenance: stats.maintenance || 0,
      offline: stats.offline || 0
    }
  }

  // 실시간 구독
  subscribeToChanges(callback: (payload: any) => void) {
    return this.supabase
      .channel('equipment_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'equipments' }, 
        callback
      )
      .subscribe()
  }
}

// Endmill Types 서비스
export class EndmillTypeService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  // 전체 앤드밀 타입 조회 (카테고리와 조인)
  async getAll() {
    const { data, error } = await this.supabase
      .from('endmill_types')
      .select(`
        *,
        category:endmill_categories(*)
      `)
      .order('code')

    if (error) throw error
    return data
  }

  // 코드로 앤드밀 타입 조회
  async getByCode(code: string) {
    const { data, error } = await this.supabase
      .from('endmill_types')
      .select(`
        *,
        category:endmill_categories(*),
        suppliers:endmill_supplier_prices(
          *,
          supplier:suppliers(*)
        )
      `)
      .eq('code', code)
      .single()

    if (error) throw error
    return data
  }

  // 카테고리별 앤드밀 타입 조회
  async getByCategory(categoryId: string) {
    const { data, error } = await this.supabase
      .from('endmill_types')
      .select('*')
      .eq('category_id', categoryId)

    if (error) throw error
    return data
  }

  // 앤드밀 타입 생성
  async create(endmillType: Database['public']['Tables']['endmill_types']['Insert']) {
    const { data, error } = await this.supabase
      .from('endmill_types')
      .insert(endmillType)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // 앤드밀 타입 업데이트
  async update(id: string, updates: Database['public']['Tables']['endmill_types']['Update']) {
    const { data, error } = await this.supabase
      .from('endmill_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // 실시간 구독
  subscribeToChanges(callback: (payload: any) => void) {
    return this.supabase
      .channel('endmill_types_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'endmill_types' }, 
        callback
      )
      .subscribe()
  }
}

// Inventory 서비스
export class InventoryService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  // 전체 재고 조회 (앤드밀 타입과 조인)
  async getAll() {
    const { data, error } = await this.supabase
      .from('inventory')
      .select(`
        *,
        endmill_type:endmill_types(
          *,
          category:endmill_categories(*)
        )
      `)
      .order('current_stock', { ascending: true })

    if (error) throw error
    return data
  }

  // 재고 상태별 조회
  async getByStatus(status: 'sufficient' | 'low' | 'critical') {
    const { data, error } = await this.supabase
      .from('inventory')
      .select(`
        *,
        endmill_type:endmill_types(
          *,
          category:endmill_categories(*)
        )
      `)
      .eq('status', status)

    if (error) throw error
    return data
  }

  // 재고 항목 생성
  async create(inventory: Database['public']['Tables']['inventory']['Insert']) {
    const { data, error } = await this.supabase
      .from('inventory')
      .insert(inventory)
      .select(`
        *,
        endmill_type:endmill_types(
          *,
          category:endmill_categories(*)
        )
      `)
      .single()

    if (error) throw error
    return data
  }

  // 재고 업데이트
  async updateStock(id: string, updates: { 
    current_stock?: number
    min_stock?: number
    max_stock?: number 
  }) {
    const { data, error } = await this.supabase
      .from('inventory')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        endmill_type:endmill_types(
          *,
          category:endmill_categories(*)
        )
      `)
      .single()

    if (error) throw error
    return data
  }

  // 재고 항목 업데이트 (일반)
  async update(id: string, updates: Database['public']['Tables']['inventory']['Update']) {
    const { data, error } = await this.supabase
      .from('inventory')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        endmill_type:endmill_types(
          *,
          category:endmill_categories(*)
        )
      `)
      .single()

    if (error) throw error
    return data
  }

  // 재고 항목 삭제
  async delete(id: string) {
    const { data, error } = await this.supabase
      .from('inventory')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // 재고 통계
  async getStats() {
    const { data, error } = await this.supabase
      .from('inventory')
      .select('current_stock, min_stock, max_stock')

    if (error) throw error

    const totalItems = data.length
    const criticalItems = data.filter(item => item.current_stock <= item.min_stock).length
    const lowItems = data.filter(item => 
      item.current_stock > item.min_stock && 
      item.current_stock <= item.min_stock * 1.5
    ).length
    const sufficientItems = totalItems - criticalItems - lowItems

    return {
      totalItems,
      criticalItems,
      lowItems,
      sufficientItems
    }
  }

  // 실시간 구독
  subscribeToChanges(callback: (payload: any) => void) {
    return this.supabase
      .channel('inventory_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'inventory' }, 
        callback
      )
      .subscribe()
  }
}

// Tool Changes 서비스
export class ToolChangeService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  // 전체 교체 이력 조회
  async getAll(limit?: number) {
    let query = this.supabase
      .from('tool_changes')
      .select(`
        *,
        equipment:equipment(*),
        endmill_type:endmill_types(*),
        user:user_profiles(name, employee_id)
      `)
      .order('change_date', { ascending: false })

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  // 교체 이력 생성
  async create(toolChange: Database['public']['Tables']['tool_changes']['Insert']) {
    const { data, error } = await this.supabase
      .from('tool_changes')
      .insert(toolChange)
      .select(`
        *,
        equipment:equipment(*),
        endmill_type:endmill_types(*)
      `)
      .single()

    if (error) throw error
    return data
  }

  // 설비별 교체 이력 조회 (설비 번호로)
  async getByEquipment(equipmentNumber: number, limit?: number, offset?: number) {
    let query = this.supabase
      .from('tool_changes')
      .select(`
        *,
        equipment:equipment(*),
        endmill_type:endmill_types(*)
      `)
      .eq('equipment_number', equipmentNumber)
      .order('change_date', { ascending: false })

    if (limit) query = query.limit(limit)
    if (offset) query = query.range(offset, offset + (limit || 50) - 1)

    const { data, error } = await query
    if (error) throw error
    return data
  }

  // 교체 이력 업데이트
  async update(id: string, updates: Database['public']['Tables']['tool_changes']['Update']) {
    const { data, error } = await this.supabase
      .from('tool_changes')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        equipment:equipment(*),
        endmill_type:endmill_types(*)
      `)
      .single()

    if (error) throw error
    return data
  }

  // 교체 이력 삭제
  async delete(id: string) {
    const { data, error } = await this.supabase
      .from('tool_changes')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // 실시간 구독
  subscribeToChanges(callback: (payload: any) => void) {
    return this.supabase
      .channel('tool_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tool_changes' }, 
        callback
      )
      .subscribe()
  }
}

// CAM Sheets 서비스
export class CAMSheetService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  // 전체 CAM Sheet 조회
  async getAll() {
    const { data, error } = await this.supabase
      .from('cam_sheets')
      .select(`
        *,
        endmills:cam_sheet_endmills(
          *,
          endmill_type:endmill_types(*)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  // CAM Sheet 생성
  async create(camSheet: Database['public']['Tables']['cam_sheets']['Insert']) {
    const { data, error } = await this.supabase
      .from('cam_sheets')
      .insert(camSheet)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // CAM Sheet 앤드밀 정보 추가
  async addEndmill(camSheetEndmill: Database['public']['Tables']['cam_sheet_endmills']['Insert']) {
    const { data, error } = await this.supabase
      .from('cam_sheet_endmills')
      .insert(camSheetEndmill)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // 모델/공정별 CAM Sheet 조회
  async getByModelAndProcess(model: string, process: string) {
    const { data, error } = await this.supabase
      .from('cam_sheets')
      .select(`
        *,
        endmills:cam_sheet_endmills(
          *,
          endmill_type:endmill_types(*)
        )
      `)
      .eq('model', model)
      .eq('process', process)

    if (error) throw error
    return data
  }

  // CAM Sheet 업데이트
  async update(id: string, updates: Database['public']['Tables']['cam_sheets']['Update']) {
    const { data, error } = await this.supabase
      .from('cam_sheets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // CAM Sheet 삭제
  async delete(id: string) {
    const { error } = await this.supabase
      .from('cam_sheets')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  }

  // 실시간 구독
  subscribeToChanges(callback: (payload: any) => void) {
    return this.supabase
      .channel('cam_sheets_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'cam_sheets' }, 
        callback
      )
      .subscribe()
  }
}

// User Profiles 서비스
export class UserProfileService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  // 전체 사용자 프로필 조회
  async getAll() {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select(`
        *,
        role:user_roles(*)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  // 사용자 프로필 생성
  async create(userProfile: Database['public']['Tables']['user_profiles']['Insert']) {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .insert(userProfile)
      .select(`
        *,
        role:user_roles(*)
      `)
      .single()

    if (error) throw error
    return data
  }

  // 사용자 프로필 업데이트
  async update(id: string, updates: Database['public']['Tables']['user_profiles']['Update']) {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // 실시간 구독
  subscribeToChanges(callback: (payload: any) => void) {
    return this.supabase
      .channel('user_profiles_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'user_profiles' }, 
        callback
      )
      .subscribe()
  }
}

// 통합 서비스 클래스
export class SupabaseService {
  public equipment: EquipmentService
  public endmillType: EndmillTypeService
  public inventory: InventoryService
  public toolChange: ToolChangeService
  public camSheet: CAMSheetService
  public userProfile: UserProfileService

  constructor(isServer: boolean = false) {
    const supabase = isServer ? createServerSupabaseClient() : createSupabaseClient()
    
    this.equipment = new EquipmentService(supabase)
    this.endmillType = new EndmillTypeService(supabase)
    this.inventory = new InventoryService(supabase)
    this.toolChange = new ToolChangeService(supabase)
    this.camSheet = new CAMSheetService(supabase)
    this.userProfile = new UserProfileService(supabase)
  }
}

// 기본 인스턴스
export const supabaseService = new SupabaseService()
export const clientSupabaseService = new SupabaseService(false) // 클라이언트용 명시적 export
export const serverSupabaseService = new SupabaseService(true) 