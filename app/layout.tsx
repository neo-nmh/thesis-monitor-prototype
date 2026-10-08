import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thesis monitor",
  description: "Trade theses and sourced subthesis checks.",

};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
