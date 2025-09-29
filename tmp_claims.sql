select set_config('request.jwt.claims', '{"sub":"697fdd96-c25d-4462-8939-bde6a98b42cb","email":"vallottonyann@gmail.com","role":"authenticated"}', true) as cfg,
       auth.uid() as uid,
       get_current_user_email() as email;
