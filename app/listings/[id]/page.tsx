export default async function ListingDetailPage({
  params,
}: { params: { id: string } }) {
  return (
    <main>
      <h1 style={{ fontWeight: 700, fontSize: 22 }}>Detail Listing</h1>
      <p>ID: {params.id}</p>
      <p>(Konten detail akan muncul setelah kita sambungkan ke database.)</p>
    </main>
  );
}
