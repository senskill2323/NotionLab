set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"697fdd96-c25d-4462-8939-bde6a98b42cb","email":"vallottonyann@gmail.com","role":"authenticated"}', true);
select auth.uid();
select get_current_user_email();
select id, conversation_id, sender, content from public.chat_messages where conversation_id = '600a0388-f6a0-4e51-a8c1-9f5e5b3e6629' limit 3;
