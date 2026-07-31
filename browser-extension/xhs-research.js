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

inspect();
