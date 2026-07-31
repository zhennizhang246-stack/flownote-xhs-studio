import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "栖作 · 小红书创作服务平台",
  description: "室内设计工作室的高级内容秘书：项目资产归档、可修改发布排期、每日高热参考解析与原创内容生成。",
  openGraph: {
    title: "栖作 · 小红书创作服务平台",
    description: "从项目实景图出发，完成资产归档、封面文案、灵活排期与每日内容研究。",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
