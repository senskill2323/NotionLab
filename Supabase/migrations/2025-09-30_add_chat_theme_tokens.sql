-- Add chat-specific theme tokens
BEGIN;

UPDATE public.themes
SET tokens = jsonb_set(
  jsonb_set(
    jsonb_set(tokens, '{colors,"chat-surface"}', to_jsonb('hsl(222.2 54% 8%)'::text), true),
    '{colors,"chat-bubble-user"}', to_jsonb('hsl(220 32% 20%)'::text), true
  ),
  '{colors,"chat-bubble-staff"}', to_jsonb('hsl(346.8 70% 45%)'::text), true
);

COMMIT;
