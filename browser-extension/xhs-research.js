const NOTE_PATH = /\/(?:explore|discovery\/item)\/[0-9a-z]+/i;
let deliveredRequestId = "";
let attempts = 0;

function cleanText(value, limit = 500) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function absoluteNoteUrl(value) {
  try {
    const url = new URL(value, window.location.origin);
    if (url.hostname !== "www.xiaohongshu.com" || !NOTE_PATH.test(url.pathname)) return "";
    return url.href.slice(0, 2000);
  } catch {
    return "";
  }
}

function textFrom(card, selectors, limit) {
  for (const selector of selectors) {
    const value = cleanText(card.querySelector(selector)?.textContent, limit);
    if (value) return value;
  }
  return "";
}

function collectCandidates() {
  const seen = new Set();
  const candidates = [];
  const anchors = [...document.querySelectorAll('a[href*="/explore/"],a[href*="/discovery/item/"]')];
  for (const anchor of anchors) {
    const sourceUrl = absoluteNoteUrl(anchor.getAttribute("href") || "");
    if (!sourceUrl || seen.has(sourceUrl)) continue;
    const card = anchor.closest("section")
      || anchor.closest('[class*="note-item"]')
      || anchor.closest('[class*="feeds-page"] > div')
      || anchor.parentElement?.parentElement
      || anchor;
    const cardText = cleanText(card?.textContent, 800);
    const title = textFrom(card, ['[class*="title"]', ".title", "span"], 120)
      || cleanText(anchor.getAttribute("title"), 120);
    if (!title || title.length < 3) continue;
    const author = textFrom(card, ['[class*="author"]', '[class*="name"]'], 80);
    const visibleLikes = textFrom(card, ['[class*="like"]', '[class*="count"]'], 30);
    const likesMatch = (visibleLikes || cardText).match(/(?:赞|点赞)?\s*(\d+(?:\.\d+)?\s*[万wWkK]?)/);
    const image = card?.querySelector("img");
    seen.add(sourceUrl);
    candidates.push({
      sourceUrl,
      title,
      author,
      likesText: cleanText(likesMatch?.[1], 30),
      coverUrl: String(image?.currentSrc || image?.src || "").slice(0, 2000),
      coverAlt: cleanText(image?.alt, 180),
      cardText,
    });
  }
  return candidates.slice(0, 12);
}

function collectCurrentNote() {
  const sourceUrl = absoluteNoteUrl(window.location.href);
  if (!sourceUrl) return null;
  const meta = (property) => cleanText(document.querySelector(`meta[property="${property}"]`)?.content, 2000);
  const title = cleanText(
    document.querySelector("h1")?.textContent
      || document.querySelector('[class*="title"]')?.textContent
      || meta("og:title")
      || document.title,
    120,
  ).replace(/\s*[-|｜].*小红书.*$/i, "");
  const body = cleanText(
    document.querySelector('[class*="desc"]')?.textContent
      || document.querySelector('[class*="note-text"]')?.textContent
      || document.querySelector("article")?.textContent
      || meta("og:description"),
    1800,
  );
  const author = cleanText(
    document.querySelector('[class*="author"]')?.textContent
      || document.querySelector('[class*="username"]')?.textContent,
    80,
  );
  const engagementText = cleanText(
    document.querySelector('[class*="like-wrapper"]')?.textContent
      || document.querySelector('[class*="engage"] [class*="like"]')?.textContent
      || document.querySelector('[class*="interact"] [class*="like"]')?.textContent,
    80,
  );
  const likesMatch = engagementText.match(/(?:赞|点赞)?\s*(\d+(?:\.\d+)?\s*[万wWkK]?)/);
  if (!title || title.length < 3) return null;
  return {
    sourceUrl,
    title,
    author,
    likesText: cleanText(likesMatch?.[1], 30),
    coverUrl: meta("og:image"),
    coverAlt: title,
    cardText: body,
  };
}

function showCollectedToast(message) {
  const toast = document.createElement("div");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed", right: "24px", bottom: "24px", zIndex: "2147483647",
    padding: "12px 18px", borderRadius: "10px", color: "#fff", background: "#13241d",
    boxShadow: "0 8px 30px rgba(0,0,0,.22)", fontSize: "14px",
  });
  document.documentElement.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2600);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "MJ_XHS_COLLECT_CURRENT_NOTE") return false;
  const candidate = collectCurrentNote();
  showCollectedToast(candidate ? "已收藏到 MJ 引流笔记库" : "当前页面未读取到可收藏的笔记");
  sendResponse({ candidate });
  return false;
});

function complete(request, candidates, error = "") {
  if (!request?.requestId || deliveredRequestId === request.requestId) return;
  deliveredRequestId = request.requestId;
  chrome.runtime.sendMessage({
    type: "MJ_XHS_RESEARCH_RESULTS",
    requestId: request.requestId,
    candidates,
    error,
  });
}

function inspect() {
  chrome.storage.local.get("mjXhsResearchRequest", (result) => {
    const request = result.mjXhsResearchRequest;
    if (!request?.requestId || deliveredRequestId === request.requestId) return;
    const createdAt = Date.parse(request.createdAt);
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > 2 * 60_000) return;
    const pageText = document.body?.innerText || "";
    if (/安全验证|请完成验证|账号异常|验证码/.test(pageText)) {
      complete(request, [], "小红书要求安全验证，研究已停止，请人工处理后重试");
      return;
    }
    const candidates = collectCandidates();
    if (candidates.length >= 3) {
      complete(request, candidates);
      return;
    }
    attempts += 1;
    if (attempts >= 20) {
      complete(request, candidates, `当前页面只读取到 ${candidates.length} 篇公开笔记，请确认小红书已登录并重试`);
      return;
    }
    window.setTimeout(inspect, 1000);
  });
}

if (window.location.pathname === "/search_result") inspect();
