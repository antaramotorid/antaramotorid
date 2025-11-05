import Link from 'next/link';

export default async function ListingsPage() {
  // Nanti kita sambungkan ke Supabase. Sekarang placeholder dulu.
  const listings: Array<{ id: number; title: string }> = [];

  return (
    <main>
      <h1 style={{ fontWeight: 600, fontSize: 20, marginBottom: 12 }}>Listing Terbaru</h1>

      {listings.length === 0 ? (
        <p>Belum ada listing. (Nanti akan tampil setelah konek Supabase)</p>
      ) : (
        <ul style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
          {listings.map((l) => (
            <li key={l.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}>
              <Link href={/listings/${l.id}}>{l.title}</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
