import type { Metadata } from "next";
import { Inter, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { BrandPreviewProvider } from "@/lib/brandPreview";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const notoArabic = Noto_Sans_Arabic({ variable: "--font-noto-arabic", subsets: ["arabic"], display: "swap", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Turuq Support",
  description: "Support dashboard prototype",
};



export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} ${notoArabic.variable} antialiased`}>
        <Providers>
          <BrandPreviewProvider>{children}</BrandPreviewProvider>
        </Providers>
      </body>
    </html>
  );
}
