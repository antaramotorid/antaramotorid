export default function ListingsPage() {
  // Data dummy dulu supaya kompilasi lolos
  const listings: { id: number; title: string }[] = [];

  return (
    <main>
      <h1 style={{ fontWeight: 600, fontSize: 20, marginBottom: 12 }}>
        Listing Terbaru
      </h1>

      {listings.length === 0 ? (
        <p>Tidak ada data.</p>
      ) : (
        <ul>
          {listings.map((l) => (
            <li key={l.id}>{l.title}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
