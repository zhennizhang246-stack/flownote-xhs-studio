"use client";

import { useState } from "react";

export function ShareActions() {
  const [notice, setNotice] = useState("");

  async function sharePage() {
    const shareData = {
      title: "栖作 · 室内设计内容秘书",
      text: "实景图、封面、原创文案与定时发布，一处完成。",
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setNotice("已打开手机分享菜单");
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      setNotice("链接已复制，请粘贴到微信或朋友圈");
    } catch (error) {
      if ((error as Error).name !== "AbortError") setNotice("未能自动分享，请使用微信右上角菜单");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("链接已复制，可发送给微信好友");
    } catch {
      setNotice("请复制浏览器地址栏中的链接");
    }
  }

  return (
    <div className="wechat-share-actions">
      <button className="wechat-primary" type="button" onClick={() => void sharePage()}>转发微信 / 朋友圈</button>
      <button className="wechat-secondary" type="button" onClick={() => void copyLink()}>复制转发链接</button>
      <p>在微信内打开时，也可点击右上角“…”选择“转发给朋友”或“分享到朋友圈”。</p>
      {notice && <span role="status">{notice}</span>}
    </div>
  );
}
