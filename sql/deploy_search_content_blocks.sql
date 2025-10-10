-- RPC utilitaire pour paginer et filtrer les blocs de contenu depuis le client ou les Edge Functions.
DROP FUNCTION IF EXISTS public.search_content_blocks(JSONB, TEXT, TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.search_content_blocks(
  p_filters JSONB DEFAULT '{}'::JSONB,
  p_sort_field TEXT DEFAULT 'order_index',
  p_sort_dir TEXT DEFAULT 'asc',
  p_page INTEGER DEFAULT 1,
  p_per_page INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_filters JSONB := COALESCE(p_filters, '{}'::JSONB);
  v_sort_field TEXT := lower(COALESCE(p_sort_field, 'order_index'));
  v_sort_dir TEXT := lower(COALESCE(p_sort_dir, 'asc'));
  v_page INTEGER := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size INTEGER := LEAST(GREATEST(COALESCE(p_per_page, 20), 1), 100);
  v_offset INTEGER := (v_page - 1) * v_page_size;
  v_order_clause TEXT;
  v_base_sql TEXT := 'FROM public.content_blocks WHERE TRUE';
  v_total_sql TEXT;
  v_items_sql TEXT;
  v_items JSONB;
  v_total BIGINT := 0;
  v_title TEXT := NULLIF(trim(COALESCE(v_filters->>'title', '')), '');
  v_status TEXT := NULLIF(trim(COALESCE(v_filters->>'status', '')), '');
  v_layout TEXT := NULLIF(trim(COALESCE(v_filters->>'layout', '')), '');
  v_block_type TEXT := NULLIF(trim(COALESCE(v_filters->>'block_type', '')), '');
  v_featured_raw TEXT := trim(COALESCE(v_filters->>'featured', ''));
  v_featured BOOLEAN := FALSE;
BEGIN
  IF v_sort_field NOT IN ('order_index', 'title', 'status', 'updated_at', 'created_at', 'priority', 'publication_date') THEN
    v_sort_field := 'order_index';
  END IF;

  IF v_sort_dir NOT IN ('asc', 'desc') THEN
    v_sort_dir := 'asc';
  END IF;

  v_order_clause := format('%I %s, id ASC', v_sort_field, v_sort_dir);

  IF v_title IS NOT NULL THEN
    v_base_sql := v_base_sql || format(' AND title ILIKE %L', '%' || v_title || '%');
  END IF;

  IF v_status IS NOT NULL THEN
    v_base_sql := v_base_sql || format(' AND status = %L::public.content_block_status', v_status);
  END IF;

  IF v_layout IS NOT NULL THEN
    v_base_sql := v_base_sql || format(' AND layout = %L', v_layout);
  END IF;

  IF v_block_type IS NOT NULL THEN
    v_base_sql := v_base_sql || format(' AND block_type = %L', v_block_type);
  END IF;

  IF v_featured_raw <> '' THEN
    v_featured := lower(v_featured_raw) IN ('true', 't', '1', 'yes');
  END IF;

  IF v_featured THEN
    v_base_sql := v_base_sql || ' AND priority > 0';
  END IF;

  v_total_sql := 'SELECT COUNT(*) ' || v_base_sql;
  EXECUTE v_total_sql INTO v_total;

  v_items_sql := format(
    'SELECT COALESCE(jsonb_agg(row_to_json(q)), ''[]''::jsonb) FROM (SELECT * %s ORDER BY %s LIMIT %s OFFSET %s) AS q',
    v_base_sql,
    v_order_clause,
    v_page_size,
    v_offset
  );

  EXECUTE v_items_sql INTO v_items;

  RETURN jsonb_build_object(
    'items', COALESCE(v_items, '[]'::jsonb),
    'total', v_total,
    'page', v_page,
    'perPage', v_page_size
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.search_content_blocks(JSONB, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_content_blocks(JSONB, TEXT, TEXT, INTEGER, INTEGER) TO authenticated, anon;
