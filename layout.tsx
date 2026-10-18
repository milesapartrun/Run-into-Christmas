import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Christmas Run — Run into Christmas",
  description: "24 Tage. 24 Challenges. Dein Dezember, dein Lauf.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body>{children}</body></html>;
}