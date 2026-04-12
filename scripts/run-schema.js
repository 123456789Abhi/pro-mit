const fs = require('fs');
const { execSync } = require('child_process');

const PAT = 'sbp_28f915a31a4dee6a2f89b228ae571e7fe489d210';
const PROJECT = 'czhrypodwcjyvfwsofit';

const cmd = `curl -s -X POST "https://api.supabase.com/v1/projects/${PROJECT}/database/query" -H "Authorization: Bearer ${PAT}" -H "Content-Type: application/json" -d @-`;

function run(sql) {
  const payload = JSON.stringify({ query: sql });
  try {
    const r = execSync(cmd, { input: payload, encoding: 'utf8', timeout: 120000, maxBuffer: 5 * 1024 * 1024 });
    const out = r.trim();
    if (out && out !== '[]') {
      try {
        const parsed = JSON.parse(out);
        if (parsed.message && parsed.message.includes('error')) {
          console.log('  ERROR:', parsed.message.substring(0, 200));
          return false;
        }
      } catch {}
    }
    return true;
  } catch(e) {
    try {
      const parsed = JSON.parse(e.stdout.toString());
      console.log('  ERROR:', parsed.message ? parsed.message.substring(0, 300) : e.stdout.toString().substring(0, 300));
    } catch {
      console.log('  ERROR:', e.stdout.toString().substring(0, 300));
    }
    return false;
  }
}

const sql = fs.readFileSync(__dirname + '/schema.sql', 'utf8');

console.log('Executing LERNEN schema...');
console.log('This will take a minute or two.\n');

const ok = run(sql);

if (ok) {
  console.log('\n=== SCHEMA CREATED SUCCESSFULLY ===');
  console.log('Now verifying...');

  const verify = run("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  if (verify) {
    const users = run("SELECT id::text, email, role FROM public.users LIMIT 5");
    if (users) {
      console.log('\n=== SUCCESS ===');
      console.log('TEST ACCOUNTS:');
      console.log('  Super Admin: demo@lernen.edu / demo1234');
      console.log('  Principal:   principal@oakridge.edu / demo1234');
    }
  }
} else {
  console.log('\nSchema creation had errors. Check above.');
}
