const NOTE_PATTERN = /^https:\/\/www\.xiaohongshu\.com\/(?:explore|discovery\/item)\/[0-9a-z]+/i;
let profileDelivered = "";
let noteDelivered = "";
let replyRequestHandled = "";
let profileAttempts = 0;
const noteAttempts = {};

function cleanText(value, limit = 1000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function canonicalNoteUrl(value = window.location.href) {
  const match = String(value).match(NOTE_PATTERN);
  return match ? match[0] : "";
}

function hasVerificationBlocker() {
  return /安全验证|请完成验证|账号异常|验证码/.test(document.body?.innerText || "");
}

function collectProfileNotes(request) {
  if (profileDelivered === request.requestId) return;
  const urls = [...document.querySelectorAll('a[href*="/explore/"],a[href*="/discovery/item/"]')]
    .map((anchor) => canonicalNoteUrl(new URL(anchor.getAttribute("href") || "", window.location.origin).href))
    .filter(Boolean);
  const noteUrls = [...new Set(urls)].slice(0, 3);
  profileAttempts += 1;
  if (!noteUrls.length && profileAttempts < 20) return;
  profileDelivered = request.requestId;
  chrome.runtime.sendMessage({
    type: "MJ_XHS_PROFILE_NOTES",
    requestId: request.requestId,
    noteUrls,
  });
}

function collectNoteComments(request) {
  const sourceUrl = canonicalNoteUrl();
  if (!sourceUrl || !request.noteUrls?.includes(sourceUrl) || noteDelivered === `${request.requestId}:${sourceUrl}`) return;
  const selectors = ['[class*="comment-item"]', '[class*="parent-comment"]', '.comment-item'];
  const containers = [...document.querySelectorAll(selectors.join(","))];
  noteAttempts[sourceUrl] = (noteAttempts[sourceUrl] || 0) + 1;
  if (!containers.length && noteAttempts[sourceUrl] < 15) return;
  const seen = new Set();
  const comments = [];
  for (const container of containers) {
    const message = cleanText(
      container.querySelector('[class*="content"]')?.textContent
      || container.querySelector('[class*="text"]')?.textContent,
      1000,
    );
    const senderName = cleanText(
      container.querySelector('[class*="name"]')?.textContent
      || container.querySelector('[class*="author"]')?.textContent,
      80,
    ) || "小红书访客";
    const key = `${senderName}:${message}`;
    if (!message || message.length < 2 || seen.has(key)) continue;
    seen.add(key);
    comments.push({ senderName, message, sourceUrl });
  }
  noteDelivered = `${request.requestId}:${sourceUrl}`;
  chrome.runtime.sendMessage({
    type: "MJ_XHS_NOTE_COMMENTS",
    requestId: request.requestId,
    sourceUrl,
    comments: comments.slice(0, 30),
  });
}

function setEditableValue(element, value) {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, value);
  } else {
    element.textContent = value;
  }
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function authorizationValid(request) {
  const confirmedAt = Date.parse(request.authorization?.confirmedAt);
  const expiresAt = Date.parse(request.authorization?.expiresAt);
  const now = Date.now();
  return request.authorization?.nonce
    && Number.isFinite(confirmedAt)
    && Number.isFinite(expiresAt)
    && confirmedAt <= now + 60_000
    && now <= expiresAt
    && expiresAt - confirmedAt <= 5 * 60_000;
}

async function replyToAction(action) {
  if (hasVerificationBlocker()) return { id: action.id, success: false, error: "检测到安全验证，已停止自动回复" };
  const containers = [...document.querySelectorAll('[class*="comment-item"],[class*="parent-comment"],.comment-item')];
  const target = containers.find((container) => {
    const text = cleanText(container.textContent, 1400);
    return text.includes(cleanText(action.senderName, 80)) && text.includes(cleanText(action.message, 500));
  });
  if (!target) return { id: action.id, success: false, error: "未在当前笔记中找到对应评论" };
  const replyControls = [...target.querySelectorAll("button,span")].filter((element) => cleanText(element.textContent, 20) === "回复");
  if (replyControls.length !== 1) return { id: action.id, success: false, error: "评论回复入口不唯一，已转人工" };
  replyControls[0].click();
  await new Promise((resolve) => window.setTimeout(resolve, 500));
  const editor = target.querySelector('textarea[placeholder*="回复"],[contenteditable="true"]')
    || document.querySelector('textarea[placeholder*="回复"],[contenteditable="true"][data-placeholder*="回复"]');
  if (!editor) return { id: action.id, success: false, error: "未找到回复输入框" };
  setEditableValue(editor, cleanText(action.reply, 500));
  const scope = editor.closest('[class*="comment"]') || editor.parentElement || document;
  const sendButtons = [...scope.querySelectorAll("button")].filter((button) => {
    const label = cleanText(button.textContent, 20);
    return (label === "发送" || label === "回复") && !button.disabled && button.getClientRects().length > 0;
  });
  if (sendButtons.length !== 1) return { id: action.id, success: false, error: "发送按钮不可用或不唯一，已转人工" };
  sendButtons[0].click();
  return { id: action.id, success: true, error: "" };
}

async function processReplies(request) {
  const sourceUrl = canonicalNoteUrl();
  if (!sourceUrl || replyRequestHandled === `${request.requestId}:${sourceUrl}`) return;
  if (!authorizationValid(request)) return;
  const actions = request.actions.filter((action) => action.sourceUrl === sourceUrl).slice(0, 5);
  if (!actions.length) return;
  replyRequestHandled = `${request.requestId}:${sourceUrl}`;
  const results = [];
  for (const action of actions) {
    results.push(await replyToAction(action));
    await new Promise((resolve) => window.setTimeout(resolve, 20_000));
  }
  chrome.runtime.sendMessage({
    type: "MJ_XHS_COMMENT_REPLY_PROGRESS",
    requestId: request.requestId,
    results,
  });
}

function inspectState() {
  chrome.storage.local.get(["mjXhsCommentSync", "mjXhsCommentReply"], (stored) => {
    if (hasVerificationBlocker()) return;
    const sync = stored.mjXhsCommentSync;
    if (sync?.requestId) {
      if (window.location.pathname.startsWith("/user/profile/")) collectProfileNotes(sync);
      else collectNoteComments(sync);
    }
    if (stored.mjXhsCommentReply?.requestId) void processReplies(stored.mjXhsCommentReply);
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.mjXhsCommentSync || changes.mjXhsCommentReply)) inspectState();
});

let attempts = 0;
const timer = window.setInterval(() => {
  inspectState();
  attempts += 1;
  if (attempts >= 30) window.clearInterval(timer);
}, 1000);
inspectState();
