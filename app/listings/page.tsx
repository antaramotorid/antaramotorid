"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Listing = {
  id: number;
  title: string;
  brand: string;
  year: number;
  price: number;
  location: string | null;
  whatsapp: string | null;
};

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .order("id", { ascending: false });

      if (!error && data) setListings(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <main style={{ padding: 40 }}>Memuat…</main>;

  return (
    <main style={{ maxWidth: 900, margin: "40px auto" }}>
      <h1 style={{ fontWeight: 700, fontSize: 24, marginBottom: 16 }}>
        Listing Terbaru
      </h1>

      {listings.length === 0 && <p>Tidak ada data.</p>}

      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))" }}>
        {listings.map((l) => {
          const waHref = l.whatsapp
            ? `https://wa.me/${l.whatsapp.replace(/[^0-9]/g, "")}`
            : null;

          return (
            <div
              key={l.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 14,
                background: "#fff",
              }}
            >
              <Link
                href={`/listings/${l.id}`}
                style={{ fontSize: 18, fontWeight: 600, color: "#2563eb" }}
              >
                {l.title}
              </Link>

              <p style={{ marginTop: 6, color: "#6b7280" }}>
                {l.brand} • {l.year}
              </p>

              <p
                style={{
                  fontWeight: 700,
                  marginTop: 10,
                  fontSize: 16,
                }}
              >
                Rp {l.price.toLocaleString("id-ID")}
              </p>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  {l.location || "Lokasi tidak ada"}
                </span>

                {waHref && (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12,
                      padding: "6px 12px",
                      border: "1px solid #10b981",
                      borderRadius: 999,
                      textDecoration: "none",
                    }}
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
