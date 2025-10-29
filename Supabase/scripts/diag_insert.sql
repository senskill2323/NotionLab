begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"15bc21b8-c216-4dcb-b8b4-5906f6dc440e","role":"authenticated"}';

insert into public.email_notifications (
    notification_key,
    title,
    subject,
    body_html,
    sender_name,
    sender_email,
    is_active,
    created_at,
    updated_at
) values (
    'diag-rls',
    'Diagnostic RLS',
    'Diag',
    '<p>Test RLS</p>',
    'Admin',
    'yann@notionlab.ch',
    true,
    now(),
    now()
)
returning id, notification_key;

rollback;
