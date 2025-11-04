import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1 style={{fontWeight:700, fontSize:24}}>Antaramotorid</h1>
      <p style={{marginTop:8}}>Marketplace motor bekas – ringan & cepat.</p>
      <div style={{marginTop:16, display:'flex', gap:12}}>
        <Link href="/listings">Lihat Listing</Link>
        <Link href="/sell">Jual Motor</Link>
      </div>
    </main>
  );
}
