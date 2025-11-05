export default function ListingDetailPage({ params }: { params: { id: string } }) {
  return (
    <main style={{ maxWidth: 800, margin: '40px auto' }}>
      <h1 style={{ fontSize: 26, fontWeight: 600 }}>Detail Listing #{params.id}</h1>
      <p>Data detail akan tampil setelah database sudah tersambung kembali.</p>
    </main>
  );
}
