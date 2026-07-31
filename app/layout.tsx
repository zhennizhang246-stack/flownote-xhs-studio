import type { Metadata } from "next";
import { siteContent } from "../lib/site-content";
import "./globals.css";

export const metadata: Metadata = {
  title: siteContent.title,
  description: siteContent.description,
  openGraph: {
    title: siteContent.title,
    description: siteContent.shareDescription,
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
