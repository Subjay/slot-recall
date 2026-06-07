import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Refill Desk",
  description: "A live appointment refill dashboard for practice teams.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
