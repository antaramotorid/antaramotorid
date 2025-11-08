"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type NewListing = {
  title: string;
  brand: string;
  model?: string;
  year?: number;
  location?: string;
  price?: number;
  whatsapp?: string;
  description?: string;
};

export default function SellPage() {
  const router = useRouter();

  // Form fields
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<number | undefined>(undefined);
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");

  // Files (multiple)
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);

  const imagePreviews = useMemo(
    () => imageFiles.map((f) => URL.createObjectURL(f)),
    [imageFiles]
  );

  function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setImageFiles((prev) => [...prev, ...files]);
    e.currentTarget.value = "";
  }

  function onPickVideos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setVideoFiles((prev) => [...prev, ...files]);
    e.currentTarget.value = "";
  }

  function removeImage(idx: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
  }
  function removeVideo(idx: number) {
    setVideoFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !brand.trim()) {
      alert("Judul dan Merk wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      // 1) Insert listing row
      const payload: NewListing = {
        title: title.trim(),
        brand: brand.trim(),
        description: description.trim() || undefined,
      };
      if (model.trim()) payload.model = model.trim();
      if (location.trim()) payload.location = location.trim();
      if (typeof year === "number") payload.year = year;
      if (typeof price === "number") payload.price = price;
      if (whatsapp.trim()) payload.whatsapp = whatsapp.trim();

      const { data: inserted, error: insertErr } = await supabase
        .from("listings")
        .insert(payload)
        .select("id")
        .single();

      if (insertErr || !inserted) {
        throw new Error(insertErr?.message || "Gagal membuat listing.");
      }

      const listingId = inserted.id as string;

      // 2) Upload images
      if (imageFiles.length) {
        for (let i = 0; i < imageFiles.length; i++) {
          const f = imageFiles[i];
          const ext = f.name.split(".").pop() || "jpg";
          const fileName = `${Date.now()}-${i}.${ext}`;
          const path = `${listingId}/${fileName}`;

          const { error } = await supabase.storage
            .from("listing-images")
            .upload(path, f, {
              cacheControl: "3600",
              upsert: false,
            });

          if (error) throw new Error(`Upload foto gagal: ${error.message}`);
        }
      }

      // 3) Upload videos
      if (videoFiles.length) {
        for (let i = 0; i < videoFiles.length; i++) {
          const f = videoFiles[i];
          const ext = f.name.split(".").pop() || "mp4";
          const fileName = `${Date.now()}-${i}.${ext}`;
          const path = `${listingId}/${fileName}`;

          const { error } = await supabase.storage
            .from("listing-videos")
            .upload(path, f, {
              cacheControl: "3600",
              upsert: false,
            });

          if (error) throw new Error(`Upload video gagal: ${error.message}`);
        }
      }

      alert("Listing berhasil dibuat!");
      router.push(`/listings/${listingId}`);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Terjadi kesalahan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>Jual Unit</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        {/* Row 1 */}
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          <Field
            label="Judul"
            placeholder="Contoh: Yamaha Fazzio 2023 istimewa"
            value={title}
            onChange={(v) => setTitle(v)}
            required
          />
          <Field
            label="Merk"
            placeholder="Yamaha / Honda / Suzuki"
            value={brand}
            onChange={(v) => setBrand(v)}
            required
          />
        </div>

        {/* Row 2 */}
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "1fr 1fr 1fr",
          }}
        >
          <Field
            label="Tipe/Model"
            placeholder="Fazzio / Vario / NMAX"
            value={model}
            onChange={(v) => setModel(v)}
          />
          <Field
            label="Tahun"
            type="number"
            placeholder="2023"
            value={year?.toString() ?? ""}
            onChange={(v) => setYear(v ? parseInt(v) : undefined)}
          />
          <Field
            label="Lokasi"
            placeholder="Kab/Kota"
            value={location}
            onChange={(v) => setLocation(v)}
          />
        </div>

        {/* Row 3 */}
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          <Field
            label="Harga (Rp)"
            type="number"
            placeholder="18500000"
            value={price?.toString() ?? ""}
            onChange={(v) => setPrice(v ? parseInt(v) : undefined)}
          />
          <Field
            label="WhatsApp"
            placeholder="08xxx"
            value={whatsapp}
            onChange={(v) => setWhatsapp(v)}
          />
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ fontWeight: 700 }}>Deskripsi</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kondisi, kelengkapan, pajak, keterangan lain..."
            rows={4}
            style={{
              width: "100%",
              resize: "vertical",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 12,
              outline: "none",
            }}
          />
        </div>

        {/* Upload section ala OLX */}
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "1fr 1fr",
            alignItems: "start",
          }}
        >
          {/* IMAGES */}
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontWeight: 700 }}>Foto Unit (bisa banyak)</label>

            <label
              htmlFor="pick-images"
              style={{
                border: "2px dashed #e5e7eb",
                borderRadius: 12,
                padding: 16,
                textAlign: "center",
                cursor: "pointer",
                background: "#fafafa",
              }}
            >
              Klik untuk pilih foto
              <br />
              <small>(jpg, jpeg, png; boleh multiple)</small>
            </label>
            <input
              id="pick-images"
              type="file"
              accept="image/*"
              multiple
              onChange={onPickImages}
              style={{ display: "none" }}
            />

            {/* Preview grid */}
            {imageFiles.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(88px,1fr))",
                  gap: 8,
                }}
              >
                {imagePreviews.map((src, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: "relative",
                      borderRadius: 10,
                      overflow: "hidden",
                      border: "1px solid #e5e7eb",
                      width: "100%",
                      aspectRatio: "1/1",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`foto-${idx + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      title="Hapus"
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        background: "#111827",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "4px 6px",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* VIDEOS */}
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontWeight: 700 }}>Video Unit (opsional, bisa banyak)</label>

            <label
              htmlFor="pick-videos"
              style={{
                border: "2px dashed #e5e7eb",
                borderRadius: 12,
                padding: 16,
                textAlign: "center",
                cursor: "pointer",
                background: "#fafafa",
              }}
            >
              Klik untuk pilih video
              <br />
              <small>(mp4, webm, ogg, mov, m4v; boleh multiple)</small>
            </label>
            <input
              id="pick-videos"
              type="file"
              accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v"
              multiple
              onChange={onPickVideos}
              style={{ display: "none" }}
            />

            {videoFiles.length > 0 && (
              <div style={{ display: "grid", gap: 6 }}>
                {videoFiles.map((f, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      background: "#fff",
                    }}
                  >
                    <span style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis" }}>
                      🎬 {f.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeVideo(idx)}
                      title="Hapus"
                      style={{
                        background: "#111827",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: 8,
            background: submitting ? "#9ca3af" : "#111827",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "12px 18px",
            cursor: submitting ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: 16,
            width: "fit-content",
          }}
        >
          {submitting ? "Mengunggah..." : "Terbitkan Listing"}
        </button>
      </form>
    </div>
  );
}

/* ---------- Small field component ---------- */
function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number";
  required?: boolean;
}) {
  const { label, value, onChange, placeholder, type = "text", required } = props;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontWeight: 700 }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          width: "100%",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: "10px 12px",
          outline: "none",
        }}
      />
    </div>
  );
}
