export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: 16,
          fontFamily: "system-ui, Arial, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
