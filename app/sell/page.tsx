// app/sell/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type FormState = {
  title: string;
  brand: string;
  year: string;        // keep string, cast saat submit
  price: string;       // keep string, cast saat submit
  location: string;
  description: string;
  whatsapp: string;
};

function normalizeWa(n: string) {
  const digits = String(n || "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return digits;
}

export default function SellPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    title: "",
    brand: "",
    year: "",
    price: "",
    location: "",
    description: "",
    whatsapp: "",
  });

  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);

  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progressText, setProgressText] = useState<string>("");

  // preview
  const imagePreviews = useMemo(
    () => images.map((f) => URL.createObjectURL(f)),
    [images]
  );
  useEffect(() => {
    return () => imagePreviews.forEach((u) => URL.revokeObjectURL(u));
  }, [imagePreviews]);

  // cek durasi video (≤ 180 s)
  const [videoInfo, setVideoInfo] = useState<{ duration: number } | null>(null);
  const videoProbeRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setVideoInfo(null);
    if (!video) return;
    const url = URL.createObjectURL(video);
    const vid = document.createElement("video");
    videoProbeRef.current = vid;
    vid.preload = "metadata";
    vid.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const dur = vid.duration || 0;
      setVideoInfo({ duration: Math.round(dur) });
    };
    vid.src = url;
  }, [video]);

  function onPickImages(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).filter((f) =>
      /^image\//.test(f.type)
    );
    const merged = [...images, ...arr].slice(0, 6);
    setImages(merged);
  }

  function onPickVideo(files: FileList | null) {
    if (!files || !files[0]) {
      setVideo(null);
      setVideoInfo(null);
      return;
    }
    const f = files[0];
    if (!/^video\/(mp4|webm|quicktime|x-m4v)/.test(f.type)) {
      setErrors(["Tipe video harus mp4/webm/mov/m4v"]);
      return;
    }
    setVideo(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setProgressText("");

    // Validasi dasar
    const errs: string[] = [];
    if (!form.title.trim()) errs.push("Judul wajib diisi");
    if (!form.brand.trim()) errs.push("Merek wajib diisi");
    const yearNum = form.year ? Number(form.year) : NaN;
    if (form.year && (isNaN(yearNum) || yearNum < 1950 || yearNum > 2100)) {
      errs.push("Tahun tidak valid");
    }
    const priceNum = form.price ? Number(form.price) : NaN;
    if (form.price && (isNaN(priceNum) || priceNum < 0)) {
      errs.push("Harga tidak valid");
    }
    if (!images.length && !video) {
      errs.push("Minimal upload satu foto atau satu video");
    }
    if (videoInfo && videoInfo.duration > 180) {
      errs.push("Durasi video maksimal 3 menit");
    }
    if (errs.length) {
      setErrors(errs);
      return;
    }

    try {
      setSubmitting(true);

      // 1) Insert listing, dapatkan id
      setProgressText("Menyimpan data listing…");
      const { data: created, error: insErr } = await supabase
        .from("listings")
        .insert({
          title: form.title.trim(),
          brand: form.brand.trim(),
          year: form.year ? Number(form.year) : null,
          price: form.price ? Number(form.price) : null,
          location: form.location || null,
          description: form.description || null,
          whatsapp: normalizeWa(form.whatsapp) || null,
        })
        .select()
        .single();

      if (insErr || !created) {
        throw new Error(insErr?.message || "Gagal membuat listing");
      }

      const listingId: string = created.id;

      // 2) Upload FOTO (bucket listing-images/<id>/filename)
      if (images.length) {
        let idx = 0;
        for (const img of images) {
          idx += 1;
          setProgressText(`Upload foto ${idx}/${images.length}…`);
          const fileName = `${Date.now()}-${idx}-${img.name}`.replace(/\s+/g, "_");
          const path = `${listingId}/${fileName}`;
          const { error: upErr } = await supabase
            .storage
            .from("listing-images")
            .upload(path, img, { upsert: true, contentType: img.type });
          if (upErr) throw new Error(`Gagal upload foto: ${upErr.message}`);
        }
      }

      // 3) Upload VIDEO (opsional) ke listing-videos-pending
      if (video) {
        setProgressText("Upload video…");
        const vName = `${Date.now()}-video-${video.name}`.replace(/\s+/g, "_");
        const vPath = `${listingId}/${vName}`;
        const { error: vErr } = await supabase
          .storage
          .from("listing-videos-pending")
          .upload(vPath, video, { upsert: true, contentType: video.type });
        if (vErr) throw new Error(`Gagal upload video: ${vErr.message}`);
      }

      setProgressText("Selesai. Mengarahkan ke halaman detail…");
      router.push(`/listings/${listingId}`);
    } catch (err: any) {
      setErrors([err?.message || "Terjadi kesalahan"]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>Jual Motor</h1>

      {!!errors.length && (
        <div style={{ background: "#FEF2F2", color: "#991B1B", padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
        {/* Judul */}
        <label style={{ display: "grid", gap: 6 }}>
          <span>Judul Listing *</span>
          <input
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            placeholder="Contoh: Vario 150 Istimewa"
            required
            style={inputStyle}
          />
        </label>

        {/* Merek & Tahun */}
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Merek *</span>
            <input
              value={form.brand}
              onChange={(e) => setForm((s) => ({ ...s, brand: e.target.value }))}
              placeholder="honda / yamaha / suzuki"
              required
              style={inputStyle}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Tahun *</span>
            <input
              value={form.year}
              onChange={(e) => setForm((s) => ({ ...s, year: e.target.value }))}
              placeholder="2020"
              inputMode="numeric"
              style={inputStyle}
              required
            />
          </label>
        </div>

        {/* Harga */}
        <label style={{ display: "grid", gap: 6 }}>
          <span>Harga (Rp) *</span>
          <input
            value={form.price}
            onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
            placeholder="19999999"
            inputMode="numeric"
            style={inputStyle}
            required
          />
        </label>

        {/* Lokasi */}
        <label style={{ display: "grid", gap: 6 }}>
          <span>Lokasi</span>
          <input
            value={form.location}
            onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))}
            placeholder="Jakarta Timur"
            style={inputStyle}
          />
        </label>

        {/* WA */}
        <label style={{ display: "grid", gap: 6 }}>
          <span>WhatsApp (opsional)</span>
          <input
            value={form.whatsapp}
            onChange={(e) => setForm((s) => ({ ...s, whatsapp: e.target.value }))}
            placeholder="08xxxxxxxxxx atau 62xxxxxxxxxx"
            style={inputStyle}
          />
        </label>

        {/* Deskripsi */}
        <label style={{ display: "grid", gap: 6 }}>
          <span>Deskripsi</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            placeholder="Kondisi bagus, pajak hidup..."
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </label>

        {/* Upload Foto */}
        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ fontWeight: 600 }}>Foto Unit (max 6 gambar)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => onPickImages(e.target.files)}
          />
          {!!imagePreviews.length && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10 }}>
              {imagePreviews.map((src, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img src={src} alt={`img-${i}`} style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8 }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload Video */}
        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ fontWeight: 600 }}>Video Unit (opsional, maks 3 menit • mp4/webm/mov/m4v)</label>
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
            onChange={(e) => onPickVideo(e.target.files)}
          />
          {video && (
            <div style={{ fontSize: 14, color: "#374151" }}>
              File: <b>{video.name}</b>
              {videoInfo && (
                <> • Durasi: {videoInfo.duration}s {videoInfo.duration > 180 ? " (terlalu panjang)" : ""}</>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "12px 16px",
            background: submitting ? "#9CA3AF" : "#2563EB",
            color: "white",
            borderRadius: 10,
            border: "none",
            fontWeight: 700,
          }}
        >
          {submitting ? "Mengunggah… " + (progressText || "") : "Terbitkan Listing"}
        </button>
        {submitting && progressText && (
          <div style={{ color: "#374151" }}>{progressText}</div>
        )}
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "10px 12px",
  outline: "none",
};
