import type { Metadata } from "next";
import { siteContent } from "../lib/site-content";
import type { Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "xhs-studio-secretary.mj051225.chatgpt.site";
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";
  const origin = `${protocol}://${host}`;
  return {
    title: siteContent.title,
    description: siteContent.description,
    openGraph: {
      title: siteContent.title,
      description: siteContent.shareDescription,
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1731, height: 907, alt: "栖作室内设计内容秘书" }],
    },
    twitter: {
      card: "summary_large_image",
      title: siteContent.title,
      description: siteContent.shareDescription,
      images: [`${origin}/og.png`],
    },
    appleWebApp: { capable: true, title: "栖作", statusBarStyle: "black-translucent" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1b241f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
