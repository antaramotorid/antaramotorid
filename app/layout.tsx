export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body style={{minHeight:'100vh', background:'#fafafa', color:'#111'}}>
        <div style={{maxWidth:960, margin:'0 auto', padding:16}}>
          {children}
        </div>
      </body>
    </html>
  );
}
