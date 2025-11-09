// app/sell/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Brand = "Yamaha" | "Honda" | "Suzuki" | "Kawasaki" | "Vespa" | "BMW" | "Ducati" | "KTM" | "TVS" | "Benelli" | "Gesits" | "Viar" | "SM Sport" | "Keeway" | "Yadea" | "Selis";
type TypeMap = Record<Brand, string[]>;

const TYPE_BY_BRAND: TypeMap = {
  Yamaha: ["Fazzio", "NMAX", "Aerox", "R15", "R25", "XSR155", "MT-15", "Vixion", "Gear 125", "Mio"],
  Honda: ["Vario", "Beat", "PCX", "ADV", "Scoopy", "CBR 150", "CBR 250", "CB150R", "Revo", "Supra X"],
  Suzuki: ["Satria FU", "GSX R150", "GSX S150", "Nex II", "Address"],
  Kawasaki: ["Ninja 250", "W175", "KLX 150", "Z250"],
  Vespa: ["Primavera", "Sprint", "GTS", "LX"],
  BMW: ["G310R", "G310GS", "R 1250 GS", "S 1000 RR"],
  Ducati: ["Panigale", "Monster", "Scrambler"],
  KTM: ["Duke 200", "Duke 250", "RC 200", "RC 390"],
  TVS: ["Apache RTR 160", "Ntorq 125"],
  Benelli: ["TNT 249S", "Leoncino"],
  Gesits: ["G1", "Raya"],
  Viar: ["Q1", "Cross X"],
  "SM Sport": ["SM3 250", "V16"],
  Keeway: ["Cafe Racer 152", "RKF 125"],
  Yadea: ["G5", "T9"],
  Selis: ["Eagle", "E-Max"],
};

const YEARS = (() => {
  const now = new Date().getFullYear();
  const arr: number[] = [];
  for (let y = now; y >= 1980; y--) arr.push(y);
  return arr;
})();

type FormState = {
  title: string;
  brand: Brand | "";
  unit_type: string;
  year: number | "";
  color: string;
  mileage_km: number | "";
  location: string;
  whatsapp: string;
  price: number | "";
  description: string;
};

const initialForm: FormState = {
  title: "",
  brand: "",
  unit_type: "",
  year: "",
  color: "",
  mileage_km: "",
  location: "",
  whatsapp: "",
  price: "",
  description: "",
};

// ===== Helpers =====
const imgBuckets = ["listing-images", "listing_image", "listing_images"];
const vidBuckets = ["listing-videos", "listing_videos", "listing-videos-pending"];

async function uploadToFirstAvailableBucket(
  buckets: string[],
  listingId: string,
  file: File,
  onProgress?: (p: number) => void
): Promise<string> {
  // pilih bucket pertama yang ada (anggap semuanya ada; kalau error, coba berikutnya)
  for (const bucket of buckets) {
    const path = `${listingId}/${file.name}`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: true,
        // @ts-expect-error Supabase client di browser belum expose progress; abaikan type
        onUploadProgress: (evt: any) => {
          if (!evt?.total) return;
          const pct = Math.round((evt.loaded / evt.total) * 100);
          onProgress?.(pct);
        },
      });

    if (!error) {
      const pub = supabase.storage.from(bucket).getPublicUrl(path);
      return pub.data.publicUrl;
    }
  }
  throw new Error("Gagal upload ke semua bucket.");
}

// ===== UI Thumbnail Slot =====
type SlotProps = {
  kind: "image" | "video";
  previewUrl?: string | null;
  progress?: number;
  onPick: () => void;
  onClear?: () => void;
  label?: string;
};

function UploadSlot({ kind, previewUrl, progress = 0, onPick, onClear, label }: SlotProps) {
  const isVideo = kind === "video";

  return (
    <div
      onClick={onPick}
      role="button"
      aria-label={label || (isVideo ? "Upload Video" : "Upload Foto")}
      style={{
        position: "relative",
        width: 120,
        height: 120,
        borderRadius: 12,
        border: "1px dashed #cbd5e1",
        overflow: "hidden",
        background: "#f8fafc",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {previewUrl ? (
        isVideo ? (
          <video
            src={previewUrl}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            muted
            controls={false}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            color: "#64748b",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          {isVideo ? "Upload Video" : "Upload Foto"}
        </div>
      )}

      {/* Overlay & progress */}
      {progress > 0 && progress < 100 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              height: 6,
              background: "#1e293b",
              margin: 10,
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "#22c55e",
                transition: "width .2s",
              }}
            />
          </div>
        </div>
      )}

      {/* Tombol hapus kecil */}
      {previewUrl && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear?.();
          }}
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            padding: "2px 6px",
            fontSize: 11,
          }}
        >
          Hapus
        </button>
      )}
    </div>
  );
}

export default function SellPage() {
  const [form, setForm] = useState<FormState>(initialForm);

  // 6 slot foto
  const [imageFiles, setImageFiles] = useState<(File | null)[]>(Array(6).fill(null));
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>(Array(6).fill(null));
  const [imgProgress, setImgProgress] = useState<number[]>(Array(6).fill(0));
  const imgInputs = useRef<(HTMLInputElement | null)[]>([]);

  // 1 slot video
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [vidProgress, setVidProgress] = useState(0);
  const vidInput = useRef<HTMLInputElement | null>(null);

  const typesForBrand = useMemo(
    () => (form.brand ? TYPE_BY_BRAND[form.brand] : []),
    [form.brand]
  );

  // Handlers
  const onChange = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val =
      key === "price" || key === "mileage_km" || key === "year"
        ? (e.target.value === "" ? "" : Number(e.target.value))
        : e.target.value;
    setForm((s) => ({ ...s, [key]: val }));
  };

  const pickImage = (idx: number) => {
    imgInputs.current[idx]?.click();
  };

  const pickVideo = () => {
    vidInput.current?.click();
  };

  const onImagePicked = (idx: number, file: File | null) => {
    const next = [...imageFiles];
    next[idx] = file;
    setImageFiles(next);

    const pv = [...imagePreviews];
    pv[idx] = file ? URL.createObjectURL(file) : null;
    setImagePreviews(pv);

    const pr = [...imgProgress];
    pr[idx] = 0;
    setImgProgress(pr);
  };

  const onVideoPicked = (file: File | null) => {
    setVideoFile(file);
    setVidProgress(0);
    setVideoPreview(file ? URL.createObjectURL(file) : null);
  };

  async function handleSubmit() {
    try {
      // 1) Insert listing row
      const { data: row, error } = await supabase
        .from("listings")
        .insert({
          title: form.title,
          brand: form.brand || null,
          unit_type: form.unit_type || null,
          year: form.year || null,
          color: form.color || null,
          mileage_km: form.mileage_km || null,
          location: form.location || null,
          whatsapp: form.whatsapp || null,
          price: form.price || null,
          description: form.description || null,
        })
        .select("*")
        .single();

      if (error || !row?.id) throw error || new Error("Insert listing gagal");
      const listingId = row.id as string;

      // 2) Upload foto (maks 6)
      for (let i = 0; i < imageFiles.length; i++) {
        const f = imageFiles[i];
        if (!f) continue;
        await uploadToFirstAvailableBucket(imgBuckets, listingId, f, (p) => {
          setImgProgress((prev) => {
            const cp = [...prev];
            cp[i] = p;
            return cp;
          });
        });
      }

      // 3) Upload video (opsional)
      if (videoFile) {
        await uploadToFirstAvailableBucket(vidBuckets, listingId, videoFile, setVidProgress);
      }

      // 4) Selesai
      alert("Iklan berhasil diterbitkan!");
      // reset ringan
      setForm(initialForm);
      setImageFiles(Array(6).fill(null));
      setImagePreviews(Array(6).fill(null));
      setImgProgress(Array(6).fill(0));
      setVideoFile(null);
      setVideoPreview(null);
      setVidProgress(0);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Gagal terbitkan iklan");
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: "24px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>Jual Unit</h1>

      {/* ====== Upload Section (di atas, sesuai versi hijau) ====== */}
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Foto Unit (maks 6)</h2>

        {/* Grid 6 slot */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 120px)", gap: 10 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <UploadSlot
                kind="image"
                previewUrl={imagePreviews[i]}
                progress={imgProgress[i]}
                onPick={() => pickImage(i)}
                onClear={() => onImagePicked(i, null)}
              />
              <input
                ref={(el) => (imgInputs.current[i] = el)}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => onImagePicked(i, e.target.files?.[0] || null)}
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Video Unit (opsional)</h3>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <UploadSlot
              kind="video"
              previewUrl={videoPreview || undefined}
              progress={vidProgress}
              onPick={pickVideo}
              onClear={() => onVideoPicked(null)}
            />
            <input
              ref={vidInput}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => onVideoPicked(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <p style={{ color: "#6b7280", fontSize: 12, marginTop: 8 }}>
          *Batasi konten yang melanggar hukum, SARA, atau dewasa — akan ditolak.
        </p>
      </div>

      {/* ====== Form detail ====== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
        }}
      >
        <div style={{ display: "grid", gap: 8 }}>
          <label>Judul</label>
          <input value={form.title} onChange={onChange("title")} placeholder="Contoh: Yamaha Fazzio 2024 Istimewa" />
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Merk</label>
          <select value={form.brand} onChange={onChange("brand")}>
            <option value="">Pilih Merk</option>
            {(Object.keys(TYPE_BY_BRAND) as Brand[]).map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Tipe/Model</label>
          <select value={form.unit_type} onChange={onChange("unit_type")} disabled={!form.brand}>
            <option value="">{form.brand ? "Pilih Tipe" : "Pilih merk dulu"}</option>
            {typesForBrand.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Tahun</label>
          <select value={form.year as any} onChange={onChange("year")}>
            <option value="">Pilih Tahun</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Warna</label>
          <input value={form.color} onChange={onChange("color")} placeholder="Hitam / Merah / Doff" />
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Kilometer</label>
          <input value={form.mileage_km as any} onChange={onChange("mileage_km")} placeholder="25000" inputMode="numeric" />
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Lokasi</label>
          <input value={form.location} onChange={onChange("location")} placeholder="Kota/Kabupaten" />
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>WhatsApp</label>
          <input value={form.whatsapp} onChange={onChange("whatsapp")} placeholder="08xxx" />
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Harga (Rp)</label>
          <input value={form.price as any} onChange={onChange("price")} placeholder="18000000" inputMode="numeric" />
        </div>

        <div style={{ gridColumn: "1 / -1", display: "grid", gap: 8 }}>
          <label>Deskripsi</label>
          <textarea
            value={form.description}
            onChange={onChange("description")}
            placeholder="Kondisi mesin, body, pajak, servis, alasan jual, dll…"
            rows={5}
          />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button
          onClick={handleSubmit}
          style={{
            background: "#111827",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 10,
            border: 0,
            fontWeight: 700,
          }}
        >
          Terbitkan Iklan
        </button>
      </div>
    </main>
  );
}
