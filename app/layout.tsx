import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "AntaraMotorID",
  description: "Jual beli motor bekas dengan fitur upload foto dan video",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        {children}
      </body>
    </html>
  );
}
