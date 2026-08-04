const STUDIO_SOURCE = "mj-xhs-studio";
const BRIDGE_SOURCE = "mj-xhs-bridge";
let activeOwnerKey = "";

function notifyPage(type) {
  window.postMessage({ source: BRIDGE_SOURCE, type, version: 4 }, window.location.origin);
}

function normalizeDraft(value) {
  if (!value || value.version !== 2 || !Number.isInteger(value.projectId)) return null;
  const coverDataUrl = String(value.coverDataUrl || "");
  const images = Array.isArray(value.images)
    ? value.images.slice(0, 10).map((image) => ({
      url: String(image?.url || "").slice(0, 2000),
      fileName: String(image?.fileName || "project-image.jpg").slice(0, 180),
    })).filter((image) => /^https?:\/\//.test(image.url))
    : [];
  return {
    version: 2,
    ownerKey: String(value.ownerKey || activeOwnerKey).slice(0, 200),
    projectId: value.projectId,
    projectName: String(value.projectName || "").slice(0, 120),
    title: String(value.title || "").trim().slice(0, 100),
    body: String(value.body || "").trim().slice(0, 10000),
    tags: Array.isArray(value.tags)
      ? value.tags.slice(0, 20).map((tag) => String(tag).replace(/^#/, "").trim().slice(0, 40)).filter(Boolean)
      : [],
    coverDataUrl: coverDataUrl.length <= 8_000_000 && /^data:image\/jpeg;base64,[a-zA-Z0-9+/=]+$/.test(coverDataUrl)
      ? coverDataUrl
      : "",
    images,
    publishAction: value.publishAction === "auto_publish" ? "auto_publish" : "prefill",
    authorization: value.publishAction === "auto_publish" && value.authorization ? {
      confirmedAt: String(value.authorization.confirmedAt || ""),
      expiresAt: String(value.authorization.expiresAt || ""),
      nonce: String(value.authorization.nonce || "").slice(0, 120),
    } : undefined,
    createdAt: String(value.createdAt || new Date().toISOString()),
  };
}

window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const message = event.data;
  if (message?.source !== STUDIO_SOURCE) return;
  if (message.type === "MJ_XHS_ACCOUNT_CONTEXT") {
    activeOwnerKey = String(message.ownerKey || "").slice(0, 200);
    if (!activeOwnerKey) return;
    chrome.runtime.sendMessage({ type: "MJ_XHS_SET_ACCOUNT_CONTEXT", ownerKey: activeOwnerKey });
    return;
  }
  if (message.type === "MJ_XHS_BRIDGE_PING") {
    notifyPage("MJ_XHS_BRIDGE_READY");
    return;
  }
  if (message.type === "MJ_XHS_RESEARCH_REQUEST") {
    const requestId = String(message.requestId || "");
    const researchKey = `mjXhsCollectedNotes:${activeOwnerKey}`;
    chrome.storage.local.get(researchKey, (stored) => {
      const candidates = Array.isArray(stored[researchKey]) ? stored[researchKey] : [];
      window.postMessage({
        source: BRIDGE_SOURCE,
        type: "MJ_XHS_RESEARCH_RESULT",
        version: 4,
        requestId,
        candidates,
        error: candidates.length ? "" : "还没有右键收藏笔记。请先打开小红书原笔记，右键选择“收藏到 MJ 引流笔记库”",
      }, window.location.origin);
    });
    return;
  }
  if (message.type === "MJ_XHS_COMMENT_SYNC_REQUEST") {
    chrome.runtime.sendMessage({
      type: "MJ_XHS_START_COMMENT_SYNC",
      requestId: String(message.requestId || ""),
      profileUrl: String(message.profileUrl || ""),
    });
    return;
  }
  if (message.type === "MJ_XHS_COMMENT_REPLY_REQUEST") {
    chrome.runtime.sendMessage({
      type: "MJ_XHS_START_COMMENT_REPLY",
      requestId: String(message.requestId || ""),
      actions: Array.isArray(message.actions) ? message.actions.slice(0, 5) : [],
      authorization: message.authorization,
    });
    return;
  }
  if (message.type === "MJ_XHS_SCHEDULE_REQUEST") {
    const draft = normalizeDraft(message.payload);
    const scheduledAt = String(message.scheduledAt || "");
    if (!draft || !Number.isFinite(Date.parse(scheduledAt))) return;
    chrome.runtime.sendMessage({ type: "MJ_XHS_SAVE_SCHEDULE", draft, scheduledAt });
    notifyPage("MJ_XHS_SCHEDULE_STORED");
    return;
  }
  if (message.type === "MJ_XHS_CANCEL_SCHEDULE") {
    chrome.runtime.sendMessage({ type: "MJ_XHS_CANCEL_SCHEDULE", ownerKey: String(message.ownerKey || activeOwnerKey), projectId: Number(message.projectId) });
    notifyPage("MJ_XHS_SCHEDULE_CANCELLED");
    return;
  }
  if (message.type !== "MJ_XHS_DRAFT") return;
  const draft = normalizeDraft(message.payload);
  if (!draft) return;
  chrome.storage.local.set({ mjXhsDraft: draft }, () => {
    if (!chrome.runtime.lastError) notifyPage("MJ_XHS_DRAFT_STORED");
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  const result = changes.mjXhsResearchResult?.newValue;
  if (area !== "local" || !result) return;
  window.postMessage({
    source: BRIDGE_SOURCE,
    type: "MJ_XHS_RESEARCH_RESULT",
    version: 4,
    requestId: result.requestId,
    candidates: result.candidates || [],
    error: result.error || "",
  }, window.location.origin);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  const sync = changes.mjXhsCommentSyncResult?.newValue;
  if (sync) {
    window.postMessage({
      source: BRIDGE_SOURCE,
      type: "MJ_XHS_COMMENT_SYNC_RESULT",
      version: 4,
      ...sync,
    }, window.location.origin);
  }
  const replies = changes.mjXhsCommentReplyResult?.newValue;
  if (replies) {
    window.postMessage({
      source: BRIDGE_SOURCE,
      type: "MJ_XHS_COMMENT_REPLY_RESULT",
      version: 4,
      ...replies,
    }, window.location.origin);
  }
});

notifyPage("MJ_XHS_BRIDGE_READY");
