BEGIN;

delete from public.admin_modules_registry where module_key = 'admin_assistant_settings';
delete from public.admin_dashboard_tabs where tab_id = 'ai_assistant';

COMMIT;
