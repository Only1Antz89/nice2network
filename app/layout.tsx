import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./people.css";
import "./network.css";
import "./public.css";
import "./dark-theme.css";
import SiteAnalytics from "./site-analytics";
import AccessibilityController from "@/components/accessibility-controller";
import CookieBanner from "@/components/cookie-banner";
import DeploymentRefresh from "@/components/deployment-refresh";
import TabletViewportController from "@/components/tablet-viewport-controller";
import { getDeploymentVersion } from "@/lib/deployment-version";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const siteUrl = "https://nice2network.vercel.app";
const socialPreviewUrl = `${siteUrl}/nice2-social-preview-v2.png`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "nice 2 network — ideas need good people",
  description: "A place for useful connections, shared projects and the people who help ideas grow.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "nice 2 network",
    locale: "en_GB",
    title: "nice 2 network",
    description: "Ideas need good people.",
    images: [{ url: socialPreviewUrl, secureUrl: socialPreviewUrl, width: 1200, height: 630, type: "image/png", alt: "nice 2 network — Ideas need good people." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "nice 2 network",
    description: "Ideas need good people.",
    images: [{ url: socialPreviewUrl, alt: "nice 2 network — Ideas need good people." }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}><AccessibilityController/><TabletViewportController/><DeploymentRefresh initialVersion={getDeploymentVersion()}/>{children}<CookieBanner/><SiteAnalytics/></body></html>;
}
