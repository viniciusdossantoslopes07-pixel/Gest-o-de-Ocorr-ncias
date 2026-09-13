-- Migration: Segregação estrita de ADMIN_TOTAL e ADMIN_OM
-- Data: 2026-09-13
-- Mantém apenas Guardião 01 (admin) e 1T LOPES (7427662) como ADMIN_TOTAL
-- Converte os demais para ADMIN_OM com permissões restritas à sua OM.

UPDATE public.users
SET 
    function_id = 'ADMIN_OM',
    custom_permissions = '["view_dashboard","view_missions","view_personnel","view_material","view_access_control","view_vehicles","manage_missions","request_mission","view_all_missions","manage_personnel","view_daily_attendance","sign_daily_attendance","manage_material","request_material","view_material_panel","manage_access_control","view_access_parking","manage_users","manage_permissions","manage_occurrences","triage_occurrences","escalate_occurrences","resolve_occurrences","finalize_occurrences","view_service_queue","approve_mission","sign_mission","start_mission","end_mission","use_service_chat"]'::jsonb
WHERE function_id = 'ADMIN_TOTAL'
  AND id NOT IN ('00000000-0000-0000-0000-000000000000', '8855dbb2-99c5-4d94-acea-25736105bd20');
