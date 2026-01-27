import { supabase, createServerClient } from '../supabase/client';
import { Database } from '../types/database';
import { logger } from '../utils/logger';
import type { SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';

// Supabase 클라이언트 타입 - 공식 타입 사용
type SupabaseClient = SupabaseClientType<Database>;

// Equipment 서비스
export class EquipmentService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  // 전체 설비 조회
  async getAll(options?: { factoryId?: string }) {
    let query = this.supabase
      .from('equipment')
      .select('*')
      .order('equipment_number')

    if (options?.factoryId) {
      query = query.eq('factory_id', options.factoryId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  // ID로 설비 상세 조회 (장착된 앤드밀 포함)
  async getById(id: string) {
    // UUID 형식인지 확인 (36자리, 하이픈 포함)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    // 설비 번호 형식인지 확인 (숫자 또는 C로 시작하는 숫자)
    const equipmentNumberStr = id.replace(/^C/i, '') // C 제거
    const isEquipmentNumber = /^\d+$/.test(equipmentNumberStr)
    const equipmentNumber = parseInt(equipmentNumberStr) || 0 // number로 변환

    let query = this.supabase
      .from('equipment')
      .select(`
        *,
        tool_positions(
          id,
          position_number,
          current_life,
          total_life,
          install_date,
          status,
          endmill_type:endmill_types(
            id,
            code,
            name,
            category_id,
            standard_life,
            unit_cost,
            endmill_categories(
              code,
              name_ko
            )
          )
        )
      `)

    // UUID면 id로 조회, 아니면 equipment_number로 조회
    if (isUUID) {
      query = query.eq('id', id)
    } else if (isEquipmentNumber) {
      query = query.eq('equipment_number', equipmentNumber)
    } else {
      throw new Error('Invalid equipment identifier')
    }

    const { data, error } = await query.single()

    if (error) throw error
    return data
  }

  // 설비 상태별 조회
  async getByStatus(status: '가동중' | '점검중' | '셋업중', options?: { factoryId?: string }) {
    let query = this.supabase
      .from('equipment')
      .select('*')
      .eq('status', status)

    if (options?.factoryId) {
      query = query.eq('factory_id', options.factoryId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  // 설비 생성
  async create(equipment: Database['public']['Tables']['equipment']['Insert']) {
    const { data, error } = await this.supabase
      .from('equipment')
      .insert(equipment)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // 설비 업데이트
  async update(id: string, updates: Database['public']['Tables']['equipment']['Update']) {
    const { data, error } = await this.supabase
      .from('equipment')
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
      .from('equipment')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // 설비 통계
  async getStats(options?: { factoryId?: string }) {
    let query = this.supabase
      .from('equipment')
      .select('status')

    if (options?.factoryId) {
      query = query.eq('factory_id', options.factoryId)
    }

    const { data, error } = await query
    if (error) throw error

    const stats = data.reduce((acc, equipment) => {
      if (equipment.status) {
        acc[equipment.status] = (acc[equipment.status] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    return {
      total: data.length,
      active: stats['가동중'] || 0,
      maintenance: stats['점검중'] || 0,
      offline: stats['셋업중'] || 0
    }
  }

  // 툴 포지션 조회
  async getToolPositions(equipmentId: string) {
    const { data, error } = await this.supabase
      .from('tool_positions')
      .select('*')
      .eq('equipment_id', equipmentId)
      .order('position_number')

    if (error) throw error
    return data
  }

  // 실시간 구독
  subscribeToChanges(callback: (payload: any) => void) {
    return this.supabase
      .channel('equipment_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'equipment' },
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
  async getAll(options?: { factoryId?: string }) {
    let query = this.supabase
      .from('inventory')
      .select(`
        *,
        endmill_type:endmill_types(
          *,
          endmill_categories(*),
          endmill_supplier_prices(
            unit_price,
            suppliers(name, code)
          )
        )
      `)
      .order('current_stock', { ascending: true })

    if (options?.factoryId) {
      query = query.eq('factory_id', options.factoryId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  // 재고 상태별 조회
  async getByStatus(status: 'sufficient' | 'low' | 'critical', options?: { factoryId?: string }) {
    let query = this.supabase
      .from('inventory')
      .select(`
        *,
        endmill_type:endmill_types(
          *,
          category:endmill_categories(*)
        )
      `)
      .eq('status', status)

    if (options?.factoryId) {
      query = query.eq('factory_id', options.factoryId)
    }

    const { data, error } = await query
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
          endmill_categories(*),
          endmill_supplier_prices(
            unit_price,
            suppliers(name, code)
          )
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
  async getStats(options?: { factoryId?: string }) {
    let query = this.supabase
      .from('inventory')
      .select(`
        current_stock,
        min_stock,
        max_stock,
        status,
        endmill_type:endmill_types(unit_cost)
      `)

    if (options?.factoryId) {
      query = query.eq('factory_id', options.factoryId)
    }

    const { data, error } = await query
    if (error) throw error

    const totalItems = data.length

    // status 필드 기반으로 집계 (데이터베이스에서 이미 계산된 status 사용)
    const criticalItems = data.filter(item => item.status === 'critical').length
    const lowItems = data.filter(item => item.status === 'low').length
    const sufficientItems = data.filter(item => item.status === 'sufficient').length

    // 총 재고 수량 계산
    const totalStock = data.reduce((sum, item) => sum + (item.current_stock || 0), 0)

    // 총 재고 가치 계산
    const totalValue = data.reduce((sum, item) => {
      const stock = item.current_stock || 0
      const unitCost = item.endmill_type?.unit_cost || 0
      return sum + (stock * parseFloat(unitCost.toString()))
    }, 0)

    return {
      totalItems,
      criticalItems,
      lowItems,
      sufficientItems,
      totalStock,
      totalValue
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
  async getAll(limit?: number, options?: { factoryId?: string }) {
    let query = this.supabase
      .from('tool_changes')
      .select(`
        *,
        equipment:equipment(*),
        endmill_type:endmill_types(*),
        user:user_profiles!changed_by(name, employee_id)
      `)
      .order('change_date', { ascending: false })

    if (limit) {
      query = query.limit(limit)
    }

    if (options?.factoryId) {
      query = query.eq('factory_id', options.factoryId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  // 교체 이력 생성
  async create(toolChange: Database['public']['Tables']['tool_changes']['Insert']) {
    logger.log('ToolChangeService.create called with:', JSON.stringify(toolChange, null, 2))

    const { data, error } = await this.supabase
      .from('tool_changes')
      .insert(toolChange)
      .select()
      .single()

    if (error) {
      logger.error('Supabase insert error:', error)
      logger.error('Error details:', JSON.stringify(error, null, 2))
      throw error
    }

    logger.log('Tool change created successfully:', data)
    return data
  }

  // 설비별 교체 이력 조회 (설비 번호로)
  async getByEquipment(equipmentNumber: number, limit?: number, offset?: number, options?: { factoryId?: string }) {
    let query = this.supabase
      .from('tool_changes')
      .select(`
        *,
        equipment:equipment(*),
        endmill_type:endmill_types(*),
        user:user_profiles!changed_by(name, employee_id)
      `)
      .eq('equipment_number', equipmentNumber)
      .order('change_date', { ascending: false })

    if (limit) query = query.limit(limit)
    if (offset) query = query.range(offset, offset + (limit || 50) - 1)

    if (options?.factoryId) {
      query = query.eq('factory_id', options.factoryId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  // 필터링된 교체 이력 조회
  async getFiltered(filters: {
    equipmentNumber?: number
    endmillType?: string
    searchTerm?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
    sortField?: string
    sortDirection?: 'asc' | 'desc'
    factoryId?: string
  }) {
    let query = this.supabase
      .from('tool_changes')
      .select(`
        *,
        equipment:equipment(*),
        endmill_type:endmill_types(*),
        user:user_profiles!changed_by(name, employee_id)
      `)

    // 공장 필터
    if (filters.factoryId) {
      query = query.eq('factory_id', filters.factoryId)
    }

    // 설비 번호 필터
    if (filters.equipmentNumber) {
      query = query.eq('equipment_number', filters.equipmentNumber)
    }

    // 엔드밀 타입 필터
    if (filters.endmillType) {
      query = query.eq('endmill_type_id', filters.endmillType)
    }

    // 날짜 범위 필터
    if (filters.startDate) {
      query = query.gte('change_date', filters.startDate)
    }
    if (filters.endDate) {
      query = query.lte('change_date', filters.endDate)
    }

    // 검색어 필터 - 단순화
    if (filters.searchTerm) {
      // 설비번호 검색 처리
      if (filters.searchTerm.match(/^C\d+$/i)) {
        // C001 -> 1로 변환
        const numPart = filters.searchTerm.replace(/^C/i, '')
        query = query.eq('equipment_number', parseInt(numPart))
      } else if (filters.searchTerm.match(/^\d+$/)) {
        // 순수 숫자인 경우 설비번호로 검색
        query = query.eq('equipment_number', parseInt(filters.searchTerm))
      } else {
        // 문자열인 경우 생산모델, 공정, 엔드밀 코드, 엔드밀 이름으로 검색
        query = query.or(`production_model.ilike.%${filters.searchTerm}%,process.ilike.%${filters.searchTerm}%,endmill_code.ilike.%${filters.searchTerm}%,endmill_name.ilike.%${filters.searchTerm}%`)
      }
    }

    // 정렬 처리
    const sortField = filters.sortField || 'change_date'
    const sortDirection = filters.sortDirection || 'desc'
    const ascending = sortDirection === 'asc'

    // 정렬 가능한 필드 매핑
    const sortableFields: Record<string, string> = {
      'change_date': 'change_date',
      'equipment_number': 'equipment_number',
      'production_model': 'production_model',
      'process': 'process',
      't_number': 't_number',
      'endmill_name': 'endmill_name',
      'tool_life': 'tool_life',
      'change_reason': 'change_reason',
      'created_at': 'created_at'
    }

    const actualSortField = sortableFields[sortField] || 'change_date'
    query = query.order(actualSortField, { ascending })

    // 페이지네이션
    if (filters.limit) {
      query = query.limit(filters.limit)
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

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
        endmill_type:endmill_types(*),
        user:user_profiles!changed_by(name, employee_id)
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

  // 필터링된 교체 이력 개수 조회
  async getCount(filters: {
    equipmentNumber?: number
    endmillType?: string
    searchTerm?: string
    startDate?: string
    endDate?: string
    factoryId?: string
  }) {
    let query = this.supabase
      .from('tool_changes')
      .select('*, user_profiles(name, employee_id)', { count: 'exact', head: true })

    // 공장 필터
    if (filters.factoryId) {
      query = query.eq('factory_id', filters.factoryId)
    }

    // 설비 번호 필터
    if (filters.equipmentNumber) {
      query = query.eq('equipment_number', filters.equipmentNumber)
    }

    // 엔드밀 타입 필터
    if (filters.endmillType) {
      query = query.eq('endmill_type_id', filters.endmillType)
    }

    // 날짜 범위 필터
    if (filters.startDate) {
      query = query.gte('change_date', filters.startDate)
    }
    if (filters.endDate) {
      query = query.lte('change_date', filters.endDate)
    }

    // 검색어 필터 - 단순화
    if (filters.searchTerm) {
      // 설비번호 검색 처리
      if (filters.searchTerm.match(/^C\d+$/i)) {
        // C001 -> 1로 변환
        const numPart = filters.searchTerm.replace(/^C/i, '')
        query = query.eq('equipment_number', parseInt(numPart))
      } else if (filters.searchTerm.match(/^\d+$/)) {
        // 순수 숫자인 경우 설비번호로 검색
        query = query.eq('equipment_number', parseInt(filters.searchTerm))
      } else {
        // 문자열인 경우 생산모델, 공정, 엔드밀 코드, 엔드밀 이름으로 검색
        query = query.or(`production_model.ilike.%${filters.searchTerm}%,process.ilike.%${filters.searchTerm}%,endmill_code.ilike.%${filters.searchTerm}%,endmill_name.ilike.%${filters.searchTerm}%`)
      }
    }

    const { count, error } = await query

    if (error) throw error
    return count || 0
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
  async getAll(options?: { factoryId?: string }) {
    let query = this.supabase
      .from('cam_sheets')
      .select(`
        *,
        endmills:cam_sheet_endmills(
          *,
          endmill_type:endmill_types(*)
        )
      `)
      .order('created_at', { ascending: false })

    if (options?.factoryId) {
      query = query.eq('factory_id', options.factoryId)
    }

    const { data, error } = await query
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
  async getByModelAndProcess(model: string, process: string, options?: { factoryId?: string }) {
    let query = this.supabase
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

    if (options?.factoryId) {
      query = query.eq('factory_id', options.factoryId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  // CAM Sheet의 엔드밀 목록 조회
  async getEndmills(camSheetId: string) {
    const { data, error } = await this.supabase
      .from('cam_sheet_endmills')
      .select(`
        *,
        endmill_type:endmill_types(
          *,
          endmill_categories(
            code,
            name_ko
          )
        )
      `)
      .eq('cam_sheet_id', camSheetId)
      .order('t_number', { ascending: true })

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
        id,
        name,
        employee_id,
        user_id,
        department,
        position,
        shift,
        role_id,
        phone,
        is_active,
        created_at,
        updated_at,
        permissions,
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

  // 사용자 프로필 삭제
  async delete(id: string) {
    const { error } = await this.supabase
      .from('user_profiles')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  }

  // ID로 사용자 프로필 조회
  async getById(id: string) {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select(`
        *,
        role:user_roles(*)
      `)
      .eq('id', id)
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

// User Roles 서비스
export class UserRolesService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  // 전체 역할 조회
  async getAll() {
    const { data, error } = await this.supabase
      .from('user_roles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  }

  // ID로 역할 조회
  async getById(id: string) {
    const { data, error } = await this.supabase
      .from('user_roles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  // 실시간 구독
  subscribeToChanges(callback: (payload: any) => void) {
    return this.supabase
      .channel('user_roles_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles' },
        callback
      )
      .subscribe()
  }
}

// Auth 서비스
export class AuthService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  // 회원가입 (관리자가 사용자 생성)
  async signUp(email: string, password: string, userProfileData: {
    name: string
    employee_id: string
    department: string
    position: string
    shift: string
    role_id: string
    phone?: string
  }) {
    logger.log('🔄 Creating auth user and profile:', { email, userProfileData })

    // 1. Supabase Auth에 사용자 생성
    const { data: authData, error: authError } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: userProfileData.name,
          employee_id: userProfileData.employee_id
        }
      }
    })

    if (authError) {
      logger.error('❌ Auth signup error:', authError)
      throw authError
    }

    if (!authData.user) {
      throw new Error('회원가입 실패: 사용자 생성 안됨')
    }

    logger.log('✅ Auth user created:', authData.user.id)

    // 2. user_profiles 테이블에 프로필 생성
    const { data: profileData, error: profileError} = await this.supabase
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        ...userProfileData,
        shift: userProfileData.shift as "A" | "B" | "C"
      })
      .select(`
        *,
        role:user_roles(*)
      `)
      .single()

    if (profileError) {
      logger.error('❌ Profile creation error:', profileError)
      // 프로필 생성 실패 시 auth 사용자는 이미 생성되었으므로 에러만 던짐
      throw profileError
    }

    logger.log('✅ User profile created:', profileData)

    return {
      user: authData.user,
      profile: profileData
    }
  }

  // 로그인
  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    return data
  }

  // 로그아웃
  async signOut() {
    const { error } = await this.supabase.auth.signOut()
    if (error) throw error
  }

  // 현재 사용자 가져오기
  async getCurrentUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser()
    if (error) throw error
    return user
  }

  // 비밀번호 재설정 요청
  async resetPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  }
}

// 통합 서비스 클래스
export class SupabaseService {
  public equipment: EquipmentService;
  public endmillType: EndmillTypeService;
  public inventory: InventoryService;
  public toolChange: ToolChangeService;
  public camSheet: CAMSheetService;
  public userProfile: UserProfileService;
  public userRoles: UserRolesService;
  public auth: AuthService;

  constructor(client?: SupabaseClient) {
    // client.ts의 싱글톤 인스턴스 재사용
    const supabaseClient = client || supabase;

    this.equipment = new EquipmentService(supabaseClient);
    this.endmillType = new EndmillTypeService(supabaseClient);
    this.inventory = new InventoryService(supabaseClient);
    this.toolChange = new ToolChangeService(supabaseClient);
    this.camSheet = new CAMSheetService(supabaseClient);
    this.userProfile = new UserProfileService(supabaseClient);
    this.userRoles = new UserRolesService(supabaseClient);
    this.auth = new AuthService(supabaseClient);
  }
}

// 기본 인스턴스 - client.ts의 supabase 싱글톤 재사용
export const supabaseService = new SupabaseService();
export const clientSupabaseService = new SupabaseService(); // 클라이언트용 (동일)

// 서버용 인스턴스 팩토리 함수 - lazy initialization
function createServerSupabaseService(): SupabaseService {
  if (typeof window !== 'undefined') {
    throw new Error(
      'serverSupabaseService는 서버 환경에서만 사용할 수 있습니다. ' +
      '브라우저에서는 supabaseService 또는 clientSupabaseService를 사용하세요.'
    );
  }
  return new SupabaseService(createServerClient());
}

// 서버용 인스턴스 - lazy evaluation으로 안전하게 초기화
let _serverSupabaseService: SupabaseService | null = null;
export const serverSupabaseService = new Proxy({} as SupabaseService, {
  get(target, prop) {
    if (!_serverSupabaseService) {
      _serverSupabaseService = createServerSupabaseService();
    }
    return _serverSupabaseService[prop as keyof SupabaseService];
  }
});