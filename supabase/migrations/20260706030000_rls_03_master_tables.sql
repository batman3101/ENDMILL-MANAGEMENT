-- RLS 수정 #3: 마스터성 6개 테이블 (브라우저 읽기+쓰기 경로 보유)
--
-- clientSupabaseService(anon key + 로그인 JWT = authenticated)가 목록 조회·임베디드 조인·CRUD에 사용
-- → Stage 1 행동 보존형: FOR ALL TO authenticated (읽기+쓰기 현행 유지), anon 전면 차단.
-- 트리거 스캔 0건(연쇄 실패 없음). Stage 2에서 공장/역할 스코프로 조임 예정.
--
-- 검증(2026-07-06): anon 6개 테이블 0건 / authenticated 전체 가시(equipment 1,150 · endmill_types 380 ·
--   prices 861 · cam_sheets 150 · cs_endmills 2,660 · tool_positions 22,213) + 쓰기 시뮬레이션 3종 성공 /
--   설비(800대·사용량 조인)·CAM SHEET(75개·1,330 앤드밀)·엔드밀(380개, 실시간 연결됨)·재고(단가 컬럼) 페이지 정상.
-- 롤백: 정책 6개 DROP 후 6개 테이블 DISABLE ROW LEVEL SECURITY.

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endmill_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endmill_supplier_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cam_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cam_sheet_endmills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY equipment_all_authenticated ON public.equipment
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY endmill_types_all_authenticated ON public.endmill_types
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY endmill_supplier_prices_all_authenticated ON public.endmill_supplier_prices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY cam_sheets_all_authenticated ON public.cam_sheets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY cam_sheet_endmills_all_authenticated ON public.cam_sheet_endmills
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY tool_positions_all_authenticated ON public.tool_positions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
