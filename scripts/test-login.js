const { execSync } = require('child_process');

// CORRECT anon key from Management API
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6aHJ5cG9kd2NqeXZmd3NvZml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDQyMjAsImV4cCI6MjA5MTQyMDIyMH0.H6NigbZxnKYdkXnU410uy5r_f0d6GU5_Nt3t7XmaysE';

function postJson(url, body, headers = {}) {
  const bodyStr = JSON.stringify(body);
  const headerList = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
  const cmd = `curl -s -X POST "${url}" ${headerList} -d @-`;
  try {
    const r = execSync(cmd, { input: bodyStr, encoding: 'utf8', timeout: 15000 });
    try { return JSON.parse(r); } catch { return r; }
  } catch(e) {
    try { return JSON.parse(e.stdout.toString()); }
    catch { return e.stdout.toString().substring(0, 300); }
  }
}

console.log('=== Testing Login with CORRECT anon key ===\n');

const r1 = postJson(
  'https://czhrypodwcjyvfwsofit.supabase.co/auth/v1/token?grant_type=password',
  { email: 'demo@lernen.edu', password: 'demo1234' },
  { apikey: ANON, 'Content-Type': 'application/json' }
);

if (r1.access_token) {
  console.log('LOGIN SUCCESS! 🎉');
  console.log('User ID:', r1.user?.id);
  console.log('Email:', r1.user?.email);
  console.log('Role:', r1.user?.role);
  console.log('Token:', r1.access_token.substring(0, 50) + '...');
} else {
  console.log('LOGIN FAILED:', JSON.stringify(r1).substring(0, 400));
}
