import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Simple env loader
const env = {};
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...rest] = trimmed.split('=');
    env[key] = rest.join('=');
  }
}

const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', url ? 'OK (' + url.substring(0, 30) + ')' : 'MISSING');
console.log('KEY:', key ? key.substring(0, 30) + '...' : 'MISSING');

const admin = createClient(url, key);
const db = await admin.from('schools').select('id').limit(1);
console.log('DB result:', JSON.stringify({s: db.status, d: db.data?.length, e: db.error?.message}));
