import type { Metadata } from "next";
import Link from "next/link";
import { siteContent } from "../../lib/site-content";
import { ShareActions } from "./share-actions";

export const metadata: Metadata = {
  title: `微信转发专页 · ${siteContent.shortTitle}`,
  description: siteContent.shareDescription,
  openGraph: {
    title: siteContent.title,
    description: siteContent.shareDescription,
    type: "website",
  },
};

export default function WechatSharePage() {
  return (
    <main className="wechat-page">
      <header className="wechat-nav">
        <a className="wechat-brand" href="#features">
          <span>栖</span>
          <strong>栖作</strong>
        </a>
        <span className="wechat-sync-badge">公开功能介绍 · 不包含任何账户资料</span>
      </header>

      <section className="wechat-hero">
        <div className="wechat-hero-copy">
          <p className="wechat-kicker">XIAOHONGSHU CREATIVE SERVICE</p>
          <h1>让每一个室内设计项目，<br />都变成值得被看见的内容。</h1>
          <p className="wechat-lead">{siteContent.shareDescription}</p>
          <ShareActions />
          <div className="wechat-actions"><a className="wechat-secondary" href="/mobile/">打开微信手机创作入口</a><Link className="wechat-secondary" href="/">创建自己的独立工作区</Link><a className="wechat-secondary" href="#features">查看平台能力</a></div>
          <p className="wechat-account-note">{siteContent.accountNote}</p>
        </div>

        <div className="wechat-preview" aria-label="平台创作流程预览">
          <span className="wechat-preview-label">MJ STUDIO SECRETARY</span>
          <div className="wechat-preview-card">
            <small>PRIVATE CREATIVE WORKSPACE</small>
            <strong>上传自己的实景图<br />创作自己的内容</strong>
            <span>实景图 → 封面 → 文案 → 三端共享发布</span>
          </div>
          <div className="wechat-preview-status">
            <span>封面与文案</span>
            <strong>已完成人工确认</strong>
          </div>
        </div>
      </section>

      <section className="wechat-features" id="features">
        <div className="wechat-section-title">
          <p>WHAT THE SECRETARY DOES</p>
          <h2>从素材到发布，一处完成</h2>
        </div>
        <div className="wechat-feature-grid">
          {siteContent.features.map((feature) => (
            <article key={feature.number}>
              <span>{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="wechat-privacy">
        <p>独立工作区</p>
        <h2>分享平台，不泄露账号。</h2>
        <span>同一创作账户可在三台电脑共享项目库与排期，每台电脑通过小红书官方扫码独立登录；本公开页面不读取或展示任何项目、主页、发布队列与登录状态。</span>
        <Link href="/">创建自己的独立工作区 →</Link>
      </section>

      <footer className="wechat-footer">
        <span>©2026 - 由 MJ 制作网站平台</span>
        <span>隐私隔离 · 公开转发页</span>
      </footer>
    </main>
  );
}
