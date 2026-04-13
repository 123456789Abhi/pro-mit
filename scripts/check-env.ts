import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const content = readFileSync(".env.local", "utf8");
const env: Record<string, string> = {};
for (const line of content.split("\n")) {
  const t = line.trim();
  if (t && !t.startsWith("#")) {
    const eqIdx = t.indexOf("=");
    if (eqIdx > 0) {
      env[t.substring(0, eqIdx)] = t.substring(eqIdx + 1);
    }
  }
}

const url = env["NEXT_PUBLIC_SUPABASE_URL"] || env["SUPABASE_URL"];
const key = env["SUPABASE_SERVICE_ROLE_KEY"];

console.log("URL:", url ? "OK" : "MISSING");
console.log("KEY:", key ? "OK (" + key.substring(0, 30) + ")" : "MISSING");

const admin = createClient(url, key);
const db = await admin.from("schools").select("id").limit(1);
console.log("DB:", JSON.stringify({ s: db.status, e: db.error?.message }));
