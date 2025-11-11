// app/layout.tsx
import "../globals.css";
import React from "react";

export const metadata = {
  title: "AntaraMotorID",
  description: "Marketplace - AntaraMotorID",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-white text-gray-800 antialiased">
        {children}
      </body>
    </html>
  );
}
