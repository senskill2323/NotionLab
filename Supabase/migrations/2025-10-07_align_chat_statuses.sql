-- Harmonize live chat statuses with client-facing labels
update public.chat_conversations
   set status = 'ouvert'
 where status = 'open';
