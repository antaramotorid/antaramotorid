<li key={l.id} style={{ border:'1px solid #ccc', padding:12 }}>
  <a href={`/listings/${l.id}`} style={{ textDecoration:'none' }}>
    <h2 style={{ fontWeight:600 }}>{l.title}</h2>
  </a>
  <p>{l.brand} — {l.year}</p>
  {typeof l.price === 'number' && <p>Rp {l.price.toLocaleString('id-ID')}</p>}
</li>
