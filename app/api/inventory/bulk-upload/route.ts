import { NextRequest, NextResponse } from 'next/server';
import { serverSupabaseService } from '@/lib/services/supabaseService';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { createServerClient } from '@/lib/supabase/client';

// 공급업체 정보 스키마
const supplierSchema = z.object({
  name: z.string().min(1),
  unitPrice: z.number().positive()
});

// 재고 항목 스키마
const inventoryItemSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  currentStock: z.number().int().min(0),
  minStock: z.number().int().min(0),
  maxStock: z.number().int().min(0),
  suppliers: z.array(supplierSchema).optional()
});

// 벌크 업로드 요청 스키마
const bulkUploadSchema = z.object({
  items: z.array(inventoryItemSchema)
});

// POST: 벌크 재고 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { factory_id, ...restBody } = body;

    // 입력 데이터 검증
    const validatedData = bulkUploadSchema.parse(restBody);

    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[]
    };

    // Supabase 클라이언트 생성
    const supabase = createServerClient();

    // 각 항목 처리
    for (const item of validatedData.items) {
      try {
        // 1. 앤드밀 타입 확인 또는 생성
        let endmillType = await serverSupabaseService.endmillType.getByCode(item.code);

        if (!endmillType) {
          // 앤드밀 타입이 없으면 생성
          // 먼저 카테고리 ID 찾기
          const { data: categoryData, error: categoryError } = await supabase
            .from('endmill_categories')
            .select('id')
            .or(`code.eq.${item.category},name_ko.eq.${item.category}`)
            .single();

          if (categoryError || !categoryData) {
            results.errors.push(`${item.code}: 카테고리 '${item.category}'를 찾을 수 없습니다.`);
            continue;
          }

          // 앤드밀 타입 생성
          const { error: createError } = await supabase
            .from('endmill_types')
            .insert({
              code: item.code,
              name: item.name,
              category_id: categoryData.id,
              description_ko: item.name,
              unit_cost: item.suppliers?.[0]?.unitPrice || 0
            });

          if (createError) {
            results.errors.push(`${item.code}: 앤드밀 타입 생성 실패 - ${createError?.message}`);
            continue;
          }

          // 생성 후 다시 조회하여 전체 데이터 가져오기
          endmillType = await serverSupabaseService.endmillType.getByCode(item.code);
          if (!endmillType) {
            results.errors.push(`${item.code}: 생성된 앤드밀 타입을 찾을 수 없습니다.`);
            continue;
          }

          logger.info(`새로운 앤드밀 타입 생성: ${item.code}`);
        }

        // 2. 공급업체 정보 처리 (있는 경우)
        if (item.suppliers && item.suppliers.length > 0) {
          for (const supplier of item.suppliers) {
            try {
              // 공급업체 ID 찾기
              const { data: supplierData, error: supplierError } = await supabase
                .from('suppliers')
                .select('id')
                .eq('name', supplier.name)
                .single();

              if (supplierError || !supplierData) {
                results.errors.push(`${item.code}: 공급업체 '${supplier.name}'를 찾을 수 없습니다.`);
                continue;
              }

              // 공급업체 가격 정보 upsert
              const { error: priceError } = await supabase
                .from('endmill_supplier_prices')
                .upsert({
                  endmill_type_id: endmillType.id,
                  supplier_id: supplierData.id,
                  unit_price: supplier.unitPrice
                }, {
                  onConflict: 'endmill_type_id,supplier_id'
                });

              if (priceError) {
                logger.error(`공급업체 가격 등록 실패: ${item.code} - ${supplier.name}`, priceError);
              }
            } catch (err) {
              logger.error(`공급업체 처리 오류: ${item.code} - ${supplier.name}`, err);
            }
          }
        }

        // 3. 재고 항목 확인
        const { data: existingInventory } = await supabase
          .from('inventory')
          .select('id')
          .eq('endmill_type_id', endmillType.id)
          .single();

        if (existingInventory) {
          // 재고 업데이트
          const { error: updateError } = await supabase
            .from('inventory')
            .update({
              current_stock: item.currentStock,
              min_stock: item.minStock,
              max_stock: item.maxStock,
              last_updated: new Date().toISOString()
            })
            .eq('id', existingInventory.id);

          if (updateError) {
            results.errors.push(`${item.code}: 재고 업데이트 실패 - ${updateError.message}`);
          } else {
            results.updated++;
            logger.info(`재고 업데이트: ${item.code}`);
          }
        } else {
          // 새 재고 생성
          const { error: createError } = await supabase
            .from('inventory')
            .insert({
              endmill_type_id: endmillType.id,
              current_stock: item.currentStock,
              min_stock: item.minStock,
              max_stock: item.maxStock,
              factory_id: factory_id || null
            });

          if (createError) {
            results.errors.push(`${item.code}: 재고 생성 실패 - ${createError.message}`);
          } else {
            results.created++;
            logger.info(`새 재고 생성: ${item.code}`);
          }
        }
      } catch (itemError) {
        logger.error(`항목 처리 오류: ${item.code}`, itemError);
        results.errors.push(`${item.code}: ${itemError instanceof Error ? itemError.message : '알 수 없는 오류'}`);
      }
    }

    return NextResponse.json({
      success: true,
      created: results.created,
      updated: results.updated,
      errors: results.errors,
      message: `처리 완료 - 신규: ${results.created}, 업데이트: ${results.updated}, 오류: ${results.errors.length}`
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

    logger.error('벌크 업로드 API 에러:', error);
    return NextResponse.json(
      {
        success: false,
        error: '서버 에러가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}
