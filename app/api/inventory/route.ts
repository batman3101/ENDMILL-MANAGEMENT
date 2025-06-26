import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase/client';
import { z } from 'zod';

// 재고 업데이트 스키마
const updateInventorySchema = z.object({
  endmill_type_id: z.string().uuid(),
  current_stock: z.number().int().min(0),
  min_stock: z.number().int().min(0).optional(),
  max_stock: z.number().int().min(0).optional(),
  location: z.string().optional(),
});

// GET: 재고 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const low_stock = searchParams.get('low_stock'); // 재고 부족 필터
    
    let query = supabase
      .from('inventory')
      .select(`
        *,
        endmill_types (
          id,
          code,
          description_ko,
          description_vi,
          specifications,
          unit_cost,
          endmill_categories (
            code,
            name_ko,
            name_vi
          )
        )
      `)
      .order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('재고 조회 에러:', error);
      return NextResponse.json(
        { error: '재고 목록을 가져오는데 실패했습니다.' },
        { status: 500 }
      );
    }
    
    let filteredData = data || [];
    
    // 카테고리 필터
    if (category) {
      filteredData = filteredData.filter(item => 
        item.endmill_types?.endmill_categories?.code === category
      );
    }
    
    // 재고 부족 필터
    if (low_stock === 'true') {
      filteredData = filteredData.filter(item => 
        item.current_stock <= item.min_stock
      );
    }
    
    // 추가 정보 계산
    const enrichedData = filteredData.map(item => ({
      ...item,
      stock_status: getStockStatus(item.current_stock, item.min_stock, item.max_stock),
      stock_value: (item.current_stock * (item.endmill_types?.unit_cost || 0)),
    }));
    
    return NextResponse.json({
      data: enrichedData,
      count: enrichedData.length,
      stats: calculateInventoryStats(enrichedData),
    });
    
  } catch (error) {
    console.error('재고 API 에러:', error);
    return NextResponse.json(
      { error: '서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 재고 업데이트
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 입력 데이터 검증
    const validatedData = updateInventorySchema.parse(body);
    
    // 재고 업데이트
    const { data, error } = await supabase
      .from('inventory')
      .update({
        ...validatedData,
        last_updated: new Date().toISOString(),
      })
      .eq('endmill_type_id', validatedData.endmill_type_id)
      .select(`
        *,
        endmill_types (
          code,
          description_ko,
          unit_cost
        )
      `)
      .single();
    
    if (error) {
      console.error('재고 업데이트 에러:', error);
      return NextResponse.json(
        { error: '재고 업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data,
      message: '재고가 성공적으로 업데이트되었습니다.',
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: '입력 데이터가 올바르지 않습니다.',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    
    console.error('재고 업데이트 API 에러:', error);
    return NextResponse.json(
      { error: '서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 재고 상태 계산 함수
function getStockStatus(current: number, min: number, max: number): string {
  if (current <= min) return 'critical';
  if (current <= min * 1.5) return 'low';
  if (current >= max * 0.9) return 'high';
  return 'normal';
}

// 재고 통계 계산 함수
function calculateInventoryStats(data: any[]) {
  const totalItems = data.length;
  const totalValue = data.reduce((sum, item) => sum + item.stock_value, 0);
  const lowStockItems = data.filter(item => item.stock_status === 'critical' || item.stock_status === 'low').length;
  const criticalItems = data.filter(item => item.stock_status === 'critical').length;
  
  return {
    totalItems,
    totalValue,
    lowStockItems,
    criticalItems,
    averageValue: totalItems > 0 ? totalValue / totalItems : 0,
  };
} 