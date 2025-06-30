import { NextRequest, NextResponse } from 'next/server';
// import { supabase } from '../../../lib/supabase/client'; // 임시 비활성화
import { z } from 'zod';

// 재고 업데이트 스키마
const updateInventorySchema = z.object({
  endmill_type_id: z.string().uuid(),
  current_stock: z.number().int().min(0),
  min_stock: z.number().int().min(0).optional(),
  max_stock: z.number().int().min(0).optional(),
  location: z.string().optional(),
});

// GET: 재고 목록 조회 (임시로 모의 데이터 반환)
export async function GET(request: NextRequest) {
  try {
    // 개발 단계에서는 모의 데이터 반환
    const mockData = [
      {
        id: '1',
        endmill_type_id: '1',
        current_stock: 50,
        min_stock: 20,
        max_stock: 100,
        location: 'A-001',
        endmill_types: {
          id: '1',
          code: 'AT001',
          description_ko: 'FLAT 12mm 4날',
          description_vi: 'FLAT 12mm 4 lưỡi',
          specifications: '12mm 4날',
          unit_cost: 1200000,
          endmill_categories: {
            code: 'FLAT',
            name_ko: 'FLAT',
            name_vi: 'FLAT'
          }
        }
      }
    ];
    
    // 추가 정보 계산
    const enrichedData = mockData.map(item => ({
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

// PUT: 재고 업데이트 (임시로 모의 응답 반환)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 입력 데이터 검증
    const validatedData = updateInventorySchema.parse(body);
    
    // 개발 단계에서는 모의 데이터 반환
    const mockData = {
      id: validatedData.endmill_type_id,
      ...validatedData,
      last_updated: new Date().toISOString(),
      endmill_types: {
        code: 'AT001',
        description_ko: 'FLAT 12mm 4날',
        unit_cost: 1200000
      }
    };
    
    return NextResponse.json({
      data: mockData,
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