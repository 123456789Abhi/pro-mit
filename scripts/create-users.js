const { execSync } = require('child_process');

const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6aHJ5cG9kd2NqeXZmd3NvZml0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTg0NDIyMCwiZXhwIjoyMDkxNDIwMjIwfQ.7iXOq_1sYQawXYK2wthXvC2Gl2mLp0FGiQajEZtoTRI';
const PAT = 'sbp_28f915a31a4dee6a2f89b228ae571e7fe489d210';

function dbRun(sql) {
  const cmd = `curl -s -X POST "https://api.supabase.com/v1/projects/czhrypodwcjyvfwsofit/database/query" -H "Authorization: Bearer ${PAT}" -H "Content-Type: application/json" -d @-`;
  try {
    const r = execSync(cmd, { input: JSON.stringify({ query: sql }), encoding: 'utf8', timeout: 30000 });
    return JSON.parse(r);
  } catch(e) {
    return JSON.parse(e.stdout.toString());
  }
}

function authRequest(method, path, body) {
  const bodyStr = body ? JSON.stringify(body) : null;
  const cmd = `curl -s -X ${method} "https://czhrypodwcjyvfwsofit.supabase.co${path}" -H "apikey: ${SRK}" -H "Authorization: Bearer ${SRK}" -H "Content-Type: application/json"${bodyStr ? ' -d @-' : ''}`;
  try {
    const r = execSync(cmd, { input: bodyStr, encoding: 'utf8', timeout: 30000 });
    try { return JSON.parse(r); } catch { return r; }
  } catch(e) {
    try { return JSON.parse(e.stdout.toString()); }
    catch { return { error: e.stdout.toString().substring(0, 300) }; }
  }
}

async function main() {
  console.log('=== Step 1: Check current auth users ===\n');
  const authUsers = dbRun("SELECT id::text, email, left(encrypted_password, 15) as hash FROM auth.users WHERE email = 'demo@lernen.edu' OR email = 'principal@oakridge.edu'");
  console.log(JSON.stringify(authUsers, null, 2));

  if (!Array.isArray(authUsers) || authUsers.length === 0) {
    console.log('ERROR: No auth users found. Please run the previous script first.');
    return;
  }

  // Get new IDs
  const saAuth = authUsers.find(u => u.email === 'demo@lernen.edu');
  const prinAuth = authUsers.find(u => u.email === 'principal@oakridge.edu');

  if (!saAuth || !prinAuth) {
    console.log('ERROR: Could not find both users in auth.users');
    return;
  }

  console.log('\nSA auth ID:', saAuth.id);
  console.log('Principal auth ID:', prinAuth.id);

  console.log('\n=== Step 2: Insert public.users with matching auth IDs ===\n');
  const ins1 = dbRun(`INSERT INTO public.users (id, school_id, email, name, role, initials, deleted_at) VALUES ('${saAuth.id}', NULL, 'demo@lernen.edu', 'Demo Super Admin', 'super_admin', 'DS', NULL)`);
  console.log('Insert SA:', JSON.stringify(ins1).substring(0, 200));

  const ins2 = dbRun(`INSERT INTO public.users (id, school_id, email, name, role, initials, deleted_at) VALUES ('${prinAuth.id}', '11111111-1111-1111-1111-111111111111', 'principal@oakridge.edu', 'Ramaprashad Bhattacharya', 'principal', 'RB', NULL)`);
  console.log('Insert Principal:', JSON.stringify(ins2).substring(0, 200));

  console.log('\n=== Step 3: Verify ===\n');
  const pubUsers = dbRun("SELECT u.id::text, u.email, u.role, a.id::text as auth_id FROM public.users u JOIN auth.users a ON u.id = a.id WHERE u.email = 'demo@lernen.edu' OR u.email = 'principal@oakridge.edu'");
  console.log('Linked users:', JSON.stringify(pubUsers, null, 2));

  console.log('\n=== Step 4: Check password hash format ===\n');
  const hashCheck = dbRun("SELECT email, left(encrypted_password, 30) as hash FROM auth.users WHERE email = 'demo@lernen.edu'");
  console.log('SA hash:', JSON.stringify(hashCheck));
  if (Array.isArray(hashCheck) && hashCheck[0]) {
    const hash = hashCheck[0].hash;
    if (hash.startsWith('$2a$')) {
      console.log('WARNING: Hash is bcrypt ($2a$), but Supabase Auth may expect argon2. Let me check...');
    } else if (hash.startsWith('$argon')) {
      console.log('OK: Hash is argon2 - Supabase Auth format.');
    } else {
      console.log('Unknown hash format.');
    }
  }
}

main();
