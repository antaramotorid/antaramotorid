// scripts/apply_storage_policies_admin.js
// Menjalankan request admin ke Supabase Storage API untuk membuat 2 policy per bucket.
// Jalankan lewat GitHub Actions dengan env SUPABASE_URL & SERVICE_ROLE_KEY

import fetch from "node-fetch";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SERVICE_ROLE_KEY");
  process.exit(1);
}

// kebijakan yang akan dibuat: array { bucket_id, policies: [ { name, action, definition } ] }
const buckets = [
  {
    bucket_id: "listing-images",
    policies: [
      {
        name: "public_read_listing_images",
        action: "SELECT",
        definition: "(auth.role() = 'anon' OR auth.role() = 'authenticated')"
      },
      {
        name: "auth_upload_delete_listing_images",
        action: "INSERT,DELETE",
        definition: "(auth.role() = 'authenticated')"
      }
    ]
  },
  {
    bucket_id: "listing-videos",
    policies: [
      {
        name: "public_read_listing_videos",
        action: "SELECT",
        definition: "(auth.role() = 'anon' OR auth.role() = 'authenticated')"
      },
      {
        name: "auth_upload_delete_listing_videos",
        action: "INSERT,DELETE",
        definition: "(auth.role() = 'authenticated')"
      }
    ]
  },
  {
    bucket_id: "listing-videos-pending",
    policies: [
      {
        name: "public_read_listing_videos_pending",
        action: "SELECT",
        definition: "(auth.role() = 'anon' OR auth.role() = 'authenticated')"
      },
      {
        name: "auth_upload_delete_listing_videos_pending",
        action: "INSERT,DELETE",
        definition: "(auth.role() = 'authenticated')"
      }
    ]
  }
];

async function createPolicy(bucket_id, policy) {
  const url = `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/admin/policies`;
  // payload bentuk umum: { bucket_id, name, action, definition }
  const body = {
    bucket_id,
    name: policy.name,
    action: policy.action,
    definition: policy.definition
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apiKey": SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
  }
  return text;
}

(async () => {
  try {
    for (const b of buckets) {
      for (const p of b.policies) {
        console.log(`Creating policy ${p.name} for bucket ${b.bucket_id} ...`);
        const out = await createPolicy(b.bucket_id, p);
        console.log("OK:", out);
      }
    }
    console.log("All policies applied.");
  } catch (err) {
    console.error("Failed to apply policies:", err.message || err);
    process.exit(1);
  }
})();
