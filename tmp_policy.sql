drop policy if exists "temp_client_conversation_whitelist" on public.chat_messages;
create policy "temp_client_conversation_whitelist"
  on public.chat_messages
  for select
  using (
    auth.uid() = '697fdd96-c25d-4462-8939-bde6a98b42cb'
    and conversation_id = '600a0388-f6a0-4e51-a8c1-9f5e5b3e6629'
  );
