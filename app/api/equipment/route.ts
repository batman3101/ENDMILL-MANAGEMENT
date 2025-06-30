import { NextRequest, NextResponse } from 'next/server';
// import { supabase } from '../../../lib/supabase/client'; // 임시 비활성화
import { z } from 'zod';

// 설비 생성 스키마
const createEquipmentSchema = z.object({
  model_code: z.string().min(1).max(10),
  equipment_number: z.number().int().positive(),
  status: z.enum(['active', 'maintenance', 'offline']).optional(),
  location: z.string().optional(),
});

// GET: 설비 목록 조회 (임시로 모의 데이터 반환)
export async function GET(request: NextRequest) {
  try {
    // 개발 단계에서는 모의 데이터 반환
    const mockData = [
      {
        id: '1',
        model_code: 'PA1',
        equipment_number: 1,
        status: 'active',
        location: 'A동',
        processes: {
          id: '1',
          process_name: 'CNC1',
          process_order: 1
        }
      }
    ];
    
    return NextResponse.json({
      data: mockData,
      count: mockData.length,
    });
    
  } catch (error) {
    console.error('설비 API 에러:', error);
    return NextResponse.json(
      { error: '서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 새 설비 생성 (임시로 모의 응답 반환)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 입력 데이터 검증
    const validatedData = createEquipmentSchema.parse(body);
    
    // 개발 단계에서는 모의 데이터 반환
    const mockData = {
      id: Date.now().toString(),
      ...validatedData,
    };
    
    return NextResponse.json({
      data: mockData,
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