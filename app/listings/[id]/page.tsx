import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

type Listing = {
  id: number | string;
  title: string;
  brand: string;
  year: number;
  price: number;
  location: string | null;
  whatsapp: string | null;
  created_at: string;
};

export default async function ListingDetailPage({
  params,
}: { params: { id: string } }) {
  const idParam = params.id;

  // deteksi: numeric (bigserial) atau uuid (ada tanda '-')
  const isNumericId = /^\d+$/.test(idParam);
  const idForQuery: number | string = isNumericId ? Number(idParam) : idParam;

  // kalau bukan angka dan bukan pola uuid minimal (mengandung huruf/angka & '-'), kasih error lebih rapi
  if (!isNumericId && !/^[0-9a-fA-F-]{6,}$/.test(idParam)) {
    return (
      <main style={{ maxWidth: 860, margin: "40px auto" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 16 }}>
          Terjadi kesalahan
        </h1>
        <p>ID tidak valid: <code>{idParam}</code></p>
        <p style={{ marginTop: 16 }}>
          <Link href="/listings">← Kembali ke Listings</Link>
        </p>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", idForQuery)
    .single<Listing>();

  if (error || !data) {
    return (
      <main style={{ maxWidth: 860, margin: "40px auto" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 16 }}>
          Tidak ditemukan
        </h1>
        <p>Listing dengan ID <code>{idParam}</code> tidak ada.</p>
        <p style={{ marginTop: 16 }}>
          <Link href="/listings">← Kembali ke Listings</Link>
        </p>
      </main>
    );
  }

  const waHref = data.whatsapp
    ? `https://wa.me/${String(data.whatsapp).replace(/[^0-9]/g, "")}`
    : null;

  return (
    <main style={{ maxWidth: 900, margin: "40px auto" }}>
      <p style={{ marginBottom: 16 }}>
        <Link href="/listings">← Kembali ke Listings</Link>
      </p>

      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
        {data.title}
      </h1>

      <p style={{ color: "#6b7280", marginBottom: 16 }}>
        {data.brand} • {data.year}
      </p>

      <p style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>
        Rp {Number(data.price).toLocaleString("id-ID")}
      </p>

      <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
        {data.location || "Lokasi tidak ada"}
      </p>

      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid #10b981",
            textDecoration: "none",
          }}
        >
          Hubungi via WhatsApp
        </a>
      )}
    </main>
  );
}
