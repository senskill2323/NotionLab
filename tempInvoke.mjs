import { createClient } from '@supabase/supabase-js';
const url = 'https://kiudpvvqpbkzeybogrnq.supabase.co';
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpdWRwdnZxcGJremV5Ym9ncm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MzkyNDUsImV4cCI6MjA3MjQxNTI0NX0.eNdBFeu6qKmFtrLNkgzKyV8rSaj-3PeK7PUU9VYk8Jc';
const supabase = createClient(url, anon);
const run = async () => {
  const { data, error } = await supabase.functions.invoke('get-dashboard-layout', {
    body: { owner_type: 'default', owner_id: null },
    headers: { apikey: anon }
  });
  console.log('data:', data);
  console.log('error:', error);
};
run();
