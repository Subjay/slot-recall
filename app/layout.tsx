import type { Metadata, Viewport } from "next";
import "@styles/globals.scss";
import { headers } from "next/headers";
import Footer from "@components/ui/layout/footer";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = headers();
  const protocol = (await headersList).get("x-forwarded-proto") || "http";
  const host = (await headersList).get("host");
  const origin = `${protocol}://${host}`;
  return {
    metadataBase: new URL(origin),
    alternates: {
      canonical: `/`,
    },
    title: {
      template: "Sébastien Gillig | %s",
      default: "Sébastien Gillig",
    },
    robots: {
      index: true,
      follow: true,
    },
    referrer: "strict-origin",
    description: "Sébastien Gillig's CV and personal portfolio website.",
    creator: "Sébastien Gillig",
    authors: [{ name: "Sébastien Gillig" }],
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "normal",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        {children}

        <Footer />
      </body>
    </html>
  );
}
