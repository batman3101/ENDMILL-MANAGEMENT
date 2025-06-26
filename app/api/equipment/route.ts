import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase/client';
import { z } from 'zod';

// 설비 생성 스키마
const createEquipmentSchema = z.object({
  model_code: z.string().min(1).max(10),
  equipment_number: z.number().int().positive(),
  status: z.enum(['active', 'maintenance', 'offline']).optional(),
  location: z.string().optional(),
});

// GET: 설비 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const model_code = searchParams.get('model_code');
    const status = searchParams.get('status');
    
    let query = supabase
      .from('equipments')
      .select(`
        *,
        processes (
          id,
          process_name,
          process_order
        )
      `)
      .order('model_code', { ascending: true })
      .order('equipment_number', { ascending: true });
    
    // 필터 적용
    if (model_code) {
      query = query.eq('model_code', model_code);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('설비 조회 에러:', error);
      return NextResponse.json(
        { error: '설비 목록을 가져오는데 실패했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data,
      count: data?.length || 0,
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
    
    const { data, error } = await supabase
      .from('equipments')
      .insert([validatedData])
      .select()
      .single();
    
    if (error) {
      console.error('설비 생성 에러:', error);
      
      // 중복 에러 처리
      if (error.code === '23505') {
        return NextResponse.json(
          { error: '이미 존재하는 설비입니다.' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: '설비 생성에 실패했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data,
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