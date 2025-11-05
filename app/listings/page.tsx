export default function ListingsPage() {
  const listings: Array<{ id: number; title: string }> = [];

  return (
    <main style={{ maxWidth: 800, margin: '40px auto' }}>
      <h1 style={{ fontWeight: 600, fontSize: 22, marginBottom: 20 }}>
        Listing Terbaru
      </h1>

      {listings.length === 0 ? (
        <p>Tidak ada data (akan disambungkan ke database setelah build hijau).</p>
      ) : (
        <ul style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
          {listings.map((l) => (
            <li key={l.id} style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
              <a href={`/listings/${l.id}`} style={{ textDecoration: 'none', color: 'black' }}>
                {l.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
