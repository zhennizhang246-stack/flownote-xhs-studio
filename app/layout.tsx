import type { Metadata } from "next";
import { siteContent } from "../lib/site-content";
import type { Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: siteContent.title,
  description: siteContent.description,
  openGraph: {
    title: siteContent.title,
    description: siteContent.shareDescription,
    type: "website",
  },
  appleWebApp: {
    capable: true,
    title: "栖作",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1b241f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
