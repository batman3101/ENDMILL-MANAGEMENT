import { NextRequest, NextResponse } from 'next/server';
import { FileDataManager } from '../../../lib/data/fileDataManager';
import { z } from 'zod';

// 재고 업데이트 스키마
const updateInventorySchema = z.object({
  endmillCode: z.string().min(1),
  currentStock: z.number().int().min(0),
  minStock: z.number().int().min(0).optional(),
  maxStock: z.number().int().min(0).optional(),
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
    const url = new URL(request.url)
    const statusFilter = url.searchParams.get('status')
    const categoryFilter = url.searchParams.get('category')
    const lowStock = url.searchParams.get('lowStock') === 'true'

    let inventory = FileDataManager.getInventory()
    const endmillMaster = FileDataManager.getEndmillMaster()

    // 재고 데이터에 앤드밀 마스터 정보 조인
    const enrichedInventory = inventory.map(item => {
      const endmill = endmillMaster.find(e => e.code === item.endmillCode)
      return {
        ...item,
        endmill: endmill ? {
          name: endmill.name,
          category: endmill.category,
          specifications: endmill.specifications,
          unitPrice: endmill.unitPrice
        } : null
      }
    })

    // 필터 적용
    let filteredInventory = enrichedInventory

    if (statusFilter) {
      filteredInventory = filteredInventory.filter(item => item.status === statusFilter)
    }

    if (categoryFilter && categoryFilter !== '') {
      filteredInventory = filteredInventory.filter(item => 
        item.endmill?.category === categoryFilter
      )
    }

    if (lowStock) {
      filteredInventory = filteredInventory.filter(item => 
        item.status === 'low' || item.status === 'critical'
      )
    }

    // 재고 상태별 통계 계산
    const stats = calculateInventoryStats(enrichedInventory, endmillMaster)
    
    return NextResponse.json({
      data: filteredInventory,
      count: filteredInventory.length,
      stats
    });
    
  } catch (error) {
    console.error('재고 API 에러:', error);
    return NextResponse.json(
      { error: '서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 새 재고 항목 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 입력 데이터 검증
    const validatedData = createInventorySchema.parse(body);
    
    const inventory = FileDataManager.getInventory()
    const endmillMaster = FileDataManager.getEndmillMaster()
    
    // 앤드밀 코드 유효성 검사
    const endmillExists = endmillMaster.find(e => e.code === validatedData.endmillCode)
    if (!endmillExists) {
      return NextResponse.json(
        { error: '존재하지 않는 앤드밀 코드입니다.' },
        { status: 400 }
      );
    }

    // 중복 체크
    const exists = inventory.find(item => item.endmillCode === validatedData.endmillCode)
    if (exists) {
      return NextResponse.json(
        { error: '이미 존재하는 재고 항목입니다.' },
        { status: 400 }
      );
    }

    // 재고 상태 계산
    const status = getStockStatus(validatedData.currentStock, validatedData.minStock, validatedData.maxStock)

    // 새 재고 항목 생성
    const newInventory = {
      id: `inv-${Date.now()}`,
      endmillCode: validatedData.endmillCode,
      currentStock: validatedData.currentStock,
      minStock: validatedData.minStock,
      maxStock: validatedData.maxStock,
      status,
      location: validatedData.location || 'A-001',
      lastUpdated: new Date().toISOString(),
      suppliers: [] // 빈 배열로 초기화
    }

    const updatedInventory = [...inventory, newInventory]
    FileDataManager.saveInventory(updatedInventory)
    
    return NextResponse.json({
      data: newInventory,
      message: '재고 항목이 성공적으로 생성되었습니다.',
    }, { status: 201 });
    
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
    
    console.error('재고 생성 API 에러:', error);
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
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: '재고 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 입력 데이터 검증
    const validatedData = updateInventorySchema.parse(updateData);
    
    const inventory = FileDataManager.getInventory()
    const itemIndex = inventory.findIndex(item => item.id === id)
    
    if (itemIndex === -1) {
      return NextResponse.json(
        { error: '재고 항목을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const existingItem = inventory[itemIndex]

    // 재고 상태 재계산
    const minStock = validatedData.minStock ?? existingItem.minStock
    const maxStock = validatedData.maxStock ?? existingItem.maxStock
    const currentStock = validatedData.currentStock
    const status = getStockStatus(currentStock, minStock, maxStock)

    // 재고 업데이트
    const updatedItem = {
      ...existingItem,
      ...validatedData,
      status,
      lastUpdated: new Date().toISOString()
    }

    inventory[itemIndex] = updatedItem
    FileDataManager.saveInventory(inventory)
    
    return NextResponse.json({
      data: updatedItem,
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
function getStockStatus(current: number, min: number, max: number): 'sufficient' | 'low' | 'critical' {
  if (current <= min) return 'critical';
  if (current <= min * 1.5) return 'low';
  return 'sufficient';
}

// 재고 통계 계산 함수
function calculateInventoryStats(inventory: any[], endmillMaster: any[]) {
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