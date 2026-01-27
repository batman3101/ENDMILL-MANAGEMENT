/**
 * Supabase 쿼리에 factory_id 필터를 적용하는 공용 유틸리티
 * NULL 데이터는 마이그레이션으로 ALT factory_id가 이미 할당되어 있으므로
 * 단순 .eq() 비교만 사용
 */
export function applyFactoryFilter(
  query: ReturnType<any>,
  factoryId?: string,
  column = 'factory_id'
) {
  if (!factoryId) return query
  return query.eq(column, factoryId)
}
