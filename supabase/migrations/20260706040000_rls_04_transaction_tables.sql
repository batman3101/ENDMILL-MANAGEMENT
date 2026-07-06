-- RLS 수정 #4: 트랜잭션 2개 테이블 (브라우저 읽기+쓰기 + Realtime 구독)
--
-- tool_changes: 교체실적 페이지 조회/등록 + 대시보드·훅 Realtime 구독
-- inventory: 재고 페이지 조회/입출고 + BEFORE 트리거(update_inventory_status, 자기 행 status 계산 — 연쇄 없음)
-- Stage 1 행동 보존형: FOR ALL TO authenticated, anon 전면 차단.
--
-- 검증(2026-07-06): anon 2개 테이블 0건 / authenticated 전체 가시(inventory 481, tool_changes 139,228)
--   + 쓰기 시뮬레이션 2종 성공(inventory BEFORE 트리거 발화 포함, ROLLBACK) /
--   교체 실적 페이지(당일 실사용 등록 건 포함)·재고 페이지 브라우저 정상.
-- 롤백: 정책 2개 DROP 후 2개 테이블 DISABLE ROW LEVEL SECURITY.

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_all_authenticated ON public.inventory
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY tool_changes_all_authenticated ON public.tool_changes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
