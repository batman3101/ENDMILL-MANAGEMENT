import { NextRequest, NextResponse } from 'next/server';
import { serverSupabaseService } from '../../../lib/services/supabaseService';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/server';
import { hasPermission, parsePermissionsFromDB, mergePermissionMatrices } from '@/lib/auth/permissions';

// 동적 라우트로 명시적 설정 (cookies 사용으로 인해 필요)
export const dynamic = 'force-dynamic'

// 재고 업데이트 스키마 (프론트엔드 snake_case 형식에 맞춤)
const updateInventorySchema = z.object({
  current_stock: z.number().int().min(0).optional(),
  min_stock: z.number().int().min(0).optional(),
  max_stock: z.number().int().min(0).optional(),
  location: z.string().optional(),
});

// 재고 추가 스키마
const createInventorySchema = z.object({
  endmillCode: z.string().min(1),
  currentStock: z.number().int().min(0),
  minStock: z.number().int().min(0),
  maxStock: z.number().int().min(0),
  location: z.string().optional(),
});

// GET: 재고 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !currentUserProfile.user_roles) {
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 })
    }

    // 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRole = currentUserProfile.user_roles.type
    const rolePermissions = (currentUserProfile.user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = (currentUserProfile.permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canRead = hasPermission(userRole, 'inventory', 'read', customPermissions)
    if (!canRead) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const url = new URL(request.url)
    const statusFilter = url.searchParams.get('status')
    const categoryFilter = url.searchParams.get('category')
    const lowStock = url.searchParams.get('lowStock') === 'true'

    // Supabase에서 재고 데이터 조회 (앤드밀 타입과 카테고리 정보 포함)
    const inventory = await serverSupabaseService.inventory.getAll()

    // 필터 적용
    let filteredInventory = inventory

    if (statusFilter) {
      filteredInventory = filteredInventory.filter(item => {
        // 재고 상태 계산
        const status = getStockStatus(item.current_stock || 0, item.min_stock || 0, item.max_stock || 0)
        return status === statusFilter
      })
    }

    if (categoryFilter && categoryFilter !== '') {
      filteredInventory = filteredInventory.filter(item =>
        item.endmill_type?.endmill_categories?.code === categoryFilter ||
        item.endmill_type?.endmill_categories?.name_ko === categoryFilter
      )
    }

    if (lowStock) {
      filteredInventory = filteredInventory.filter(item => {
        const status = getStockStatus(item.current_stock || 0, item.min_stock || 0, item.max_stock || 0)
        return status === 'low' || status === 'critical'
      })
    }

    // 재고 통계 계산
    const stats = await serverSupabaseService.inventory.getStats()
    
    return NextResponse.json({
      success: true,
      data: filteredInventory,
      count: filteredInventory.length,
      stats
    });
    
  } catch (error) {
    logger.error('재고 API 에러:', error);
    return NextResponse.json(
      {
        success: false,
        error: '서버 에러가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}

// POST: 새 재고 항목 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !currentUserProfile.user_roles) {
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 })
    }

    // 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRole = currentUserProfile.user_roles.type
    const rolePermissions = (currentUserProfile.user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = (currentUserProfile.permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canCreate = hasPermission(userRole, 'inventory', 'create', customPermissions)
    if (!canCreate) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json();

    // 입력 데이터 검증
    const validatedData = createInventorySchema.parse(body);
    
    // 앤드밀 타입 존재 여부 확인
    const endmillType = await serverSupabaseService.endmillType.getByCode(validatedData.endmillCode)
    if (!endmillType) {
      return NextResponse.json(
        {
          success: false,
          error: '존재하지 않는 앤드밀 코드입니다.'
        },
        { status: 400 }
      );
    }

    // 새 재고 항목 생성 (Supabase에서 자동으로 status가 트리거로 계산됨)
    const newInventory = await serverSupabaseService.inventory.create({
      endmill_type_id: endmillType.id,
      current_stock: validatedData.currentStock,
      min_stock: validatedData.minStock,
      max_stock: validatedData.maxStock,
      location: validatedData.location || 'A-001',
    })

    return NextResponse.json({
      success: true,
      data: newInventory,
      message: '재고 항목이 성공적으로 생성되었습니다.',
    }, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: '입력 데이터가 올바르지 않습니다.',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    logger.error('재고 생성 API 에러:', error);
    return NextResponse.json(
      {
        success: false,
        error: '서버 에러가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}

// PUT: 재고 업데이트
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !currentUserProfile.user_roles) {
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 })
    }

    // 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRole = currentUserProfile.user_roles.type
    const rolePermissions = (currentUserProfile.user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = (currentUserProfile.permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canUpdate = hasPermission(userRole, 'inventory', 'update', customPermissions)
    if (!canUpdate) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: '재고 ID가 필요합니다.'
        },
        { status: 400 }
      );
    }

    // 입력 데이터 검증
    const validatedData = updateInventorySchema.parse(updateData);

    // 업데이트할 필드만 포함 (undefined 필드 제외)
    const updateFields: any = {}
    if (validatedData.current_stock !== undefined) updateFields.current_stock = validatedData.current_stock
    if (validatedData.min_stock !== undefined) updateFields.min_stock = validatedData.min_stock
    if (validatedData.max_stock !== undefined) updateFields.max_stock = validatedData.max_stock
    if (validatedData.location !== undefined) updateFields.location = validatedData.location

    // 재고 업데이트 (Supabase 트리거가 자동으로 status 계산)
    const updatedItem = await serverSupabaseService.inventory.updateStock(id, updateFields)

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: '재고가 성공적으로 업데이트되었습니다.',
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: '입력 데이터가 올바르지 않습니다.',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    logger.error('재고 업데이트 API 에러:', error);
    return NextResponse.json(
      {
        success: false,
        error: '서버 에러가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}

// DELETE: 재고 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !currentUserProfile.user_roles) {
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 })
    }

    // 권한 확인
    const userRole = currentUserProfile.user_roles.type
    const rolePermissions = (currentUserProfile.user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = (currentUserProfile.permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canDelete = hasPermission(userRole, 'inventory', 'delete', customPermissions)
    if (!canDelete) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: '재고 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 재고 항목 존재 여부 확인
    const { data: existingItem, error: fetchError } = await supabase
      .from('inventory')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existingItem) {
      return NextResponse.json(
        { success: false, error: '존재하지 않는 재고 항목입니다.' },
        { status: 404 }
      )
    }

    // 재고 삭제
    const { error: deleteError } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({
      success: true,
      message: '재고 항목이 성공적으로 삭제되었습니다.',
    })

  } catch (error) {
    logger.error('재고 삭제 API 에러:', error)
    return NextResponse.json(
      { success: false, error: '서버 에러가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 재고 상태 계산 함수
function getStockStatus(current: number, min: number, _max: number): 'sufficient' | 'low' | 'critical' {
  if (current <= min) return 'critical';
  if (current <= min * 1.5) return 'low';
  return 'sufficient';
}

// 재고 통계 계산 함수
function _calculateInventoryStats(inventory: any[], endmillMaster: any[]) {
  const totalItems = inventory.length;
  const totalValue = inventory.reduce((sum, item) => {
    const endmill = endmillMaster.find(e => e.code === item.endmillCode)
    return sum + (item.currentStock * (endmill?.unitPrice || 0))
  }, 0);
  
  const criticalItems = inventory.filter(item => item.status === 'critical').length;
  const lowStockItems = inventory.filter(item => item.status === 'low').length;
  const sufficientItems = inventory.filter(item => item.status === 'sufficient').length;
  
  // 카테고리별 통계
  const categoryStats = endmillMaster.reduce((acc: any, endmill) => {
    const invItem = inventory.find(item => item.endmillCode === endmill.code)
    if (invItem) {
      if (!acc[endmill.category]) {
        acc[endmill.category] = { count: 0, value: 0 }
      }
      acc[endmill.category].count += invItem.currentStock
      acc[endmill.category].value += invItem.currentStock * endmill.unitPrice
    }
    return acc
  }, {})

  return {
    totalItems,
    totalValue,
    criticalItems,
    lowStockItems,
    sufficientItems,
    averageValue: totalItems > 0 ? totalValue / totalItems : 0,
    categoryStats
  };
} 