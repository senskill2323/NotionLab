import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uhsfggkqvsnechabxaht.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoc2ZnZ2txdnNuZWNoYWJ4YWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5ODg3MDksImV4cCI6MjA3MTU2NDcwOX0.MnuIMByfbRwd6piGSPI80l3mmSfnTkAuJFoiTIGbupY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);