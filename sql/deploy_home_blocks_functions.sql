-- Deploy home blocks functions to fix delete functionality
-- This script ensures all required functions are properly created

-- Fonction pour supprimer définitivement un bloc (hard delete)
CREATE OR REPLACE FUNCTION home_blocks_delete_hard(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier les permissions (seuls owner/admin peuvent supprimer définitivement)
  -- On s'aligne sur la logique du front qui utilise profiles.user_type_id -> user_types.type_name
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_types ut ON ut.id = p.user_type_id
    WHERE p.id = auth.uid()
      AND ut.type_name IN ('owner', 'admin')
  ) AND NOT EXISTS (
    SELECT 1
    FROM auth.users au
    WHERE au.id = auth.uid()
      AND (
        au.raw_user_meta_data->>'role' IN ('owner','admin') OR
        au.raw_app_meta_data->>'role' IN ('owner','admin')
      )
  ) THEN
    RAISE EXCEPTION 'Seuls les utilisateurs owner/admin peuvent effectuer une suppression définitive.';
  END IF;

  -- Supprimer définitivement le bloc
  DELETE FROM content_blocks WHERE id = p_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bloc non trouvé ou déjà supprimé.';
  END IF;
END;
$$;

-- Sécuriser les droits d'exécution
REVOKE ALL ON FUNCTION home_blocks_delete_hard(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION home_blocks_delete_hard(uuid) TO authenticated;

-- Fonction pour déplacer un bloc (up/down)
CREATE OR REPLACE FUNCTION home_blocks_move(p_id UUID, p_direction TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_order INTEGER;
  target_order INTEGER;
  current_layout TEXT;
BEGIN
  -- Récupérer l'ordre actuel et le layout du bloc
  SELECT order_index, layout INTO current_order, current_layout
  FROM content_blocks 
  WHERE id = p_id AND status != 'archived';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bloc non trouvé ou archivé.';
  END IF;

  -- Déterminer l'ordre cible selon la direction
  IF p_direction = 'up' THEN
    SELECT MAX(order_index) INTO target_order
    FROM content_blocks 
    WHERE layout = current_layout 
    AND status != 'archived'
    AND order_index < current_order;
  ELSIF p_direction = 'down' THEN
    SELECT MIN(order_index) INTO target_order
    FROM content_blocks 
    WHERE layout = current_layout 
    AND status != 'archived'
    AND order_index > current_order;
  ELSE
    RAISE EXCEPTION 'Direction invalide. Utilisez "up" ou "down".';
  END IF;

  -- Si pas de cible trouvée, pas de mouvement possible
  IF target_order IS NULL THEN
    RETURN;
  END IF;

  -- Échanger les ordres
  UPDATE content_blocks SET order_index = -1 WHERE id = p_id;
  UPDATE content_blocks SET order_index = current_order 
  WHERE layout = current_layout AND order_index = target_order AND status != 'archived';
  UPDATE content_blocks SET order_index = target_order WHERE id = p_id;
END;
$$;

-- Fonction pour changer le statut d'un bloc
CREATE OR REPLACE FUNCTION home_blocks_set_status(p_id UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Valider le statut
  IF p_status NOT IN ('draft', 'published', 'archived') THEN
    RAISE EXCEPTION 'Statut invalide. Utilisez: draft, published, archived.';
  END IF;

  -- Mettre à jour le statut
  UPDATE content_blocks 
  SET status = p_status,
      updated_at = NOW()
  WHERE id = p_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bloc non trouvé.';
  END IF;
END;
$$;

-- Fonction pour dupliquer un bloc
CREATE OR REPLACE FUNCTION home_blocks_duplicate(p_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
  original_block RECORD;
  max_order INTEGER;
BEGIN
  -- Récupérer le bloc original
  SELECT * INTO original_block FROM content_blocks WHERE id = p_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bloc non trouvé.';
  END IF;

  -- Trouver le prochain order_index disponible
  SELECT COALESCE(MAX(order_index), 0) + 1 INTO max_order
  FROM content_blocks 
  WHERE layout = original_block.layout AND status != 'archived';

  -- Créer le nouveau bloc
  INSERT INTO content_blocks (
    title, content, status, type, block_type, layout, 
    order_index, priority, created_at, updated_at
  ) VALUES (
    original_block.title || ' (Copie)',
    original_block.content,
    'draft',
    original_block.type,
    original_block.block_type,
    original_block.layout,
    max_order,
    0,
    NOW(),
    NOW()
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Fonction pour modifier le titre d'un bloc
CREATE OR REPLACE FUNCTION home_blocks_set_title(p_id UUID, p_title TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Valider le titre
  IF p_title IS NULL OR LENGTH(TRIM(p_title)) = 0 THEN
    RAISE EXCEPTION 'Le titre ne peut pas être vide.';
  END IF;

  -- Mettre à jour le titre
  UPDATE content_blocks 
  SET title = TRIM(p_title),
      updated_at = NOW()
  WHERE id = p_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bloc non trouvé.';
  END IF;
END;
$$;

-- Fonction pour créer un bloc HTML (utilisée pour éviter les erreurs non-2xx)
CREATE OR REPLACE FUNCTION home_blocks_create_html(
  p_title TEXT,
  p_content TEXT,
  p_layout TEXT,
  p_type TEXT,
  p_status TEXT,
  p_priority INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
  max_order INTEGER;
BEGIN
  -- Trouver le prochain order_index disponible
  SELECT COALESCE(MAX(order_index), 0) + 1 INTO max_order
  FROM content_blocks 
  WHERE layout = p_layout AND status != 'archived';

  -- Créer le nouveau bloc
  INSERT INTO content_blocks (
    title, content, status, type, block_type, layout, 
    order_index, priority, author_id, created_at, updated_at
  ) VALUES (
    p_title,
    p_content,
    p_status,
    p_type,
    'html',
    p_layout,
    max_order,
    p_priority,
    auth.uid(),
    NOW(),
    NOW()
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Sécuriser les droits d'exécution pour toutes les fonctions
REVOKE ALL ON FUNCTION home_blocks_move(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION home_blocks_move(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION home_blocks_set_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION home_blocks_set_status(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION home_blocks_duplicate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION home_blocks_duplicate(uuid) TO authenticated;

REVOKE ALL ON FUNCTION home_blocks_set_title(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION home_blocks_set_title(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION home_blocks_create_html(text, text, text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION home_blocks_create_html(text, text, text, text, text, integer) TO authenticated;
