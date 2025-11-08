// app/sell/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const IMAGES_BUCKET = "listing-images";
const VIDEOS_BUCKET = "listing-videos";

// batas ukuran: 20MB img, 200MB video (sesuaikan jika perlu)
const MAX_IMAGE_MB = 20;
const MAX_VIDEO_MB = 200;
// durasi video: validasi ringan via size aja (durasi sebenarnya perlu baca metadata)
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];

export default function SellPage() {
  const router = useRouter();

  // form fields
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [unitType, setUnitType] = useState("");
  const [year, setYear] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [location, setLocation] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");

  // files
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);

  // state
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);

  function normalizeWa(n: string) {
    const digits = (n || "").replace(/[^0-9]/g, "");
    if (!digits) return null;
    if (digits.startsWith("0")) return "62" + digits.slice(1);
    if (digits.startsWith("62")) return digits;
    return digits;
  }

  function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const filtered = files.filter(
      (f) =>
        ALLOWED_IMAGE_TYPES.includes(f.type) &&
        f.size <= MAX_IMAGE_MB * 1024 * 1024
    );
    setImageFiles((prev) => [...prev, ...filtered]);
    // reset input untuk bisa pilih file yang sama lagi bila perlu
    if (imgInputRef.current) imgInputRef.current.value = "";
  }

  function onPickVideos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const filtered = files.filter(
      (f) =>
        ALLOWED_VIDEO_TYPES.includes(f.type) &&
        f.size <= MAX_VIDEO_MB * 1024 * 1024
    );
    setVideoFiles((prev) => [...prev, ...filtered]);
    if (vidInputRef.current) vidInputRef.current.value = "";
  }

  function removeImage(i: number) {
    setImageFiles((prev) => prev.filter((_, idx) => idx !== i));
  }
  function removeVideo(i: number) {
    setVideoFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function uploadFiles(
    bucket: string,
    listingId: string,
    files: File[]
  ) {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = f.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${listingId}/${Date.now()}-${i}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, f, {
        upsert: true,
        contentType: f.type,
      });
      if (error) {
        throw new Error(
          `Gagal upload ke ${bucket} untuk file ${f.name}: ${error.message}`
        );
      }
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setStatus("Menyimpan data…");

      const wa = normalizeWa(whatsapp);

      // 1) Simpan row listing
      const { data: inserted, error: insertErr } = await supabase
        .from("listings")
        .insert([
          {
            title,
            brand: brand || null,
            type: unitType || null,
            year: year ? Number(year) : null,
            price: price ? Number(price) : null,
            location: location || null,
            whatsapp: wa,
            description: description || null,
          },
        ])
        .select("id")
        .single();

      if (insertErr || !inserted?.id) {
        throw new Error(insertErr?.message || "Gagal menyimpan listing");
      }

      const listingId = inserted.id as string;

      // 2) Upload images → listing-images
      if (imageFiles.length) {
        setStatus("Mengunggah foto…");
        await uploadFiles(IMAGES_BUCKET, listingId, imageFiles);
      }

      // 3) Upload videos → listing-videos
      if (videoFiles.length) {
        setStatus("Mengunggah video…");
        await uploadFiles(VIDEOS_BUCKET, listingId, videoFiles);
      }

      setStatus("Selesai. Mengarahkan ke halaman detail…");
      router.push(`/listings/${listingId}`);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Terjadi kesalahan saat menyimpan.");
      setStatus(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 960, margin: "32px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>
        Jual Unit
      </h1>

      <form
        onSubmit={onSubmit}
        style={{ display: "grid", gap: 14, alignItems: "start" }}
      >
        {/* Basic info */}
        <div>
          <label>Judul</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Contoh: Yamaha Fazzio 2023 Istimewa"
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label>Merk</label>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Yamaha / Honda / Suzuki"
              style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
            />
          </div>
          <div>
            <label>Tipe/Model</label>
            <input
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)}
              placeholder="Fazzio / Vario / NMAX"
              style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label>Tahun</label>
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2023"
              inputMode="numeric"
              style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
            />
          </div>
          <div>
            <label>Harga (Rp)</label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="18000000"
              inputMode="numeric"
              style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
            />
          </div>
        </div>

        <div>
          <label>Lokasi</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Kab/Kota"
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          />
        </div>

        <div>
          <label>WhatsApp</label>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="08xxx / 62xxx"
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          />
        </div>

        <div>
          <label>Deskripsi</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Kondisi, kilometer, pajak, kelengkapan, dll."
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          />
        </div>

        {/* Images */}
        <div>
          <label>Foto Unit (multiple)</label>
          <input
            ref={imgInputRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            multiple
            onChange={onPickImages}
          />
          {imageFiles.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10, marginTop: 10 }}>
              {imageFiles.map((f, i) => (
                <div key={i} style={{ border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
                  <div style={{ fontSize: 12, marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {f.name}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    style={{ fontSize: 12, border: "1px solid #ddd", borderRadius: 6, padding: "4px 8px" }}
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
            JPG/PNG/WebP • Maks {MAX_IMAGE_MB}MB/file
          </div>
        </div>

        {/* Videos */}
        <div>
          <label>Video Unit (multiple)</label>
          <input
            ref={vidInputRef}
            type="file"
            accept={ALLOWED_VIDEO_TYPES.join(",")}
            multiple
            onChange={onPickVideos}
          />
          {videoFiles.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10, marginTop: 10 }}>
              {videoFiles.map((f, i) => (
                <div key={i} style={{ border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
                  <div style={{ fontSize: 12, marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {f.name}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVideo(i)}
                    style={{ fontSize: 12, border: "1px solid #ddd", borderRadius: 6, padding: "4px 8px" }}
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
            MP4/WebM/Ogg • Maks {MAX_VIDEO_MB}MB/file • (batas durasi akan dicek manual)
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            background: "#111827",
            color: "white",
            padding: "12px 18px",
            borderRadius: 10,
            border: "none",
            fontWeight: 700,
          }}
        >
          {submitting ? "Mengunggah…" : "Terbitkan Listing"}
        </button>

        {status && (
          <p style={{ fontSize: 13, color: "#555" }}>
            {status}
          </p>
        )}
      </form>
    </main>
  );
}
