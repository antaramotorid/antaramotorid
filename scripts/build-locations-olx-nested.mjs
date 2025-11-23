// scripts/build-locations-olx-nested.mjs
// Generate 1 file nested OLX-style locations.json from official wilayah API
// Output: public/locations.json
// Source API (static, Kemendagri-based):
// - https://wilayah.id/api/provinces.json
// - https://wilayah.id/api/regencies/<provinceId>.json
// - https://wilayah.id/api/districts/<regencyId>.json
// - https://wilayah.id/api/villages/<districtId>.json
// Ref: wilayah.id (update 2025) & Kemendagri codes. :contentReference[oaicite:0]{index=0}

import fs from "fs";
import path from "path";

const BASE = "https://wilayah.id/api";

async function getJSON(url) {
  const r = await fetch(url, {
    headers: { "User-Agent": "AntaraMotorID-Locations-Bot/1.0" },
  });
  if (!r.ok) throw new Error(`Fetch gagal ${r.status} ${url}`);
  return r.json();
}

async function main() {
  console.log("Fetch provinces...");
  const provinces = await getJSON(`${BASE}/provinces.json`);

  const nestedProvinces = [];
  for (const prov of provinces) {
    const provId = String(prov.id);
    const provName = prov.name;

    console.log("Fetch regencies for", provId, provName);
    const regencies = await getJSON(`${BASE}/regencies/${provId}.json`);

    const nestedRegencies = [];
    for (const reg of regencies) {
      const regId = String(reg.id);
      const regName = reg.name;

      console.log("  Fetch districts for", regId, regName);
      const districts = await getJSON(`${BASE}/districts/${regId}.json`);

      const nestedDistricts = [];
      for (const dist of districts) {
        const distId = String(dist.id);
        const distName = dist.name;

        console.log("    Fetch villages for", distId, distName);
        const villages = await getJSON(`${BASE}/villages/${distId}.json`);

        nestedDistricts.push({
          id: distId,
          name: distName,
          subdistricts: villages.map((v) => ({
            id: String(v.id),
            name: v.name,
          })),
        });
      }

      nestedRegencies.push({
        id: regId,
        name: regName,
        districts: nestedDistricts,
      });
    }

    nestedProvinces.push({
      id: provId,
      name: provName,
      cities: nestedRegencies,
    });
  }

  const out = {
    source: "wilayah.id / Kemendagri",
    generatedAt: new Date().toISOString(),
    provinces: nestedProvinces,
  };

  const outPath = path.join(process.cwd(), "public", "locations.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");

  console.log("DONE. Wrote:", outPath);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
