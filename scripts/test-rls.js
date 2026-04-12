const { execSync } = require('child_process');

const tests = [
  'DROP TABLE IF EXISTS public.test_schools CASCADE;',
  'DROP TABLE IF EXISTS public.test_users CASCADE;',
  'CREATE TABLE public.test_schools (id UUID PRIMARY KEY, name TEXT);',
  'CREATE TABLE public.test_users (id UUID PRIMARY KEY, school_id UUID, role TEXT, deleted_at TIMESTAMPTZ);',
  'ALTER TABLE public.test_schools ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE public.test_users ENABLE ROW LEVEL SECURITY;',
  'CREATE POLICY schools_all ON public.test_schools FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM public.test_users WHERE role = \'super_admin\' AND deleted_at IS NULL));',
  'CREATE POLICY users_self ON public.test_users FOR SELECT TO authenticated USING (auth.uid() = id OR auth.uid() IN (SELECT id FROM public.test_users WHERE role = \'super_admin\' AND deleted_at IS NULL));',
  'CREATE POLICY users_all ON public.test_users FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM public.test_users WHERE role = \'super_admin\' AND deleted_at IS NULL));',
];

const cmd = 'curl -s -X POST "https://api.supabase.com/v1/projects/czhrypodwcjyvfwsofit/database/query" -H "Authorization: Bearer sbp_28f915a31a4dee6a2f89b228ae571e7fe489d210" -H "Content-Type: application/json" -d @-';

for (const sql of tests) {
  const payload = JSON.stringify({ query: sql });
  try {
    const r = execSync(cmd, { input: payload, encoding: 'utf8', timeout: 30000 });
    console.log('OK:', sql.substring(0, 80));
  } catch(e) {
    console.log('FAIL:', sql.substring(0, 80));
    console.log('   ->', e.stdout.toString().substring(0, 300));
  }
}
