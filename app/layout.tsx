import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "栖作 · 小红书创作服务平台",
  description: "室内设计工作室的高级内容秘书：根据项目实景图生成封面、原创文案与发布排期。",
  openGraph: {
    title: "栖作 · 小红书创作服务平台",
    description: "从项目实景图出发，完成封面、文案和三天发布节奏。",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
