import { NextRequest, NextResponse } from 'next/server';
import { serverSupabaseService } from '../../../lib/services/supabaseService';
import { z } from 'zod';

// 설비 생성 스키마
const createEquipmentSchema = z.object({
  equipment_number: z.number().int().min(1).max(999),
  model_code: z.string().min(1),
  location: z.string().optional(),
  status: z.enum(['active', 'maintenance', 'offline']).optional(),
});

// GET: 설비 목록 조회
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const statusFilter = url.searchParams.get('status')
    const modelFilter = url.searchParams.get('model')
    const locationFilter = url.searchParams.get('location')

    // Supabase에서 설비 데이터 조회
    let equipments = await serverSupabaseService.equipment.getAll()

    // 필터 적용
    if (statusFilter) {
      equipments = equipments.filter(eq => eq.status === statusFilter)
    }
    if (modelFilter) {
      equipments = equipments.filter(eq => eq.model_code === modelFilter)
    }
    if (locationFilter) {
      equipments = equipments.filter(eq => eq.location === locationFilter)
    }

    // 통계 계산
    const stats = await serverSupabaseService.equipment.getStats()
    
    return NextResponse.json({
      data: equipments,
      count: equipments.length,
      stats
    });
    
  } catch (error) {
    console.error('설비 API 에러:', error);
    return NextResponse.json(
      { error: '서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 새 설비 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 입력 데이터 검증
    const validatedData = createEquipmentSchema.parse(body);

    // 새 설비 생성
    const newEquipment = await serverSupabaseService.equipment.create({
      equipment_number: validatedData.equipment_number,
      model_code: validatedData.model_code,
      location: validatedData.location || null,
      status: validatedData.status || 'active'
    })
    
    return NextResponse.json({
      data: newEquipment,
      message: '설비가 성공적으로 생성되었습니다.',
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
    
    console.error('설비 생성 API 에러:', error);
    return NextResponse.json(
      { error: '서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 설비 상태 업데이트
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, model_code } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: '설비 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 설비 업데이트
    const updatedEquipment = await serverSupabaseService.equipment.update(id, {
      ...(status && { status }),
      ...(model_code && { model_code }),
    })
    
    return NextResponse.json({
      data: updatedEquipment,
      message: '설비가 성공적으로 업데이트되었습니다.',
    });
    
  } catch (error) {
    console.error('설비 업데이트 API 에러:', error);
    return NextResponse.json(
      { error: '서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
} 