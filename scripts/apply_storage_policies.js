// scripts/apply_storage_policies.js
// Jalankan di GitHub Actions (workflow sudah disiapkan)

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_URL atau SERVICE_ROLE_KEY belum diset di environment secrets GitHub.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  console.log("🚀 Menjalankan fungsi create_storage_policies_for_listing_buckets() ...");

  const { data, error } = await supabase.rpc("create_storage_policies_for_listing_buckets");

  if (error) {
    console.error("❌ Gagal:", error);
    process.exit(1);
  }

  console.log("✅ Policies berhasil diterapkan:", data);
}

main();
