import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://oifnbjuxhxxmmaglwzyj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZm5ianV4aHh4bW1hZ2x3enlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTg1OTcsImV4cCI6MjA4Nzc5NDU5N30.eYksuO9g05RmrYc54A-Vsiuk_pIlf5Cr6IxI9-6mL2w'
);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_string: `
      CREATE POLICY "Allow public all operations on tasks" ON tasks FOR ALL USING (true);
      CREATE POLICY "Allow public all operations on clients" ON clients FOR ALL USING (true);
      CREATE POLICY "Allow public all operations on leave_requests" ON leave_requests FOR ALL USING (true);
    `
  })
  
  if (error) {
     console.log("Error:", error.message)
     console.log("If execute_sql RPC doesn't exist, we will need to re-verify using a direct psql connection.")
  } else {
     console.log("Success applying RLS policies")
  }
}
run()
