"use client";

import React, { useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// 6 foto + 1 video upload dengan progress bar sederhana
export default function SellPage() {
  const [form, setForm] = useState({
    title: "",
    price: "",
    brand: "",
    unit_type: "",
    year: new Date().getFullYear().toString(),
    color: "",
    mileage_km: "",
    description: "",
  });

  const [imgPreviews, setImgPreviews] = useState<(string | null)[]>(Array(6).fill(null));
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, string>>({});

  const imgInputs = useRef<(HTMLInputElement | null)[]>([]);
  const videoInput = useRef<HTMLInputElement | null>(null);

  function onChange(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
    };
  }

  const handleImage = async (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setImgPreviews((p) => {
      const n = [...p];
      n[i] = preview;
      return n;
    });

    const path = `${crypto.randomUUID()}/${file.name}`;
    setProgress((p) => ({ ...p, [`img-${i}`]: "Uploading..." }));

    const { error } = await supabase.storage.from("listing-images").upload(path, file);
    if (error) setProgress((p) => ({ ...p, [`img-${i}`]: "Error" }));
    else setProgress((p) => ({ ...p, [`img-${i}`]: "Done ✅" }));
  };

  const handleVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setVideoPreview(preview);

    const path = `${crypto.randomUUID()}/${file.name}`;
    setProgress((p) => ({ ...p, video: "Uploading..." }));

    const { error } = await supabase.storage.from("listing-videos").upload(path, file);
    if (error) setProgress((p) => ({ ...p, video: "Error" }));
    else setProgress((p) => ({ ...p, video: "Done ✅" }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.from("listings").insert({
      ...form,
      price: parseInt(form.price) || 0,
      mileage_km: parseInt(form.mileage_km) || 0,
      created_at: new Date().toISOString(),
    });

    if (error) alert("Gagal menyimpan: " + error.message);
    else alert("Listing berhasil disimpan ✅");
  }

  return (
    <main style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <h2 style={{ fontWeight: 800, fontSize: 26 }}>Jual Motor</h2>

      {/* Upload Section */}
      <section style={{ marginTop: 16 }}>
        <h3>Upload Foto (maks 6) & Video (1)</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                border: "1px dashed #ccc",
                borderRadius: 10,
                padding: 6,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  height: 110,
                  display: "grid",
                  placeItems: "center",
                  overflow: "hidden",
                  borderRadius: 8,
                  background: "#f9fafb",
                }}
              >
                {imgPreviews[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgPreviews[i]!}
                    alt={`foto-${i}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ color: "#999" }}>Upload Foto</span>
                )}
              </div>

              <div style={{ marginTop: 8, display: "flex", gap: 8, justifyContent: "center" }}>
                <button type="button" onClick={() => imgInputs.current[i]?.click()}>
                  Pilih
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setImgPreviews((p) => {
                      const n = [...p];
                      n[i] = null;
                      return n;
                    })
                  }
                >
                  Hapus
                </button>
              </div>

              <input
                ref={(el) => {
                  imgInputs.current[i] = el;
                }}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleImage(i, e)}
              />

              {progress[`img-${i}`] && (
                <div style={{ fontSize: 12, marginTop: 4 }}>{progress[`img-${i}`]}</div>
              )}
            </div>
          ))}

          {/* Video upload */}
          <div
            style={{
              border: "1px dashed #ccc",
              borderRadius: 10,
              padding: 6,
              textAlign: "center",
            }}
          >
            <div
              style={{
                height: 110,
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
                borderRadius: 8,
                background: "#f9fafb",
              }}
            >
              {videoPreview ? (
                <video
                  src={videoPreview}
                  controls
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ color: "#999" }}>Upload Video</span>
              )}
            </div>

            <div style={{ marginTop: 8, display: "flex", gap: 8, justifyContent: "center" }}>
              <button type="button" onClick={() => videoInput.current?.click()}>
                Pilih
              </button>
              <button
                type="button"
                onClick={() => setVideoPreview(null)}
              >
                Hapus
              </button>
            </div>

            <input
              ref={(el) => {
                videoInput.current = el;
              }}
              type="file"
              accept="video/*"
              hidden
              onChange={handleVideo}
            />

            {progress.video && <div style={{ fontSize: 12, marginTop: 4 }}>{progress.video}</div>}
          </div>
        </div>
      </section>

      {/* Form Section */}
      <form onSubmit={onSubmit} style={{ marginTop: 24, display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label>Judul</label>
            <input value={form.title} onChange={onChange("title")} placeholder="Contoh: NMAX 2019" />
          </div>
          <div>
            <label>Harga (Rp)</label>
            <input value={form.price} onChange={onChange("price")} inputMode="numeric" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <div>
            <label>Merk</label>
            <input value={form.brand} onChange={onChange("brand")} placeholder="Honda" />
          </div>
          <div>
            <label>Tipe</label>
            <input value={form.unit_type} onChange={onChange("unit_type")} placeholder="Vario" />
          </div>
          <div>
            <label>Tahun</label>
            <select value={form.year} onChange={onChange("year")}>
              {Array.from({ length: new Date().getFullYear() - 1980 + 1 }).map((_, idx) => {
                const y = 1980 + idx;
                return (
                  <option key={y} value={y}>
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
            <input value={form.color} onChange={onChange("color")} placeholder="Hitam" />
          </div>
          <div>
            <label>Kilometer</label>
            <input value={form.mileage_km} onChange={onChange("mileage_km")} inputMode="numeric" />
          </div>
        </div>

        <div>
          <label>Deskripsi</label>
          <textarea value={form.description} onChange={onChange("description")} rows={5} />
        </div>

        <button type="submit" style={{ padding: "8px 12px" }}>
          Simpan Listing
        </button>
      </form>
    </main>
  );
}
