// app/listings/page.tsx
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type Row = { id: string; title: string; brand: string | null; year: number | null; price: number | null };

export default async function ListingsPage() {
  const { data } = await supabase
    .from("listings")
    .select("id,title,brand,year,price")
    .order("created_at", { ascending: false })
    .limit(40);

  const listings: Row[] = data ?? [];

  return (
    <main style={{ maxWidth: 800, margin: "40px auto" }}>
      <h1 style={{ fontWeight: 600, fontSize: 22, marginBottom: 20 }}>Listing Terbaru</h1>

      {listings.length === 0 ? (
        <p>Belum ada data.</p>
      ) : (
        <ul style={{ display:"grid", gap:18, gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))" }}>
          {listings.map(x => (
            <li key={x.id} style={{ border:"1px solid #ddd", padding:12, borderRadius:8 }}>
              {/* WAJIB: pakai ${x.id}, BUKAN '<uuid>'/ '[id]' */}
              <Link href={/listings/${x.id}}>{x.title}</Link>
              <p>{x.brand ?? "-"} - {x.year ?? "-"}</p>
              <b>Rp {x.price ?? 0}</b>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
