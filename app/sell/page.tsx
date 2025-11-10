// app/sell/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
// ================== Helpers (static data) ==================
const YEARS = (() => {
  const now = new Date().getFullYear();
  const list: number[] = [];
  for (let y = now; y >= 1980; y--) list.push(y);
  return list;
})();

const BRANDS = [
  "Yamaha",
  "Honda",
  "Suzuki",
  "Kawasaki",
  "Vespa",
  "TVS",
  "Benelli",
  "CFMoto",
  "Kymco",
  "NIU (Listrik)",
  "United (Listrik)",
] as const;

const TYPES_BY_BRAND: Record<(typeof BRANDS)[number], string[]> = {
  Yamaha: ["NMAX", "Aerox", "Lexi", "Fazzio", "XMAX", "R15", "R25", "XSR155", "MT15", "Vixion"],
  Honda: ["Vario", "PCX", "Beat", "Scoopy", "ADV160", "CBR150R", "CBR250RR", "CB150R", "Genio"],
  Suzuki: ["Satria", "GSX R150", "GSX S150", "Address"],
  Kawasaki: ["Ninja 250", "W175", "KLX150", "ZX25R"],
  Vespa: ["LX", "Primavera", "Sprint", "GTS"],
  TVS: ["Neo", "Apache"],
  Benelli: ["Panarea", "TNT 249", "Leoncino"],
  CFMoto: ["250SR", "300NK"],
  Kymco: ["Like", "Racing King"],
  "NIU (Listrik)": ["NQi", "MQi", "UQi"],
  "United (Listrik)": ["TX3000", "T1800", "MX1200"],
};

const COLORS = [
  "Hitam", "Putih", "Merah", "Biru", "Abu-abu", "Silver", "Kuning",
  "Hijau", "Coklat", "Oranye", "Custom / Lainnya",
];

// ================== Types ==================
type FormState = {
  title: string;
  brand: (typeof BRANDS)[number] | "";
  unit_type: string;
  year: number | "";
  color: string;
  mileage_km: number | "";
  price: number | "";
  whatsapp: string;
  description: string;

  // Lokasi administratif (opsional—boleh kosong)
  province?: string;
  regency?: string;
  district?: string;
  village?: string;

  // Koordinat (opsional)
  latitude?: number | "";
  longitude?: number | "";
};

type UploadState = {
  file?: File;
  url?: string;      // public URL setelah upload
  progress: number;  // 0..100
  uploading: boolean;
};

// ================== Map Picker (Leaflet, tanpa token) ==================
function MapPicker({
  lat,
  lng,
  onChange,
}: {
  lat?: number | "";
  lng?: number | "";
  onChange: (coords: { lat: number; lng: number }) => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<any>(null); // simpan instance leaflet (L)
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // init map
  useEffect(() => {
    let ignore = false;

    (async () => {
      if (!mapRef.current) return;
      // dynamic import (TANPA .default)
      const L = await import("leaflet");

      // fix marker icon di Next
      const icon = L.icon({
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      leafletRef.current = L;

      if (ignore) return;
      const startLat = typeof lat === "number" ? lat : -6.2;
      const startLng = typeof lng === "number" ? lng : 106.816666;

      const map = L.map(mapRef.current).setView([startLat, startLng], 12);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const marker = L.marker([startLat, startLng], { icon, draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on("dragend", () => {
        const c = marker.getLatLng();
        onChange({ lat: c.lat, lng: c.lng });
      });

      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        onChange({ lat, lng });
      });
    })();

    return () => {
      ignore = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // init sekali

  // update marker saat lat/lng berubah dari luar
  useEffect(() => {
    if (!markerRef.current || !leafletRef.current || !mapInstanceRef.current) return;
    if (typeof lat === "number" && typeof lng === "number") {
      markerRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.setView([lat, lng]);
    }
  }, [lat, lng]);

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: 260,
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        overflow: "hidden",
      }}
    />
  );
}

// ================== Main Page ==================
export default function SellPage() {
  const [form, setForm] = useState<FormState>({
    title: "",
    brand: "",
    unit_type: "",
    year: "",
    color: "",
    mileage_km: "",
    price: "",
    whatsapp: "",
    description: "",

    province: "",
    regency: "",
    district: "",
    village: "",

    latitude: "",
    longitude: "",
  });

  const [imgSlots, setImgSlots] = useState<UploadState[]>(
    Array.from({ length: 6 }, () => ({ progress: 0, uploading: false }))
  );
  const [videoSlot, setVideoSlot] = useState<UploadState>({ progress: 0, uploading: false });

  const imgInputs = useRef<(HTMLInputElement | null)[]>([]);
  const videoInput = useRef<HTMLInputElement | null>(null);

  const brandTypes = useMemo(
    () => (form.brand && TYPES_BY_BRAND[form.brand]) || [],
    [form.brand]
  );

  // ================== Handlers ==================
  const onChange = (key: keyof FormState) => (e: any) => {
    const val = e.target?.value;
    setForm((f) => ({ ...f, [key]: val }));
  };

  const pickImage = (i: number) => {
    imgInputs.current[i]?.click();
  };

  const onImageChosen = (i: number) => async (e: any) => {
    const file: File | undefined = e.target.files?.[0];
    if (!file) return;
    setImgSlots((s) => {
      const next = [...s];
      next[i] = { ...next[i], file, uploading: true, progress: 0 };
      return next;
    });
  };

  const pickVideo = () => videoInput.current?.click();

  const onVideoChosen = async (e: any) => {
    const f: File | undefined = e.target.files?.[0];
    if (!f) return;
    setVideoSlot({ file: f, uploading: true, progress: 0 });
  };

  const useMyGPS = () => {
    if (!navigator.geolocation) {
      alert("Perangkat tidak mendukung Geolocation.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm((f) => ({ ...f, latitude, longitude }));
      },
      () => alert("Gagal mengambil lokasi. Pastikan akses lokasi diizinkan."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ================== Submit ==================
  async function handleSubmit() {
    // 1) Simpan listing
    const payload: any = {
      title: form.title || null,
      brand: form.brand || null,
      unit_type: form.unit_type || null,
      year: form.year || null,
      color: form.color || null,
      mileage_km: form.mileage_km || null,
      price: form.price || null,
      whatsapp: form.whatsapp || null,
      description: form.description || null,

      province: form.province || null,
      regency: form.regency || null,
      district: form.district || null,
      village: form.village || null,

      latitude: form.latitude || null,
      longitude: form.longitude || null,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await supabase
      .from("listings")
      .insert(payload)
      .select("id")
      .single();

    if (error || !inserted?.id) {
      alert("Gagal menyimpan listing: " + (error?.message ?? "unknown"));
      return;
    }
    const listingId = inserted.id as string;

    // 2) Upload media
    // foto -> bucket "listing-images/listingId/filename"
    await Promise.all(
      imgSlots.map(async (slot, i) => {
        if (!slot.file) return;
        const ext = slot.file.name.split(".").pop() || "jpg";
        const path = `${listingId}/${Date.now()}-${i}.${ext}`;

        const { data, error } = await supabase.storage
          .from("listing-images")
          .upload(path, slot.file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) {
          console.error("upload image error", error);
          setImgSlots((s) => {
            const n = [...s];
            n[i] = { ...n[i], uploading: false };
            return n;
          });
          return;
        }

        const { data: pub } = supabase.storage.from("listing-images").getPublicUrl(path);
        setImgSlots((s) => {
          const n = [...s];
          n[i] = { ...n[i], uploading: false, progress: 100, url: pub?.publicUrl };
          return n;
        });
      })
    );

    // video -> bucket "listing-videos/listingId/filename"
    if (videoSlot.file) {
      const ext = videoSlot.file.name.split(".").pop() || "mp4";
      const vpath = `${listingId}/${Date.now()}.${ext}`;

      const { error: vErr } = await supabase.storage
        .from("listing-videos")
        .upload(vpath, videoSlot.file, { cacheControl: "3600", upsert: false });

      if (vErr) {
        console.error("upload video error", vErr);
        setVideoSlot((v) => ({ ...v, uploading: false }));
      } else {
        const { data: vpub } = supabase.storage.from("listing-videos").getPublicUrl(vpath);
        setVideoSlot((v) => ({ ...v, uploading: false, progress: 100, url: vpub?.publicUrl }));
      }
    }

    alert("Iklan berhasil diterbitkan!");
    // (opsional) redirect ke /listings
    // window.location.href = "/listings";
  }

  // ================== UI Pieces ==================
  const UploadTile = ({
    label,
    onClick,
    previewUrl,
    uploading,
    progress,
  }: {
    label: string;
    onClick: () => void;
    previewUrl?: string;
    uploading?: boolean;
    progress?: number;
  }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        width: 160,
        height: 120,
        border: "1px dashed #cbd5e1",
        borderRadius: 12,
        background: "#fafafa",
        overflow: "hidden",
      }}
    >
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span
          style={{
            color: "#64748b",
            fontSize: 13,
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {label}
        </span>
      )}

      {uploading ? (
        <div
          style={{
            position: "absolute",
            left: 8,
            right: 8,
            bottom: 8,
            height: 6,
            background: "#e5e7eb",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress ?? 0}%`,
              height: "100%",
              background: "#0ea5e9",
            }}
          />
        </div>
      ) : null}
    </button>
  );

  // ================== Render ==================
  return (
    <main style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 18px" }}>Jual Unit</h1>

      {/* ========== Uploads (paling atas, sesuai versi hijau) ========== */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18, alignItems: "start" }}>
        <div>
          <h3 style={{ margin: "0 0 10px" }}>Foto Unit (maks 6)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 160px)", gap: 12 }}>
            {imgSlots.map((s, i) => (
              <div key={i}>
                <UploadTile
                  label="Upload Foto"
                  onClick={() => pickImage(i)}
                  previewUrl={s.url}
                  uploading={s.uploading}
                  progress={s.progress}
                />
                <input
                  ref={(el) => {
                    imgInputs.current[i] = el;
                    return el;
                  }}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={onImageChosen(i)}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 style={{ margin: "0 0 10px" }}>Video Unit (opsional)</h3>
          <UploadTile
            label="Upload Video"
            onClick={pickVideo}
            previewUrl={videoSlot.url}
            uploading={videoSlot.uploading}
            progress={videoSlot.progress}
          />
          <input
            ref={(el) => (videoInput.current = el)}
            type="file"
            accept="video/*"
            hidden
            onChange={onVideoChosen}
          />
        </div>
      </div>

      {/* ========== Form info unit ========== */}
      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <label>Judul</label>
          <input
            value={form.title}
            onChange={onChange("title")}
            placeholder="Contoh: Yamaha Fazzio 2024 istimewa"
          />
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Tahun</label>
          <select value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) || "" }))}>
            <option value="">Pilih Tahun</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Merk</label>
          <select
            value={form.brand}
            onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value as any, unit_type: "" }))}
          >
            <option value="">Pilih Merk</option>
            {BRANDS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Tipe/Model</label>
          <select
            value={form.unit_type}
            onChange={onChange("unit_type")}
            disabled={!form.brand}
          >
            <option value="">{form.brand ? "Pilih Tipe" : "Pilih merk dulu"}</option>
            {brandTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Warna</label>
          <select value={form.color} onChange={onChange("color")}>
            <option value="">Pilih Warna</option>
            {COLORS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Kilometer</label>
          <input
            inputMode="numeric"
            placeholder="25000"
            value={form.mileage_km}
            onChange={(e) =>
              setForm((f) => ({ ...f, mileage_km: (e.target.value || "").toString().replace(/[^\d]/g, "") as any }))
            }
          />
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>Harga (Rp)</label>
          <input
            inputMode="numeric"
            placeholder="18000000"
            value={form.price}
            onChange={(e) =>
              setForm((f) => ({ ...f, price: (e.target.value || "").toString().replace(/[^\d]/g, "") as any }))
            }
          />
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label>WhatsApp</label>
          <input placeholder="08xxx" value={form.whatsapp} onChange={onChange("whatsapp")} />
        </div>

        <div style={{ gridColumn: "1 / -1", display: "grid", gap: 8 }}>
          <label>Deskripsi</label>
          <textarea
            rows={5}
            placeholder="Kondisi mesin, body, pajak, servis, alasan jual, dll."
            value={form.description}
            onChange={onChange("description")}
          />
        </div>
      </div>

      {/* ========== Lokasi ========== */}
      <div style={{ marginTop: 20 }}>
        <h3 style={{ margin: "0 0 8px" }}>Lokasi</h3>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <input
            style={{ flex: "1 1 160px" }}
            placeholder="Provinsi"
            value={form.province ?? ""}
            onChange={onChange("province")}
          />
          <input
            style={{ flex: "1 1 160px" }}
            placeholder="Kab/Kota"
            value={form.regency ?? ""}
            onChange={onChange("regency")}
          />
          <input
            style={{ flex: "1 1 160px" }}
            placeholder="Kecamatan"
            value={form.district ?? ""}
            onChange={onChange("district")}
          />
          <input
            style={{ flex: "1 1 160px" }}
            placeholder="Kelurahan"
            value={form.village ?? ""}
            onChange={onChange("village")}
          />
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={useMyGPS} style={btn()}>
            Gunakan Lokasi Saya (GPS)
          </button>
          <input
            style={{ width: 140 }}
            placeholder="Latitude"
            value={form.latitude ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value ? Number(e.target.value) : "" }))}
            inputMode="decimal"
          />
          <input
            style={{ width: 140 }}
            placeholder="Longitude"
            value={form.longitude ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value ? Number(e.target.value) : "" }))}
            inputMode="decimal"
          />
        </div>

        <MapPicker
          lat={typeof form.latitude === "number" ? form.latitude : undefined}
          lng={typeof form.longitude === "number" ? form.longitude : undefined}
          onChange={({ lat, lng }) => setForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
        />
      </div>

      {/* ========== Publish ========== */}
      <div style={{ marginTop: 18 }}>
        <button type="button" onClick={handleSubmit} style={btnPrimary()}>
          Terbitkan Iklan
        </button>
        <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 8 }}>
          *Batasi konten yang melanggar hukum, SARA, atau dewasa — akan ditolak.
        </p>
      </div>
    </main>
  );
}

// ================== Small CSS helpers ==================
function btn() {
  return {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
  } as const;
}
function btnPrimary() {
  return {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #0ea5e9",
    background: "#0ea5e9",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  } as const;
}
