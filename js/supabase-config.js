// Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'https://nwtivolfbpteslqszdyb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53dGl2b2xmYnB0ZXNscXN6ZHliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2OTg3ODAsImV4cCI6MjA5NzI3NDc4MH0.c2glg2eSAMCyyEetaCaSVqED3-Wdrj1_71jrC--8WuU';

// Overwrite the CDN module namespace with the actual client instance
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
