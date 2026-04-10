-- Disk IO Budget 최적화를 위한 인덱스 추가
-- 대시보드 API 및 주요 쿼리 경로에서 Sequential Scan을 제거하여 Disk IO 절감

-- 1. tool_changes: change_date 내림차순 인덱스
-- 용도: 대시보드 fetchAllToolChanges()의 90일 필터 (.gte('change_date', ...))
-- 효과: tool_changes 테이블 전체 스캔 → 인덱스 범위 스캔으로 전환
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tool_changes_change_date
  ON public.tool_changes (change_date DESC);

-- 2. tool_changes: created_at 내림차순 인덱스
-- 용도: getToolChangeStats()의 오늘/어제 범위 필터 (.gte('created_at', ...))
-- 용도: tool-changes API의 정렬 및 범위 조회
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tool_changes_created_at
  ON public.tool_changes (created_at DESC);

-- 3. endmill_types: code 인덱스
-- 용도: endmill/route.ts의 .eq('code', ...) 단건 조회
-- 용도: cam-sheets/route.ts의 endmill_types code 매칭
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endmill_types_code
  ON public.endmill_types (code);

-- 4. cam_sheets: model + process 복합 인덱스
-- 용도: cam-sheets API의 model/process 필터 조회
-- 용도: equipment route의 camSheet 매칭
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cam_sheets_model_process
  ON public.cam_sheets (model, process);
