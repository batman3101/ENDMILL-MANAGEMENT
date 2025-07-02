import { NextRequest, NextResponse } from 'next/server';
import { FileDataManager } from '../../../lib/data/fileDataManager';
import { z } from 'zod';

// 설비 생성 스키마
const createEquipmentSchema = z.object({
  equipmentNumber: z.string().min(1).max(10),
  location: z.enum(['A동', 'B동']).optional(),
  status: z.enum(['가동중', '점검중', '셋업중']).optional(),
  currentModel: z.string().optional(),
  process: z.string().optional(),
});

// GET: 설비 목록 조회
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const statusFilter = url.searchParams.get('status')
    const modelFilter = url.searchParams.get('model')
    const locationFilter = url.searchParams.get('location')

    let equipments = FileDataManager.getEquipments()

    // 설비가 없으면 자동 생성
    if (equipments.length === 0) {
      equipments = FileDataManager.generateEquipments(800)
    }

    // 필터 적용
    if (statusFilter) {
      equipments = equipments.filter(eq => eq.status === statusFilter)
    }
    if (modelFilter) {
      equipments = equipments.filter(eq => eq.currentModel === modelFilter)
    }
    if (locationFilter) {
      equipments = equipments.filter(eq => eq.location === locationFilter)
    }
    
    return NextResponse.json({
      data: equipments,
      count: equipments.length,
      stats: {
        total: equipments.length,
        active: equipments.filter(eq => eq.status === '가동중').length,
        maintenance: equipments.filter(eq => eq.status === '점검중').length,
        setup: equipments.filter(eq => eq.status === '셋업중').length,
      }
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
    
    const equipments = FileDataManager.getEquipments()
    
    // 중복 체크
    const exists = equipments.find(eq => eq.equipmentNumber === validatedData.equipmentNumber)
    if (exists) {
      return NextResponse.json(
        { error: '이미 존재하는 설비 번호입니다.' },
        { status: 400 }
      );
    }

    // 새 설비 생성
    const newEquipment = {
      id: `eq-${Date.now()}`,
      equipmentNumber: validatedData.equipmentNumber,
      location: validatedData.location || 'A동',
      status: validatedData.status || '가동중',
      currentModel: validatedData.currentModel || 'PA1',
      process: validatedData.process || 'CNC1',
      toolPositions: { used: 0, total: 21 },
      lastMaintenance: new Date().toISOString().split('T')[0]
    }

    const updatedEquipments = [...equipments, newEquipment]
    FileDataManager.saveEquipments(updatedEquipments)
    
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
    const { id, status, currentModel, process } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: '설비 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const equipments = FileDataManager.getEquipments()
    const equipmentIndex = equipments.findIndex(eq => eq.id === id)
    
    if (equipmentIndex === -1) {
      return NextResponse.json(
        { error: '설비를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 설비 업데이트
    const updatedEquipment = {
      ...equipments[equipmentIndex],
      ...(status && { status }),
      ...(currentModel && { currentModel }),
      ...(process && { process }),
      // 점검중일 때는 툴 위치 초기화
      ...(status === '점검중' && { toolPositions: { used: 0, total: 21 } }),
    }

    equipments[equipmentIndex] = updatedEquipment
    FileDataManager.saveEquipments(equipments)
    
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