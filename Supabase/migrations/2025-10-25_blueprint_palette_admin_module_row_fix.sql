BEGIN;

DO $$
DECLARE
  next_col integer;
BEGIN
  SELECT COALESCE(MAX(col_order), -1) + 1
  INTO next_col
  FROM public.admin_dashboard_tabs
  WHERE row_order = 1;

  UPDATE public.admin_dashboard_tabs
  SET
    row_order = 1,
    col_order = next_col,
    label = 'Blueprints',
    icon = 'Palette',
    permission_required = 'admin_blueprints:manage_palette'
  WHERE tab_id = 'blueprints';
END
$$;

COMMIT;
