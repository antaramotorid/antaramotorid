import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1 style={{ fontWeight: 700, fontSize: 24 }}>antaramotorid</h1>
      <p style={{ marginTop: 8 }}>Marketplace motor bekas — ringan & cepat.</p>

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <Link href="/listings">Lihat Listings</Link>
        <Link href="/sell">Jual Motor</Link>
        <Link href="/auth">Masuk</Link>
      </div>
    </main>
  );
}
