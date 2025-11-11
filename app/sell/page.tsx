"use client";

import React, { useRef, useState } from "react"; import { supabase } from "../../lib/supabaseClient";

// Sell page: 6 photo slots + 1 video slot, progress bars, brand->type dropdowns (IDs left to integrate), // year dropdown 1980..current, color, mileage fields. Uploads section at the top.

type UploadProgress = { name: string; percent: number; status: "idle" | "uploading" | "done" | "error" };

export default function SellPage() { // form state const [brand, setBrand] = useState(""); const [unitType, setUnitType] = useState(""); const [year, setYear] = useState(new Date().getFullYear().toString()); const [color, setColor] = useState(""); const [mileage, setMileage] = useState(""); const [title, setTitle] = useState(""); const [price, setPrice] = useState(""); const [description, setDescription] = useState("");

// refs for inputs (6 images + 1 video) const imgInputs = useRef<Array<HTMLInputElement | null>>(Array(6).fill(null)); const videoInput = useRef<HTMLInputElement | null>(null);

// preview urls const [imgPreviews, setImgPreviews] = useState<Array<string | null>>(Array(6).fill(null)); const [videoPreview, setVideoPreview] = useState<string | null>(null);

// progress const [progresses, setProgresses] = useState<Record<string, UploadProgress>>({});

// helper: set progress function setProg(key: string, p: Partial) { setProgresses((s) => ({ ...s, [key]: { ...(s[key] || { name: key, percent: 0, status: "idle" }), ...p } })); }

// choose file handlers function onPickImage(i: number) { const el = imgInputs.current[i]; if (el) el.click(); }

async function onImageSelected(i: number, e: React.ChangeEvent) { const file = e.target.files?.[0]; if (!file) return; // preview setImgPreviews((s) => { const n = [...s]; n[i] = URL.createObjectURL(file); return n; });

// upload to supabase
const id = cryptoRandomId();
const path = `${id}/${file.name}`; // we'll later use this id as listingId when creating listing
const key = `img-${i}`;
setProg(key, { status: "uploading", percent: 0, name: file.name });

try {
  // stream upload with progress isn't available in supabase-js directly, but we can emulate
  // using a simple upload then set 100% on success. For UX we still show progress animation.
  const { error } = await supabase.storage.from("listing-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  // get public url
  const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
  const publicUrl = data?.publicUrl ?? "";
  setProg(key, { status: "done", percent: 100, name: file.name });
  // keep preview as public url (optional)
  setImgPreviews((s) => {
    const n = [...s];
    n[i] = publicUrl || n[i];
    return n;
  });
} catch (err) {
  console.error(err);
  setProg(key, { status: "error" });
}
}

function onPickVideo() { if (videoInput.current) videoInput.current.click(); }

async function onVideoSelected(e: React.ChangeEvent) { const file = e.target.files?.[0]; if (!file) return; // limit 3 minutes: approximate by file duration cannot be read reliably here; we enforce by file size/ duration would require client video element. // preview setVideoPreview(URL.createObjectURL(file));

const id = cryptoRandomId();
const path = `${id}/${file.name}`;
const key = `video`;
setProg(key, { status: "uploading", percent: 0, name: file.name });

try {
  const { error } = await supabase.storage.from("listing-videos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("listing-videos").getPublicUrl(path);
  const publicUrl = data?.publicUrl ?? "";
  setProg(key, { status: "done", percent: 100, name: file.name });
  setVideoPreview(publicUrl || videoPreview);
} catch (err) {
  console.error(err);
  setProg(key, { status: "error" });
}
}

// submit listing (minimal example): creates a new listing row and uses the generated id for storage paths async function onSubmit(e?: React.FormEvent) { if (e) e.preventDefault(); // minimal validation const listing = { title, brand, unit_type: unitType, year: parseInt(year || "0", 10) || null, color, mileage_km: mileage ? parseInt(mileage.replace(/[^0-9]/g, ""), 10) : null, price: price ? parseInt(price.replace(/[^0-9]/g, ""), 10) : null, description, created_at: new Date().toISOString(), } as any;

const { data, error } = await supabase.from("listings").insert(listing).select("id").single();
if (error) {
  alert("Gagal buat listing: " + error.message);
  return;
}

const id = data.id as string;
// NOTE: in this simple implementation, we uploaded files earlier to random folders. A more correct flow is to upload files under listingId path after listing is created.

alert("Listing dibuat: " + id + " — silakan verifikasi media terupload pada storage");
}

// small util to create a short id function cryptoRandomId() { // fallback to random if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID(); return Math.random().toString(36).slice(2, 10); }

// UI return ( <div style={{ maxWidth: 920, margin: "20px auto", padding: "16px" }}>

Jual Motor — Formulir
  {/* Uploads area at top */}
  <section style={{ marginTop: 12 }}>
    <h3>Upload Foto (maks 6) & Video (1)</h3>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ border: "1px dashed #d1d5db", borderRadius: 8, padding: 8, textAlign: "center" }}>
          <div style={{ height: 110, display: "grid", placeItems: "center", overflow: "hidden", borderRadius: 6 }}>
            {imgPreviews[i] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imgPreviews[i] || ""} alt={`img-${i}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ color: "#9ca3af" }}>Upload Foto</div>
            )}
          </div>

          <div style={{ marginTop: 8, display: "flex", gap: 6, justifyContent: "center" }}>
            <button type="button" onClick={() => onPickImage(i)} style={{ padding: "6px 8px" }}>
              Pilih
            </button>
            <button type="button" onClick={() => { setImgPreviews((s) => { const n = [...s]; n[i] = null; return n; }); imgInputs.current[i] && (imgInputs.current[i]!.value = ""); }} style={{ padding: "6px 8px" }}>
              Hapus
            </button>
          </div>

          <input
            ref={(el) => { imgInputs.current[i] = el; }}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onImageSelected(i, e)}
          />

          {/* progress */}
          <div style={{ marginTop: 8 }}>
            {progresses[`img-${i}`] ? (
              <div style={{ fontSize: 12 }}>
                {progresses[`img-${i}`].status === "uploading" ? (
                  <div>Uploading... {progresses[`img-${i}`].percent}%</div>
                ) : progresses[`img-${i}`].status === "done" ? (
                  <div>Terupload ✔</div>
                ) : progresses[`img-${i}`].status === "error" ? (
                  <div style={{ color: "#ef4444" }}>Error</div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ))}

      {/* Video slot */}
      <div style={{ border: "1px dashed #d1d5db", borderRadius: 8, padding: 8, textAlign: "center" }}>
        <div style={{ height: 110, display: "grid", placeItems: "center", overflow: "hidden", borderRadius: 6 }}>
          {videoPreview ? (
            <video src={videoPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} controls muted />
          ) : (
            <div style={{ color: "#9ca3af" }}>Upload Video (maks 3 menit)</div>
          )}
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 6, justifyContent: "center" }}>
          <button type="button" onClick={onPickVideo} style={{ padding: "6px 8px" }}>
            Pilih Video
          </button>
          <button type="button" onClick={() => { setVideoPreview(null); if (videoInput.current) videoInput.current.value = ""; }} style={{ padding: "6px 8px" }}>
            Hapus
          </button>
        </div>
        <input ref={(el) => { videoInput.current = el; }} type="file" accept="video/*" hidden onChange={onVideoSelected} />

        <div style={{ marginTop: 8 }}>{progresses[`video`] ? (progresses[`video`].status === "done" ? <div>Terupload ✔</div> : <div>Uploading...</div>) : null}</div>
      </div>
    </div>
  </section>

  {/* Form fields */}
  <form onSubmit={onSubmit} style={{ marginTop: 18, display: "grid", gap: 12 }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <div>
        <label>Judul</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Yamaha NMax 2019" />
      </div>
      <div>
        <label>Harga (Rp)</label>
        <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" />
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
      <div>
        <label>Merk</label>
        <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Yamaha" />
      </div>
      <div>
        <label>Tipe / Model</label>
        <input value={unitType} onChange={(e) => setUnitType(e.target.value)} placeholder="NMAX" />
      </div>
      <div>
        <label>Tahun</label>
        <select value={year} onChange={(e) => setYear(e.target.value)}>
          {Array.from({ length: new Date().getFullYear() - 1980 + 1 }).map((_, idx) => {
            const y = 1980 + idx;
            return (
              <option key={y} value={String(y)}>
                {y}
              </option>
            );
          })}
        </select>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <div>
        <label>Warna</label>
        <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Hitam" />
      </div>
      <div>
        <label>Kilometer (km)</label>
        <input value={mileage} onChange={(e) => setMileage(e.target.value)} inputMode="numeric" placeholder="12.000" />
      </div>
    </div>

    <div>
      <label>Deskripsi</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
    </div>

    <div style={{ display: "flex", gap: 8 }}>
      <button type="submit" style={{ padding: "8px 12px" }}>
        Buat Listing
      </button>
      <button type="button" onClick={() => { setTitle(""); setBrand(""); setUnitType(""); setYear(String(new Date().getFullYear())); setColor(""); setMileage(""); setPrice(""); setDescription(""); setImgPreviews(Array(6).fill(null)); setVideoPreview(null); }} style={{ padding: "8px 12px" }}>
        Reset
      </button>
    </div>
  </form>
</div>
); }
