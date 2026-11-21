import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { urlBaseMetadata } from "@/lib/site-url-config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(urlBaseMetadata()),
  title: {
    default: "Rifa Solidária",
    template: "%s | Rifa Solidária",
  },
  description: "Rifas beneficentes online com pagamento por Pix.",
  applicationName: "Rifa Solidária",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="ui-app flex min-h-dvh flex-col">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
