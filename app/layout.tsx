import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteAnalytics from "./site-analytics";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://nice2network.vercel.app"),
  title: "nice 2 network — ideas need good people",
  description: "A place for useful connections, shared projects and the people who help ideas grow.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "nice 2 network",
    description: "Ideas need good people.",
    images: [{ url: "/og.png", width: 1734, height: 907, alt: "nice 2 network — Ideas need good people." }],
  },
  twitter: { card: "summary_large_image", title: "nice 2 network", description: "Ideas need good people.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}<SiteAnalytics/></body></html>;
}
