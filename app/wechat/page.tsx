import type { Metadata } from "next";
import Link from "next/link";
import { siteContent } from "../../lib/site-content";

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
        <Link className="wechat-brand" href="/">
          <span>栖</span>
          <strong>栖作</strong>
        </Link>
        <span className="wechat-sync-badge">微信转发专页 · 与主站同步</span>
      </header>

      <section className="wechat-hero">
        <div className="wechat-hero-copy">
          <p className="wechat-kicker">XIAOHONGSHU CREATIVE SERVICE</p>
          <h1>让每一个室内设计项目，<br />都变成值得被看见的内容。</h1>
          <p className="wechat-lead">{siteContent.shareDescription}</p>
          <div className="wechat-actions">
            <Link className="wechat-primary" href="/">登录进入创作平台</Link>
            <a className="wechat-secondary" href="#features">查看平台能力</a>
          </div>
          <p className="wechat-account-note">{siteContent.accountNote}</p>
        </div>

        <div className="wechat-preview" aria-label="平台创作流程预览">
          <span className="wechat-preview-label">MJ STUDIO SECRETARY</span>
          <div className="wechat-preview-card">
            <small>浙江 · 温州 150m²</small>
            <strong>把自然搬进<br />日常的家中</strong>
            <span>实景图 → 封面 → 文案 → 发布</span>
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
        <h2>分享平台，不共享账号。</h2>
        <span>{siteContent.accountNote}</span>
        <Link href="/">使用自己的账号进入平台 →</Link>
      </section>

      <footer className="wechat-footer">
        <span>©2026 - 由 MJ 制作网站平台</span>
        <Link href="/">进入主站</Link>
      </footer>
    </main>
  );
}
